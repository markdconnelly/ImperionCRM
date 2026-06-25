"use client";

import { useState, useTransition } from "react";
import { TIER_LABEL, type GroundingTier } from "@/lib/grounding/authority";
import type { ResolveConflictResult } from "./actions";

/**
 * Client wrapper for an open conflict's resolve / dismiss controls (#1217). Holds the two forms
 * (affirm-a-tier-and-write-back, and dismiss), submits the server action inside a transition, and
 * surfaces the returned notice — the same `useTransition` + `setNotice` pattern as
 * `orchestrator-settings-card.tsx`. The server action is the security + write-back boundary; this
 * is presentation only.
 */
export function ConflictResolveForm({
  conflictId,
  tierOptions,
  defaultTier,
  resolveAction,
}: {
  conflictId: string;
  /** Tiers that made a claim (the affirmable options). */
  tierOptions: GroundingTier[];
  /** Pre-selected tier (the served tier). */
  defaultTier: GroundingTier;
  resolveAction: (formData: FormData) => Promise<ResolveConflictResult>;
}) {
  const [notice, setNotice] = useState<ResolveConflictResult | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      setNotice(await resolveAction(formData));
    });
  }

  return (
    <div className="mt-3">
      <form action={submit} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="conflictId" value={conflictId} />
        <input type="hidden" name="decision" value="resolved" />
        <label className="flex flex-col gap-1 text-xs text-dim">
          Authoritative tier
          <select
            name="resolutionTier"
            defaultValue={defaultTier}
            className="rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
          >
            {tierOptions.map((tier) => (
              <option key={tier} value={tier}>
                {TIER_LABEL[tier]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-dim">
          Direction (drives the write-back)
          <input
            name="note"
            placeholder="e.g. canon is stale — update the ARR concept file to $1.2M"
            className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {pending ? "Working…" : "Resolve + write back"}
        </button>
      </form>
      <form action={submit} className="mt-2">
        <input type="hidden" name="conflictId" value={conflictId} />
        <input type="hidden" name="decision" value="dismissed" />
        <button
          type="submit"
          disabled={pending}
          className="text-xs text-dim transition-colors hover:text-red disabled:opacity-50"
        >
          Dismiss (no write-back)
        </button>
      </form>
      {notice && (
        <p className={`mt-2 text-xs ${notice.ok ? "text-accent" : "text-red"}`}>{notice.message}</p>
      )}
    </div>
  );
}
