import { queryMemories } from "@/lib/hydra/query";
import { topics } from "@/lib/topics";

export type TimelineEntry = {
  actor: string | null;
  entity: string;
  predicate: string;
  sentiment?: string;
  sentiment_score?: number;
  statement_text: string;
  source_url: string;
  source_title?: string;
  observed_at: string;
  topic_id: string;
  topic_name: string;
};

/** Chronological feed of all ingested, dated statements across every topic —
 * the "narrative graph over time" view (a time-ordered feed rather than a
 * force-directed node graph, see plan for why). */
export async function GET() {
  const perTopic = await Promise.all(
    topics.map(async (topic) => {
      const memories = await queryMemories(
        `${topic.name} executive regulator testimony statement allegation finding announcement`,
        { maxResults: 50 },
      );
      return memories
        .filter((m) => m.meta.predicate !== "captured_content")
        .filter((m) => m.meta.date_confidence !== "crawl_fallback")
        .map(
          (m): TimelineEntry => ({
            actor: m.meta.actor ?? null,
            entity: m.meta.entity,
            predicate: m.meta.predicate,
            sentiment: m.meta.sentiment,
            sentiment_score: m.meta.sentiment_score,
            statement_text: m.statement,
            source_url: m.meta.source_url,
            source_title: m.meta.source_title,
            observed_at: m.meta.observed_at,
            topic_id: topic.id,
            topic_name: topic.name,
          }),
        );
    }),
  );

  const seen = new Set<string>();
  const merged: TimelineEntry[] = [];
  for (const entry of perTopic.flat()) {
    const key = `${entry.source_url}|${entry.actor}|${entry.observed_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }

  merged.sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime());

  return Response.json({ entries: merged.slice(0, 150) });
}
