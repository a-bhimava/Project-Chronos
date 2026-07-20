import { NextRequest } from "next/server";
import { runIngestForQuery } from "@/lib/ingestion";
import { getTopic } from "@/lib/topics";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { topicId, query, freshness } = body as {
    topicId?: string;
    query?: string;
    freshness?: string;
  };

  if (!topicId || !query) {
    return Response.json({ error: "topicId and query are required" }, { status: 400 });
  }

  const topic = getTopic(topicId);
  if (!topic) {
    return Response.json({ error: `Unknown topicId: ${topicId}` }, { status: 404 });
  }

  const tenantId = req.headers.get("x-tenant-id") || undefined;
  const result = await runIngestForQuery(query, topic, { freshness, tenantId });
  return Response.json(result);
}
