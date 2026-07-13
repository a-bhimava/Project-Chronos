import { NextRequest } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { queryMemories } from "@/lib/hydra/query";

const CHAT_MODEL = google("gemini-2.5-flash");

const SYSTEM = `You are the Chronos market-intelligence assistant, answering
questions about the S&P and Moody's credit-rating settlements using ONLY the
dated statements provided below (from named actors — individuals or
institutions — with sources). Write a concise, direct answer. Every factual
claim MUST cite its source with a markdown link using the exact URL
provided. Never state a date, figure, or quote that isn't in the provided
data — if the data doesn't answer the question, say so plainly.`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { question } = body as { question?: string };

  if (!question) {
    return Response.json({ error: "question is required" }, { status: 400 });
  }

  const memories = await queryMemories(question, { maxResults: 25 });
  const dated = memories.filter((m) => m.meta.predicate !== "captured_content");

  if (dated.length === 0) {
    return Response.json({
      answer: "No ingested data matches that question yet.",
      citations: [],
    });
  }

  const lines = dated.map(
    (m) =>
      `- ${m.meta.actor ?? m.meta.entity} on ${m.meta.observed_at}: "${m.statement}" (${m.meta.source_url})`,
  );

  const { text } = await generateText({
    model: CHAT_MODEL,
    system: SYSTEM,
    prompt: `Question: ${question}\n\nRelevant data:\n${lines.join("\n")}`,
    abortSignal: AbortSignal.timeout(30_000),
  });

  const citations = [...new Set(dated.map((m) => m.meta.source_url))];

  return Response.json({ answer: text, citations });
}
