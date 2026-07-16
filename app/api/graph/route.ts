import { getDatabase, getHydraClient } from "@/lib/hydra/client";
import { topics } from "@/lib/topics";

export type GraphNode = {
  id: string;
  name: string;
  type: string;
  namespace: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  predicate: string;
  context: string;
  temporal_details?: string;
};

// HydraDB's own automatically-extracted knowledge graph (built from the raw
// ingested text independent of our META-block encoding) — this is a
// genuinely separate signal from the temporal layer, so it's worth exposing
// directly rather than re-deriving anything. The SDK types these nested
// triplet fields as untyped Record<string, unknown> (verified empirically:
// they come back snake_case on the wire, unlike the rest of the SDK).
type RawEntity = {
  entity_id?: string;
  name?: string;
  type?: string;
  namespace?: string;
};
type RawRelation = {
  relationship_id?: string;
  source_entity_id?: string;
  target_entity_id?: string;
  canonical_predicate?: string;
  context?: string;
  temporal_details?: string;
};
type RawTriplet = {
  source?: RawEntity;
  target?: RawEntity;
  relation?: RawRelation;
};

export async function GET() {
  const client = getHydraClient();
  const database = getDatabase();

  const perTopic = await Promise.all(
    topics.map((topic) =>
      client.query({
        query: topic.name,
        database,
        type: "memory",
        queryBy: "hybrid",
        graphContext: true,
        maxResults: 50,
      }),
    ),
  );

  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  for (const res of perTopic) {
    const paths = res.data?.graphContext?.queryPaths ?? [];
    for (const path of paths) {
      const triplets = (path.triplets ?? []) as RawTriplet[];
      for (const t of triplets) {
        const source = t.source;
        const target = t.target;
        const relation = t.relation;
        if (!source?.entity_id || !target?.entity_id || !relation) continue;

        if (!nodes.has(source.entity_id)) {
          nodes.set(source.entity_id, {
            id: source.entity_id,
            name: source.name ?? source.entity_id,
            type: source.type ?? "UNKNOWN",
            namespace: source.namespace ?? "",
          });
        }
        if (!nodes.has(target.entity_id)) {
          nodes.set(target.entity_id, {
            id: target.entity_id,
            name: target.name ?? target.entity_id,
            type: target.type ?? "UNKNOWN",
            namespace: target.namespace ?? "",
          });
        }

        const edgeId = relation.relationship_id ?? `${source.entity_id}-${target.entity_id}`;
        if (!edges.has(edgeId)) {
          edges.set(edgeId, {
            id: edgeId,
            source: source.entity_id,
            target: target.entity_id,
            predicate: relation.canonical_predicate ?? "related_to",
            context: relation.context ?? "",
            temporal_details: relation.temporal_details,
          });
        }
      }
    }
  }

  return Response.json({
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  });
}
