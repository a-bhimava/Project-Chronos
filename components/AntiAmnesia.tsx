"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveStatusBadge } from "@/components/LiveStatusBadge";
import { SentimentBadge } from "@/components/SentimentBadge";
import type { LiveStatus } from "@/app/api/query/anti-amnesia/route";
import type { Sentiment } from "@/lib/types";

type AntiAmnesiaResponse = {
  url: string;
  archived_markdown: string;
  captured_at: string;
  source_title?: string;
  status: LiveStatus;
  live_diff_summary?: string;
  related_kol_relations: Array<{
    kol: string | null;
    entity: string;
    predicate: string;
    sentiment?: Sentiment;
    statement_text: string;
    observed_at: string;
  }>;
};

export function AntiAmnesia({ exampleUrls }: { exampleUrls: string[] }) {
  const [url, setUrl] = useState(exampleUrls[0] ?? "");
  const [result, setResult] = useState<AntiAmnesiaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(targetUrl: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/query/anti-amnesia?url=${encodeURIComponent(targetUrl)}`);
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
        <div className="flex flex-1 min-w-64 flex-col gap-1.5">
          <Label htmlFor="anti-amnesia-url">Captured URL</Label>
          <Input
            id="anti-amnesia-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <Button onClick={() => handleLookup(url)} disabled={loading || !url}>
          {loading ? "Looking up…" : "Check archive"}
        </Button>
      </div>

      {exampleUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Try:</span>
          {exampleUrls.map((example) => (
            <button
              key={example}
              onClick={() => {
                setUrl(example);
                handleLookup(example);
              }}
              className="text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              {new URL(example).hostname.replace(/^www\./, "")}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-status-critical">{error}</p>}

      {loading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <LiveStatusBadge status={result.status} />
            <span className="text-xs text-muted-foreground">
              Captured {new Date(result.captured_at).toLocaleString()}
            </span>
          </div>

          {result.live_diff_summary && (
            <p className="text-sm text-status-warning">{result.live_diff_summary}</p>
          )}

          <Card>
            <CardContent className="pt-6">
              {result.source_title && (
                <p className="mb-2 text-sm font-medium">{result.source_title}</p>
              )}
              <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
                {result.archived_markdown}
              </pre>
            </CardContent>
          </Card>

          {result.related_kol_relations.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Statements extracted from this capture</span>
              {result.related_kol_relations.map((relation, i) => (
                <Card key={i}>
                  <CardContent className="flex flex-col gap-1 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {relation.kol ?? `${relation.entity} (official)`}
                      </span>
                      {relation.sentiment && <SentimentBadge sentiment={relation.sentiment} />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      &ldquo;{relation.statement_text}&rdquo;
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
