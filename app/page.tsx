"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cinzel } from "next/font/google";
import { ArrowLeftRight, ArrowRight, Archive, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["600", "700"] });

const FEATURES = [
  { icon: ArrowLeftRight, label: "Compare timelines" },
  { icon: Network, label: "Trace opinion cascades" },
  { icon: Archive, label: "Recover erased pages" },
];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function analyze(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/analysis?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-muted/50">
      <header className="flex items-center justify-center gap-6 border-b border-border/60 px-6 py-4 text-xs text-muted-foreground sm:gap-10">
        {FEATURES.map(({ icon: Icon, label }, i) => (
          <span key={label} className="flex items-center gap-6 sm:gap-10">
            <span className="flex items-center gap-2">
              <Icon className="size-4" />
              <span className="font-medium tracking-wide">{label}</span>
            </span>
            {i < FEATURES.length - 1 && (
              <span aria-hidden className="text-border">
                ◆
              </span>
            )}
          </span>
        ))}
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-10 px-6 pb-24">
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="text-sm font-medium tracking-[0.5em] text-muted-foreground">
            ΧΡΟΝΟΣ
          </span>
          <h1
            className={`${cinzel.className} text-7xl font-bold uppercase tracking-[0.12em] sm:text-8xl`}
          >
            Chronos
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="h-px w-16 bg-border" />
            <p className="text-lg">
              Time-travel through expert opinion, on any topic.
            </p>
            <span className="h-px w-16 bg-border" />
          </div>
        </div>

        <form
          className="flex w-full max-w-2xl flex-col items-center gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            analyze(query);
          }}
        >
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Track expert opinion on any subject..."
            className="h-20 w-full rounded-2xl border-2 bg-card px-7 !text-xl shadow-lg"
          />
          <Button
            type="submit"
            size="lg"
            className="h-14 rounded-xl px-10 text-lg"
          >
            Analyze
            <ArrowRight className="ml-2 size-5" />
          </Button>
        </form>
      </div>
    </main>
  );
}
