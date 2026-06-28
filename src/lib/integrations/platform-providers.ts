/**
 * Platform-scope credential providers — the AI provider keys custodied through the connection
 * registry (ADR-0129, epic #1400). A platform credential is a SYSTEM-WIDE infrastructure secret
 * (no account, no client) that the runtime resolves by `(scope='platform', provider)`:
 *
 *   - Voyage `voyage-3-large` @ 1024 — the pinned embedding key (ADR-0041 vector contract).
 *   - Anthropic / Claude — the generation key (ADR-0034/0043 settled AI stack).
 *
 * Custody-ONLY: a platform row carries no sync cadence, no poll, no bronze — it is not a data
 * source. The value is a RAW SCALAR (an API key string), so `auth_method='api_key'` and the card
 * collects ONE write-only field. The secret is custodied in Key Vault by the backend under the
 * canonical name `conn-platform-<provider>` (superseding the ADR-0034 hand-seeded names); the GUI
 * and DB only ever hold that NAME — never the key (CLAUDE.md §5).
 *
 * This is metadata only — no secrets. PURE / edge-safe: no pg, no node:*, no env.
 */
import { connectionSecretName } from "@/lib/integrations/kv-secret-name";

/** A platform AI-provider credential the admin seeds/rotates from the Connections page. */
export interface PlatformProvider {
  /** Connection provider enum value (lowercase). */
  key: string;
  label: string;
  /** Lucide icon name resolved by <Icon />. */
  icon: string;
  /** What this key powers, for the card subtitle. */
  description: string;
  /** Label for the single write-only key field. */
  fieldLabel: string;
  /** Short helper text under the field. */
  help: string;
}

export const PLATFORM_PROVIDERS: PlatformProvider[] = [
  {
    key: "anthropic",
    label: "Anthropic (Claude)",
    icon: "Sparkles",
    description:
      "Claude generation key (Haiku cheap tier / Sonnet premium tier) — the settled generation " +
      "model for every agent and AI-assisted surface (ADR-0034/0043). Custodied as conn-platform-anthropic.",
    fieldLabel: "Anthropic API key",
    help: "Your Anthropic API key (sk-ant-…). Validated with a 1-token Claude ping before it is stored; the value never touches this DB.",
  },
  {
    key: "voyage",
    label: "Voyage (embeddings)",
    icon: "Binary",
    description:
      "Voyage voyage-3-large @ 1024-dim embedding key — the pinned vector contract for recall, " +
      "OS-Brain hydration, and semantic search (ADR-0041). Custodied as conn-platform-voyage. Keystone for embeddings (LP #389).",
    fieldLabel: "Voyage API key",
    help: "Your Voyage AI API key (pa-…). Validated with a tiny embed call before it is stored; the value never touches this DB.",
  },
];

/** The canonical Key Vault secret name for a platform provider (`conn-platform-<provider>`). */
export function platformSecretName(provider: string): string {
  return connectionSecretName({ scope: "platform", provider });
}
