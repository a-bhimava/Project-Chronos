import type { ParsedMemory, Sentiment } from "@/lib/types";
import { normalizeActorKey } from "@/lib/temporal/parse";

export type ChainStep = {
  actor: string;
  observed_at: string;
  sentiment: Sentiment;
  sentiment_score: number;
  statement_text: string;
  source_url: string;
};

export type ChainDirection = "negative" | "positive";

const NEGATIVE_SENTIMENTS: Sentiment[] = ["negative", "mixed"];
const POSITIVE_SENTIMENTS: Sentiment[] = ["positive"];

/**
 * Detects a time-ordered propagation chain: actor A takes a position, then
 * actor B follows within `windowDays` of A, then actor C follows within
 * `windowDays` of B, etc. This is deliberately NOT "everyone who ever said
 * something negative" — each step must land within the window of the
 * PREVIOUS chain entry, not just of the seed, to represent actual escalation
 * (e.g. internal testimony -> downgrade wave -> DOJ settlement -> a second
 * regulator's settlement).
 */
export function domino(
  memories: ParsedMemory[],
  windowDays: number,
  direction: ChainDirection = "negative",
): ChainStep[] {
  const wantedSentiments =
    direction === "negative" ? NEGATIVE_SENTIMENTS : POSITIVE_SENTIMENTS;

  const matching = memories.filter(
    (m) =>
      m.meta.predicate !== "captured_content" &&
      m.meta.sentiment &&
      wantedSentiments.includes(m.meta.sentiment),
  );

  // First flip per actor: earliest matching-sentiment statement. Keyed by
  // normalized name so naming variants ("S&P" vs "Standard & Poor's
  // Financial Services LLC") collapse to one actor instead of fragmenting
  // the chain.
  const firstFlipByActor = new Map<string, ParsedMemory>();
  for (const memory of matching) {
    if (!memory.meta.actor) continue;
    const key = normalizeActorKey(memory.meta.actor);
    const observedAt = new Date(memory.meta.observed_at).getTime();
    if (Number.isNaN(observedAt)) continue;

    const current = firstFlipByActor.get(key);
    if (!current || new Date(current.meta.observed_at).getTime() > observedAt) {
      firstFlipByActor.set(key, memory);
    }
  }

  const sortedEvents = [...firstFlipByActor.entries()].sort(
    ([, a], [, b]) =>
      new Date(a.meta.observed_at).getTime() - new Date(b.meta.observed_at).getTime(),
  );

  if (sortedEvents.length === 0) return [];

  const toStep = ([, memory]: [string, ParsedMemory]): ChainStep => ({
    actor: memory.meta.actor!.split(",")[0].trim(),
    observed_at: memory.meta.observed_at,
    sentiment: memory.meta.sentiment ?? "neutral",
    sentiment_score: memory.meta.sentiment_score ?? 0,
    statement_text: memory.statement,
    source_url: memory.meta.source_url,
  });

  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const chain: ChainStep[] = [toStep(sortedEvents[0])];
  let lastAddedDate = new Date(sortedEvents[0][1].meta.observed_at).getTime();

  for (let i = 1; i < sortedEvents.length; i++) {
    const [, memory] = sortedEvents[i];
    const observedAt = new Date(memory.meta.observed_at).getTime();
    if (observedAt - lastAddedDate <= windowMs) {
      chain.push(toStep(sortedEvents[i]));
      lastAddedDate = observedAt;
    }
  }

  return chain;
}
