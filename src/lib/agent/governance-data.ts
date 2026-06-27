/**
 * Read-side for the agent-governance admin surface (#1408).
 *
 * The web identity holds SELECT on `agent_governance_setting` (mig 0163); rendering
 * reads direct from the DB is the ADR-0042 division of labor (governance is config,
 * not a process). Degrades to the seeded defaults when no database is configured so
 * the page still renders. Writes are NOT here — they go through the admin server
 * actions (`settings/governance/actions.ts`), which the web role's UPDATE grant allows.
 *
 * Server-only.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import {
  GOVERNANCE_DEFAULTS,
  GOVERNANCE_KEYS,
  isOptoutDefault,
  parseKillSwitchScope,
  parseNumber,
  type GovernanceState,
} from "@/lib/agent/governance";

const MOCK_STATE: GovernanceState = { ...GOVERNANCE_DEFAULTS, source: "mock" };

/**
 * Resolve every governance gate from the DB, falling back per-key to the seeded
 * default for any missing/malformed row, and to the full mock state when the DB is
 * unset or unreachable.
 */
export async function getGovernanceState(): Promise<GovernanceState> {
  const pool = getPool();
  if (!pool) return MOCK_STATE;
  try {
    const { rows } = await pool.query<{ key: string; value: unknown }>(
      `SELECT key, value FROM agent_governance_setting`,
    );
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    const d = GOVERNANCE_DEFAULTS;
    const optout = byKey.get(GOVERNANCE_KEYS.optout);
    return {
      killswitch: byKey.has(GOVERNANCE_KEYS.killswitch)
        ? parseKillSwitchScope(byKey.get(GOVERNANCE_KEYS.killswitch))
        : d.killswitch,
      optoutDefault: isOptoutDefault(optout) ? optout : d.optoutDefault,
      ratePerMinute: parseNumber(byKey.get(GOVERNANCE_KEYS.rate), d.ratePerMinute),
      fanoutPerRun: parseNumber(byKey.get(GOVERNANCE_KEYS.fanout), d.fanoutPerRun),
      costUsdPerRun: parseNumber(byKey.get(GOVERNANCE_KEYS.cost), d.costUsdPerRun),
      circuitBreakerErrorRate: parseNumber(byKey.get(GOVERNANCE_KEYS.errorRate), d.circuitBreakerErrorRate),
      approvalTtlDays: parseNumber(byKey.get(GOVERNANCE_KEYS.approvalTtl), d.approvalTtlDays),
      source: "db",
    };
  } catch (err) {
    // Table missing (migration not applied) or DB unreachable — render the defaults.
    console.error("agent governance DB read failed:", err);
    return MOCK_STATE;
  }
}
