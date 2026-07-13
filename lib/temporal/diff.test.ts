import { describe, expect, it } from "vitest";
import { diff } from "@/lib/temporal/diff";
import { stateAsOf } from "@/lib/temporal/stateAsOf";
import { fixture } from "@/lib/temporal/fixtures";

describe("diff", () => {
  it("classifies all 5 shift categories correctly", () => {
    const memories = [
      // S&P: publicly positive early, then critical internal-awareness testimony surfaces -> shifted_negative
      fixture({ actor: "S&P", entity: "x", sentiment: "positive", sentiment_score: 0.7, observed_at: "2004-01-05T00:00:00Z" }),
      fixture({ actor: "S&P", entity: "x", sentiment: "negative", sentiment_score: -0.6, observed_at: "2015-02-03T00:00:00Z" }),

      // Moody's: critical testimony before the first cutoff, remedial settlement announcement before the second -> shifted_positive
      fixture({ actor: "Moody's", entity: "x", sentiment: "negative", sentiment_score: -0.5, observed_at: "2014-06-01T00:00:00Z" }),
      fixture({ actor: "Moody's", entity: "x", sentiment: "positive", sentiment_score: 0.6, observed_at: "2017-01-13T00:00:00Z" }),

      // DOJ: consistently critical both times, small delta -> unchanged
      fixture({ actor: "DOJ", entity: "x", sentiment: "negative", sentiment_score: -0.5, observed_at: "2015-01-01T00:00:00Z" }),
      fixture({ actor: "DOJ", entity: "x", sentiment: "negative", sentiment_score: -0.55, observed_at: "2015-04-01T00:00:00Z" }),

      // FCIC: only appears after the first cutoff -> new_mention
      fixture({ actor: "FCIC", entity: "x", sentiment: "negative", sentiment_score: -0.3, observed_at: "2015-03-01T00:00:00Z" }),

      // CalPERS: only appears before the first cutoff, silent by the second -> went_silent
      fixture({ actor: "CalPERS", entity: "x", sentiment: "positive", sentiment_score: 0.4, observed_at: "2015-01-05T00:00:00Z" }),
    ];

    const stateA = stateAsOf(memories, "2015-01-15T00:00:00Z");
    const stateB = stateAsOf(memories, "2017-05-15T00:00:00Z");
    const shifts = diff(stateA, stateB);

    const byActor = Object.fromEntries(shifts.map((s) => [s.actor, s.kind]));
    expect(byActor["S&P"]).toBe("shifted_negative");
    expect(byActor["Moody's"]).toBe("shifted_positive");
    expect(byActor["DOJ"]).toBe("unchanged");
    expect(byActor["FCIC"]).toBe("new_mention");
    expect(byActor["CalPERS"]).toBe("went_silent");
  });
});
