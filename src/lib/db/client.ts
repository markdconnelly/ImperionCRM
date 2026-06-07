/**
 * PostgreSQL connection pool (ADR-0003, ADR-0017).
 *
 * Connection modes (server-only):
 *  - **Managed identity (Azure):** when PGHOST + PGUSER are set, the password is a
 *    fresh Microsoft Entra access token from the App Service's user-assigned managed
 *    identity (AZURE_MANAGED_IDENTITY_CLIENT_ID). No secret is stored anywhere.
 *  - **Connection string (local dev):** when DATABASE_URL is set, use it directly.
 *  - **Unconfigured:** returns null — callers fall back to mock data so the app runs
 *    without a database.
 *
 * Never import into a client component.
 */
import "server-only";
import { Pool } from "pg";
import { ManagedIdentityCredential } from "@azure/identity";

const AAD_SCOPE = "https://ossrdbms-aad.database.windows.net/.default";

let pool: Pool | null | undefined;

function build(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return new Pool({ connectionString: url, max: 5 });
  }

  const host = process.env.PGHOST?.trim();
  const user = process.env.PGUSER?.trim();
  if (host && user) {
    const clientId = process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID?.trim();
    const credential = new ManagedIdentityCredential(clientId ? { clientId } : {});
    return new Pool({
      host,
      port: Number(process.env.PGPORT ?? 5432),
      database: process.env.PGDATABASE?.trim(),
      user,
      // node-postgres calls this per new connection; the credential caches tokens.
      password: async () => {
        const token = await credential.getToken(AAD_SCOPE);
        if (!token) throw new Error("Failed to acquire managed-identity token for Postgres.");
        return token.token;
      },
      ssl: { rejectUnauthorized: true },
      max: 5,
    });
  }

  return null; // not configured
}

/** The shared pool, or null when no database is configured. */
export function getPool(): Pool | null {
  if (pool === undefined) pool = build();
  return pool;
}

/** True when a database connection is configured. */
export function isDbConfigured(): boolean {
  return getPool() !== null;
}
