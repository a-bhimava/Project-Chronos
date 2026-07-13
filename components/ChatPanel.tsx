"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CitationList } from "@/components/Citation";
import { Sparkles } from "lucide-react";

const EXAMPLES = [
  "What did the DOJ allege about S&P's ratings?",
  "How much did Moody's pay to settle?",
  "What percentage of AAA-rated securities were downgraded?",
];

export function ChatPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setAnswer(data.answer);
      setCitations(data.citations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          Ask about the case
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="flex gap-2"
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about S&P or Moody's…"
          />
          <Button type="submit" disabled={loading || !question.trim()}>
            {loading ? "Thinking…" : "Ask"}
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQuestion(ex);
                ask(ex);
              }}
              className="text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-status-critical">{error}</p>}
        {answer && (
          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
            <CitationList urls={citations} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
