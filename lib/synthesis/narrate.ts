import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { KolShift } from "@/lib/temporal/diff";
import type { DominoStep } from "@/lib/temporal/domino";

// Called directly against Google's Generative AI API (see extract.ts for
// why — Vercel AI Gateway is blocked pending a credit card on the account).
// Stronger, judge-facing model — a small number of calls per user request
// (not per document), quality matters more than throughput here.
const SYNTHESIS_MODEL = google("gemini-2.5-pro");

const SYNTH_SYSTEM = `You are answering a pharma competitive-intelligence
question using ONLY the timeline data provided below (KOL statements with
dates, sentiment, and source URLs). Write a concise, board-ready answer.
Every factual claim MUST cite its source with a markdown link using the
exact URL provided. Never state a date, sentiment, or quote that isn't in
the provided data.`;

export async function narrateCompare(opts: {
  entity: string;
  dateA: string;
  dateB: string;
  shifts: KolShift[];
}): Promise<string> {
  const lines = opts.shifts.map((s) => {
    const before = s.stateA
      ? `${s.stateA.sentiment} (${s.stateA.sentiment_score.toFixed(2)}), observed ${s.stateA.observed_at}: "${s.stateA.statement_text}" (${s.stateA.source_url})`
      : "no prior statement";
    const after = s.stateB
      ? `${s.stateB.sentiment} (${s.stateB.sentiment_score.toFixed(2)}), observed ${s.stateB.observed_at}: "${s.stateB.statement_text}" (${s.stateB.source_url})`
      : "no statement by this date";
    return `- ${s.kol} [${s.kind}]\n  On ${opts.dateA}: ${before}\n  On ${opts.dateB}: ${after}`;
  });

  const prompt = `Entity: ${opts.entity}
Comparing state on ${opts.dateA} vs ${opts.dateB}.

KOL shifts:
${lines.join("\n")}

Write a short narrative (3-6 sentences) describing how sentiment shifted, calling out the most notable individual shifts with citations.`;

  const { text } = await generateText({
    model: SYNTHESIS_MODEL,
    system: SYNTH_SYSTEM,
    prompt,
    abortSignal: AbortSignal.timeout(30_000),
  });
  return text;
}

export async function narrateDomino(opts: {
  entity: string;
  windowDays: number;
  chain: DominoStep[];
}): Promise<string> {
  const lines = opts.chain.map(
    (step, i) =>
      `${i + 1}. ${step.kol} — ${step.sentiment} (${step.sentiment_score.toFixed(2)}) on ${step.observed_at}: "${step.statement_text}" (${step.source_url})`,
  );

  const prompt = `Entity: ${opts.entity}
Propagation window: ${opts.windowDays} days between consecutive steps.

Chronological chain of KOL stance changes:
${lines.join("\n")}

Write a short narrative (3-6 sentences) describing this as a chain reaction — who moved first, and how it appears to have propagated to the others — with citations.`;

  const { text } = await generateText({
    model: SYNTHESIS_MODEL,
    system: SYNTH_SYSTEM,
    prompt,
    abortSignal: AbortSignal.timeout(30_000),
  });
  return text;
}
