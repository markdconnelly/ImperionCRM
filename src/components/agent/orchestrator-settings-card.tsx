"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import {
  AGENT_PRESETS,
  PRESET_META,
  budgetProgress,
  formatUsd,
  modelShortName,
  type AgentPreset,
  type ModelPair,
} from "@/lib/agent/settings";
import type { SaveAgentSettingsResult } from "@/app/(app)/agents/actions";

const TONE_BAR: Record<string, string> = {
  green: "bg-green",
  amber: "bg-amber",
  red: "bg-red",
};

/**
 * Orchestrator card (ADR-0048): model-tier preset selector + monthly budget with
 * month-to-date spend. Saves via the server action → backend PUT /agent/settings
 * (backend ADR-0037). Read-only for non-admins and when the backend isn't wired.
 */
export function OrchestratorSettingsCard({
  preset,
  budgetUsdMonthly,
  spendMonthToDateUsd,
  presets,
  canEdit,
  canSave,
  sourceNote,
  saveAction,
}: {
  preset: AgentPreset;
  budgetUsdMonthly: number | null;
  spendMonthToDateUsd: number;
  presets: Record<AgentPreset, ModelPair>;
  /** Admin (settings:write) — controls render enabled. */
  canEdit: boolean;
  /** Backend reachable — saving can actually land. */
  canSave: boolean;
  /** Degradation notice ('' when live). */
  sourceNote: string;
  saveAction: (formData: FormData) => Promise<SaveAgentSettingsResult>;
}) {
  const [selected, setSelected] = useState<AgentPreset>(preset);
  const [budget, setBudget] = useState(budgetUsdMonthly == null ? "" : String(budgetUsdMonthly));
  const [notice, setNotice] = useState<SaveAgentSettingsResult | null>(null);
  const [pending, startTransition] = useTransition();

  const editable = canEdit && canSave;
  const progress = budgetProgress(spendMonthToDateUsd, budgetUsdMonthly);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      setNotice(await saveAction(formData));
    });
  }

  return (
    <section className="rounded-xl border border-border bg-panel p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-tight">Orchestrator</h3>
        <span className="flex items-center gap-1 text-[11px] text-dim">
          <Icon name="Cpu" size={12} />
          Claude tool-use loop (backend ADR-0036)
        </span>
      </div>

      <form action={onSubmit} className="flex flex-col gap-4">
        {/* Model-tier preset (backend ADR-0037) */}
        <fieldset disabled={!editable}>
          <legend className="mb-2 text-xs text-dim">Model tier — each preset pins the (routing, synthesis) Claude pair</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {AGENT_PRESETS.map((p) => {
              const pair = presets[p];
              const active = selected === p;
              return (
                <label
                  key={p}
                  className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors ${
                    active ? "border-accent bg-panel-2" : "border-border bg-panel-2/50 hover:border-accent/50"
                  } ${editable ? "" : "cursor-default opacity-80"}`}
                >
                  <input
                    type="radio"
                    name="preset"
                    value={p}
                    checked={active}
                    onChange={() => setSelected(p)}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between text-sm font-medium text-text">
                    {PRESET_META[p].label}
                    {active && <Icon name="Check" size={14} className="text-accent" />}
                  </span>
                  <span className="text-[11px] leading-snug text-dim">{PRESET_META[p].tagline}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-dim">
                      route · {modelShortName(pair.cheap)}
                    </span>
                    <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-dim">
                      synth · {modelShortName(pair.premium)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Monthly budget + month-to-date spend */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-xs text-dim">
              <Icon name="Wallet" size={12} />
              Monthly budget (USD) — blank = no cap
            </span>
            <input
              type="text"
              inputMode="decimal"
              name="budgetUsdMonthly"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="No cap"
              disabled={!editable}
              className="w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none disabled:opacity-60"
            />
            <span className="mt-1 block text-[11px] text-dim">
              A HARD ceiling — at the cap the orchestrator refuses turns until it is raised.
            </span>
          </label>

          <div>
            <span className="mb-1 block text-xs text-dim">Month-to-date spend</span>
            <div className="rounded-md border border-border bg-panel-2 px-3 py-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-display text-text">{formatUsd(spendMonthToDateUsd)}</span>
                <span className="text-[11px] text-dim">
                  {budgetUsdMonthly != null && budgetUsdMonthly > 0
                    ? `of ${formatUsd(budgetUsdMonthly)} (${progress.pct}%)`
                    : "no cap set"}
                </span>
              </div>
              {progress.pct != null && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full rounded-full ${TONE_BAR[progress.tone]}`}
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
              )}
            </div>
            <span className="mt-1 block text-[11px] text-dim">
              Summed from the orchestrator&apos;s audited turns (agent.turn cost metering).
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {editable && (
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          )}
          {notice && (
            <span className={`text-xs ${notice.ok ? "text-green" : "text-amber"}`}>{notice.message}</span>
          )}
          {!notice && !canEdit && (
            <span className="text-xs text-dim">Read-only — changing the tier or budget needs an admin.</span>
          )}
          {!notice && canEdit && !canSave && (
            <span className="text-xs text-amber">{sourceNote}</span>
          )}
        </div>
        {sourceNote && (canSave || !canEdit) && (
          <p className="text-[11px] text-dim">{sourceNote}</p>
        )}
      </form>
    </section>
  );
}
