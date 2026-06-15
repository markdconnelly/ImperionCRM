"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { getSessionRoles } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { str, strOr } from "@/lib/form-data";
import type { WorkParentType } from "@/types";

/**
 * Server actions for the work comments + activity feed (ADR-0064 A1, #330).
 *
 * Posting/editing/deleting a comment requires `delivery:write` (the capability that
 * owns projects & tasks). Edit/delete are author-scoped in the data layer unless the
 * caller is an admin (ADR-0064: own, or any if admin) — the action passes the
 * resolved author id + an admin flag, and the repo enforces it in SQL so a forged
 * id can't act on another user's comment.
 */

/** Resolve the signed-in employee's app_user id (null in mock mode / unmapped). */
async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return resolveAppUserIdByEmail(session?.user?.email ?? "");
}

const PARENT_TYPES: readonly WorkParentType[] = ["task", "project", "milestone"];

function parentType(formData: FormData): WorkParentType {
  const raw = strOr(formData, "parentType", "project");
  return (PARENT_TYPES as readonly string[]).includes(raw) ? (raw as WorkParentType) : "project";
}

/** The detail page revalidated after a mutation (only project A1 surface ships here). */
function revalidateParent(pType: WorkParentType) {
  if (pType === "project") revalidatePath("/projects/[id]", "page");
}

export async function addCommentAction(formData: FormData) {
  await requireCapability("delivery:write");
  const body = str(formData, "body").trim();
  if (!body) return; // empty comment is a no-op
  const pType = parentType(formData);
  const parentId = str(formData, "parentId");
  const { work } = getRepositories();
  await work.addComment({
    parentType: pType,
    parentId,
    authorUserId: await currentUserId(),
    body,
  });
  revalidateParent(pType);
}

export async function editCommentAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = str(formData, "id");
  const body = str(formData, "body").trim();
  if (!id || !body) return;
  const pType = parentType(formData);
  const [userId, roles] = await Promise.all([currentUserId(), getSessionRoles()]);
  const { work } = getRepositories();
  await work.editComment(id, body, userId, isAdmin(roles));
  revalidateParent(pType);
}

export async function deleteCommentAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = str(formData, "id");
  if (!id) return;
  const pType = parentType(formData);
  const [userId, roles] = await Promise.all([currentUserId(), getSessionRoles()]);
  const { work } = getRepositories();
  await work.deleteComment(id, userId, isAdmin(roles));
  revalidateParent(pType);
}
