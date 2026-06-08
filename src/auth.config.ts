/**
 * Edge-safe Auth.js base configuration.
 *
 * `middleware.ts` runs on the Edge runtime, so anything it imports must be
 * edge-compatible. This module deliberately contains NO Node-only code (no
 * node:fs, node-forge, jose, or the certificate assertion). It holds only the
 * session gate and provider declaration, which is all the middleware needs to
 * decide authenticated-or-not.
 *
 * The full Node config (with certificate client assertion) lives in `auth.ts`
 * and is used by the route handlers, which run on the Node runtime.
 */
import type { NextAuthConfig } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { entraEnv } from "@/lib/env";
import { rolesFromClaims, type RoleClaims } from "@/lib/auth/claims";
import { type AppRole, DEFAULT_ROLE, canSeeSettings } from "@/lib/auth/roles";

export const authConfig: NextAuthConfig = {
  // Required behind the App Service reverse proxy (ADR-0006).
  trustHost: true,
  // Custom pages: /login offers Entra SSO (primary); /break-glass is the
  // emergency bypass (ADR-0008). The break-glass credentials provider is
  // declared only in the Node config (auth.ts) to keep node:crypto out of edge.
  pages: {
    signIn: "/login",
  },
  providers: [
    MicrosoftEntraID({
      clientId: entraEnv.clientId,
      issuer: entraEnv.issuer,
      // Placeholder; the Node config in auth.ts replaces client auth with a
      // certificate assertion. Middleware never performs the token exchange.
      clientSecret: "unused-certificate-auth",
      authorization: {
        params: { scope: "openid profile email offline_access" },
      },
    }),
  ],
  callbacks: {
    /**
     * Derive application roles from the Entra token on first sign-in and carry
     * them in the JWT (ADR-0030). The JWT is what the edge middleware decodes,
     * so roles must live here — both `claims.ts` and `roles.ts` are edge-pure.
     * Break-glass (Credentials, no `profile`) is elevated to admin in auth.ts.
     */
    jwt({ token, profile, account }) {
      if (profile) {
        token.roles = rolesFromClaims(profile as RoleClaims);
        const p = profile as { oid?: string; sub?: string };
        token.oid = p.oid ?? p.sub ?? token.sub;
      }
      // Credentials (break-glass) sign-in: auth.ts sets the user role; default
      // anything still unset to the most-restricted role.
      if (!token.roles) {
        token.roles =
          account?.provider === "break-glass" ? ["admin"] : [DEFAULT_ROLE];
      }
      return token;
    },
    /** Surface the JWT roles on the session for server + client consumers. */
    session({ session, token }) {
      session.user.roles = (token.roles as AppRole[] | undefined) ?? [DEFAULT_ROLE];
      return session;
    },
    /**
     * Sign-in gate (CLAUDE.md §7.3): only authenticated users reach app routes.
     * Additionally enforces the admin-only areas (Settings + Security) at the
     * edge so a non-admin cannot reach them even by typing the URL.
     */
    authorized({ auth, request }) {
      if (!auth?.user) return false;
      const path = request.nextUrl.pathname;
      const roles =
        (auth.user as { roles?: AppRole[] }).roles ?? [DEFAULT_ROLE];
      if (
        (path.startsWith("/settings") || path.startsWith("/security")) &&
        !canSeeSettings(roles)
      ) {
        return Response.redirect(new URL("/", request.nextUrl));
      }
      return true;
    },
  },
};

export default authConfig;
