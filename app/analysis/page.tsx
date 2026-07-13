import Link from "next/link";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { TimelineCompare } from "@/components/TimelineCompare";
import { AntiAmnesia } from "@/components/AntiAmnesia";
import { DominoChain } from "@/components/DominoChain";
import { topics } from "@/lib/topics";
import type { Topic } from "@/lib/types";

// Pre-seeded example URLs for the anti-amnesia demo, so it never depends on
// live typing during a demo. Update after running `npm run seed` with real
// captured URLs from your topics.
const EXAMPLE_URLS: string[] = [];

// The tab components default to the first topic in the list, so putting the
// best match for the landing-page query first pre-selects it everywhere.
function orderTopicsByQuery(query: string): Topic[] {
  const q = query.trim().toLowerCase();
  if (!q) return topics;
  const match = topics.find((t) =>
    [t.id, t.drug_name, t.brand_name, t.company, t.class]
      .filter(Boolean)
      .some((field) => q.includes(field!.toLowerCase()) || field!.toLowerCase().includes(q)),
  );
  if (!match) return topics;
  return [match, ...topics.filter((t) => t.id !== match.id)];
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const orderedTopics = orderTopicsByQuery(q ?? "");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/"
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Chronos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {q ? `Analysis: ${q}` : "Analysis"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Compare timelines, trace opinion cascades, recover what the web used
          to say.
        </p>
      </header>

      <Tabs defaultValue="compare">
        <TabsList>
          <TabsTrigger value="compare">Timeline compare</TabsTrigger>
          <TabsTrigger value="domino">Domino effect</TabsTrigger>
          <TabsTrigger value="anti-amnesia">Anti-amnesia</TabsTrigger>
        </TabsList>
        <TabsContent value="compare" className="pt-6">
          <TimelineCompare topics={orderedTopics} />
        </TabsContent>
        <TabsContent value="domino" className="pt-6">
          <DominoChain topics={orderedTopics} />
        </TabsContent>
        <TabsContent value="anti-amnesia" className="pt-6">
          <AntiAmnesia exampleUrls={EXAMPLE_URLS} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
