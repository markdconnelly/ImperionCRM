"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { isAdmin } from "@/lib/auth/roles";

/** The filter keys a ticket view may persist (ADR-0046). */
const FILTER_KEYS = ["status", "priority", "account", "days"] as const;

/**
 * Save (or update, by name) the current filter set as a named view. Personal by
 * default; `shared` publishes it company-wide; `default` makes it the view this
 * user's ticket board opens with.
 */
export async function createSavedViewAction(formData: FormData) {
  await requireCapability("tickets:write");
  const session = await auth();
  const email = session?.user?.email;
  const name = String(formData.get("name") ?? "").trim();
  if (!email || !name) redirect("/tickets");

  const filters: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const v = String(formData.get(`filter_${key}`) ?? "").trim();
    if (v) filters[key] = v;
  }

  const { engagements } = getRepositories();
  await engagements.createSavedView(
    {
      entityType: "ticket",
      name,
      isShared: formData.get("shared") === "on",
      isDefault: formData.get("default") === "on",
      filters,
    },
    email,
  );
  revalidatePath("/tickets");
  redirect("/tickets?saved=1");
}

/**
 * Rename an existing view (#92). Owner-only — the repository write enforces
 * ownership in the UPDATE's WHERE clause; a non-owner submission is a no-op.
 */
export async function renameSavedViewAction(formData: FormData) {
  await requireCapability("tickets:write");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const session = await auth();
  const email = session?.user?.email;
  if (!id || !name || !email) redirect("/tickets");
  const { engagements } = getRepositories();
  await engagements.updateSavedView(id, { name }, email);
  revalidatePath("/tickets");
  redirect("/tickets?saved=1");
}

/**
 * Make an existing view my default, or clear it (#92). Owner-only (same
 * repository-level enforcement); setting clears the previous default first.
 */
export async function setDefaultViewAction(formData: FormData) {
  await requireCapability("tickets:write");
  const id = String(formData.get("id") ?? "");
  const makeDefault = formData.get("makeDefault") === "1";
  const session = await auth();
  const email = session?.user?.email;
  if (!id || !email) redirect("/tickets");
  const { engagements } = getRepositories();
  await engagements.updateSavedView(id, { isDefault: makeDefault }, email);
  revalidatePath("/tickets");
  redirect("/tickets");
}

/** Owners delete their own views; admins may also remove shared ones. */
export async function deleteSavedViewAction(formData: FormData) {
  const roles = await requireCapability("tickets:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const session = await auth();
  const { engagements } = getRepositories();
  await engagements.deleteSavedView(id, session?.user?.email ?? null, isAdmin(roles));
  revalidatePath("/tickets");
  redirect("/tickets");
}
