"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Image from "next/image";
import { useChatStore } from "@/lib/store/chat-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowUpIcon,
  StopCircleIcon,
  MessageSquareIcon,
  SparklesIcon,
  UserIcon,
  BotIcon,
  PlusIcon,
  CopyIcon,
  CheckIcon,
  RefreshCwIcon,
  FileTextIcon,
  XIcon,
  ImageIcon,
} from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { ContentPart } from "@/lib/types";

function getTextFromContent(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  return content.filter((p) => p.type === "text").map((p) => p.text || "").join("\n");
}

function parseDataUrlFromAttachment(dataUrl: string): { base64: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { base64: dataUrl, mimeType: "image/png" };
  return { base64: match[2], mimeType: match[1] };
}

interface FileAttachment {
  name: string;
  type: string;
  data: string;
  preview?: string;
}

function getBubbleStyles(role: string) {
  if (role === "user") {
    return "glass-bubble-user text-foreground rounded-3xl rounded-br-lg";
  }
  return "glass-bubble-assistant text-foreground/80 rounded-3xl rounded-bl-lg";
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            if (match) {
              return (
                <div className="my-3 overflow-hidden rounded-2xl border border-white/[0.06]">
                  <div className="flex items-center justify-between bg-white/[0.04] px-4 py-2 text-xs text-muted-foreground/60">
                    <span>{match[1]}</span>
                    <CopyButton text={codeString} />
                  </div>
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{ margin: 0, borderRadius: "0 0 16px 16px", fontSize: "0.8rem", background: "rgba(0,0,0,0.3)" }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }
            return (
              <code className="rounded-lg bg-white/[0.06] px-1.5 py-0.5 text-xs" {...props}>
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>;
          },
          ul({ children }) {
            return <ul className="mb-2 list-disc pl-4">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mb-2 list-decimal pl-4">{children}</ol>;
          },
          table({ children }) {
            return (
              <div className="my-2 overflow-x-auto rounded-xl border border-white/[0.06]">
                <table className="border-collapse text-xs">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return <th className="border-b border-white/[0.06] bg-white/[0.04] px-3 py-2 text-left font-medium">{children}</th>;
          },
          td({ children }) {
            return <td className="border-b border-white/[0.04] px-3 py-2">{children}</td>;
          },
          blockquote({ children }) {
            return <blockquote className="my-2 border-l-2 border-white/10 pl-3 text-muted-foreground/80 italic">{children}</blockquote>;
          },
          a({ href, children }) {
            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400/70 hover:text-blue-400 underline">{children}</a>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 text-muted-foreground/60 hover:text-foreground/60 transition-colors">
      {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
      {copied ? "已复制" : "复制"}
    </button>
  );
}

export default function ChatPage() {
  const { data: session } = useSession();
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const selectedModel = useChatStore((s) => s.selectedModel);
  const settings = useChatStore((s) => s.settings);
  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);
  const selectedPerspective = useChatStore((s) => s.selectedPerspective);
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateLastMessage = useChatStore((s) => s.updateLastMessage);
  const setIsStreaming = useChatStore((s) => s.setIsStreaming);
  const setConversations = useChatStore((s) => s.setConversations);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const handleSendRef = useRef<() => void>(() => {});

  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetch("/api/conversations")
      .then((res) => res.ok && res.json())
      .then((data) => { if (data?.conversations) setConversations(data.conversations); })
      .catch(() => {});
  }, [setConversations]);

  useEffect(() => {
    if (!currentConversationId) { setMessages([]); return; }
    fetch(`/api/conversations/${currentConversationId}`)
      .then((res) => res.ok && res.json())
      .then((data) => { if (data) setMessages(data.messages || []); })
      .catch(() => {});
  }, [currentConversationId, setMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const pending = sessionStorage.getItem("compass-pending-message");
    if (pending && currentConversationId && !isStreaming) {
      sessionStorage.removeItem("compass-pending-message");
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.value = pending;
          handleSendRef.current();
        }
      }, 500);
    }
  }, [currentConversationId, isStreaming]);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const processFiles = useCallback((files: FileList | File[]) => {
    const maxImages = 5;
    const currentCount = attachments.filter((a) => a.type.startsWith("image/")).length;
    let imageCount = currentCount;
    Array.from(files).forEach((file) => {
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} 超过 20MB 限制`); return; }
      if (file.type.startsWith("image/")) {
        if (imageCount >= maxImages) { toast.error(`最多只能添加 ${maxImages} 张图片`); return; }
        imageCount++;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newAttachment: FileAttachment = { name: file.name, type: file.type, data: dataUrl };
        if (file.type.startsWith("image/")) newAttachment.preview = dataUrl;
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  }, [attachments]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget === e.target) setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files); }, [processFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) { e.preventDefault(); processFiles(imageFiles as unknown as FileList); }
  }, [processFiles]);

  const handleSend = useCallback(async () => {
    const input = inputRef.current;
    if (!input || !input.value.trim() && attachments.length === 0 || isStreaming || !currentConversationId) return;

    const content = input.value.trim();
    let imageContents: Array<{ data: string; mimeType: string }> = [];
    let messageContent = content;

    if (attachments.length > 0) {
      const imageAttachments = attachments.filter((a) => a.type.startsWith("image/"));
      const fileAttachments = attachments.filter((a) => !a.type.startsWith("image/"));
      imageContents = imageAttachments.map((a) => { const parsed = parseDataUrlFromAttachment(a.data); return { data: parsed.base64, mimeType: parsed.mimeType }; });
      if (imageAttachments.length > 0) {
        messageContent = (content ? content + "\n" : "") + imageAttachments.map((a, i) => `[图片 ${i + 1}: ${a.name}]`).join(" ");
      }
      if (fileAttachments.length > 0) {
        messageContent += (messageContent ? "\n" : "") + fileAttachments.map((a) => `[文件: ${a.name}]`).join(" ");
      }
    }

    input.value = "";
    input.style.height = "auto";

    const userMessage: ChatMessage = { role: "user", content: messageContent, images: imageContents.length > 0 ? imageContents : undefined, createdAt: new Date().toISOString() };
    addMessage(userMessage);
    addMessage({ role: "assistant", content: "", createdAt: new Date().toISOString() });
    setIsStreaming(true);
    setAttachments([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const currentMessages = useChatStore.getState().messages;
      const apiMessages = currentMessages.slice(0, -1).map((m) => {
        if (m.role === "user" && m.images && m.images.length > 0) {
          const text = typeof m.content === "string" ? m.content : "";
          const imageParts = m.images.map((img) => ({ type: "image_url" as const, image_url: { url: `data:${img.mimeType};base64,${img.data}` } }));
          return { role: m.role, content: [{ type: "text" as const, text }, ...imageParts] };
        }
        return { role: m.role, content: m.content };
      });

      let perspectiveContent = undefined;
      if (selectedPerspective) {
        try { const persRes = await fetch(`/api/perspectives/${selectedPerspective.id}`); if (persRes.ok) { const persData = await persRes.json(); perspectiveContent = persData.content; } } catch {}
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: currentConversationId, model: selectedModel, systemPrompt: settings.systemPrompt || undefined, temperature: settings.temperature, maxTokens: settings.maxTokens, localEndpointUrl: settings.localEndpointUrl, webSearch: webSearchEnabled, streaming: settings.streamingEnabled, contextLength: settings.contextLength, messages: apiMessages, perspectiveContent }),
        signal: controller.signal,
      });

      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || `请求失败 (${response.status})`); }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try { const parsed = JSON.parse(data); if (parsed.type === "text" && parsed.content) { accumulated += parsed.content; updateLastMessage(accumulated); } else if (parsed.type === "error") throw new Error(parsed.error || "生成出错"); } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") { toast.info("已停止生成"); }
      else { toast.error(err.message || "发送失败"); const msgs = useChatStore.getState().messages; if (msgs.length > 0 && msgs[msgs.length - 1].content === "") useChatStore.getState().setMessages(msgs.slice(0, -1)); }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      fetch("/api/conversations").then((res) => res.ok && res.json()).then((data) => { if (data?.conversations) setConversations(data.conversations); }).catch(() => {});
    }
  }, [isStreaming, currentConversationId, selectedModel, settings, webSearchEnabled, attachments, selectedPerspective, addMessage, updateLastMessage, setIsStreaming, setConversations]);

  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  const handleRegenerate = useCallback(async () => {
    if (isStreaming || !currentConversationId) return;
    const msgs = useChatStore.getState().messages;
    if (msgs.length < 2) return;
    const trimmed = msgs.slice(0, msgs.length - 1);
    setMessages(trimmed);
    addMessage({ role: "assistant", content: "", createdAt: new Date().toISOString() });
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let perspectiveContent = undefined;
      if (selectedPerspective) {
        try { const persRes = await fetch(`/api/perspectives/${selectedPerspective.id}`); if (persRes.ok) { const persData = await persRes.json(); perspectiveContent = persData.content; } } catch {}
      }
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: currentConversationId, model: selectedModel, systemPrompt: settings.systemPrompt || undefined, temperature: settings.temperature, maxTokens: settings.maxTokens, localEndpointUrl: settings.localEndpointUrl, webSearch: webSearchEnabled, streaming: settings.streamingEnabled, contextLength: settings.contextLength, messages: trimmed.map((m) => ({ role: m.role, content: m.content })), perspectiveContent }),
        signal: controller.signal,
      });
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || `请求失败 (${response.status})`); }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try { const parsed = JSON.parse(data); if (parsed.type === "text" && parsed.content) { accumulated += parsed.content; updateLastMessage(accumulated); } } catch {}
          }
        }
      }
    } catch (err: any) { if (err.name !== "AbortError") toast.error(err.message || "重新生成失败"); }
    finally { setIsStreaming(false); abortRef.current = null; }
  }, [isStreaming, currentConversationId, selectedModel, settings, webSearchEnabled, selectedPerspective, setMessages, addMessage, updateLastMessage, setIsStreaming]);

  const handleStop = useCallback(() => { abortRef.current?.abort(); }, []);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } },
    [handleSend]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  }, []);

  if (!currentConversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-white/[0.04] border border-white/[0.06]">
          <MessageSquareIcon className="size-7 text-muted-foreground/60" />
        </div>
        <h2 className="text-lg font-semibold text-foreground/80">AI 对话</h2>
        <p className="max-w-sm text-center text-sm text-muted-foreground/80">选择左侧对话或创建新对话开始聊天</p>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-white/20 bg-white/[0.04] px-14 py-12">
            <PlusIcon className="size-10 text-muted-foreground/80" />
            <p className="text-lg font-medium text-foreground/80">松开以添加文件</p>
            <p className="text-sm text-muted-foreground/80">支持图片、文档、代码等各类文件</p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-3xl bg-white/[0.04] border border-white/[0.06]">
              <SparklesIcon className="size-6 text-muted-foreground/60" />
            </div>
            <h3 className="text-base font-medium text-muted-foreground">开始对话</h3>
            <p className="max-w-xs text-center text-sm text-muted-foreground/60">发送一条消息开始与 AI 对话</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isLast = idx === messages.length - 1;
              const isAssistant = msg.role === "assistant";
              const bubbleClass = getBubbleStyles(msg.role);

              return (
                <div
                  key={msg.id || idx}
                  className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
                >
                  <Avatar size="sm" className="mt-1 shrink-0">
                    {isUser ? (
                      session?.user?.image ? (
                        <AvatarImage src={session.user.image} />
                      ) : (
                        <AvatarFallback className="bg-white/[0.06] text-muted-foreground/80"><UserIcon className="size-3.5" /></AvatarFallback>
                      )
                    ) : (
                      settings.agentAvatar ? (
                        <AvatarImage src={settings.agentAvatar} />
                      ) : (
                        <AvatarFallback className="bg-white/[0.06] text-muted-foreground/80">
                          <BotIcon className="size-3.5" />
                        </AvatarFallback>
                      )
                    )}
                  </Avatar>
                  <div className="group max-w-[80%] space-y-1">
                    <div className={cn("px-4 py-3 text-sm", bubbleClass)}>
                      {!msg.content && isStreaming && isLast ? (
                        <span className="inline-flex gap-1">
                          <span className="size-1.5 animate-bounce rounded-full bg-white/30" style={{ animationDelay: "0ms" }} />
                          <span className="size-1.5 animate-bounce rounded-full bg-white/30" style={{ animationDelay: "150ms" }} />
                          <span className="size-1.5 animate-bounce rounded-full bg-white/30" style={{ animationDelay: "300ms" }} />
                        </span>
                      ) : isUser ? (
                        <div>
                          {msg.images && msg.images.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-2">
                              {msg.images.map((img, i) => (
                                <Image key={i} src={`data:${img.mimeType};base64,${img.data}`} alt={`图片 ${i + 1}`} width={300} height={240} unoptimized className="max-h-60 max-w-[300px] rounded-2xl object-contain" />
                              ))}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap break-words">{getTextFromContent(msg.content)}</div>
                        </div>
                      ) : (
                        <MarkdownContent content={getTextFromContent(msg.content)} />
                      )}
                    </div>

                    {isAssistant && msg.content && !isStreaming && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs text-muted-foreground/60",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        isUser ? "justify-end" : "justify-start"
                      )}>
                        <CopyButton text={getTextFromContent(msg.content)} />
                        {isLast && (
                          <button onClick={handleRegenerate} className="flex items-center gap-1 hover:text-foreground/50 transition-colors ml-2">
                            <RefreshCwIcon className="size-3" />
                            重新生成
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="glass-header shrink-0 border-t border-white/[0.06] px-4 py-3 z-10">
        <div className="mx-auto max-w-3xl">
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <div key={i} className="relative group/att flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5 text-xs">
                  {att.preview ? (
                    <Image src={att.preview} alt={att.name} width={32} height={32} unoptimized className="size-8 rounded-lg object-cover" />
                  ) : (
                    <FileTextIcon className="size-4 text-muted-foreground/60" />
                  )}
                  <span className="max-w-24 truncate text-muted-foreground">{att.name}</span>
                  <button onClick={() => removeAttachment(i)} className="text-muted-foreground/60 hover:text-red-400 transition-colors">
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.py,.java,.cpp,.c,.rb,.go,.rs,.swift,.yaml,.yml,.toml,.sh,.sql,.log,.zip,.rar,.7z,.xlsx,.xls,.pptx,.ppt,.csv" className="hidden" onChange={handleFileSelect} />
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="添加文件" className="shrink-0 size-9 text-muted-foreground/60 hover:text-foreground/60 hover:bg-white/[0.06] rounded-xl">
              <PlusIcon className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { const imgInput = document.createElement("input"); imgInput.type = "file"; imgInput.accept = "image/*"; imgInput.multiple = true; imgInput.onchange = (e) => { const files = (e.target as HTMLInputElement).files; if (files) processFiles(files); }; imgInput.click(); }} title="上传图片" className="shrink-0 size-9 text-muted-foreground/60 hover:text-foreground/60 hover:bg-white/[0.06] rounded-xl">
              <ImageIcon className="size-4" />
            </Button>
            <div className="relative flex-1">
              <Textarea
                ref={inputRef}
                placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
                className="min-h-10 max-h-48 resize-none pr-10 bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-2xl focus:bg-white/[0.06] focus:border-white/[0.12]"
                rows={1}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onPaste={handlePaste}
                disabled={isStreaming}
              />
            </div>
            {isStreaming ? (
              <Button variant="destructive" size="icon" onClick={handleStop} title="停止生成" className="shrink-0 size-9 rounded-xl">
                <StopCircleIcon className="size-4" />
              </Button>
            ) : (
              <Button size="icon" onClick={handleSend} title="发送" disabled={!currentConversationId} className="shrink-0 size-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
                <ArrowUpIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
