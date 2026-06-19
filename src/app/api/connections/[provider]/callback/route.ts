/**
 * Per-user OAuth provider callback (ADR-0024, backend ADR-0038).
 *
 * The provider (Microsoft/Google/LinkedIn/Facebook) redirects the employee's browser
 * here after consent — the backend builds its `redirect_uri` as
 * `<OAUTH_REDIRECT_BASE_URL>/<provider>/callback`, which must point at THIS route
 * (`https://imperioncrm.azurewebsites.net/api/connections`). The route forwards
 * `code` + `state` to the backend server-side via the services layer
 * (managed-identity bearer — the browser never talks to the backend, and no token
 * material ever passes through here: the backend exchanges the code and writes the
 * token set straight to Key Vault). It then bounces back to Profile → Your
 * connections (#796) with a `connect=<result>` flag the page renders as a notice.
 *
 * Security (CLAUDE.md §5 — Zero Trust):
 *  - Requires an authenticated session with `settings:write` (same capability as
 *    `connectAction`, ADR-0045) — an anonymous hit can't drive the exchange.
 *  - CSRF/replay is enforced by the BACKEND's one-time Key-Vault-parked `state`
 *    (delete-before-honor, 15-min TTL — backend ADR-0038); an invalid, expired, or
 *    replayed state comes back 400 and is surfaced as `invalid_state`.
 *  - A provider `error=` (user cancelled consent) short-circuits cleanly — nothing
 *    is forwarded and the unconsumed state simply expires.
 */
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { can } from "@/lib/auth/policy";
import { DEFAULT_ROLE } from "@/lib/auth/roles";
import {
  classifyOAuthCallback,
  isPersonalOAuthProvider,
  profileConnectionsPath,
  type ConnectResult,
} from "@/lib/integrations/personal-oauth";
import { connectionsService } from "@/lib/services";
import { ServiceCallError, ServiceNotConfiguredError } from "@/lib/services/external-client";
import { requestOrigin } from "@/lib/integrations/request-origin";

function profileRedirect(
  req: NextRequest,
  result: ConnectResult,
  provider?: string,
): NextResponse {
  // Resolve the public origin from the proxy headers, not the internal bind host (#931).
  return NextResponse.redirect(
    new URL(profileConnectionsPath(result, provider), requestOrigin(req)),
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const { provider } = await params;
  if (!isPersonalOAuthProvider(provider)) return profileRedirect(req, "error");

  // 1. Only a signed-in employee with settings-write authority may complete a
  //    connect (the same guard connectAction enforces, ADR-0045).
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", requestOrigin(req)));
  }
  if (!can(session.user.roles ?? [DEFAULT_ROLE], "settings:write")) {
    return profileRedirect(req, "forbidden", provider);
  }

  // 2. Classify what the provider sent back. error= → the user cancelled; the
  //    backend's one-time state stays unconsumed and expires on its own.
  const classified = classifyOAuthCallback(req.nextUrl.searchParams);
  if (classified.kind === "cancelled") return profileRedirect(req, "cancelled", provider);
  if (classified.kind === "invalid") return profileRedirect(req, "invalid_state", provider);

  // 3. Forward code+state to the backend, which consumes the one-time state,
  //    exchanges the code, custodies the tokens in Key Vault, and upserts the
  //    connection row (status 'active'). Map its outcomes onto notice flags.
  let result: ConnectResult;
  try {
    await connectionsService.completeOAuthCallback(provider, {
      code: classified.code,
      state: classified.state,
    });
    result = "ok";
  } catch (err) {
    if (err instanceof ServiceNotConfiguredError) {
      result = "not_configured";
    } else if (err instanceof ServiceCallError) {
      // Backend contract: 501 unconfigured · 400 bad/expired state · 502 exchange failed.
      result =
        err.status === 501
          ? "not_configured"
          : err.status === 400
            ? "invalid_state"
            : err.status === 502
              ? "exchange_failed"
              : "error";
      console.error(`oauth callback (${provider}) backend returned ${err.status}:`, err.message);
    } else {
      result = "error";
      console.error(`oauth callback (${provider}) failed:`, err);
    }
  }

  // The backend wrote/updated the connection row — make Profile re-read it.
  revalidatePath("/profile");
  return profileRedirect(req, result, provider);
}
