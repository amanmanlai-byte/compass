"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  SkipForwardIcon,
  GitBranchIcon,
} from "lucide-react";
import type { LifeNodeData } from "@/lib/types";

interface NodeCardProps {
  node: LifeNodeData;
  pathColor: string;
  isSelected: boolean;
  delay: number;
  onClick: () => void;
}

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2Icon, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "已完成" },
  active: { icon: ClockIcon, color: "text-primary", bg: "bg-primary/10", label: "进行中" },
  pending: { icon: CircleIcon, color: "text-muted-foreground/60", bg: "bg-white/[0.04]", label: "待开始" },
  skipped: { icon: SkipForwardIcon, color: "text-muted-foreground/40", bg: "bg-white/[0.02]", label: "已跳过" },
};

export default function NodeCard({ node, pathColor, isSelected, delay, onClick }: NodeCardProps) {
  const config = STATUS_CONFIG[node.status];
  const StatusIcon = config.icon;
  const hasBranches = node.branches.length > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "lm-node-enter glass-card w-full p-3.5 text-left transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98]",
        isSelected && "lm-node-selected ring-1 ring-primary/20",
        node.status === "completed" && "opacity-80"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", config.bg)}>
          <StatusIcon className={cn("size-3.5", config.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-sm font-medium truncate",
              node.status === "completed" ? "text-muted-foreground/60 line-through" : "text-foreground/80"
            )}>
              {node.title}
            </span>
            {hasBranches && (
              <GitBranchIcon className="size-3 shrink-0 text-muted-foreground/40" />
            )}
          </div>
          {node.description && (
            <p className="mt-0.5 text-xs text-muted-foreground/60 line-clamp-1">{node.description}</p>
          )}
          {node.abilityTags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {node.abilityTags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded-md border border-white/[0.06] text-muted-foreground/60"
                >
                  {tag}
                </span>
              ))}
              {node.abilityTags.length > 3 && (
                <span className="text-[10px] text-muted-foreground/40">+{node.abilityTags.length - 3}</span>
              )}
            </div>
          )}
        </div>
        <div
          className="size-2 shrink-0 rounded-full mt-1"
          style={{ backgroundColor: pathColor, opacity: node.status === "active" ? 1 : 0.3 }}
        />
      </div>
    </button>
  );
}
