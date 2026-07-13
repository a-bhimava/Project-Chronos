import type { ParsedMemory, Sentiment } from "@/lib/types";
import { normalizeKolKey } from "@/lib/temporal/parse";

export type DominoStep = {
  kol: string;
  observed_at: string;
  sentiment: Sentiment;
  sentiment_score: number;
  statement_text: string;
  source_url: string;
};

export type DominoDirection = "negative" | "positive";

const NEGATIVE_SENTIMENTS: Sentiment[] = ["negative", "mixed"];
const POSITIVE_SENTIMENTS: Sentiment[] = ["positive"];

/**
 * Detects a time-ordered propagation chain: KOL A flips stance, then KOL B
 * flips within `windowDays` of A, then KOL C flips within `windowDays` of B,
 * etc. This is deliberately NOT "everyone who ever mentioned the entity
 * negatively" — each step must land within the window of the PREVIOUS
 * chain entry, not just of the seed, to represent actual propagation.
 */
export function domino(
  memories: ParsedMemory[],
  windowDays: number,
  direction: DominoDirection = "negative",
): DominoStep[] {
  const wantedSentiments =
    direction === "negative" ? NEGATIVE_SENTIMENTS : POSITIVE_SENTIMENTS;

  const matching = memories.filter(
    (m) =>
      m.meta.predicate !== "captured_content" &&
      m.meta.sentiment &&
      wantedSentiments.includes(m.meta.sentiment),
  );

  // First flip per KOL: earliest matching-sentiment statement. Keyed by
  // normalized name so credential-suffix variants ("Dr. X, MD" vs "Dr. X")
  // collapse to one person instead of fragmenting the chain.
  const firstFlipByKol = new Map<string, ParsedMemory>();
  for (const memory of matching) {
    if (!memory.meta.kol) continue;
    const key = normalizeKolKey(memory.meta.kol);
    const observedAt = new Date(memory.meta.observed_at).getTime();
    if (Number.isNaN(observedAt)) continue;

    const current = firstFlipByKol.get(key);
    if (!current || new Date(current.meta.observed_at).getTime() > observedAt) {
      firstFlipByKol.set(key, memory);
    }
  }

  const sortedEvents = [...firstFlipByKol.entries()].sort(
    ([, a], [, b]) =>
      new Date(a.meta.observed_at).getTime() - new Date(b.meta.observed_at).getTime(),
  );

  if (sortedEvents.length === 0) return [];

  const toStep = ([, memory]: [string, ParsedMemory]): DominoStep => ({
    kol: memory.meta.kol!.split(",")[0].trim(),
    observed_at: memory.meta.observed_at,
    sentiment: memory.meta.sentiment ?? "neutral",
    sentiment_score: memory.meta.sentiment_score ?? 0,
    statement_text: memory.statement,
    source_url: memory.meta.source_url,
  });

  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const chain: DominoStep[] = [toStep(sortedEvents[0])];
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
