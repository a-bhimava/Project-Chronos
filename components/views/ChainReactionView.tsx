"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SentimentBadge } from "@/components/SentimentBadge";
import { CitationList } from "@/components/Citation";
import type { Topic } from "@/lib/types";
import type { ChainStep } from "@/lib/temporal/domino";

type ChainResponse = {
  entity: string;
  windowDays: number;
  direction: "negative" | "positive";
  narrative: string;
  chain: ChainStep[];
  citations: string[];
};

export function ChainReactionView({ topics }: { topics: Topic[] }) {
  const [entity, setEntity] = useState(topics[0]?.id ?? "");
  // Real events here span years (2004 testimony -> 2008 downgrades -> 2015/2017
  // settlements), so the default window is much wider than a live-news case.
  const [windowDays, setWindowDays] = useState(1500);
  const [direction, setDirection] = useState<"negative" | "positive">("negative");
  const [result, setResult] = useState<ChainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFind() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams({ entity, windowDays: String(windowDays), direction });
      const res = await fetch(`/api/query/domino?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chain-entity">Entity</Label>
          <Select value={entity} onValueChange={(v) => v && setEntity(v)}>
            <SelectTrigger id="chain-entity" className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topics.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chain-direction">Direction</Label>
          <Select value={direction} onValueChange={(v) => v && setDirection(v as "negative" | "positive")}>
            <SelectTrigger id="chain-direction" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="negative">Negative</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chain-window">Window (days)</Label>
          <Input
            id="chain-window"
            type="number"
            min={1}
            max={5000}
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="w-32"
          />
        </div>
        <Button onClick={handleFind} disabled={loading || !entity}>
          {loading ? "Searching…" : "Find escalation"}
        </Button>
      </div>

      {error && <p className="text-sm text-status-critical">{error}</p>}
      {loading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.narrative}</p>
              <CitationList urls={result.citations} />
            </CardContent>
          </Card>

          {result.chain.length > 0 && (
            <ol className="flex flex-col">
              {result.chain.map((step, i) => (
                <li
                  key={`${step.actor}-${step.observed_at}`}
                  className="relative flex gap-4 pb-6 opacity-0 animate-[fadeInUp_0.4s_ease-out_forwards]"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  {i < result.chain.length - 1 && (
                    <span aria-hidden="true" className="absolute top-8 left-[15px] h-full w-px bg-border" />
                  )}
                  <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium tabular-nums">
                    {i + 1}
                  </span>
                  <Card className="flex-1">
                    <CardContent className="flex flex-col gap-2 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{step.actor}</span>
                        <div className="flex items-center gap-2">
                          <SentimentBadge sentiment={step.sentiment} score={step.sentiment_score} />
                          <span className="text-xs text-muted-foreground">
                            {new Date(step.observed_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">&ldquo;{step.statement_text}&rdquo;</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
