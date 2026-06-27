"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  XIcon,
  PlusIcon,
  TrashIcon,
  CheckCircle2Icon,
  ClockIcon,
  CircleIcon,
  SkipForwardIcon,
  GitBranchIcon,
  LightbulbIcon,
  BookOpenIcon,
  WaypointsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LifeNodeData, LifeBranchData } from "@/lib/types";

interface DetailDrawerProps {
  node: LifeNodeData | null;
  pathColor: string;
  onClose: () => void;
  onUpdate: (data: Partial<LifeNodeData>) => void;
  onAddBranch: (branch: Omit<LifeBranchData, "id">) => void;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "待开始", icon: CircleIcon },
  { value: "active", label: "进行中", icon: ClockIcon },
  { value: "completed", label: "已完成", icon: CheckCircle2Icon },
  { value: "skipped", label: "已跳过", icon: SkipForwardIcon },
] as const;

export default function DetailDrawer({ node, pathColor, onClose, onUpdate, onAddBranch }: DetailDrawerProps) {
  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({ title: "", description: "", abandonReason: "", cost: "", consequence: "" });
  const [newNote, setNewNote] = useState("");

  if (!node) return null;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const notes = [...node.historyNotes, { date: new Date().toISOString(), note: newNote.trim() }];
    onUpdate({ historyNotes: notes });
    setNewNote("");
  };

  const handleAddBranch = () => {
    if (!branchForm.title.trim()) return;
    onAddBranch({
      title: branchForm.title.trim(),
      description: branchForm.description || null,
      abandonReason: branchForm.abandonReason || null,
      cost: branchForm.cost || null,
      consequence: branchForm.consequence || null,
      active: false,
    });
    setBranchForm({ title: "", description: "", abandonReason: "", cost: "", consequence: "" });
    setAddBranchOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="lm-drawer-enter fixed right-0 top-0 bottom-0 z-50 w-full max-w-md overflow-y-auto border-l border-white/[0.06] bg-background/95 backdrop-blur-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-background/80 backdrop-blur-lg px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full" style={{ backgroundColor: pathColor }} />
            <h2 className="text-sm font-semibold text-foreground truncate">{node.title}</h2>
          </div>
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">状态</p>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onUpdate({ status: opt.value })}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-all",
                      node.status === opt.value
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-white/[0.06] text-muted-foreground/60 hover:bg-white/[0.04]"
                    )}
                  >
                    <Icon className="size-3" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">描述</p>
            <Textarea
              value={node.description || ""}
              onChange={(e) => onUpdate({ description: e.target.value || null })}
              placeholder="这个节点代表什么..."
              rows={2}
              className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl text-xs"
            />
          </div>

          {/* Ability Tags */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <BookOpenIcon className="inline size-3 mr-1" />
              关联能力
            </p>
            <div className="flex flex-wrap gap-1.5">
              {node.abilityTags.map((tag, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs rounded-lg bg-white/[0.04] text-muted-foreground border-white/[0.06] gap-1"
                >
                  {tag}
                  <button
                    onClick={() => {
                      const tags = node.abilityTags.filter((_, j) => j !== i);
                      onUpdate({ abilityTags: tags });
                    }}
                    className="hover:text-red-400 transition-colors"
                  >
                    <XIcon className="size-2.5" />
                  </button>
                </Badge>
              ))}
              <Input
                className="h-6 w-24 text-xs bg-white/[0.04] border-white/[0.06] rounded-lg"
                placeholder="添加..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    onUpdate({ abilityTags: [...node.abilityTags, e.currentTarget.value.trim()] });
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          </div>

          {/* History Notes */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <BookOpenIcon className="inline size-3 mr-1" />
              历史记录
            </p>
            <div className="space-y-2">
              {node.historyNotes.map((note, i) => (
                <div key={i} className="glass-card p-2.5 text-xs">
                  <p className="text-muted-foreground/60 text-[10px] mb-1">
                    {new Date(note.date).toLocaleDateString("zh-CN")}
                  </p>
                  <p className="text-foreground/80">{note.note}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="添加记录..."
                  className="h-8 text-xs bg-white/[0.04] border-white/[0.06] rounded-xl"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }}
                />
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleAddNote}>
                  <PlusIcon className="size-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Next Suggestions */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <LightbulbIcon className="inline size-3 mr-1" />
              下一步建议
            </p>
            <div className="space-y-1.5">
              {node.nextSuggestions.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                  <div className="size-1 rounded-full bg-primary/40 shrink-0" />
                  {s}
                </div>
              ))}
              <Input
                className="h-7 text-xs bg-white/[0.04] border-white/[0.06] rounded-lg"
                placeholder="添加建议..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    onUpdate({ nextSuggestions: [...node.nextSuggestions, e.currentTarget.value.trim()] });
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          </div>

          {/* Branches */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <WaypointsIcon className="inline size-3 mr-1" />
                分支路径 ({node.branches.length})
              </p>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setAddBranchOpen(true)}>
                <PlusIcon className="size-3 mr-1" />添加
              </Button>
            </div>
            {node.branches.length > 0 ? (
              <div className="space-y-2">
                {node.branches.map((branch) => (
                  <div key={branch.id} className="lm-branch-enter glass-card p-3 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <GitBranchIcon className="size-3 text-muted-foreground/40" />
                      <span className="font-medium text-foreground/80">{branch.title}</span>
                    </div>
                    {branch.description && <p className="text-muted-foreground/60 mb-1">{branch.description}</p>}
                    {branch.abandonReason && (
                      <p className="text-muted-foreground/40 text-[10px]">放弃原因: {branch.abandonReason}</p>
                    )}
                    {branch.cost && (
                      <p className="text-muted-foreground/40 text-[10px]">成本: {branch.cost}</p>
                    )}
                    {branch.consequence && (
                      <p className="text-muted-foreground/40 text-[10px]">后果: {branch.consequence}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/40">暂无分支路径</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Branch Dialog */}
      <Dialog open={addBranchOpen} onOpenChange={setAddBranchOpen}>
        <DialogContent className="glass-dialog">
          <DialogHeader>
            <DialogTitle className="text-foreground">添加分支路径</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={branchForm.title}
              onChange={(e) => setBranchForm({ ...branchForm, title: e.target.value })}
              placeholder="分支名称，例：转向 UX 设计"
              className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl"
            />
            <Textarea
              value={branchForm.description}
              onChange={(e) => setBranchForm({ ...branchForm, description: e.target.value })}
              placeholder="描述..."
              rows={2}
              className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl"
            />
            <Input
              value={branchForm.abandonReason}
              onChange={(e) => setBranchForm({ ...branchForm, abandonReason: e.target.value })}
              placeholder="放弃原因（可选）"
              className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl"
            />
            <Input
              value={branchForm.cost}
              onChange={(e) => setBranchForm({ ...branchForm, cost: e.target.value })}
              placeholder="成本（可选）"
              className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl"
            />
            <Input
              value={branchForm.consequence}
              onChange={(e) => setBranchForm({ ...branchForm, consequence: e.target.value })}
              placeholder="后果（可选）"
              className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddBranchOpen(false)} className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]">
              取消
            </Button>
            <Button onClick={handleAddBranch} disabled={!branchForm.title.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
