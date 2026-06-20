"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { requireCapability } from "@/lib/auth/guard";
import { str } from "@/lib/form-data";
import { receiptsService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";

/**
 * Receipt upload (ADR-0083 §Receipts, #899) — the FE UI slice of the receipt write path.
 *
 * Self-scoped EXACTLY like the other expense actions: `expense:write` + the employee id
 * from the SESSION (never the form). The flow is split by the ADR-0042 boundary — the
 * BACKEND owns the bytes, the FRONT END owns the row:
 *   1. POST the file bytes to the caller-gated backend endpoint
 *      (`receiptsService.upload` → `/expense/receipts/upload`, BE #200), which AV-scans,
 *      sha256s, and writes them to a PRIVATE `receipts` blob, then returns the custody
 *      fields ({blobPath, contentHash, byteSize, contentType}).
 *   2. Insert the `receipt_attachment` row from those fields and link
 *      `website_expense_item.receipt_id` — under a server-side lock + ownership + Open
 *      re-check (`attachReceiptToExpenseItem`), so an employee can only attach to their
 *      OWN pre-submit out-of-pocket line.
 *
 * v1 is upload-only (no OCR). The `missing_receipt` HARD policy gate blocks attest of a
 * receipt-less out-of-pocket item, so this is what makes such an item attestable. Every
 * failure degrades to a notice (it never throws to the page): the backend being
 * unconfigured (`not_configured`), refusing the file (400 bad type/size, 422), or
 * unreachable all redirect back with an honest message instead of a 500.
 */

async function currentEmployeeId(): Promise<string | null> {
  const session = await auth();
  return resolveAppUserIdByEmail(session?.user?.email ?? "");
}

// v1 client-side parity with the backend receipt policy (PDF + common images ≤ 25 MiB).
// The backend re-validates authoritatively (400/422); this is a fast local reject so an
// obviously-wrong file never makes a round trip. Kept loose on purpose — the backend wins.
const MAX_RECEIPT_BYTES = 25 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/heic",
  "image/webp",
]);

export async function uploadReceiptAction(formData: FormData) {
  await requireCapability("expense:write");
  const employeeId = await currentEmployeeId();
  if (!employeeId) return;

  const periodStr = str(formData, "period");
  const itemId = str(formData, "itemId");
  if (!itemId) return;

  const back = (notice: string) =>
    redirect(`/expenses?period=${periodStr}&notice=${encodeURIComponent(notice)}`);

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) return back("Pick a receipt file to upload.");
  if (file.size > MAX_RECEIPT_BYTES) return back("That receipt is over the 25 MB limit.");
  const contentType = file.type || "application/octet-stream";
  if (file.type && !ALLOWED_RECEIPT_TYPES.has(file.type)) {
    return back("Receipts must be a PDF or an image (PNG, JPEG, HEIC, WebP).");
  }

  // Hand the bytes to the backend (it owns custody). callServiceWithFallback folds every
  // failure — endpoint unconfigured, file rejected, unreachable — into a typed outcome so
  // the page never sees an exception. A 400/422 is the backend refusing the file.
  const bytes = await file.arrayBuffer();
  const outcome = await callServiceWithFallback(
    () =>
      receiptsService.upload({
        bytes,
        contentType,
        filename: file.name || "receipt",
        actorUserId: employeeId,
      }),
    {
      label: "uploadReceiptAction",
      notConfigured:
        "Receipt storage isn’t wired in this environment yet — the upload backend is " +
        "unconfigured. The item will need its receipt once it’s live.",
      failed:
        "The receipt couldn’t be uploaded — it may be an unsupported type or too large, or " +
        "the backend rejected it. Try a PDF or image under 25 MB.",
    },
  );
  if (!outcome.ok) return back(outcome.message);

  // Backend stored the bytes; persist the row + link the item (FE owns the row). The repo
  // re-checks the item is on an Open report owned by this employee, so a forged itemId can
  // never attach to someone else's line or a locked report.
  const receiptId = await crm().attachReceiptToExpenseItem({
    itemId,
    employeeId,
    blobPath: outcome.value.blobPath,
    contentHash: outcome.value.contentHash,
    byteSize: outcome.value.byteSize,
    contentType: outcome.value.contentType,
    originalFilename: file.name || null,
  });
  if (!receiptId) return back("Couldn’t attach the receipt — the report is no longer open.");

  revalidatePath("/expenses");
  redirect(`/expenses?period=${periodStr}`);
}

function crm() {
  return getRepositories().crm;
}
