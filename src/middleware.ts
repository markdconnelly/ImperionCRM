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
   * onto other routes that merely start with "story".
   */
  matcher: [
    "/((?!api/auth|login|break-glass|story(?:$|/)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
