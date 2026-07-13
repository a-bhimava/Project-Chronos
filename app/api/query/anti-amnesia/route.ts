import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { queryMemories } from "@/lib/hydra/query";
import { getDatabase, getHydraClient } from "@/lib/hydra/client";
import { stripMeta } from "@/lib/temporal/parse";
import { youComContents } from "@/lib/youcom/contents";

export type LiveStatus = "unchanged" | "changed" | "unreachable_or_deleted";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return Response.json({ error: "url query param is required" }, { status: 400 });
  }

  const candidates = await queryMemories(url, { maxResults: 50 });

  const archived = candidates.find(
    (m) => m.meta.predicate === "captured_content" && m.meta.source_url === url,
  );

  if (!archived) {
    return Response.json(
      { error: `No archived capture found for ${url}. It may not have been ingested yet.` },
      { status: 404 },
    );
  }

  const relatedKolRelations = candidates.filter(
    (m) => m.meta.predicate !== "captured_content" && m.meta.hydra_doc_source === url,
  );

  // HydraDB chunks long text for indexing — for a ~6000-char captured_content
  // memory, the search chunk we matched on may only be the trailing fragment
  // that happened to contain the META block, not the full article body.
  // context.inspect() fetches the complete original source by ID (chunk.id
  // doubles as the stable source ID across all of a source's chunks) rather
  // than whatever chunk search ranked highest.
  let archivedMarkdown = archived.statement;
  if (archived.chunkId) {
    try {
      const inspectRes = await getHydraClient().context.inspect({
        id: archived.chunkId,
        tenantId: getDatabase(),
        mode: "content",
      });
      if (inspectRes.data?.content) {
        archivedMarkdown = stripMeta(inspectRes.data.content);
      }
    } catch {
      // Fall back to the chunk-derived text already in `archived.statement`.
    }
  }

  let status: LiveStatus = "unreachable_or_deleted";
  let liveDiffSummary: string | undefined;

  try {
    const [live] = await youComContents([url], { formats: ["markdown"] });
    if (live?.markdown && !live.error) {
      const liveHash = `sha256:${createHash("sha256").update(live.markdown).digest("hex")}`;
      status = liveHash === archived.meta.content_hash ? "unchanged" : "changed";
      if (status === "changed") {
        liveDiffSummary = `Live content is now ${live.markdown.length} chars (archived capture was based on the version hashed at ${archived.meta.captured_at}).`;
      }
    }
  } catch {
    status = "unreachable_or_deleted";
  }

  return Response.json({
    url,
    archived_markdown: archivedMarkdown,
    captured_at: archived.meta.captured_at,
    source_title: archived.meta.source_title,
    status,
    live_diff_summary: liveDiffSummary,
    related_kol_relations: relatedKolRelations.map((m) => ({
      kol: m.meta.kol,
      entity: m.meta.entity,
      predicate: m.meta.predicate,
      sentiment: m.meta.sentiment,
      statement_text: m.statement,
      observed_at: m.meta.observed_at,
    })),
  });
}
