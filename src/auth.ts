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
import { createHash, timingSafeEqual } from "node:crypto";
import NextAuth, { customFetch } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/auth.config";
import { entraEnv, breakGlass } from "@/lib/env";
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

/**
 * Break-glass emergency access (ADR-0008). Constant-time comparison of the
 * submitted password's SHA-256 against the configured hash. Returns false
 * unless break-glass is configured. Never logs the password.
 */
function verifyBreakGlass(username: string, password: string): boolean {
  if (!breakGlass.enabled) return false;
  if (username !== breakGlass.username) return false;
  const got = createHash("sha256").update(password).digest();
  let want: Buffer;
  try {
    want = Buffer.from(breakGlass.passwordHash, "hex");
  } catch {
    return false;
  }
  return got.length === want.length && timingSafeEqual(got, want);
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
    // Emergency SSO bypass — used only via the /break-glass page. Disabled
    // unless BREAKGLASS_* env is set. Every successful use is audit-logged.
    Credentials({
      id: "break-glass",
      name: "Break-glass",
      credentials: {
        username: { label: "Username" },
        password: { label: "Password", type: "password" },
      },
      authorize(creds) {
        const username = String(creds?.username ?? "");
        const password = String(creds?.password ?? "");
        if (!verifyBreakGlass(username, password)) return null;
        console.warn(
          `[SECURITY] Break-glass sign-in used (user=${username}) — Entra SSO bypassed.`,
        );
        return { id: "break-glass", name: "Break-glass Admin", email: username };
      },
    }),
  ],
});
