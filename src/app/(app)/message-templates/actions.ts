"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageCampaigns } from "@/lib/auth/roles";
import type { MessageTemplateChannel, MessageTemplateInput } from "@/types";

/**
 * Message-template server actions (#731, ADR-0073). Templates are the render-content
 * store a journey send step references by id; the backend journey runner (BE #174)
 * renders against them. Writes are gated by `canManageCampaigns` (admin | sales) — the
 * same marketing-capable roles that author journeys/campaigns — re-asserted server-side.
 */

async function requireWriter(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");
  const roles = await getSessionRoles();
  if (!canManageCampaigns(roles)) {
    throw new Error("You do not have permission to manage message templates.");
  }
  return email;
}

function toInput(formData: FormData): MessageTemplateInput {
  const channel: MessageTemplateChannel =
    String(formData.get("channel") ?? "email") === "sms" ? "sms" : "email";
  const subject = String(formData.get("subject") ?? "").trim();
  const html = String(formData.get("html") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  // Channel-gated content mirrors the migration's CHECK constraints: email keeps
  // subject/html and drops body; sms keeps body and drops subject/html.
  const mergeFields = String(formData.get("mergeFields") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    name: String(formData.get("name") ?? "").trim(),
    channel,
    subject: channel === "email" ? subject || null : null,
    html: channel === "email" ? html || null : null,
    body: channel === "sms" ? body || null : null,
    mergeFields,
  };
}

/** Validate the channel-gated content contract before a write (defense-in-depth). */
function assertValid(input: MessageTemplateInput): void {
  if (!input.name) throw new Error("Template name is required.");
  if (input.channel === "email" && !input.subject) {
    throw new Error("An email template needs a subject.");
  }
  if (input.channel === "sms" && !input.body) {
    throw new Error("An SMS template needs a body.");
  }
}

export async function createTemplateAction(formData: FormData): Promise<void> {
  const email = await requireWriter();
  const input = toInput(formData);
  assertValid(input);
  const { messageTemplates } = getRepositories();
  await messageTemplates.createTemplate(input, email);
  revalidatePath("/message-templates");
  redirect("/message-templates");
}

export async function updateTemplateAction(formData: FormData): Promise<void> {
  await requireWriter();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing template id.");
  const input = toInput(formData);
  assertValid(input);
  const { messageTemplates } = getRepositories();
  await messageTemplates.updateTemplate(id, input);
  revalidatePath("/message-templates");
  redirect("/message-templates");
}

export async function deleteTemplateAction(formData: FormData): Promise<void> {
  await requireWriter();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const { messageTemplates } = getRepositories();
  await messageTemplates.deleteTemplate(id);
  revalidatePath("/message-templates");
  redirect("/message-templates");
}
