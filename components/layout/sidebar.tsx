"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/lib/store/chat-store";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  PlusIcon,
  SearchIcon,
  PinIcon,
  PinOffIcon,
  EditIcon,
  TrashIcon,
  MessageSquareIcon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  HistoryIcon,
  SettingsIcon,
  ChevronRightIcon,
  CompassIcon,
  TargetIcon,
  UserIcon,
  BrainIcon,
  MapIcon,
  BotIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { ConversationSummary } from "@/lib/types";
import Link from "next/link";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - today.getDay());

  if (date >= today) return "今天";
  if (date >= yesterday) return "昨天";
  if (date >= weekStart) return "本周";
  if (date.getFullYear() === now.getFullYear()) return "本月";
  return "更早";
}

interface SidebarProps {
  onCloseMobile?: () => void;
  onSettingsOpen?: () => void;
  onGoalsOpen?: () => void;
  onMemoriesOpen?: () => void;
}

export default function Sidebar({ onCloseMobile, onSettingsOpen, onGoalsOpen, onMemoriesOpen }: SidebarProps) {
  const conversations = useChatStore((s) => s.conversations);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const selectedModel = useChatStore((s) => s.selectedModel);

  const [searchQuery, setSearchQuery] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ConversationSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConversationSummary | null>(null);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/conversations")
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data?.conversations) {
          useChatStore.getState().setConversations(data.conversations);
        }
        setConversationsLoaded(true);
      })
      .catch(() => setConversationsLoaded(true));
  }, []);

  const { pinned, unpinned } = useMemo(() => {
    const filtered = conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      pinned: filtered.filter((c) => c.pinned),
      unpinned: filtered.filter((c) => !c.pinned),
    };
  }, [conversations, searchQuery]);

  const groupedUnpinned = useMemo(() => {
    const groups: Record<string, ConversationSummary[]> = {};
    for (const conv of unpinned) {
      const group = getDateGroup(conv.updatedAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(conv);
    }
    const order = ["今天", "昨天", "本周", "本月", "更早"];
    return order.filter((g) => groups[g]).map((g) => ({ label: g, items: groups[g] }));
  }, [unpinned]);

  const router = useRouter();

  const handleNewChat = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "新对话", model: selectedModel }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentConversation(data.id);
        router.push("/chat");
        const convRes = await fetch("/api/conversations");
        if (convRes.ok) {
          const convData = await convRes.json();
          useChatStore.getState().setConversations(convData.conversations || []);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "创建对话失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    }
  }, [setCurrentConversation, selectedModel, router]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      if (id === currentConversationId) return;
      setCurrentConversation(id);
      try {
        const res = await fetch(`/api/conversations/${id}`);
        if (res.ok) {
          const data = await res.json();
          useChatStore.getState().setMessages(data.messages || []);
        }
      } catch {}
    },
    [currentConversationId, setCurrentConversation]
  );

  const handleRename = useCallback(async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await fetch(`/api/conversations/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      const convRes = await fetch("/api/conversations");
      if (convRes.ok) {
        const data = await convRes.json();
        useChatStore.getState().setConversations(data.conversations || []);
      }
    } catch {
      toast.error("网络错误");
    }
    setRenameDialogOpen(false);
    setRenameTarget(null);
    setRenameValue("");
  }, [renameTarget, renameValue]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/conversations/${deleteTarget.id}`, { method: "DELETE" });
      if (currentConversationId === deleteTarget.id) {
        setCurrentConversation(null);
        useChatStore.getState().resetMessages();
      }
      const convRes = await fetch("/api/conversations");
      if (convRes.ok) {
        const data = await convRes.json();
        useChatStore.getState().setConversations(data.conversations || []);
      }
    } catch {}
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  }, [deleteTarget, currentConversationId, setCurrentConversation]);

  const handleTogglePin = useCallback(async (conv: ConversationSummary) => {
    try {
      await fetch(`/api/conversations/${conv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !conv.pinned }),
      });
      const convRes = await fetch("/api/conversations");
      if (convRes.ok) {
        const data = await convRes.json();
        useChatStore.getState().setConversations(data.conversations || []);
      }
    } catch {}
  }, []);

  // Collapsed sidebar
  if (!sidebarOpen) {
    return (
      <div className="glass-sidebar-collapsed flex h-full flex-col items-center gap-1.5 border-r border-white/[0.06] py-3 px-1.5 z-20 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          title="展开侧边栏"
          className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]"
        >
          <PanelLeftIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewChat}
          title="新建对话"
          className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]"
        >
          <PlusIcon className="size-4" />
        </Button>
        <Separator className="my-1 bg-white/[0.06]" />
        <div className="flex flex-col items-center gap-0.5">
          {conversations.slice(0, 8).map((conv) => (
            <Button
              key={conv.id}
              variant="ghost"
              size="icon"
              className={cn(
                "relative size-8 text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.06]",
                conv.id === currentConversationId && "bg-white/[0.08] text-foreground"
              )}
              onClick={() => handleSelectConversation(conv.id)}
              title={conv.title}
            >
              <MessageSquareIcon className="size-3.5" />
            </Button>
          ))}
        </div>
        <Separator className="my-1 bg-white/[0.06]" />
<Link href="/agent">
  <Button variant="ghost" size="icon" title="Agent 工具" className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06] size-8">
    <BotIcon className="size-3.5" />
  </Button>
</Link>
      </div>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-10 bg-black/30 backdrop-blur-sm md:hidden"
        onClick={() => setSidebarOpen(false)}
      />
      <div className="glass-sidebar flex h-full w-[280px] flex-col z-20 shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              title="折叠侧边栏"
              className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]"
            >
              <PanelLeftCloseIcon className="size-4" />
            </Button>
            <div className="flex items-center gap-2">
              <CompassIcon className="size-4 text-muted-foreground/80" />
              <span className="text-sm font-medium text-foreground/80">Compass</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            title="新建对话"
            className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]"
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              className="h-8 bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl text-xs pl-8 focus:bg-white/[0.06] focus:border-white/[0.12]"
              placeholder="搜索对话..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1 px-2 pb-2">
          {pinned.length > 0 && (
            <div className="mb-1.5">
              <div className="flex items-center gap-1 px-2 py-1">
                <PinIcon className="size-2.5 text-muted-foreground/60" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">置顶</span>
              </div>
              {pinned.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === currentConversationId}
                  onSelect={() => handleSelectConversation(conv.id)}
                  onRename={() => { setRenameTarget(conv); setRenameValue(conv.title); setRenameDialogOpen(true); }}
                  onDelete={() => { setDeleteTarget(conv); setDeleteDialogOpen(true); }}
                  onTogglePin={() => handleTogglePin(conv)}
                />
              ))}
              <Separator className="my-1.5 bg-white/[0.04]" />
            </div>
          )}

          {groupedUnpinned.map((group) => (
            <div key={group.label} className="mb-1.5">
              <div className="px-2 py-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
              {group.items.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === currentConversationId}
                  onSelect={() => handleSelectConversation(conv.id)}
                  onRename={() => { setRenameTarget(conv); setRenameValue(conv.title); setRenameDialogOpen(true); }}
                  onDelete={() => { setDeleteTarget(conv); setDeleteDialogOpen(true); }}
                  onTogglePin={() => handleTogglePin(conv)}
                />
              ))}
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              {!conversationsLoaded ? (
                <div className="size-6 animate-spin rounded-full border-2 border-white/10 border-t-white/50" />
              ) : (
                <>
                  <div className="size-10 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                    <MessageSquareIcon className="size-5 text-muted-foreground/60" />
                  </div>
                  <p className="text-xs text-muted-foreground/60">暂无对话</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewChat}
                    className="text-xs text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]"
                  >
                    开始新对话
                  </Button>
                </>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Bottom navigation */}
        <div className="border-t border-white/[0.06] p-2">
          <div className="flex flex-col gap-0.5">
            <Link href="/" className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06] h-8 text-xs"
              >
                <CompassIcon className="size-3.5" />
                控制台
              </Button>
            </Link>
            <Link href="/life-map" className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06] h-8 text-xs"
              >
                <MapIcon className="size-3.5" />
                人生地图
              </Button>
            </Link>
            <Link href="/agent" className="flex-1">
  <Button
    variant="ghost"
    size="sm"
    className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06] h-8 text-xs"
  >
    <BotIcon className="size-3.5" />
    Agent
  </Button>
</Link>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06] h-8 text-xs"
              onClick={() => onGoalsOpen?.()}
            >
              <TargetIcon className="size-3.5" />
              目标
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06] h-8 text-xs"
              onClick={() => onMemoriesOpen?.()}
            >
              <BrainIcon className="size-3.5" />
              记忆
            </Button>
            <Link href="/chat" className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06] h-8 text-xs"
              >
                <MessageSquareIcon className="size-3.5" />
                对话
              </Button>
            </Link>
            <div className="flex items-center gap-1 mt-0.5">
              <Link href="/profile" className="flex-1">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06] h-8 text-xs">
                  <UserIcon className="size-3.5" />
                  档案
                </Button>
              </Link>
              <Link href="/history">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06] size-8">
                  <HistoryIcon className="size-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06] size-8"
                onClick={() => onSettingsOpen?.()}
              >
                <SettingsIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="glass-dialog ">
          <DialogHeader>
            <DialogTitle className="text-foreground">重命名对话</DialogTitle>
            <DialogDescription className="text-muted-foreground/80">输入新的对话名称</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="对话名称"
            autoFocus
            className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60"
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
          />
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]" />}>
              取消
            </DialogClose>
            <Button onClick={handleRename} className="bg-white/[0.08] text-foreground hover:bg-white/[0.12] border-white/[0.08]">确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass-dialog ">
          <DialogHeader>
            <DialogTitle className="text-foreground">删除对话</DialogTitle>
            <DialogDescription className="text-muted-foreground/80">确定要删除此对话吗？此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]" />}>
              取消
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ConversationItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
  onTogglePin,
}: ConversationItemProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          onClick={onSelect}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-all",
            isActive
              ? "bg-white/[0.08] text-foreground"
              : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground/70"
          )}
        >
          <MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px]">{conversation.title}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground/60">
                {formatRelativeTime(conversation.updatedAt)}
              </span>
              {conversation.messageCount > 0 && (
                <span className="text-[9px] text-muted-foreground/60 bg-white/[0.04] rounded-md px-1 py-0.5">
                  {conversation.messageCount}
                </span>
              )}
            </div>
          </div>
          {conversation.pinned && (
            <PinIcon className="size-2.5 shrink-0 text-muted-foreground/60" />
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="glass-dialog bg-[#1c1c1e]/95 border-white/[0.08]">
        <ContextMenuItem onClick={onTogglePin} className="text-foreground/80 hover:text-foreground/90 hover:bg-white/[0.06]">
          {conversation.pinned ? <PinOffIcon className="size-4" /> : <PinIcon className="size-4" />}
          {conversation.pinned ? "取消置顶" : "置顶"}
        </ContextMenuItem>
        <ContextMenuItem onClick={onRename} className="text-foreground/80 hover:text-foreground/90 hover:bg-white/[0.06]">
          <EditIcon className="size-4" />
          重命名
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-white/[0.06]" />
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <TrashIcon className="size-4" />
          删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
