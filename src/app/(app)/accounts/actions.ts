"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { requestMergeRefresh } from "@/lib/integrations/merge-refresh";
import { pipelineService } from "@/lib/services";
import { isBackendNotConfigured } from "@/lib/services/call-guard";
import type { AccountInput } from "@/lib/data/repositories";

function parse(formData: FormData): AccountInput {
  const relationship = String(formData.get("relationship") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    relationship: relationship === "" ? null : relationship,
    lifecycleStage: String(formData.get("lifecycleStage") ?? "prospect"),
    isActive: String(formData.get("isActive") ?? "true") === "true",
  };
}

export async function createAccountAction(formData: FormData) {
  await requireCapability("crm:write");
  const { crm } = getRepositories();
  await crm.createAccount(parse(formData));
  requestMergeRefresh(); // fire-and-forget merge nudge — never throws or blocks (#89)
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function updateAccountAction(formData: FormData) {
  await requireCapability("crm:write");
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.updateAccount(id, parse(formData));
  requestMergeRefresh(); // fire-and-forget (#89)
  revalidatePath("/accounts");
  redirect("/accounts");
}

/**
 * Re-classify this account's mapped Customer Tenants into posture silver right now
 * (ADR-0051 §2 two-tier refresh — this is the narrow cloud tier; pipeline ADR-0015).
 * Awaited, unlike the merge nudge: the user clicked FOR fresh posture, so the page
 * revalidates only after the pipeline has rewritten posture_policy/tenant_posture.
 * Degrades silently when PIPELINE_SERVICE_URL is unset (same contract as
 * refreshNowAction); other failures are logged, never thrown at the page.
 */
export async function refreshPostureAction(formData: FormData) {
  await requireCapability("crm:write");
  const accountId = String(formData.get("accountId") ?? "");
  if (!accountId) return;

  try {
    await pipelineService.refresh({ source: "posture", accountId });
  } catch (err) {
    // Unconfigured pipeline (#190 taxonomy) → quiet no-op; other failures logged.
    if (!isBackendNotConfigured(err)) {
      console.error(`refreshPostureAction(${accountId}) failed:`, err);
    }
  }
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath(`/accounts/${accountId}/posture`); // the posture page reuses this action (#159)
}

/**
 * Store an immutable Imperion Secure Score snapshot for this account right now
 * (ADR-0051 §5, #168 — the "Snapshot now" button on the posture page; pipeline
 * #38's posture_snapshot source, trigger 'on_demand'). Same degradation contract
 * as refreshPostureAction: unconfigured pipeline → quiet no-op, other failures
 * logged, never thrown at the page.
 */
export async function snapshotPostureAction(formData: FormData) {
  await requireCapability("crm:write");
  const accountId = String(formData.get("accountId") ?? "");
  if (!accountId) return;

  try {
    await pipelineService.refresh({
      source: "posture_snapshot",
      accountId,
      trigger: "on_demand",
    });
  } catch (err) {
    if (!isBackendNotConfigured(err)) {
      console.error(`snapshotPostureAction(${accountId}) failed:`, err);
    }
  }
  revalidatePath(`/accounts/${accountId}/posture`);
}

export async function deleteAccountAction(formData: FormData) {
  await requireCapability("crm:write");
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.deleteAccount(id);
  revalidatePath("/accounts");
}
