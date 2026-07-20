import { HydraDBClient } from "@hydradb/sdk";

let cachedClient: HydraDBClient | null = null;

export function getHydraClient(): HydraDBClient {
  if (cachedClient) return cachedClient;
  const token = process.env.HYDRA_DB_API_KEY;
  if (!token) {
    throw new Error(
      "HYDRA_DB_API_KEY is not set. Sign up at app.hydradb.com and set it in .env.local / Vercel env vars.",
    );
  }
  cachedClient = new HydraDBClient({ token });
  return cachedClient;
}

/**
 * The HydraDB database (v2 canonical name; "tenant" in older/context
 * endpoints, which still require the field literally named tenantId).
 */
export function getDatabase(tenantId?: string): string {
  if (tenantId) return tenantId;
  const database = process.env.HYDRA_DB_DATABASE;
  if (!database) {
    throw new Error(
      "HYDRA_DB_DATABASE is not set — the database/tenant name to use for all Chronos data (e.g. 'chronos-hackathon'). Create it with `hydradb tenant create <name>` or client.databases.create().",
    );
  }
  return database;
}
