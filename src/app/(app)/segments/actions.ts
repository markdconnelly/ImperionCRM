"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageCampaigns } from "@/lib/auth/roles";
import {
  parseSegmentRule,
  serializeSegmentRule,
  previewRuleMembers,
  type SegmentRule,
} from "@/lib/segment";
import type { SegmentInput, SegmentType } from "@/types";

/**
 * Segment-management server actions (ADR-0073 decision 2, #421). Writes are gated by
 * `canManageCampaigns` (admin | sales) — the same marketing-capable roles that author
 * campaigns/journeys (ADR-0053 §8); reads stay open under the Marketing group guard.
 * Every write re-asserts the gate server-side (defense-in-depth, never trusting the UI).
 * The rule predicate is normalized through `lib/segment.ts` before storage so the blob is
 * always well-formed; the authoritative rule MATERIALIZATION is a backend/pipeline process
 * (ADR-0042) — these actions add the rule-matched members the surface previewed.
 */

async function requireWriter(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");
  const roles = await getSessionRoles();
  if (!canManageCampaigns(roles)) {
    throw new Error("You do not have permission to manage segments.");
  }
  return email;
}

function readType(formData: FormData): SegmentType {
  return String(formData.get("type") ?? "manual") === "rule" ? "rule" : "manual";
}

/** Build a rule from the posted clause arrays (parallel field/operator/value inputs). */
function readRule(formData: FormData): SegmentRule {
  const fields = formData.getAll("clauseField").map(String);
  const operators = formData.getAll("clauseOperator").map(String);
  const values = formData.getAll("clauseValue").map(String);
  const match = String(formData.get("match") ?? "all") === "any" ? "any" : "all";
  const clauses = fields.map((field, i) => ({
    field,
    operator: operators[i] ?? "contains",
    value: values[i] ?? "",
  }));
  // Round-trip through the parser so unknown fields/operators are dropped and the blob is
  // canonical before it is stored.
  return parseSegmentRule({ match, clauses });
}

function toInput(formData: FormData): SegmentInput {
  const type = readType(formData);
  const description = String(formData.get("description") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: description.length > 0 ? description : null,
    type,
    ruleJson: type === "rule" ? serializeSegmentRule(readRule(formData)) : null,
  };
}

export async function createSegmentAction(formData: FormData): Promise<void> {
  const email = await requireWriter();
  const input = toInput(formData);
  if (!input.name) throw new Error("Segment name is required.");
  const { segments } = getRepositories();
  const id = await segments.createSegment(input, email);
  revalidatePath("/segments");
  redirect(`/segments/${id}`);
}

export async function updateSegmentAction(formData: FormData): Promise<void> {
  await requireWriter();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing segment id.");
  const input = toInput(formData);
  if (!input.name) throw new Error("Segment name is required.");
  const { segments } = getRepositories();
  await segments.updateSegment(id, input);
  revalidatePath("/segments");
  revalidatePath(`/segments/${id}`);
  redirect(`/segments/${id}`);
}

export async function deleteSegmentAction(formData: FormData): Promise<void> {
  await requireWriter();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const { segments } = getRepositories();
  await segments.deleteSegment(id);
  revalidatePath("/segments");
  redirect("/segments");
}

/** Add a single contact manually, or a set of selected contacts (bulk). */
export async function addSegmentMembersAction(formData: FormData): Promise<void> {
  const email = await requireWriter();
  const segmentId = String(formData.get("segmentId") ?? "").trim();
  if (!segmentId) throw new Error("Missing segment id.");
  const contactIds = formData.getAll("contactId").map(String).filter(Boolean);
  if (contactIds.length === 0) return;
  // > 1 selected contact = a bulk add; a single add is "manual". Both are explicit edits.
  const source = contactIds.length > 1 ? "bulk" : "manual";
  const { segments } = getRepositories();
  await segments.addSegmentMembers(segmentId, contactIds, source, email);
  revalidatePath(`/segments/${segmentId}`);
}

/**
 * Materialize a rule segment's matched contacts into membership (source = 'rule'). The
 * surface previews the match with `previewRuleMembers`; this action re-evaluates the
 * stored rule against the current contacts and adds the matches idempotently. This is a
 * convenience materialization from the GUI — the authoritative, scheduled recompute is the
 * backend/pipeline evaluator's job (ADR-0042).
 */
export async function materializeRuleAction(formData: FormData): Promise<void> {
  const email = await requireWriter();
  const segmentId = String(formData.get("segmentId") ?? "").trim();
  if (!segmentId) throw new Error("Missing segment id.");
  const { segments, crm } = getRepositories();
  const segment = await segments.getSegment(segmentId);
  if (!segment || segment.type !== "rule") return;
  const rule = parseSegmentRule(segment.ruleJson);
  const contacts = await crm.listContacts();
  const matched = previewRuleMembers(rule, contacts).map((c) => c.id);
  if (matched.length > 0) {
    await segments.addSegmentMembers(segmentId, matched, "rule", email);
  }
  revalidatePath(`/segments/${segmentId}`);
}

export async function removeSegmentMemberAction(formData: FormData): Promise<void> {
  await requireWriter();
  const memberId = String(formData.get("memberId") ?? "").trim();
  const segmentId = String(formData.get("segmentId") ?? "").trim();
  if (!memberId) return;
  const { segments } = getRepositories();
  await segments.removeSegmentMember(memberId);
  if (segmentId) revalidatePath(`/segments/${segmentId}`);
}
