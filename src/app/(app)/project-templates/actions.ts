"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import type { ProjectTemplateInput } from "@/lib/data/repositories";

/**
 * Project-template authoring + instantiation actions (ADR-0070 E1, #352).
 * Templates are admin-editable project playbooks; authoring is `delivery:write`,
 * the same gate as project/type management.
 *
 * The nested milestone/item tree is too deep for flat FormData, so the client form
 * serializes the whole `ProjectTemplateInput` into a single hidden `payload` JSON
 * field; here we parse, defensively coerce, and persist in one transaction.
 */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Parse + validate the client tree payload into a ProjectTemplateInput. Throws on garbage. */
function parsePayload(raw: string): ProjectTemplateInput {
  const p = JSON.parse(raw) as Record<string, unknown>;
  const name = String(p.name ?? "").trim();
  if (!name) throw new Error("Template name is required.");
  const milestonesRaw = Array.isArray(p.milestones) ? p.milestones : [];
  const milestones = milestonesRaw.map((mr) => {
    const m = mr as Record<string, unknown>;
    const itemsRaw = Array.isArray(m.items) ? m.items : [];
    return {
      name: String(m.name ?? "").trim() || "Milestone",
      offsetDays: num(m.offsetDays),
      durationDays: num(m.durationDays),
      items: itemsRaw.map((ir) => {
        const it = ir as Record<string, unknown>;
        const kind = it.kind === "task" ? "task" : "step";
        return {
          kind: kind as "step" | "task",
          title: String(it.title ?? "").trim() || "Item",
          offsetDays: num(it.offsetDays),
          durationDays: num(it.durationDays),
        };
      }),
    };
  });
  if (milestones.length === 0) throw new Error("A template needs at least one milestone.");
  return {
    key: slugify(name),
    name,
    description: String(p.description ?? "").trim() || null,
    projectTypeId: p.projectTypeId ? String(p.projectTypeId) : null,
    milestones,
  };
}

export async function createProjectTemplateAction(formData: FormData) {
  await requireCapability("delivery:write");
  const input = parsePayload(String(formData.get("payload") ?? "{}"));
  const { crm } = getRepositories();
  await crm.createProjectTemplate(input);
  revalidatePath("/project-templates");
  redirect("/project-templates");
}

/**
 * In-place edit of an existing project template (ADR-0070 E1, #634). Reuses the same
 * `payload` JSON contract + parser as create; the data layer re-snapshots the
 * milestone/item tree and refuses a protected default. Gated `delivery:write`, the
 * same gate as authoring. Editing a template never retro-mutates live projects
 * (apply is a snapshot, ADR-0070).
 */
export async function updateProjectTemplateAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Template id is required.");
  const input = parsePayload(String(formData.get("payload") ?? "{}"));
  const { crm } = getRepositories();
  await crm.updateProjectTemplate(id, input);
  revalidatePath("/project-templates");
  revalidatePath(`/project-templates/${id}`);
  redirect(`/project-templates/${id}`);
}

export async function deleteProjectTemplateAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { crm } = getRepositories();
  await crm.deleteProjectTemplate(id);
  revalidatePath("/project-templates");
}

/**
 * Instantiate a project template into a new project (ADR-0070 E1, #352): snapshot
 * the template's milestones + tasks onto a fresh project, then redirect to it.
 * Gated `delivery:write` (the same gate as project creation). The protected
 * onboarding template delegates to the hard-coded playbook server-side.
 */
export async function instantiateProjectTemplateAction(formData: FormData) {
  await requireCapability("delivery:write");
  const projectTemplateId = String(formData.get("projectTemplateId") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const projectTypeId = String(formData.get("projectTypeId") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  if (!projectTemplateId || !accountId || !name || !projectTypeId) {
    throw new Error("Account, project name, type, and template are required.");
  }
  const { crm } = getRepositories();
  const projectId = await crm.instantiateProjectTemplate({
    projectTemplateId,
    accountId,
    name,
    projectTypeId,
    startDate,
  });
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}
