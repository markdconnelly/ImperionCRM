"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { asChangeType, asApprovalDecision, validateScheduleWindow } from "@/lib/change";
import { asCiType } from "@/lib/cmdb/ci";
import type { ChangeRequestInput, CiType } from "@/types";

/**
 * Change Enablement server actions (ADR-0079, #656). Writes are gated by `change:write`
 * (admin∨support — the ITIL Service practice) re-asserted server-side via
 * `requireCapability` (defense in depth; the GUI also hides the controls). The
 * risk/approval/schedule fields are owned by the downstream slices (#658/#659/#660) and
 * are NEVER set here — this action creates the working object + its affected-CI set only.
 */

async function requireWriter(): Promise<string> {
  const roles = await requireCapability("change:write");
  void roles;
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");
  return email;
}

/** Approver gate (#659): admin-only `change:approve`, returning the actor email for audit. */
async function requireApprover(): Promise<string> {
  await requireCapability("change:approve");
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");
  return email;
}

/** Parse the posted affected-CI keys (`ciType:ciId`, one per checkbox) into pairs. */
function readAffectedCis(formData: FormData): { ciType: CiType; ciId: string }[] {
  return formData
    .getAll("affectedCi")
    .map(String)
    .map((raw) => {
      const idx = raw.indexOf(":");
      if (idx === -1) return null;
      const ciType = asCiType(raw.slice(0, idx));
      const ciId = raw.slice(idx + 1).trim();
      return ciType && ciId ? { ciType, ciId } : null;
    })
    .filter((x): x is { ciType: CiType; ciId: string } => x !== null);
}

function toInput(formData: FormData): ChangeRequestInput {
  const changeType = asChangeType(String(formData.get("changeType") ?? "")) ?? "normal";
  const description = String(formData.get("description") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  return {
    changeType,
    title: String(formData.get("title") ?? "").trim(),
    description: description.length > 0 ? description : null,
    accountId: accountId.length > 0 ? accountId : null,
    affectedCis: readAffectedCis(formData),
  };
}

export async function createChangeAction(formData: FormData): Promise<void> {
  const email = await requireWriter();
  const input = toInput(formData);
  if (!input.title) throw new Error("A change title is required.");
  const { changes } = getRepositories();
  const id = await changes.createChangeRequest(input, email);
  revalidatePath("/changes");
  redirect(`/changes/${id}`);
}

export async function updateChangeAction(formData: FormData): Promise<void> {
  await requireWriter();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing change id.");
  const input = toInput(formData);
  if (!input.title) throw new Error("A change title is required.");
  const { changes } = getRepositories();
  await changes.updateChangeRequest(id, input);
  revalidatePath("/changes");
  revalidatePath(`/changes/${id}`);
  redirect(`/changes/${id}`);
}

/**
 * Set/clear the admin risk override (#658). Gated by `change:approve` — admin-only, the
 * same gate as the CAB approval (#659): overriding the CMDB-derived risk is an authority
 * call, not service-desk work (which `change:write` covers). Effective risk =
 * override ?? derived; clearing (`risk` empty) falls back to the derived score. The score
 * is clamped to [0, 100]; junk input clears the override rather than throwing.
 */
export async function setChangeRiskOverrideAction(formData: FormData): Promise<void> {
  await requireCapability("change:approve");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing change id.");
  const raw = String(formData.get("risk") ?? "").trim();
  let override: number | null = null;
  if (raw.length > 0) {
    const n = Number(raw);
    if (Number.isFinite(n)) override = Math.max(0, Math.min(100, Math.round(n)));
  }
  const { changes } = getRepositories();
  await changes.setChangeRiskOverride(id, override);
  revalidatePath("/changes");
  revalidatePath(`/changes/${id}`);
  redirect(`/changes/${id}`);
}

/**
 * Approver decision on a change awaiting approval (#659). Gated by `change:approve`
 * (admin-only — the lightweight CAB authority, same gate as the risk override #658) and
 * audited in the repository (`change.approved`/`change.rejected`, attributed to the actor).
 * The repo's state machine refuses anything not in `pending_approval`/`pending`, so a
 * double-approve or a click on an auto-approved standard change is a safe no-op.
 */
export async function decideChangeApprovalAction(formData: FormData): Promise<void> {
  const approverEmail = await requireApprover();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing change id.");
  const decision = asApprovalDecision(String(formData.get("decision") ?? ""));
  if (!decision) throw new Error("Invalid approval decision.");
  const { changes } = getRepositories();
  await changes.decideChangeApproval(id, decision, approverEmail);
  revalidatePath("/changes");
  revalidatePath("/changes/approvals");
  revalidatePath(`/changes/${id}`);
  redirect(`/changes/${id}`);
}

/**
 * Set/clear a change's planned schedule window (#660). Gated by `change:write` (admin∨support
 * — scheduling is an edit to the change, the ITIL Service-desk practice, not the CAB authority
 * `change:approve` covers). The window is validated end ≥ start in-app (mirroring the DB CHECK)
 * before the round-trip; both blank clears it. The repository reflects it onto status via the
 * `approved ↔ scheduled` toggle without touching approval state.
 */
export async function setChangeScheduleAction(formData: FormData): Promise<void> {
  await requireWriter();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing change id.");
  const result = validateScheduleWindow(
    String(formData.get("scheduleStart") ?? ""),
    String(formData.get("scheduleEnd") ?? ""),
  );
  if (!result.ok) throw new Error(result.reason ?? "Invalid schedule window.");
  const { changes } = getRepositories();
  await changes.setChangeSchedule(id, result.start, result.end);
  revalidatePath("/changes");
  revalidatePath("/changes/calendar");
  revalidatePath(`/changes/${id}`);
  redirect(`/changes/${id}`);
}

export async function deleteChangeAction(formData: FormData): Promise<void> {
  await requireWriter();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const { changes } = getRepositories();
  await changes.deleteChangeRequest(id);
  revalidatePath("/changes");
  redirect("/changes");
}
