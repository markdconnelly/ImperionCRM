"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { formatDateTime, reviewStatusMeta } from "@/lib/board/session";
import type { ReviewRecommendationResult } from "@/app/(app)/board/[id]/actions";

const RATIONALE_MAX = 8000;

/**
 * The human-CISO review block on a board recommendation (ADR-0054 §4): current
 * verdict state + ratify/overrule with a REQUIRED written rationale for both.
 * The verdict is amendable — every change appends a board.review audit row
 * server-side, so this panel always offers the form.
 */
export function ReviewRecommendationPanel({
  recommendationId,
  reviewStatus,
  reviewedByName,
  reviewedAt,
  reviewRationale,
  canReview,
  reviewAction,
}: {
  recommendationId: string;
  reviewStatus: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewRationale: string | null;
  /** Holds agents:operate (ADR-0050) — the review verdict spends nothing but is the CISO act. */
  canReview: boolean;
  reviewAction: (formData: FormData) => Promise<ReviewRecommendationResult>;
}) {
  const [rationale, setRationale] = useState("");
  const [verdict, setVerdict] = useState<"ratified" | "overruled" | null>(null);
  const [result, setResult] = useState<ReviewRecommendationResult | null>(null);
  const [formOpen, setFormOpen] = useState(reviewStatus === "pending_review");
  const [pending, startTransition] = useTransition();

  const meta = reviewStatusMeta(reviewStatus);
  const reviewed = reviewStatus === "ratified" || reviewStatus === "overruled";
  const editable = canReview && !pending;

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const r = await reviewAction(formData);
      setResult(r);
      if (r.ok) {
        setRationale("");
        setVerdict(null);
        setFormOpen(false);
      }
    });
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-dim">Human CISO review</span>
        <span className={`rounded border border-border px-1.5 py-0.5 text-[10px] ${meta.tone}`}>
          {meta.label}
        </span>
        {reviewed && (
          <span className="text-[11px] text-dim">
            by {reviewedByName ?? "—"} · {formatDateTime(reviewedAt)}
          </span>
        )}
        {reviewed && canReview && !formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="ml-auto rounded-md border border-border px-2 py-1 text-[11px] text-dim hover:text-text"
          >
            Amend verdict
          </button>
        )}
      </div>

      {reviewed && reviewRationale && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dim">
          {reviewRationale}
        </p>
      )}

      {!canReview && !reviewed && (
        <p className="mt-2 text-xs text-dim">
          Awaiting the human CISO&apos;s verdict (needs the agents capability).
        </p>
      )}

      {canReview && formOpen && (
        <form action={onSubmit} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="recommendationId" value={recommendationId} />
          <label className="block">
            <span className="mb-1 block text-xs text-dim">
              Written rationale — required for both verdicts (the accountability record)
            </span>
            <textarea
              name="rationale"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              maxLength={RATIONALE_MAX}
              rows={3}
              required
              disabled={!editable}
              placeholder="Why you ratify or overrule — this lands in the audit trail…"
              className="w-full resize-y rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none disabled:opacity-60"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              name="reviewStatus"
              value="ratified"
              onClick={() => setVerdict("ratified")}
              disabled={!editable || rationale.trim().length === 0}
              className="rounded-md border border-green/40 px-3 py-1.5 text-sm text-green transition-colors hover:bg-green/10 disabled:opacity-50"
            >
              {pending && verdict === "ratified" ? "Recording…" : "Ratify"}
            </button>
            <button
              type="submit"
              name="reviewStatus"
              value="overruled"
              onClick={() => setVerdict("overruled")}
              disabled={!editable || rationale.trim().length === 0}
              className="rounded-md border border-red/40 px-3 py-1.5 text-sm text-red transition-colors hover:bg-red/10 disabled:opacity-50"
            >
              {pending && verdict === "overruled" ? "Recording…" : "Overrule"}
            </button>
            {pending && (
              <span className="flex items-center gap-1.5 text-xs text-accent">
                <Icon name="Loader2" size={13} className="animate-spin" />
                recording the verdict + audit row…
              </span>
            )}
          </div>
        </form>
      )}

      {result && !pending && (
        <p className={`mt-2 text-xs ${result.ok ? "text-green" : "text-red"}`}>{result.message}</p>
      )}
    </div>
  );
}
