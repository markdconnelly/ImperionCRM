"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { AUTONOMY_RUNGS, RUNG_LABEL, type AutonomyRung } from "@/lib/agent/icm-autonomy";
import type { AutonomyPolicy } from "@/lib/agent/icm-runs";
import type { IcmActionResult } from "@/app/(app)/workflows/actions";

/**
 * Per-workflow autonomy dial (#278, ADR-0061/0087). Sets the rung (L0–L3) + the
 * orthogonal Mark-gate flag for an ICM workflow, writing the data-driven
 * `agent_autopilot_policy` through the backend (ADR-0042). Admin-only (`canEdit`,
 * `agents:operate`); read-only display otherwise. Reversible — re-flipping is
 * another save.
 */
export function AutonomyDial({
  policy,
  canEdit,
  setAction,
}: {
  policy: AutonomyPolicy;
  canEdit: boolean;
  setAction: (formData: FormData) => Promise<IcmActionResult>;
}) {
  const [rung, setRung] = useState<AutonomyRung>(policy.rung);
  const [markGated, setMarkGated] = useState(policy.markGated);
  const [notice, setNotice] = useState<IcmActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => setNotice(await setAction(formData)));
  }

  return (
    <section className="rounded-xl border border-border bg-panel p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-tight">Autonomy dial</h3>
        <span className="flex items-center gap-1 text-[11px] text-dim">
          <Icon name="Gauge" size={12} />
          per-workflow · audited · reversible (ADR-0087)
        </span>
      </div>
      <p className="mb-3 text-sm text-dim">
        How much the <span className="text-text">{policy.agentKey}</span> workflow may do on its
        own. Every workflow STARTS in draft (L1) — a human approves every checkpoint — and ramps
        up only after its draft-mode quality is trusted. The Mark-gate keeps customer-facing /
        money legs in the human queue regardless of rung.
      </p>

      <form action={onSubmit} className="flex flex-col gap-3">
        <input type="hidden" name="agentKey" value={policy.agentKey} />
        <input type="hidden" name="workflowKey" value={policy.workflowKey} />
        <fieldset disabled={!canEdit} className="flex flex-col gap-2">
          {AUTONOMY_RUNGS.map((r) => {
            const active = rung === r;
            return (
              <label
                key={r}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  active ? "border-accent bg-panel-2" : "border-border bg-panel-2/50 hover:border-accent/50"
                } ${canEdit ? "" : "cursor-default opacity-80"}`}
              >
                <input
                  type="radio"
                  name="rung"
                  value={r}
                  checked={active}
                  onChange={() => setRung(r)}
                  className="sr-only"
                />
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    active ? "border-accent" : "border-border"
                  }`}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-accent" />}
                </span>
                <span className="text-sm text-text">{RUNG_LABEL[r]}</span>
              </label>
            );
          })}
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            name="markGated"
            checked={markGated}
            onChange={(e) => setMarkGated(e.target.checked)}
            disabled={!canEdit}
            className="h-4 w-4 rounded border-border bg-panel-2 accent-accent disabled:opacity-60"
          />
          Mark-gate — money / customer-facing / deploy legs still funnel to the human queue
        </label>

        {policy.note && <p className="text-[11px] text-dim">Note: {policy.note}</p>}

        <div className="flex items-center gap-3">
          {canEdit ? (
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save autonomy"}
            </button>
          ) : (
            <span className="text-xs text-dim">Read-only — changing autonomy needs an admin.</span>
          )}
          {notice && (
            <span className={`text-xs ${notice.ok ? "text-green" : "text-amber"}`}>{notice.message}</span>
          )}
        </div>
      </form>
    </section>
  );
}
