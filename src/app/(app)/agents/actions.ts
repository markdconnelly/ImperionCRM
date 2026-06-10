"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getPool } from "@/lib/db/client";
import { requireCapability } from "@/lib/auth/guard";
import { agentService } from "@/lib/services";
import { ServiceNotConfiguredError } from "@/lib/services/external-client";
import { isAgentPreset, parseBudgetInput } from "@/lib/agent/settings";

/** Result the Orchestrator card surfaces after a save attempt. */
export interface SaveAgentSettingsResult {
  ok: boolean;
  message: string;
}

/** Resolve the signed-in employee's app_user.id for the backend audit trail. */
async function resolveActingUserId(): Promise<string | undefined> {
  const email = (await auth())?.user?.email;
  const pool = getPool();
  if (!email || !pool) return undefined;
  try {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM app_user WHERE lower(email) = lower($1) ORDER BY created_at LIMIT 1`,
      [email],
    );
    return rows[0]?.id;
  } catch {
    return undefined; // audit attribution is best-effort; the save still proceeds
  }
}

/**
 * Save the orchestrator's model-tier preset + monthly budget (ADR-0048).
 *
 * This is a PROCESS, so it goes through the backend's PUT /agent/settings
 * (ADR-0042 division of labor — the web role deliberately has no UPDATE grant on
 * agent_settings). Guarded by `settings:write` (admin-only, ADR-0045); the
 * backend additionally audits the change with the acting user's id.
 */
export async function saveAgentSettingsAction(
  formData: FormData,
): Promise<SaveAgentSettingsResult> {
  await requireCapability("settings:write");

  const presetRaw = String(formData.get("preset") ?? "");
  const preset = isAgentPreset(presetRaw) ? presetRaw : undefined;
  const budget = parseBudgetInput(String(formData.get("budgetUsdMonthly") ?? ""));
  if (!budget.ok) return { ok: false, message: budget.error };
  if (!preset) return { ok: false, message: "Pick a model-tier preset." };

  try {
    const actingUserId = await resolveActingUserId();
    await agentService.updateSettings({
      preset,
      budgetUsdMonthly: budget.value,
      ...(actingUserId ? { actingUserId } : {}),
    });
  } catch (err) {
    if (err instanceof ServiceNotConfiguredError) {
      return {
        ok: false,
        message:
          "The agent backend isn't wired up in this environment (AGENT_SERVICE_URL unset) — settings can't be saved yet.",
      };
    }
    console.error("saveAgentSettingsAction failed:", err);
    return { ok: false, message: "Saving failed — try again in a moment." };
  }

  revalidatePath("/agents");
  return { ok: true, message: "Orchestrator settings saved." };
}
