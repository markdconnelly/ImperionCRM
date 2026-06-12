"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { indexedPairs, str, strOr, strOrNull } from "@/lib/form-data";
import type { CampaignInput, AudienceInput, AdInput, AudienceCriterion } from "@/lib/data/repositories";

function parseCampaign(formData: FormData): CampaignInput {
  return {
    name: str(formData, "name"),
    platform: strOr(formData, "platform", "facebook"),
    objective: strOrNull(formData, "objective"),
    status: strOr(formData, "status", "draft"),
    budget: strOrNull(formData, "budget"),
    startAt: strOrNull(formData, "startAt"),
    endAt: strOrNull(formData, "endAt"),
    eventId: strOrNull(formData, "eventId"),
  };
}

export async function createCampaignAction(formData: FormData) {
  await requireCapability("sales:write");
  const { campaigns } = getRepositories();
  await campaigns.createCampaign(parseCampaign(formData));
  revalidatePath("/campaigns");
  redirect("/campaigns");
}

/** Collect the criteria rows (criteriaKey0/criteriaValue0 … up to AUDIENCE_ROWS). */
const AUDIENCE_ROWS = 5;
function parseCriteria(formData: FormData): AudienceCriterion[] {
  return indexedPairs(formData, "criteriaKey", "criteriaValue", AUDIENCE_ROWS);
}

function parseAudience(formData: FormData): AudienceInput {
  return {
    name: str(formData, "name"),
    description: strOrNull(formData, "description"),
    kind: strOr(formData, "kind", "static"),
    criteria: parseCriteria(formData),
  };
}

export async function createAudienceAction(formData: FormData) {
  await requireCapability("sales:write");
  const { campaigns } = getRepositories();
  await campaigns.createAudience(parseAudience(formData));
  revalidatePath("/campaigns");
  redirect("/campaigns");
}

/** Preview matching members before committing (carried back via query params). */
export async function previewAudienceAction(formData: FormData) {
  await requireCapability("sales:write");
  const params = new URLSearchParams();
  params.set("name", String(formData.get("name") ?? ""));
  params.set("description", String(formData.get("description") ?? ""));
  params.set("kind", strOr(formData, "kind", "static"));
  for (const { key, value } of parseCriteria(formData)) {
    params.append("k", key);
    params.append("v", value);
  }
  params.set("preview", "1");
  redirect(`/campaigns/audiences/new?${params.toString()}`);
}

export async function createAdAction(formData: FormData) {
  await requireCapability("sales:write");
  const campaignId = String(formData.get("campaignId") ?? "");
  if (!campaignId) return;
  const input: AdInput = {
    name: str(formData, "name"),
    status: strOr(formData, "status", "draft"),
    creative: strOrNull(formData, "creative"),
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
  await requireCapability("sales:write");
  const id = String(formData.get("id") ?? "");
  const { campaigns } = getRepositories();
  const eligible = await campaigns.launchAudience(id);
  redirect(`/campaigns/audiences/${id}?launched=${eligible}`);
}

// ── Campaign Sends (ADR-0053 §4 — save/schedule only; the backend executor fires) ──

/**
 * Create an email/SMS blast as draft or scheduled. NOTHING fires here: due sends
 * are walked by the backend executor (consent-gated per recipient at fire time);
 * until it exists the send sits in its honest scheduled/draft state — never a
 * faked success (stubbed-not-broken).
 */
export async function createSendAction(formData: FormData) {
  await requireCapability("sales:write");
  const campaignId = String(formData.get("campaignId") ?? "");
  if (!campaignId) return;
  const channel = strOr(formData, "channel", "email") === "sms" ? "sms" : "email";
  const recipientScope =
    strOr(formData, "recipientScope", "audience") === "event_registrants"
      ? "event_registrants"
      : "audience";
  const audienceId = strOrNull(formData, "audienceId");
  if (recipientScope === "audience" && !audienceId) return; // DB CHECK backstops this
  const scheduleMode = strOr(formData, "scheduleMode", "draft"); // draft|absolute|offset
  const offsetMinutes = Math.trunc(Number(str(formData, "eventOffsetMinutes")));
  const { campaigns } = getRepositories();
  await campaigns.createSend(campaignId, {
    channel,
    recipientScope,
    audienceId,
    subject: strOrNull(formData, "subject"),
    bodyMarkdown: strOrNull(formData, "bodyMarkdown"),
    smsText: strOrNull(formData, "smsText"),
    sendAt: scheduleMode === "absolute" ? strOrNull(formData, "sendAt") : null,
    eventOffsetMinutes:
      scheduleMode === "offset" && Number.isFinite(offsetMinutes) ? offsetMinutes : null,
    schedule: scheduleMode !== "draft",
  });
  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}`);
}

/** Cancel a draft/scheduled send (sending/sent are immutable history, §5). */
export async function cancelSendAction(formData: FormData) {
  await requireCapability("sales:write");
  const campaignId = String(formData.get("campaignId") ?? "");
  const sendId = String(formData.get("sendId") ?? "");
  if (!sendId) return;
  const { campaigns } = getRepositories();
  await campaigns.cancelSend(sendId);
  revalidatePath(`/campaigns/${campaignId}`);
}
