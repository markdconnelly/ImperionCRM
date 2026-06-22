"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import {
  ACTION_AUTONOMY_LEVELS,
  LEVEL_META,
  resolveTierCeiling,
  type AutonomyLevel,
} from "@/lib/agent/action-autonomy";
import type { ActionAutonomyDial } from "@/lib/agent/action-autonomy-data";
import type { SetActionAutonomyResult } from "@/app/(app)/agents/actions";

/**
 * The 1–5 ACTUATION autonomy dial (#1013 / 2E-3, ADR-0107 D4 / ADR-0109). An operator
 * slider that sets how far an acting agent may go on its own before an action routes to
 * the approval cockpit. Writes the FE-owned `agent_action_autonomy` row through an
 * `agents:operate`-gated server action; read-only display otherwise. The resolved
 * ADR-0055 tier ceiling for the chosen level is shown live (the same pure helper the
 * backend dispatcher uses). Reversible — re-saving is another upsert.
 *
 * Distinct from the per-workflow ICM rung dial (L0–L3, `agent_autopilot_policy`): one
 * dial concept, two planes (ADR-0109).
 */
export function ActuationDial({
  agentKey,
  label,
  actionClass,
  dial,
  canEdit,
  setAction,
}: {
  agentKey: string;
  /** Human label for the acting agent (e.g. "Global default", "Sales / Outreach"). */
  label: string;
  /** The action class this dial scopes (`*` = the agent default). */
  actionClass: string;
  /** The persisted dial, or null when none is set yet (fail-closed to level 1). */
  dial: ActionAutonomyDial | null;
  canEdit: boolean;
  setAction: (formData: FormData) => Promise<SetActionAutonomyResult>;
}) {
  const [level, setLevel] = useState<AutonomyLevel>(dial?.level ?? 1);
  const [notice, setNotice] = useState<SetActionAutonomyResult | null>(null);
  const [pending, startTransition] = useTransition();

  const ceiling = resolveTierCeiling(level, dial?.ceilings ?? null);
  const meta = LEVEL_META[level];

  function onSubmit(formData: FormData) {
    startTransition(async () => setNotice(await setAction(formData)));
  }

  return (
    <form
      action={onSubmit}
      className="flex flex-col gap-3 rounded-lg border border-border bg-panel-2 p-4"
    >
      <input type="hidden" name="agentKey" value={agentKey} />
      <input type="hidden" name="actionClass" value={actionClass} />
      <input type="hidden" name="level" value={level} />

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">{label}</p>
          <p className="font-mono text-[10px] text-dim">
            {agentKey}
            {actionClass !== "*" && ` · ${actionClass}`}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-accent">
          <Icon name="ShieldCheck" size={11} />
          ceiling {ceiling}
        </span>
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-1.5 disabled:opacity-80">
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={level}
          onChange={(e) => setLevel(Number(e.target.value) as AutonomyLevel)}
          aria-label={`Autonomy level for ${label}`}
          className="w-full accent-accent disabled:cursor-default"
        />
        <div className="flex justify-between px-0.5 text-[9px] text-dim">
          {ACTION_AUTONOMY_LEVELS.map((l) => (
            <span key={l} className={l === level ? "font-semibold text-text" : ""}>
              {l}
            </span>
          ))}
        </div>
      </fieldset>

      <div className="rounded-md border border-border bg-panel p-2.5">
        <p className="text-xs font-medium text-text">
          {level} · {meta.name}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-dim">{meta.blurb}</p>
      </div>

      <div className="flex items-center gap-3">
        {canEdit ? (
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save level"}
          </button>
        ) : (
          <span className="text-[11px] text-dim">Read-only — changing autonomy needs an admin.</span>
        )}
        {notice && (
          <span className={`text-[11px] ${notice.ok ? "text-green" : "text-amber"}`}>
            {notice.message}
          </span>
        )}
      </div>
    </form>
  );
}
