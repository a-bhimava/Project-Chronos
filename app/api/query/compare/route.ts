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
  const entityName = topic?.drug_name ?? entityId;

  // Biasing the query toward individual-statement language, not just the
  // bare drug name, matters: a plain entity-name query ranks large official
  // announcement/report documents (kol: null) ahead of the shorter named-KOL
  // statement memories stateAsOf/diff actually need, since HydraDB's hybrid
  // search has no way for us to filter by our own kol/predicate metadata.
  const memories = await queryMemories(
    `${entityName} doctor physician KOL reaction sentiment opinion statement`,
    { maxResults: 50 },
  );
  const stateA = stateAsOf(memories, dateA);
  const stateB = stateAsOf(memories, dateB);
  const shifts = diff(stateA, stateB);

  const narrative = await narrateCompare({ entity: entityName, dateA, dateB, shifts });

  const citations = [
    ...new Set(
      shifts.flatMap((s) => [s.stateA?.source_url, s.stateB?.source_url].filter(Boolean)),
    ),
  ];

  return Response.json({ entity: entityName, dateA, dateB, narrative, kol_shifts: shifts, citations });
}
