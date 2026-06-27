"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  PlusIcon,
  TargetIcon,
  CheckCircle2Icon,
  CircleIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: number;
  targetDate: string | null;
  completedAt: string | null;
  createdAt: string;
  milestones: Milestone[];
}

const CATEGORIES = [
  { value: "career", label: "职业" },
  { value: "skill", label: "技能" },
  { value: "health", label: "健康" },
  { value: "finance", label: "财务" },
  { value: "relationship", label: "关系" },
  { value: "custom", label: "自定义" },
];

export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [milestoneGoalId, setMilestoneGoalId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("custom");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");

  const fetchGoals = useCallback(async () => {
    try { const res = await fetch("/api/goals"); if (res.ok) { const data = await res.json(); setGoals(data.goals || []); } } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const handleCreateGoal = useCallback(async () => {
    if (!newTitle.trim()) { toast.error("请输入目标标题"); return; }
    try {
      const res = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle.trim(), description: newDescription.trim() || null, category: newCategory, targetDate: newTargetDate || null }) });
      if (res.ok) { toast.success("目标已创建"); setDialogOpen(false); setNewTitle(""); setNewDescription(""); setNewCategory("custom"); setNewTargetDate(""); fetchGoals(); } else { toast.error("创建失败"); }
    } catch { toast.error("创建失败"); }
  }, [newTitle, newDescription, newCategory, newTargetDate, fetchGoals]);

  const handleCompleteGoal = useCallback(async (goalId: string) => {
    try { await fetch("/api/goals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: goalId, status: "completed" }) }); toast.success("目标已完成"); fetchGoals(); } catch { toast.error("操作失败"); }
  }, [fetchGoals]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    try { await fetch(`/api/goals?id=${goalId}`, { method: "DELETE" }); toast.success("目标已删除"); fetchGoals(); } catch { toast.error("删除失败"); }
  }, [fetchGoals]);

  const handleAddMilestone = useCallback(async () => {
    if (!milestoneGoalId || !milestoneTitle.trim()) return;
    try { const res = await fetch(`/api/goals/${milestoneGoalId}/milestones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: milestoneTitle.trim() }) }); if (res.ok) { toast.success("里程碑已添加"); setMilestoneDialogOpen(false); setMilestoneTitle(""); fetchGoals(); } } catch { toast.error("添加失败"); }
  }, [milestoneGoalId, milestoneTitle, fetchGoals]);

  const handleToggleMilestone = useCallback(async (goalId: string, milestoneId: string, currentStatus: string) => {
    try { await fetch(`/api/goals/${goalId}/milestones`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ milestoneId, status: currentStatus === "completed" ? "pending" : "completed" }) }); fetchGoals(); } catch { toast.error("操作失败"); }
  }, [fetchGoals]);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-white/50" /></div>;

  const activeGoals = goals.filter((g) => g.status === "active");
  const otherGoals = goals.filter((g) => g.status !== "active");

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]">
              <ArrowLeftIcon className="size-4" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">我的目标</h1>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
            <PlusIcon className="mr-1 size-3" />新目标
          </Button>
        </div>

        {activeGoals.length > 0 && (
          <div className="mb-8 space-y-3">
            {activeGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} expanded={expandedGoal === goal.id} onToggle={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)} onComplete={() => handleCompleteGoal(goal.id)} onDelete={() => handleDeleteGoal(goal.id)} onAddMilestone={() => { setMilestoneGoalId(goal.id); setMilestoneDialogOpen(true); }} onToggleMilestone={(msId, msStatus) => handleToggleMilestone(goal.id, msId, msStatus)} />
            ))}
          </div>
        )}

        {otherGoals.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">历史目标</h2>
            <div className="space-y-3">
              {otherGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} expanded={expandedGoal === goal.id} onToggle={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)} onComplete={() => handleCompleteGoal(goal.id)} onDelete={() => handleDeleteGoal(goal.id)} onAddMilestone={() => { setMilestoneGoalId(goal.id); setMilestoneDialogOpen(true); }} onToggleMilestone={(msId, msStatus) => handleToggleMilestone(goal.id, msId, msStatus)} />
              ))}
            </div>
          </div>
        )}

        {goals.length === 0 && (
          <div className="glass-card flex flex-col items-center justify-center py-16">
            <TargetIcon className="mb-4 size-10 text-muted-foreground/40" />
            <p className="mb-1 text-sm font-medium text-muted-foreground">还没有目标</p>
            <p className="mb-5 text-xs text-muted-foreground/60">设定一个目标，让 Compass 帮你追踪进度</p>
            <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
              <PlusIcon className="mr-1 size-3" />创建第一个目标
            </Button>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="glass-dialog">
            <DialogHeader><DialogTitle className="text-foreground">新目标</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="目标标题，例：转行做产品经理" autoFocus className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl" />
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="详细描述（可选）" rows={2} className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl" />
              <div>
                <label className="mb-1.5 block text-[10px] text-muted-foreground/60 uppercase tracking-wider">分类</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <Badge key={cat.value} variant={newCategory === cat.value ? "default" : "outline"} className="cursor-pointer rounded-xl border-white/[0.08] text-muted-foreground hover:text-foreground/70 data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground data-[state=active]:border-white/[0.15]" onClick={() => setNewCategory(cat.value)}>
                      {cat.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] text-muted-foreground/60 uppercase tracking-wider">目标日期（可选）</label>
                <Input type="date" value={newTargetDate} onChange={(e) => setNewTargetDate(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-foreground rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]" />}>取消</DialogClose>
              <Button onClick={handleCreateGoal} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
          <DialogContent className="glass-dialog">
            <DialogHeader><DialogTitle className="text-foreground">添加里程碑</DialogTitle></DialogHeader>
            <Input value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} placeholder="里程碑标题，例：完成产品课程" autoFocus className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl" onKeyDown={(e) => { if (e.key === "Enter") handleAddMilestone(); }} />
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]" />}>取消</DialogClose>
              <Button onClick={handleAddMilestone} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">添加</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function GoalCard({ goal, expanded, onToggle, onComplete, onDelete, onAddMilestone, onToggleMilestone }: { goal: Goal; expanded: boolean; onToggle: () => void; onComplete: () => void; onDelete: () => void; onAddMilestone: () => void; onToggleMilestone: (milestoneId: string, currentStatus: string) => void }) {
  const completedCount = goal.milestones.filter((m) => m.status === "completed").length;
  const totalCount = goal.milestones.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="glass-card p-4">
      <div className="flex items-start gap-3">
        <TargetIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground/80">{goal.title}</span>
            <Badge variant="secondary" className="shrink-0 text-[10px] rounded-lg bg-white/[0.04] text-muted-foreground/80 border-white/[0.06]">
              {CATEGORIES.find((c) => c.value === goal.category)?.label || goal.category}
            </Badge>
            {goal.status === "completed" && <Badge variant="default" className="shrink-0 text-[10px] rounded-lg bg-emerald-500/10 text-emerald-400/70 border-emerald-500/20">已完成</Badge>}
          </div>
          {goal.description && <p className="mt-1 text-xs text-muted-foreground/80">{goal.description}</p>}
          {totalCount > 0 && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-white/20 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground/60">{completedCount}/{totalCount}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {goal.status === "active" && (
            <>
              <Button variant="ghost" size="icon" onClick={onComplete} className="size-7 text-muted-foreground/60 hover:text-emerald-400 hover:bg-white/[0.06]" title="标记完成"><CheckCircle2Icon className="size-3.5" /></Button>
              <Button variant="ghost" size="icon" onClick={onDelete} className="size-7 text-muted-foreground/60 hover:text-red-400 hover:bg-white/[0.06]" title="删除"><TrashIcon className="size-3.5" /></Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={onToggle} className="size-7 text-muted-foreground/60 hover:text-foreground/60 hover:bg-white/[0.06]">
            {expanded ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-white/[0.04] pt-3">
          {goal.milestones.length > 0 ? (
            <div className="space-y-1.5">
              {goal.milestones.map((ms) => (
                <button key={ms.id} onClick={() => onToggleMilestone(ms.id, ms.status)} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.04]">
                  {ms.status === "completed" ? <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-400/60" /> : <CircleIcon className="size-3.5 shrink-0 text-muted-foreground/60" />}
                  <span className={ms.status === "completed" ? "line-through text-muted-foreground/60" : "text-muted-foreground"}>{ms.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60">暂无里程碑</p>
          )}
          {goal.status === "active" && (
            <Button variant="ghost" size="sm" className="mt-2 w-full text-xs text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.04] rounded-xl" onClick={onAddMilestone}>
              <PlusIcon className="mr-1 size-3" />添加里程碑
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
