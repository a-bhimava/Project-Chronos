"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import type { ViewId } from "@/components/ViewSwitcher";
import { FadeSwitch } from "@/components/FadeSwitch";
import { ChatPanel } from "@/components/ChatPanel";
import { TimelineView } from "@/components/views/TimelineView";
import { ComparePeriodsView } from "@/components/views/ComparePeriodsView";
import { ChainReactionView } from "@/components/views/ChainReactionView";
import { KeyFindingsView } from "@/components/views/KeyFindingsView";
import { SourcesView } from "@/components/views/SourcesView";
import { topics } from "@/lib/topics";
import type { Topic } from "@/lib/types";

// The views default to the first topic in the list, so putting the best
// match for the landing-page query first pre-selects it everywhere.
function orderTopicsByQuery(query: string): Topic[] {
  const q = query.trim().toLowerCase();
  if (!q) return topics;
  const match = topics.find((t) =>
    [t.id, t.name, t.org, t.category].some(
      (field) =>
        q.includes(field.toLowerCase()) || field.toLowerCase().includes(q),
    ),
  );
  if (!match) return topics;
  return [match, ...topics.filter((t) => t.id !== match.id)];
}

const VIEW_TITLES: Record<ViewId, { title: string; description: string }> = {
  timeline: {
    title: "Timeline",
    description: "Every dated statement and finding across the case, in chronological order.",
  },
  compare: {
    title: "Compare Periods",
    description: "See how the public record on an entity shifted between two dates.",
  },
  chain: {
    title: "Chain Reaction",
    description: "Trace how positions escalated from one actor to the next over time.",
  },
  findings: {
    title: "Key Findings",
    description: "Verified figures from primary and authoritative sources.",
  },
  sources: {
    title: "Sources",
    description: "Every document ingested, with an archived, verifiable capture.",
  },
};

function AnalysisContent() {
  const searchParams = useSearchParams();
  const orderedTopics = orderTopicsByQuery(searchParams.get("q") ?? "");
  const [view, setView] = useState<ViewId>("timeline");
  const meta = VIEW_TITLES[view];

  return (
    <div className="flex min-h-screen">
      <Sidebar active={view} onChange={setView} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-8 py-8">
          <header className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">{meta.title}</h1>
            <p className="text-sm text-muted-foreground">{meta.description}</p>
          </header>

          {view === "timeline" && <ChatPanel />}

          <FadeSwitch id={view}>
            {view === "timeline" && <TimelineView />}
            {view === "compare" && <ComparePeriodsView topics={orderedTopics} />}
            {view === "chain" && <ChainReactionView topics={orderedTopics} />}
            {view === "findings" && <KeyFindingsView />}
            {view === "sources" && <SourcesView />}
          </FadeSwitch>
        </div>
      </main>
    </div>
  );
}

export default function AnalysisPage() {
  // useSearchParams requires a Suspense boundary on statically rendered routes.
  return (
    <Suspense>
      <AnalysisContent />
    </Suspense>
  );
}
