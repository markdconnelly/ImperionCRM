import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { CI_TYPE_LABEL, CI_TYPE_ICON } from "@/lib/cmdb/ci";
import { CRITICALITY_LABEL, CRITICALITY_TONE } from "@/lib/cmdb/criticality";
import { CriticalityBadge } from "@/components/cmdb/criticality-badge";
import type { CiImpact } from "@/lib/cmdb/impact";

/**
 * CI-detail impact panel (#650) — "changing/removing this affects …". Renders the
 * blast-radius read-model (`analyzeImpact`) computed server-side: a weighted summary
 * strip, then the affected CIs grouped by type, each row showing its hop distance +
 * criticality. Pure presentational — the traversal + weighting live in `impact.ts`
 * (the reusable read-model #373 change-risk and #320 incident-triage also consume).
 */

const toneClass: Record<(typeof CRITICALITY_TONE)["low"], string> = {
  red: "text-red",
  amber: "text-amber",
  accent: "text-accent",
  dim: "text-dim",
};

export function ImpactPanel({ impact }: { impact: CiImpact }) {
  const { totalAffected, totalWeight, peakCriticality, depth, groups } = impact;

  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="Radius" size={15} className="text-dim" />
          <h2 className="text-sm font-medium text-text">Impact analysis</h2>
          <span className="text-xs text-dim">
            changing or removing this affects {totalAffected} CI
            {totalAffected === 1 ? "" : "s"}
          </span>
        </div>
        <span className="text-[11px] text-dim">≤ {depth} hops</span>
      </div>

      {totalAffected === 0 ? (
        <p className="py-6 text-center text-sm text-dim">
          Nothing depends on this CI within {depth} hop{depth === 1 ? "" : "s"}.
        </p>
      ) : (
        <>
          {/* Weighted summary strip. */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            <Stat label="Affected CIs" value={String(totalAffected)} />
            <Stat label="Blast weight" value={String(totalWeight)} />
            <Stat
              label="Peak criticality"
              value={peakCriticality ? CRITICALITY_LABEL[peakCriticality] : "—"}
              tone={peakCriticality ? toneClass[CRITICALITY_TONE[peakCriticality]] : undefined}
            />
          </div>

          {/* Affected CIs grouped by type (most-weighted group first). */}
          <div className="flex flex-col gap-4">
            {groups.map((g) => (
              <div key={g.ciType}>
                <div className="mb-1.5 flex items-center gap-2">
                  <Icon name={CI_TYPE_ICON[g.ciType]} size={13} className="text-dim" />
                  <h3 className="text-xs font-medium text-text">
                    {CI_TYPE_LABEL[g.ciType]}
                  </h3>
                  <span className="text-[11px] text-dim">
                    {g.items.length} · weight {g.weight}
                  </span>
                </div>
                <ul className="flex flex-col divide-y divide-border/50">
                  {g.items.map((a) => (
                    <li
                      key={`${a.ci.ciType}:${a.ci.ciId}`}
                      className="flex items-center gap-2 py-2"
                    >
                      <Link
                        href={`/cmdb/${a.ci.ciType}/${a.ci.ciId}`}
                        className="min-w-0 flex-1 truncate text-sm text-text hover:text-accent"
                      >
                        {a.ci.displayName}
                      </Link>
                      <span className="shrink-0 text-[11px] text-dim">
                        {a.hops} hop{a.hops === 1 ? "" : "s"}
                      </span>
                      <CriticalityBadge
                        derivedDefault={a.ci.derivedDefault}
                        override={a.ci.override}
                        size="xs"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-4 text-[11px] text-dim">
        Criticality-weighted blast radius over the CI relationship graph (cycle-safe,
        depth-bounded; ADR-0078). Reusable read-model — also feeds change-risk and
        incident-triage.
      </p>
    </div>
  );
}

/** One summary stat tile in the impact strip. */
function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel-2 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-dim">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${tone ?? "text-text"}`}>{value}</p>
    </div>
  );
}
