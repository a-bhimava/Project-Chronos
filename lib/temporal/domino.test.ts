import { describe, expect, it } from "vitest";
import { domino } from "@/lib/temporal/domino";
import { fixture } from "@/lib/temporal/fixtures";

describe("domino", () => {
  it("chains KOLs whose flips fall within windowDays of the previous chain entry", () => {
    const relations = [
      fixture({ kol: "Dr. A", entity: "x", sentiment: "negative", sentiment_score: -0.6, observed_at: "2026-01-01T00:00:00Z" }),
      fixture({ kol: "Dr. B", entity: "x", sentiment: "negative", sentiment_score: -0.5, observed_at: "2026-01-10T00:00:00Z" }), // +9d from A
      fixture({ kol: "Dr. C", entity: "x", sentiment: "mixed", sentiment_score: -0.2, observed_at: "2026-01-18T00:00:00Z" }), // +8d from B
    ];

    const chain = domino(relations, 14, "negative");
    expect(chain.map((s) => s.kol)).toEqual(["Dr. A", "Dr. B", "Dr. C"]);
  });

  it("excludes a KOL whose flip is outside the window from the previous chain entry", () => {
    const relations = [
      fixture({ kol: "Dr. A", entity: "x", sentiment: "negative", sentiment_score: -0.6, observed_at: "2026-01-01T00:00:00Z" }),
      fixture({ kol: "Dr. B", entity: "x", sentiment: "negative", sentiment_score: -0.5, observed_at: "2026-03-01T00:00:00Z" }), // way outside window
    ];

    const chain = domino(relations, 14, "negative");
    expect(chain.map((s) => s.kol)).toEqual(["Dr. A"]);
  });

  it("keeps the chain going if a later KOL is still within window of the LAST added entry", () => {
    const relations = [
      fixture({ kol: "Dr. A", entity: "x", sentiment: "negative", sentiment_score: -0.6, observed_at: "2026-01-01T00:00:00Z" }),
      fixture({ kol: "Dr. B", entity: "x", sentiment: "negative", sentiment_score: -0.5, observed_at: "2026-01-10T00:00:00Z" }),
      // Dr. C is 20 days after A, but only 10 days after B (the last added) -> should be included
      fixture({ kol: "Dr. C", entity: "x", sentiment: "negative", sentiment_score: -0.4, observed_at: "2026-01-20T00:00:00Z" }),
    ];

    const chain = domino(relations, 14, "negative");
    expect(chain.map((s) => s.kol)).toEqual(["Dr. A", "Dr. B", "Dr. C"]);
  });

  it("only considers the earliest flip per KOL, ignoring repeats", () => {
    const relations = [
      fixture({ kol: "Dr. A", entity: "x", sentiment: "negative", sentiment_score: -0.3, observed_at: "2026-01-05T00:00:00Z" }),
      fixture({ kol: "Dr. A", entity: "x", sentiment: "negative", sentiment_score: -0.7, observed_at: "2026-01-01T00:00:00Z" }), // earlier
    ];
    const chain = domino(relations, 14, "negative");
    expect(chain).toHaveLength(1);
    expect(chain[0].observed_at).toBe("2026-01-01T00:00:00Z");
  });

  it("returns an empty chain when no relations match the sentiment direction", () => {
    const relations = [
      fixture({ kol: "Dr. A", entity: "x", sentiment: "positive", sentiment_score: 0.6, observed_at: "2026-01-01T00:00:00Z" }),
    ];
    expect(domino(relations, 14, "negative")).toEqual([]);
  });
});
