/**
 * Shared GDAP admin-consent constants + callback outcome rule (ADR-0036). Kept out of
 * the Settings `"use server"` actions module because those files may only export async
 * functions.
 */

/** Cookie that proves a GDAP admin-consent flow was started from this app (CSRF guard). */
export const GDAP_CONSENT_COOKIE = "gdap_consent_pending";

export interface GdapOutcome {
  /** Status written to the company `gdap` connection row. */
  status: "active" | "error";
  /** `?gdap=` result the Settings page renders. */
  result: "denied" | "granted" | "tenant_mismatch" | "unknown";
}

/**
 * Decide the admin-consent callback outcome from what Microsoft echoed back.
 *
 * Tenant pinning fails CLOSED: when `expectedTenant` (GDAP_EXPECTED_TENANT) is set, the
 * callback must echo exactly that tenant — a missing `tenant` parameter is a mismatch,
 * not a pass. Consent is only `active` on an explicit `admin_consent=True`.
 */
export function gdapConsentOutcome(params: {
  error: string | null;
  adminConsent: string | null;
  tenant: string | null;
  expectedTenant: string | undefined;
}): GdapOutcome {
  if (params.error) {
    return { status: "error", result: "denied" };
  }
  if (params.adminConsent?.toLowerCase() === "true") {
    if (params.expectedTenant && params.tenant !== params.expectedTenant) {
      return { status: "error", result: "tenant_mismatch" };
    }
    return { status: "active", result: "granted" };
  }
  // Neither success nor an explicit error — treat as inconclusive.
  return { status: "error", result: "unknown" };
}
