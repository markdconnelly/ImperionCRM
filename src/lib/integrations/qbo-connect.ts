/**
 * QuickBooks Online company-connect outcomes (#530, ADR-0048/0085).
 *
 * Both the start action (`connectQuickBooksAction`) and the callback route
 * (`/api/qbo/callback`) land on `/settings/connections?qbo=<result>` with an
 * optional `&qboStatus=<httpStatus>` carrying the backend's HTTP code. This module is
 * the single vocabulary + human notice for those outcomes, so the Connections page
 * surfaces a specific, actionable reason instead of the connection row's bare
 * "error". No secrets and no token material — these are result codes only.
 */
export type QboConnectResult =
  | "ok" // token exchanged; conn-company-qbo written, row active
  | "stubbed" // backend reachable but QBO not configured (501) — pending row recorded
  | "denied" // admin cancelled consent at Intuit
  | "invalid" // Intuit returned without code/realmId/state
  | "forbidden" // signed-in user lacks settings:write
  | "exchange_failed" // callback: backend 502 — Intuit refused the code exchange
  | "start_not_configured" // start: backend says the Intuit app isn't configured yet (501)
  | "start_rejected" // start: backend answered non-2xx (HTTP code in qboStatus)
  | "start_unreachable" // start: no usable answer (network / timeout / bad JSON)
  | "start_no_url" // start: 200 but no authorizationUrl returned
  | "error"; // anything else — surfaced, never breaks the page

/** Human notice for each outcome. `status` is the optional backend HTTP code. */
export const QBO_CONNECT_NOTICES: Record<
  QboConnectResult,
  { tone: "success" | "warning" | "error"; message: (status?: string) => string }
> = {
  ok: {
    tone: "success",
    message: () =>
      "QuickBooks connected — the token is in Key Vault and reconciliation can read it.",
  },
  stubbed: {
    tone: "warning",
    message: () =>
      "QuickBooks isn't configured on the backend yet — a placeholder was recorded, no connection was made.",
  },
  denied: {
    tone: "warning",
    message: () => "QuickBooks connection cancelled at Intuit — no access was granted.",
  },
  invalid: {
    tone: "error",
    message: () =>
      "QuickBooks didn't return the expected sign-in response — try connecting again.",
  },
  forbidden: {
    tone: "error",
    message: () => "You don't have permission to manage company connections.",
  },
  exchange_failed: {
    tone: "error",
    message: (s) =>
      `Intuit refused the authorization exchange${s ? ` (HTTP ${s})` : ""} — check the app's redirect URI, then try again.`,
  },
  start_not_configured: {
    tone: "warning",
    message: () =>
      "QuickBooks isn't configured on the backend yet (Intuit app registration pending) — no connection was started.",
  },
  start_rejected: {
    tone: "error",
    message: (s) =>
      `Couldn't start the QuickBooks connect — the backend rejected the request${s ? ` (HTTP ${s})` : ""}. Check the server logs.`,
  },
  start_unreachable: {
    tone: "error",
    message: () =>
      "Couldn't reach the backend to start the QuickBooks connect — try again in a moment.",
  },
  start_no_url: {
    tone: "error",
    message: () =>
      "The backend started the connect but returned no Intuit sign-in URL — check the QBO app configuration.",
  },
  error: {
    tone: "error",
    message: () => "Something went wrong connecting QuickBooks — try again in a moment.",
  },
};

export function isQboConnectResult(value: string): value is QboConnectResult {
  return value in QBO_CONNECT_NOTICES;
}
