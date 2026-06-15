"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { str, strOr } from "@/lib/form-data";
import { TAG_COLORS } from "@/components/tags/tag-chip";
import type { TagParentType } from "@/types";

/**
 * Server actions for tags / labels (ADR-0065 B6, #340).
 *
 * Tags are a shared, cross-cutting vocabulary applied to work objects (task /
 * project). Every mutation requires `delivery:write` — the same capability that
 * owns tasks & projects (mirrors the comments actions). Colour input is clamped to
 * the design-token palette so a caller can't inject a raw hex.
 */

const PARENT_TYPES: readonly TagParentType[] = ["task", "project"];

function parentType(formData: FormData): TagParentType {
  const raw = strOr(formData, "parentType", "task");
  return (PARENT_TYPES as readonly string[]).includes(raw) ? (raw as TagParentType) : "task";
}

function color(formData: FormData): string {
  const raw = strOr(formData, "color", "slate");
  return (TAG_COLORS as readonly string[]).includes(raw) ? raw : "slate";
}

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return resolveAppUserIdByEmail(session?.user?.email ?? "");
}

/** Both surfaces that show tag chips / the tag filter are revalidated after a change. */
function revalidate() {
  revalidatePath("/tasks");
  revalidatePath("/projects/[id]", "page");
}

/** Create a tag (or reuse an existing one) and apply it to a work object in one step. */
export async function applyTagAction(formData: FormData) {
  await requireCapability("delivery:write");
  const label = str(formData, "label").trim();
  const parentId = str(formData, "parentId");
  if (!label || !parentId) return;
  const { tags } = getRepositories();
  const tag = await tags.upsertTag(label, color(formData), await currentUserId());
  await tags.applyTag({ tagId: tag.id, parentType: parentType(formData), parentId });
  revalidate();
}

/** Apply an existing tag (by id) to a work object. */
export async function applyExistingTagAction(formData: FormData) {
  await requireCapability("delivery:write");
  const tagId = str(formData, "tagId");
  const parentId = str(formData, "parentId");
  if (!tagId || !parentId) return;
  const { tags } = getRepositories();
  await tags.applyTag({ tagId, parentType: parentType(formData), parentId });
  revalidate();
}

/** Remove a tag from one work object (the tag stays in the vocabulary). */
export async function removeTagAction(formData: FormData) {
  await requireCapability("delivery:write");
  const tagId = str(formData, "tagId");
  const parentId = str(formData, "parentId");
  if (!tagId || !parentId) return;
  const { tags } = getRepositories();
  await tags.removeTag({ tagId, parentType: parentType(formData), parentId });
  revalidate();
}

/** Rename a tag across the whole vocabulary (admin-style management). */
export async function renameTagAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = str(formData, "id");
  const label = str(formData, "label").trim();
  if (!id || !label) return;
  const { tags } = getRepositories();
  await tags.renameTag(id, label);
  revalidate();
}

/** Merge one tag into another (fold source's applications into target, drop source). */
export async function mergeTagsAction(formData: FormData) {
  await requireCapability("delivery:write");
  const sourceId = str(formData, "sourceId");
  const targetId = str(formData, "targetId");
  if (!sourceId || !targetId) return;
  const { tags } = getRepositories();
  await tags.mergeTags(sourceId, targetId);
  revalidate();
}

/** Delete a tag and all its applications. */
export async function deleteTagAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = str(formData, "id");
  if (!id) return;
  const { tags } = getRepositories();
  await tags.deleteTag(id);
  revalidate();
}
