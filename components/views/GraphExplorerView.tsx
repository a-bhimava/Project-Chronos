"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/components/TenantContext";
import type { TimelineEntry } from "@/app/api/timeline/route";

// ─── Layout ──────────────────────────────────────────────────────────────────

const WIDTH = 880;
const HEIGHT = 520;

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#94a3b8",
  mixed: "#f59e0b",
};

const TYPE_COLOR: Record<string, string> = {
  PERSON: "var(--chart-1)",
  ORGANIZATION: "var(--chart-2)",
  PRODUCT: "var(--chart-3)",
  LOCATION: "var(--chart-4)",
  EVENT: "var(--chart-5)",
};

type GraphNode = {
  id: string;
  label: string;
  type: "actor" | "entity";
  sentiment?: string;
  degree: number;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  predicate: string;
  observed_at: string;
};

type LaidOutNode = GraphNode & { x: number; y: number };

// ─── Force-directed layout ────────────────────────────────────────────────────

function layout(nodes: GraphNode[], edges: GraphEdge[]): LaidOutNode[] {
  if (nodes.length === 0) return [];

  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const radius = Math.min(WIDTH, HEIGHT) / 2 - 80;

  const positioned: LaidOutNode[] = nodes.map((n, i) => ({
    ...n,
    x: cx + Math.cos((i / Math.max(nodes.length, 1)) * Math.PI * 2) * radius * 0.55,
    y: cy + Math.sin((i / Math.max(nodes.length, 1)) * Math.PI * 2) * radius * 0.55,
  }));

  const byId = new Map(positioned.map((n) => [n.id, n]));
  const REPULSION = 3000;
  const SPRING = 0.025;
  const SPRING_LEN = 140;
  const CENTER_PULL = 0.008;

  for (let iter = 0; iter < 200; iter++) {
    const forces = new Map(positioned.map((n) => [n.id, { fx: 0, fy: 0 }]));

    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        const a = positioned[i];
        const b = positioned[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = REPULSION / (dist * dist);
        forces.get(a.id)!.fx += (dx / dist) * force;
        forces.get(a.id)!.fy += (dy / dist) * force;
        forces.get(b.id)!.fx -= (dx / dist) * force;
        forces.get(b.id)!.fy -= (dy / dist) * force;
      }
    }

    for (const e of edges) {
      const a = byId.get(e.source);
      const b = byId.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const disp = dist - SPRING_LEN;
      const fx = (dx / dist) * disp * SPRING;
      const fy = (dy / dist) * disp * SPRING;
      forces.get(a.id)!.fx += fx;
      forces.get(a.id)!.fy += fy;
      forces.get(b.id)!.fx -= fx;
      forces.get(b.id)!.fy -= fy;
    }

    for (const n of positioned) {
      const f = forces.get(n.id)!;
      f.fx += (cx - n.x) * CENTER_PULL;
      f.fy += (cy - n.y) * CENTER_PULL;
      n.x = Math.min(WIDTH - 40, Math.max(40, n.x + f.fx));
      n.y = Math.min(HEIGHT - 40, Math.max(40, n.y + f.fy));
    }
  }

  return positioned;
}

// ─── Build graph snapshot from timeline entries up to cutoff ──────────────────

function buildSnapshot(entries: TimelineEntry[], cutoffMs: number): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const active = entries.filter(
    (e) => new Date(e.observed_at).getTime() <= cutoffMs
  );

  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();
  const degree = new Map<string, number>();

  // Track most-recent sentiment per actor
  const actorSentiment = new Map<string, { sentiment: string; ts: number }>();

  for (const e of active) {
    const actorId = `actor:${e.actor ?? e.topic_name}`;
    const entityId = `entity:${e.entity}`;
    const ts = new Date(e.observed_at).getTime();

    if (!nodeMap.has(actorId)) {
      nodeMap.set(actorId, {
        id: actorId,
        label: e.actor ?? e.topic_name,
        type: "actor",
        sentiment: e.sentiment,
        degree: 0,
      });
    }

    if (e.sentiment) {
      const prev = actorSentiment.get(actorId);
      if (!prev || ts > prev.ts) {
        actorSentiment.set(actorId, { sentiment: e.sentiment, ts });
        const n = nodeMap.get(actorId)!;
        nodeMap.set(actorId, { ...n, sentiment: e.sentiment });
      }
    }

    if (!nodeMap.has(entityId)) {
      nodeMap.set(entityId, {
        id: entityId,
        label: e.entity,
        type: "entity",
        degree: 0,
      });
    }

    degree.set(actorId, (degree.get(actorId) ?? 0) + 1);
    degree.set(entityId, (degree.get(entityId) ?? 0) + 1);

    const edgeId = `${actorId}→${entityId}:${e.predicate}`;
    if (!edgeMap.has(edgeId)) {
      edgeMap.set(edgeId, {
        id: edgeId,
        source: actorId,
        target: entityId,
        predicate: e.predicate,
        observed_at: e.observed_at,
      });
    }
  }

  const nodes = [...nodeMap.values()].map((n) => ({
    ...n,
    degree: degree.get(n.id) ?? 0,
  }));

  return { nodes, edges: [...edgeMap.values()] };
}

// ─── Animated SVG node ────────────────────────────────────────────────────────

function NodeCircle({
  node,
  hovered,
  onEnter,
  onLeave,
}: {
  node: LaidOutNode;
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const r = 10 + Math.min(node.degree, 10) * 1.2;
  const fill =
    node.type === "actor"
      ? (SENTIMENT_COLOR[node.sentiment ?? "neutral"] ?? "#94a3b8")
      : "var(--chart-2)";

  return (
    <motion.g
      key={node.id}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: hovered ? 1 : 0.85, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ cursor: "pointer" }}
    >
      {/* Glow ring */}
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={r + 5}
        fill={fill}
        opacity={hovered ? 0.25 : 0}
        animate={{ opacity: hovered ? 0.25 : 0 }}
        transition={{ duration: 0.2 }}
      />
      <circle
        cx={node.x}
        cy={node.y}
        r={r}
        fill={fill}
        stroke="var(--background)"
        strokeWidth={2.5}
        style={{
          filter: hovered ? `drop-shadow(0 0 8px ${fill})` : undefined,
          transition: "filter 0.2s",
        }}
      />
      <text
        x={node.x}
        y={node.y + r + 13}
        textAnchor="middle"
        fontSize={10}
        fill={hovered ? "var(--foreground)" : "var(--muted-foreground)"}
        style={{ userSelect: "none", transition: "fill 0.2s", fontWeight: hovered ? 600 : 400 }}
      >
        {node.label.length > 20 ? `${node.label.slice(0, 20)}…` : node.label}
      </text>
    </motion.g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GraphExplorerView() {
  const { tenantId } = useTenant();
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scrubIndex, setScrubIndex] = useState(100); // 0-100 percent
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/timeline", {
      headers: tenantId ? { "x-tenant-id": tenantId } : {},
    })
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setError("Failed to load timeline data."));
  }, [tenantId]);

  // Time range across all entries
  const { minMs, maxMs, dateAtIndex } = useMemo(() => {
    if (!entries || entries.length === 0) {
      return { minMs: 0, maxMs: 0, dateAtIndex: (_i: number) => new Date() };
    }
    const times = entries.map((e) => new Date(e.observed_at).getTime()).filter(Boolean);
    const mn = Math.min(...times);
    const mx = Math.max(...times);
    return {
      minMs: mn,
      maxMs: mx,
      dateAtIndex: (pct: number) => new Date(mn + (pct / 100) * (mx - mn)),
    };
  }, [entries]);

  const cutoffMs = useMemo(
    () => minMs + (scrubIndex / 100) * (maxMs - minMs),
    [scrubIndex, minMs, maxMs]
  );

  const { nodes, edges } = useMemo(
    () => (entries ? buildSnapshot(entries, cutoffMs) : { nodes: [], edges: [] }),
    [entries, cutoffMs]
  );

  const laidOut = useMemo(() => layout(nodes, edges), [nodes, edges]);
  const byId = useMemo(() => new Map(laidOut.map((n) => [n.id, n])), [laidOut]);

  // Playback
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (playRef.current) clearInterval(playRef.current);
      setIsPlaying(false);
    } else {
      if (scrubIndex >= 100) setScrubIndex(0);
      setIsPlaying(true);
      playRef.current = setInterval(() => {
        setScrubIndex((prev) => {
          if (prev >= 100) {
            if (playRef.current) clearInterval(playRef.current);
            setIsPlaying(false);
            return 100;
          }
          return Math.min(prev + 0.4, 100);
        });
      }, 50);
    }
  }, [isPlaying, scrubIndex]);

  useEffect(() => () => { if (playRef.current) clearInterval(playRef.current); }, []);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!entries) return <Skeleton className="h-[680px] w-full rounded-xl" />;
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No timeline data ingested yet.</p>;

  const cutoffDate = dateAtIndex(scrubIndex);
  const activeEdges = edges.filter((e) => byId.has(e.source) && byId.has(e.target));

  // Events exactly at/near current scrub position (within last 5% window)
  const windowMs = (maxMs - minMs) * 0.05;
  const recentEntries = entries
    .filter((e) => {
      const t = new Date(e.observed_at).getTime();
      return t <= cutoffMs && t >= cutoffMs - windowMs;
    })
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" />Positive actor</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Negative actor</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Mixed actor</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" />Neutral actor</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-2)" }} />Entity/subject</span>
        <span className="ml-auto font-mono tabular-nums">
          {nodes.length} nodes · {activeEdges.length} edges
        </span>
      </div>

      {/* Graph Canvas */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-xl">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--border)" />
            </marker>
          </defs>

          {/* Edges */}
          <g>
            <AnimatePresence>
              {activeEdges.map((e) => {
                const a = byId.get(e.source);
                const b = byId.get(e.target);
                if (!a || !b) return null;
                const isHov = hoveredEdge === e.id;
                const midX = (a.x + b.x) / 2;
                const midY = (a.y + b.y) / 2;
                return (
                  <motion.g
                    key={e.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <line
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={isHov ? "var(--primary)" : "var(--border)"}
                      strokeWidth={isHov ? 2 : 1}
                      strokeOpacity={isHov ? 1 : 0.5}
                      onMouseEnter={() => setHoveredEdge(e.id)}
                      onMouseLeave={() => setHoveredEdge(null)}
                      style={{ cursor: "pointer", transition: "stroke 0.2s, stroke-width 0.2s" }}
                    />
                    {isHov && (
                      <text x={midX} y={midY - 6} textAnchor="middle" fontSize={9}
                        fill="var(--primary)" style={{ userSelect: "none", fontWeight: 600 }}>
                        {e.predicate.replace(/_/g, " ")}
                      </text>
                    )}
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </g>

          {/* Nodes */}
          <g>
            <AnimatePresence>
              {laidOut.map((n) => (
                <NodeCircle
                  key={n.id}
                  node={n}
                  hovered={hoveredNode === n.id}
                  onEnter={() => setHoveredNode(n.id)}
                  onLeave={() => setHoveredNode(null)}
                />
              ))}
            </AnimatePresence>
          </g>
        </svg>

        {/* Recent events feed — top-right overlay */}
        {recentEntries.length > 0 && (
          <div className="pointer-events-none absolute right-3 top-3 flex w-64 flex-col gap-1.5">
            <AnimatePresence mode="popLayout">
              {recentEntries.map((e) => (
                <motion.div
                  key={`${e.source_url}-${e.observed_at}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-md border border-border/50 bg-background/80 p-2 text-[10px] backdrop-blur-md shadow-lg"
                >
                  <div className="font-semibold text-foreground truncate">{e.actor ?? e.topic_name}</div>
                  <div className="text-muted-foreground line-clamp-2 mt-0.5">{e.statement_text}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Premiere Pro-style scrubber ── */}
      <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 shadow-lg">
        {/* Time label bar */}
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="font-mono text-muted-foreground">
            {new Date(minMs).toLocaleDateString(undefined, { year: "numeric", month: "short" })}
          </span>
          <span className="rounded-md bg-primary/10 px-2.5 py-1 font-mono font-semibold text-primary ring-1 ring-primary/30">
            {cutoffDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </span>
          <span className="font-mono text-muted-foreground">
            {new Date(maxMs).toLocaleDateString(undefined, { year: "numeric", month: "short" })}
          </span>
        </div>

        {/* Track + playhead */}
        <div className="relative flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:scale-105 active:scale-95"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                <rect x="3" y="2" width="4" height="12" rx="1" />
                <rect x="9" y="2" width="4" height="12" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                <path d="M4 2l10 6-10 6V2z" />
              </svg>
            )}
          </button>

          {/* Scrub track */}
          <div className="relative flex-1">
            {/* Background track */}
            <div className="h-2 w-full rounded-full bg-border/60 overflow-hidden">
              {/* Filled portion */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-none"
                style={{ width: `${scrubIndex}%` }}
              />
            </div>

            {/* Event tick marks */}
            {entries.slice(0, 150).map((e, i) => {
              const pct = ((new Date(e.observed_at).getTime() - minMs) / (maxMs - minMs)) * 100;
              const past = new Date(e.observed_at).getTime() <= cutoffMs;
              return (
                <div
                  key={i}
                  className="absolute top-1/2 h-1.5 w-0.5 -translate-y-1/2 rounded-full transition-colors duration-300"
                  style={{
                    left: `${pct}%`,
                    background: past
                      ? (SENTIMENT_COLOR[e.sentiment ?? "neutral"] ?? "#94a3b8")
                      : "var(--border)",
                    opacity: past ? 0.85 : 0.3,
                  }}
                />
              );
            })}

            {/* Draggable playhead thumb */}
            <input
              type="range"
              min={0}
              max={100}
              step={0.05}
              value={scrubIndex}
              onChange={(ev) => {
                if (isPlaying) {
                  if (playRef.current) clearInterval(playRef.current);
                  setIsPlaying(false);
                }
                setScrubIndex(Number(ev.target.value));
              }}
              className="absolute inset-0 h-full w-full cursor-grab appearance-none bg-transparent opacity-0"
              style={{ zIndex: 10 }}
            />

            {/* Custom thumb */}
            <div
              className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-none"
              style={{ left: `${scrubIndex}%` }}
            >
              <div className="h-5 w-5 rounded-full border-2 border-primary bg-background shadow-[0_0_12px_rgba(var(--primary),0.6)] ring-2 ring-primary/20" />
            </div>
          </div>
        </div>

        {/* Chapter markers — year labels evenly spaced */}
        {(() => {
          const minYear = new Date(minMs).getFullYear();
          const maxYear = new Date(maxMs).getFullYear();
          const years: number[] = [];
          for (let y = minYear; y <= maxYear; y++) years.push(y);
          return (
            <div className="relative mt-2 ml-11">
              {years.map((y) => {
                const pct =
                  ((new Date(y, 0, 1).getTime() - minMs) / (maxMs - minMs)) * 100;
                if (pct < 0 || pct > 100) return null;
                return (
                  <span
                    key={y}
                    className="absolute -translate-x-1/2 text-[9px] font-mono text-muted-foreground/60"
                    style={{ left: `${pct}%` }}
                  >
                    {y}
                  </span>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
