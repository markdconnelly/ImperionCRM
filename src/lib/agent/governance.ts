/**
 * Agent-governance settings — the pure shape, defaults, parsers and validators for
 * the v1 action-plane gates stored in `agent_governance_setting` (mig 0163, #1064,
 * ADR-0080/0081): a three-scope kill-switch, the per-client opt-out default, the
 * rate / fan-out / cost-per-run caps, the circuit-breaker error-rate threshold and
 * the approval TTL.
 *
 * This module is deliberately framework-free (no DB, no React, no `server-only`) so
 * the shape, the defensive jsonb parsers, and the clamp/validate rules are unit-tested
 * in isolation. The server-only read lives in `governance-data.ts`; the admin write
 * actions live in `app/(app)/settings/governance/actions.ts`.
 *
 * The seven keys are seeded by the migration and the web role holds SELECT+UPDATE
 * only (no INSERT/DELETE) — the GUI tunes the values, it never adds or removes keys.
 */

/** The seven seeded governance keys (the only rows the GUI ever updates). */
export const GOVERNANCE_KEYS = {
  killswitch: "killswitch.scope",
  optout: "optout.default",
  rate: "caps.rate_per_minute",
  fanout: "caps.fanout_per_run",
  cost: "caps.cost_usd_per_run",
  errorRate: "circuit_breaker.error_rate",
  approvalTtl: "approval.ttl_days",
} as const;

/** Per-client autonomy default for new clients. */
export type OptoutDefault = "opt_in" | "opt_out";

export function isOptoutDefault(v: unknown): v is OptoutDefault {
  return v === "opt_in" || v === "opt_out";
}

/** Three-scope kill-switch state. All off ⇒ normal operation (#269). */
export interface KillSwitchScope {
  /** Master stop — halts every agent action plane-wide. */
  global: boolean;
  /** Agent slugs that are individually stopped (e.g. `felix`, `chase`). */
  per_agent: string[];
  /** Workflow ids/slugs that are individually stopped (e.g. `technician`). */
  per_workflow: string[];
}

/** Everything the governance admin surface renders + where it came from. */
export interface GovernanceState {
  killswitch: KillSwitchScope;
  optoutDefault: OptoutDefault;
  ratePerMinute: number;
  fanoutPerRun: number;
  costUsdPerRun: number;
  circuitBreakerErrorRate: number;
  approvalTtlDays: number;
  /** 'db' = persisted truth; 'mock' = no database (the seeded defaults). */
  source: "db" | "mock";
}

/** The seeded defaults (mirrors the INSERT in migration 0163) — also the mock state. */
export const GOVERNANCE_DEFAULTS: Omit<GovernanceState, "source"> = {
  killswitch: { global: false, per_agent: [], per_workflow: [] },
  optoutDefault: "opt_in",
  ratePerMinute: 60,
  fanoutPerRun: 10,
  costUsdPerRun: 5,
  circuitBreakerErrorRate: 0.25,
  approvalTtlDays: 7,
};

// ── Defensive jsonb parsers (the row.value is untrusted at the type level) ──────────

/** Coerce a stored jsonb value into a kill-switch scope, dropping anything malformed. */
export function parseKillSwitchScope(raw: unknown): KillSwitchScope {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    global: obj.global === true,
    per_agent: toStringList(obj.per_agent),
    per_workflow: toStringList(obj.per_workflow),
  };
}

/** A jsonb number/string → finite number, or the fallback. */
export function parseNumber(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function toStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
}

/**
 * Parse a free-text agent/workflow list (comma- or newline-separated) into a clean,
 * trimmed, de-duplicated, lower-cased slug list. Used by both the kill-switch inputs.
 */
export function parseSlugList(input: string): string[] {
  const seen = new Set<string>();
  for (const part of input.split(/[,\n]/)) {
    const slug = part.trim().toLowerCase();
    if (slug) seen.add(slug);
  }
  return [...seen];
}

// ── Clamp/validate (writes never throw on out-of-range — they clamp to bounds) ──────

/** Clamp to an integer in [min, max]; non-finite input ⇒ fallback. */
export function clampInt(raw: number, min: number, max: number, fallback: number): number {
  const n = Math.round(Number.isFinite(raw) ? raw : fallback);
  return Math.min(max, Math.max(min, n));
}

/** Clamp to a number in [min, max] rounded to `decimals`; non-finite ⇒ fallback. */
export function clampNumber(
  raw: number,
  min: number,
  max: number,
  fallback: number,
  decimals = 2,
): number {
  const n = Number.isFinite(raw) ? raw : fallback;
  const bounded = Math.min(max, Math.max(min, n));
  const f = 10 ** decimals;
  return Math.round(bounded * f) / f;
}

/** Bounds for each tunable cap — also documented in the admin guide. */
export const CAP_BOUNDS = {
  ratePerMinute: { min: 1, max: 10_000 },
  fanoutPerRun: { min: 1, max: 1_000 },
  costUsdPerRun: { min: 0, max: 10_000 },
  circuitBreakerErrorRate: { min: 0, max: 1 },
  approvalTtlDays: { min: 1, max: 365 },
} as const;
