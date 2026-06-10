"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { requestMergeRefresh } from "@/lib/integrations/merge-refresh";
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
  await requestMergeRefresh(); // never throws — surface the merged record now, not on the 5-min sweep (#89)
  revalidatePath("/contacts");
  redirect(`/contacts/${id}`);
}

export async function updateContactAction(formData: FormData) {
  await requireCapability("crm:write");
  const id = String(formData.get("id") ?? "");
  const { contacts } = getRepositories();
  await contacts.updateContact(id, parse(formData));
  await requestMergeRefresh(); // never throws (#89)
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
 * Log a message to the timeline. Consent-gated (ADR-0014): the actual provider send
 * is stubbed in this phase; we re-check consent server-side and no-op if the contact
 * has not opted in for the channel (the UI also disables the control).
 */
export async function sendMessageAction(formData: FormData) {
  const contactId = String(formData.get("contactId") ?? "");
  const channel = String(formData.get("channel") ?? "email"); // email|sms
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  await requireCapability("comms:write");
  if (!contactId || body === "") return;

  const { comms, consent } = getRepositories();
  const allowed = await consent.canSend(contactId, channel);
  if (!allowed) {
    redirect(`/contacts/${contactId}?blocked=${channel}`); // no current consent
  }

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
  redirect(`/contacts/${contactId}?sent=${channel}`);
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
