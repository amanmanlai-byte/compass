"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PlusIcon,
  CheckCircle2Icon,
  ClockIcon,
  LockIcon,
  SproutIcon,
  MapIcon,
  CalendarIcon,
} from "lucide-react";
import DetailDrawer from "./detail-drawer";
import { LIFE_PATH_CONFIG, type LifeMapData, type LifePathData, type LifeNodeData, type LifeBranchData, type CurrentPosition } from "@/lib/types";
import { toast } from "sonner";

const PATH_Y_SPACING = 90;
const NODE_X_SPACING = 180;
const START_X = 160;
const START_Y = 60;

export default function MapView() {
  const [mapData, setMapData] = useState<LifeMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [addNodePathId, setAddNodePathId] = useState<string | null>(null);
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [viewMode, setViewMode] = useState<"map" | "timeline">("map");
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMap = useCallback(async () => {
    try {
      const res = await fetch("/api/life-map");
      if (res.ok) {
        const data = await res.json();
        setMapData(data.map);
      }
    } catch {
      toast.error("加载地图失败");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMap(); }, [fetchMap]);

  const handleUpdatePosition = useCallback(async (position: CurrentPosition) => {
    try {
      await fetch("/api/life-map", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPosition: position }),
      });
      setMapData((prev) => prev ? { ...prev, currentPosition: position } : prev);
      toast.success("位置已更新");
    } catch {
      toast.error("更新失败");
    }
  }, []);

  const handleAddNode = useCallback(async () => {
    if (!addNodePathId || !newNodeTitle.trim()) return;
    try {
      const res = await fetch("/api/life-map/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifePathId: addNodePathId, title: newNodeTitle.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMapData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            paths: prev.paths.map((p) =>
              p.id === addNodePathId ? { ...p, nodes: [...p.nodes, data.node] } : p
            ),
          };
        });
        setNewNodeTitle("");
        setAddNodeOpen(false);
        toast.success("节点已添加");
      }
    } catch {
      toast.error("添加失败");
    }
  }, [addNodePathId, newNodeTitle]);

  const handleUpdateNode = useCallback(async (nodeId: string, data: Partial<LifeNodeData>) => {
    try {
      const res = await fetch("/api/life-map/nodes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: nodeId, ...data }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMapData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            paths: prev.paths.map((p) => ({
              ...p,
              nodes: p.nodes.map((n) => n.id === nodeId ? { ...n, ...updated.node } : n),
            })),
          };
        });
      }
    } catch {
      toast.error("更新失败");
    }
  }, []);

  const handleAddBranch = useCallback(async (nodeId: string, branch: Omit<LifeBranchData, "id">) => {
    try {
      const res = await fetch("/api/life-map/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifeNodeId: nodeId, ...branch }),
      });
      if (res.ok) {
        const data = await res.json();
        setMapData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            paths: prev.paths.map((p) => ({
              ...p,
              nodes: p.nodes.map((n) =>
                n.id === nodeId ? { ...n, branches: [...n.branches, data.branch] } : n
              ),
            })),
          };
        });
        toast.success("分支已添加");
      }
    } catch {
      toast.error("添加失败");
    }
  }, []);

  // Compute node positions for SVG
  const nodePositions = useMemo(() => {
    if (!mapData) return new Map<string, { x: number; y: number }>();
    const positions = new Map<string, { x: number; y: number }>();
    mapData.paths.forEach((path, pathIdx) => {
      const y = START_Y + pathIdx * PATH_Y_SPACING;
      path.nodes.forEach((node, nodeIdx) => {
        const x = START_X + 120 + nodeIdx * NODE_X_SPACING;
        positions.set(node.id, { x, y });
      });
    });
    return positions;
  }, [mapData]);

  const svgWidth = useMemo(() => {
    if (!mapData) return 800;
    const maxNodes = Math.max(...mapData.paths.map((p) => p.nodes.length), 3);
    return START_X + 120 + maxNodes * NODE_X_SPACING + 200;
  }, [mapData]);

  // Stats
  const stats = useMemo(() => {
    if (!mapData) return { total: 0, completed: 0, active: 0, future: 0 };
    const allNodes = mapData.paths.flatMap((p) => p.nodes);
    return {
      total: allNodes.length,
      completed: allNodes.filter((n) => n.status === "completed").length,
      active: allNodes.filter((n) => n.status === "active").length,
      future: allNodes.filter((n) => n.status === "pending").length,
    };
  }, [mapData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
          <p className="text-xs text-muted-foreground/60">生成地图中...</p>
        </div>
      </div>
    );
  }

  if (!mapData) return null;

  const selectedNode = selectedNodeId
    ? mapData.paths.flatMap((p) => p.nodes).find((n) => n.id === selectedNodeId)
    : null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with view toggle */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">人生地图</h1>
          <p className="text-xs text-muted-foreground/80">你的人生，由你探索和构建</p>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <button
            onClick={() => setViewMode("timeline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
              viewMode === "timeline"
                ? "bg-white/[0.08] text-foreground shadow-sm"
                : "text-muted-foreground/60 hover:text-foreground/60"
            }`}
          >
            <CalendarIcon className="size-3" />时间视图
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
              viewMode === "map"
                ? "bg-white/[0.08] text-foreground shadow-sm"
                : "text-muted-foreground/60 hover:text-foreground/60"
            }`}
          >
            <MapIcon className="size-3" />地图视图
          </button>
        </div>
      </div>

      {/* Map area */}
      <div ref={scrollRef} className="flex-1 overflow-auto relative">
        {/* Star background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.3 + 0.05,
              }}
            />
          ))}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
        </div>

        <div className="relative min-h-full p-6" style={{ minWidth: svgWidth }}>
          <svg
            width={svgWidth}
            height={START_Y + mapData.paths.length * PATH_Y_SPACING + 40}
            className="relative z-10"
          >
            {/* Defs for gradients and filters */}
            <defs>
              {mapData.paths.map((path) => (
                <linearGradient key={path.id} id={`grad-${path.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={path.color || "#0071e3"} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={path.color || "#0071e3"} stopOpacity={0.6} />
                </linearGradient>
              ))}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-strong">
                <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Starting point */}
            <g className="lm-node-enter" style={{ animationDelay: "0ms" }}>
              <circle cx={START_X} cy={START_Y + (mapData.paths.length - 1) * PATH_Y_SPACING / 2} r={36} fill="rgba(52,199,89,0.08)" stroke="rgba(52,199,89,0.2)" strokeWidth={1} />
              <circle cx={START_X} cy={START_Y + (mapData.paths.length - 1) * PATH_Y_SPACING / 2} r={28} fill="rgba(52,199,89,0.12)" stroke="rgba(52,199,89,0.3)" strokeWidth={1} />
              <text x={START_X} y={START_Y + (mapData.paths.length - 1) * PATH_Y_SPACING / 2 - 2} textAnchor="middle" className="fill-emerald-400" fontSize={20}>🌱</text>
              <text x={START_X} y={START_Y + (mapData.paths.length - 1) * PATH_Y_SPACING / 2 + 16} textAnchor="middle" className="fill-foreground/80" fontSize={10} fontWeight={600}>起点</text>
            </g>

            {/* Path lines and nodes */}
            {mapData.paths.map((path, pathIdx) => {
              const y = START_Y + pathIdx * PATH_Y_SPACING;
              const config = LIFE_PATH_CONFIG[path.key as keyof typeof LIFE_PATH_CONFIG];

              return (
                <g key={path.id}>
                  {/* Path label */}
                  <g className="lm-node-enter" style={{ animationDelay: `${pathIdx * 60}ms` }}>
                    <circle cx={START_X + 60} cy={y} r={4} fill={path.color || "#0071e3"} opacity={0.6} />
                    <text x={START_X + 72} y={y + 4} className="fill-foreground/70" fontSize={11} fontWeight={600}>
                      {path.label}
                    </text>
                    {/* Dotted line from start to first node */}
                    <line
                      x1={START_X + 36}
                      y1={START_Y + (mapData.paths.length - 1) * PATH_Y_SPACING / 2}
                      x2={START_X + 52}
                      y2={y}
                      stroke={path.color || "#0071e3"}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      opacity={0.2}
                    />
                  </g>

                  {/* Path line connecting nodes */}
                  {path.nodes.length > 1 && (
                    <path
                      d={path.nodes.map((node, i) => {
                        const pos = nodePositions.get(node.id);
                        if (!pos) return "";
                        return i === 0 ? `M ${pos.x - 10} ${pos.y}` : `L ${pos.x - 10} ${pos.y}`;
                      }).filter(Boolean).join(" ")}
                      fill="none"
                      stroke={`url(#grad-${path.id})`}
                      strokeWidth={2}
                      strokeLinecap="round"
                      className="lm-path-draw"
                      style={{ "--path-length": path.nodes.length * NODE_X_SPACING } as React.CSSProperties}
                    />
                  )}

                  {/* Nodes */}
                  {path.nodes.map((node, nodeIdx) => {
                    const pos = nodePositions.get(node.id);
                    if (!pos) return null;
                    const isCompleted = node.status === "completed";
                    const isActive = node.status === "active";
                    const isPending = node.status === "pending";
                    const isSelected = selectedNodeId === node.id;

                    return (
                      <g
                        key={node.id}
                        className="lm-node-enter cursor-pointer"
                        style={{ animationDelay: `${pathIdx * 60 + (nodeIdx + 1) * 40}ms` }}
                        onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                      >
                        {/* Active glow */}
                        {isActive && (
                          <rect
                            x={pos.x - 52}
                            y={pos.y - 22}
                            width={104}
                            height={44}
                            rx={14}
                            fill="none"
                            stroke={path.color || "#0071e3"}
                            strokeWidth={1.5}
                            opacity={0.4}
                            filter="url(#glow)"
                            className="lm-path-active"
                          />
                        )}

                        {/* Node background */}
                        <rect
                          x={pos.x - 48}
                          y={pos.y - 18}
                          width={96}
                          height={36}
                          rx={10}
                          fill={isSelected ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}
                          stroke={isSelected ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}
                          strokeWidth={1}
                          className="transition-all duration-200"
                        />

                        {/* Status dot */}
                        <circle
                          cx={pos.x + 38}
                          cy={pos.y - 8}
                          r={5}
                          fill={isCompleted ? "#34c759" : isActive ? (path.color || "#0071e3") : "rgba(255,255,255,0.15)"}
                          filter={isActive ? "url(#glow)" : undefined}
                        />

                        {/* Node title */}
                        <text
                          x={pos.x}
                          y={pos.y + 1}
                          textAnchor="middle"
                          className={isCompleted ? "fill-foreground/50" : "fill-foreground/80"}
                          fontSize={10}
                          fontWeight={500}
                        >
                          {node.title.length > 8 ? node.title.slice(0, 8) + "..." : node.title}
                        </text>

                        {/* Date/subtitle */}
                        <text
                          x={pos.x}
                          y={pos.y + 13}
                          textAnchor="middle"
                          className="fill-muted-foreground/50"
                          fontSize={8}
                        >
                          {isPending ? "未来" : node.abilityTags?.[0] || ""}
                        </text>

                        {/* Completion checkmark */}
                        {isCompleted && (
                          <g transform={`translate(${pos.x + 36}, ${pos.y - 12})`}>
                            <CheckCircle2Icon className="size-3 text-emerald-400" />
                          </g>
                        )}

                        {/* Lock icon for future */}
                        {isPending && (
                          <g transform={`translate(${pos.x + 36}, ${pos.y - 12})`}>
                            <LockIcon className="size-2.5 text-muted-foreground/30" />
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="shrink-0 border-t border-white/[0.06] bg-background/80 backdrop-blur-lg">
        <div className="grid grid-cols-4 gap-3 p-4">
          {/* Life Stage */}
          <div className="glass-card p-3.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">人生阶段</p>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-bold text-foreground/80">探索期</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">Lv.3</span>
            </div>
            <p className="text-[10px] text-muted-foreground/60 mb-2">不断尝试，寻找属于自己的方向</p>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-primary/60 transition-all duration-500" style={{ width: "32%" }} />
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-1">下一阶段：成长期</p>
          </div>

          {/* Milestones */}
          <div className="glass-card p-3.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">里程碑</p>
            <p className="text-2xl font-bold text-foreground/80 mb-1">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground/60">
              已完成 {stats.completed} · 进行中 {stats.active} · 未来 {stats.future}
            </p>
            <div className="flex items-end gap-1 mt-2 h-8">
              {mapData.paths.map((path) => {
                const count = path.nodes.length;
                const max = Math.max(...mapData.paths.map((p) => p.nodes.length), 1);
                return (
                  <div
                    key={path.id}
                    className="flex-1 rounded-t transition-all duration-500"
                    style={{
                      height: `${(count / max) * 100}%`,
                      backgroundColor: `${path.color}60`,
                      minHeight: count > 0 ? "4px" : "1px",
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Skill Radar */}
          <div className="glass-card p-3.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">能力雷达</p>
            <div className="flex justify-center">
              <svg width={100} height={100} viewBox="0 0 100 100">
                {/* Radar rings */}
                {[40, 30, 20, 10].map((r) => (
                  <polygon
                    key={r}
                    points={Array.from({ length: 6 }).map((_, i) => {
                      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                      return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
                    }).join(" ")}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={0.5}
                  />
                ))}
                {/* Radar axes */}
                {Array.from({ length: 6 }).map((_, i) => {
                  const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                  return (
                    <line
                      key={i}
                      x1={50}
                      y1={50}
                      x2={50 + 40 * Math.cos(angle)}
                      y2={50 + 40 * Math.sin(angle)}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={0.5}
                    />
                  );
                })}
                {/* Data polygon */}
                <polygon
                  points={Array.from({ length: 6 }).map((_, i) => {
                    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                    const values = [0.7, 0.85, 0.6, 0.5, 0.75, 0.65];
                    const r = 40 * values[i];
                    return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
                  }).join(" ")}
                  fill="rgba(0,113,227,0.15)"
                  stroke="rgba(0,113,227,0.5)"
                  strokeWidth={1}
                />
                {/* Data points */}
                {Array.from({ length: 6 }).map((_, i) => {
                  const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                  const values = [0.7, 0.85, 0.6, 0.5, 0.75, 0.65];
                  const r = 40 * values[i];
                  return (
                    <circle
                      key={i}
                      cx={50 + r * Math.cos(angle)}
                      cy={50 + r * Math.sin(angle)}
                      r={2}
                      fill="#0071e3"
                    />
                  );
                })}
                {/* Labels */}
                {["学习力", "找行力", "创造力", "沟通力", "抗压性", "自我认知"].map((label, i) => {
                  const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                  const r = 48;
                  return (
                    <text
                      key={i}
                      x={50 + r * Math.cos(angle)}
                      y={50 + r * Math.sin(angle)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-muted-foreground/50"
                      fontSize={6}
                    >
                      {label}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Time Distribution */}
          <div className="glass-card p-3.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">时间分布</p>
            <div className="flex items-center gap-3">
              <svg width={64} height={64} viewBox="0 0 64 64">
                {(() => {
                  const segments = [
                    { label: "学习", pct: 0.42, color: "#0071e3" },
                    { label: "工作", pct: 0.25, color: "#34c759" },
                    { label: "生活", pct: 0.18, color: "#ff9500" },
                    { label: "成长", pct: 0.10, color: "#af52de" },
                    { label: "其他", pct: 0.05, color: "#636366" },
                  ];
                  let cumulative = 0;
                  const radius = 26;
                  const cx = 32;
                  const cy = 32;
                  return segments.map((seg, i) => {
                    const startAngle = cumulative * Math.PI * 2 - Math.PI / 2;
                    cumulative += seg.pct;
                    const endAngle = cumulative * Math.PI * 2 - Math.PI / 2;
                    const largeArc = seg.pct > 0.5 ? 1 : 0;
                    const x1 = cx + radius * Math.cos(startAngle);
                    const y1 = cy + radius * Math.sin(startAngle);
                    const x2 = cx + radius * Math.cos(endAngle);
                    const y2 = cy + radius * Math.sin(endAngle);
                    return (
                      <path
                        key={i}
                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={seg.color}
                        opacity={0.7}
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth={1}
                      />
                    );
                  });
                })()}
                <circle cx={32} cy={32} r={14} fill="var(--background)" />
              </svg>
              <div className="space-y-1">
                {[
                  { label: "学习", pct: "42%", color: "#0071e3" },
                  { label: "工作", pct: "25%", color: "#34c759" },
                  { label: "生活", pct: "18%", color: "#ff9500" },
                  { label: "成长", pct: "10%", color: "#af52de" },
                  { label: "其他", pct: "5%", color: "#636366" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-muted-foreground/60">{item.label}</span>
                    <span className="text-[10px] text-foreground/60 ml-auto">{item.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedNode && (
        <DetailDrawer
          node={selectedNode}
          pathColor={mapData.paths.find((p) => p.nodes.some((n) => n.id === selectedNodeId))?.color || "#0071e3"}
          onClose={() => setSelectedNodeId(null)}
          onUpdate={(data) => handleUpdateNode(selectedNode.id, data)}
          onAddBranch={(branch) => handleAddBranch(selectedNode.id, branch)}
        />
      )}

      {/* Add Node Dialog */}
      <Dialog open={addNodeOpen} onOpenChange={setAddNodeOpen}>
        <DialogContent className="glass-dialog">
          <DialogHeader>
            <DialogTitle className="text-foreground">添加节点</DialogTitle>
          </DialogHeader>
          <Input
            value={newNodeTitle}
            onChange={(e) => setNewNodeTitle(e.target.value)}
            placeholder="节点名称，例：完成产品课程"
            autoFocus
            className="bg-white/[0.04] border-white/[0.08] text-foreground placeholder:text-muted-foreground/60 rounded-xl"
            onKeyDown={(e) => { if (e.key === "Enter") handleAddNode(); }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddNodeOpen(false)} className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]">
              取消
            </Button>
            <Button onClick={handleAddNode} disabled={!newNodeTitle.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
