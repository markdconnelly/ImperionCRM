/**
 * Read-side for the AI Agents page (ADR-0048).
 *
 * Reads degrade in tiers, matching the app-wide pattern (ADR-0007/0042):
 *  1. Backend GET /agent/settings — the authoritative state (live spend included).
 *  2. Direct DB read of `agent_settings` + the `agent.turn` audit spend — the web
 *     identity holds SELECT on both (migrations 0002/0054); rendering reads direct
 *     is the ADR-0042 division of labor. Writes are NEVER done here — the web role
 *     deliberately has no INSERT/UPDATE on agent_settings; saving goes through the
 *     backend PUT.
 *  3. Mock defaults — the page renders without a backend or a database.
 *
 * Server-only.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import { agentService } from "@/lib/services";
import {
  DEFAULT_PRESET,
  PRESET_MODELS,
  isAgentPreset,
  type AgentPreset,
  type ModelPair,
} from "@/lib/agent/settings";

/** Everything the Orchestrator card renders, plus where it came from. */
export interface AgentSettingsState {
  preset: AgentPreset;
  budgetUsdMonthly: number | null;
  spendMonthToDateUsd: number;
  /** The model pair the current preset pins. */
  models: ModelPair;
  /** The full preset catalog (authoritative when source='backend'). */
  presets: Record<AgentPreset, ModelPair>;
  /**
   * Where the state came from: 'backend' (live, saving works), 'db' (direct read —
   * backend unset, saving disabled), 'mock' (no backend, no DB).
   */
  source: "backend" | "db" | "mock";
}

const MOCK_STATE: AgentSettingsState = {
  preset: DEFAULT_PRESET,
  budgetUsdMonthly: null,
  spendMonthToDateUsd: 0,
  models: PRESET_MODELS[DEFAULT_PRESET],
  presets: PRESET_MODELS,
  source: "mock",
};

/** Direct DB read (tier 2). Returns null when the DB is unset or the read fails. */
async function readFromDb(): Promise<AgentSettingsState | null> {
  const pool = getPool();
  if (!pool) return null;
  try {
    const [settings, spend] = await Promise.all([
      pool.query<{ preset: string; budget_usd_monthly: string | null }>(
        `SELECT preset, budget_usd_monthly FROM agent_settings WHERE id`,
      ),
      pool.query<{ spend: string | null }>(
        `SELECT SUM((detail->'usage'->>'costUsd')::numeric) AS spend
         FROM audit_log
         WHERE action = 'agent.turn' AND occurred_at >= date_trunc('month', now())`,
      ),
    ]);
    const row = settings.rows[0];
    const preset = isAgentPreset(row?.preset) ? row.preset : DEFAULT_PRESET;
    return {
      preset,
      budgetUsdMonthly: row?.budget_usd_monthly == null ? null : Number(row.budget_usd_monthly),
      spendMonthToDateUsd: Number(spend.rows[0]?.spend ?? 0) || 0,
      models: PRESET_MODELS[preset],
      presets: PRESET_MODELS,
      source: "db",
    };
  } catch (err) {
    // Table missing (migration not applied) or DB unreachable — fall through to mock.
    console.error("agent settings DB read failed:", err);
    return null;
  }
}

/** Resolve the Orchestrator card's state through the backend → DB → mock tiers. */
export async function getAgentSettingsState(): Promise<AgentSettingsState> {
  try {
    const wire = await agentService.getSettings();
    const preset = isAgentPreset(wire.preset) ? wire.preset : DEFAULT_PRESET;
    return {
      preset,
      budgetUsdMonthly: wire.budgetUsdMonthly,
      spendMonthToDateUsd: wire.spendMonthToDateUsd,
      models: wire.models ?? PRESET_MODELS[preset],
      presets: wire.presets ?? PRESET_MODELS,
      source: "backend",
    };
  } catch {
    // AGENT_SERVICE_URL unset (ServiceNotConfiguredError) or the call failed —
    // degrade to the direct read so the page still shows the persisted truth.
    return (await readFromDb()) ?? MOCK_STATE;
  }
}
