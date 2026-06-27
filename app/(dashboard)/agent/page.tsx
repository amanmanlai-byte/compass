"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/lib/store/chat-store";
import { cn } from "@/lib/utils";
import {
  BotIcon,
  TargetIcon,
  BrainIcon,
  MapIcon,
  CalendarCheckIcon,
  UserIcon,
  ZapIcon,
  FileIcon,
  FolderIcon,
  FileTextIcon,
  SearchIcon,
  CheckCircle2Icon,
  SparklesIcon,
  ChevronRightIcon,
  PlayIcon,
  InfoIcon,
  WrenchIcon,
  ActivityIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

// ---- Types ----
interface ToolParam {
  type: string;
  description?: string;
  enum?: string[];
}

interface ToolDef {
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  parameters?: {
    type: string;
    properties?: Record<string, ToolParam>;
    required?: string[];
  };
}

interface GroupedTools {
  [category: string]: ToolDef[];
}

// ---- Icon map ----
const ICON_MAP: Record<string, React.ElementType> = {
  Target: TargetIcon,
  CheckCircle: CheckCircle2Icon,
  Brain: BrainIcon,
  Map: MapIcon,
  CalendarCheck: CalendarCheckIcon,
  User: UserIcon,
  Zap: ZapIcon,
  File: FileIcon,
  Folder: FolderIcon,
  FilePen: FileTextIcon,
  FileSearch: SearchIcon,
  Tool: WrenchIcon,
};

// ---- Color map ----
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  blue:   { bg: "rgba(0,113,227,0.08)",   text: "#0071e3", border: "rgba(0,113,227,0.15)",   dot: "#0071e3"  },
  purple: { bg: "rgba(175,82,222,0.08)",  text: "#af52de", border: "rgba(175,82,222,0.15)",  dot: "#af52de"  },
  green:  { bg: "rgba(52,199,89,0.08)",   text: "#34c759", border: "rgba(52,199,89,0.15)",   dot: "#34c759"  },
  orange: { bg: "rgba(255,149,0,0.08)",   text: "#ff9500", border: "rgba(255,149,0,0.15)",   dot: "#ff9500"  },
  teal:   { bg: "rgba(90,200,250,0.08)",  text: "#5ac8fa", border: "rgba(90,200,250,0.15)",  dot: "#5ac8fa"  },
  yellow: { bg: "rgba(255,214,10,0.08)",  text: "#b8860b", border: "rgba(255,214,10,0.15)",  dot: "#ffd60a"  },
  gray:   { bg: "rgba(142,142,147,0.08)", text: "#8e8e93", border: "rgba(142,142,147,0.15)", dot: "#8e8e93"  },
};

// ---- Category descriptions ----
const CAT_DESC: Record<string, string> = {
  "目标管理": "AI 自动创建、更新目标和里程碑",
  "记忆系统": "AI 记住你的关键信息，跨对话保持连贯",
  "人生地图": "AI 可读写你的人生节点和路径",
  "打卡签到": "AI 记录每日签到和完成情况",
  "个人档案": "AI 读取和更新你的个人信息",
  "技能追踪": "AI 帮你记录技能成长",
  "文件系统": "AI 读写本地文件（需配置工作目录）",
  "其他": "其他扩展工具",
};

// ---- Tool Card ----
function ToolCard({ tool }: { tool: ToolDef }) {
  const [expanded, setExpanded] = useState(false);
  const colors = COLOR_MAP[tool.color] ?? COLOR_MAP.gray;
  const Icon = ICON_MAP[tool.icon] ?? WrenchIcon;
  const params = tool.parameters?.properties ?? {};
  const required = tool.parameters?.required ?? [];
  const paramKeys = Object.keys(params);

  return (
    <div
      className="glass-tool-card p-4 cursor-pointer select-none"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-3">
        {/* Icon badge */}
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
        >
          <Icon className="size-4" style={{ color: colors.text }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-foreground/90 font-mono">
              {tool.name}
            </span>
            <ChevronRightIcon
              className={cn(
                "size-3.5 text-muted-foreground/50 transition-transform duration-200 shrink-0",
                expanded && "rotate-90"
              )}
            />
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground/70 leading-relaxed line-clamp-2">
            {tool.description}
          </p>

          {/* Param count */}
          {paramKeys.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {paramKeys.slice(0, 4).map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]"
                  style={{
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {required.includes(k) && <span className="opacity-60">*</span>}
                  {k}
                </span>
              ))}
              {paramKeys.length > 4 && (
                <span className="text-[10px] text-muted-foreground/40">
                  +{paramKeys.length - 4} 更多
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && paramKeys.length > 0 && (
        <div
          className="mt-3 rounded-xl p-3 text-[11px]"
          style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
        >
          <p className="mb-2 font-medium" style={{ color: colors.text }}>参数说明</p>
          <div className="space-y-1.5">
            {paramKeys.map((k) => (
              <div key={k} className="flex items-start gap-2">
                <span className="font-mono text-foreground/60 shrink-0">
                  {k}{required.includes(k) ? " *" : ""}
                </span>
                <span className="text-muted-foreground/60">
                  {params[k].description ?? "—"}
                  {params[k].enum && (
                    <span className="ml-1 opacity-60">
                      [{params[k].enum!.join(" | ")}]
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground/40">* 必填项</p>
        </div>
      )}
    </div>
  );
}

// ---- Main Page ----
export default function AgentPage() {
  const [grouped, setGrouped] = useState<GroupedTools>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const router = useRouter();

  const fetchTools = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/tools");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setGrouped(data.grouped ?? {});
      setTotal(data.total ?? 0);
    } catch {
      toast.error("加载 Agent 工具失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTools(); }, [fetchTools]);

  // Flatten for search / tab filter
  const allCategories = Object.keys(grouped);
  const displayedTools: { category: string; tools: ToolDef[] }[] =
    allCategories
      .filter((cat) => activeTab === "all" || cat === activeTab)
      .map((cat) => ({
        category: cat,
        tools: grouped[cat].filter(
          (t) =>
            !search ||
            t.name.includes(search) ||
            t.description.toLowerCase().includes(search.toLowerCase())
        ),
      }))
      .filter((g) => g.tools.length > 0);

  const shownCount = displayedTools.reduce((n, g) => n + g.tools.length, 0);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Ambient glows */}
      <div
        className="agent-glow"
        style={{
          width: 500,
          height: 500,
          top: -150,
          right: -100,
          background: "rgba(175,82,222,0.18)",
          zIndex: 0,
        }}
      />
      <div
        className="agent-glow"
        style={{
          width: 400,
          height: 400,
          bottom: -100,
          left: -80,
          background: "rgba(0,113,227,0.12)",
          zIndex: 0,
        }}
      />

      {/* Header */}
      <div className="relative z-10 shrink-0 px-6 pt-6 pb-4">
        <div className="glass-frosted glass-noise p-5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                <BotIcon className="size-5 text-primary" />
              </div>
              <div>
                <h1 className="text-[18px] font-bold text-foreground">Agent 工具中心</h1>
                <p className="text-[12px] text-muted-foreground/70">
                  Compass AI 可以在对话中自动调用这些工具
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3">
              <div className="glass-pill px-3 py-1.5 flex items-center gap-2">
                <div className="agent-active-dot" />
                <span className="text-[12px] font-medium text-foreground/70">
                  {total} 个工具已就绪
                </span>
              </div>
              <Link href="/chat">
                <Button size="sm" className="h-8 gap-1.5 rounded-xl text-[12px]">
                  <PlayIcon className="size-3" />
                  开始对话
                </Button>
              </Link>
            </div>
          </div>

          {/* How it works strip */}
          <div className="mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5"
            style={{ background: "rgba(0,113,227,0.06)", border: "1px solid rgba(0,113,227,0.1)" }}>
            <InfoIcon className="size-3.5 text-primary/70 mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              所有工具在对话时自动注册，Compass 会根据你说的话判断是否需要调用工具。
              工具调用过程在聊天界面实时展示。你不需要手动操作，只需自然对话即可。
            </p>
          </div>
        </div>

        {/* Search + category tabs */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
            <input
              type="text"
              placeholder="搜索工具名称或描述..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input w-full pl-9 pr-4 py-2 text-[12px] text-foreground placeholder:text-muted-foreground/40 outline-none"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {["all", ...allCategories].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={cn(
                  "shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all duration-200",
                  activeTab === cat
                    ? "bg-primary text-white shadow-sm"
                    : "glass-pill text-muted-foreground/70 hover:text-foreground/80"
                )}
              >
                {cat === "all" ? `全部 (${total})` : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tool grid */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="size-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary/60" />
          </div>
        ) : displayedTools.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2">
            <WrenchIcon className="size-8 text-muted-foreground/30" />
            <p className="text-[13px] text-muted-foreground/50">没有找到匹配的工具</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedTools.map(({ category, tools }) => (
              <section key={category}>
                {/* Category header */}
                <div className="mb-3 flex items-center gap-2">
                  <ActivityIcon className="size-3.5 text-muted-foreground/40" />
                  <h2 className="text-[12px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                    {category}
                  </h2>
                  <span className="rounded-full px-1.5 py-0.5 text-[10px] glass-pill text-muted-foreground/50">
                    {tools.length}
                  </span>
                  {CAT_DESC[category] && (
                    <span className="text-[11px] text-muted-foreground/40 ml-1">
                      — {CAT_DESC[category]}
                    </span>
                  )}
                </div>

                {/* Tool cards grid */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {tools.map((tool) => (
                    <ToolCard key={tool.name} tool={tool} />
                  ))}
                </div>
              </section>
            ))}

            <p className="text-center text-[11px] text-muted-foreground/30 py-2">
              共展示 {shownCount} / {total} 个工具
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
