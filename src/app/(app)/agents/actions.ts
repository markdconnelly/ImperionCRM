"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/guard";
import { agentService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import { resolveActingUser } from "@/lib/services/acting-user";
import { isAgentPreset, parseBudgetInput } from "@/lib/agent/settings";
import { coerceLevel } from "@/lib/agent/action-autonomy";
import { upsertActionAutonomyDial } from "@/lib/agent/action-autonomy-data";

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

/** Result the grants admin surface shows after a grant/revoke/scope edit. */
export interface GrantMutationResult {
  ok: boolean;
  message: string;
}

/** Parse the scope textarea into a `{ field: string[] }` allow-list, or an error. */
function parseScopeInput(raw: string): { ok: true; value: Record<string, string[]> } | { ok: false; error: string } {
  const text = raw.trim();
  if (!text) return { ok: true, value: {} };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "Scope must be valid JSON, e.g. {\"accountId\":[\"a1\"]}." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Scope must be a JSON object of field → string[] allow-lists." };
  }
  const value: Record<string, string[]> = {};
  for (const [field, vals] of Object.entries(parsed as Record<string, unknown>)) {
    if (!Array.isArray(vals) || !vals.every((v) => typeof v === "string")) {
      return { ok: false, error: `Field "${field}" must be an array of strings.` };
    }
    value[field] = vals as string[];
  }
  return { ok: true, value };
}

/**
 * Grant a sub-agent a tool, or edit a grant's scope (idempotent upsert). Admin-gated
 * (`settings:write`, ADR-0045); the WRITE is a PROCESS so it goes through the backend
 * `POST /agent/grants` (ADR-0042 — the web role has no INSERT/UPDATE on agent_tool_grant).
 */
export async function upsertToolGrantAction(formData: FormData): Promise<GrantMutationResult> {
  await requireCapability("settings:write");

  const agentId = String(formData.get("agentId") ?? "");
  const tool = String(formData.get("tool") ?? "").trim();
  if (!agentId || !tool) return { ok: false, message: "Pick an agent and a tool name." };
  const scope = parseScopeInput(String(formData.get("scope") ?? ""));
  if (!scope.ok) return { ok: false, message: scope.error };

  const acting = await resolveActingUser();
  const outcome = await callServiceWithFallback(
    () =>
      agentService.upsertToolGrant({
        agentId,
        tool,
        scope: scope.value,
        ...(acting.ok ? { actingUserId: acting.id } : {}),
      }),
    {
      label: "upsertToolGrantAction",
      notConfigured:
        "The agent backend isn't wired up in this environment (AGENT_SERVICE_URL unset) — grants can't be changed yet.",
      failed: "Saving the grant failed — try again in a moment.",
    },
  );
  if (!outcome.ok) return { ok: false, message: outcome.message };

  revalidatePath("/agents/grants");
  return { ok: true, message: `Grant saved: ${tool}.` };
}

/** Revoke a sub-agent's tool grant. Admin-gated; backend `DELETE /agent/grants`. */
export async function revokeToolGrantAction(formData: FormData): Promise<GrantMutationResult> {
  await requireCapability("settings:write");

  const agentId = String(formData.get("agentId") ?? "");
  const tool = String(formData.get("tool") ?? "").trim();
  if (!agentId || !tool) return { ok: false, message: "Missing agent or tool." };

  const acting = await resolveActingUser();
  const outcome = await callServiceWithFallback(
    () =>
      agentService.revokeToolGrant({
        agentId,
        tool,
        ...(acting.ok ? { actingUserId: acting.id } : {}),
      }),
    {
      label: "revokeToolGrantAction",
      notConfigured:
        "The agent backend isn't wired up in this environment (AGENT_SERVICE_URL unset) — grants can't be changed yet.",
      failed: "Revoking the grant failed — try again in a moment.",
    },
  );
  if (!outcome.ok) return { ok: false, message: outcome.message };

  revalidatePath("/agents/grants");
  return { ok: true, message: `Grant revoked: ${tool}.` };
}

/** Result the actuation-dial slider surfaces after a save attempt. */
export interface SetActionAutonomyResult {
  ok: boolean;
  message: string;
}

/**
 * Set the 1–5 actuation autonomy level for an agent (+ optional per-action-class
 * override), writing `agent_action_autonomy` directly (#1013 / 2E-3, ADR-0109 D4).
 *
 * `agents:operate`-gated (admin-only, like the 0123 ICM rung dial). Unlike the other
 * /agents writes this is NOT a backend process: migration 0158 gives the web role the
 * INSERT/UPDATE grant and the backend only SELECTs the dial at dispatch, so the slider
 * upserts the row here. Reversible — re-saving is another upsert. Fail-closed: an
 * unparseable level coerces to 1 (Manual).
 */
export async function setActionAutonomyAction(
  formData: FormData,
): Promise<SetActionAutonomyResult> {
  await requireCapability("agents:operate");

  const agentKey = String(formData.get("agentKey") ?? "").trim();
  const actionClass = String(formData.get("actionClass") ?? "*").trim() || "*";
  const level = coerceLevel(formData.get("level"));
  const noteRaw = String(formData.get("note") ?? "").trim();
  if (!agentKey) return { ok: false, message: "Missing the agent for the dial." };

  const outcome = await upsertActionAutonomyDial({
    agentKey,
    actionClass,
    level,
    note: noteRaw || null,
  });
  if (!outcome.ok) return { ok: false, message: outcome.message };

  revalidatePath("/agents");
  const scope = actionClass === "*" ? agentKey : `${agentKey} · ${actionClass}`;
  return { ok: true, message: `Autonomy set to level ${level} for ${scope}.` };
}
