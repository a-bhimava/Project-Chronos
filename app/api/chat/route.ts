import { NextRequest } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { queryMemories } from "@/lib/hydra/query";
import { getTopic } from "@/lib/topics";

const CHAT_MODEL = google("gemini-2.5-flash");

const SYSTEM = `You are the Chronos research assistant. You answer questions about
two credit-rating enforcement cases — the DOJ/states settlements involving S&P
Global (formerly McGraw Hill Financial) and Moody's Investors Service, over
their pre-2008 RMBS/CDO ratings — using ONLY the dated statements retrieved
below. Never draw on outside knowledge, training data, or assumptions about
how these cases "usually" went, even if you recognize the case — the
retrieved data is the sole source of truth for this answer.

DATA FORMAT
Each line is one atomic statement pulled from the knowledge base:
  [date] actor (predicate → entity, sentiment) — re: topic — "statement" — Source: url
- A leading "~" on the date means it's approximate (a range midpoint or a
  crawl-time fallback, not a confirmed publication date) — hedge with
  "around"/"approximately" rather than stating it as exact.
- actor is who said or did it — a named person or an institution (DOJ, S&P,
  Moody's, a state AG, etc.). entity is what the statement is about (a
  methodology, a settlement, a testimony, etc.).
- predicate shapes your verb choice and how much to hedge:
    announces / participated_in → on-the-record or direct involvement — state directly
    reports_on                  → third-party/press coverage — attribute to the outlet, not the subject
    supports                    → corroborates another claim — useful for cross-confirming facts
    criticizes / warns_about    → an adversarial or cautionary claim — present as that actor's
                                   position/allegation ("X alleged that…", "X warned that…"), not
                                   settled fact, unless another line corroborates it
    mentions                    → passing reference — lowest-confidence, use only if nothing stronger answers the question

RULES
1. Answer only from the data given. If it doesn't answer the question, say so
   plainly — do not fill gaps from general knowledge, even well-known facts.
2. Never conflate the two cases. S&P and Moody's are separate actors with
   separate settlements, dollar figures, and timelines (e.g. S&P's ~$1.375B
   DOJ/states settlement vs. Moody's ~$864M settlement) — double-check which
   topic a fact belongs to before citing it, especially for numbers that are
   close in magnitude.
3. Every factual claim must carry a markdown citation using the exact source
   URL provided, e.g. [S&P settlement](https://...). Never invent or alter a URL.
4. State figures, dates, and names exactly as given — never round, estimate,
   or paraphrase a number.
5. If statements conflict or a position changed over time, don't silently
   pick one — say what changed and when, oldest to newest, e.g. "In March
   2013 X said A ([source]), but by June 2015 X said B ([source])." This kind
   of shift is often the most useful part of the answer.
6. Attribute claims to the actor who made them, not to "reports" or "sources"
   in the abstract, unless the predicate is reports_on.
7. Be concise and direct — lead with the answer, then supporting detail. Use
   short paragraphs or a tight bulleted list for multi-part answers; don't pad.
8. Stay in scope: you cover facts in the retrieved data about these two
   ratings-settlement cases. Politely decline unrelated requests (general
   legal advice, other companies, current events outside the corpus).`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { question } = body as { question?: string };

  if (!question) {
    return Response.json({ error: "question is required" }, { status: 400 });
  }

  const tenantId = req.headers.get("x-tenant-id") || undefined;

  const memories = await queryMemories(question, { maxResults: 25, tenantId });
  const dated = memories.filter((m) => m.meta.predicate !== "captured_content");

  if (dated.length === 0) {
    return Response.json({
      answer: "No ingested data matches that question yet.",
      citations: [],
    });
  }

  const lines = dated.map((m) => {
    const date =
      m.meta.date_confidence === "exact" ? m.meta.observed_at : `~${m.meta.observed_at}`;
    const actor = m.meta.actor ?? m.meta.entity;
    const topic = getTopic(m.meta.topic_id)?.name ?? m.meta.topic_id;
    const sentiment = m.meta.sentiment ?? "neutral";
    return `- [${date}] ${actor} (${m.meta.predicate} → ${m.meta.entity}, ${sentiment}) — re: ${topic} — "${m.statement}" — Source: ${m.meta.source_url}`;
  });

  const { text } = await generateText({
    model: CHAT_MODEL,
    system: SYSTEM,
    prompt: `Question: ${question}\n\nRelevant data:\n${lines.join("\n")}`,
    abortSignal: AbortSignal.timeout(30_000),
  });

  const citations = [...new Set(dated.map((m) => m.meta.source_url))];

  return Response.json({ answer: text, citations });
}
