const CONTENTS_URL = "https://ydc-index.io/v1/contents";

export type ContentsFormat = "html" | "markdown" | "metadata";

export type YouComContentResult = {
  url: string;
  markdown?: string;
  html?: string;
  metadata?: Record<string, unknown>;
  error?: string;
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
 * You.com Contents (livecrawl) API. Max 10 URLs per call — callers are
 * responsible for batching. Used both to feed extraction AND to archive the
 * raw markdown verbatim as a captured_content relation (the anti-amnesia
 * feature), so this should be called BEFORE extraction ever runs.
 */
export async function youComContents(
  urls: string[],
  options: { formats?: ContentsFormat[]; crawl_timeout?: number; max_age?: number } = {},
): Promise<YouComContentResult[]> {
  if (urls.length === 0) return [];
  if (urls.length > 10) {
    throw new Error(`youComContents accepts at most 10 URLs per call, got ${urls.length}`);
  }

  const apiKey = requireApiKey();
  const res = await fetch(CONTENTS_URL, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      urls,
      formats: options.formats ?? ["markdown"],
      crawl_timeout: options.crawl_timeout ?? 15,
      ...(options.max_age !== undefined ? { max_age: options.max_age } : {}),
    }),
    // crawl_timeout above is a request param the API may or may not enforce
    // server-side; this is our own client-side deadline so a stalled
    // connection can't hang the ingestion pipeline indefinitely (see
    // search.ts for the incident that motivated this).
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    throw new Error(`You.com contents failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? (data as YouComContentResult[]) : (data.results as YouComContentResult[]);
}

/** Batches an arbitrary number of URLs into <=10-URL calls to youComContents. */
export async function youComContentsBatched(
  urls: string[],
  options: { formats?: ContentsFormat[]; crawl_timeout?: number; max_age?: number } = {},
): Promise<YouComContentResult[]> {
  const batches: string[][] = [];
  for (let i = 0; i < urls.length; i += 10) {
    batches.push(urls.slice(i, i + 10));
  }
  const results = await Promise.all(batches.map((batch) => youComContents(batch, options)));
  return results.flat();
}
