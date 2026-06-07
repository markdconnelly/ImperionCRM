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

const REQUIRED_ENTRA_VARS = [
  "AZURE_AD_TENANT_ID",
  "AZURE_AD_CLIENT_ID",
  "AZURE_AD_CERT_PFX_PATH",
  "AZURE_AD_CERT_PFX_PASSWORD",
] as const;

/**
 * Enforce that all Entra variables are present. Call at runtime entry points
 * (e.g. building the client assertion), NOT at module load — see file header.
 */
export function assertEntraEnv(): void {
  const missing = REQUIRED_ENTRA_VARS.filter((name) => !read(name));
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Set them in .env.local (local) or App Service configuration (deployed).`,
    );
  }
}
