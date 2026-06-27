"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SaveIcon, ArrowLeftIcon, PlusIcon, XIcon } from "lucide-react";

interface ProfileData {
  bio: string | null;
  lifeStage: string | null;
  coreValues: string | null;
  strengths: string | null;
  weaknesses: string | null;
  interests: string | null;
  currentFocus: string | null;
  avatar: string | null;
  aiStyle: string | null;
  onboardingDone: boolean;
}

const LIFE_STAGES = [
  { value: "student", label: "学生" },
  { value: "working", label: "职场人" },
  { value: "freelance", label: "自由职业" },
  { value: "entrepreneur", label: "创业者" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>({ bio: null, lifeStage: null, coreValues: null, strengths: null, weaknesses: null, interests: null, currentFocus: null, avatar: null, aiStyle: null, onboardingDone: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coreValuesInput, setCoreValuesInput] = useState("");
  const [strengthsInput, setStrengthsInput] = useState("");
  const [weaknessesInput, setWeaknessesInput] = useState("");
  const [interestsInput, setInterestsInput] = useState("");

  useEffect(() => {
    fetch("/api/profile").then((r) => r.ok ? r.json() : null).then((data) => {
      if (data) { setProfile(data); setCoreValuesInput(parseJsonArray(data.coreValues)); setStrengthsInput(parseJsonArray(data.strengths)); setWeaknessesInput(parseJsonArray(data.weaknesses)); setInterestsInput(parseJsonArray(data.interests)); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bio: profile.bio || null, lifeStage: profile.lifeStage || null, coreValues: toJsonArray(coreValuesInput), strengths: toJsonArray(strengthsInput), weaknesses: toJsonArray(weaknessesInput), interests: toJsonArray(interestsInput), currentFocus: profile.currentFocus || null, avatar: profile.avatar || null, aiStyle: profile.aiStyle || null, onboardingDone: true }) });
      if (res.ok) toast.success("档案已保存"); else { const err = await res.json().catch(() => ({})); toast.error(err.error || "保存失败"); }
    } catch { toast.error("网络错误，请重试"); }
    setSaving(false);
  }, [profile, coreValuesInput, strengthsInput, weaknessesInput, interestsInput]);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-white/50" /></div>;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-8 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]">
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">我的档案</h1>
            <p className="text-xs text-muted-foreground/80">告诉 Compass 关于你的事，让 AI 更懂你</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Avatar */}
          <div className="glass-card p-5">
            <p className="mb-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">头像</p>
            <div className="flex items-center gap-4">
              <div className="relative">
                {profile.avatar ? (
                  <Image src={profile.avatar} alt="头像" width={64} height={64} unoptimized className="size-16 rounded-full object-cover ring-1 ring-white/10" />
                ) : (
                  <div className="flex size-16 items-center rounded-full bg-white/[0.06] text-xl font-bold text-muted-foreground/60 ring-1 ring-white/[0.06]">
                    {profile.bio?.[0] || "你"}
                  </div>
                )}
              </div>
              <div>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/[0.06] transition-colors">
                    <PlusIcon className="size-3" />上传头像
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { toast.error("头像不能超过 5MB"); return; } const reader = new FileReader(); reader.onload = () => { setProfile({ ...profile, avatar: reader.result as string }); }; reader.readAsDataURL(file); }} />
                </label>
                {profile.avatar && <Button variant="ghost" size="sm" className="ml-2 text-xs text-muted-foreground/60 hover:text-foreground/60 hover:bg-white/[0.06]" onClick={() => setProfile({ ...profile, avatar: null })}>删除</Button>}
              </div>
            </div>
          </div>

          {/* AI Style */}
          <div className="glass-card p-5">
            <p className="mb-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">AI 对话风格</p>
            <p className="mb-3 text-xs text-muted-foreground/60">自定义 AI 的回复风格和语气</p>
            <Textarea value={profile.aiStyle || ""} onChange={(e) => setProfile({ ...profile, aiStyle: e.target.value || null })} placeholder={"例：\n- 用简洁直接的风格回复\n- 多用比喻和类比\n- 偶尔开个小玩笑\n- 回复控制在 3 段以内"} rows={5} className="bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl" />
            <p className="mt-2 text-[10px] text-muted-foreground/60">留空则使用默认的 Compass 教练风格</p>
          </div>

          {/* Basic Info */}
          <div className="glass-card p-5">
            <p className="mb-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">基本信息</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground/80">一句话介绍自己</label>
                <Input value={profile.bio || ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value || null })} placeholder="例：正在转型的产品经理" className="bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground/80">人生阶段</label>
                <div className="flex flex-wrap gap-2">
                  {LIFE_STAGES.map((stage) => (
                    <Badge key={stage.value} variant={profile.lifeStage === stage.value ? "default" : "outline"} className="cursor-pointer rounded-xl border-white/[0.06] data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground data-[state=active]:border-white/[0.15] text-muted-foreground/80" onClick={() => setProfile({ ...profile, lifeStage: profile.lifeStage === stage.value ? null : stage.value })}>
                      {stage.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground/80">当前最重要的事</label>
                <Input value={profile.currentFocus || ""} onChange={(e) => setProfile({ ...profile, currentFocus: e.target.value || null })} placeholder="例：找到第一份产品工作" className="bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="glass-card p-5">
            <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">自我认知</p>
            <p className="mb-4 text-xs text-muted-foreground/60">用逗号分隔多个标签</p>
            <div className="space-y-3">
              <TagInput label="核心价值观" value={coreValuesInput} onChange={setCoreValuesInput} placeholder="例：成长, 自由, 创造力" />
              <TagInput label="优势" value={strengthsInput} onChange={setStrengthsInput} placeholder="例：学习力, 沟通力, 决策力" />
              <TagInput label="需要改进的" value={weaknessesInput} onChange={setWeaknessesInput} placeholder="例：拖延, 完美主义" />
              <TagInput label="兴趣领域" value={interestsInput} onChange={setInterestsInput} placeholder="例：产品设计, 心理学, 创业" />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-11">
            <SaveIcon className="mr-2 size-4" />
            {saving ? "保存中..." : "保存档案"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TagInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const tags = value ? value.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const removeTag = (index: number) => { onChange(tags.filter((_, i) => i !== index).join(", ")); };

  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground/80">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl" />
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs rounded-lg bg-white/[0.04] text-muted-foreground border-white/[0.06]">
              {tag}
              <button onClick={() => removeTag(i)} className="ml-1 hover:text-red-400 transition-colors"><XIcon className="size-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function parseJsonArray(json: string | null): string {
  if (!json) return "";
  try { const arr = JSON.parse(json); return Array.isArray(arr) ? arr.join(", ") : ""; } catch { return ""; }
}

function toJsonArray(input: string): string | null {
  const tags = input.split(",").map((t) => t.trim()).filter(Boolean);
  return tags.length > 0 ? JSON.stringify(tags) : null;
}
