"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { agentService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import { resolveActingUser } from "@/lib/services/acting-user";
import { str, strOrNull, strOr, intOr, checkbox } from "@/lib/form-data";
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

/**
 * Approve-to-send a drafted dunning reminder (#679, the SEND leg over the #678 panel;
 * parent #668 AR/Collections, ADR-0085 QBO read-only / ADR-0087 orchestration).
 *
 * Money-adjacent + customer-facing → HUMAN-GATED EVERY SEND: there is no auto-send.
 * Submitting this form IS the approval (ADR-0055 T2 propose-only — the composing human
 * is both proposer and approver). The send reuses the EXISTING ADR-0058 approval-gated
 * send path (`agentService.executeAction`, backend's ONLY send path / backend ADR-0033):
 * email goes out AS THE ACTING EMPLOYEE'S OWN M365 MAILBOX, with consent re-asserted by
 * the backend at execution (403 consent_denied → blocked). This is a REMINDER EMAIL ONLY —
 * it never writes QuickBooks and never moves money (the overlay is app-native, ADR-0087).
 *
 * Recording (acceptance criteria): on a real OR stubbed send we APPEND an `email` reminder
 * to `collections_activity` (the dunning overlay log) via the existing
 * `upsertCollectionsActivity` accessor — timestamp + channel `email` + an optional
 * escalation bump — and add a timeline entry on the account (`comms.createInteraction`,
 * source `email`, direction outbound). Audited by ids/counts only — never amounts/PII.
 *
 * Degradation (ADR-0018, mirrors the contacts composer): if the backend isn't configured,
 * the acting user can't be resolved (mock mode), the recipient has no email, or the sender
 * has no active M365 connection, we DEGRADE to the honest logged-stub — the reminder is
 * still recorded to the overlay + timeline, redirected with `mode=logged&reason=<why>` so
 * the panel can show a visible "logged, not sent" notice. A REAL attempt that FAILS does
 * NOT fall back to a stub (faking success is worse than failing) → `error=` notice, nothing
 * recorded. Gated `collections:write` (admin∨finance, fail-closed via requireCapability).
 */
export async function sendDunningReminderAction(formData: FormData) {
  await requireCapability("collections:write");
  const qboInvoiceId = str(formData, "qboInvoiceId");
  const recipientContactId = str(formData, "recipientContactId");
  const body = str(formData, "body");
  const subject = strOr(formData, "subject", "Payment reminder");
  const escalate = checkbox(formData, "escalate");
  if (!qboInvoiceId || !recipientContactId || body === "") return;

  const back = (over: Record<string, string>): string => {
    const params = new URLSearchParams({ invoice: qboInvoiceId, ...over });
    return `/collections?${params.toString()}`;
  };

  const { crm, comms, consent, contacts, connections } = getRepositories();

  // Consent pre-check (UI gate; the backend re-asserts at execution — the authority).
  if (!(await consent.canSend(recipientContactId, "email"))) {
    redirect(back({ blocked: "email" }));
  }

  // Resolve real-send prerequisites: recipient address, approver (acting user), sender mailbox.
  const profile = await contacts.getProfile(recipientContactId);
  const to = profile?.email ?? null;
  const acting = await resolveActingUser();
  let stubReason = "";
  if (!to) stubReason = "no_address";
  else if (!acting.ok) stubReason = "no_app_user";

  let fromConnectionId: string | undefined;
  if (!stubReason && acting.ok) {
    const userConnections = await connections.listUserConnections(acting.email);
    fromConnectionId = userConnections.find(
      (c) => c.provider === "m365" && c.status === "active",
    )?.id;
    if (!fromConnectionId) stubReason = "no_connection";
  }

  // Records the reminder on the overlay + a timeline entry on the account. `mode` is the
  // honest channel disposition ("real" | "logged") carried into the reminder note.
  const record = async (accountId: string | null, mode: "real" | "logged") => {
    const current = await currentOverlay(qboInvoiceId);
    const nextLevel = escalate
      ? Math.min((current?.escalationLevel ?? 0) + 1, 5)
      : (current?.escalationLevel ?? 0);
    const status: DunningStatus = escalate ? "escalated" : "reminded";
    const appendReminder: CollectionsReminder = {
      at: new Date().toISOString(),
      channel: "email",
      kind: escalate ? "demand" : "standard",
      note: mode === "logged" ? "Reminder logged (not sent — send backend unconfigured)." : null,
    };
    await crm.upsertCollectionsActivity({
      ...baseFrom(qboInvoiceId, current),
      status,
      escalationLevel: nextLevel,
      appendReminder,
    });
    // Timeline entry on the account (when the invoice resolved to a silver account).
    await comms.createInteraction({
      accountId,
      contactId: recipientContactId,
      source: "email",
      kind: "email",
      direction: "outbound",
      subject,
      body,
    });
  };

  // Resolve the account for the timeline entry off the read-only mirror (best-effort).
  const invoice = (await crm.listInvoices()).find((i) => i.qboInvoiceId === qboInvoiceId);
  const accountId = invoice?.accountId ?? null;

  if (!stubReason && acting.ok && to) {
    const outcome = await callServiceWithFallback(
      () =>
        agentService.executeAction({
          action: {
            kind: "send_email",
            contactId: recipientContactId,
            channel: "email",
            subject,
            body,
          },
          approval: { approvedByUserId: acting.id, approved: true },
          to,
          ...(fromConnectionId ? { fromConnectionId } : {}),
        }),
      { label: "sendDunningReminderAction", notConfigured: "", failed: "" },
    );
    if (outcome.ok) {
      // The backend logs its own `interaction`; we record the overlay reminder + an account
      // timeline entry so the dunning log and the account both reflect the send.
      await record(accountId, "real");
      revalidate(qboInvoiceId);
      redirect(back({ sent: "email", mode: "real" }));
    }
    if (outcome.kind === "rejected" && outcome.status === 403) {
      redirect(back({ blocked: "email" })); // backend consent gate refused at execution
    }
    if (outcome.kind !== "not_configured") {
      redirect(back({ error: "email" })); // a real attempt failed — never fake success
    }
    stubReason = "backend_unconfigured";
  }

  // Stub path: record the reminder to the overlay + timeline, honestly labeled "logged".
  await record(accountId, "logged");
  revalidate(qboInvoiceId);
  redirect(back({ sent: "email", mode: "logged", reason: stubReason }));
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
