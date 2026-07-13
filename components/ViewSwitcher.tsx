"use client";

import { cn } from "@/lib/utils";

export type ViewId = "timeline" | "compare" | "chain" | "findings" | "sources";

const VIEWS: { id: ViewId; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "compare", label: "Compare Periods" },
  { id: "chain", label: "Chain Reaction" },
  { id: "findings", label: "Key Findings" },
  { id: "sources", label: "Sources" },
];

export function ViewSwitcher({
  active,
  onChange,
}: {
  active: ViewId;
  onChange: (view: ViewId) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border bg-muted/50 p-1">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          onClick={() => onChange(view.id)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            active === view.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
