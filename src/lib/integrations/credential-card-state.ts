/**
 * Display state for a company-credential card (ADR-0036; #176; vault-presence #1567).
 *
 * A connection row alone does not mean a credential is actually stored: stub-era and
 * failed saves leave rows with status "pending" (backend wasn't wired) or "error"
 * (the backend call failed), and disconnect leaves "revoked" after Key Vault custody
 * is deleted. Treating any row as "configured" hid the entry form behind a
 * "Rotate credential" button with no way for the operator to see why nothing worked.
 *
 * The "configured" signal is **vault presence** (ADR-0103/ADR-0129: the registry is a
 * secret-custody registry — a credential present in Key Vault under the canonical name
 * IS the credential, so the card must show it configured and NEVER re-prompt a stored
 * value). Vault presence is read from TWO independent signals so neither alone has to be
 * perfect:
 *   - a stored lifecycle status ("active"/"expired" — the backend confirmed a KV write), OR
 *   - a canonical `keyvault_secret_ref` on the row (`conn-<scope>-<provider>…`), which the
 *     save path records up front even when the backend write isn't confirmed yet (the
 *     "pending" path keeps the intended canonical ref — see `saveCredentialAction`). A
 *     non-canonical ref (legacy `kv://imperion/conn/*`) does NOT count — it pointed at no
 *     real secret (epic #1256), so the operator should re-enter under the canonical name.
 *
 * Two statuses always FORCE the form open regardless of any ref, because the operator must
 * act: "error" (a save failed — show why) and "revoked" (custody was deleted on disconnect,
 * so any lingering ref points at nothing). Everything else with a canonical ref is treated
 * as stored: no re-prompt, Rotate only. Validate-before-write happens at write time
 * (ADR-0129 #7), so a stored ref never needs a defensive re-prompt on render.
 */
import { isCanonicalSecretRef } from "@/lib/integrations/kv-secret-name";

export interface ConnectionLike {
  status: string;
  /** Canonical Key Vault secret NAME (`conn-<scope>-<provider>…`) — never a secret value. */
  keyvaultSecretRef?: string | null;
}

export interface CredentialCardState {
  /** A credential is believed to be held in Key Vault (status confirms it OR a canonical ref exists). */
  stored: boolean;
  /** Render the field form expanded on first paint. */
  defaultOpen: boolean;
  /** Subtitle under the provider name. */
  statusLabel: "Configured" | "Needs attention" | "Not configured";
}

/** Statuses that only exist after the backend successfully wrote the secret. */
const STORED_STATUSES = new Set(["active", "expired"]);
/** Statuses that force the entry form open regardless of any secret ref — the operator must act. */
const FORCE_OPEN_STATUSES = new Set(["error", "revoked"]);

export function credentialCardState(connection: ConnectionLike | null): CredentialCardState {
  if (!connection) {
    return { stored: false, defaultOpen: true, statusLabel: "Not configured" };
  }
  // A failed save ("error") or a deleted custody ("revoked") always opens the form — a
  // canonical ref must not mask either. "error" reads as "Needs attention" so the operator
  // sees a problem; "revoked" reads as "Not configured" (it was intentionally removed).
  if (FORCE_OPEN_STATUSES.has(connection.status)) {
    return {
      stored: false,
      defaultOpen: true,
      statusLabel: connection.status === "error" ? "Needs attention" : "Not configured",
    };
  }
  // Vault presence: a confirmed stored status OR a canonical secret ref means the credential
  // is custodied — show it configured, collapse the form (Rotate only), never re-prompt.
  if (STORED_STATUSES.has(connection.status) || isCanonicalSecretRef(connection.keyvaultSecretRef)) {
    return { stored: true, defaultOpen: false, statusLabel: "Configured" };
  }
  // No stored status and no canonical ref (e.g. a bare "pending" row with no/legacy ref).
  return { stored: false, defaultOpen: true, statusLabel: "Not configured" };
}
