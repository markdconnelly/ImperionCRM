"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import type { CampaignInput, AudienceInput, AdInput, AudienceCriterion } from "@/lib/data/repositories";

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

/** Collect the criteria rows (criteriaKey0/criteriaValue0 … up to AUDIENCE_ROWS). */
const AUDIENCE_ROWS = 5;
function parseCriteria(formData: FormData): AudienceCriterion[] {
  const out: AudienceCriterion[] = [];
  for (let i = 0; i < AUDIENCE_ROWS; i++) {
    const key = String(formData.get(`criteriaKey${i}`) ?? "").trim();
    const value = String(formData.get(`criteriaValue${i}`) ?? "").trim();
    if (key && value) out.push({ key, value });
  }
  return out;
}

function parseAudience(formData: FormData): AudienceInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: orNull(formData.get("description")),
    kind: String(formData.get("kind") ?? "static"),
    criteria: parseCriteria(formData),
  };
}

export async function createAudienceAction(formData: FormData) {
  const { campaigns } = getRepositories();
  await campaigns.createAudience(parseAudience(formData));
  revalidatePath("/campaigns");
  redirect("/campaigns");
}

/** Preview matching members before committing (carried back via query params). */
export async function previewAudienceAction(formData: FormData) {
  const params = new URLSearchParams();
  params.set("name", String(formData.get("name") ?? ""));
  params.set("description", String(formData.get("description") ?? ""));
  params.set("kind", String(formData.get("kind") ?? "static"));
  for (let i = 0; i < AUDIENCE_ROWS; i++) {
    const key = String(formData.get(`criteriaKey${i}`) ?? "").trim();
    const value = String(formData.get(`criteriaValue${i}`) ?? "").trim();
    if (key && value) {
      params.append("k", key);
      params.append("v", value);
    }
  }
  params.set("preview", "1");
  redirect(`/campaigns/audiences/new?${params.toString()}`);
}

export async function createAdAction(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "");
  if (!campaignId) return;
  const input: AdInput = {
    name: String(formData.get("name") ?? "").trim(),
    status: String(formData.get("status") ?? "draft"),
    creative: orNull(formData.get("creative")),
  };
  const { campaigns } = getRepositories();
  await campaigns.createAd(campaignId, input);
  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}`);
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
