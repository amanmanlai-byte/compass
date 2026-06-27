"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useChatStore } from "@/lib/store/chat-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TargetIcon,
  PlusIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  TrendingUpIcon,
  ZapIcon,
  PenLineIcon,
  CompassIcon,
  ChevronRightIcon,
  BrainCircuitIcon,
  MessageSquareIcon,
} from "lucide-react";
import { toast } from "sonner";

interface GoalSummary {
  id: string;
  title: string;
  status: string;
  category: string;
  milestones: { id: string; status: string }[];
}

interface CheckInData {
  currentFocus: string;
  destination: string;
  todayPlan: string;
  completedItems: Array<{ text: string; completedAt: string }>;
  blockers: Array<{ text: string; reason: string }>;
}

interface PatternAnalysis {
  completionStreak: number;
  commonBlockers: Array<{ reason: string; count: number }>;
  suggestion: string | null;
}

function OnboardingFlow({ onComplete }: { onComplete: (data: { currentFocus: string; destination: string; todayPlan: string }) => void }) {
  const [step, setStep] = useState(0);
  const [currentFocus, setCurrentFocus] = useState("");
  const [destination, setDestination] = useState("");
  const [todayPlan, setTodayPlan] = useState("");

  const questions = [
    { q: "你现在在做什么？", sub: "你当前正在推进的事情，或者占据了你注意力的事", value: currentFocus, set: setCurrentFocus, placeholder: "准备转行面试、运营副业、带团队..." },
    { q: "你想去哪？", sub: "你理想中的状态，或者这段时间想抵达的方向", value: destination, set: setDestination, placeholder: "成为独立开发者、年收入翻倍、建立个人品牌..." },
    { q: "你今天要推进什么？", sub: "今天具体能做的一步，哪怕很小也行", value: todayPlan, set: setTodayPlan, placeholder: "写完产品文档、投3份简历、跑步30分钟..." },
  ];

  const canNext = questions[step].value.trim().length > 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-3xl bg-white/[0.04] border border-white/[0.06]">
          <CompassIcon className="size-8 text-muted-foreground/80" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">先聊三件事</h1>
        <p className="mt-2 text-sm text-muted-foreground/80">帮我了解你现在的状态</p>
      </div>

      <div className="mb-8 flex items-center justify-center gap-2">
        {questions.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= step ? "w-10 bg-white/40" : "w-4 bg-white/10"}`} />
        ))}
      </div>

      <div className="glass-card p-6">
        <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{step + 1} / {questions.length}</p>
        <h2 className="mb-1 text-lg font-semibold text-foreground">{questions[step].q}</h2>
        <p className="mb-5 text-sm text-muted-foreground/80">{questions[step].sub}</p>
        <Textarea
          value={questions[step].value}
          onChange={(e) => questions[step].set(e.target.value)}
          placeholder={questions[step].placeholder}
          className="min-h-[80px] resize-none bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-2xl"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && canNext) {
              e.preventDefault();
              if (step < 2) setStep(step + 1);
              else onComplete({ currentFocus, destination, todayPlan: questions[2].value });
            }
          }}
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)} className="text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.06]">
            上一步
          </Button>
        )}
        <Button
          onClick={() => {
            if (step < 2) setStep(step + 1);
            else onComplete({ currentFocus, destination, todayPlan });
          }}
          disabled={!canNext}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
        >
          {step < 2 ? "下一步" : "开始使用"}
          <ChevronRightIcon className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const selectedModel = useChatStore((s) => s.selectedModel);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);

  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [checkIn, setCheckIn] = useState<CheckInData | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<Array<{ date: string; completedItems: unknown; blockers: unknown }>>([]);
  const [patterns, setPatterns] = useState<PatternAnalysis | null>(null);

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completeText, setCompleteText] = useState("");
  const [showBlockerDialog, setShowBlockerDialog] = useState(false);
  const [blockerText, setBlockerText] = useState("");
  const [blockerReason, setBlockerReason] = useState("forgot");

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.ok ? r.json() : null),
      fetch("/api/goals").then((r) => r.ok ? r.json() : { goals: [] }),
      fetch("/api/checkins").then((r) => r.ok ? r.json() : null),
    ]).then(([profile, goalsData, checkInData]) => {
      setOnboardingDone(profile?.onboardingDone ?? false);
      setGoals(goalsData.goals || []);
      if (checkInData) {
        setCheckIn(checkInData.today);
        setRecentCheckIns(checkInData.recent || []);
        setPatterns(checkInData.patterns);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleOnboardingComplete = useCallback(async (data: { currentFocus: string; destination: string; todayPlan: string }) => {
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentFocus: data.currentFocus, onboardingDone: true }),
      });
      await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setOnboardingDone(true);
      setCheckIn({ ...data, completedItems: [], blockers: [] });
      toast.success("好的，我记住了");
    } catch {
      toast.error("保存失败");
    }
  }, []);

  const handleComplete = useCallback(async () => {
    if (!completeText.trim()) return;
    const newItems = [...(checkIn?.completedItems || []), { text: completeText.trim(), completedAt: new Date().toISOString() }];
    try {
      await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedItems: newItems }),
      });
      setCheckIn((prev) => prev ? { ...prev, completedItems: newItems } : prev);
      setCompleteText("");
      setShowCompleteDialog(false);
      toast.success("已记录完成");
    } catch {
      toast.error("记录失败");
    }
  }, [completeText, checkIn]);

  const handleBlocker = useCallback(async () => {
    if (!blockerText.trim()) return;
    const newBlockers = [...(checkIn?.blockers || []), { text: blockerText.trim(), reason: blockerReason }];
    try {
      await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockers: newBlockers }),
      });
      setCheckIn((prev) => prev ? { ...prev, blockers: newBlockers } : prev);
      setBlockerText("");
      setShowBlockerDialog(false);
      toast.success("已记录，我会帮你留意这个模式");
    } catch {
      toast.error("记录失败");
    }
  }, [blockerText, blockerReason, checkIn]);

  const handleQuickChat = useCallback(async (preset?: string) => {
    const message = preset || "今天的复盘";
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: message.slice(0, 30), model: selectedModel }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentConversation(data.id);
        sessionStorage.setItem("compass-pending-message", message);
        router.push("/chat");
      }
    } catch {
      toast.error("创建对话失败");
    }
  }, [selectedModel, setCurrentConversation, router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-white/50" />
      </div>
    );
  }

  if (!onboardingDone) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  const userName = session?.user?.name || "你";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
  const activeGoals = goals.filter((g) => g.status === "active");
  const todayCompleted = checkIn?.completedItems || [];
  const todayBlockers = checkIn?.blockers || [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">

        {/* Hero */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{greeting}，{userName}</h1>
          <p className="mt-2 text-sm text-muted-foreground/80">
            {checkIn?.currentFocus ? checkIn.currentFocus : "记录你的每一步进展"}
          </p>
        </div>

        {/* Chat CTA */}
        <button
          onClick={() => router.push("/chat")}
          className="mb-8 w-full glass-card flex items-center gap-4 p-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99] group"
        >
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
            <MessageSquareIcon className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground/80">开始对话</p>
            <p className="text-xs text-muted-foreground/60">和 Compass 聊聊任何事</p>
          </div>
          <ArrowRightIcon className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        </button>

        {/* Core Goals & Destination */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <CompassIcon className="size-4 text-muted-foreground/60" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">目标方向</span>
            </div>
            <p className="text-sm font-medium text-foreground/80 line-clamp-2">
              {checkIn?.destination || "还没设定方向"}
            </p>
            {!checkIn?.destination && (
              <Button variant="ghost" size="sm" className="mt-3 h-7 text-xs text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.06] rounded-xl" onClick={() => handleQuickChat("帮我梳理一下职业方向")}>
                开始梳理 <ArrowRightIcon className="ml-1 size-3" />
              </Button>
            )}
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ZapIcon className="size-4 text-muted-foreground/60" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">今日推进</span>
            </div>
            <p className="text-sm font-medium text-foreground/80 line-clamp-2">
              {checkIn?.todayPlan || "还没设定今天的计划"}
            </p>
            {!checkIn?.todayPlan && (
              <Button variant="ghost" size="sm" className="mt-3 h-7 text-xs text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.06] rounded-xl" onClick={() => handleQuickChat("我今天要做什么")}>
                计划一下 <ArrowRightIcon className="ml-1 size-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Today's Progress */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">今日进展</h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.06] rounded-xl" onClick={() => setShowCompleteDialog(true)}>
              <CheckCircle2Icon className="mr-1 size-3" />
              记录完成
            </Button>
          </div>

          {todayCompleted.length > 0 ? (
            <div className="space-y-2">
              {todayCompleted.map((item, i) => (
                <div key={i} className="glass-card flex items-center gap-3 px-4 py-3 rounded-2xl">
                  <CheckCircle2Icon className="size-4 shrink-0 text-emerald-400/70" />
                  <span className="text-sm text-foreground/80">{item.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card border-dashed border-white/[0.04] bg-white/[0.01] rounded-2xl p-6 text-center">
              <p className="text-xs text-muted-foreground/60">今天还没有完成记录，做完一件事就记下来</p>
            </div>
          )}
        </div>

        {/* Blockers */}
        {todayBlockers.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">遇到的阻碍</h2>
            <div className="space-y-2">
              {todayBlockers.map((b, i) => (
                <div key={i} className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3 border-amber-500/[0.08]">
                  <AlertTriangleIcon className="size-4 shrink-0 text-amber-400/60" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground/80">{b.text}</span>
                    <span className="ml-2 text-xs text-muted-foreground/60">({reasonLabel(b.reason)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pattern Insights */}
        {patterns?.suggestion && (
          <div className="mb-6">
            <div className="glass-card p-5 border-blue-500/[0.08]">
              <div className="flex items-start gap-3">
                <BrainCircuitIcon className="size-5 shrink-0 text-blue-400/60 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground/80">模式洞察</p>
                  <p className="mt-1 text-sm text-muted-foreground/80">{patterns.suggestion}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">进行中的目标</h2>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.06] rounded-xl" onClick={() => router.push("/goals")}>
                全部 <ArrowRightIcon className="ml-1 size-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {activeGoals.slice(0, 3).map((goal) => {
                const done = goal.milestones.filter((m) => m.status === "completed").length;
                const total = goal.milestones.length;
                return (
                  <button
                    key={goal.id}
                    onClick={() => router.push("/goals")}
                    className="glass-card flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <TargetIcon className="size-4 shrink-0 text-muted-foreground/60" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground/80">{goal.title}</span>
                      {total > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-white/20" style={{ width: `${Math.round((done / total) * 100)}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground/60">{done}/{total}</span>
                        </div>
                      )}
                    </div>
                    <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground/60" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Completion Streak */}
        {patterns && patterns.completionStreak > 0 && (
          <div className="mb-6">
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <TrendingUpIcon className="size-5 text-emerald-400/60" />
                <div>
                  <p className="text-sm font-medium text-foreground/80">连续 {patterns.completionStreak} 天完成</p>
                  <p className="text-xs text-muted-foreground/80">继续保持这个节奏</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">工具</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: PenLineIcon, label: "每日复盘", onClick: () => handleQuickChat("今天的复盘") },
              { icon: TargetIcon, label: "设定目标", onClick: () => router.push("/goals") },
              { icon: ZapIcon, label: "做决策", onClick: () => handleQuickChat("帮我分析一个决策") },
              { icon: BrainCircuitIcon, label: "记忆", onClick: () => router.push("/memories") },
            ].map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className="glass-card flex flex-col items-center gap-2.5 rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <action.icon className="size-4 text-muted-foreground/60" />
                <span className="text-xs text-muted-foreground">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Blocker CTA */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/[0.04] rounded-2xl h-10"
            onClick={() => setShowBlockerDialog(true)}
          >
            <AlertTriangleIcon className="size-4" />
            卡住了？记录一下原因
          </Button>
        </div>
      </div>

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="glass-dialog">
          <DialogHeader>
            <DialogTitle className="text-foreground">记录完成</DialogTitle>
          </DialogHeader>
          <Input
            value={completeText}
            onChange={(e) => setCompleteText(e.target.value)}
            placeholder="你完成了什么？"
            autoFocus
            className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl"
            onKeyDown={(e) => { if (e.key === "Enter") handleComplete(); }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCompleteDialog(false)} className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]">取消</Button>
            <Button onClick={handleComplete} disabled={!completeText.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">记录</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocker Dialog */}
      <Dialog open={showBlockerDialog} onOpenChange={setShowBlockerDialog}>
        <DialogContent className="glass-dialog">
          <DialogHeader>
            <DialogTitle className="text-foreground">记录阻碍</DialogTitle>
          </DialogHeader>
          <Input
            value={blockerText}
            onChange={(e) => setBlockerText(e.target.value)}
            placeholder="是什么卡住了你？"
            autoFocus
            className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl"
            onKeyDown={(e) => { if (e.key === "Enter") handleBlocker(); }}
          />
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground/60">原因是什么？</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "forgot", label: "忘了" },
                { value: "afraid", label: "怕了" },
                { value: "unimportant", label: "觉得不重要" },
                { value: "other", label: "其他" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBlockerReason(opt.value)}
                  className={`rounded-xl border px-3.5 py-1.5 text-xs transition-all ${
                    blockerReason === opt.value
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-white/[0.06] text-muted-foreground/80 hover:bg-white/[0.04]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBlockerDialog(false)} className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]">取消</Button>
            <Button onClick={handleBlocker} disabled={!blockerText.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">记录</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    forgot: "忘了",
    afraid: "怕了",
    unimportant: "觉得不重要",
    other: "其他原因",
  };
  return map[reason] || reason;
}
