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
export async function ingestMemories(
  memories: ChronosMemory[],
  options?: { tenantId?: string }
): Promise<IngestResult> {
  if (memories.length === 0) return { successCount: 0, failedCount: 0 };

  const client = getHydraClient();
  const database = getDatabase(options?.tenantId);

  // HydraDB enforces a 1000-token per-request budget. Large crawled pages
  // can individually exceed this, so we send one memory at a time to
  // guarantee we never exceed the limit on a batch.
  const CHUNK_SIZE = 1;
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < memories.length; i += CHUNK_SIZE) {
    const chunk = memories.slice(i, i + CHUNK_SIZE);
    try {
      const res = await client.context.ingest({
        tenantId: database,
        type: "memory",
        memories: JSON.stringify(chunk.map((m) => ({ text: m.text }))),
        upsert: "true",
      });
      successCount += res.data?.successCount ?? 0;
      failedCount += res.data?.failedCount ?? 0;
    } catch (err) {
      console.error(`ingest chunk ${i}–${i + chunk.length} failed:`, err);
      failedCount += chunk.length;
    }
  }

  return { successCount, failedCount };
}
