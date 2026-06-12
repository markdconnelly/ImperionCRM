"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { requestMergeRefresh } from "@/lib/integrations/merge-refresh";
import { agentService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import { resolveActingUser } from "@/lib/services/acting-user";
import type { ContactInput } from "@/lib/data/repositories";

function orNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function parse(formData: FormData): ContactInput {
  return {
    accountId: orNull(formData.get("accountId")),
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: orNull(formData.get("email")),
    phone: orNull(formData.get("phone")),
    title: orNull(formData.get("title")),
    headline: orNull(formData.get("headline")),
    location: orNull(formData.get("location")),
    lifecycleStatus: String(formData.get("lifecycleStatus") ?? "stranger"),
  };
}

export async function createContactAction(formData: FormData) {
  await requireCapability("crm:write");
  const { contacts } = getRepositories();
  const id = await contacts.createContact(parse(formData));
  requestMergeRefresh(); // fire-and-forget merge nudge — never throws or blocks (#89)
  revalidatePath("/contacts");
  redirect(`/contacts/${id}`);
}

export async function updateContactAction(formData: FormData) {
  await requireCapability("crm:write");
  const id = String(formData.get("id") ?? "");
  const { contacts } = getRepositories();
  await contacts.updateContact(id, parse(formData));
  requestMergeRefresh(); // fire-and-forget (#89)
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

export async function deleteContactAction(formData: FormData) {
  await requireCapability("crm:write");
  const id = String(formData.get("id") ?? "");
  const { contacts } = getRepositories();
  await contacts.deleteContact(id);
  revalidatePath("/contacts");
  redirect("/contacts");
}

/**
 * Send a 1:1 message from the composer — REAL sends via the backend (#183, v1 gate 5).
 *
 * Consent-gated twice (ADR-0014): pre-checked here for the UI, re-asserted by the
 * backend at execution (403 consent_denied → blocked notice). The send goes through
 * the backend's ONLY send path, POST /agent/actions/execute (backend ADR-0033):
 * the composing human is both proposer and approver (ADR-0055 T2 propose-only —
 * submitting the composer IS the approval), so `approvedByUserId` is the acting
 * user. Email sends as the acting user's own M365 mailbox (their active m365
 * connection); SMS goes via ACS.
 *
 * Degradation (ADR-0018): backend unconfigured, no app user resolvable (mock mode),
 * no recipient address, or no M365 connection → the previous stub behavior (log the
 * message to the timeline) with an honest notice (`mode=logged`). A REAL attempt
 * that fails does NOT fall back to the stub — faking success would be worse than
 * failing (`error=` notice instead).
 */
export async function sendMessageAction(formData: FormData) {
  const contactId = String(formData.get("contactId") ?? "");
  const channel = String(formData.get("channel") ?? "email"); // email|sms
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  await requireCapability("comms:write");
  if (!contactId || body === "") return;

  const { comms, consent, contacts, connections } = getRepositories();
  const allowed = await consent.canSend(contactId, channel);
  if (!allowed) {
    redirect(`/contacts/${contactId}?blocked=${channel}`); // no current consent
  }

  // Resolve the real-send prerequisites: recipient address, approver, sender mailbox.
  const profile = await contacts.getProfile(contactId);
  const to = channel === "sms" ? profile?.phone : profile?.email;
  const acting = await resolveActingUser();
  let stubReason = ""; // why we fell back to the logged-to-timeline stub
  if (!to) stubReason = "no_address";
  else if (!acting.ok) stubReason = "no_app_user";

  let fromConnectionId: string | undefined;
  if (!stubReason && channel === "email" && acting.ok) {
    const userConnections = await connections.listUserConnections(acting.email);
    fromConnectionId = userConnections.find(
      (c) => c.provider === "m365" && c.status === "active",
    )?.id;
    if (!fromConnectionId) stubReason = "no_connection";
  }

  if (!stubReason && acting.ok && to) {
    const kind = channel === "sms" ? ("send_sms" as const) : ("send_email" as const);
    const outcome = await callServiceWithFallback(
      () =>
        agentService.executeAction({
          action: {
            kind,
            contactId,
            channel: channel === "sms" ? "sms" : "email",
            ...(subject ? { subject } : {}),
            body,
          },
          approval: { approvedByUserId: acting.id, approved: true },
          to,
          ...(fromConnectionId ? { fromConnectionId } : {}),
        }),
      {
        label: "sendMessageAction",
        notConfigured: "", // not rendered — unconfigured backend falls back to the stub
        failed: "", // not rendered — failures surface via the error= notice
      },
    );
    if (outcome.ok) {
      revalidatePath(`/contacts/${contactId}`);
      revalidatePath("/communications");
      redirect(`/contacts/${contactId}?sent=${channel}&mode=real`);
    }
    if (outcome.kind === "rejected" && outcome.status === 403) {
      // The backend's consent gate refused at execution — the authoritative answer.
      redirect(`/contacts/${contactId}?blocked=${channel}`);
    }
    if (outcome.kind !== "not_configured") {
      // A real attempt failed — never fake success by logging a stub entry.
      redirect(`/contacts/${contactId}?error=${channel}`);
    }
    stubReason = "backend_unconfigured";
  }

  // Stub path: log the message to the timeline (the pre-#183 behavior), honestly labeled.
  const source = channel === "sms" ? "sms" : "email";
  await comms.createInteraction({
    accountId: null,
    contactId,
    source,
    kind: channel === "sms" ? "message" : "email",
    direction: "outbound",
    subject: subject === "" ? null : subject,
    body,
  });
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/communications");
  redirect(`/contacts/${contactId}?sent=${channel}&mode=logged&reason=${stubReason}`);
}

/**
 * Per-contact consent toggle (ADR-0014). Appends an opt_in/opt_out event to the
 * append-only ledger — never mutates history. Drives the send/ad gates and the
 * derived current_consent view.
 */
export async function setConsentAction(formData: FormData) {
  const contactId = String(formData.get("contactId") ?? "");
  const channel = String(formData.get("channel") ?? "");
  const state = String(formData.get("state") ?? "");
  await requireCapability("comms:write");
  if (!contactId || !channel || (state !== "opt_in" && state !== "opt_out")) return;

  const { consent } = getRepositories();
  await consent.recordConsentEvent({
    contactId,
    channel,
    state,
    lawfulBasis: "consent",
    source: "crm_manual_toggle",
  });
  revalidatePath(`/contacts/${contactId}`);
}

export async function completeActionItemAction(formData: FormData) {
  await requireCapability("tickets:write");
  const id = String(formData.get("id") ?? "");
  const back = String(formData.get("back") ?? "/communications");
  const { comms } = getRepositories();
  await comms.completeActionItem(id);
  revalidatePath(back);
}
