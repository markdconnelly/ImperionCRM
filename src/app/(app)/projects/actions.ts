"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
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
  const opportunityId = String(formData.get("opportunityId") ?? "").trim();
  const ownerUserId = String(formData.get("ownerUserId") ?? "").trim();
  const targetLiveDate = String(formData.get("targetLiveDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  return {
    accountId: String(formData.get("accountId") ?? "").trim(),
    opportunityId: opportunityId === "" ? null : opportunityId,
    name: String(formData.get("name") ?? "").trim(),
    projectTypeId: String(formData.get("projectTypeId") ?? "").trim(),
    ownerUserId: ownerUserId === "" ? null : ownerUserId,
    status: String(formData.get("status") ?? "not_started"),
    targetLiveDate: targetLiveDate === "" ? null : targetLiveDate,
    notes: notes === "" ? null : notes,
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
  });
  revalidatePath("/projects/[id]", "page");
  revalidatePath("/tasks");
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
