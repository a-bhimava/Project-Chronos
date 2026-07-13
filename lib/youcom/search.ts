const SEARCH_URL = "https://ydc-index.io/v1/search";

export type YouComWebResult = {
  url: string;
  title: string;
  description: string;
  snippets?: string[];
  thumbnail_url?: string;
  favicon_url?: string;
};

export type YouComSearchResponse = {
  results: {
    web?: YouComWebResult[];
    news?: YouComWebResult[];
  };
  metadata: {
    search_uuid: string;
    query: string;
    latency: number;
  };
};

export type SearchOptions = {
  count?: number; // default 10, max 100
  offset?: number;
  /** "day" | "week" | "month" | "year" | "YYYY-MM-DDtoYYYY-MM-DD" */
  freshness?: string;
  country?: string;
  language?: string;
  safesearch?: "off" | "moderate" | "strict";
  include_domains?: string[];
  exclude_domains?: string[];
  boost_domains?: string[];
};

function requireApiKey(): string {
  const key = process.env.YDC_API_KEY;
  if (!key) {
    throw new Error(
      "YDC_API_KEY is not set. Sign up at you.com/platform and set it in .env.local / Vercel env vars.",
    );
  }
  return key;
}

/**
 * You.com Search API. Response shape is `results.web[]` / `results.news[]`
 * (NOT `hits[]` — an earlier draft of this integration had that wrong).
 */
export async function youComSearch(
  query: string,
  options: SearchOptions = {},
): Promise<YouComSearchResponse> {
  const apiKey = requireApiKey();
  const params = new URLSearchParams({ query });
  if (options.count) params.set("count", String(options.count));
  if (options.offset) params.set("offset", String(options.offset));
  if (options.freshness) params.set("freshness", options.freshness);
  if (options.country) params.set("country", options.country);
  if (options.language) params.set("language", options.language);
  if (options.safesearch) params.set("safesearch", options.safesearch);
  if (options.include_domains) params.set("include_domains", options.include_domains.join(","));
  if (options.exclude_domains) params.set("exclude_domains", options.exclude_domains.join(","));
  if (options.boost_domains) params.set("boost_domains", options.boost_domains.join(","));

  const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
    headers: { "X-API-Key": apiKey },
    // Without a client-side deadline, a stalled connection to a third-party
    // API hangs the whole ingestion pipeline indefinitely (hit this for
    // real during seeding — a request sat open with near-zero CPU for 20+
    // minutes with no error and no data).
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`You.com search failed (${res.status}): ${await res.text()}`);
  }

  return (await res.json()) as YouComSearchResponse;
}
