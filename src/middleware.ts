/**
 * Sign-in gate (CLAUDE.md §7.3). Every app route requires an authenticated
 * Entra session before any data view renders.
 *
 * Runs on the Edge runtime, so it uses the edge-safe base config (auth.config.ts)
 * — NOT auth.ts, which pulls in Node-only certificate code. The `authorized`
 * callback decides; unauthenticated requests are redirected to Entra sign-in.
 */
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  /**
   * Run on everything except Next internals, the auth endpoints themselves,
   * and static assets. Keep `/api/auth` OUT of the matcher or the sign-in
   * flow would gate itself.
   */
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
