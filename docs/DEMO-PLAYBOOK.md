# Chronos Demo Playbook

Everything needed to present Chronos: intro, demo script, tech explanation, conclusion, case study, competitive positioning, monetization, and judge Q&A. Architecture diagram: `docs/architecture.jpeg`.

---

## Intro (teammate opens)

> "Chronos is an AI agent that turns market research into permanent company memory. Its eyes are You.com, continuously reading live regulation and competitor news; its memory is HydraDB, a relationship graph that compounds instead of resetting — so research never vanishes when a person or session ends. We've demoed it on financial services, but the engine is industry-agnostic — and because it knows your own product too, it doesn't just report news, it tells you 'competitor X shipped this because of regulation Y, and you don't have it yet.'"

Punchy short version:

> "Every research tool answers a question when asked. None of them remember. Chronos watches the market, remembers everything as a living graph, and checks every new signal against your own product."

---

## Demo script — high level (~60s)

> "This is Chronos. We pointed it at a famous story — the credit-rating agencies whose AAA ratings helped cause the 2008 crisis and ended in billion-dollar settlements.
>
> *(Timeline)* Chronos read the live web once and built a permanent, dated memory of everything said about S&P and Moody's — every statement, every source.
>
> *(Compare Periods)* Now the part nothing else can do: I ask 'what did the world believe in 2005, versus 2015?' Chronos time-travels through its memory and shows the shift — trusted AAA ratings then, a $1.4 billion fraud settlement later — with citations.
>
> *(Chain Reaction)* And it shows how it unfolded: one analyst warns, others follow, regulators move, both companies settle. A cascade, detected automatically."

## Demo script — detailed (per view)

1. **Landing** (if merged): "Ask Chronos to track expert opinion on anything. Today: the credit-ratings scandal." Type "S&P ratings" → Analyze.
2. **Timeline**: "Everything you'll see was ingested once from the live web and remembered. Here's the full public record on S&P and Moody's — every dated statement, chronological, cited. 213 memories."
3. **Compare Periods** (the money shot): "Pick S&P. Compare January 2005 — when their securities were AAA and everyone trusted them — against February 2015, the day of the $1.375 billion DOJ settlement. Chronos reconstructs what the record said *as of each date* and narrates the shift, with citations. No search engine can answer 'what did the world believe on this date.'"
4. **Chain Reaction**: "It also detects cascades: internal analyst warnings → testimony → downgrades → DOJ action → S&P settles → Moody's settles two years later. Who flipped first, who followed."
5. **Sources / Chat**: "Every claim traces to an archived capture — if the page changes or vanishes tomorrow, we keep the receipt. And you can just ask questions in chat against the same memory."

---

## Tech explanation — high level (~45s, point at diagram)

> "Under the hood, two simple ideas.
>
> **One: read once, remember forever.** You.com is our eyes on the live web. An LLM turns every page into structured, dated facts. Those go into HydraDB — a memory graph that only grows, never overwrites.
>
> **Two: time-travel on top of that memory.** When you ask a question, we search the graph, rewind it to any date you want, compare dates, detect cascades — and an LLM writes you a cited answer.
>
> And nothing is hardcoded: the whole case study is one config file. Swap it, and the same engine watches healthcare or legal instead."

## Tech explanation — detailed

**Ingestion (offline):** You.com search finds sources for each topic query; You.com contents livecrawls them to markdown; Gemini Flash extracts structured facts (actor, sentiment, statement, and crucially the date) under a strict schema; each fact becomes an append-only memory in HydraDB with metadata and source URL.

**Serving (live):** Question → hybrid semantic + graph search in HydraDB → the temporal layer (our own, unit-tested: `stateAsOf`, `diff`, `domino`) reconstructs state as-of any date, diffs two dates, and detects opinion cascades → Gemini writes a cited narrative → dashboard renders it (Timeline, Compare Periods, Chain Reaction, Key Findings, Sources, Chat).

**Design choices worth saying out loud:**
- Memories are never overwritten — knowledge compounds git-style.
- Cheap model per document at ingest; strong model once per question — scales cheaply.
- Only `data/topics.json` is domain-specific; the engine is industry-agnostic.

---

## Conclusion

> "S&P and Moody's clients lost billions because nobody could see the gap between what was being said and what was known — that took a DOJ investigation and seven years. Every research tool today answers a question and forgets. Chronos watches continuously, remembers permanently in a company-owned graph, and checks every signal against your own product. Research that compounds instead of vanishing — that's Chronos. Thank you."

---

## Case study: S&P & Moody's ratings settlements

Full reference: `docs/sp-moodys-referential-case-study.md`. Seeded as 213 memories.

**The story:** Before 2008, S&P and Moody's rated toxic mortgage securities (RMBS/CDOs) AAA while internally knowing risks were deteriorating. Clients relied on the ratings and got burned. **S&P: $1.375B DOJ settlement, Feb 2015** (half federal, half to 19 states + DC). **Moody's: ~$864M, 2017** (DOJ, 21 states + DC).

**Why it's the perfect demo:**
1. **Time-travel story** — public statements and internal knowledge diverged for years; Compare Periods exposes exactly that gap.
2. **Chain reaction** — internal warnings → testimony (Frank Raiter/S&P, Arturo Cifuentes/Moody's) → downgrades → DOJ → S&P settles → Moody's follows.
3. **Anti-amnesia argument** — the scandal is what happens when nobody keeps receipts on changing reference information.
4. **Fully public record** (DOJ, FCIC) — every claim citable, no made-up data.

---

## Competitive positioning

- **Bloomberg** — built for market participants (pricing/trading), not product strategy. Chronos links regulation/competitor events to *your product's* gaps. Different buyer.
- **Perplexity (Finance)** — one query, one person, then forgets; no concept of your product. Chronos's memory is company-owned and compounding.
- **AlphaSense** (closest) — search-deeper, not remember-forever; no self-node; enterprise pricing.
- **One-liner:** "Bloomberg and Perplexity answer questions. Neither remembers the answer, connects it to your product, or gives the next person the same source of truth. That's the gap Chronos closes."
- If pushed on "they have alerts/memory now": those are per-user conveniences; Chronos is a shared, permanent, company-owned graph — a new hire inherits everything on day one.

---

## Monetization

**Short:** B2B SaaS, per team per month. Buyer: product/compliance/BD lead. ~$500–2,000/mo per team by watchlist size.

**Tiers:** Starter (one watchlist, ~$500/mo) → Growth (multiple watchlists, self-node onboarding, alerts, ~$2K/mo) → Enterprise (SSO, audit trails, compliance-grade archived captures, custom).

**Unit economics:** costs scale with ingestion (You.com + cheap Flash extraction); the expensive model runs only per human question — healthy margins.

**Moat:** every month the customer's graph gets more valuable; churning = deleting the company's memory. Charge per team, not per seat — a shared source of truth is the product.

**Benchmark:** AlphaSense: tens of $K/year, no memory. Bloomberg: ~$25K/seat. Chronos is an order of magnitude cheaper and answers "are we behind, and why?"

---

## Judge Q&A (short answers)

- **Why You.com?** Search + full-page crawl in one API, clean markdown, citation-backed. We spent the hackathon on memory, not scrapers.
- **Why HydraDB?** One query = semantic search + graph relationships. Vector DBs lack relationships; graph DBs lack semantic search. Append-only → compounding memory.
- **Isn't this just RAG?** RAG fetches documents per query and forgets. We persist extracted, dated facts and run time-travel analytics (as-of, diff, cascades). RAG can't answer "what was believed in 2005?"
- **Hallucinations?** Extraction must quote the source; every memory keeps its URL; every answer must cite.
- **Hardcoded?** Only the reading list (`data/topics.json`). Swap it → healthcare/legal.
- **Cost/scale?** Cheap model per document offline; expensive model once per question.
- **Who pays?** Product/compliance/BD teams, ~$500–2K/team/mo.
- **Moat?** The graph — churning means deleting your company's memory.
- **vs. ChatGPT/Perplexity memory?** Per-user vs. company-owned; whole team gets the same answer.
- **Why this case study?** Fully public, verifiable — and exactly the failure Chronos prevents.
- **What's next?** Self-node (customer's product mapped into the graph), alerts, continuous ingestion.

---

## Practical tips

- Rehearse **Compare Periods** right before presenting — it's the riskiest live LLM call (10–20s). Talk through the loading state: "it's synthesizing the narrative from memories right now."
- Keep **Timeline** pre-loaded as the fallback view if anything hangs.
- Landing page flow (query → dashboard) is on the `landing-page` branch/PR — confirm merge status before demoing it.
