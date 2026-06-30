/**
 * Threads company-connect outcomes (#1500, ADR-0125 D1 / backend BE #445).
 *
 * Both the start action (`connectThreadsAction`) and the callback route
 * (`/api/connections/threads/callback`) land on `/settings/connections?threads=<result>`
 * with an optional `&threadsStatus=<httpStatus>` carrying the backend's HTTP code. This
 * module is the single vocabulary + human notice for those outcomes, so the Connections
 * page surfaces a specific, actionable reason instead of the connection row's bare
 * "error". No secrets and no token material — these are result codes only.
 *
 * Threads is the Instagram-anchored Threads OAuth (graph.threads.net), SEPARATE from the
 * Meta (graph.facebook.com) connection. The browser never holds the token or client_secret;
 * the backend exchanges the code and custodies `conn-company-threads` in Key Vault.
 */
export type ThreadsConnectResult =
  | "ok" // token exchanged; conn-company-threads written, row active
  | "stubbed" // backend reachable but Threads app not configured (501) — pending row recorded
  | "denied" // admin cancelled consent at Threads (provider error=)
  | "invalid" // callback returned without code/state, or backend rejected as bad/expired state (400)
  | "forbidden" // signed-in user lacks settings:write
  | "exchange_failed" // callback: backend 502 — Threads refused the code exchange
  | "start_not_configured" // start: backend says the Threads app isn't configured yet (501)
  | "start_rejected" // start: backend answered non-2xx (HTTP code in threadsStatus)
  | "start_unreachable" // start: no usable answer (network / timeout / bad JSON)
  | "start_no_url" // start: 200 but no authorizationUrl returned
  | "error"; // anything else — surfaced, never breaks the page

/** Human notice for each outcome. `status` is the optional backend HTTP code. */
export const THREADS_CONNECT_NOTICES: Record<
  ThreadsConnectResult,
  { tone: "success" | "warning" | "error"; message: (status?: string) => string }
> = {
  ok: {
    tone: "success",
    message: () =>
      "Threads connected — the token is in Key Vault as conn-company-threads. Outbound stays dormant until Meta App Review clears.",
  },
  stubbed: {
    tone: "warning",
    message: () =>
      "Threads isn't configured on the backend yet — a placeholder was recorded, no connection was made.",
  },
  denied: {
    tone: "warning",
    message: () => "Threads connection cancelled at the Threads login — no access was granted.",
  },
  invalid: {
    tone: "error",
    message: () =>
      "The Threads sign-in didn't complete (missing or expired authorization) — try Connect with Threads again.",
  },
  forbidden: {
    tone: "error",
    message: () => "You don't have permission to manage company connections.",
  },
  exchange_failed: {
    tone: "error",
    message: (s) =>
      `Threads refused the authorization exchange${s ? ` (HTTP ${s})` : ""} — check the app's redirect URI, then try again.`,
  },
  start_not_configured: {
    tone: "warning",
    message: () =>
      "Threads isn't configured on the backend yet (Threads app registration / App Review pending) — no connection was started.",
  },
  start_rejected: {
    tone: "error",
    message: (s) =>
      `Couldn't start the Threads connect — the backend rejected the request${s ? ` (HTTP ${s})` : ""}. Check the server logs.`,
  },
  start_unreachable: {
    tone: "error",
    message: () =>
      "Couldn't reach the backend to start the Threads connect — try again in a moment.",
  },
  start_no_url: {
    tone: "error",
    message: () =>
      "The backend started the connect but returned no Threads sign-in URL — check the Threads app configuration.",
  },
  error: {
    tone: "error",
    message: () => "Something went wrong connecting Threads — try again in a moment.",
  },
};

export function isThreadsConnectResult(value: string): value is ThreadsConnectResult {
  return value in THREADS_CONNECT_NOTICES;
}
