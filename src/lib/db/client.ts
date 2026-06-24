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
import { Pool, type PoolConfig } from "pg";
import { ManagedIdentityCredential } from "@azure/identity";
import { withQueryRetry } from "./retry";

const AAD_SCOPE = "https://ossrdbms-aad.database.windows.net/.default";

/**
 * Shared pool tuning (#1290). Azure Postgres terminates a connection once its Entra
 * access token expires (~60–90 min) and reaps idle ones; node-postgres otherwise keeps
 * the now-dead client in the pool and the NEXT query that grabs it fails with a
 * connection error. Every repository wraps `pool.query` in a bare catch that routes to
 * the guarded mock, so that failure surfaces as `DataUnavailableError` ("Live data is
 * unavailable") on an unrelated page — intermittent and self-healing once the client is
 * re-minted. The cure is to never hand out a connection old enough to have a dead token:
 *  - `maxLifetimeSeconds` rotates every connection well under the token TTL;
 *  - `idleTimeoutMillis` reaps idle clients before Azure drops them server-side;
 *  - `connectionTimeoutMillis` fails fast instead of hanging a render;
 *  - `keepAlive` keeps long-lived connections from being dropped by idle NAT timeouts.
 */
const POOL_TUNING = {
  max: 5,
  idleTimeoutMillis: 30_000,
  maxLifetimeSeconds: 1_800,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
} satisfies Partial<PoolConfig>;

/**
 * Attach a pool-level error handler (#1290). A connection terminated while idle (the
 * Azure token-expiry / idle-reap case above) emits `error` on the pool; with no handler
 * that event is unobserved and an unhandled `error` can take the process down. Logging
 * here is also the one place the REAL cause is visible — the per-query catch in each
 * repository swallows it — so this is what makes the next incident diagnosable.
 */
function withErrorLogging(p: Pool): Pool {
  p.on("error", (err) => {
    console.error("[db] idle client error — connection discarded by the pool:", err);
  });
  return p;
}

/** Build a pool with the shared tuning, the idle-error handler, and the query retry/log seam. */
function harden(p: Pool): Pool {
  return withQueryRetry(withErrorLogging(p));
}

function build(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return harden(new Pool({ connectionString: url, ...POOL_TUNING }));
  }

  const host = process.env.PGHOST?.trim();
  const user = process.env.PGUSER?.trim();
  if (host && user) {
    const clientId = process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID?.trim();
    const credential = new ManagedIdentityCredential(clientId ? { clientId } : {});
    return harden(
      new Pool({
        host,
        port: Number(process.env.PGPORT ?? 5432),
        database: process.env.PGDATABASE?.trim(),
        user,
        // node-postgres calls this per new connection; the credential caches tokens.
        // A connection minted here is force-rotated by `maxLifetimeSeconds` before its
        // token can expire, so the server never terminates a live pooled client (#1290).
        password: async () => {
          const token = await credential.getToken(AAD_SCOPE);
          if (!token) throw new Error("Failed to acquire managed-identity token for Postgres.");
          return token.token;
        },
        ssl: { rejectUnauthorized: true },
        ...POOL_TUNING,
      }),
    );
  }

  return null; // not configured
}

let pool: Pool | null | undefined;

/** The shared pool, or null when no database is configured. */
export function getPool(): Pool | null {
  if (pool === undefined) pool = build();
  return pool;
}

/** True when a database connection is configured. */
export function isDbConfigured(): boolean {
  return getPool() !== null;
}
