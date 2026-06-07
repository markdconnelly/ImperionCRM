/**
 * Typed access to server-side environment variables.
 *
 * Security (CLAUDE.md §5): secrets are read only from the process environment.
 * Locally they live in the gitignored `.env.local`; in Azure they come from App
 * Service settings / Key Vault references. Server-only — never import into a
 * client component.
 *
 * IMPORTANT: getters must NOT throw at module-load/build time. `next build`
 * (run in CI and in the deploy pipeline, where these vars are absent) imports
 * the auth modules; throwing here would break the build. Instead, getters
 * return "" and `assertEntraEnv()` enforces presence at runtime, where the
 * values are actually used.
 */

function read(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/**
 * Entra ID (sole IdP per ADR-0002). Certificate-based client authentication —
 * no client secret (ADR-0005).
 */
export const entraEnv = {
  get tenantId() {
    return read("AZURE_AD_TENANT_ID");
  },
  get clientId() {
    return read("AZURE_AD_CLIENT_ID");
  },
  get certPfxPath() {
    return read("AZURE_AD_CERT_PFX_PATH");
  },
  /**
   * Base64-encoded PFX, for hosts without a stable file path (e.g. Azure App
   * Service). Takes precedence over certPfxPath when set.
   */
  get certPfxBase64() {
    return read("AZURE_AD_CERT_PFX_BASE64");
  },
  get certPfxPassword() {
    return read("AZURE_AD_CERT_PFX_PASSWORD");
  },
  /** OIDC issuer / authority for the tenant. */
  get issuer() {
    return `https://login.microsoftonline.com/${read("AZURE_AD_TENANT_ID")}/v2.0`;
  },
  /** v2.0 token endpoint — audience of the client assertion. */
  get tokenEndpoint() {
    return `https://login.microsoftonline.com/${read("AZURE_AD_TENANT_ID")}/oauth2/v2.0/token`;
  },
};

/**
 * Break-glass emergency access (ADR-0008). A single non-Entra account that can
 * sign in via a dedicated bypass URL when SSO is unavailable. Disabled unless
 * both vars are set. The password is stored as a SHA-256 hash, never plaintext.
 * Every use is audit-logged in the credentials provider.
 */
export const breakGlass = {
  get enabled() {
    return Boolean(read("BREAKGLASS_USERNAME") && read("BREAKGLASS_PASSWORD_HASH"));
  },
  get username() {
    return read("BREAKGLASS_USERNAME");
  },
  /** Lowercase hex SHA-256 of the break-glass password. */
  get passwordHash() {
    return read("BREAKGLASS_PASSWORD_HASH");
  },
};

/**
 * Enforce that the Entra variables needed to sign a client assertion are
 * present. Call at runtime entry points (e.g. building the assertion), NOT at
 * module load — see file header.
 */
export function assertEntraEnv(): void {
  const missing: string[] = [];
  if (!entraEnv.tenantId) missing.push("AZURE_AD_TENANT_ID");
  if (!entraEnv.clientId) missing.push("AZURE_AD_CLIENT_ID");
  if (!entraEnv.certPfxPassword) missing.push("AZURE_AD_CERT_PFX_PASSWORD");
  if (!entraEnv.certPfxBase64 && !entraEnv.certPfxPath) {
    missing.push("AZURE_AD_CERT_PFX_BASE64 or AZURE_AD_CERT_PFX_PATH");
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Set them in .env.local (local) or App Service configuration (deployed).`,
    );
  }
}
