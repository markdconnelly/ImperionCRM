"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";

export async function createHookAction(formData: FormData) {
  await requireCapability("sales:write");
  const path = String(formData.get("config") ?? "").trim();
  const { leads } = getRepositories();
  await leads.createHook({
    name: String(formData.get("name") ?? "").trim(),
    kind: String(formData.get("kind") ?? "web_form"),
    active: String(formData.get("active") ?? "true") === "true",
    config: path === "" ? null : { note: path },
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
