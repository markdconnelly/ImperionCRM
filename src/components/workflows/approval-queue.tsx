"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import type { ApprovalItem } from "@/lib/agent/icm-runs";
import type { IcmActionResult } from "@/app/(app)/workflows/actions";

/**
 * ICM approval queue (#278, ADR-0061). Each parked checkpoint surfaces the drafted
 * artifact + the agent's rationale + the triage class + the consent basis, and lets
 * an operator approve, edit-and-approve, or reject. Sends route through the backend
 * approval-gated path (ADR-0058 — consent re-asserted at execution). `canReview`
 * (`agents:operate`, admin) gates the controls; everyone else sees a read-only view.
 */
export function ApprovalQueue({
  items,
  canReview,
  reviewAction,
}: {
  items: ApprovalItem[];
  canReview: boolean;
  reviewAction: (formData: FormData) => Promise<IcmActionResult>;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-panel p-5">
        <h3 className="mb-1 font-display text-sm font-semibold tracking-tight">Approval queue</h3>
        <p className="text-sm text-dim">
          Nothing waiting — drafted lead-response checkpoints appear here for approve / edit /
          reject before anything sends.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-tight">
          Approval queue
          <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[10px] text-amber">
            {items.length} waiting
          </span>
        </h3>
        <span className="text-[11px] text-dim">draft → human → send (ADR-0058 consent-gated)</span>
      </div>
      {items.map((item) => (
        <ApprovalCard key={item.runId} item={item} canReview={canReview} reviewAction={reviewAction} />
      ))}
    </section>
  );
}

function ApprovalCard({
  item,
  canReview,
  reviewAction,
}: {
  item: ApprovalItem;
  canReview: boolean;
  reviewAction: (formData: FormData) => Promise<IcmActionResult>;
}) {
  const [draft, setDraft] = useState(item.draft);
  const [notice, setNotice] = useState<IcmActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(decision: "approve" | "reject") {
    const fd = new FormData();
    fd.set("runId", item.runId);
    fd.set("decision", decision);
    if (decision === "approve" && draft !== item.draft) fd.set("editedDraft", draft);
    startTransition(async () => setNotice(await reviewAction(fd)));
  }

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-xs text-text">
          {item.agentName}
        </span>
        {item.triageClass && (
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-accent">
            {item.triageClass}
          </span>
        )}
        <span className="text-[11px] text-dim">{item.actor ?? "—"}</span>
      </div>

      <label className="mb-1 block text-[11px] uppercase tracking-wide text-dim">Drafted reply</label>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={!canReview}
        rows={4}
        className="w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none disabled:opacity-70"
      />

      <dl className="mt-2 flex flex-col gap-1 text-xs">
        {item.rationale && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-dim">Rationale</dt>
            <dd className="text-text">{item.rationale}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="shrink-0 text-dim">Consent basis</dt>
          <dd className={item.consentBasis ? "text-text" : "text-amber"}>
            {item.consentBasis ?? "no consent basis recorded — send blocked"}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center gap-2">
        {canReview ? (
          <>
            <button
              type="button"
              onClick={() => submit("approve")}
              disabled={pending}
              className="flex items-center gap-1 rounded-md bg-green/90 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green disabled:opacity-60"
            >
              <Icon name="Check" size={14} />
              {draft !== item.draft ? "Approve edit" : "Approve"}
            </button>
            <button
              type="button"
              onClick={() => submit("reject")}
              disabled={pending}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-red disabled:opacity-60"
            >
              <Icon name="X" size={14} />
              Reject
            </button>
          </>
        ) : (
          <span className="text-xs text-dim">Read-only — approving needs an admin (agents:operate).</span>
        )}
        {notice && (
          <span className={`text-xs ${notice.ok ? "text-green" : "text-amber"}`}>{notice.message}</span>
        )}
      </div>
    </div>
  );
}
