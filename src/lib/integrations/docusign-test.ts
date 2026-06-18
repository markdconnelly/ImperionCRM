/**
 * Pure mapper: a DocuSign readiness probe → a card-renderable "Test connection"
 * result (#867). The Settings server action calls the backend status endpoint via
 * the call-guard seam (`callServiceWithFallback`) and hands the outcome here; the
 * client `CompanyCredentialCard` renders the returned label/tone/detail. No server
 * imports live in this module, so the client card can import its types directly.
 *
 * Backend contract (backend #143, `GET /connections/docusign/status` — the probe
 * mints a JWT-impersonation token, which doubles as the admin-consent check):
 *   200 {configured:true, consentGranted:true}               → consent_granted (ready)
 *   200 {configured:true, consentGranted:false, consentUrl}  → consent_required
 *   501 (backend "not configured") | base-URL env unset      → not_configured
 *   502 token_mint_failed                                    → mint_failed
 *   any other non-2xx (e.g. 401/403 caller not allow-listed) → rejected
 *   network / timeout / bad JSON                             → unreachable
 *
 * No secret, token, key, or assertion is ever part of the probe (the backend never
 * returns them — see backend ADR-0056), so nothing sensitive flows through here.
 */

export type DocusignTestState =
  | "consent_granted"
  | "consent_required"
  | "not_configured"
  | "mint_failed"
  | "rejected"
  | "unreachable";

/** Maps 1:1 to a globals.css text token the card colours the result line with. */
export type DocusignTestTone = "green" | "amber" | "red" | "dim";

export interface DocusignTestResult {
  state: DocusignTestState;
  /** Truly ready to send envelopes — consent granted AND a token minted. */
  ready: boolean;
  tone: DocusignTestTone;
  /** Short headline for the result line. */
  label: string;
  /** One sentence of operator guidance for the next step. */
  detail: string;
  /** Configured environment ("demo" | "production"), when the backend reported it. */
  environment: string | null;
  /** Present only for `consent_required` — the admin-consent URL to visit. */
  consentUrl: string | null;
}

/** The subset of the 200 status body this surface reads. */
export interface DocusignStatusBody {
  configured?: boolean;
  environment?: string | null;
  consentGranted?: boolean;
  consentUrl?: string | null;
  detail?: string | null;
}

/**
 * The probe outcome the server action hands in: either a 200 body, or the
 * classified failure from the call-guard seam (`kind` + optional HTTP `status`).
 */
export type DocusignProbe =
  | { ok: true; body: DocusignStatusBody }
  | { ok: false; kind: "not_configured" | "rejected" | "unreachable"; status?: number };

export function docusignTestResult(probe: DocusignProbe): DocusignTestResult {
  if (probe.ok) {
    const environment = probe.body.environment ?? null;
    if (probe.body.consentGranted) {
      return {
        state: "consent_granted",
        ready: true,
        tone: "green",
        label: "Connected — consent granted",
        detail: `DocuSign minted a token successfully${
          environment ? ` (${environment})` : ""
        }. Ready to send envelopes.`,
        environment,
        consentUrl: null,
      };
    }
    return {
      state: "consent_required",
      ready: false,
      tone: "amber",
      label: "Configured — admin consent pending",
      detail:
        "Secrets are stored but the one-time JWT admin consent hasn’t been granted for this " +
        "environment. Click “Grant admin consent”, then test again.",
      environment,
      consentUrl: probe.body.consentUrl ?? null,
    };
  }

  if (probe.kind === "not_configured") {
    return {
      state: "not_configured",
      ready: false,
      tone: "dim",
      label: "Not configured",
      detail:
        "DocuSign isn’t wired in this environment yet — store the integration key, RSA private " +
        "key, and impersonated user above (account id + environment are set in App Settings).",
      environment: null,
      consentUrl: null,
    };
  }

  if (probe.kind === "rejected" && probe.status === 502) {
    return {
      state: "mint_failed",
      ready: false,
      tone: "red",
      label: "Token mint failed",
      detail:
        "DocuSign is configured but minting a token failed (502). Check the RSA keypair, " +
        "integration key, and impersonated user, then test again.",
      environment: null,
      consentUrl: null,
    };
  }

  // 401/403 — caller-identity / allowlist guidance
  if (
    probe.kind === "rejected" &&
    probe.status !== undefined &&
    (probe.status === 401 || probe.status === 403)
  ) {
    return {
      state: "rejected",
      ready: false,
      tone: "red",
      label: "Backend rejected the check",
      detail: `The backend refused the status check (HTTP ${probe.status}) — usually the web app's caller identity isn't allow-listed yet (ADR-0035).`,
      environment: null,
      consentUrl: null,
    };
  }

  // 5xx — backend error guidance
  if (
    probe.kind === "rejected" &&
    probe.status !== undefined &&
    probe.status >= 500 &&
    probe.status < 600
  ) {
    return {
      state: "rejected",
      ready: false,
      tone: "red",
      label: "Backend errored",
      detail: `The backend errored (HTTP ${probe.status}) — likely a malformed or unreadable DocuSign secret in Key Vault; check the backend logs (BE #196).`,
      environment: null,
      consentUrl: null,
    };
  }

  if (probe.kind === "rejected") {
    return {
      state: "rejected",
      ready: false,
      tone: "red",
      label: "Backend rejected the check",
      detail: probe.status
        ? `The backend refused the status check (HTTP ${probe.status}).`
        : "The backend refused the status check — usually the web app's caller identity isn't allow-listed yet (ADR-0035).",
      environment: null,
      consentUrl: null,
    };
  }

  return {
    state: "unreachable",
    ready: false,
    tone: "red",
    label: "Backend unreachable",
    detail: "Couldn’t reach the integration backend (network or timeout). Try again shortly.",
    environment: null,
    consentUrl: null,
  };
}
