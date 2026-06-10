/**
 * Microsoft GDAP admin-consent callback (ADR-0036).
 *
 * Microsoft redirects the partner admin here after the admin-consent screen. On
 * success the admin-consent endpoint returns `admin_consent=True&tenant=<id>&state=…`;
 * on failure it returns `error` + `error_description`. We flip the company `gdap`
 * connection row to `active` (or `error`) and bounce back to Settings.
 *
 * Security (CLAUDE.md §5 — Zero Trust):
 *  - Requires an authenticated session — only a signed-in operator can complete this.
 *  - Requires the `gdap_consent_pending` cookie set by `grantGdapAction`, proving the
 *    flow started from this app in this browser (CSRF guard); the cookie is cleared
 *    on use.
 *  - Matches the `state` Microsoft echoes back against the cookie value (the backend's
 *    unguessable nonce from `POST /api/gdap/consent`), rejecting any mismatch.
 *  - Optionally pins the returning `tenant` to `GDAP_EXPECTED_TENANT` when set.
 *  - No secret is handled here — the GDAP relationship lives in Microsoft; this only
 *    records that consent was granted. The token/secret path stays in the backend.
 */
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { can } from "@/lib/auth/policy";
import { DEFAULT_ROLE } from "@/lib/auth/roles";
import { COMPANY_PROVIDERS } from "@/lib/integrations/company-providers";
import { GDAP_CONSENT_COOKIE } from "@/lib/integrations/gdap";

function settingsRedirect(req: NextRequest, result: string): NextResponse {
  const url = new URL("/settings", req.nextUrl.origin);
  url.searchParams.set("gdap", result);
  const res = NextResponse.redirect(url);
  res.cookies.delete(GDAP_CONSENT_COOKIE);
  return res;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // 1. Must be a signed-in operator with settings-write authority (ADR-0045) — GDAP
  //    is a company-wide credential, so only an admin may finalize the relationship.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
  if (!can(session.user.roles ?? [DEFAULT_ROLE], "settings:write")) {
    return settingsRedirect(req, "forbidden");
  }

  // 2. Must have initiated the flow from this app, and the state Microsoft echoes back
  //    must match the backend nonce we stored (CSRF guard).
  const started = (await cookies()).get(GDAP_CONSENT_COOKIE)?.value;
  const params = req.nextUrl.searchParams;
  const returnedState = params.get("state");
  if (!started || !returnedState || returnedState !== started) {
    return settingsRedirect(req, "invalid");
  }

  const error = params.get("error");
  const adminConsent = params.get("admin_consent");
  const tenant = params.get("tenant");

  // 3. Decide the outcome.
  let status: "active" | "error";
  let result: string;
  const expectedTenant = process.env.GDAP_EXPECTED_TENANT?.trim();
  if (error) {
    status = "error";
    result = "denied";
  } else if (adminConsent?.toLowerCase() === "true") {
    if (expectedTenant && tenant && tenant !== expectedTenant) {
      status = "error";
      result = "tenant_mismatch";
    } else {
      status = "active";
      result = "granted";
    }
  } else {
    // Neither success nor an explicit error — treat as inconclusive.
    status = "error";
    result = "unknown";
  }

  // 4. Record the outcome on the company gdap row (upsert by provider).
  const provider = COMPANY_PROVIDERS.find((p) => p.key === "gdap");
  if (provider) {
    const { connections } = getRepositories();
    await connections.saveCompanyCredential({
      provider: provider.key,
      displayName: `Imperion ${provider.label}`,
      scopes: provider.scopes,
      keyvaultSecretRef: `kv://imperion/conn/${provider.key}`,
      status,
    });
  }

  return settingsRedirect(req, result);
}
