import type { ShiftKind } from "@/lib/temporal/diff";
import { cn } from "@/lib/utils";

const SHIFT_STYLE: Record<ShiftKind, { label: string; icon: string; className: string }> = {
  shifted_negative: {
    label: "Shifted negative",
    icon: "↓",
    className:
      "bg-status-critical/15 text-status-critical border-status-critical/30 dark:bg-status-critical/20",
  },
  shifted_positive: {
    label: "Shifted positive",
    icon: "↑",
    className: "bg-status-good/15 text-status-good border-status-good/30 dark:bg-status-good/20",
  },
  unchanged: {
    label: "Unchanged",
    icon: "—",
    className: "bg-muted text-muted-foreground border-border",
  },
  new_mention: {
    label: "New mention",
    icon: "＋",
    className: "bg-status-warning/15 text-status-warning border-status-warning/40",
  },
  went_silent: {
    label: "Went silent",
    icon: "…",
    className: "bg-muted text-muted-foreground border-border italic",
  },
};

export function ShiftBadge({ kind }: { kind: ShiftKind }) {
  const style = SHIFT_STYLE[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        style.className,
      )}
    >
      <span aria-hidden="true">{style.icon}</span>
      {style.label}
    </span>
  );
}
