/**
 * Inferred connection health (ADR-0122, epic #1256 S2). A connector card shows a
 * color-coded health indicator derived from data we already hold — NOT a live probe (that
 * is the on-demand "Test connection" button). "Inferred" means: do we have a credential,
 * what is the stored lifecycle `status`, and is the last sync fresh relative to the poll
 * cadence. This is the honest "are we actually getting data" signal; it cannot catch a key
 * silently revoked upstream before the next poll — that is what the live probe is for.
 *
 * PURE / edge-safe: no pg, no node:*, no env. Time is injected (`nowMs`) so it is
 * deterministic under test and computed SERVER-SIDE at render (passing a verdict down to a
 * client card avoids a client/server clock hydration mismatch).
 */

/** Health tone → the card's color-coded dot (matches the dark token palette). */
export type HealthTone = "green" | "amber" | "red" | "dim";

export interface HealthVerdict {
  tone: HealthTone;
  /** Short headline, e.g. "Healthy", "Stale", "Error". */
  label: string;
  /** One non-secret sentence of detail for the tooltip. */
  detail: string;
}

/**
 * A sync older than `STALE_CADENCE_MULTIPLE` × the poll cadence counts as stale — one full
 * missed cycle plus grace, so a single slow run does not flap the indicator amber.
 */
const STALE_CADENCE_MULTIPLE = 2;

/** Parse an ISO timestamp to epoch ms, or null when absent/unparseable. */
function parseMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** A coarse human "N minutes/hours/days ago" for the tooltip detail. */
function ago(deltaMs: number): string {
  const min = Math.max(0, Math.round(deltaMs / 60000));
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

/**
 * Compute the inferred health verdict for a connection. `hasCredential` is the gate: with no
 * credential the card is "Not configured" regardless of any stale instance row.
 */
export function inferConnectionHealth(input: {
  hasCredential: boolean;
  status: string | null;
  lastSyncAt: string | null;
  pollIntervalMinutes: number | null;
  nowMs?: number;
}): HealthVerdict {
  const { hasCredential, status, lastSyncAt, pollIntervalMinutes } = input;
  const nowMs = input.nowMs ?? Date.now();

  if (!hasCredential) {
    return { tone: "dim", label: "Not configured", detail: "No credential stored yet." };
  }
  if (status === "error") {
    return { tone: "red", label: "Error", detail: "The last run failed — check the connector." };
  }
  if (status === "revoked") {
    return { tone: "red", label: "Revoked", detail: "The credential was revoked." };
  }
  if (status === "expired") {
    return { tone: "amber", label: "Expired", detail: "The credential expired — rotate it." };
  }
  if (status === "pending") {
    return {
      tone: "amber",
      label: "Pending",
      detail: "Credential saved but not yet active — awaiting the backend / first sync.",
    };
  }

  // status active (or unknown-but-credentialed): freshness decides.
  const cadence = pollIntervalMinutes ?? 0;
  if (cadence <= 0) {
    return {
      tone: "green",
      label: "Connected",
      detail: "On-demand / not polled — no staleness to track.",
    };
  }
  const lastMs = parseMs(lastSyncAt);
  if (lastMs == null) {
    return { tone: "amber", label: "No sync yet", detail: "Connected, but no successful sync yet." };
  }
  const ageMs = Math.max(0, nowMs - lastMs);
  const staleAfterMs = cadence * STALE_CADENCE_MULTIPLE * 60000;
  if (ageMs > staleAfterMs) {
    return { tone: "amber", label: "Stale", detail: `Last sync ${ago(ageMs)}, past the cadence.` };
  }
  return { tone: "green", label: "Healthy", detail: `Last sync ${ago(ageMs)}.` };
}

/** Default pre-lapse warning window for an expiring token (FE #1502 — ≤7 days = amber). */
export const TOKEN_EXPIRY_WARN_DAYS = 7;

/** A coarse human "in N days/hours" for a future expiry. */
function until(deltaMs: number): string {
  const min = Math.max(0, Math.round(deltaMs / 60000));
  if (min < 60) return `in ${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `in ${hr}h`;
  return `in ${Math.round(hr / 24)}d`;
}

/**
 * Inferred lifecycle health for a self-expiring OAuth token (FE #1502, epic #1334, ADR-0102 /
 * ADR-0125). The long-lived Threads user token expires 60 days after issue and must be refreshed
 * by the secret-bearing backend/LocalPipeline job (token ≥24h old) — the browser never holds the
 * token, it only READS the issued/expires timestamps and surfaces a verdict (CLAUDE.md §1/§5).
 *
 * The verdict degrades HONESTLY: until the backend exposes `expiresAt` (its absence is the state
 * today — `connections/threads/status` returns only `{ configured }`) the card shows
 * "Expiry unknown" rather than a false-green. It lights up the moment the backend provides them.
 *
 * PURE / edge-safe: time injected (`nowMs`) for deterministic tests, computed server-side.
 */
export function inferTokenExpiryHealth(input: {
  /** ISO issued-at, or null/absent when the backend does not (yet) expose it. */
  issuedAt: string | null;
  /** ISO expires-at, or null/absent when the backend does not (yet) expose it. */
  expiresAt: string | null;
  /** Pre-lapse warning window in days (default {@link TOKEN_EXPIRY_WARN_DAYS}). */
  warnWithinDays?: number;
  nowMs?: number;
}): HealthVerdict {
  const nowMs = input.nowMs ?? Date.now();
  const warnDays = input.warnWithinDays ?? TOKEN_EXPIRY_WARN_DAYS;
  const expMs = parseMs(input.expiresAt);

  if (expMs == null) {
    return {
      tone: "dim",
      label: "Expiry unknown",
      detail:
        "Token lifetime isn't reported yet — the backend doesn't expose this token's expiry. Reconnect to refresh.",
    };
  }

  const remainingMs = expMs - nowMs;
  if (remainingMs <= 0) {
    return {
      tone: "red",
      label: "Expired",
      detail: `Token expired ${ago(-remainingMs)} — reconnect to mint a fresh one.`,
    };
  }

  const warnMs = warnDays * 24 * 60 * 60000;
  if (remainingMs <= warnMs) {
    return {
      tone: "amber",
      label: "Expiring soon",
      detail: `Token expires ${until(remainingMs)} — reconnect or let the refresh job renew it.`,
    };
  }

  return { tone: "green", label: "Token valid", detail: `Token expires ${until(remainingMs)}.` };
}
