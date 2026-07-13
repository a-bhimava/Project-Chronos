import { queryMemories } from "@/lib/hydra/query";
import { topics } from "@/lib/topics";

export type SourceEntry = {
  url: string;
  title?: string;
  captured_at: string;
  topic_id: string;
  topic_name: string;
};

/** Lists every archived document capture across all topics — the ingested
 * source corpus ("training" data). */
export async function GET() {
  const perTopic = await Promise.all(
    topics.map(async (topic) => {
      const memories = await queryMemories(topic.name, { maxResults: 50 });
      return memories
        .filter((m) => m.meta.predicate === "captured_content")
        .map(
          (m): SourceEntry => ({
            url: m.meta.source_url,
            title: m.meta.source_title,
            captured_at: m.meta.captured_at,
            topic_id: topic.id,
            topic_name: topic.name,
          }),
        );
    }),
  );

  const seen = new Set<string>();
  const merged: SourceEntry[] = [];
  for (const entry of perTopic.flat()) {
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    merged.push(entry);
  }

  merged.sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime());

  return Response.json({ sources: merged });
}
