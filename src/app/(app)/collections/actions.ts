"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOrNull, intOr } from "@/lib/form-data";
import { isDunningStatus } from "@/lib/collections";
import type { CollectionsActivityInput, CollectionsReminder, DunningStatus } from "@/types";

/**
 * Collections / dunning panel write actions (#678, ADR-0085 QBO read-only / ADR-0087
 * orchestration). The human actions on the `/collections` worklist: change the dunning
 * status, escalate, and record collections activity (a logged reminder + note). All gated
 * by `collections:write` (admin∨finance, ADR-0045 — fail-closed via requireCapability;
 * ADR-0030 also hides the controls in the GUI). These write the app-native overlay only —
 * there is NO app→QuickBooks write path; nothing here moves money or sends anything. The
 * actual drafted-reminder SEND is the send slice (#679), deliberately NOT built here.
 */

function revalidate(qboInvoiceId: string) {
  revalidatePath("/collections");
  revalidatePath(`/collections?invoice=${encodeURIComponent(qboInvoiceId)}`);
}

/** Read the invoice's current overlay so partial edits don't clobber unchanged fields. */
async function currentOverlay(qboInvoiceId: string) {
  const { crm } = getRepositories();
  return crm.getCollectionsActivity(qboInvoiceId);
}

/** Base upsert payload from the current overlay (or the not-yet-worked defaults). */
function baseFrom(
  qboInvoiceId: string,
  current: Awaited<ReturnType<typeof currentOverlay>>,
): CollectionsActivityInput {
  return {
    qboInvoiceId,
    status: current?.status ?? "none",
    escalationLevel: current?.escalationLevel ?? 0,
    assigneeUserId: current?.assigneeUserId ?? null,
    notes: current?.notes ?? null,
    appendReminder: null,
  };
}

/** Change the dunning status (none | reminded | escalated | promised | paused | disputed). */
export async function setDunningStatusAction(formData: FormData) {
  await requireCapability("collections:write");
  const qboInvoiceId = str(formData, "qboInvoiceId");
  const status = str(formData, "status");
  if (!qboInvoiceId || !isDunningStatus(status)) return;
  const { crm } = getRepositories();
  const current = await currentOverlay(qboInvoiceId);
  await crm.upsertCollectionsActivity({ ...baseFrom(qboInvoiceId, current), status });
  revalidate(qboInvoiceId);
}

/**
 * Escalate: bump the escalation level by one and move the status to `escalated`. Idempotent
 * per click — the level only ever increases; capped at a sane ceiling so a stuck button
 * can't run it away.
 */
export async function escalateCollectionsAction(formData: FormData) {
  await requireCapability("collections:write");
  const qboInvoiceId = str(formData, "qboInvoiceId");
  if (!qboInvoiceId) return;
  const { crm } = getRepositories();
  const current = await currentOverlay(qboInvoiceId);
  const nextLevel = Math.min((current?.escalationLevel ?? 0) + 1, 5);
  await crm.upsertCollectionsActivity({
    ...baseFrom(qboInvoiceId, current),
    status: "escalated",
    escalationLevel: nextLevel,
  });
  revalidate(qboInvoiceId);
}

/**
 * Record collections activity: append a reminder to the log (channel + kind + optional
 * note) and optionally update the status/notes in one write. The reminder is APPENDED (the
 * repo never rewrites the log). This is the human recording that contact happened — NOT a
 * send (the drafted-reminder send is #679).
 */
export async function recordCollectionsActivityAction(formData: FormData) {
  await requireCapability("collections:write");
  const qboInvoiceId = str(formData, "qboInvoiceId");
  if (!qboInvoiceId) return;

  const channel = str(formData, "channel") || "call";
  const kind = str(formData, "kind") || "standard";
  const reminderNote = strOrNull(formData, "reminderNote");
  const appendReminder: CollectionsReminder = {
    at: new Date().toISOString(),
    channel,
    kind,
    note: reminderNote,
  };

  // Optional status change recorded alongside the activity (defaults to current/reminded).
  const rawStatus = str(formData, "status");
  const { crm } = getRepositories();
  const current = await currentOverlay(qboInvoiceId);
  const status: DunningStatus = isDunningStatus(rawStatus)
    ? rawStatus
    : current?.status && current.status !== "none"
      ? current.status
      : "reminded";

  await crm.upsertCollectionsActivity({
    ...baseFrom(qboInvoiceId, current),
    status,
    escalationLevel: intOr(formData, "escalationLevel", current?.escalationLevel ?? 0),
    notes: strOrNull(formData, "notes") ?? current?.notes ?? null,
    appendReminder,
  });
  revalidate(qboInvoiceId);
}

/** Assign the chase to the signed-in user, or unassign (clear). */
export async function assignCollectionsAction(formData: FormData) {
  await requireCapability("collections:write");
  const qboInvoiceId = str(formData, "qboInvoiceId");
  if (!qboInvoiceId) return;
  const unassign = str(formData, "unassign") === "1";
  const session = await auth();
  const me = await resolveAppUserIdByEmail(session?.user?.email ?? "");
  const { crm } = getRepositories();
  const current = await currentOverlay(qboInvoiceId);
  await crm.upsertCollectionsActivity({
    ...baseFrom(qboInvoiceId, current),
    assigneeUserId: unassign ? null : me,
  });
  revalidate(qboInvoiceId);
}
