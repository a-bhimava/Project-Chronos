"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SentimentBadge } from "@/components/SentimentBadge";
import { Citation } from "@/components/Citation";
import type { TimelineEntry } from "@/app/api/timeline/route";
import type { Sentiment } from "@/lib/types";
import { useTenant } from "@/components/TenantContext";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

// ─── Month label ─────────────────────────────────────────────────────────────

function monthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Undated";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

// ─── Single animated card ─────────────────────────────────────────────────────

function TimelineCard({
  entry,
  index,
  containerRef,
}: {
  entry: TimelineEntry;
  index: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    container: containerRef,
    offset: ["start end", "start 0.6"],
  });

  const rawOpacity = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  const rawY = useTransform(scrollYProgress, [0, 0.6], [40, 0]);
  const rawBlur = useTransform(scrollYProgress, [0, 0.6], [8, 0]);
  const rawDotScale = useTransform(scrollYProgress, [0.2, 0.8], [0, 1]);

  const opacity = useSpring(rawOpacity, { stiffness: 120, damping: 20 });
  const y = useSpring(rawY, { stiffness: 120, damping: 20 });
  const dotScale = useSpring(rawDotScale, { stiffness: 300, damping: 22 });

  // Derive a left-line glow from scroll progress
  const lineGlow = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y }}
      className="relative"
    >
      {/* Dot on the track */}
      <motion.div
        style={{ scale: dotScale }}
        className="absolute -left-[33px] top-5 h-3.5 w-3.5 rounded-full border-[3px] border-background bg-primary ring-1 ring-primary/30"
        transition={{ type: "spring" }}
      />

      {/* Glow behind the dot */}
      <motion.div
        style={{ scale: dotScale, opacity: lineGlow }}
        className="absolute -left-[35px] top-[15px] h-4 w-4 rounded-full bg-primary/40 blur-[6px]"
      />

      <motion.div
        style={{ filter: useTransform(rawBlur, (v) => `blur(${v}px)`) }}
      >
        <Card className="overflow-hidden border-border/50 bg-card/50 transition-all duration-300 hover:bg-card hover:shadow-xl hover:border-primary/30 backdrop-blur-sm">
          <CardContent className="flex flex-col gap-1.5 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight">{entry.actor ?? entry.topic_name}</span>
                <span className="rounded-full bg-secondary/50 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground ring-1 ring-border">
                  {entry.topic_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {entry.sentiment && (
                  <SentimentBadge
                    sentiment={entry.sentiment as Sentiment}
                    score={entry.sentiment_score}
                  />
                )}
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {new Date(entry.observed_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90 mt-1">&ldquo;{entry.statement_text}&rdquo;</p>
            <div className="mt-2">
              <Citation url={entry.source_url} label={entry.source_title ?? undefined} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─── Scrolling progress indicator ─────────────────────────────────────────────

function ScrollProgressBar({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const { scrollYProgress } = useScroll({ container: containerRef });
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary/80 via-primary to-primary/60 origin-left z-50 rounded-full"
    />
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function TimelineView() {
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { tenantId } = useTenant();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/timeline", {
      headers: tenantId ? { "x-tenant-id": tenantId } : {},
    })
      .then((res) => res.json())
      .then((data) => setEntries(data.entries))
      .catch(() => setError("Failed to load the timeline."));
  }, [tenantId]);

  const groups = useMemo(() => {
    if (!entries) return [];
    const byMonth = new Map<string, TimelineEntry[]>();
    for (const entry of entries) {
      const key = monthLabel(entry.observed_at);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(entry);
    }
    return [...byMonth.entries()];
  }, [entries]);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!entries) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No dated events ingested yet.</p>;
  }

  let globalIndex = 0;

  return (
    <>
      <ScrollProgressBar containerRef={containerRef} />

      {/* Scrollable container — framer-motion tracks scroll inside this div */}
      <div
        ref={containerRef}
        className="flex flex-col gap-8 max-h-[80vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        style={{ scrollbarWidth: "thin" }}
      >
        {groups.map(([month, monthEntries]) => (
          <div key={month} className="flex flex-col gap-4">
            {/* Sticky month header */}
            <div className="sticky top-0 z-20 flex items-center gap-4 bg-background/85 py-2 backdrop-blur-md">
              <span className="text-sm font-bold tracking-tight text-primary drop-shadow-sm">{month}</span>
              <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                {monthEntries.length} EVENTS
              </span>
            </div>

            <div className="relative flex flex-col gap-6 pl-8 pb-4">
              {/* Vertical gradient track */}
              <div className="absolute left-[11px] top-4 bottom-0 w-[2px] bg-gradient-to-b from-primary/60 via-primary/20 to-transparent rounded-full" />

              {monthEntries.map((entry) => {
                const idx = globalIndex++;
                return (
                  <TimelineCard
                    key={`${entry.source_url}-${entry.actor}-${idx}`}
                    entry={entry}
                    index={idx}
                    containerRef={containerRef}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
