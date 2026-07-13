export type Topic = {
  id: string;
  drug_name: string;
  brand_name?: string;
  company: string;
  class: string;
  queries: string[];
};

export type Predicate =
  | "supports"
  | "criticizes"
  | "mentions"
  | "announces"
  | "warns_about"
  | "participated_in"
  | "reports_on"
  | "captured_content";

export type Sentiment = "positive" | "negative" | "neutral" | "mixed";

export type DateConfidence = "exact" | "range_midpoint" | "crawl_fallback";

/**
 * The structured payload we embed as a [[META:{...}]] block inside every
 * memory's `text`. HydraDB's real ingest API (client.context.ingest) takes
 * free-text `memories`/`documents` that IT indexes and graphs itself — there
 * is no direct relations[] endpoint. So this META block, not any HydraDB
 * schema field, is the authoritative structured record for our own temporal
 * layer. We never depend on HydraDB preserving/returning anything beyond
 * plain text back to us.
 */
export type ChronosMeta = {
  kol?: string | null; // null for company/spokesperson statements
  entity: string; // drug/brand name this statement is about
  predicate: Predicate;
  observed_at: string; // ISO 8601 — when the statement was made/published
  date_confidence: DateConfidence;
  sentiment?: Sentiment;
  sentiment_score?: number;
  statement_text?: string; // verbatim/paraphrased quote, duplicated here for convenience
  source_url: string;
  source_title?: string;
  topic_id: string;
  captured_at: string; // ISO 8601 — when WE crawled/ingested it
  content_hash?: string; // sha256 of full captured markdown, for captured_content rows
  hydra_doc_source?: string; // URL of the captured_content row a kol-statement cites
};

/** What we build locally before handing text off to HydraDB's memories ingest. */
export type ChronosMemory = {
  text: string; // natural-language sentence(s) + trailing [[META:{...}]] block
  meta: ChronosMeta;
};

/** A memory as parsed back out of a HydraDB search chunk. */
export type ParsedMemory = {
  text: string; // raw text as stored/retrieved (includes the META block)
  statement: string; // text with the META block stripped, for display
  meta: ChronosMeta;
  relevancyScore?: number;
  chunkId?: string;
};
