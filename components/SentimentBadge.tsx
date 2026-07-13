import type { Sentiment } from "@/lib/types";
import { cn } from "@/lib/utils";

const SENTIMENT_STYLE: Record<Sentiment, { label: string; icon: string; className: string }> = {
  positive: {
    label: "Positive",
    icon: "▲",
    className: "bg-status-good/15 text-status-good border-status-good/30 dark:bg-status-good/20",
  },
  negative: {
    label: "Negative",
    icon: "▼",
    className:
      "bg-status-critical/15 text-status-critical border-status-critical/30 dark:bg-status-critical/20",
  },
  mixed: {
    label: "Mixed",
    icon: "◆",
    className:
      "bg-status-warning/15 text-status-warning border-status-warning/40 dark:bg-status-warning/20",
  },
  neutral: {
    label: "Neutral",
    icon: "■",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function SentimentBadge({
  sentiment,
  score,
}: {
  sentiment: Sentiment;
  score?: number;
}) {
  const style = SENTIMENT_STYLE[sentiment];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        style.className,
      )}
    >
      <span aria-hidden="true">{style.icon}</span>
      {style.label}
      {typeof score === "number" && (
        <span className="tabular-nums opacity-70">{score.toFixed(2)}</span>
      )}
    </span>
  );
}
