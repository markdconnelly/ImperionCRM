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
 * The `customFetch` glue is version-sensitive. In the Next.js production bundle
 * the `customFetch` symbol is duplicated, so attaching the hook via the symbol
 * alone silently no-ops and the certificate never reaches the token exchange.
 * The provider is therefore wrapped in a Proxy that serves `entraFetch` for any
 * `Symbol("custom-fetch")` regardless of identity — see ADR-0009 and the wrapper
 * below. Verified against the live deployment with a real Entra sign-in.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import NextAuth, { customFetch } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/auth.config";
import { entraEnv, breakGlass } from "@/lib/env";
import { buildClientAssertion } from "@/lib/auth/client-assertion";
import { rolesFromClaims, type RoleClaims } from "@/lib/auth/claims";
import { upsertAppUser } from "@/lib/data/app-user";

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

/**
 * Microsoft Entra ID provider configured for certificate client authentication.
 * The certificate assertion is injected at the token exchange by `entraFetch`,
 * attached via the `customFetch` hook — but see the Proxy wrapper below for why
 * setting `[customFetch]` alone is not sufficient in the bundled build.
 */
const entraProvider = MicrosoftEntraID({
  clientId: entraEnv.clientId,
  issuer: entraEnv.issuer,
  clientSecret: "unused-certificate-auth",
  authorization: {
    params: { scope: "openid profile email offline_access" },
  },
  [customFetch]: entraFetch,
});

/**
 * Bundling-resilient certificate hook (ADR-0009).
 *
 * Auth.js resolves the per-provider custom fetch by reading `provider[S]`, where
 * `S` is @auth/core's internal `Symbol("custom-fetch")`. In the Next.js
 * production bundle that symbol module is duplicated (a second copy lands in the
 * edge/middleware bundle), so `Symbol("custom-fetch")` is evaluated more than
 * once and the symbol we set above — via the `customFetch` re-exported from
 * "next-auth" — is NOT identical to the one @auth/core looks up at runtime. The
 * lookup misses, Auth.js falls back to plain `fetch`, the client assertion is
 * never attached, and the token exchange fails (Entra returns invalid_client →
 * no id_token → jose "JWT must be a string" → the generic "There is a problem
 * with the server configuration" error page). Symptom reproduced and the fix
 * verified against the live deployment.
 *
 * Rather than depend on symbol identity surviving bundling, serve `entraFetch`
 * for ANY symbol whose description is "custom-fetch". Every other property
 * passes straight through, so the provider is otherwise unchanged.
 */
const entraProviderWithCertFetch = new Proxy(entraProvider, {
  get(target, prop, receiver) {
    if (typeof prop === "symbol" && prop.description === "custom-fetch") {
      return entraFetch;
    }
    return Reflect.get(target, prop, receiver);
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  events: {
    /**
     * Mirror the Entra identity + derived roles into `app_user` on sign-in
     * (ADR-0016/0030). Runs only in the Node route handler, keeping `pg` out of
     * the edge bundle. Break-glass has no profile and is skipped.
     */
    async signIn({ profile, user }) {
      if (!profile) return;
      const p = profile as RoleClaims & {
        oid?: string;
        sub?: string;
        email?: string;
        name?: string;
      };
      await upsertAppUser({
        entraObjectId: p.oid ?? p.sub ?? "",
        email: p.email ?? user?.email ?? "",
        displayName: p.name ?? user?.name ?? null,
        roles: rolesFromClaims(p),
      });
    },
  },
  providers: [
    entraProviderWithCertFetch,
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
