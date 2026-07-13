import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { KolShift } from "@/lib/temporal/diff";
import type { DominoStep } from "@/lib/temporal/domino";

// Called directly against Google's Generative AI API (see extract.ts for
// why — Vercel AI Gateway is blocked pending a credit card on the account).
// gemini-2.5-pro is listed on this key's /v1beta/models but actually 404s
// at generation time ("no longer available to new users") — a per-account
// tier restriction, not a typo. gemini-2.5-flash is confirmed working (it
// ran the entire bulk seed's extraction without a single failure), so reuse
// it here too rather than a model that's listed but not actually callable.
const SYNTHESIS_MODEL = google("gemini-2.5-flash");

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
  // Never hand the model an empty context and trust the system prompt's
  // "ONLY use the provided data" instruction to hold — it doesn't. Verified
  // live: given zero shifts, Gemini fabricated a detailed, plausible-looking
  // narrative with invented dates and fake source URLs instead of saying so.
  if (opts.shifts.length === 0) {
    return `No named-KOL statements about ${opts.entity} were found between ${opts.dateA} and ${opts.dateB} in the ingested data.`;
  }

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
  // Same reasoning as narrateCompare — never trust the model to decline
  // gracefully on empty input, enforce it in code. The domino route also
  // checks this before calling in, but this is a cheap, direct safety net.
  if (opts.chain.length === 0) {
    return `No sentiment chain reaction was found for ${opts.entity} within a ${opts.windowDays}-day propagation window.`;
  }

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
