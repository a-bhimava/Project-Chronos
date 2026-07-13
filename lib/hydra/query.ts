import { getDatabase, getHydraClient } from "@/lib/hydra/client";
import { parseMemoryText } from "@/lib/temporal/parse";
import type { ParsedMemory } from "@/lib/types";

export type QueryOptions = {
  maxResults?: number;
  queryBy?: "hybrid" | "text";
  graphContext?: boolean;
};

/**
 * Pulls a candidate set of memories from HydraDB's own hybrid/graph search
 * and parses the META block back out of each chunk's raw text. This is
 * intentionally a broad candidate fetch — all time-slicing/diffing/domino
 * logic happens afterward in lib/temporal/*, not here.
 */
export async function queryMemories(
  query: string,
  options: QueryOptions = {},
): Promise<ParsedMemory[]> {
  const client = getHydraClient();
  const database = getDatabase();

  // The real API hard-rejects (400 INVALID_INPUT) anything outside 1-50 —
  // clamp here so a caller's mistake can't blow up the whole request.
  const maxResults = Math.min(50, Math.max(1, options.maxResults ?? 50));

  const res = await client.query({
    query,
    database,
    type: "memory",
    queryBy: options.queryBy ?? "hybrid",
    graphContext: options.graphContext ?? true,
    maxResults,
  });

  const chunks = res.data?.chunks ?? [];
  const parsed: ParsedMemory[] = [];
  for (const chunk of chunks) {
    if (!chunk.chunkContent) continue;
    const memory = parseMemoryText(chunk.chunkContent);
    if (!memory) continue;
    parsed.push({ ...memory, relevancyScore: chunk.relevancyScore, chunkId: chunk.id });
  }
  return parsed;
}
