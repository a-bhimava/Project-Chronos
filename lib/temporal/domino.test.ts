import { describe, expect, it } from "vitest";
import { domino } from "@/lib/temporal/domino";
import { fixture } from "@/lib/temporal/fixtures";

describe("domino", () => {
  it("chains actors whose flips fall within windowDays of the previous chain entry", () => {
    const memories = [
      fixture({ actor: "S&P downgrade wave", entity: "x", sentiment: "negative", sentiment_score: -0.6, observed_at: "2008-01-01T00:00:00Z" }),
      fixture({ actor: "DOJ", entity: "x", sentiment: "negative", sentiment_score: -0.5, observed_at: "2008-01-10T00:00:00Z" }), // +9d
      fixture({ actor: "States AG coalition", entity: "x", sentiment: "mixed", sentiment_score: -0.2, observed_at: "2008-01-18T00:00:00Z" }), // +8d
    ];

    const chain = domino(memories, 14, "negative");
    expect(chain.map((s) => s.actor)).toEqual(["S&P downgrade wave", "DOJ", "States AG coalition"]);
  });

  it("excludes an actor whose flip is outside the window from the previous chain entry", () => {
    const memories = [
      fixture({ actor: "S&P", entity: "x", sentiment: "negative", sentiment_score: -0.6, observed_at: "2008-01-01T00:00:00Z" }),
      fixture({ actor: "Moody's", entity: "x", sentiment: "negative", sentiment_score: -0.5, observed_at: "2008-03-01T00:00:00Z" }), // way outside window
    ];

    const chain = domino(memories, 14, "negative");
    expect(chain.map((s) => s.actor)).toEqual(["S&P"]);
  });

  it("keeps the chain going if a later actor is still within window of the LAST added entry", () => {
    const memories = [
      fixture({ actor: "S&P", entity: "x", sentiment: "negative", sentiment_score: -0.6, observed_at: "2008-01-01T00:00:00Z" }),
      fixture({ actor: "Moody's", entity: "x", sentiment: "negative", sentiment_score: -0.5, observed_at: "2008-01-10T00:00:00Z" }),
      // DOJ is 20 days after S&P, but only 10 days after Moody's (the last added) -> should be included
      fixture({ actor: "DOJ", entity: "x", sentiment: "negative", sentiment_score: -0.4, observed_at: "2008-01-20T00:00:00Z" }),
    ];

    const chain = domino(memories, 14, "negative");
    expect(chain.map((s) => s.actor)).toEqual(["S&P", "Moody's", "DOJ"]);
  });

  it("only considers the earliest flip per actor, ignoring repeats", () => {
    const memories = [
      fixture({ actor: "S&P", entity: "x", sentiment: "negative", sentiment_score: -0.3, observed_at: "2008-01-05T00:00:00Z" }),
      fixture({ actor: "S&P", entity: "x", sentiment: "negative", sentiment_score: -0.7, observed_at: "2008-01-01T00:00:00Z" }), // earlier
    ];
    const chain = domino(memories, 14, "negative");
    expect(chain).toHaveLength(1);
    expect(chain[0].observed_at).toBe("2008-01-01T00:00:00Z");
  });

  it("returns an empty chain when no memories match the sentiment direction", () => {
    const memories = [
      fixture({ actor: "S&P", entity: "x", sentiment: "positive", sentiment_score: 0.6, observed_at: "2008-01-01T00:00:00Z" }),
    ];
    expect(domino(memories, 14, "negative")).toEqual([]);
  });
});
