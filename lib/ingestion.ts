import { youComSearch } from "@/lib/youcom/search";
import { youComContentsBatched } from "@/lib/youcom/contents";
import { extractRelations } from "@/lib/extraction/extract";
import {
  buildCapturedContentMemory,
  buildRelationMemories,
  resolveObservedAt,
} from "@/lib/extraction/toMemories";
import { ingestMemories } from "@/lib/hydra/ingest";
import type { Topic } from "@/lib/types";

export type IngestQueryResult = {
  query: string;
  urlsFound: number;
  urlsCrawled: number;
  memoriesIngested: number;
};

/**
 * The full pipeline: You.com search -> You.com contents (livecrawl) ->
 * Claude extraction -> HydraDB ingest. Shared by scripts/seed.ts (bulk
 * historical backfill) and app/api/ingest/route.ts (one query at a time,
 * bounded runtime, safe on Vercel).
 */
export async function runIngestForQuery(
  query: string,
  topic: Topic,
  options: { freshness?: string; count?: number } = {},
): Promise<IngestQueryResult> {
  const capturedAt = new Date().toISOString();

  // No freshness default: this corpus is historical (2003-2017 primary
  // sources). A "month"-style recency default — right for live pharma news
  // — would silently filter out every real document we actually need.
  // Callers that DO want a recency/date-range filter pass options.freshness
  // explicitly.
  const searchRes = await youComSearch(query, {
    count: options.count ?? 10,
    ...(options.freshness ? { freshness: options.freshness } : {}),
  });
  const webResults = searchRes.results.web ?? [];
  const topResults = webResults.slice(0, 5);
  if (topResults.length === 0) {
    return { query, urlsFound: 0, urlsCrawled: 0, memoriesIngested: 0 };
  }

  const contents = await youComContentsBatched(
    topResults.map((r) => r.url),
    { formats: ["markdown"] },
  );

  const freshnessRange = parseFreshnessRange(options.freshness);

  let memoriesIngested = 0;
  let urlsCrawled = 0;

  for (const content of contents) {
    if (!content.markdown || content.error) continue;
    urlsCrawled++;

    const webResult = topResults.find((r) => r.url === content.url);

    // Archive the raw content BEFORE extraction, so a failed/garbage
    // extraction never loses the anti-amnesia capture.
    const capturedMemory = buildCapturedContentMemory({
      url: content.url,
      title: webResult?.title,
      fullMarkdown: content.markdown,
      topic,
      capturedAt,
    });

    let relationMemories: ReturnType<typeof buildRelationMemories> = [];
    try {
      const extraction = await extractRelations(content.markdown, topic);
      const observed = resolveObservedAt(
        extraction.published_or_event_date,
        freshnessRange,
        capturedAt,
      );
      relationMemories = buildRelationMemories({
        relations: extraction.relations,
        topic,
        sourceUrl: content.url,
        sourceTitle: webResult?.title,
        observed,
        capturedAt,
      });
    } catch (err) {
      // Extraction failures shouldn't lose the raw capture we already built.
      console.error(`extraction failed for ${content.url}:`, err);
    }

    const result = await ingestMemories([capturedMemory, ...relationMemories]);
    memoriesIngested += result.successCount;
  }

  return { query, urlsFound: webResults.length, urlsCrawled, memoriesIngested };
}

function parseFreshnessRange(freshness?: string): { start: string; end: string } | null {
  if (!freshness) return null;
  const match = freshness.match(/^(\d{4}-\d{2}-\d{2})to(\d{4}-\d{2}-\d{2})$/);
  if (!match) return null;
  return { start: match[1], end: match[2] };
}
