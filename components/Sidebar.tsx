"use client";

import { Clock, LayoutDashboard, GitCompare, Zap, BarChart3, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewId } from "@/components/ViewSwitcher";

const NAV: { id: ViewId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "timeline", label: "Timeline", icon: LayoutDashboard },
  { id: "compare", label: "Compare Periods", icon: GitCompare },
  { id: "chain", label: "Chain Reaction", icon: Zap },
  { id: "findings", label: "Key Findings", icon: BarChart3 },
  { id: "sources", label: "Sources", icon: FolderOpen },
];

export function Sidebar({
  active,
  onChange,
}: {
  active: ViewId;
  onChange: (view: ViewId) => void;
}) {
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-6 border-r bg-card px-4 py-6">
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Clock className="h-4 w-4" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Chronos</span>
          <span className="text-[11px] text-muted-foreground">Market Intelligence</span>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-2 text-sm">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium transition-colors",
              active === id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-auto px-2 text-[11px] leading-relaxed text-muted-foreground">
        Referential-services case study: S&amp;P and Moody&apos;s credit-rating
        settlements, reconstructed from public record.
      </div>
    </aside>
  );
}
