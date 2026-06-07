/**
 * Typed, validated access to server-side environment variables.
 *
 * Security (CLAUDE.md §5): secrets are never imported from anywhere but the
 * process environment. Locally they live in the gitignored `.env.local`; in
 * Azure they come from App Service settings / Key Vault references. This module
 * is server-only — never import it into a client component.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local (local) or App Service configuration (deployed).`,
    );
  }
  return value;
}

/**
 * Entra ID (sole IdP per ADR-0002). Certificate-based client authentication —
 * no client secret (ADR-0005).
 */
export const entraEnv = {
  get tenantId() {
    return required("AZURE_AD_TENANT_ID");
  },
  get clientId() {
    return required("AZURE_AD_CLIENT_ID");
  },
  get certPfxPath() {
    return required("AZURE_AD_CERT_PFX_PATH");
  },
  get certPfxPassword() {
    return required("AZURE_AD_CERT_PFX_PASSWORD");
  },
  /** OIDC issuer / authority for the tenant. */
  get issuer() {
    return `https://login.microsoftonline.com/${required("AZURE_AD_TENANT_ID")}/v2.0`;
  },
  /** v2.0 token endpoint — audience of the client assertion. */
  get tokenEndpoint() {
    return `https://login.microsoftonline.com/${required("AZURE_AD_TENANT_ID")}/oauth2/v2.0/token`;
  },
};
