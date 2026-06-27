"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useChatStore } from "@/lib/store/chat-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  SearchIcon,
  TrashIcon,
  DownloadIcon,
  MessageSquareIcon,
  PinIcon,
  CheckIcon,
  ClockIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  AlertTriangleIcon,
} from "lucide-react";
import type { ConversationSummary } from "@/lib/types";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

export default function HistoryPage() {
  const conversations = useChatStore((s) => s.conversations);
  const setConversations = useChatStore((s) => s.setConversations);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/conversations").then((res) => res.ok && res.json()).then((data) => { if (data?.conversations) setConversations(data.conversations); }).catch(() => {});
  }, [setConversations]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(query) || c.model?.toLowerCase().includes(query));
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(() => {
    const groups: Record<string, ConversationSummary[]> = {};
    for (const conv of filteredConversations) {
      const dateLabel = formatDate(conv.updatedAt);
      if (!groups[dateLabel]) groups[dateLabel] = [];
      groups[dateLabel].push(conv);
    }
    const order = ["今天", "昨天"];
    const customGroups: string[] = [];
    const otherGroups: string[] = [];
    for (const label of Object.keys(groups)) {
      if (order.includes(label)) continue;
      if (label.endsWith("天前")) customGroups.push(label); else otherGroups.push(label);
    }
    customGroups.sort((a, b) => parseInt(a) - parseInt(b));
    const sortedLabels = [...order, ...customGroups, ...otherGroups];
    return sortedLabels.filter((label) => groups[label]).map((label) => ({ label, items: groups[label] }));
  }, [filteredConversations]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(selectedIds.size === filteredConversations.length ? new Set() : new Set(filteredConversations.map((c) => c.id)));
  }, [selectedIds, filteredConversations]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    setLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(ids.map((id) => fetch(`/api/conversations/${id}`, { method: "DELETE" })));
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      if (succeeded > 0) {
        if (currentConversationId && ids.includes(currentConversationId)) { setCurrentConversation(null); useChatStore.getState().resetMessages(); }
        const res = await fetch("/api/conversations");
        if (res.ok) { const data = await res.json(); setConversations(data.conversations || []); }
        toast.success(`已删除 ${succeeded} 个对话`);
        setSelectedIds(new Set());
      } else { toast.error("删除失败"); }
    } catch { toast.error("删除失败"); } finally { setLoading(false); setDeleteDialogOpen(false); }
  }, [selectedIds, currentConversationId, setCurrentConversation, setConversations]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const ids = selectedIds.size > 0 ? Array.from(selectedIds) : conversations.map((c) => c.id);
      const results = await Promise.allSettled(ids.map(async (id) => { const res = await fetch(`/api/conversations/${id}`); if (!res.ok) throw new Error(); return res.json(); }));
      const exported = results.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<any>).value);
      if (exported.length === 0) { toast.error("没有可导出的对话"); return; }
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `compass-export-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
      toast.success(`已导出 ${exported.length} 个对话`);
    } catch { toast.error("导出失败"); } finally { setExporting(false); }
  }, [selectedIds, conversations]);

  const handleSelectConversation = useCallback((id: string) => { setCurrentConversation(id); window.location.href = "/chat"; }, [setCurrentConversation]);

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">历史记录</h1>
          <p className="text-sm text-muted-foreground/80">查看和管理所有对话</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={handleExport} disabled={exporting} className="text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.06] rounded-xl">
                {exporting ? <LoaderCircleIcon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
                导出 ({selectedIds.size})
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} disabled={loading}>
                <TrashIcon className="size-4" />删除 ({selectedIds.size})
              </Button>
            </>
          )}
          {conversations.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleExport} disabled={exporting} className="text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.06] rounded-xl">
              <DownloadIcon className="size-4" />导出全部
            </Button>
          )}
        </div>
      </div>

      <div className="mb-5 flex items-center gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input className="pl-8 bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl" placeholder="搜索对话标题或模型名称..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        {filteredConversations.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleSelectAll} className="shrink-0 text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.06] rounded-xl">
            {selectedIds.size === filteredConversations.length ? "取消全选" : `全选 (${filteredConversations.length})`}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {groupedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <MessageSquareIcon className="mb-4 size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground/80">{searchQuery ? "没有匹配的对话" : "暂无对话记录"}</p>
            {searchQuery && <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="mt-2 text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/[0.06] rounded-xl">清除搜索</Button>}
          </div>
        ) : (
          <div className="space-y-5">
            {groupedConversations.map((group) => (
              <div key={group.label}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <ClockIcon className="size-3 text-muted-foreground/60" />
                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{group.label}</span>
                  <span className="text-[10px] text-muted-foreground/40">({group.items.length})</span>
                </div>
                <div className="space-y-1">
                  {group.items.map((conv) => (
                    <div key={conv.id} className={cn("group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all hover:bg-white/[0.03]", selectedIds.has(conv.id) && "bg-white/[0.06] border border-white/[0.1]")}>
                      <button onClick={() => handleToggleSelect(conv.id)} className={cn("flex size-5 shrink-0 items-center justify-center rounded-lg border transition-all", selectedIds.has(conv.id) ? "border-white/20 bg-white/[0.1] text-foreground" : "border-white/[0.06] opacity-0 group-hover:opacity-100")}>
                        {selectedIds.has(conv.id) && <CheckIcon className="size-3" />}
                      </button>
                      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => handleSelectConversation(conv.id)}>
                        <MessageSquareIcon className="size-4 shrink-0 text-muted-foreground/60" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground/80">{conv.title}</span>
                            {conv.pinned && <PinIcon className="size-2.5 shrink-0 text-muted-foreground/60" />}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                            {conv.model && <Badge variant="secondary" className="h-4 px-1 text-[10px] rounded-lg bg-white/[0.04] text-muted-foreground/60 border-white/[0.06]">{conv.model.split(":")[1] || conv.model}</Badge>}
                            {conv.messageCount > 0 && <span>{conv.messageCount} 条消息</span>}
                            <span>{formatDate(conv.updatedAt)}</span>
                          </div>
                        </div>
                      </button>
                      <button onClick={() => handleSelectConversation(conv.id)} className="shrink-0 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground/50">
                        <ChevronRightIcon className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass-dialog">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangleIcon className="size-5 text-red-400" />
            </div>
            <DialogTitle className="text-center text-foreground">确认删除</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground/80">确定要删除选中的 {selectedIds.size} 个对话吗？此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-center gap-2 sm:justify-center">
            <DialogClose render={<Button variant="ghost" className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]" />}>取消</DialogClose>
            <Button variant="destructive" onClick={handleDeleteSelected} disabled={loading}>
              {loading ? <LoaderCircleIcon className="size-4 animate-spin" /> : <TrashIcon className="size-4" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
