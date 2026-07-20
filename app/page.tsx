"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import type { ViewId } from "@/components/ViewSwitcher";
import { FadeSwitch } from "@/components/FadeSwitch";
import { ChatPanel } from "@/components/ChatPanel";
import { TimelineView } from "@/components/views/TimelineView";
import { ComparePeriodsView } from "@/components/views/ComparePeriodsView";
import { ChainReactionView } from "@/components/views/ChainReactionView";
import { KeyFindingsView } from "@/components/views/KeyFindingsView";
import { SourcesView } from "@/components/views/SourcesView";
import { GraphExplorerView } from "@/components/views/GraphExplorerView";
import { topics } from "@/lib/topics";
import { TenantContext } from "@/components/TenantContext";

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
  graph: {
    title: "Graph Explorer",
    description: "The entity/relationship graph HydraDB extracted automatically from the corpus.",
  },
};

export default function Home() {
  const [view, setView] = useState<ViewId>("timeline");
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const meta = VIEW_TITLES[view];

  return (
    <TenantContext.Provider value={{ tenantId, setTenantId }}>
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
              {view === "compare" && <ComparePeriodsView topics={topics} />}
              {view === "chain" && <ChainReactionView topics={topics} />}
              {view === "findings" && <KeyFindingsView />}
              {view === "sources" && <SourcesView />}
              {view === "graph" && <GraphExplorerView />}
            </FadeSwitch>
          </div>
        </main>
      </div>
    </TenantContext.Provider>
  );
}
