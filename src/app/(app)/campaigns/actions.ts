"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import type { CampaignInput, AudienceInput } from "@/lib/data/repositories";

function orNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function parseCampaign(formData: FormData): CampaignInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    platform: String(formData.get("platform") ?? "facebook"),
    objective: orNull(formData.get("objective")),
    status: String(formData.get("status") ?? "draft"),
    budget: orNull(formData.get("budget")),
    startAt: orNull(formData.get("startAt")),
    endAt: orNull(formData.get("endAt")),
  };
}

export async function createCampaignAction(formData: FormData) {
  const { campaigns } = getRepositories();
  await campaigns.createCampaign(parseCampaign(formData));
  revalidatePath("/campaigns");
  redirect("/campaigns");
}

function parseAudience(formData: FormData): AudienceInput {
  const raw = String(formData.get("definition") ?? "").trim();
  let definition: unknown = null;
  if (raw !== "") {
    try {
      definition = JSON.parse(raw);
    } catch {
      definition = { note: raw }; // tolerate free text in the scaffold
    }
  }
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: orNull(formData.get("description")),
    kind: String(formData.get("kind") ?? "static"),
    definition,
  };
}

export async function createAudienceAction(formData: FormData) {
  const { campaigns } = getRepositories();
  await campaigns.createAudience(parseAudience(formData));
  revalidatePath("/campaigns");
  redirect("/campaigns");
}

/**
 * Launch ads against an audience (ADR-0026). Consent-gated: only members with current
 * ad_targeting opt-in are eligible. The platform push is stubbed; we report the count.
 */
export async function launchAudienceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { campaigns } = getRepositories();
  const eligible = await campaigns.launchAudience(id);
  redirect(`/campaigns/audiences/${id}?launched=${eligible}`);
}
