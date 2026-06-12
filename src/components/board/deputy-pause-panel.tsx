"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { formatDateTime, timeAgo } from "@/lib/board/session";
import type { ResumeSessionResult } from "@/app/(app)/board/[id]/actions";

const CISO_POSITION_MAX = 8000;

/**
 * The deputy-pause block on an awaiting_ciso session (ADR-0054 §4 second stage,
 * #185; backend #64): the deliberation stopped after round 2 because a deputy
 * seat sat with no convene-time CISO position. The human CISO reviews the
 * deputy's draft, then resumes with a position — **approve** adopts the draft
 * verbatim, **amend** submits their own words. Either way the position is what
 * synthesis (and the recommendation) defer to.
 */
export function DeputyPausePanel({
  sessionId,
  pausedAt,
  deputyName,
  deputyDraft,
  canAct,
  resumeAction,
}: {
  sessionId: string;
  pausedAt: string | null;
  deputyName: string | null;
  /** The deputy's final stance from the transcript; null when no deputy spoke. */
  deputyDraft: string | null;
  /** Holds agents:operate (ADR-0050) — resuming spends a premium synthesis call. */
  canAct: boolean;
  resumeAction: (formData: FormData) => Promise<ResumeSessionResult>;
}) {
  const [position, setPosition] = useState("");
  const [result, setResult] = useState<ResumeSessionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const editable = canAct && !pending;

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      setResult(await resumeAction(formData));
    });
  }

  return (
    <section className="rounded-xl border border-amber/40 bg-panel p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
          <Icon name="PauseCircle" size={14} className="text-amber" />
          Paused for the human CISO
        </h3>
        <span className="rounded border border-amber/40 px-1.5 py-0.5 text-[10px] text-amber">
          awaiting_ciso
        </span>
        {pausedAt && (
          <span className="ml-auto text-[11px] text-dim" title={formatDateTime(pausedAt)}>
            paused {timeAgo(pausedAt)}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-dim">
        A deputy seat deliberated without a stated human-CISO position, so the session stopped
        after round 2 — no synthesis ran. Review the deputy&apos;s draft below, then resume with
        your position: <span className="text-text">approve</span> adopts the draft as your own,
        or <span className="text-text">amend</span> it in your words. Every seat&apos;s final
        stance is in the transcript.
      </p>

      {deputyDraft ? (
        <div className="mt-3 rounded-lg border border-border bg-panel-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-amber">
              deputy draft — {deputyName ?? "staff analyst"}
            </span>
            <span className="text-[11px] text-dim">the position awaiting your verdict</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dim">{deputyDraft}</p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-dim">
          No deputy turn was recorded — review the transcript below, then state your position.
        </p>
      )}

      {!canAct && (
        <p className="mt-3 text-xs text-dim">
          Awaiting the human CISO (needs the agents capability) — the session stays paused.
        </p>
      )}

      {canAct && (
        <form action={onSubmit} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="sessionId" value={sessionId} />
          <label className="block">
            <span className="mb-1 block text-xs text-dim">
              Your position — required to resume; shown to synthesis with veto weight on security
              matters (ADR-0054 §4)
            </span>
            <textarea
              name="cisoPosition"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              maxLength={CISO_POSITION_MAX}
              rows={4}
              required
              disabled={!editable}
              placeholder="Approve the deputy draft (adopt it below) or write your amended position…"
              className="w-full resize-y rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none disabled:opacity-60"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {deputyDraft && (
              <button
                type="button"
                onClick={() => setPosition(deputyDraft)}
                disabled={!editable}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text disabled:opacity-50"
              >
                Adopt the deputy draft
              </button>
            )}
            <button
              type="submit"
              disabled={!editable || position.trim().length === 0}
              className="rounded-md border border-green/40 px-3 py-1.5 text-sm text-green transition-colors hover:bg-green/10 disabled:opacity-50"
            >
              {pending ? "Resuming…" : "Resume the session"}
            </button>
            {pending && (
              <span className="flex items-center gap-1.5 text-xs text-accent">
                <Icon name="Loader2" size={13} className="animate-spin" />
                recording your position + running synthesis (can take a minute)…
              </span>
            )}
          </div>
        </form>
      )}

      {result && !pending && (
        <p className={`mt-2 text-xs ${result.ok ? "text-green" : "text-red"}`}>{result.message}</p>
      )}
    </section>
  );
}
