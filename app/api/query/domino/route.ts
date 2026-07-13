import { NextRequest } from "next/server";
import { queryMemories } from "@/lib/hydra/query";
import { domino, type ChainDirection } from "@/lib/temporal/domino";
import { narrateDomino } from "@/lib/synthesis/narrate";
import { getTopic } from "@/lib/topics";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entity");
  const windowDaysParam = searchParams.get("windowDays");
  const direction = (searchParams.get("direction") as ChainDirection | null) ?? "negative";

  if (!entityId) {
    return Response.json({ error: "entity query param is required" }, { status: 400 });
  }

  const windowDays = windowDaysParam ? Number(windowDaysParam) : 365;
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    return Response.json({ error: "windowDays must be a positive number" }, { status: 400 });
  }

  const topic = getTopic(entityId);
  const entityName = topic?.name ?? entityId;

  // See compare/route.ts for why this is actor-biased rather than the bare
  // entity name, and why crawl_fallback-dated memories are excluded.
  const memories = await queryMemories(
    `${entityName} executive regulator testimony statement allegation finding`,
    { maxResults: 50 },
  );
  const dated = memories.filter((m) => m.meta.date_confidence !== "crawl_fallback");
  const chain = domino(dated, windowDays, direction);

  const narrative =
    chain.length > 0
      ? await narrateDomino({ entity: entityName, windowDays, chain })
      : `No ${direction} escalation chain was found for ${entityName} within a ${windowDays}-day window.`;

  const citations = [...new Set(chain.map((s) => s.source_url))];

  return Response.json({ entity: entityName, windowDays, direction, narrative, chain, citations });
}
