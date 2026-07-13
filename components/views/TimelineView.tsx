"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SentimentBadge } from "@/components/SentimentBadge";
import { Citation } from "@/components/Citation";
import type { TimelineEntry } from "@/app/api/timeline/route";
import type { Sentiment } from "@/lib/types";

function monthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Undated";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export function TimelineView() {
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/timeline")
      .then((res) => res.json())
      .then((data) => setEntries(data.entries))
      .catch(() => setError("Failed to load the timeline."));
  }, []);

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
      {groups.map(([month, monthEntries]) => (
        <div key={month} className="flex flex-col gap-3">
          <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/95 py-1 backdrop-blur">
            <span className="text-sm font-semibold">{month}</span>
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{monthEntries.length}</span>
          </div>
          <div className="flex flex-col gap-3 border-l pl-4">
            {monthEntries.map((entry, i) => (
              <Card key={`${entry.source_url}-${entry.actor}-${i}`}>
                <CardContent className="flex flex-col gap-1.5 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.actor ?? entry.topic_name}</span>
                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
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
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.observed_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">&ldquo;{entry.statement_text}&rdquo;</p>
                  <Citation url={entry.source_url} label={entry.source_title ?? undefined} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
