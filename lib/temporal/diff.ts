import type { KolState } from "@/lib/temporal/stateAsOf";

export type ShiftKind =
  | "shifted_negative"
  | "shifted_positive"
  | "unchanged"
  | "new_mention"
  | "went_silent";

export type KolShift = {
  kol: string;
  kind: ShiftKind;
  stateA?: KolState;
  stateB?: KolState;
};

/** Sentiment scores within this margin of each other count as "unchanged". */
const SHIFT_THRESHOLD = 0.15;

/**
 * Diffs two point-in-time states (from stateAsOf) for the same entity and
 * classifies every KOL who appears in either snapshot.
 */
export function diff(
  stateA: Map<string, KolState>,
  stateB: Map<string, KolState>,
): KolShift[] {
  const allKols = new Set<string>([...stateA.keys(), ...stateB.keys()]);
  const shifts: KolShift[] = [];

  for (const kol of allKols) {
    const a = stateA.get(kol);
    const b = stateB.get(kol);

    if (!a && b) {
      shifts.push({ kol, kind: "new_mention", stateB: b });
      continue;
    }
    if (a && !b) {
      shifts.push({ kol, kind: "went_silent", stateA: a });
      continue;
    }
    if (a && b) {
      // stateAsOf carries the latest known statement forward indefinitely,
      // so presence in both snapshots is guaranteed once a KOL has spoken —
      // it does NOT mean they're still active. If B's statement is the exact
      // same one as A's (same observed_at), no fresh signal arrived in the
      // window: that's "went_silent", not "unchanged".
      if (b.observed_at === a.observed_at) {
        shifts.push({ kol, kind: "went_silent", stateA: a, stateB: b });
        continue;
      }
      const delta = b.sentiment_score - a.sentiment_score;
      let kind: ShiftKind = "unchanged";
      if (delta <= -SHIFT_THRESHOLD) kind = "shifted_negative";
      else if (delta >= SHIFT_THRESHOLD) kind = "shifted_positive";
      shifts.push({ kol, kind, stateA: a, stateB: b });
    }
  }

  return shifts.sort((x, y) => x.kol.localeCompare(y.kol));
}
