"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SentimentBadge } from "@/components/SentimentBadge";
import { Citation } from "@/components/Citation";
import type { TimelineEntry } from "@/app/api/timeline/route";
import type { Sentiment } from "@/lib/types";
import { useTenant } from "@/components/TenantContext";
import { motion } from "framer-motion";

function monthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Undated";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export function TimelineView() {
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { tenantId } = useTenant();

  useEffect(() => {
    fetch("/api/timeline", {
      headers: tenantId ? { "x-tenant-id": tenantId } : {}
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

  if (error) return <p className="text-sm text-status-critical">{error}</p>;
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

  return (
    <div className="flex flex-col gap-8">
      {groups.map(([month, monthEntries], groupIndex) => (
        <motion.div 
          key={month} 
          className="flex flex-col gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: groupIndex * 0.1 }}
        >
          <div className="sticky top-0 z-20 flex items-center gap-4 bg-background/80 py-2 backdrop-blur-md">
            <span className="text-sm font-bold tracking-tight text-primary drop-shadow-sm">{month}</span>
            <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
              {monthEntries.length} EVENTS
            </span>
          </div>
          <div className="relative flex flex-col gap-6 pl-8 pb-4">
            {/* The vertical timeline track */}
            <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-gradient-to-b from-primary/30 via-primary/10 to-transparent rounded-full" />
            
            {monthEntries.map((entry, i) => (
              <motion.div 
                key={`${entry.source_url}-${entry.actor}-${i}`}
                initial={{ opacity: 0, y: 30, filter: "blur(4px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.1, 0.5) }}
                className="relative"
              >
                {/* Glowing Dot on the timeline */}
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ type: "spring", stiffness: 400, delay: Math.min(i * 0.1, 0.5) + 0.2 }}
                  className="absolute -left-[33px] top-5 h-3.5 w-3.5 rounded-full border-[3px] border-background bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)] ring-1 ring-primary/30"
                />
                
                <Card className="overflow-hidden border-border/50 bg-card/50 transition-all hover:bg-card hover:shadow-lg hover:border-primary/20 backdrop-blur-sm">
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
                        <span className="text-xs font-medium text-muted-foreground">
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
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
