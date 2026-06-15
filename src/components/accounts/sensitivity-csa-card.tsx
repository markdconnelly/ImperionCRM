import { Icon } from "@/components/ui/icon";
import {
  benchmarkCustomAttributes,
  STANDARD_CSA_SET,
  type SensitivityCsaForAccount,
} from "@/lib/security/sensitivity-csa";

// Concise sensitivity-label + custom-security-attribute posture badges for the
// account posture page (#259, ADR-0051). Mark's per-source review (2026-06-12)
// asked for this surfaced but CONCISE — labels as inline chips, custom attributes
// shown as a coverage benchmark vs the MSP standard set, NOT an exhaustive table.
//
// Data is account-scoped READ-only and degrades to an honest "absent" line when
// the collector lane (LocalPipeline #141) hasn't populated bronze yet.

const COVERAGE_COLOR = (pct: number): string =>
  pct >= 75 ? "text-green" : pct >= 40 ? "text-amber" : "text-red";

function Chip({ children, tone = "dim" }: { children: React.ReactNode; tone?: "dim" | "green" | "red" }) {
  const cls =
    tone === "green"
      ? "bg-green/10 text-green"
      : tone === "red"
        ? "bg-red/10 text-red"
        : "bg-panel-2 text-dim";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

export function SensitivityCsaCard({ data }: { data: SensitivityCsaForAccount }) {
  const { labels, attributes } = data;
  const bench = benchmarkCustomAttributes(attributes);
  const coveragePct = Math.round(bench.coverage * 100);
  // Distinct active label names across mapped tenants — concise, deduped.
  const activeLabels = [
    ...new Map(
      labels.filter((l) => l.isActive).map((l) => [(l.name ?? l.labelId).toLowerCase(), l]),
    ).values(),
  ];

  const nothing = labels.length === 0 && attributes.length === 0;

  return (
    <section className="rounded-xl border border-border bg-panel p-4">
      <h3 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
        <Icon name="Tags" size={15} />
        Information protection
      </h3>
      <p className="mb-3 text-xs text-dim">
        M365 sensitivity labels and Entra custom security attributes for this company&apos;s
        mapped tenants, benchmarked against the MSP standard (ADR-0051).
      </p>

      {nothing ? (
        <p className="text-sm text-dim">
          No sensitivity-label or custom-attribute data collected yet — the on-prem collector
          (LocalPipeline #141) populates this from the next bulk ingest.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <h4 className="text-xs font-semibold text-dim">Sensitivity labels</h4>
              <span className="text-[11px] text-dim">{activeLabels.length} active</span>
            </div>
            {activeLabels.length === 0 ? (
              <p className="text-sm text-dim">No active labels observed.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {activeLabels.map((l) => (
                  <Chip key={`${l.tenantId}:${l.labelId}`}>{l.name ?? l.labelId}</Chip>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <h4 className="text-xs font-semibold text-dim">Custom security attributes</h4>
              <span className={`text-[11px] font-medium ${COVERAGE_COLOR(coveragePct)}`}>
                {coveragePct}% of standard
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_CSA_SET.map((name) => {
                const present = bench.present.includes(name);
                return (
                  <Chip key={name} tone={present ? "green" : "red"}>
                    {present ? "✓ " : "✗ "}
                    {name}
                  </Chip>
                );
              })}
            </div>
            {bench.missing.length > 0 && (
              <p className="mt-2 text-[11px] text-dim">
                {bench.missing.length} standard attribute
                {bench.missing.length === 1 ? "" : "s"} not yet defined in this account&apos;s
                tenants.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
