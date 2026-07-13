import { generateObject } from "ai";
import { ExtractionSchema, type Extraction } from "@/lib/extraction/schema";
import type { Topic } from "@/lib/types";

// Mid-tier, cost-sensitive model: this runs dozens of times during bulk
// seeding. Reserve a stronger model (see lib/synthesis/narrate.ts) for the
// small number of judge-facing narrative calls. Confirmed live on the
// Vercel AI Gateway's /v1/models list — do not change without re-checking.
const EXTRACTION_MODEL = "anthropic/claude-haiku-4.5";

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
  });
  return object;
}
