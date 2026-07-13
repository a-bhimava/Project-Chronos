import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { ExtractionSchema, type Extraction } from "@/lib/extraction/schema";
import type { Topic } from "@/lib/types";

// Called directly against Google's Generative AI API (GOOGLE_GENERATIVE_AI_API_KEY),
// bypassing the Vercel AI Gateway — the Gateway requires a credit card on
// file even for free credits, which blocked this account. Fast/cheap model:
// this runs dozens of times during bulk seeding. Reserve a stronger model
// (see lib/synthesis/narrate.ts) for the small number of judge-facing
// narrative calls. Confirmed accessible via this API key's /v1beta/models.
const EXTRACTION_MODEL = google("gemini-2.5-flash");

const MAX_INPUT_CHARS = 20000;

function systemPrompt(topic: Topic): string {
  return `You are the extraction engine for Project Chronos, a pharma
competitive-intelligence platform. Given raw crawled web content about
${topic.drug_name} (${topic.company}), extract every distinct statement,
reaction, or mention from a named KOL (doctor/researcher), or an official
company announcement, that expresses or implies a stance toward
${topic.drug_name}.

CRITICAL: Only extract relations that are directly supported by the text
provided. Never fabricate a KOL name, quote, or sentiment that isn't
grounded in this specific document. If the content is irrelevant or has
no clear stance, return an empty relations array. Prefer verbatim quotes
for statement_text over paraphrase when available.`;
}

export async function extractRelations(
  rawMarkdown: string,
  topic: Topic,
): Promise<Extraction> {
  const { object } = await generateObject({
    model: EXTRACTION_MODEL,
    schema: ExtractionSchema,
    system: systemPrompt(topic),
    prompt: rawMarkdown.slice(0, MAX_INPUT_CHARS),
    abortSignal: AbortSignal.timeout(45_000),
  });
  return object;
}
