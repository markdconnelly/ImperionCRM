"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { uploadReceiptAction } from "@/app/(app)/expenses/receipts/actions";

/**
 * Receipt upload control (ADR-0083 §Receipts, #899) — the FE UI for attaching a receipt to
 * an out-of-pocket expense item. v1 is upload-only (no OCR): a drag/drop zone (also a click
 * target) over a file input that submits to `uploadReceiptAction`, which streams the bytes
 * to the caller-gated backend and links the resulting `receipt_attachment` row.
 *
 * Rendered only for the employee's OWN Open report on a receipt-less out-of-pocket line, so
 * adding the receipt clears the `missing_receipt` HARD policy gate and makes the item
 * attestable. Accepts PDF + common images (the backend re-validates type/size — 400/422 are
 * surfaced as a notice on the page). Self-scoping is server-side: the employee comes from
 * the session, not this form; `itemId`/`period` are hidden inputs the action re-checks.
 */
export function ReceiptUpload({ itemId, period }: { itemId: string; period: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [picked, setPicked] = useState(false);

  // Submit as soon as a file is chosen (click or drop) — one gesture, no extra button.
  function submitWith(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPicked(true);
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={uploadReceiptAction} className="inline-block">
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="itemId" value={itemId} />
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          // Mirror the dropped file into the hidden input so the form posts it.
          if (inputRef.current && e.dataTransfer.files.length > 0) {
            inputRef.current.files = e.dataTransfer.files;
            submitWith(e.dataTransfer.files);
          }
        }}
        className={`inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium transition-colors ${
          dragging
            ? "border-accent bg-accent/10 text-accent"
            : "border-border bg-panel-2 text-dim hover:border-accent hover:text-accent"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          name="receipt"
          accept="application/pdf,image/png,image/jpeg,image/heic,image/webp"
          className="sr-only"
          onChange={(e) => submitWith(e.target.files)}
        />
        <UploadLabel idle="Drop / upload receipt" busy={picked} />
      </label>
    </form>
  );
}

/** Pending-aware label so the control reads "Uploading…" while the action runs. */
function UploadLabel({ idle, busy }: { idle: string; busy: boolean }) {
  const { pending } = useFormStatus();
  return <span>{pending || busy ? "Uploading…" : idle}</span>;
}
