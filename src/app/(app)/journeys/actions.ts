"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { parseJourneyDefinition } from "@/lib/journey";
import type { JourneyDefinition } from "@/types";

// Server actions for the journey builder (ADR-0073, #399). A journey is a SINGLE
// object on the workflow substrate (decision 1): create inserts a workflow row of
// kind='journey'; save writes the whole `definition` jsonb back. Sends still cross
// the approval gate + autonomy dial at runtime (ADR-0058/0055) — this only authors
// structure. Marketing writes are gated on sales:write (same as campaigns/workflows).

export async function createJourneyAction(formData: FormData) {
  await requireCapability("sales:write");
  const name = String(formData.get("name") ?? "").trim() || "Untitled journey";
  const { workflows } = getRepositories();
  const id = await workflows.createJourney(name);
  revalidatePath("/journeys");
  redirect(`/journeys/${id}/edit`);
}

/**
 * Persist a journey edited in the client builder. The builder serialises the whole
 * definition into a hidden `definition` field; we defensively re-parse it (lib/journey)
 * so a tampered/oversized blob is normalised before it touches the row — never trusted.
 */
export async function saveJourneyAction(formData: FormData) {
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  let parsed: JourneyDefinition;
  try {
    parsed = parseJourneyDefinition(JSON.parse(String(formData.get("definition") ?? "{}")));
  } catch {
    parsed = parseJourneyDefinition(null);
  }

  const { workflows } = getRepositories();
  await workflows.saveJourney(id, {
    name: String(formData.get("name") ?? "").trim() || "Untitled journey",
    status: String(formData.get("status") ?? "paused"),
    definition: parsed,
  });
  revalidatePath("/journeys");
  revalidatePath(`/journeys/${id}`);
  redirect(`/journeys/${id}`);
}
