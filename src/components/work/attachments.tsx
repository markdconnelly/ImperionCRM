import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { auth } from "@/auth";
import {
  uploadAttachmentAction,
  removeAttachmentAction,
} from "@/app/(app)/projects/[id]/attachment-actions";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_BYTES,
  formatBytes,
  isPreviewableImage,
} from "@/lib/attachments";
import type { WorkParentType } from "@/types";

/**
 * File attachments for a work object (ADR-0064 A4, #333).
 *
 * Polymorphic by (parentType, parentId): the same component drops onto task,
 * project, or milestone detail — same shape as the comments ActivityFeed. Lists
 * attachments newest-first with name / size / uploader / time; uploaders (or
 * admins) can remove, which soft-deletes + emits an `attachment.removed` activity
 * event (acceptance). Upload enforces the type allowlist + size cap server-side.
 *
 * The file BYTES live in Azure Blob and are reached only through the BACKEND
 * (ADR-0042): there are no public URLs and downloads mint a short-lived per-request
 * SAS on the trusted path. That backend path isn't wired yet, so a `pending:`
 * storage_ref renders a "stored — download wiring pending" hint instead of a live
 * link, and inline image previews are deferred until a real SAS is available —
 * the house "degrade gracefully" pattern. The metadata + UI are otherwise complete.
 */
export async function Attachments({
  parentType,
  parentId,
  canManage,
}: {
  parentType: WorkParentType;
  parentId: string;
  /** Whether the viewer may upload/remove (gated on `delivery:write` by the caller). */
  canManage: boolean;
}) {
  const { attachments } = getRepositories();
  const [rows, roles, session] = await Promise.all([
    attachments.listAttachments(parentType, parentId),
    getSessionRoles(),
    auth(),
  ]);
  const admin = isAdmin(roles);
  const myUserId = await resolveAppUserIdByEmail(session?.user?.email ?? "");

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-display text-base font-semibold tracking-tight">Attachments</h3>
        <p className="mt-0.5 text-sm text-dim">
          Files on this {parentType} (ADR-0064). Stored in Azure Blob; downloads are
          auth-gated — no public links.
        </p>
      </div>

      {canManage && (
        <form
          action={uploadAttachmentAction}
          className="flex flex-col gap-2 rounded-lg border border-border bg-panel px-4 py-3"
        >
          <input type="hidden" name="parentType" value={parentType} />
          <input type="hidden" name="parentId" value={parentId} />
          <input
            type="file"
            name="file"
            required
            accept={ATTACHMENT_ACCEPT}
            className="text-sm text-text file:mr-3 file:rounded-md file:border file:border-border file:bg-panel-2 file:px-3 file:py-1.5 file:text-sm file:text-text hover:file:bg-panel"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-dim">
              Documents, images, text/CSV and zip up to {formatBytes(MAX_ATTACHMENT_BYTES)}.
              Type + size are enforced server-side.
            </p>
            <button
              type="submit"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Upload
            </button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-panel px-4 py-3 text-sm text-dim">
          No attachments yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((a) => {
            const pending = a.storageRef.startsWith("pending:");
            const canRemove = canManage && (admin || a.uploadedByUserId === myUserId);
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-panel px-4 py-2.5"
              >
                <AttachmentThumb contentType={a.contentType} pending={pending} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{a.filename}</p>
                  <p className="mt-0.5 text-xs text-dim">
                    {formatBytes(a.sizeBytes)} · {a.uploadedBy ?? "Unknown"}
                    {a.createdAt && ` · ${a.createdAt}`}
                  </p>
                </div>
                {pending ? (
                  <span
                    className="shrink-0 rounded bg-panel-2 px-2 py-0.5 text-[11px] text-dim"
                    title="Stored as metadata; the backend blob download path is not wired yet."
                  >
                    download pending
                  </span>
                ) : (
                  <a
                    href={`/api/attachments/${a.id}/download`}
                    className="shrink-0 text-xs text-accent transition-colors hover:underline"
                  >
                    Download
                  </a>
                )}
                {canRemove && (
                  <form action={removeAttachmentAction} className="shrink-0">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="parentType" value={parentType} />
                    <input type="hidden" name="parentId" value={parentId} />
                    <button
                      type="submit"
                      className="text-xs text-dim transition-colors hover:text-red"
                    >
                      Remove
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * A small type badge for an attachment. A previewable image (ADR-0064 inline
 * preview) gets an accent-tinted IMG glyph; the live <img> preview lands once a
 * real (non-pending) SAS download path exists, so the list never points at an
 * unauthenticated blob URL. Other types get a format glyph.
 */
function AttachmentThumb({ contentType, pending }: { contentType: string; pending: boolean }) {
  const image = isPreviewableImage(contentType);
  const glyph = image
    ? "IMG"
    : contentType === "application/pdf"
      ? "PDF"
      : contentType.includes("sheet") || contentType.includes("excel")
        ? "XLS"
        : contentType.includes("word") || contentType.includes("document")
          ? "DOC"
          : "FILE";
  return (
    <span
      className={
        image && !pending
          ? "flex h-9 w-9 shrink-0 items-center justify-center rounded border border-accent/40 bg-accent/10 text-[10px] font-medium text-accent"
          : "flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-panel-2 text-[10px] font-medium text-dim"
      }
    >
      {glyph}
    </span>
  );
}
