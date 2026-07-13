import { describe, expect, it } from "vitest";
import { stateAsOf } from "@/lib/temporal/stateAsOf";
import { normalizeKolKey } from "@/lib/temporal/parse";
import { fixture } from "@/lib/temporal/fixtures";

describe("stateAsOf", () => {
  it("picks the latest relation <= the cutoff date per KOL", () => {
    const relations = [
      fixture({ kol: "Dr. A", entity: "orforglipron", sentiment: "positive", sentiment_score: 0.5, observed_at: "2026-01-10T00:00:00Z" }),
      fixture({ kol: "Dr. A", entity: "orforglipron", sentiment: "negative", sentiment_score: -0.6, observed_at: "2026-03-01T00:00:00Z" }),
      fixture({ kol: "Dr. A", entity: "orforglipron", sentiment: "negative", sentiment_score: -0.8, observed_at: "2026-06-01T00:00:00Z" }), // after cutoff
    ];

    const state = stateAsOf(relations, "2026-05-15T00:00:00Z");
    expect(state.size).toBe(1);
    expect(state.get(normalizeKolKey("Dr. A"))?.sentiment).toBe("negative");
    expect(state.get(normalizeKolKey("Dr. A"))?.observed_at).toBe("2026-03-01T00:00:00Z");
  });

  it("excludes KOLs with no relation before the cutoff", () => {
    const relations = [
      fixture({ kol: "Dr. B", entity: "orforglipron", sentiment: "positive", sentiment_score: 0.5, observed_at: "2026-06-01T00:00:00Z" }),
    ];
    const state = stateAsOf(relations, "2026-01-01T00:00:00Z");
    expect(state.size).toBe(0);
  });

  it("ignores captured_content archive rows", () => {
    const relations = [
      fixture({ kol: "https://x.com/some/url", entity: "orforglipron", sentiment: "neutral", sentiment_score: 0, observed_at: "2026-01-01T00:00:00Z", predicate: "captured_content" }),
    ];
    const state = stateAsOf(relations, "2026-12-01T00:00:00Z");
    expect(state.size).toBe(0);
  });

  it("tracks multiple KOLs independently", () => {
    const relations = [
      fixture({ kol: "Dr. A", entity: "orforglipron", sentiment: "positive", sentiment_score: 0.7, observed_at: "2026-01-01T00:00:00Z" }),
      fixture({ kol: "Dr. B", entity: "orforglipron", sentiment: "negative", sentiment_score: -0.4, observed_at: "2026-02-01T00:00:00Z" }),
    ];
    const state = stateAsOf(relations, "2026-12-01T00:00:00Z");
    expect(state.size).toBe(2);
    expect(state.get(normalizeKolKey("Dr. A"))?.sentiment).toBe("positive");
    expect(state.get(normalizeKolKey("Dr. B"))?.sentiment).toBe("negative");
  });
});
