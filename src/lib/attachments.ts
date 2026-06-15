/**
 * Attachment policy — the ONE place the type allowlist + size cap live (ADR-0064
 * A4 security impact). Imported by the upload server action (enforces it before
 * recording metadata) and the UI (renders the limits + drives the inline-image
 * preview). Pure constants/functions, no I/O — unit-tested in attachments.test.ts.
 *
 * The bytes themselves never touch the GUI tier (ADR-0042): the real upload-to-
 * blob, the authoritative server-side enforcement, and the AV-scan hook are
 * BACKEND processes. This module is the front-end's first-line check + the shared
 * contract; the backend re-validates on the trusted path.
 */

/** Max attachment size accepted by the GUI (ADR-0064 size cap). 25 MiB. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/**
 * The accepted MIME-type allowlist (ADR-0064 type allowlist). Deliberately narrow:
 * documents, images, plain text/CSV, and the common archive. Executables, scripts
 * and unknown types are rejected — defence against malicious uploads (NFR-3 /
 * unified-security-standard.md). The backend re-checks against the same set.
 */
export const ALLOWED_ATTACHMENT_TYPES: readonly string[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/zip",
];

/** The `accept` attribute for the file input (mirrors the allowlist). */
export const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_TYPES.join(",");

/** True when a MIME type is an image we can preview inline (ADR-0064 inline preview). */
export function isPreviewableImage(contentType: string): boolean {
  return contentType.startsWith("image/") && contentType !== "image/svg+xml";
}

export type AttachmentRejection = "too_large" | "type_not_allowed" | "empty";

/**
 * Validate a candidate upload against the allowlist + size cap. Returns null when
 * acceptable, or a machine-readable rejection reason. The caller maps the reason
 * to a user-facing notice.
 */
export function validateAttachment(
  contentType: string,
  sizeBytes: number,
): AttachmentRejection | null {
  if (sizeBytes <= 0) return "empty";
  if (sizeBytes > MAX_ATTACHMENT_BYTES) return "too_large";
  if (!ALLOWED_ATTACHMENT_TYPES.includes(contentType)) return "type_not_allowed";
  return null;
}

/** Human-readable file size for the list (e.g. "1.4 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
}
