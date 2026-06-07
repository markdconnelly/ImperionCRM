/**
 * Auth.js v5 configuration — Microsoft Entra ID as the sole identity provider
 * (ADR-0002), authenticated with a certificate client assertion rather than a
 * client secret (ADR-0005).
 *
 * Auth.js's Entra provider authenticates the token request with a client secret
 * by default. There is no shared secret here, so we intercept the provider's
 * token request via `customFetch` and swap in a freshly-signed `client_assertion`
 * (private_key_jwt). The assertion carries the `x5t` header Entra needs to match
 * our registered certificate (see lib/auth/client-assertion.ts).
 *
 * ⚠️ VERIFICATION PENDING: this file could not be type-checked or run while the
 * dev host had Node blocked from the network (no `node_modules`). The crypto in
 * client-assertion.ts follows Microsoft's spec exactly; the `customFetch` glue
 * below is the part to confirm against the installed Auth.js version before merge
 * (token-request body shape and the customFetch signature can shift between
 * beta releases). Do NOT merge to main until `npm run typecheck`/`build` and a
 * real sign-in both pass.
 */
import NextAuth, { customFetch } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
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
  const urlString =
    input instanceof Request ? input.url : input.toString();

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
  // Required behind the App Service reverse proxy (ADR-0006).
  trustHost: true,
  providers: [
    MicrosoftEntraID({
      clientId: entraEnv.clientId,
      issuer: entraEnv.issuer,
      // Auth.js requires a value here; it is overwritten by the assertion in
      // entraFetch and never sent to Entra.
      clientSecret: "unused-certificate-auth",
      authorization: { params: { scope: "openid profile email offline_access" } },
      [customFetch]: entraFetch,
    }),
  ],
  callbacks: {
    /**
     * Middleware gate: only authenticated users may reach app routes.
     * Returning false triggers a redirect to the Entra sign-in.
     */
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
});
