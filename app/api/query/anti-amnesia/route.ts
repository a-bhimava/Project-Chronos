import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { queryMemories } from "@/lib/hydra/query";
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
    archived_markdown: archived.statement,
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
