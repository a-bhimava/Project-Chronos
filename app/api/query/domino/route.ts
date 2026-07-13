import { NextRequest } from "next/server";
import { queryMemories } from "@/lib/hydra/query";
import { domino, type DominoDirection } from "@/lib/temporal/domino";
import { narrateDomino } from "@/lib/synthesis/narrate";
import { getTopic } from "@/lib/topics";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entity");
  const windowDaysParam = searchParams.get("windowDays");
  const direction = (searchParams.get("direction") as DominoDirection | null) ?? "negative";

  if (!entityId) {
    return Response.json({ error: "entity query param is required" }, { status: 400 });
  }

  const windowDays = windowDaysParam ? Number(windowDaysParam) : 21;
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    return Response.json({ error: "windowDays must be a positive number" }, { status: 400 });
  }

  const topic = getTopic(entityId);
  const entityName = topic?.drug_name ?? entityId;

  // See compare/route.ts for why this is KOL-biased rather than the bare
  // entity name — otherwise official announcement content (kol: null)
  // crowds out the named-individual statements domino() needs.
  const memories = await queryMemories(
    `${entityName} doctor physician KOL reaction sentiment opinion statement`,
    { maxResults: 50 },
  );
  const chain = domino(memories, windowDays, direction);

  const narrative =
    chain.length > 0
      ? await narrateDomino({ entity: entityName, windowDays, chain })
      : `No ${direction} sentiment chain reaction was found for ${entityName} within a ${windowDays}-day propagation window.`;

  const citations = [...new Set(chain.map((s) => s.source_url))];

  return Response.json({ entity: entityName, windowDays, direction, narrative, chain, citations });
}
