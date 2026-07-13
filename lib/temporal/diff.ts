import type { ActorState } from "@/lib/temporal/stateAsOf";

export type ShiftKind =
  | "shifted_negative"
  | "shifted_positive"
  | "unchanged"
  | "new_mention"
  | "went_silent";

export type ActorShift = {
  actor: string;
  kind: ShiftKind;
  stateA?: ActorState;
  stateB?: ActorState;
};

/** Sentiment scores within this margin of each other count as "unchanged". */
const SHIFT_THRESHOLD = 0.15;

/**
 * Diffs two point-in-time states (from stateAsOf) for the same entity and
 * classifies every actor who appears in either snapshot.
 */
export function diff(
  stateA: Map<string, ActorState>,
  stateB: Map<string, ActorState>,
): ActorShift[] {
  const allActors = new Set<string>([...stateA.keys(), ...stateB.keys()]);
  const shifts: ActorShift[] = [];

  for (const key of allActors) {
    const a = stateA.get(key);
    const b = stateB.get(key);
    // Map keys are normalizeActorKey()'d (lowercase, suffix-stripped) for
    // grouping — always display the ActorState's own `.actor`, never the key.
    const actor = (a ?? b)!.actor;

    if (!a && b) {
      shifts.push({ actor, kind: "new_mention", stateB: b });
      continue;
    }
    if (a && !b) {
      shifts.push({ actor, kind: "went_silent", stateA: a });
      continue;
    }
    if (a && b) {
      // stateAsOf carries the latest known statement forward indefinitely,
      // so presence in both snapshots is guaranteed once an actor has spoken
      // — it does NOT mean they're still active. If B's statement is the
      // exact same one as A's (same observed_at), no fresh signal arrived in
      // the window: that's "went_silent", not "unchanged".
      if (b.observed_at === a.observed_at) {
        shifts.push({ actor, kind: "went_silent", stateA: a, stateB: b });
        continue;
      }
      const delta = b.sentiment_score - a.sentiment_score;
      let kind: ShiftKind = "unchanged";
      if (delta <= -SHIFT_THRESHOLD) kind = "shifted_negative";
      else if (delta >= SHIFT_THRESHOLD) kind = "shifted_positive";
      shifts.push({ actor, kind, stateA: a, stateB: b });
    }
  }

  return shifts.sort((x, y) => x.actor.localeCompare(y.actor));
}
