import type { ParsedMemory, Sentiment } from "@/lib/types";
import { normalizeKolKey } from "@/lib/temporal/parse";

export type KolState = {
  kol: string;
  entity: string;
  predicate: string;
  sentiment: Sentiment;
  sentiment_score: number;
  statement_text: string;
  source_url: string;
  observed_at: string;
};

/**
 * Point-in-time graph state: for each KOL, the most recent statement whose
 * observed_at is <= asOfDate. This is the entire "time travel" feature —
 * HydraDB has no native as-of query, so this is pure post-processing over
 * memories already pulled back from its hybrid/graph search.
 */
export function stateAsOf(
  memories: ParsedMemory[],
  asOfDate: string,
): Map<string, KolState> {
  const cutoff = new Date(asOfDate).getTime();
  const latestByKol = new Map<string, ParsedMemory>();

  for (const memory of memories) {
    if (memory.meta.predicate === "captured_content") continue;
    if (!memory.meta.kol) continue;
    const key = normalizeKolKey(memory.meta.kol);

    const observedAt = new Date(memory.meta.observed_at).getTime();
    if (Number.isNaN(observedAt) || observedAt > cutoff) continue;

    const current = latestByKol.get(key);
    if (!current || new Date(current.meta.observed_at).getTime() < observedAt) {
      latestByKol.set(key, memory);
    }
  }

  const result = new Map<string, KolState>();
  for (const [key, memory] of latestByKol) {
    result.set(key, {
      kol: memory.meta.kol!.split(",")[0].trim(),
      entity: memory.meta.entity,
      predicate: memory.meta.predicate,
      sentiment: memory.meta.sentiment ?? "neutral",
      sentiment_score: memory.meta.sentiment_score ?? 0,
      statement_text: memory.statement,
      source_url: memory.meta.source_url,
      observed_at: memory.meta.observed_at,
    });
  }
  return result;
}
