import { z } from "zod";

export const ExtractionSchema = z.object({
  relations: z.array(
    z.object({
      actor: z
        .string()
        .nullable()
        .describe(
          "Who made the statement, exactly as named in the source — a named individual (e.g. 'Frank Raiter'), or an institution/organization when the statement is institutional rather than an individual's (e.g. 'Department of Justice', 'S&P', 'Moody's Investors Service'). Null only if no identifiable speaker can be determined.",
        ),
      entity: z.string().describe("The subject the statement is about — e.g. a ratings methodology, a settlement, a specific security class"),
      predicate: z.enum([
        "supports",
        "criticizes",
        "mentions",
        "announces",
        "warns_about",
        "participated_in",
        "reports_on",
      ]),
      sentiment: z.enum(["positive", "negative", "neutral", "mixed"]),
      sentiment_score: z.number().min(-1).max(1),
      statement_text: z
        .string()
        // No tight .max() here: generateObject hard-rejects the ENTIRE
        // extraction if any field exceeds its schema bound, and models
        // regularly produce legitimate verbatim quotes over 400 chars
        // (learned this the hard way — Gemini kept producing excellent
        // extractions that got thrown out whole over one long quote).
        // 2000 is a generous safety net against runaway generation, not a
        // target length; real truncation for display happens in
        // lib/extraction/toMemories.ts, which we control.
        .max(2000)
        .describe(
          "A direct quote or tight paraphrase FROM THE SOURCE TEXT ONLY — never infer or invent a statement not grounded in the provided content. Prefer under ~350 characters where the source allows it, but a longer verbatim quote is fine.",
        ),
      confidence: z.number().min(0).max(1),
    }),
  ),
  published_or_event_date: z
    .string()
    .nullable()
    .describe(
      "ISO 8601 date if the article/post text itself states when it was published or when the event occurred; null if not determinable from content",
    ),
  document_summary: z.string().max(1000),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
export type ExtractedRelation = Extraction["relations"][number];
