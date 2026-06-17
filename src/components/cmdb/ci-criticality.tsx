"use client";

import { Icon } from "@/components/ui/icon";
import { CriticalityBadge } from "@/components/cmdb/criticality-badge";
import {
  CRITICALITY_LEVELS,
  CRITICALITY_LABEL,
} from "@/lib/cmdb/criticality";
import {
  setCiCriticalityOverrideAction,
  deriveCiCriticalityAction,
} from "@/app/(app)/cmdb/actions";
import type { ConfigurationItem } from "@/types";

/**
 * CI-detail criticality / business-impact panel (#648, `cmdb_ci_overlay`, migration 0132).
 * Shows the EFFECTIVE criticality badge (`override ?? derivedDefault`) and, for admins
 * (`cmdb:write`, enforced server-side), an override control: pick a level or "Inherit
 * derived default" to clear it. A "Re-derive" button recomputes the derived defaults from
 * current silver (overrides are kept). The effective criticality is the weighting input
 * for impact analysis (#650).
 *
 * `canWrite` toggles the authoring affordances; the server re-asserts the gate anyway.
 */
export function CiCriticality({
  ci,
  canWrite,
}: {
  ci: ConfigurationItem;
  canWrite: boolean;
}) {
  const isOverridden = ci.override !== null;

  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="Gauge" size={15} className="text-dim" />
          <h2 className="text-sm font-medium text-text">Criticality</h2>
        </div>
        <CriticalityBadge derivedDefault={ci.derivedDefault} override={ci.override} />
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 text-sm">
          <dt className="text-dim">Derived default</dt>
          <dd className="text-right text-text">{CRITICALITY_LABEL[ci.derivedDefault]}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 text-sm">
          <dt className="text-dim">Override</dt>
          <dd className="text-right text-text">
            {isOverridden ? CRITICALITY_LABEL[ci.override!] : "— (inherits default)"}
          </dd>
        </div>
      </dl>

      {canWrite ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <form action={setCiCriticalityOverrideAction} className="flex items-end gap-2">
            <input type="hidden" name="ciType" value={ci.ciType} />
            <input type="hidden" name="ciId" value={ci.ciId} />
            <label className="flex flex-col gap-1 text-xs text-dim">
              Admin override
              <select
                name="override"
                defaultValue={ci.override ?? "inherit"}
                className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
              >
                <option value="inherit">Inherit derived default</option>
                {CRITICALITY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {CRITICALITY_LABEL[level]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
            >
              Save override
            </button>
          </form>

          <form action={deriveCiCriticalityAction}>
            <input type="hidden" name="ciType" value={ci.ciType} />
            <input type="hidden" name="ciId" value={ci.ciId} />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-dim transition-colors hover:text-text"
              title="Recompute derived defaults from silver attributes (overrides are kept)"
            >
              <Icon name="RefreshCw" size={12} /> Re-derive
            </button>
          </form>
        </div>
      ) : (
        <p className="mt-4 text-[11px] text-dim">
          Effective criticality = override ?? derived default. The derived default is
          computed from silver attributes (account tier, device role); an admin can
          override it. The override is the weighting input for impact analysis.
        </p>
      )}
    </div>
  );
}
