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

export const authConfig: NextAuthConfig = {
  // Required behind the App Service reverse proxy (ADR-0006).
  trustHost: true,
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
     * Sign-in gate (CLAUDE.md §7.3): only authenticated users reach app routes.
     * Returning false redirects to the Entra sign-in.
     */
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
};

export default authConfig;
