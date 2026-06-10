/**
 * Per-user OAuth connection flow — pure helpers (ADR-0024, backend ADR-0038).
 *
 * The real authorization-code flows run in the backend (`ImperionCRM_Backend`,
 * `/connections/{provider}/{start,callback,disconnect}`); this module holds the
 * front end's pure decision logic so it can be unit-tested without a session:
 * which providers do live OAuth, how a provider callback's query string is
 * classified, and how flow outcomes round-trip through the Settings page URL
 * (`/settings?tab=connections&connect=<result>&provider=<p>`) as a notice.
 *
 * Deliberately NOT server-only: pure functions + constants, no secrets.
 */

/**
 * Providers with a live backend authorization-code flow (backend ADR-0038).
 * Plaud is key-based (no public OAuth) and stays on the local stub by design.
 */
export const PERSONAL_OAUTH_PROVIDERS = [
  "m365",
  "google",
  "youtube",
  "linkedin",
  "facebook",
] as const;

export type PersonalOAuthProvider = (typeof PERSONAL_OAUTH_PROVIDERS)[number];

export function isPersonalOAuthProvider(value: string): value is PersonalOAuthProvider {
  return (PERSONAL_OAUTH_PROVIDERS as readonly string[]).includes(value);
}

/** Outcome flags carried back to Settings as `?connect=<result>` (the page renders a notice). */
export type ConnectResult =
  | "ok" // backend exchanged the code; connection row is active
  | "stubbed" // backend not configured (or Plaud) — local stub row recorded, as before
  | "cancelled" // the user denied consent at the provider
  | "invalid_state" // state missing/expired/replayed (CSRF guard) or code missing
  | "exchange_failed" // provider refused the code exchange (backend 502)
  | "not_configured" // backend reachable but provider returns 501 mid-flow
  | "forbidden" // signed-in user lacks settings:write
  | "error"; // anything else — surfaced, never breaks the page

/** Human notice for each flow outcome, rendered on Settings → Your connections. */
export const CONNECT_RESULT_NOTICES: Record<
  ConnectResult,
  { tone: "success" | "warning" | "error"; message: (provider: string) => string }
> = {
  ok: {
    tone: "success",
    message: (p) => `${p} connected — tokens are in Key Vault and ingestion can begin.`,
  },
  stubbed: {
    tone: "warning",
    message: (p) =>
      `${p} was recorded, but live OAuth isn't configured for it yet — the connection is a placeholder until the backend provider settings are added.`,
  },
  cancelled: {
    tone: "warning",
    message: (p) => `${p} connection cancelled — no access was granted.`,
  },
  invalid_state: {
    tone: "error",
    message: (p) =>
      `${p} connection failed: the sign-in attempt expired or didn't originate here. Try connecting again.`,
  },
  exchange_failed: {
    tone: "error",
    message: (p) => `${p} refused the token exchange — try again or check the app registration.`,
  },
  not_configured: {
    tone: "warning",
    message: (p) => `${p} isn't configured on the backend yet — no connection was made.`,
  },
  forbidden: {
    tone: "error",
    message: () => "You don't have permission to manage connections.",
  },
  error: {
    tone: "error",
    message: (p) => `Something went wrong connecting ${p} — try again in a moment.`,
  },
};

export function isConnectResult(value: string): value is ConnectResult {
  return value in CONNECT_RESULT_NOTICES;
}

/**
 * Relative URL of the Settings connections tab carrying a flow outcome. Both the
 * connect action and the callback route land here; the page turns it into a notice.
 */
export function settingsConnectionsPath(result: ConnectResult, provider?: string): string {
  const params = new URLSearchParams({ tab: "connections", connect: result });
  if (provider) params.set("provider", provider);
  return `/settings?${params.toString()}`;
}

/** What the provider's redirect back to our callback route means. */
export type CallbackClassification =
  | { kind: "cancelled" } // provider sent error= (user denied consent, etc.)
  | { kind: "invalid" } // no usable code/state — never forward
  | { kind: "forward"; code: string; state: string }; // hand to the backend

/**
 * Classify the query string the provider redirected back with. `error` wins over
 * everything (the user cancelled — the backend's one-time state stays unconsumed
 * and simply expires); otherwise both `code` and `state` must be present.
 */
export function classifyOAuthCallback(params: URLSearchParams): CallbackClassification {
  if (params.get("error")) return { kind: "cancelled" };
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return { kind: "invalid" };
  return { kind: "forward", code, state };
}
