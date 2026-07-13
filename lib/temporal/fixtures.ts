import type { ParsedMemory, Predicate, Sentiment } from "@/lib/types";

/** Test helper: builds a ParsedMemory without needing to round-trip through parse.ts. */
export function fixture(opts: {
  kol: string;
  entity: string;
  sentiment: Sentiment;
  sentiment_score: number;
  observed_at: string;
  statement_text?: string;
  source_url?: string;
  predicate?: Predicate;
}): ParsedMemory {
  const statement = opts.statement_text ?? `${opts.kol} on ${opts.entity}`;
  const source_url = opts.source_url ?? `https://example.com/${opts.kol.replace(/\s+/g, "-")}`;
  return {
    text: statement,
    statement,
    meta: {
      kol: opts.kol,
      entity: opts.entity,
      predicate: opts.predicate ?? "mentions",
      observed_at: opts.observed_at,
      date_confidence: "exact",
      sentiment: opts.sentiment,
      sentiment_score: opts.sentiment_score,
      statement_text: statement,
      source_url,
      topic_id: opts.entity,
      captured_at: opts.observed_at,
    },
  };
}
