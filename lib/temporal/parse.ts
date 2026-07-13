import type { ChronosMeta, ParsedMemory } from "@/lib/types";

const META_RE = /\[\[META:(\{[\s\S]*?\})\]\]/;

/**
 * Parses the structured [[META:{...}]] block out of a memory's raw text.
 * This is the ONLY structured data source for our temporal layer — HydraDB
 * itself just stores/indexes/returns plain text, so there is no schema
 * fallback to lean on here. If the block is missing or malformed, the
 * memory simply can't participate in time-based queries.
 */
export function parseMemoryText(text: string): ParsedMemory | null {
  const match = text.match(META_RE);
  if (!match) return null;

  try {
    const meta = JSON.parse(match[1]) as ChronosMeta;
    if (!meta.observed_at || !meta.entity) return null;
    return {
      text,
      statement: stripMeta(text),
      meta,
    };
  } catch {
    return null;
  }
}

export function parseMemoryTexts(texts: string[]): ParsedMemory[] {
  return texts
    .map(parseMemoryText)
    .filter((m): m is ParsedMemory => m !== null);
}

/** Strips the [[META:{...}]] block, returning just the human-readable sentence. */
export function stripMeta(text: string): string {
  return text.replace(META_RE, "").trim();
}

/** Builds the raw text we hand to HydraDB: a natural-language sentence (for
 * its own hybrid/semantic indexing) followed by the delimited META block. */
export function buildMemoryText(sentence: string, meta: ChronosMeta): string {
  return `${sentence}\n\n[[META:${JSON.stringify(meta)}]]`;
}
