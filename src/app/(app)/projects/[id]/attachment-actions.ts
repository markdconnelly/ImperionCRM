"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { requireCapability } from "@/lib/auth/guard";
import { getSessionRoles } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { str, strOr } from "@/lib/form-data";
import { validateAttachment } from "@/lib/attachments";
import type { WorkParentType } from "@/types";

/**
 * Server actions for work attachments (ADR-0064 A4, #333).
 *
 * Upload/remove require `delivery:write` (the capability that owns projects &
 * tasks). The type allowlist + size cap are enforced HERE, server-side, before any
 * metadata is recorded (ADR-0064 security impact) — the client `accept`/limit hints
 * are convenience only.
 *
 * The file BYTES go to Azure Blob via the BACKEND (ADR-0042: the GUI never holds
 * storage credentials, and the AV-scan hook lives on the trusted path). That
 * backend upload path isn't wired yet, so this action records the attachment
 * metadata against a `pending:` storage_ref and surfaces an honest notice — the
 * house "degrade gracefully, never fail the page" pattern. When the backend lands,
 * only the storage_ref minting changes; the table + UI are unchanged.
 *
 * Removal is uploader-scoped in the data layer unless the caller is an admin; the
 * repo soft-deletes and writes an `attachment.removed` audit event so the activity
 * feed retains it (acceptance: removal audited + emits an activity event).
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

/** Revalidate the detail page that mounts the attachment panel. */
function revalidateParent(pType: WorkParentType, parentId: string) {
  if (pType === "project") revalidatePath(`/projects/${parentId}`);
  if (pType === "task") revalidatePath(`/tasks/${parentId}/edit`);
}

export async function uploadAttachmentAction(formData: FormData) {
  await requireCapability("delivery:write");
  const pType = parentType(formData);
  const parentId = str(formData, "parentId");
  const file = formData.get("file");
  if (!parentId || !(file instanceof File) || file.size === 0) return;

  // Server-side allowlist + size-cap enforcement (ADR-0064). A rejected upload is
  // a silent no-op here; the client already shows the limits.
  const contentType = file.type || "application/octet-stream";
  if (validateAttachment(contentType, file.size)) return;

  const { attachments } = getRepositories();
  await attachments.addAttachment({
    parentType: pType,
    parentId,
    // Placeholder until the backend blob-upload path is wired (ADR-0042). The
    // backend will replace this with the real opaque blob key + mint SAS against it.
    storageRef: `pending:${pType}/${parentId}/${file.name}`,
    filename: file.name,
    contentType,
    sizeBytes: file.size,
    uploadedByUserId: await currentUserId(),
  });
  revalidateParent(pType, parentId);
}

export async function removeAttachmentAction(formData: FormData) {
  await requireCapability("delivery:write");
  const id = str(formData, "id");
  const parentId = str(formData, "parentId");
  if (!id) return;
  const pType = parentType(formData);
  const [userId, roles] = await Promise.all([currentUserId(), getSessionRoles()]);
  const { attachments } = getRepositories();
  await attachments.removeAttachment(id, userId, isAdmin(roles));
  revalidateParent(pType, parentId);
}
