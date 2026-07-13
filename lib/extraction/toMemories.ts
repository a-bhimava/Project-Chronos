import { buildMemoryText } from "@/lib/temporal/parse";
import type { ExtractedRelation } from "@/lib/extraction/schema";
import type { ChronosMemory, ChronosMeta, DateConfidence, Topic } from "@/lib/types";
import { createHash } from "node:crypto";

export type ObservedAtResolution = {
  observed_at: string;
  date_confidence: DateConfidence;
};

const MAX_STATEMENT_CHARS = 500;

/** Truncates on our side rather than constraining the model's schema (see schema.ts). */
function truncateStatement(text: string): string {
  if (text.length <= MAX_STATEMENT_CHARS) return text;
  return `${text.slice(0, MAX_STATEMENT_CHARS - 1).trimEnd()}…`;
}

/**
 * Our own observed_at resolution (never HydraDB's — it has no concept of
 * this): prefer the date the extraction found stated in the document text,
 * fall back to the midpoint of the freshness range used for the search
 * query (for historical backfills), else the crawl timestamp.
 */
export function resolveObservedAt(
  publishedOrEventDate: string | null,
  freshnessRange: { start: string; end: string } | null,
  crawledAt: string,
): ObservedAtResolution {
  if (publishedOrEventDate) {
    const t = new Date(publishedOrEventDate).getTime();
    if (!Number.isNaN(t)) {
      return { observed_at: publishedOrEventDate, date_confidence: "exact" };
    }
  }
  if (freshnessRange) {
    const startMs = new Date(freshnessRange.start).getTime();
    const endMs = new Date(freshnessRange.end).getTime();
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
      const midpoint = new Date((startMs + endMs) / 2).toISOString();
      return { observed_at: midpoint, date_confidence: "range_midpoint" };
    }
  }
  return { observed_at: crawledAt, date_confidence: "crawl_fallback" };
}

/** Builds the one captured_content archive memory for a crawled URL (the anti-amnesia record). */
export function buildCapturedContentMemory(opts: {
  url: string;
  title?: string;
  fullMarkdown: string;
  topic: Topic;
  capturedAt: string;
}): ChronosMemory {
  const truncated = opts.fullMarkdown.slice(0, 6000);
  const contentHash = `sha256:${createHash("sha256").update(opts.fullMarkdown).digest("hex")}`;

  const meta: ChronosMeta = {
    entity: opts.topic.drug_name,
    predicate: "captured_content",
    observed_at: opts.capturedAt,
    date_confidence: "crawl_fallback",
    source_url: opts.url,
    source_title: opts.title,
    topic_id: opts.topic.id,
    captured_at: opts.capturedAt,
    content_hash: contentHash,
  };

  return {
    text: buildMemoryText(`Archived content captured from ${opts.url}:\n\n${truncated}`, meta),
    meta,
  };
}

/** Builds one memory per extracted KOL/company relation, citing the captured_content row's URL. */
export function buildRelationMemories(opts: {
  relations: ExtractedRelation[];
  topic: Topic;
  sourceUrl: string;
  sourceTitle?: string;
  observed: ObservedAtResolution;
  capturedAt: string;
}): ChronosMemory[] {
  return opts.relations.map((relation) => {
    const statementText = truncateStatement(relation.statement_text);
    const meta: ChronosMeta = {
      kol: relation.kol,
      entity: relation.entity,
      predicate: relation.predicate,
      observed_at: opts.observed.observed_at,
      date_confidence: opts.observed.date_confidence,
      sentiment: relation.sentiment,
      sentiment_score: relation.sentiment_score,
      statement_text: statementText,
      source_url: opts.sourceUrl,
      source_title: opts.sourceTitle,
      topic_id: opts.topic.id,
      captured_at: opts.capturedAt,
      hydra_doc_source: opts.sourceUrl,
    };

    const who = relation.kol ?? `${opts.topic.company} (official)`;
    const sentence = `${who} ${relation.predicate.replace(/_/g, " ")} ${relation.entity}: "${statementText}"`;

    return { text: buildMemoryText(sentence, meta), meta };
  });
}
