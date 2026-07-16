"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { GraphEdge, GraphNode } from "@/app/api/graph/route";

type LaidOutNode = GraphNode & { x: number; y: number; degree: number };

const WIDTH = 880;
const HEIGHT = 560;

const TYPE_COLOR: Record<string, string> = {
  PERSON: "var(--chart-1)",
  ORGANIZATION: "var(--chart-2)",
  PRODUCT: "var(--chart-3)",
  LOCATION: "var(--chart-4)",
  EVENT: "var(--chart-5)",
};

/** Small self-contained force-directed layout — no charting dependency.
 * Runs a fixed number of iterations synchronously on load; the node/edge
 * counts here (tens, not thousands) make that cheap enough to do inline. */
function layout(nodes: GraphNode[], edges: GraphEdge[]): LaidOutNode[] {
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const radius = Math.min(WIDTH, HEIGHT) / 2 - 60;
  const positioned = nodes.map((n, i) => {
    const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
    return {
      ...n,
      x: cx + Math.cos(angle) * radius * 0.6,
      y: cy + Math.sin(angle) * radius * 0.6,
      degree: degree.get(n.id) ?? 0,
    };
  });

  const byId = new Map(positioned.map((n) => [n.id, n]));
  const REPULSION = 2600;
  const SPRING = 0.02;
  const SPRING_LEN = 130;
  const CENTER_PULL = 0.01;

  for (let iter = 0; iter < 220; iter++) {
    const forces = new Map<string, { fx: number; fy: number }>();
    for (const n of positioned) forces.set(n.id, { fx: 0, fy: 0 });

    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        const a = positioned[i];
        const b = positioned[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = Math.max(dx * dx + dy * dy, 1);
        const force = REPULSION / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces.get(a.id)!.fx += fx;
        forces.get(a.id)!.fy += fy;
        forces.get(b.id)!.fx -= fx;
        forces.get(b.id)!.fy -= fy;
      }
    }

    for (const e of edges) {
      const a = byId.get(e.source);
      const b = byId.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const displacement = dist - SPRING_LEN;
      const fx = (dx / dist) * displacement * SPRING;
      const fy = (dy / dist) * displacement * SPRING;
      forces.get(a.id)!.fx += fx;
      forces.get(a.id)!.fy += fy;
      forces.get(b.id)!.fx -= fx;
      forces.get(b.id)!.fy -= fy;
    }

    for (const n of positioned) {
      const f = forces.get(n.id)!;
      f.fx += (cx - n.x) * CENTER_PULL;
      f.fy += (cy - n.y) * CENTER_PULL;
      n.x = Math.min(WIDTH - 30, Math.max(30, n.x + f.fx));
      n.y = Math.min(HEIGHT - 30, Math.max(30, n.y + f.fy));
    }
  }

  return positioned;
}

export function GraphExplorerView() {
  const [nodes, setNodes] = useState<GraphNode[] | null>(null);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/graph")
      .then((res) => res.json())
      .then((data) => {
        setNodes(data.nodes);
        setEdges(data.edges);
      })
      .catch(() => setError("Failed to load the graph."));
  }, []);

  const laidOut = useMemo(() => (nodes ? layout(nodes, edges) : []), [nodes, edges]);
  const byId = useMemo(() => new Map(laidOut.map((n) => [n.id, n])), [laidOut]);

  if (error) return <p className="text-sm text-status-critical">{error}</p>;
  if (!nodes) return <Skeleton className="h-[560px] w-full" />;
  if (nodes.length === 0) {
    return <p className="text-sm text-muted-foreground">No graph entities extracted yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {Object.entries(TYPE_COLOR).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {type.charAt(0) + type.slice(1).toLowerCase()}
          </span>
        ))}
        <span className="ml-auto">
          {nodes.length} entities · {edges.length} relationships (extracted automatically by
          HydraDB)
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border bg-card"
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full">
          <g>
            {edges.map((e) => {
              const a = byId.get(e.source);
              const b = byId.get(e.target);
              if (!a || !b) return null;
              const active = hoveredEdge?.id === e.id;
              return (
                <line
                  key={e.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={active ? "var(--primary)" : "var(--border)"}
                  strokeWidth={active ? 2 : 1}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredEdge(e)}
                  onMouseLeave={() => setHoveredEdge(null)}
                />
              );
            })}
          </g>
          <g>
            {laidOut.map((n) => (
              <g
                key={n.id}
                onMouseEnter={() => setHoveredNode(n.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={8 + Math.min(n.degree, 8) * 1.5}
                  fill={TYPE_COLOR[n.type] ?? "var(--muted-foreground)"}
                  fillOpacity={hoveredNode && hoveredNode !== n.id ? 0.35 : 0.85}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
                <text
                  x={n.x}
                  y={n.y + 8 + Math.min(n.degree, 8) * 1.5 + 12}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--muted-foreground)"
                  className="select-none"
                >
                  {n.name.length > 18 ? `${n.name.slice(0, 18)}…` : n.name}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {hoveredEdge && (
          <div className="absolute bottom-3 left-3 right-3 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-md">
            <span className="font-medium">{hoveredEdge.predicate.replace(/_/g, " ")}</span>
            {hoveredEdge.temporal_details && (
              <span className="ml-2 text-muted-foreground">({hoveredEdge.temporal_details})</span>
            )}
            <p className="mt-1 text-muted-foreground">{hoveredEdge.context}</p>
          </div>
        )}
      </div>
    </div>
  );
}
