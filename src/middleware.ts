/**
 * Sign-in gate (CLAUDE.md §7.3). Every app route requires an authenticated
 * session before any data view renders. Unauthenticated requests are redirected
 * to /login (Entra SSO); /break-glass is the emergency bypass (ADR-0008).
 *
 * Runs on the Edge runtime, so it uses the edge-safe base config (auth.config.ts)
 * — NOT auth.ts, which pulls in Node-only certificate/crypto code.
 */
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  /**
   * Run on everything except Next internals, the auth endpoints/pages, and
   * static assets. `/api/auth`, `/login`, and `/break-glass` MUST be excluded
   * or the sign-in flow would gate (and redirect-loop) itself. `/story` is the
   * deliberately public build-story page (#248) — static marketing content
   * under public/story, no app data; the `(?:$|/)` anchor (non-capturing —
   * Next matchers reject capturing groups) keeps the exclusion from leaking
   * onto other routes that merely start with "story". `/opt-in` is the public
   * SMS/email opt-in & consent capture page (#217) — its submit writes only an
   * append-only bronze `lead_capture_event` (ADR-0024), never the consent
   * ledger; same anchor so it cannot leak onto sibling routes. `/legal` is the
   * public legal surface (#934/#497) — the EULA + Privacy Policy must be reachable
   * without an Entra login (Intuit's QuickBooks production-app review fetches the
   * URLs anonymously); same `(?:$|/)` anchor so it cannot leak onto sibling routes.
   * `/jarvis` is **TEMPORARILY public for testing** (#1123, #1118) — it serves no data
   * unauthenticated (`resolveActingUser` returns no_session → empty rail, chat replies
   * "sign in again"; it renders the shell only). **MUST be re-gated before v1.0.0 go-live
   * (#1123)** — remove the `jarvis(?:$|/)` token below to restore the Entra gate; same
   * `(?:$|/)` anchor so it cannot leak onto sibling routes.
   */
  matcher: [
    "/((?!api/auth|login|break-glass|story(?:$|/)|opt-in(?:$|/)|legal(?:$|/)|jarvis(?:$|/)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
