"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/guard";
import { agentService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import { resolveActingUser } from "@/lib/services/acting-user";
import type { IcmActionResult } from "@/app/(app)/workflows/actions";

/**
 * Approve / edit-and-approve / reject a parked Technician action on the approval
 * cockpit (#1056, ADR-0109). `agents:operate`-gated (admin-only, ADR-0050 — operating
 * the agent layer); on approval the backend re-asserts consent (ADR-0058) and runs the
 * approval-gated executor with the parked payload, recording the human approver as the
 * audited actor. Degrades to an honest notice where the cockpit endpoint isn't wired
 * (the Technician run-ledger + propose-flow land in backend #258/#263).
 */
export async function reviewPendingActionAction(formData: FormData): Promise<IcmActionResult> {
  await requireCapability("agents:operate");
  const pendingActionId = String(formData.get("pendingActionId") ?? "").trim();
  const decisionRaw = String(formData.get("decision") ?? "");
  const decision = decisionRaw === "approve" || decisionRaw === "reject" ? decisionRaw : null;
  if (!pendingActionId || !decision) return { ok: false, message: "Pick approve or reject." };
  const editedBody = String(formData.get("editedBody") ?? "").trim();

  const acting = await resolveActingUser();
  if (!acting.ok) return { ok: false, message: "Sign in again — couldn't resolve your identity." };

  const outcome = await callServiceWithFallback(
    () =>
      agentService.decidePendingAction({
        pendingActionId,
        decision,
        approvedByUserId: acting.id,
        ...(decision === "approve" && editedBody ? { editedBody } : {}),
      }),
    {
      label: "reviewPendingActionAction",
      notConfigured:
        "The Technician cockpit executor isn't wired in this environment yet — the decision is recorded here but can't be executed.",
      failed: "Couldn't record the decision — try again in a moment.",
    },
  );
  if (!outcome.ok) return { ok: false, message: outcome.message };
  revalidatePath("/operator/technician");
  return {
    ok: true,
    message: decision === "approve" ? "Action approved and sent for execution." : "Action rejected.",
  };
}

/**
 * Approve / edit-and-approve / reject a parked action on the NATIVE approval cockpit
 * (#1014, parent #996 / 2E, ADR-0107 D5). The cross-agent twin of
 * `reviewPendingActionAction` (#1056) — identical decide contract and security posture,
 * differing only in which surface it revalidates. `agents:operate`-gated (admin-only,
 * ADR-0050); on approval the backend re-asserts consent (ADR-0058) and runs the
 * approval-gated executor with the parked payload, recording the human approver as the
 * audited actor (backend #267, `POST /orchestration/cockpit/decide`). Degrades to an
 * honest notice where the cockpit endpoint isn't wired in this environment.
 */
export async function decidePendingActionAction(formData: FormData): Promise<IcmActionResult> {
  await requireCapability("agents:operate");
  const pendingActionId = String(formData.get("pendingActionId") ?? "").trim();
  const decisionRaw = String(formData.get("decision") ?? "");
  const decision = decisionRaw === "approve" || decisionRaw === "reject" ? decisionRaw : null;
  if (!pendingActionId || !decision) return { ok: false, message: "Pick approve or reject." };
  const editedBody = String(formData.get("editedBody") ?? "").trim();

  const acting = await resolveActingUser();
  if (!acting.ok) return { ok: false, message: "Sign in again — couldn't resolve your identity." };

  const outcome = await callServiceWithFallback(
    () =>
      agentService.decidePendingAction({
        pendingActionId,
        decision,
        approvedByUserId: acting.id,
        ...(decision === "approve" && editedBody ? { editedBody } : {}),
      }),
    {
      label: "decidePendingActionAction",
      notConfigured:
        "The approval-cockpit executor isn't wired in this environment yet — the decision is recorded here but can't be executed.",
      failed: "Couldn't record the decision — try again in a moment.",
    },
  );
  if (!outcome.ok) return { ok: false, message: outcome.message };
  revalidatePath("/operator/cockpit");
  return {
    ok: true,
    message: decision === "approve" ? "Action approved and sent for execution." : "Action rejected.",
  };
}
