/**
 * Auth.js v5 — full (Node runtime) configuration. Microsoft Entra ID as sole
 * IdP (ADR-0002), authenticated with a certificate client assertion rather than
 * a client secret (ADR-0005).
 *
 * Extends the edge-safe base (auth.config.ts) and replaces the provider with one
 * whose token request is intercepted by `customFetch` to swap in a freshly
 * signed `client_assertion` (private_key_jwt, carrying the `x5t` header Entra
 * requires — see lib/auth/client-assertion.ts). Used by the route handlers
 * (Node runtime); middleware uses the edge-safe base instead.
 *
 * ⚠️ VERIFICATION PENDING: the `customFetch` glue is the version-sensitive part
 * (token-request body shape + customFetch signature can shift across Auth.js
 * betas). Must pass typecheck/build + a real sign-in before merge to main.
 */
import NextAuth, { customFetch } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import authConfig from "@/auth.config";
import { entraEnv } from "@/lib/env";
import { buildClientAssertion } from "@/lib/auth/client-assertion";

const ASSERTION_TYPE =
  "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";

/**
 * Wrap fetch for the Entra provider. For the token endpoint, replace any
 * client_secret with a signed client assertion; pass everything else through.
 */
async function entraFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const urlString = input instanceof Request ? input.url : input.toString();

  if (urlString.includes("/oauth2/v2.0/token") && init?.body) {
    const params = new URLSearchParams(
      typeof init.body === "string"
        ? init.body
        : (init.body as unknown as Record<string, string>),
    );
    params.delete("client_secret");
    params.set("client_assertion_type", ASSERTION_TYPE);
    params.set("client_assertion", await buildClientAssertion());

    return fetch(urlString, {
      ...init,
      body: params,
      headers: {
        ...(init.headers as Record<string, string>),
        "content-type": "application/x-www-form-urlencoded",
      },
    });
  }

  return fetch(input as RequestInfo, init);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    MicrosoftEntraID({
      clientId: entraEnv.clientId,
      issuer: entraEnv.issuer,
      clientSecret: "unused-certificate-auth",
      authorization: {
        params: { scope: "openid profile email offline_access" },
      },
      [customFetch]: entraFetch,
    }),
  ],
});
