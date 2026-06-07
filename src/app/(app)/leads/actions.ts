"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/data";

/**
 * Resolve an inbound capture into a contact (ADR-0024) — starts a profile and, in a
 * later phase, kicks enrichment + nurture. Scaffold: marks the event resolved.
 */
export async function resolveEventAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { leads } = getRepositories();
  await leads.resolveEvent(id);
  revalidatePath("/leads");
}
