/**
 * QuickBooks Online OAuth connect callback (#528, backend #117 / ADR-0048).
 *
 * Intuit redirects the admin here after consent with `?code&realmId&state` (or `error`).
 * This route is the registered `QBO_REDIRECT_URI`. It runs server-side, forwards the
 * code+realmId+state to the backend (which validates the one-time Key Vault `state`,
 * exchanges the code, and writes the token set to `conn-company-qbo`), then flips the
 * company `qbo` connection row to `active` and bounces back to Settings.
 *
 * Security (CLAUDE.md §5 — Zero Trust):
 *  - Requires an authenticated session with `settings:write` — only an admin may finalize
 *    a company-wide connection.
 *  - The browser never talks to the backend; the exchange is proxied server-side
 *    (managed-identity auth, ADR-0028/0035).
 *  - CSRF is the backend's one-time, expiring `state` (parked in Key Vault by `start`) —
 *    no token/secret/realm is ever handled in this route.
 */
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { can } from "@/lib/auth/policy";
import { DEFAULT_ROLE } from "@/lib/auth/roles";
import { COMPANY_PROVIDERS } from "@/lib/integrations/company-providers";
import { connectionsService } from "@/lib/services";
import { classifyServiceError } from "@/lib/services/call-guard";
import { ServiceCallError } from "@/lib/services/external-client";

function settingsRedirect(req: NextRequest, result: string, status?: number): NextResponse {
  // Land on the consolidated Connections page so the QBO connect notice renders (#530/#864).
  const url = new URL("/settings/connections", req.nextUrl.origin);
  url.searchParams.set("qbo", result);
  if (status) url.searchParams.set("qboStatus", String(status));
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
  if (!can(session.user.roles ?? [DEFAULT_ROLE], "settings:write")) {
    return settingsRedirect(req, "forbidden");
  }

  const params = req.nextUrl.searchParams;
  if (params.get("error")) {
    return settingsRedirect(req, "denied"); // admin cancelled consent at Intuit
  }
  const code = params.get("code");
  const realmId = params.get("realmId");
  const state = params.get("state");
  if (!code || !realmId || !state) {
    return settingsRedirect(req, "invalid");
  }

  let status = "active";
  let result = "ok";
  let httpStatus: number | undefined;
  try {
    await connectionsService.completeQboConnect({ code, realmId, state });
  } catch (err) {
    // Backend not wired yet → record pending and degrade; the backend answered non-2xx
    // (bad/expired state, exchange failure) → exchange_failed; no usable answer → error.
    // Never surface token material; log the real cause server-side for triage (#530).
    const kind = classifyServiceError(err);
    if (kind === "not_configured") {
      status = "pending";
      result = "stubbed";
    } else {
      status = "error";
      result = kind === "rejected" ? "exchange_failed" : "error";
      if (err instanceof ServiceCallError) httpStatus = err.status;
      console.error("qbo/callback: completeQboConnect failed:", err);
    }
  }

  const provider = COMPANY_PROVIDERS.find((p) => p.key === "qbo");
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

  return settingsRedirect(req, result, httpStatus);
}
