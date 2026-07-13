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

// Pre-seeded example URLs for the anti-amnesia demo, so it never depends on
// live typing during a demo. Update after running `npm run seed` with real
// captured URLs from your topics.
const EXAMPLE_URLS: string[] = [];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Project Chronos</h1>
        <p className="text-sm text-muted-foreground">
          Timeline-based competitive intelligence for pharma — live web capture
          (You.com) + bitemporal graph memory (HydraDB).
        </p>
      </header>

      <Tabs defaultValue="compare">
        <TabsList>
          <TabsTrigger value="compare">Timeline compare</TabsTrigger>
          <TabsTrigger value="domino">Domino effect</TabsTrigger>
          <TabsTrigger value="anti-amnesia">Anti-amnesia</TabsTrigger>
        </TabsList>
        <TabsContent value="compare" className="pt-6">
          <TimelineCompare topics={topics} />
        </TabsContent>
        <TabsContent value="domino" className="pt-6">
          <DominoChain topics={topics} />
        </TabsContent>
        <TabsContent value="anti-amnesia" className="pt-6">
          <AntiAmnesia exampleUrls={EXAMPLE_URLS} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
