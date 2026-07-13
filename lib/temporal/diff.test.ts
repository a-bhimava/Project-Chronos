import { describe, expect, it } from "vitest";
import { diff } from "@/lib/temporal/diff";
import { stateAsOf } from "@/lib/temporal/stateAsOf";
import { fixture } from "@/lib/temporal/fixtures";

describe("diff", () => {
  it("classifies all 5 shift categories correctly", () => {
    const relations = [
      // Dr. A: positive in Jan, negative by May -> shifted_negative
      fixture({ kol: "Dr. A", entity: "x", sentiment: "positive", sentiment_score: 0.7, observed_at: "2026-01-05T00:00:00Z" }),
      fixture({ kol: "Dr. A", entity: "x", sentiment: "negative", sentiment_score: -0.6, observed_at: "2026-04-01T00:00:00Z" }),

      // Dr. B: negative in Jan, positive by May -> shifted_positive
      fixture({ kol: "Dr. B", entity: "x", sentiment: "negative", sentiment_score: -0.5, observed_at: "2026-01-10T00:00:00Z" }),
      fixture({ kol: "Dr. B", entity: "x", sentiment: "positive", sentiment_score: 0.6, observed_at: "2026-04-15T00:00:00Z" }),

      // Dr. C: positive both times, small delta -> unchanged
      fixture({ kol: "Dr. C", entity: "x", sentiment: "positive", sentiment_score: 0.5, observed_at: "2026-01-01T00:00:00Z" }),
      fixture({ kol: "Dr. C", entity: "x", sentiment: "positive", sentiment_score: 0.55, observed_at: "2026-04-01T00:00:00Z" }),

      // Dr. D: only appears after Jan 15 -> new_mention
      fixture({ kol: "Dr. D", entity: "x", sentiment: "negative", sentiment_score: -0.3, observed_at: "2026-03-01T00:00:00Z" }),

      // Dr. E: only appears before Jan 15, silent by May -> went_silent
      fixture({ kol: "Dr. E", entity: "x", sentiment: "positive", sentiment_score: 0.4, observed_at: "2026-01-05T00:00:00Z" }),
    ];

    const stateA = stateAsOf(relations, "2026-01-15T00:00:00Z");
    const stateB = stateAsOf(relations, "2026-05-15T00:00:00Z");
    const shifts = diff(stateA, stateB);

    const byKol = Object.fromEntries(shifts.map((s) => [s.kol, s.kind]));
    expect(byKol["Dr. A"]).toBe("shifted_negative");
    expect(byKol["Dr. B"]).toBe("shifted_positive");
    expect(byKol["Dr. C"]).toBe("unchanged");
    expect(byKol["Dr. D"]).toBe("new_mention");
    expect(byKol["Dr. E"]).toBe("went_silent");
  });
});
