import { z } from "zod";

export const ExtractionSchema = z.object({
  relations: z.array(
    z.object({
      kol: z
        .string()
        .nullable()
        .describe(
          "Full name of the doctor/researcher/KOL making the statement, exactly as written in the source. Null if the statement is from a company/spokesperson, not an individual.",
        ),
      entity: z.string().describe("The drug, brand name, or company being discussed"),
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
        .max(400)
        .describe(
          "A direct quote or tight paraphrase FROM THE SOURCE TEXT ONLY — never infer or invent a statement not grounded in the provided content",
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
  document_summary: z.string().max(300),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
export type ExtractedRelation = Extraction["relations"][number];
