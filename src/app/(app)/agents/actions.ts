"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/guard";
import { agentService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import { resolveActingUser } from "@/lib/services/acting-user";
import { isAgentPreset, parseBudgetInput } from "@/lib/agent/settings";

/** Result the Orchestrator card surfaces after a save attempt. */
export interface SaveAgentSettingsResult {
  ok: boolean;
  message: string;
}

/**
 * Save the orchestrator's model-tier preset + monthly budget (ADR-0048).
 *
 * This is a PROCESS, so it goes through the backend's PUT /agent/settings
 * (ADR-0042 division of labor — the web role deliberately has no UPDATE grant on
 * agent_settings). Guarded by `settings:write` (admin-only, ADR-0045); the
 * backend additionally audits the change with the acting user's id (resolution
 * is best-effort — the save proceeds unattributed when it fails, #190 seam).
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

  const acting = await resolveActingUser();
  const outcome = await callServiceWithFallback(
    () =>
      agentService.updateSettings({
        preset,
        budgetUsdMonthly: budget.value,
        ...(acting.ok ? { actingUserId: acting.id } : {}),
      }),
    {
      label: "saveAgentSettingsAction",
      notConfigured:
        "The agent backend isn't wired up in this environment (AGENT_SERVICE_URL unset) — settings can't be saved yet.",
      failed: "Saving failed — try again in a moment.",
    },
  );
  if (!outcome.ok) return { ok: false, message: outcome.message };

  revalidatePath("/agents");
  revalidatePath("/settings"); // the card also lives on Settings → AI (#90)
  return { ok: true, message: "Orchestrator settings saved." };
}
