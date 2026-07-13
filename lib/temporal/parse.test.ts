import { describe, expect, it } from "vitest";
import { buildMemoryText, parseMemoryText, stripMeta } from "@/lib/temporal/parse";
import type { ChronosMeta } from "@/lib/types";

describe("parseMemoryText / buildMemoryText", () => {
  it("round-trips a memory built with buildMemoryText", () => {
    const meta: ChronosMeta = {
      actor: "Department of Justice",
      entity: "S&P RMBS/CDO ratings",
      predicate: "criticizes",
      observed_at: "2015-02-03T00:00:00Z",
      date_confidence: "exact",
      sentiment: "negative",
      sentiment_score: -0.8,
      source_url: "https://www.justice.gov/archives/opa/pr/justice-department-and-state-partners-secure-1375-billion-settlement-sp-defrauding-investors",
      topic_id: "sp",
      captured_at: "2026-07-13T00:00:00Z",
    };
    const sentence = "DOJ alleged S&P misrepresented its ratings as objective and independent.";
    const text = buildMemoryText(sentence, meta);

    const parsed = parseMemoryText(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.meta.observed_at).toBe("2015-02-03T00:00:00Z");
    expect(parsed!.meta.sentiment).toBe("negative");
    expect(parsed!.meta.actor).toBe("Department of Justice");
    expect(parsed!.statement).toBe(sentence);
  });

  it("returns null when there is no META block", () => {
    expect(parseMemoryText("just a plain sentence, no metadata")).toBeNull();
  });

  it("returns null when the META block is malformed JSON", () => {
    expect(parseMemoryText("hello [[META:{not valid json]]")).toBeNull();
  });

  it("returns null when required fields are missing from META", () => {
    expect(parseMemoryText('hello [[META:{"observed_at":"2015-02-03T00:00:00Z"}]]')).toBeNull();
  });

  it("strips the META block for display", () => {
    const text = 'Hello world. [[META:{"observed_at":"2015-02-03T00:00:00Z","entity":"x"}]]';
    expect(stripMeta(text)).toBe("Hello world.");
  });
});
