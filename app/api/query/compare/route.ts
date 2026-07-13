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

  const memories = await queryMemories(entityName, { maxResults: 100 });
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
