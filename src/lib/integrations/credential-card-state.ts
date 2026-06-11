/**
 * Display state for a company-credential card (ADR-0036; #176).
 *
 * A connection row alone does not mean a credential is actually stored: stub-era and
 * failed saves leave rows with status "pending" (backend wasn't wired) or "error"
 * (the backend call failed), and disconnect leaves "revoked" after Key Vault custody
 * is deleted. Treating any row as "configured" hid the entry form behind a
 * "Rotate credential" button with no way for the operator to see why nothing worked.
 *
 * Only statuses that follow a successful Key Vault write count as stored; everything
 * else opens the form by default and labels the card honestly.
 */

export interface ConnectionLike {
  status: string;
}

export interface CredentialCardState {
  /** A credential is believed to be held in Key Vault (a save succeeded). */
  stored: boolean;
  /** Render the field form expanded on first paint. */
  defaultOpen: boolean;
  /** Subtitle under the provider name. */
  statusLabel: "Configured" | "Needs attention" | "Not configured";
}

/** Statuses that only exist after the backend successfully wrote the secret. */
const STORED_STATUSES = new Set(["active", "expired"]);

export function credentialCardState(connection: ConnectionLike | null): CredentialCardState {
  if (!connection) {
    return { stored: false, defaultOpen: true, statusLabel: "Not configured" };
  }
  if (STORED_STATUSES.has(connection.status)) {
    return { stored: true, defaultOpen: false, statusLabel: "Configured" };
  }
  return {
    stored: false,
    defaultOpen: true,
    statusLabel: connection.status === "error" ? "Needs attention" : "Not configured",
  };
}
