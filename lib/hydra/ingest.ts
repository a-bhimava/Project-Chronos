import { getDatabase, getHydraClient } from "@/lib/hydra/client";
import type { ChronosMemory } from "@/lib/types";

export type IngestResult = {
  successCount: number;
  failedCount: number;
  message?: string;
};

/**
 * Ingests ChronosMemory objects (already-built text + META block, see
 * lib/temporal/parse.ts#buildMemoryText) as HydraDB "memory" corpus items.
 * HydraDB indexes/graphs this text itself; our own structured data lives
 * entirely inside the embedded META block, which we parse back out
 * ourselves on the way out (lib/temporal/parse.ts#parseMemoryText) — we
 * never depend on HydraDB preserving or returning anything beyond the text.
 */
export async function ingestMemories(memories: ChronosMemory[]): Promise<IngestResult> {
  if (memories.length === 0) return { successCount: 0, failedCount: 0 };

  const client = getHydraClient();
  const database = getDatabase();

  const res = await client.context.ingest({
    tenantId: database,
    type: "memory",
    memories: JSON.stringify(memories.map((m) => ({ text: m.text }))),
    upsert: "true",
  });

  return {
    successCount: res.data?.successCount ?? 0,
    failedCount: res.data?.failedCount ?? 0,
    message: res.data?.message,
  };
}
