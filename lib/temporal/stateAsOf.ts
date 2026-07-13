import type { ParsedMemory, Sentiment } from "@/lib/types";
import { normalizeActorKey } from "@/lib/temporal/parse";

export type ActorState = {
  actor: string;
  entity: string;
  predicate: string;
  sentiment: Sentiment;
  sentiment_score: number;
  statement_text: string;
  source_url: string;
  observed_at: string;
};

/**
 * Point-in-time graph state: for each actor, the most recent statement whose
 * observed_at is <= asOfDate. This is the entire "time travel" feature —
 * HydraDB has no native as-of query, so this is pure post-processing over
 * memories already pulled back from its hybrid/graph search.
 */
export function stateAsOf(
  memories: ParsedMemory[],
  asOfDate: string,
): Map<string, ActorState> {
  const cutoff = new Date(asOfDate).getTime();
  const latestByActor = new Map<string, ParsedMemory>();

  for (const memory of memories) {
    if (memory.meta.predicate === "captured_content") continue;
    if (!memory.meta.actor) continue;
    const key = normalizeActorKey(memory.meta.actor);

    const observedAt = new Date(memory.meta.observed_at).getTime();
    if (Number.isNaN(observedAt) || observedAt > cutoff) continue;

    const current = latestByActor.get(key);
    if (!current || new Date(current.meta.observed_at).getTime() < observedAt) {
      latestByActor.set(key, memory);
    }
  }

  const result = new Map<string, ActorState>();
  for (const [key, memory] of latestByActor) {
    result.set(key, {
      actor: memory.meta.actor!.split(",")[0].trim(),
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
