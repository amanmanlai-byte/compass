"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { XIcon, PlusIcon, TrashIcon, EditIcon, SearchIcon, BrainIcon } from "lucide-react";

interface Memory {
  id: string;
  category: string;
  content: string;
  importance: number;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "all", label: "全部" },
  { value: "fact", label: "事实", color: "bg-blue-500/10 text-blue-400/70 border-blue-500/20" },
  { value: "preference", label: "偏好", color: "bg-purple-500/10 text-purple-400/70 border-purple-500/20" },
  { value: "goal", label: "目标", color: "bg-emerald-500/10 text-emerald-400/70 border-emerald-500/20" },
  { value: "emotion", label: "情绪", color: "bg-amber-500/10 text-amber-400/70 border-amber-500/20" },
  { value: "decision", label: "决策", color: "bg-red-500/10 text-red-400/70 border-red-500/20" },
  { value: "habit", label: "习惯", color: "bg-white/[0.06] text-muted-foreground border-white/[0.06]" },
];

interface MemoriesModalProps {
  open: boolean;
  onClose: () => void;
}

export default function MemoriesModal({ open, onClose }: MemoriesModalProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("fact");
  const [editImportance, setEditImportance] = useState(5);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("fact");
  const [newImportance, setNewImportance] = useState(5);

  const fetchMemories = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/memories?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch { toast.error("获取记忆失败"); }
    setLoading(false);
  }, [filterCategory, debouncedSearch]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchMemories();
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (addDialogOpen) { setAddDialogOpen(false); return; }
          if (editDialogOpen) { setEditDialogOpen(false); return; }
          onClose();
        }
      };
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [open, fetchMemories, onClose, addDialogOpen, editDialogOpen]);

  const handleAdd = useCallback(async () => {
    if (!newContent.trim()) { toast.error("请输入记忆内容"); return; }
    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent.trim(), category: newCategory, importance: newImportance }),
      });
      if (res.ok) {
        toast.success("记忆已添加");
        setAddDialogOpen(false);
        setNewContent("");
        setNewCategory("fact");
        setNewImportance(5);
        fetchMemories();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "添加失败");
      }
    } catch { toast.error("网络错误"); }
  }, [newContent, newCategory, newImportance, fetchMemories]);

  const handleEdit = useCallback(async () => {
    if (!editingMemory || !editContent.trim()) return;
    try {
      const res = await fetch("/api/memories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingMemory.id, content: editContent.trim(), category: editCategory, importance: editImportance }),
      });
      if (res.ok) {
        toast.success("记忆已更新");
        setEditDialogOpen(false);
        setEditingMemory(null);
        fetchMemories();
      } else { toast.error("更新失败"); }
    } catch { toast.error("网络错误"); }
  }, [editingMemory, editContent, editCategory, editImportance, fetchMemories]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/memories?id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("记忆已删除"); fetchMemories(); }
      else { toast.error("删除失败"); }
    } catch { toast.error("网络错误"); }
  }, [fetchMemories]);

  if (!open) return null;

  return (
    <div className="glass-panel-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-panel-backdrop" />
      <div className="glass-panel-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <BrainIcon className="size-4 text-muted-foreground/60" />
            <div>
              <h2 className="text-lg font-semibold text-foreground/90">记忆管理</h2>
              <p className="text-[10px] text-muted-foreground/60">AI 从对话中提取的关键信息</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-8 text-xs"
            >
              <PlusIcon className="mr-1 size-3" />手动添加
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground/60 hover:text-foreground/80 hover:bg-white/[0.06] size-8 rounded-xl"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="border-b border-white/[0.06] px-6 py-3 space-y-3">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              className="pl-8 bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl text-xs"
              placeholder="搜索记忆..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <Badge
                key={cat.value}
                variant={filterCategory === cat.value ? "default" : "outline"}
                className={`cursor-pointer text-[10px] rounded-lg border-white/[0.06] data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground data-[state=active]:border-white/[0.15] text-muted-foreground/80`}
                onClick={() => setFilterCategory(cat.value)}
              >
                {cat.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[calc(80vh-140px)] p-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="size-6 animate-spin rounded-full border-2 border-white/10 border-t-white/50" />
            </div>
          ) : memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <BrainIcon className="mb-4 size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground/80">{searchQuery ? "没有找到匹配的记忆" : "还没有记忆"}</p>
              <p className="text-xs text-muted-foreground/60">开始对话后，AI 会自动提取关键信息</p>
            </div>
          ) : (
            <div className="space-y-2">
              {memories.map((mem) => {
                const cat = CATEGORIES.find((c) => c.value === mem.category);
                return (
                  <div key={mem.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.04]">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge className={`text-[10px] rounded-lg ${cat?.color || ""}`}>{cat?.label || mem.category}</Badge>
                          <span className="text-[10px] text-muted-foreground/60">重要度: {mem.importance}/10</span>
                        </div>
                        <p className="text-sm text-foreground/80">{mem.content}</p>
                        <p className="mt-1.5 text-[10px] text-muted-foreground/60">{new Date(mem.updatedAt).toLocaleString("zh-CN")}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingMemory(mem); setEditContent(mem.content); setEditCategory(mem.category); setEditImportance(mem.importance); setEditDialogOpen(true); }} className="size-7 text-muted-foreground/60 hover:text-foreground/60 hover:bg-white/[0.06]">
                          <EditIcon className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(mem.id)} className="size-7 text-muted-foreground/60 hover:text-red-400 hover:bg-white/[0.06]">
                          <TrashIcon className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Add Dialog */}
        {addDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setAddDialogOpen(false)}>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <div className="relative glass-panel-content max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-foreground/90 mb-4">添加记忆</h3>
              <div className="space-y-3">
                <Textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="输入记忆内容..." rows={3} className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl" />
                <div>
                  <label className="mb-1.5 block text-[10px] text-muted-foreground uppercase tracking-wider">分类</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                      <Badge key={cat.value} variant={newCategory === cat.value ? "default" : "outline"} className={`cursor-pointer text-xs rounded-xl border-white/[0.06] data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground data-[state=active]:border-white/[0.15] text-muted-foreground/80`} onClick={() => setNewCategory(cat.value)}>
                        {cat.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] text-muted-foreground uppercase tracking-wider">重要度: {newImportance}/10</label>
                  <input type="range" min="0" max="10" value={newImportance} onChange={(e) => setNewImportance(Number(e.target.value))} className="w-full accent-primary" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setAddDialogOpen(false)} className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]">取消</Button>
                <Button onClick={handleAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">添加</Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        {editDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setEditDialogOpen(false)}>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <div className="relative glass-panel-content max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-foreground/90 mb-4">编辑记忆</h3>
              <div className="space-y-3">
                <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl" />
                <div>
                  <label className="mb-1.5 block text-[10px] text-muted-foreground uppercase tracking-wider">分类</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                      <Badge key={cat.value} variant={editCategory === cat.value ? "default" : "outline"} className={`cursor-pointer text-xs rounded-xl border-white/[0.06] data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground data-[state=active]:border-white/[0.15] text-muted-foreground/80`} onClick={() => setEditCategory(cat.value)}>
                        {cat.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] text-muted-foreground uppercase tracking-wider">重要度: {editImportance}/10</label>
                  <input type="range" min="0" max="10" value={editImportance} onChange={(e) => setEditImportance(Number(e.target.value))} className="w-full accent-primary" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]">取消</Button>
                <Button onClick={handleEdit} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">保存</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
