import { describe, expect, it } from "vitest";
import { buildMemoryText, parseMemoryText, stripMeta } from "@/lib/temporal/parse";
import type { ChronosMeta } from "@/lib/types";

describe("parseMemoryText / buildMemoryText", () => {
  it("round-trips a memory built with buildMemoryText", () => {
    const meta: ChronosMeta = {
      kol: "Dr. Jane Smith",
      entity: "Orforglipron",
      predicate: "supports",
      observed_at: "2026-04-02T00:00:00Z",
      date_confidence: "exact",
      sentiment: "positive",
      sentiment_score: 0.8,
      source_url: "https://x.com/janesmith/1",
      topic_id: "orforglipron",
      captured_at: "2026-07-13T00:00:00Z",
    };
    const sentence = "Dr. Jane Smith called the results promising.";
    const text = buildMemoryText(sentence, meta);

    const parsed = parseMemoryText(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.meta.observed_at).toBe("2026-04-02T00:00:00Z");
    expect(parsed!.meta.sentiment).toBe("positive");
    expect(parsed!.meta.kol).toBe("Dr. Jane Smith");
    expect(parsed!.statement).toBe(sentence);
  });

  it("returns null when there is no META block", () => {
    expect(parseMemoryText("just a plain sentence, no metadata")).toBeNull();
  });

  it("returns null when the META block is malformed JSON", () => {
    expect(parseMemoryText("hello [[META:{not valid json]]")).toBeNull();
  });

  it("returns null when required fields are missing from META", () => {
    expect(parseMemoryText('hello [[META:{"observed_at":"2026-01-01T00:00:00Z"}]]')).toBeNull();
  });

  it("strips the META block for display", () => {
    const text = 'Hello world. [[META:{"observed_at":"2026-01-01T00:00:00Z","entity":"x"}]]';
    expect(stripMeta(text)).toBe("Hello world.");
  });
});
