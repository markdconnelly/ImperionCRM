/**
 * Canonical Key Vault secret-name grammar for connection credentials (ADR-0122, epic #1256).
 *
 * ONE source of truth for what a connection's `keyvault_secret_ref` is named, so the GUI,
 * the backend store, and live seeding never drift. The grammar is **provider-always-3rd**:
 *
 *   conn-<scope>-<provider>[-<discriminator>]
 *     scope         = company | client | user
 *     provider      = connection_provider enum value (lowercase alphanumerics)
 *     discriminator = client → tenantId|consoleId|accountSlug ; user → userId ; company → omitted
 *
 * Examples: `conn-company-autotask`, `conn-client-m365-<tenantId>`,
 * `conn-client-unifi-<consoleId>`. The DB and GUI only ever hold this NAME — never the
 * secret value (CLAUDE.md §5). The backend's `companySecretName()` produces the same string;
 * this helper is the GUI-side mirror so a pending/intent row records the *real* future name
 * instead of a placeholder. Replaces the legacy non-conforming `kv://imperion/conn/*` form.
 *
 * Key Vault object names allow only alphanumerics and dashes, max 127 chars — the grammar is
 * built to satisfy that. Multi-secret providers (e.g. DocuSign's three JWT secrets) suffix a
 * role discriminator on a company name (`conn-company-docusign-integration-key`); the
 * connection row's logical ref is the bare `conn-company-docusign`.
 */

/** A connection's blast radius — mirrors the `connection_scope` enum (ADR-0103/ADR-0129). */
export type ConnectionScope = "company" | "client" | "user" | "platform";

/** Azure Key Vault object-name charset + length (alphanumerics and dashes, ≤127). */
const KV_NAME_RE = /^[0-9a-zA-Z-]{1,127}$/;
/** A provider segment: lowercase alphanumerics (every `connection_provider` enum value). */
const PROVIDER_RE = /^[0-9a-z]+$/;
/** A discriminator segment: alphanumerics + dashes (tenant GUIDs, console ids, slugs). */
const DISCRIMINATOR_RE = /^[0-9a-zA-Z-]+$/;

/**
 * Build the canonical Key Vault secret name for a connection. Throws on input that would
 * produce an invalid Key Vault name — callers pass `connection_provider` enum values and
 * validated ids, so a throw means a real bug, never user input reaching here unsanitized.
 */
export function connectionSecretName(input: {
  scope: ConnectionScope;
  provider: string;
  discriminator?: string | null;
}): string {
  const { scope, provider, discriminator } = input;
  if (!PROVIDER_RE.test(provider)) {
    throw new Error(`connectionSecretName: invalid provider segment "${provider}"`);
  }
  if (discriminator != null && discriminator !== "" && !DISCRIMINATOR_RE.test(discriminator)) {
    throw new Error(`connectionSecretName: invalid discriminator "${discriminator}"`);
  }
  const parts = ["conn", scope, provider];
  if (discriminator) parts.push(discriminator);
  const name = parts.join("-");
  if (!KV_NAME_RE.test(name)) {
    throw new Error(`connectionSecretName: produced an invalid Key Vault name "${name}"`);
  }
  return name;
}

/**
 * The canonical company-scope secret name — `conn-company-<provider>`. The single helper the
 * Settings credential cards use for the intended/pending ref before the backend returns the
 * real one (which is identical by construction).
 */
export function companySecretName(provider: string): string {
  return connectionSecretName({ scope: "company", provider });
}

/** True when a stored ref already follows the canonical grammar (used to flag legacy refs). */
export function isCanonicalSecretRef(ref: string | null | undefined): boolean {
  if (!ref) return false;
  return /^conn-(company|client|user|platform)-[0-9a-z]+(-[0-9a-zA-Z-]+)?$/.test(ref);
}
