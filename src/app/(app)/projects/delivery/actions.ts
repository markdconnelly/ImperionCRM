"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";

/**
 * Delivery-board fire-intent actions (ADR-0080 §4/§7, ADR-0042, #568). The board
 * STEERS firing but never fires: each action writes only the *intent* — moves a
 * `task_ticket_fire` row to fire_state='scheduled' with a `scheduled_for` — and
 * the backend executor is the one that creates the Autotask Ticket. Both actions
 * are gated `delivery:write`, the same gate as project management + template
 * authoring + instantiation. No Autotask write here (the boundary).
 */

/**
 * "Schedule fire": set the JIT firing date the board picked/edited. The executor
 * fires the row once its window arrives. Defensive on missing input.
 */
export async function scheduleFireAction(formData: FormData) {
  await requireCapability("delivery:write");
  const taskId = String(formData.get("taskId") ?? "").trim();
  const scheduledFor = String(formData.get("scheduledFor") ?? "").trim();
  if (!taskId || !scheduledFor) {
    throw new Error("A task and a schedule date are required.");
  }
  const { crm } = getRepositories();
  await crm.scheduleTaskFire(taskId, scheduledFor);
  revalidatePath("/projects/delivery");
}

/**
 * "Fire now": schedule with `scheduled_for = now` so the executor picks it up on
 * its next pass (the web still does not fire directly — ADR-0042). The timestamp
 * is minted server-side, never trusted from the client.
 */
export async function fireNowAction(formData: FormData) {
  await requireCapability("delivery:write");
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) throw new Error("A task is required.");
  const { crm } = getRepositories();
  await crm.scheduleTaskFire(taskId, new Date().toISOString());
  revalidatePath("/projects/delivery");
}
