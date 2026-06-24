/**
 * Transient-connection retry seam for the Postgres pool (#1293).
 *
 * Kept out of `client.ts` (which is `server-only`) so it is unit-testable. `client.ts` wraps the
 * live pool's `query` with `withQueryRetry`; nothing else should import this directly.
 */
import type { Pool } from "pg";

/**
 * True when an error is a transient CONNECTION fault — the pooled client was dead/dropped or
 * could not be established — as opposed to a real query fault (bad SQL, constraint, permission).
 * On these the statement never executed, so retrying on a fresh client is safe and idempotent.
 * Covers the Postgres connection-exception SQLSTATE class (08*), admin/crash shutdown +
 * cannot-connect-now (57P0*), the pg pool's own "Connection terminated" messages, and the Node
 * socket errnos.
 */
const RETRYABLE_PG_CODES = new Set([
  "08000", "08003", "08006", "08001", "08004", "08007", "08P01",
  "57P01", "57P02", "57P03",
]);
const RETRYABLE_NODE_CODES = new Set(["ECONNRESET", "EPIPE", "ETIMEDOUT", "ECONNREFUSED"]);

export function isRetryableConnectionError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; message?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  if (RETRYABLE_PG_CODES.has(code) || RETRYABLE_NODE_CODES.has(code)) return true;
  const message = typeof e.message === "string" ? e.message.toLowerCase() : "";
  return (
    message.includes("connection terminated") ||
    message.includes("connection ended") ||
    message.includes("timeout exceeded when trying to connect") ||
    message.includes("server closed the connection") ||
    message.includes("terminating connection")
  );
}

/**
 * Wrap `pool.query` so EVERY repository read goes through one seam that:
 *  1. logs the underlying error — the repositories' per-method `catch {}` swallows it before it
 *     reaches the guarded mock, so this is the only place the real cause is visible; and
 *  2. retries ONCE on a transient connection fault. A dropped/expired pooled client (the Azure
 *     Entra-token case, #1290) throws a connection error on first use; the retry acquires a fresh
 *     client from the pool. Reads and idempotent upserts are safe because a connection error means
 *     the statement never ran. A real query error (constraint/permission/SQL) is NOT retried.
 * This turns the dominant "Live data is unavailable" incident — an unlucky request landing on a
 * dead pooled connection — from a hard page failure into a transparent retry.
 */
export function withQueryRetry(p: Pool): Pool {
  const original = p.query.bind(p) as (...args: unknown[]) => Promise<unknown>;
  // The callback form is unused by the repositories (all await the promise), so only the promise
  // form needs wrapping; pass every argument straight through to preserve the pg overloads.
  const wrapped = async (...args: unknown[]): Promise<unknown> => {
    try {
      return await original(...args);
    } catch (err) {
      console.error("[db] query failed:", (err as { code?: string })?.code ?? "", String(err));
      if (isRetryableConnectionError(err)) {
        console.warn("[db] retrying once after a transient connection error");
        return await original(...args);
      }
      throw err;
    }
  };
  (p as unknown as { query: typeof wrapped }).query = wrapped;
  return p;
}
