"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { str, strOr, strOrNull } from "@/lib/form-data";
import type { ProjectInput } from "@/lib/data/repositories";

/**
 * Project CRUD for the project board (ADR-0052, #95). The Onboarding page —
 * the easy-mode surface for the protected onboarding type — shares these
 * actions; `returnTo` (allowlisted) sends the user back to whichever surface
 * they came from.
 */

const RETURN_TO = ["/projects", "/onboarding"] as const;

function returnTarget(formData: FormData): string {
  const raw = String(formData.get("returnTo") ?? "");
  return (RETURN_TO as readonly string[]).includes(raw) ? raw : "/projects";
}

function revalidateProjectSurfaces() {
  revalidatePath("/projects");
  revalidatePath("/projects/[id]", "page");
  revalidatePath("/onboarding");
}

function parse(formData: FormData): ProjectInput {
  return {
    accountId: str(formData, "accountId"),
    opportunityId: strOrNull(formData, "opportunityId"),
    name: str(formData, "name"),
    projectTypeId: str(formData, "projectTypeId"),
    ownerUserId: strOrNull(formData, "ownerUserId"),
    status: strOr(formData, "status", "not_started"),
    targetLiveDate: strOrNull(formData, "targetLiveDate"),
    notes: strOrNull(formData, "notes"),
  };
}

export async function createProjectAction(formData: FormData) {
  await requireCapability("delivery:write");
  const { crm } = getRepositories();
  await crm.createProject(parse(formData));
  revalidateProjectSurfaces();
  redirect(returnTarget(formData));
}

export async function updateProjectAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.updateProject(id, parse(formData));
  revalidateProjectSurfaces();
  redirect(returnTarget(formData));
}

/** Project status enum values — the kanban board columns (#441, ADR-0066 C1). */
const BOARD_STATUSES = ["not_started", "in_progress", "blocked", "complete"] as const;

/**
 * Persist a project's status from a kanban drop (#441). Same
 * `delivery:write`-guarded path as the edit form, status-allowlisted, no
 * redirect (the board refreshes in place). Mirrors `moveTaskAction`.
 */
export async function moveProjectAction(id: string, status: string) {
  await requireCapability("delivery:write");
  const projectId = id.trim();
  if (!projectId) return;
  if (!(BOARD_STATUSES as readonly string[]).includes(status)) return;
  const { crm } = getRepositories();
  await crm.setProjectStatus(projectId, status);
  revalidateProjectSurfaces();
}

/**
 * Re-type a project from the kanban board when grouped by type (#443,
 * ADR-0066 C1-F2). The target is validated against the live project_type table
 * (not a static allowlist — types are data, ADR-0052) before the write, so a
 * forged id is rejected rather than hitting the FK. Same audited path as the
 * status move; no redirect.
 */
export async function moveProjectTypeAction(id: string, projectTypeId: string) {
  await requireCapability("delivery:write");
  const projectId = id.trim();
  if (!projectId || !projectTypeId) return;
  const { crm } = getRepositories();
  const types = await crm.listProjectTypes();
  if (!types.some((t) => t.id === projectTypeId)) return;
  await crm.setProjectType(projectId, projectTypeId);
  revalidateProjectSurfaces();
}

export async function deleteProjectAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "");
  const { crm } = getRepositories();
  await crm.deleteProject(id);
  revalidateProjectSurfaces();
}

// ── Project types — data, not code (ADR-0052 §1) ─────────────────────────────

/** Stable machine key from a display name: 'M365 Migration' → 'm365-migration'. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createProjectTypeAction(formData: FormData) {
  await requireCapability("delivery:write");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const key = slugify(name);
  if (!name || !key) return;
  const { crm } = getRepositories();
  try {
    await crm.createProjectType({ key, name, description: description === "" ? null : description });
  } catch {
    // Duplicate name or mock mode — the board re-renders unchanged.
  }
  revalidatePath("/projects");
}

export async function deleteProjectTypeAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { crm } = getRepositories();
  try {
    await crm.deleteProjectType(id);
  } catch {
    // Type in use (RESTRICT FK) or mock mode — refuse silently; the UI only
    // offers delete on unprotected, zero-project types.
  }
  revalidatePath("/projects");
}

// ── Quick task creation from a project (one task model, ADR-0052 §2) ─────────

export async function createProjectTaskAction(formData: FormData) {
  await requireCapability("delivery:write");
  const projectId = String(formData.get("projectId") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const dueAt = String(formData.get("dueAt") ?? "").trim();
  const startAt = String(formData.get("startAt") ?? "").trim();
  const estimate = String(formData.get("estimate") ?? "").trim();
  if (!projectId || !title) return;
  const { crm } = getRepositories();
  await crm.createTask({
    accountId: accountId === "" ? null : accountId,
    title,
    detail: null,
    status: "open",
    category: "project", // tasks created from a project (ADR-0052 §2)
    dueAt: dueAt === "" ? null : dueAt,
    projectId,
    // Start date (#580) + estimate (ADR-0069 D1, #346) from the project quick-add.
    startAt: startAt === "" ? null : startAt,
    estimate: estimate === "" ? null : estimate,
    estimateUnit: estimate === "" ? null : "hours",
  });
  revalidatePath("/projects/[id]", "page");
  revalidatePath("/tasks");
}

// ── Baselines / planned-vs-actual (ADR-0069 D6, #351) ───────────────────────

/**
 * Capture a project baseline: freeze its current target go-live + task due dates
 * into an immutable snapshot (#351). Re-baselining after a scope change is
 * allowed — slippage is always measured against the latest. Same
 * `delivery:write`-audited path; no redirect, the detail page re-renders.
 */
export async function captureProjectBaselineAction(formData: FormData) {
  await requireCapability("delivery:write");
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) return;
  const { crm } = getRepositories();
  await crm.captureProjectBaseline(projectId);
  revalidatePath("/projects/[id]", "page");
}

// ── Project meetings (ADR-0052 §5, #97) ──────────────────────────────────────

/**
 * Log a meeting against a project: interaction (source/kind 'meeting',
 * project_id set) + its 1:1 meeting silver row. Meetings stay communication
 * objects — they render on the comms timeline and open as communications.
 */
export async function createProjectMeetingAction(formData: FormData) {
  await requireCapability("delivery:write");
  const projectId = String(formData.get("projectId") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const occurredAt = String(formData.get("occurredAt") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!projectId || !title) return;
  const { comms } = getRepositories();
  await comms.createMeeting({
    accountId: accountId === "" ? null : accountId,
    contactId: null,
    opportunityId: null,
    projectId,
    title,
    occurredAt: occurredAt === "" ? null : occurredAt,
    notes: notes === "" ? null : notes,
  });
  revalidatePath("/projects/[id]", "page");
  revalidatePath("/communications");
}
