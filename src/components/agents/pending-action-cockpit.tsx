"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { HUMAN_FOLLOW_UP_KIND, type PendingActionItem } from "@/lib/agent/pending-action-cockpit";
import type { IcmActionResult } from "@/app/(app)/workflows/actions";

/**
 * The native approval cockpit (#1014, parent #996 / 2E, ADR-0107 D5). Lists EVERY
 * sub-agent's parked actions in one place (the cross-agent twin of the Technician
 * cockpit #1056): each item surfaces the proposing agent, the proposed action + ADR-0055
 * tier, the dial decision that routed it here, the agent's rationale, the resolvable
 * target, the run-trace link, and the editable draft body — and lets an admin approve,
 * edit-and-approve, or reject. Approving routes through the backend approval-gated
 * executor (consent re-asserted, ADR-0058; backend #267). `canReview` (`agents:operate`,
 * admin) gates the controls; everyone else sees a read-only view.
 */
export function PendingActionCockpit({
  items,
  canReview,
  reviewAction,
}: {
  items: PendingActionItem[];
  canReview: boolean;
  reviewAction: (formData: FormData) => Promise<IcmActionResult>;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-panel p-5">
        <h3 className="mb-1 font-display text-sm font-semibold tracking-tight">Pending agent actions</h3>
        <p className="text-sm text-dim">
          Nothing waiting — any agent action above its autonomy ceiling appears here for
          approve / edit / reject before anything executes.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-tight">
          Pending agent actions
          <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[10px] text-amber">
            {items.length} waiting
          </span>
        </h3>
        <span className="text-[11px] text-dim">propose → human → execute (ADR-0058 consent-gated)</span>
      </div>
      {items.map((item) => (
        <CockpitCard key={item.id} item={item} canReview={canReview} reviewAction={reviewAction} />
      ))}
    </section>
  );
}

const TIER_TONE: Record<string, string> = {
  T0: "text-dim",
  T1: "text-accent",
  T2: "text-amber",
  T3: "text-red",
};

function CockpitCard({
  item,
  canReview,
  reviewAction,
}: {
  item: PendingActionItem;
  canReview: boolean;
  reviewAction: (formData: FormData) => Promise<IcmActionResult>;
}) {
  const [draft, setDraft] = useState(item.draft);
  const [notice, setNotice] = useState<IcmActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(decision: "approve" | "reject") {
    const fd = new FormData();
    fd.set("pendingActionId", item.id);
    fd.set("decision", decision);
    if (decision === "approve" && draft !== item.draft) fd.set("editedBody", draft);
    startTransition(async () => setNotice(await reviewAction(fd)));
  }

  // Deny-route escalation (#1784, backend #499): not a draft to send — a reply the
  // customer is still owed. Render a distinct card so an operator never mistakes it for a
  // normal proposed action, and offer "Mark handled" (a reject that clears the queue row)
  // instead of Approve/edit — there is nothing to execute (plan_seq=NULL).
  if (item.actionKind === HUMAN_FOLLOW_UP_KIND) {
    return (
      <div className="rounded-xl border border-amber/60 bg-amber/5 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 rounded border border-amber/60 bg-amber/10 px-1.5 py-0.5 text-xs font-medium text-amber">
            <Icon name="AlertTriangle" size={12} />
            Reply owed · draft denied
          </span>
          <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-xs font-medium text-text">
            {item.agentLabel}
          </span>
          {item.target ? (
            item.target.href ? (
              <Link href={item.target.href} className="text-xs text-accent hover:underline">
                {item.target.label}
              </Link>
            ) : (
              <span className="text-xs text-text">{item.target.label}</span>
            )
          ) : null}
        </div>

        <p className="text-sm text-text">
          A drafted reply was denied on review and this inbound thread still owes the
          customer a response. Answer it directly, then mark it handled to clear it.
        </p>

        <dl className="mt-2 flex flex-col gap-1 text-xs">
          {item.rationale && (
            <div className="flex gap-2">
              <dt className="shrink-0 text-dim">Reason</dt>
              <dd className="text-text">{item.rationale}</dd>
            </div>
          )}
          {item.runId && (
            <div className="flex gap-2">
              <dt className="shrink-0 text-dim">Run trace</dt>
              <dd>
                <Link href={`/workflows/runs/${item.runId}`} className="text-accent hover:underline">
                  glass-box trace →
                </Link>
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-3 flex items-center gap-2">
          {canReview ? (
            <button
              type="button"
              onClick={() => submit("reject")}
              disabled={pending}
              className="flex items-center gap-1 rounded-md border border-amber/60 px-3 py-1.5 text-sm text-amber transition-colors hover:bg-amber/10 disabled:opacity-60"
            >
              <Icon name="Check" size={14} />
              Mark handled
            </button>
          ) : (
            <span className="text-xs text-dim">Read-only — clearing needs an admin (agents:operate).</span>
          )}
          {notice && (
            <span className={`text-xs ${notice.ok ? "text-green" : "text-amber"}`}>{notice.message}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-xs font-medium text-text">
          {item.agentLabel}
        </span>
        <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-xs text-text">
          {item.actionKind}
        </span>
        <span className={`rounded border border-border px-1.5 py-0.5 text-[10px] ${TIER_TONE[item.tier] ?? "text-dim"}`}>
          {item.tier}
        </span>
        {item.resolvedLevel != null && (
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-dim">
            dial L{item.resolvedLevel} · ceiling {item.resolvedCeiling ?? "—"}
          </span>
        )}
        {item.target ? (
          item.target.href ? (
            <Link href={item.target.href} className="text-xs text-accent hover:underline">
              {item.target.label}
            </Link>
          ) : (
            <span className="text-xs text-text">{item.target.label}</span>
          )
        ) : (
          <span className="text-[11px] text-dim">no target linked</span>
        )}
      </div>

      <label className="mb-1 block text-[11px] uppercase tracking-wide text-dim">Proposed action</label>
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
        {item.runId && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-dim">Run trace</dt>
            <dd>
              <Link href={`/workflows/runs/${item.runId}`} className="text-accent hover:underline">
                glass-box trace →
              </Link>
            </dd>
          </div>
        )}
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
