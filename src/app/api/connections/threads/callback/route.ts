/**
 * Threads OAuth connect callback (#1500, backend BE #445 / ADR-0125 D1).
 *
 * The Instagram-anchored Threads login redirects the admin here after consent with
 * `?code&state` (or `error`). This route is the registered Threads OAuth redirect URI. It
 * runs server-side, forwards the code+state to the backend (which validates the one-time Key
 * Vault `state`, exchanges the code for a short-lived token, upgrades it to the long-lived
 * 60-day Threads user token, and writes it to `conn-company-threads`), then flips the company
 * `threads` connection row to `active` and bounces back to Settings.
 *
 * Threads is graph.threads.net's OWN OAuth, SEPARATE from the Meta (graph.facebook.com)
 * connection — no token or code is shared. This route is DISTINCT from the per-user OAuth
 * callback `/api/connections/[provider]/callback`, because Threads is company-scoped (like QBO).
 *
 * Security (CLAUDE.md §5 — Zero Trust):
 *  - Requires an authenticated session with `settings:write` — only an admin may finalize
 *    a company-wide connection.
 *  - The browser never talks to the backend; the client_secret-bearing exchange is proxied
 *    server-side (managed-identity auth, ADR-0028/0035). No token/secret is handled here.
 *  - CSRF is the backend's one-time, expiring `state` (parked in Key Vault by `start`).
 */
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { can } from "@/lib/auth/policy";
import { DEFAULT_ROLE } from "@/lib/auth/roles";
import { COMPANY_PROVIDERS } from "@/lib/integrations/company-providers";
import { companySecretName } from "@/lib/integrations/kv-secret-name";
import { connectionsService } from "@/lib/services";
import { classifyServiceError } from "@/lib/services/call-guard";
import { ServiceCallError } from "@/lib/services/external-client";
import { requestOrigin } from "@/lib/integrations/request-origin";

function settingsRedirect(req: NextRequest, result: string, status?: number): NextResponse {
  // Land on the consolidated Connections page so the Threads connect notice renders.
  // Resolve the public origin from the proxy headers, not the internal bind host (#931).
  const url = new URL("/settings/connections", requestOrigin(req));
  url.searchParams.set("threads", result);
  if (status) url.searchParams.set("threadsStatus", String(status));
  return NextResponse.redirect(url);
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", requestOrigin(req)));
  }
  if (!can(session.user.roles ?? [DEFAULT_ROLE], "settings:write")) {
    return settingsRedirect(req, "forbidden");
  }

  const params = req.nextUrl.searchParams;
  if (params.get("error")) {
    return settingsRedirect(req, "denied"); // admin cancelled consent at the Threads login
  }
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) {
    return settingsRedirect(req, "invalid");
  }

  let status = "active";
  let result = "ok";
  let httpStatus: number | undefined;
  try {
    await connectionsService.completeThreadsConnect({ code, state });
  } catch (err) {
    // Backend not wired yet → record pending and degrade; the backend answered non-2xx
    // (400 bad/expired state → invalid; 502 exchange failure → exchange_failed); no usable
    // answer → error. Never surface token material; log the real cause server-side for triage.
    const kind = classifyServiceError(err);
    if (kind === "not_configured") {
      status = "pending";
      result = "stubbed";
    } else {
      status = "error";
      if (err instanceof ServiceCallError) {
        httpStatus = err.status;
        // 400 = bad/expired one-time state (CSRF nonce); 502 = Threads refused the exchange.
        result = err.status === 400 ? "invalid" : "exchange_failed";
      } else {
        result = kind === "rejected" ? "exchange_failed" : "error";
      }
      console.error("threads/callback: completeThreadsConnect failed:", err);
    }
  }

  const provider = COMPANY_PROVIDERS.find((p) => p.key === "threads");
  if (provider) {
    const { connections } = getRepositories();
    await connections.saveCompanyCredential({
      provider: provider.key,
      displayName: `Imperion ${provider.label}`,
      scopes: provider.scopes,
      // Canonical name; the real OAuth token secret is custodied by the backend under the
      // same `conn-company-threads` name (ADR-0122 / ADR-0125 D1).
      keyvaultSecretRef: companySecretName(provider.key),
      status,
    });
  }

  return settingsRedirect(req, result, httpStatus);
}

// Backend exposes GET|POST on its callback; the provider redirect is a GET, but accept POST too
// so a form_post response_mode works without a second route (mirrors the backend contract).
export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}
