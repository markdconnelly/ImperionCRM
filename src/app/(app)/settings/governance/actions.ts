"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getPool } from "@/lib/db/client";
import { requireCapability } from "@/lib/auth/guard";
import { checkbox, str, strOr } from "@/lib/form-data";
import {
  CAP_BOUNDS,
  GOVERNANCE_DEFAULTS,
  GOVERNANCE_KEYS,
  clampInt,
  clampNumber,
  isOptoutDefault,
  parseSlugList,
} from "@/lib/agent/governance";

/**
 * Admin server actions for the agent-governance surface (#1408, ADR-0080/0081).
 *
 * Tuning the action-plane gates is operating the agent layer — gated by
 * `agents:operate` (ADR-0050, admin-only), enforced fail-closed at the top of every
 * action. The web role holds SELECT+UPDATE on `agent_governance_setting` (mig 0163),
 * so the GUI updates the seven seeded rows in place; it never INSERTs/DELETEs a key.
 * Out-of-range numeric input is clamped to the documented bounds (never throws), and
 * `updated_by` records the admin so the change is attributable. No secrets, no PII.
 */

type GovernanceKeyValue = (typeof GOVERNANCE_KEYS)[keyof typeof GOVERNANCE_KEYS];

/** UPDATE one seeded governance row in place (web role has UPDATE only). */
async function writeSetting(key: GovernanceKeyValue, value: unknown): Promise<void> {
  const pool = getPool();
  if (!pool) return; // no DB configured (mock mode) — nothing to persist
  const session = await auth();
  const updatedBy = session?.user?.email ?? session?.user?.name ?? "unknown";
  await pool.query(
    `UPDATE agent_governance_setting SET value = $1::jsonb, updated_by = $2, updated_at = now() WHERE key = $3`,
    [JSON.stringify(value), updatedBy, key],
  );
  revalidatePath("/settings/governance");
}

/** Flip the three-scope kill-switch (global master + per-agent + per-workflow lists). */
export async function saveKillSwitchAction(formData: FormData) {
  await requireCapability("agents:operate");
  await writeSetting(GOVERNANCE_KEYS.killswitch, {
    global: checkbox(formData, "global"),
    per_agent: parseSlugList(strOr(formData, "per_agent", "")),
    per_workflow: parseSlugList(strOr(formData, "per_workflow", "")),
  });
}

/** Set the per-client autonomy default for new clients (opt_in | opt_out). */
export async function saveOptoutDefaultAction(formData: FormData) {
  await requireCapability("agents:operate");
  const raw = str(formData, "optout_default");
  const value = isOptoutDefault(raw) ? raw : GOVERNANCE_DEFAULTS.optoutDefault;
  await writeSetting(GOVERNANCE_KEYS.optout, value);
}

/** Tune the rate / fan-out / cost caps + circuit-breaker error rate + approval TTL. */
export async function saveCapsAction(formData: FormData) {
  await requireCapability("agents:operate");
  const num = (key: string) => Number(strOr(formData, key, ""));
  const d = GOVERNANCE_DEFAULTS;
  const b = CAP_BOUNDS;
  const writes: [GovernanceKeyValue, number][] = [
    [GOVERNANCE_KEYS.rate, clampInt(num("rate_per_minute"), b.ratePerMinute.min, b.ratePerMinute.max, d.ratePerMinute)],
    [GOVERNANCE_KEYS.fanout, clampInt(num("fanout_per_run"), b.fanoutPerRun.min, b.fanoutPerRun.max, d.fanoutPerRun)],
    [GOVERNANCE_KEYS.cost, clampNumber(num("cost_usd_per_run"), b.costUsdPerRun.min, b.costUsdPerRun.max, d.costUsdPerRun)],
    [
      GOVERNANCE_KEYS.errorRate,
      clampNumber(num("error_rate"), b.circuitBreakerErrorRate.min, b.circuitBreakerErrorRate.max, d.circuitBreakerErrorRate),
    ],
    [GOVERNANCE_KEYS.approvalTtl, clampInt(num("approval_ttl_days"), b.approvalTtlDays.min, b.approvalTtlDays.max, d.approvalTtlDays)],
  ];
  for (const [key, value] of writes) await writeSetting(key, value);
}
