"use client";

import { Fragment, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/components/TenantContext";
import { SentimentBadge } from "@/components/SentimentBadge";
import { LiveStatusBadge } from "@/components/LiveStatusBadge";
import type { SourceEntry } from "@/app/api/sources/route";
import type { LiveStatus } from "@/app/api/query/anti-amnesia/route";
import type { Sentiment } from "@/lib/types";

type CaptureDetail = {
  archived_markdown: string;
  captured_at: string;
  status: LiveStatus;
  live_diff_summary?: string;
  related_actor_statements: Array<{
    actor: string | null;
    entity: string;
    predicate: string;
    sentiment?: Sentiment;
    statement_text: string;
    observed_at: string;
  }>;
};

export function SourcesView() {
  const [sources, setSources] = useState<SourceEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<CaptureDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { tenantId } = useTenant();

  useEffect(() => {
    fetch("/api/sources", {
      headers: tenantId ? { "x-tenant-id": tenantId } : {},
    })
      .then((res) => res.json())
      .then((data) => setSources(data.sources))
      .catch(() => setError("Failed to load sources."));
  }, [tenantId]);

  async function toggleExpand(url: string) {
    if (expanded === url) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(url);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/query/anti-amnesia?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (res.ok) setDetail(data);
    } finally {
      setDetailLoading(false);
    }
  }

  if (error) return <p className="text-sm text-status-critical">{error}</p>;
  if (!sources) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (sources.length === 0) {
    return <p className="text-sm text-muted-foreground">No sources ingested yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Entity</th>
              <th className="px-4 py-2 font-medium">Captured</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <Fragment key={s.url}>
                <tr className="border-t">
                  <td className="max-w-md truncate px-4 py-2">{s.title ?? s.url}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.topic_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(s.captured_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => toggleExpand(s.url)}>
                      {expanded === s.url ? "Hide" : "View capture"}
                    </Button>
                  </td>
                </tr>
                {expanded === s.url && (
                  <tr className="border-t bg-muted/20">
                    <td colSpan={4} className="px-4 py-4">
                      {detailLoading && <Skeleton className="h-32 w-full" />}
                      {detail && (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <LiveStatusBadge status={detail.status} />
                            <span className="text-xs text-muted-foreground">
                              Captured {new Date(detail.captured_at).toLocaleString()}
                            </span>
                          </div>
                          {detail.live_diff_summary && (
                            <p className="text-sm text-status-warning">{detail.live_diff_summary}</p>
                          )}
                          <Card>
                            <CardContent className="pt-4">
                              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs text-muted-foreground">
                                {detail.archived_markdown}
                              </pre>
                            </CardContent>
                          </Card>
                          {detail.related_actor_statements.length > 0 && (
                            <div className="flex flex-col gap-2">
                              {detail.related_actor_statements.map((rel, i) => (
                                <div key={i} className="flex items-start justify-between gap-3 text-sm">
                                  <span className="text-muted-foreground">
                                    {rel.actor ?? rel.entity}: &ldquo;{rel.statement_text}&rdquo;
                                  </span>
                                  {rel.sentiment && <SentimentBadge sentiment={rel.sentiment} />}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
