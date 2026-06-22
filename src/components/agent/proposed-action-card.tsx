"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { approveProposedAction } from "@/lib/agent/ask-action";
import { actionLabel } from "@/lib/agent/action-catalog";
import type { ProposedAction, ProposedActionTier } from "@/lib/services";

/**
 * The live agent-reply approval card (#1130). Renders ONE generalized `ProposedAction`
 * envelope returned by the orchestrator — comms sends AND non-comms actions (e.g. ticket
 * update / log-time) — labelled by its ADR-0055 `tier` and ADR-0016 `dataClass`. Approving
 * submits the envelope's `input` VERBATIM via `approveProposedAction` (the backend's only
 * send path re-asserts consent, ADR-0058). Nothing is ever sent automatically.
 *
 * Scope note: this is the inline, per-turn approval affordance on the chat surface. The
 * standalone operator action queue is the technician cockpit (#1014) — a separate surface.
 */

/** ADR-0055 tier → operator-facing badge styling + label. */
const TIER_BADGE: Record<ProposedActionTier, { label: string; className: string }> = {
  T0: { label: "T0 · read", className: "bg-green/15 text-green" },
  T1: { label: "T1 · internal write", className: "bg-accent/15 text-accent" },
  T2: { label: "T2 · client-facing", className: "bg-amber/15 text-amber" },
  T3: { label: "T3 · high-risk", className: "bg-red/15 text-red" },
};

/**
 * Labels for kinds not yet in the front-end action catalog (#994). These are backend-only
 * executors the catalog doesn't model yet; they migrate into `action-catalog.ts` as they
 * gain a front-end contract. `actionLabel` is consulted first (catalog source of truth),
 * this map second, the raw kind last.
 */
const SUPPLEMENTAL_LABEL: Record<string, string> = {
  update_ticket: "Update ticket",
  reply_ticket: "Reply on ticket",
  log_time: "Log time",
};

export function ProposedActionCard({ action }: { action: ProposedAction }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const tier = TIER_BADGE[action.tier] ?? {
    label: action.tier,
    className: "bg-panel-2 text-dim",
  };
  // Catalog is the source of truth; supplemental covers not-yet-cataloged backend kinds.
  const cataloged = actionLabel(action.kind);
  const kindLabel = cataloged !== action.kind ? cataloged : (SUPPLEMENTAL_LABEL[action.kind] ?? action.kind);
  const decided = result !== null;

  function approve() {
    if (isPending || decided) return;
    startTransition(async () => {
      setResult(await approveProposedAction(action.input));
    });
  }

  return (
    <div className="mt-2 max-w-[90%] self-start rounded-lg border border-border bg-panel-2 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <Icon name="Wand2" size={14} className="text-accent" />
        <span className="font-medium text-text">{kindLabel}</span>
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase", tier.className)}>
          {tier.label}
        </span>
        <span className="rounded bg-bg px-1.5 py-0.5 text-[10px] font-medium uppercase text-dim">
          {action.dataClass}
        </span>
        {action.consentOk === false && (
          <span className="rounded bg-red/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-red">
            consent withdrawn
          </span>
        )}
      </div>

      {action.rationale && <p className="mt-1.5 text-xs text-dim">{action.rationale}</p>}

      {!decided ? (
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={approve}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/25 disabled:opacity-50"
          >
            {isPending ? (
              <Icon name="LoaderCircle" size={13} className="animate-spin" />
            ) : (
              <Icon name="Check" size={13} />
            )}
            {isPending ? "Approving…" : "Approve & run"}
          </button>
          <span className="text-[11px] text-dim">Nothing is sent until you approve.</span>
        </div>
      ) : (
        <p
          className={cn(
            "mt-2.5 inline-flex items-center gap-1.5 text-xs",
            result.ok ? "text-green" : "text-red",
          )}
        >
          <Icon name={result.ok ? "CircleCheck" : "CircleAlert"} size={13} />
          {result.message}
        </p>
      )}
    </div>
  );
}
