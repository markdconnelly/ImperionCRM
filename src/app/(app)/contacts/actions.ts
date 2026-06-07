"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
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
  const { contacts } = getRepositories();
  const id = await contacts.createContact(parse(formData));
  revalidatePath("/contacts");
  redirect(`/contacts/${id}`);
}

export async function updateContactAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { contacts } = getRepositories();
  await contacts.updateContact(id, parse(formData));
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

export async function deleteContactAction(formData: FormData) {
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

export async function completeActionItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const back = String(formData.get("back") ?? "/communications");
  const { comms } = getRepositories();
  await comms.completeActionItem(id);
  revalidatePath(back);
}
