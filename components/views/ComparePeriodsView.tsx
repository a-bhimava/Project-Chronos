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
import { ShiftBadge } from "@/components/ShiftBadge";
import { CitationList } from "@/components/Citation";
import type { Topic } from "@/lib/types";
import type { ActorShift } from "@/lib/temporal/diff";

type CompareResponse = {
  entity: string;
  dateA: string;
  dateB: string;
  narrative: string;
  shifts: ActorShift[];
  citations: string[];
};

export function ComparePeriodsView({ topics }: { topics: Topic[] }) {
  const [entity, setEntity] = useState(topics[0]?.id ?? "");
  // Defaults reflect real milestones in this corpus: pre-crisis baseline vs
  // the S&P settlement date.
  const [dateA, setDateA] = useState("2005-01-01");
  const [dateB, setDateB] = useState("2015-02-03");
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCompare() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams({ entity, dateA, dateB });
      const res = await fetch(`/api/query/compare?${params.toString()}`);
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
          <Label htmlFor="compare-entity">Entity</Label>
          <Select value={entity} onValueChange={(v) => v && setEntity(v)}>
            <SelectTrigger id="compare-entity" className="w-64">
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
          <Label htmlFor="compare-date-a">Date A</Label>
          <Input id="compare-date-a" type="date" value={dateA} onChange={(e) => setDateA(e.target.value)} className="w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="compare-date-b">Date B</Label>
          <Input id="compare-date-b" type="date" value={dateB} onChange={(e) => setDateB(e.target.value)} className="w-40" />
        </div>
        <Button onClick={handleCompare} disabled={loading || !entity}>
          {loading ? "Comparing…" : "Compare"}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {result.shifts.map((shift) => (
              <Card key={shift.actor}>
                <CardContent className="flex flex-col gap-2 pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{shift.actor}</span>
                    <ShiftBadge kind={shift.kind} />
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    <StateRow label={result.dateA} state={shift.stateA} />
                    <StateRow label={result.dateB} state={shift.stateB} />
                  </div>
                </CardContent>
              </Card>
            ))}
            {result.shifts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No named-actor statements found for {result.entity} in this period.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StateRow({ label, state }: { label: string; state?: ActorShift["stateA"] }) {
  if (!state) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="w-24 shrink-0 text-xs">{label}</span>
        <span className="italic">no statement yet</span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-col gap-1">
        <SentimentBadge sentiment={state.sentiment} score={state.sentiment_score} />
        <p className="text-muted-foreground">&ldquo;{state.statement_text}&rdquo;</p>
      </div>
    </div>
  );
}
