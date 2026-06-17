"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { agentService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import { resolveActingUser } from "@/lib/services/acting-user";
import { isAutonomyRung } from "@/lib/agent/icm-autonomy";

export async function exitEnrollmentAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  const { workflows } = getRepositories();
  await workflows.exitEnrollment(id);
  revalidatePath("/workflows");
}

export async function createWorkflowAction(formData: FormData) {
  await requireCapability("sales:write");
  const trigger = String(formData.get("trigger") ?? "").trim();
  const { workflows } = getRepositories();
  const id = await workflows.createWorkflow({
    name: String(formData.get("name") ?? "").trim(),
    kind: String(formData.get("kind") ?? "nurture"),
    status: String(formData.get("status") ?? "active"),
    trigger: trigger === "" ? null : trigger,
  });
  revalidatePath("/workflows");
  redirect(`/workflows/${id}`);
}

export async function addStepAction(formData: FormData) {
  await requireCapability("sales:write");
  const workflowId = String(formData.get("workflowId") ?? "");
  const config = String(formData.get("config") ?? "").trim();
  if (!workflowId) return;
  const { workflows } = getRepositories();
  await workflows.addStep(workflowId, {
    kind: String(formData.get("kind") ?? "send_email"),
    config: config === "" ? null : config,
  });
  revalidatePath(`/workflows/${workflowId}`);
}

export async function deleteStepAction(formData: FormData) {
  await requireCapability("sales:write");
  const stepId = String(formData.get("stepId") ?? "");
  const workflowId = String(formData.get("workflowId") ?? "");
  const { workflows } = getRepositories();
  await workflows.deleteStep(stepId);
  revalidatePath(`/workflows/${workflowId}`);
}

// ── ICM glass-box: approval queue + autonomy dial (#278, ADR-0061/0087) ───────

/** Result surfaced by the approval-queue and autonomy-dial controls. */
export interface IcmActionResult {
  ok: boolean;
  message: string;
}

/**
 * Approve / edit-and-approve / reject a parked ICM checkpoint (#278, ADR-0061).
 * `agents:operate`-gated (admin-only, ADR-0050 — operating the agent layer); the
 * backend re-asserts consent on any send (ADR-0058) and records the human approver
 * on the run. Degrades to an honest notice where the executor endpoint isn't wired.
 */
export async function reviewApprovalAction(formData: FormData): Promise<IcmActionResult> {
  await requireCapability("agents:operate");
  const runId = String(formData.get("runId") ?? "").trim();
  const decisionRaw = String(formData.get("decision") ?? "");
  const decision = decisionRaw === "approve" || decisionRaw === "reject" ? decisionRaw : null;
  if (!runId || !decision) return { ok: false, message: "Pick approve or reject." };
  const editedDraft = String(formData.get("editedDraft") ?? "").trim();

  const acting = await resolveActingUser();
  if (!acting.ok) return { ok: false, message: "Sign in again — couldn't resolve your identity." };

  const outcome = await callServiceWithFallback(
    () =>
      agentService.reviewApproval({
        runId,
        decision,
        approvedByUserId: acting.id,
        ...(decision === "approve" && editedDraft ? { editedDraft } : {}),
      }),
    {
      label: "reviewApprovalAction",
      notConfigured:
        "The ICM executor isn't wired in this environment yet — the decision is recorded here but can't be executed.",
      failed: "Couldn't record the decision — try again in a moment.",
    },
  );
  if (!outcome.ok) return { ok: false, message: outcome.message };
  revalidatePath("/workflows/runs");
  return {
    ok: true,
    message: decision === "approve" ? "Draft approved and sent for execution." : "Draft rejected.",
  };
}

/**
 * Flip the per-workflow autonomy dial (#278, ADR-0087): set the rung (L0–L3) +
 * mark-gated flag for an ICM workflow. `agents:operate`-gated (admin-only); the
 * backend upserts `agent_autopilot_policy` and audits the change. Reversible.
 */
export async function setAutonomyAction(formData: FormData): Promise<IcmActionResult> {
  await requireCapability("agents:operate");
  const agentKey = String(formData.get("agentKey") ?? "").trim();
  const workflowKey = String(formData.get("workflowKey") ?? "*").trim() || "*";
  const rung = String(formData.get("rung") ?? "");
  const markGated = String(formData.get("markGated") ?? "") === "on";
  if (!agentKey) return { ok: false, message: "Missing the workflow agent." };
  if (!isAutonomyRung(rung)) return { ok: false, message: "Pick a valid autonomy rung." };

  const acting = await resolveActingUser();
  const outcome = await callServiceWithFallback(
    () =>
      agentService.setAutonomy({
        agentKey,
        workflowKey,
        rung,
        markGated,
        ...(acting.ok ? { actingUserId: acting.id } : {}),
      }),
    {
      label: "setAutonomyAction",
      notConfigured:
        "The autonomy dial backend isn't wired in this environment yet — the rung can't be changed.",
      failed: "Couldn't change the autonomy rung — try again in a moment.",
    },
  );
  if (!outcome.ok) return { ok: false, message: outcome.message };
  revalidatePath("/workflows/runs");
  return { ok: true, message: `Autonomy set to ${rung}${markGated ? " (Mark-gated)" : ""}.` };
}
