import type { LiveStatus } from "@/app/api/query/anti-amnesia/route";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<LiveStatus, { label: string; icon: string; className: string }> = {
  unchanged: {
    label: "Still live, unchanged",
    icon: "✓",
    className: "bg-status-good/15 text-status-good border-status-good/30",
  },
  changed: {
    label: "Content has changed",
    icon: "⚠",
    className: "bg-status-warning/15 text-status-warning border-status-warning/40",
  },
  unreachable_or_deleted: {
    label: "No longer available",
    icon: "✕",
    className:
      "bg-status-critical/15 text-status-critical border-status-critical/30 dark:bg-status-critical/20",
  },
};

export function LiveStatusBadge({ status }: { status: LiveStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium",
        style.className,
      )}
    >
      <span aria-hidden="true">{style.icon}</span>
      {style.label}
    </span>
  );
}
