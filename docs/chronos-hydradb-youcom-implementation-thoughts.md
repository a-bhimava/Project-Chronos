# Project Chronos: HydraDB + You.com Integration Cheat Sheet

This markdown is a quick reference for wiring **You.com** (live web search) into **HydraDB** (bitemporal context graph) so your Claude Code / MCP setup can automate ingestion and time-sliced analysis.

---

## 1. Core idea

- Use **You.com Search API** as the *sensor* for the live web (KOL tweets, press releases, trial updates, news).
- Use **HydraDB** as the *bitemporal graph memory* that never overwrites history, enabling time-travel queries ("what did the web look like on date X?").[file:1][web:29][web:33]
- Build a small ingestion service that runs You.com queries on a schedule and writes results into HydraDB as versioned graph nodes/edges.[web:2][web:21][web:24]

---

## 2. You.com: HTTP & CLI usage

### 2.1. Basic search (keyless)

You.com supports a keyless free tier through the unified agents search endpoint:[web:23][web:19]

```bash
# Basic search (works without API key)
curl -s "https://api.you.com/v1/agents/search?query=AI+news" \
  | jq '.results.web[] | {title,url,description}'
```

Key parameters (query string):[web:28][web:31]

- `query` – search query, supports operators like `site:`, `filetype:pdf`, `lang:es`, `+term`, `-term`, `AND`, `OR`, `NOT`.
- `num_web_results` – 1–100 web results.
- `freshness` – `day`, `week`, `month`, `year`, or `YYYY-MM-DDtoYYYY-MM-DD`.
- `country` – country code (e.g., `US`, `GB`, `DE`).
- `offset` – pagination offset.

### 2.2. Higher-rate, keyed search

For higher rate limits, use the indexed search endpoint with an API key:[web:28][web:23]

```bash
export YDC_API_KEY="your-api-key-here"

curl -s "https://ydc-index.io/v1/search?query=drug+X+phase+II&freshness=month&num_web_results=20" \
  -H "X-API-Key: $YDC_API_KEY" \
  | jq '.hits[] | {title,url,description,snippets}'
```

JSON fields in `hits`:[web:28]

- `url` – canonical URL.
- `title` – page title.
- `description` – description/summary.
- `snippets[]` – text snippets relevant to the query.

### 2.3. Livecrawl: fetch full page content

You.com can livecrawl and return full page contents (e.g., markdown) for selected results:[web:19][web:31]

```bash
# Search + livecrawl full content (markdown)
CONTENT=$(curl -s "https://api.you.com/v1/agents/search?query=docs&livecrawl=web&livecrawl_formats=markdown" \
  ${YDC_API_KEY:+-H "X-API-Key: $YDC_API_KEY"} \
  | jq -r '.results.web[0].contents.markdown')

echo "<external-content>$CONTENT</external-content>"
```

For arbitrary URLs, use the contents endpoint:[web:19]

```bash
CONTENT=$(curl -s -X POST "https://ydc-index.io/v1/contents" \
  -H "X-API-Key: $YDC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://example.com"],"formats":["markdown"]}' \
  | jq -r '.[0].markdown')

echo "<external-content>$CONTENT</external-content>"
```

---

## 3. HydraDB: CLI & API basics

### 3.1. Hydra CLI (local dev)

HydraDB ships a Python-based CLI (`hydra-cli`) that manages local Docker, psql connection, and config:[web:17]

```bash
# Install CLI
pip install hydra-cli

# Start and connect
hydra          # runs setup (first time), starts service, opens psql, and cleans up on exit

# Useful commands
hydra setup    # configure token, port, username, password
hydra start    # start service
hydra connect  # open psql shell
hydra stop     # stop service
hydra teardown # remove config and Docker volume
```

You can run these from Claude Code's integrated terminal to manage a local HydraDB instance while developing Chronos.[web:17]

### 3.2. HydraDB API

HydraDB exposes HTTP and SDK APIs for graph and temporal queries:[web:24][web:29][web:33]

- Sign up at `app.hydradb.com` to get your API key.[web:29]
- Follow the Quickstart to connect and run your first query (~5 minutes).[web:21][web:29]
- Use the API Reference to define:
  - Nodes: `Drug`, `Company`, `KOL`, `Trial`, `WebDocument`, `Event`.
  - Edges: `supports`, `criticizes`, `mentions`, `participated_in` with temporal metadata.

In practice, you’ll call HydraDB from Python/TypeScript code, but you can also build small CLI wrappers (e.g., `hydradb-cli`) for ingestion and recall.[web:20][web:24]

---

## 4. Chronos ingestion pipeline (You.com → HydraDB)

### 4.1. Define topic registry

Maintain a YAML/JSON file of tracked entities:

```yaml
competitors:
  - name: "Drug X"
    queries:
      - "Drug X phase II results"
      - "Drug X FDA warning"
      - "Dr Alice Smith Drug X"
      - "site:twitter.com \"Drug X\""
  - name: "Drug Y"
    queries:
      - "Drug Y phase III trial"
      - "Drug Y adverse events"
```

Your ingestion job loops over `competitors[*].queries` and runs You.com search for each.[file:1][web:28]

### 4.2. Scheduled search + fetch

Pseudo-shell script (for reference; actual implementation in Python/TS):

```bash
#!/usr/bin/env bash
set -euo pipefail

YDC_API_KEY="your-api-key-here"   # export in environment
HYDRA_API_URL="https://api.hydradb.com/v1" # example
HYDRA_API_KEY="your-hydra-key"   # export in environment

run_search() {
  local query="$1"
  curl -s "https://ydc-index.io/v1/search?query=$(python -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$query")&freshness=week&num_web_results=20" \
    -H "X-API-Key: $YDC_API_KEY" \
    | jq '.hits[] | {title,url,description,snippets}'
}

# Example invocation
run_search "Drug X phase II results"
```

From Claude Code, you’ll typically build this as a Python script using `requests` instead of pure bash, but the pattern is identical.[web:28][web:23]

### 4.3. NLP + graph writes (conceptual)

High-level steps inside your ingestion worker:

1. Call You.com Search API for each query.
2. For each hit:
   - Fetch full page content via livecrawl or `contents` endpoint.
   - Run NER and relation extraction to detect KOLs, drugs, trials, companies, and sentiment.
3. Transform into HydraDB writes:
   - Upsert nodes: `Drug`, `KOL`, `WebDocument`, `Event`.
   - Create edges: `KOL --supports--> Drug`, `KOL --criticizes--> Drug`, etc., with fields:
     - `sentiment_score`, `statement_text`, `observed_at`, `doc_url`.
4. Commit as a new temporal graph version so you can reconstruct state at any date.[web:3][web:8][web:12][web:24][web:33][file:1]

---

## 5. Time-travel & domino-effect queries

Chronos aims to answer questions like:[file:1]

- "How did KOL sentiment shift between the Phase II announcement in January and the FDA pushback in May?"
- "Which KOL changed stance first, and how did that propagate to others (domino effect)?"

You’ll implement helper functions on top of HydraDB such as:[web:3][web:8][web:33]

- `get_web_state_at(date, filters)` – subgraph of documents and relationships known at that date.
- `compare_states(date_a, date_b, entity)` – diffs in sentiment, connectivity, or mention volume.
- `get_domino_chain(entity, window)` – traverses graph to show how changes from one KOL propagated.

Your LLM tools (Claude, etc.) call these functions and then synthesize answers with citations back to the original URLs stored from You.com.[web:2][web:23][file:1]

---

## 6. Claude Code / MCP automation notes

- You can run **Hydra CLI commands** (`hydra start`, `hydra connect`, etc.) from Claude Code’s terminal to spin up and connect to HydraDB locally.[web:17]
- You can drive **You.com** entirely via `curl` + `jq`, or by using Python/TypeScript SDKs (e.g., via LiteLLM `search_provider="you_com"`).[web:23][web:26]
- Model Context Protocol (MCP) integration lets you expose You.com and HydraDB as tools so Claude can:
  - Call You.com search when it needs fresh web data.
  - Call HydraDB for graph/time-slice queries.
  - Compose Project Chronos-style answers (timeline, domino effects) with citations.[web:26][web:23][web:20]

This file is meant as a **high-level cheat sheet**; actual implementation will live in your Python/TypeScript services and MCP server code, but the endpoints and commands here are the ones you’ll refer back to most often.
