/**
 * Bulk historical backfill: loops topics.json x queries through the full
 * ingestion pipeline. Run locally with `npm run seed` — this can take a
 * while (network + LLM latency per URL) and can exceed a serverless
 * function's time limit, which is why it's a standalone script rather than
 * an API route (see app/api/ingest/route.ts for the one-query-at-a-time,
 * Vercel-safe version used by the UI's "refresh" button).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { topics } from "@/lib/topics";
import { runIngestForQuery } from "@/lib/ingestion";

// Per-query wall-clock cap. runIngestForQuery already has timeouts on its
// individual network/LLM calls, but this is defense in depth: a single
// hung query (we hit exactly this once — a stalled connection with no
// error and no data for 20+ minutes) must never be able to block the rest
// of the seed run.
const QUERY_TIMEOUT_MS = 120_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function main() {
  const freshness = process.env.SEED_FRESHNESS; // e.g. "2025-01-01to2026-07-01" for a historical backfill
  let totalIngested = 0;

  for (const topic of topics) {
    console.log(`\n=== ${topic.drug_name} (${topic.company}) ===`);
    for (const query of topic.queries) {
      process.stdout.write(`  "${query}" ... `);
      try {
        const result = await withTimeout(
          runIngestForQuery(query, topic, { freshness }),
          QUERY_TIMEOUT_MS,
        );
        totalIngested += result.memoriesIngested;
        console.log(
          `${result.urlsFound} found, ${result.urlsCrawled} crawled, ${result.memoriesIngested} memories ingested`,
        );
      } catch (err) {
        console.log("FAILED");
        console.error(err);
      }
    }
  }

  console.log(`\nDone. ${totalIngested} total memories ingested across ${topics.length} topics.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
