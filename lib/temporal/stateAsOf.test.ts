import { describe, expect, it } from "vitest";
import { stateAsOf } from "@/lib/temporal/stateAsOf";
import { normalizeActorKey } from "@/lib/temporal/parse";
import { fixture } from "@/lib/temporal/fixtures";

describe("stateAsOf", () => {
  it("picks the latest statement <= the cutoff date per actor", () => {
    const memories = [
      fixture({ actor: "S&P", entity: "RMBS ratings", sentiment: "positive", sentiment_score: 0.5, observed_at: "2005-01-10T00:00:00Z" }),
      fixture({ actor: "S&P", entity: "RMBS ratings", sentiment: "negative", sentiment_score: -0.6, observed_at: "2015-02-03T00:00:00Z" }),
      fixture({ actor: "S&P", entity: "RMBS ratings", sentiment: "negative", sentiment_score: -0.8, observed_at: "2026-01-01T00:00:00Z" }), // after cutoff
    ];

    const state = stateAsOf(memories, "2020-01-01T00:00:00Z");
    expect(state.size).toBe(1);
    expect(state.get(normalizeActorKey("S&P"))?.sentiment).toBe("negative");
    expect(state.get(normalizeActorKey("S&P"))?.observed_at).toBe("2015-02-03T00:00:00Z");
  });

  it("excludes actors with no statement before the cutoff", () => {
    const memories = [
      fixture({ actor: "Moody's", entity: "RMBS ratings", sentiment: "positive", sentiment_score: 0.5, observed_at: "2017-01-13T00:00:00Z" }),
    ];
    const state = stateAsOf(memories, "2010-01-01T00:00:00Z");
    expect(state.size).toBe(0);
  });

  it("ignores captured_content archive rows", () => {
    const memories = [
      fixture({ actor: "https://x.com/some/url", entity: "RMBS ratings", sentiment: "neutral", sentiment_score: 0, observed_at: "2015-01-01T00:00:00Z", predicate: "captured_content" }),
    ];
    const state = stateAsOf(memories, "2026-12-01T00:00:00Z");
    expect(state.size).toBe(0);
  });

  it("tracks multiple actors independently", () => {
    const memories = [
      fixture({ actor: "S&P", entity: "RMBS ratings", sentiment: "positive", sentiment_score: 0.7, observed_at: "2005-01-01T00:00:00Z" }),
      fixture({ actor: "DOJ", entity: "RMBS ratings", sentiment: "negative", sentiment_score: -0.4, observed_at: "2015-02-03T00:00:00Z" }),
    ];
    const state = stateAsOf(memories, "2026-12-01T00:00:00Z");
    expect(state.size).toBe(2);
    expect(state.get(normalizeActorKey("S&P"))?.sentiment).toBe("positive");
    expect(state.get(normalizeActorKey("DOJ"))?.sentiment).toBe("negative");
  });
});
