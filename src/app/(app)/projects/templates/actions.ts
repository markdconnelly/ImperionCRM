"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import type { DeliveryTemplateInput } from "@/lib/data/repositories";

/**
 * Delivery-template authoring actions (ADR-0081). Templates are the data-driven
 * provisioning playbooks the board picks from. Authoring is `delivery:write`,
 * the same gate as project/type management.
 *
 * The nested phase/task tree is too deep for flat FormData, so the client form
 * serializes the whole `DeliveryTemplateInput` into a single hidden `payload`
 * JSON field; here we parse, defensively coerce, and persist in one transaction.
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

/** Parse + validate the client tree payload into a DeliveryTemplateInput. Throws on garbage. */
function parsePayload(raw: string): DeliveryTemplateInput {
  const p = JSON.parse(raw) as Record<string, unknown>;
  const name = String(p.name ?? "").trim();
  if (!name) throw new Error("Template name is required.");
  const phasesRaw = Array.isArray(p.phases) ? p.phases : [];
  const phases = phasesRaw.map((ph) => {
    const phase = ph as Record<string, unknown>;
    const tasksRaw = Array.isArray(phase.tasks) ? phase.tasks : [];
    return {
      name: String(phase.name ?? "").trim() || "Phase",
      offsetDays: num(phase.offsetDays),
      durationDays: num(phase.durationDays),
      tasks: tasksRaw.map((tk) => {
        const t = tk as Record<string, unknown>;
        const dispatchesTicket = Boolean(t.dispatchesTicket);
        return {
          title: String(t.title ?? "").trim() || "Task",
          offsetDays: num(t.offsetDays),
          durationDays: num(t.durationDays),
          dispatchesTicket,
          // Ticket fields only meaningful when dispatching (CHECK enforces it too).
          ticketQueueId: dispatchesTicket && t.ticketQueueId != null ? num(t.ticketQueueId) : null,
          ticketTitle: dispatchesTicket ? (String(t.ticketTitle ?? "").trim() || null) : null,
          ticketLeadDays: dispatchesTicket ? num(t.ticketLeadDays) : 0,
        };
      }),
    };
  });
  return {
    key: slugify(name),
    name,
    description: String(p.description ?? "").trim() || null,
    version: Math.max(1, num(p.version) || 1),
    projectTypeId: p.projectTypeId ? String(p.projectTypeId) : null,
    isActive: p.isActive === undefined ? true : Boolean(p.isActive),
    phases,
  };
}

export async function createDeliveryTemplateAction(formData: FormData) {
  await requireCapability("delivery:write");
  const input = parsePayload(String(formData.get("payload") ?? "{}"));
  const { crm } = getRepositories();
  await crm.createDeliveryTemplate(input);
  revalidatePath("/projects/templates");
  redirect("/projects/templates");
}

export async function deleteDeliveryTemplateAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { crm } = getRepositories();
  await crm.deleteDeliveryTemplate(id);
  revalidatePath("/projects/templates");
}

/**
 * Instantiate a delivery template into the native intent plane (ADR-0080 §4,
 * ADR-0081 §3, #566): create the project + milestones + tasks + provisioning/fire
 * rows, then redirect to the new project. Gated `delivery:write`, the same gate as
 * template authoring + project management. No Autotask write here — the backend
 * executor picks the rows up once the contract gate flips to 'signed' (ADR-0042).
 */
export async function provisionFromTemplateAction(formData: FormData) {
  await requireCapability("delivery:write");
  const deliveryTemplateId = String(formData.get("deliveryTemplateId") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const projectTypeId = String(formData.get("projectTypeId") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const opportunityRaw = String(formData.get("opportunityId") ?? "").trim();
  if (!deliveryTemplateId || !accountId || !name || !projectTypeId) {
    throw new Error("Account, project name, type, and template are required.");
  }
  const { crm } = getRepositories();
  const projectId = await crm.instantiateDeliveryTemplate({
    deliveryTemplateId,
    accountId,
    name,
    projectTypeId,
    startDate,
    opportunityId: opportunityRaw === "" ? null : opportunityRaw,
  });
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}
