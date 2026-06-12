"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOr, strOrNull } from "@/lib/form-data";

export async function createHookAction(formData: FormData) {
  await requireCapability("sales:write");
  const note = strOrNull(formData, "config");
  const kind = strOr(formData, "kind", "web_form");
  // Event-registration hooks carry the event id in config (ADR-0053 §2) —
  // resolution uses it to link the signup to the event.
  const eventId = kind === "event_registration" ? strOrNull(formData, "eventId") : null;
  const config: Record<string, string> = {};
  if (note) config.note = note;
  if (eventId) config.eventId = eventId;
  const { leads } = getRepositories();
  await leads.createHook({
    name: str(formData, "name"),
    kind,
    active: strOr(formData, "active", "true") === "true",
    config: Object.keys(config).length > 0 ? config : null,
  });
  revalidatePath("/leads");
  redirect("/leads");
}

/**
 * Resolve an inbound capture into a contact (ADR-0024) — starts a profile and, in a
 * later phase, kicks enrichment + nurture. Scaffold: marks the event resolved.
 */
export async function resolveEventAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  const { leads } = getRepositories();
  await leads.resolveEvent(id);
  revalidatePath("/leads");
}
