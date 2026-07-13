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
import type { DominoStep } from "@/lib/temporal/domino";

type DominoResponse = {
  entity: string;
  windowDays: number;
  direction: "negative" | "positive";
  narrative: string;
  chain: DominoStep[];
  citations: string[];
};

export function DominoChain({ topics }: { topics: Topic[] }) {
  const [entity, setEntity] = useState(topics[0]?.id ?? "");
  const [windowDays, setWindowDays] = useState(21);
  const [result, setResult] = useState<DominoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFind() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams({ entity, windowDays: String(windowDays) });
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
          <Label htmlFor="domino-entity">Drug</Label>
          <Select value={entity} onValueChange={(value) => value && setEntity(value)}>
            <SelectTrigger id="domino-entity" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topics.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.drug_name} ({t.company})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="domino-window">Propagation window (days)</Label>
          <Input
            id="domino-window"
            type="number"
            min={1}
            max={180}
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="w-32"
          />
        </div>
        <Button onClick={handleFind} disabled={loading || !entity}>
          {loading ? "Searching…" : "Find chain reaction"}
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
                <li key={`${step.kol}-${step.observed_at}`} className="relative flex gap-4 pb-6">
                  {i < result.chain.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-8 left-[15px] h-full w-px bg-border"
                    />
                  )}
                  <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium tabular-nums">
                    {i + 1}
                  </span>
                  <Card className="flex-1">
                    <CardContent className="flex flex-col gap-2 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{step.kol}</span>
                        <div className="flex items-center gap-2">
                          <SentimentBadge sentiment={step.sentiment} score={step.sentiment_score} />
                          <span className="text-xs text-muted-foreground">
                            {new Date(step.observed_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        &ldquo;{step.statement_text}&rdquo;
                      </p>
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
