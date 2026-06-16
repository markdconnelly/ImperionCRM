"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import type { ReportVisibility } from "@/types";

/**
 * Dashboard compose + share server actions (ADR-0075 §3, #412). A dashboard is a named
 * composition of saved report definitions (tiles). Like the report builder (#411) and
 * saved views (ADR-0046), reporting is broadly available — no capability gate;
 * authorization is OWNERSHIP. The data layer enforces owner-only mutation on the
 * dashboard row itself; tile mutations carry no owner in the accessor, so we verify the
 * caller owns the dashboard here before adding/removing tiles.
 */

async function requireEmail(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");
  return email;
}

function visibilityOf(formData: FormData): ReportVisibility {
  return String(formData.get("visibility") ?? "private") === "shared" ? "shared" : "private";
}

export async function createDashboardAction(formData: FormData): Promise<void> {
  const email = await requireEmail();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Dashboard name is required.");
  const { reportBuilder } = getRepositories();
  const id = await reportBuilder.createDashboard({ name, layout: {}, visibility: visibilityOf(formData) }, email);
  revalidatePath("/reporting/dashboards");
  redirect(`/reporting/dashboards/${id}`);
}

export async function deleteDashboardAction(formData: FormData): Promise<void> {
  const email = await requireEmail();
  const roles = await getSessionRoles();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const { reportBuilder } = getRepositories();
  await reportBuilder.deleteDashboard(id, email, roles.includes("admin"));
  revalidatePath("/reporting/dashboards");
  redirect("/reporting/dashboards");
}

/** Rename / re-share a dashboard (owner-only, enforced in the data-layer write). */
export async function updateDashboardAction(formData: FormData): Promise<void> {
  const email = await requireEmail();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Dashboard id and name are required.");
  const { reportBuilder } = getRepositories();
  await reportBuilder.updateDashboard(id, { name, layout: {}, visibility: visibilityOf(formData) }, email);
  revalidatePath(`/reporting/dashboards/${id}`);
  revalidatePath("/reporting/dashboards");
}

/** Owner-guarded: verify the caller owns the dashboard before mutating its tiles. */
async function requireOwnedDashboard(id: string, email: string) {
  const { reportBuilder } = getRepositories();
  const dash = await reportBuilder.getDashboard(id, email);
  if (!dash || !dash.isMine) redirect("/reporting/dashboards");
  return reportBuilder;
}

export async function addTileAction(formData: FormData): Promise<void> {
  const email = await requireEmail();
  const dashboardId = String(formData.get("dashboardId") ?? "").trim();
  const reportDefinitionId = String(formData.get("reportDefinitionId") ?? "").trim();
  if (!dashboardId || !reportDefinitionId) return;
  const reportBuilder = await requireOwnedDashboard(dashboardId, email);
  const existing = await reportBuilder.listDashboardItems(dashboardId);
  await reportBuilder.addDashboardItem({
    dashboardId,
    reportDefinitionId,
    position: { ordinal: existing.length },
  });
  revalidatePath(`/reporting/dashboards/${dashboardId}`);
}

export async function removeTileAction(formData: FormData): Promise<void> {
  const email = await requireEmail();
  const dashboardId = String(formData.get("dashboardId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();
  if (!dashboardId || !itemId) return;
  const reportBuilder = await requireOwnedDashboard(dashboardId, email);
  await reportBuilder.removeDashboardItem(itemId);
  revalidatePath(`/reporting/dashboards/${dashboardId}`);
}
