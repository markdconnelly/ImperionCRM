/**
 * Sign-in gate (CLAUDE.md §7.3). Every app route requires an authenticated
 * Entra session before any data view renders. The `authorized` callback in
 * src/auth.ts decides; unauthenticated requests are redirected to Entra sign-in.
 */
export { auth as middleware } from "@/auth";

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
