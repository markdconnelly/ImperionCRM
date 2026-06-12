"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { ASSESSMENT_DIMENSIONS } from "@/lib/assessment";
import { ticketsService } from "@/lib/services";
import type { SbrInput, SbrScoreInput } from "@/lib/data/repositories";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function orNull(v: string): string | null {
  return v === "" ? null : v;
}

function parseSbr(formData: FormData): SbrInput {
  return {
    accountId: str(formData, "accountId"),
    contactId: orNull(str(formData, "contactId")),
    benchmarkAssessmentId: orNull(str(formData, "benchmarkAssessmentId")),
    reviewDate: str(formData, "reviewDate"),
    periodLabel: orNull(str(formData, "periodLabel")),
    status: str(formData, "status") || "scheduled",
    concerns: orNull(str(formData, "concerns")),
    summary: orNull(str(formData, "summary")),
    nextActions: orNull(str(formData, "nextActions")),
  };
}

function parseScores(formData: FormData): SbrScoreInput[] {
  return ASSESSMENT_DIMENSIONS.map((d) => ({
    dimension: d.key,
    rating: orNull(str(formData, `score_${d.key}`)),
    note: null,
  }));
}

function parseTicketIds(formData: FormData): string[] {
  return formData.getAll("ticketIds").map(String).filter((s) => s !== "");
}

/**
 * Queue-ticket side effect (#99): every Business Review files exactly one
 * Autotask ticket in the business-review queue via the backend's idempotent
 * ticket API (backend #19 — origin {business_review, sbrId} is the server-side
 * idempotency identity, so retries link instead of duplicating; the created
 * ticket row carries source_sbr_id and surfaces on the SBR record). A ticket
 * failure must NEVER fail the review — the SBR exists either way; we surface a
 * non-blocking notice and the record page offers a retry.
 */
async function fileBusinessReviewTicket(
  id: string,
  input: Pick<SbrInput, "accountId" | "periodLabel" | "reviewDate">,
): Promise<boolean> {
  try {
    await ticketsService.createTicket({
      queue: "business-review",
      title: `Business Review — ${input.periodLabel ?? input.reviewDate}`,
      description:
        "Strategic Business Review created in Imperion CRM. " +
        `Review date: ${input.reviewDate}.`,
      accountId: input.accountId,
      origin: { type: "business_review", id },
    });
    return true;
  } catch (err) {
    console.error(`[sbr] business-review queue ticket failed for ${id}:`, err);
    return false;
  }
}

export async function createSbrAction(formData: FormData) {
  await requireCapability("delivery:write");
  const { engagements } = getRepositories();
  const input = parseSbr(formData);
  const id = await engagements.createSbr(input);
  await engagements.saveSbrScores(id, parseScores(formData));
  await engagements.setSbrTickets(id, parseTicketIds(formData));
  const ticketOk = await fileBusinessReviewTicket(id, input);
  revalidatePath("/sbr");
  redirect(ticketOk ? "/sbr" : "/sbr?ticket=failed");
}

/** Retry filing the queue ticket from the SBR record — idempotent (backend #19). */
export async function createSbrTicketAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("sbrId") ?? "").trim();
  if (!id) return;
  const { engagements } = getRepositories();
  const sbr = await engagements.getSbr(id);
  if (!sbr) return;
  const ticketOk = await fileBusinessReviewTicket(id, {
    accountId: sbr.accountId,
    periodLabel: sbr.periodLabel,
    reviewDate: sbr.reviewDate,
  });
  revalidatePath(`/sbr/${id}`);
  if (!ticketOk) redirect(`/sbr/${id}?ticket=failed`);
}

export async function updateSbrAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "");
  const { engagements } = getRepositories();
  await engagements.updateSbr(id, parseSbr(formData));
  await engagements.saveSbrScores(id, parseScores(formData));
  await engagements.setSbrTickets(id, parseTicketIds(formData));
  revalidatePath("/sbr");
  redirect("/sbr");
}

export async function deleteSbrAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "");
  const { engagements } = getRepositories();
  await engagements.deleteSbr(id);
  revalidatePath("/sbr");
}

// ── Provenance: spawn downstream work from an SBR (ADR-0023) ─────────────────

export async function spawnOpportunityFromSbr(formData: FormData) {
  await requireCapability("delivery:write");
  const sbrId = String(formData.get("sbrId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const { engagements } = getRepositories();
  await engagements.spawnOpportunity({
    accountId,
    name: "Expansion opportunity",
    salesStage: "qualified",
    amountMrr: null,
    sourceDiscoveryId: null,
    sourceAssessmentId: null,
    sourceSbrId: sbrId,
  });
  redirect("/pipeline");
}

export async function spawnTicketFromSbr(formData: FormData) {
  await requireCapability("delivery:write");
  const sbrId = String(formData.get("sbrId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const { engagements } = getRepositories();
  await engagements.spawnTicket({
    accountId,
    title: "SBR follow-up item",
    sourceAssessmentId: null,
    sourceSbrId: sbrId,
  });
  redirect("/tickets");
}
