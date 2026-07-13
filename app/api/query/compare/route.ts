import { NextRequest } from "next/server";
import { queryMemories } from "@/lib/hydra/query";
import { stateAsOf } from "@/lib/temporal/stateAsOf";
import { diff } from "@/lib/temporal/diff";
import { narrateCompare } from "@/lib/synthesis/narrate";
import { getTopic } from "@/lib/topics";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entity");
  const dateA = searchParams.get("dateA");
  const dateB = searchParams.get("dateB");

  if (!entityId || !dateA || !dateB) {
    return Response.json(
      { error: "entity, dateA, and dateB query params are required" },
      { status: 400 },
    );
  }

  const topic = getTopic(entityId);
  const entityName = topic?.name ?? entityId;

  // Biasing the query toward individual-statement language, not just the
  // bare entity name, matters: a plain entity-name query ranks large
  // official announcement/report documents (actor: null) ahead of the
  // shorter named-actor statement memories stateAsOf/diff actually need,
  // since HydraDB's hybrid search has no way for us to filter by our own
  // actor/predicate metadata.
  const memories = await queryMemories(
    `${entityName} executive regulator testimony statement allegation finding`,
    { maxResults: 50 },
  );

  // This corpus is historical (2003-2017) — a memory whose date fell back
  // to today's ingestion timestamp (no real date found in the source) would
  // badly corrupt a chronological comparison, unlike the live-news case
  // this fallback was originally designed for. Exclude it here rather than
  // silently trusting an unreliable date.
  const dated = memories.filter((m) => m.meta.date_confidence !== "crawl_fallback");

  const stateA = stateAsOf(dated, dateA);
  const stateB = stateAsOf(dated, dateB);
  const shifts = diff(stateA, stateB);

  const narrative = await narrateCompare({ entity: entityName, dateA, dateB, shifts });

  const citations = [
    ...new Set(
      shifts.flatMap((s) => [s.stateA?.source_url, s.stateB?.source_url].filter(Boolean)),
    ),
  ];

  return Response.json({ entity: entityName, dateA, dateB, narrative, shifts, citations });
}
