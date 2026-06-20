"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOrNull } from "@/lib/form-data";
import { validateAttachment } from "@/lib/attachments";
import { knowledgeService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import type { OpportunityKnowledgeRef } from "@/lib/data/repositories";
import type { ContactCrmStage } from "@/types";

const CONTACT_STAGES: ContactCrmStage[] = ["audience", "lead", "prospect", "client"];

/** Move a contact along the lifecycle (Audience → … → Managed Services Client). */
export async function moveContactStageAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  await requireCapability("sales:write");
  if (!id || !CONTACT_STAGES.includes(stage as ContactCrmStage)) return;
  const { crm } = getRepositories();
  await crm.setContactStage(id, stage as ContactCrmStage);
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  revalidatePath("/contacts");
}

/** Move an opportunity to an adjacent sales stage from the pipeline board. */
export async function moveOpportunityAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  await requireCapability("sales:write");
  if (!id || !stage) return;
  const { crm } = getRepositories();
  await crm.setOpportunityStage(id, stage);
  revalidatePath("/pipeline");
}

/**
 * Save sales-team notes + (optionally) upload a knowledge file to an opportunity
 * (#429, epic #425). The sales team captures the context a machine feed can't — running
 * notes and uploaded documents about the customer/deal — written to the
 * `website_opportunities` bronze (source='website', highest merge precedence per
 * ADR-0039, so a human override wins). The merge into silver `opportunity` is a
 * pipeline transform (ADR-0042); this only writes the website bronze.
 *
 * Split by the ADR-0042 boundary like the receipt upload: the BACKEND owns the file
 * bytes (AV-scan + sha256 + private blob, ADR-0069), the FRONT END owns the bronze row.
 * `sales:write` gated; the acting user comes from the SESSION (never the form). Every
 * failure degrades to a `?notice=` redirect — the page never sees an exception.
 */
export async function addOpportunityKnowledgeAction(formData: FormData) {
  await requireCapability("sales:write");
  const { crm } = getRepositories();

  const opportunityId = str(formData, "opportunityId");
  if (!opportunityId) return;

  const back = (notice?: string) =>
    redirect(
      `/pipeline/${opportunityId}${notice ? `?notice=${encodeURIComponent(notice)}` : ""}`,
    );

  // Resolve the deal so the website bronze is self-describing for the merge (title /
  // stage / account_ref mirror the merged silver). A bad id just no-ops back.
  const opportunity = await crm.getOpportunity(opportunityId);
  if (!opportunity) return back();

  const session = await auth();
  const actingUserId = await resolveAppUserIdByEmail(session?.user?.email ?? "");

  const notes = strOrNull(formData, "notes");

  // Optional knowledge file. The backend re-validates authoritatively; this is a fast
  // local reject against the shared allowlist + size cap (ADR-0069) so an obviously-
  // wrong file never makes a round trip.
  const added: OpportunityKnowledgeRef[] = [];
  const file = formData.get("knowledge");
  if (file instanceof File && file.size > 0) {
    const contentType = file.type || "application/octet-stream";
    const rejection = validateAttachment(contentType, file.size);
    if (rejection === "too_large") return back("That file is over the 25 MB limit.");
    if (rejection === "type_not_allowed") {
      return back("That file type isn’t allowed — upload a document, image, or archive.");
    }

    const bytes = await file.arrayBuffer();
    const outcome = await callServiceWithFallback(
      () =>
        knowledgeService.upload({
          bytes,
          contentType,
          filename: file.name || "knowledge",
          actorUserId: actingUserId ?? "",
        }),
      {
        label: "addOpportunityKnowledgeAction",
        notConfigured:
          "Knowledge storage isn’t wired in this environment yet — the upload backend is " +
          "unconfigured. Your notes were saved; re-upload the file once it’s live.",
        failed:
          "The file couldn’t be uploaded — it may be an unsupported type or too large, or " +
          "the backend rejected it. Your notes were saved; try a smaller/allowed file.",
      },
    );
    if (outcome.ok) {
      added.push({
        blobPath: outcome.value.blobPath,
        filename: file.name || "knowledge",
        contentType: outcome.value.contentType ?? contentType,
        byteSize: outcome.value.byteSize ?? file.size,
        contentHash: outcome.value.contentHash,
        uploadedAt: new Date().toISOString(),
        uploadedByUserId: actingUserId,
      });
    } else {
      // Persist the notes anyway (the upload is the only failed leg), then notice.
      await crm.addOpportunityKnowledge({
        opportunityId,
        accountRef: opportunity.accountId,
        title: opportunity.name,
        stage: opportunity.stage,
        ownerUserId: actingUserId,
        notes,
        addedKnowledge: [],
      });
      revalidatePath(`/pipeline/${opportunityId}`);
      return back(outcome.message);
    }
  }

  await crm.addOpportunityKnowledge({
    opportunityId,
    accountRef: opportunity.accountId,
    title: opportunity.name,
    stage: opportunity.stage,
    ownerUserId: actingUserId,
    notes,
    addedKnowledge: added,
  });
  revalidatePath(`/pipeline/${opportunityId}`);
  redirect(`/pipeline/${opportunityId}`);
}
