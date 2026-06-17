import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeFinanceReport, canSeeLaborCost } from "@/lib/auth/roles";
import { StatusBarChart } from "@/components/reporting/report-charts";
import type { CountDatum } from "@/types";

export const metadata = { title: "Finance · Reporting" };
export const dynamic = "force-dynamic"; // role-gated finance surface, never prerendered

const fmtCount = new Intl.NumberFormat("en-US");
/** Hours from minutes, rounded, with the "h" suffix the hub uses. */
const fmtHours = (min: number) => `${fmtCount.format(Math.round(min / 60))}h`;

/**
 * Pull the numeric magnitude out of a pre-formatted money string ("$12,500/mo").
 * The data layer only hands the finance figures back formatted (RevenueSplit is
 * strings, by design), so the total tile re-derives a sum from the digits. Returns
 * null when the string carries no number — the caller then omits the total rather
 * than printing a misleading $0.
 */
function parseMoney(formatted: string): number | null {
  const digits = formatted.replace(/[^0-9.]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="text-xs text-dim">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-dim">{hint}</div>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="mb-3">
        <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-dim">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/**
 * Finance domain report (#832, replaces the #794 nav placeholder). The Reports
 * group's Finance leaf, gated by `canSeeFinanceReport` (admin | finance) — a
 * role outside that set is redirected to the home hub, so none of these figures
 * reach the client. Reuses the already-shipped ReportsRepository reads
 * (`revenueSplit`, `timeEfficiency`) and the shared reporting charts (ADR-0062);
 * this front end only renders (ADR-0042).
 *
 * Labor cost is comp-sensitive (ADR-0082, #467): it is derived from effective
 * pay rates, so the whole labor-cost section — and the cost query that backs it —
 * rides the `canSeeLaborCost` gate, mirroring the BI hub exactly. When that gate
 * is closed the section is omitted entirely (never zeros) and the cost query
 * never runs server-side (`includeLaborCost=false`). Figures shown are aggregate
 * only — never a per-person pay rate.
 */
export default async function FinanceReportPage() {
  const roles = await getSessionRoles();
  if (!canSeeFinanceReport(roles)) redirect("/");

  // Labor cost mirrors the hub's idiom: the comp query runs ONLY for finance|admin,
  // gated by the same `includeLaborCost` flag, and the section is not even fetched
  // when the gate is closed.
  const showLaborCost = canSeeLaborCost(roles);
  const { reports } = getRepositories();
  const [revenue, timeEff] = await Promise.all([
    reports.revenueSplit(),
    showLaborCost ? reports.timeEfficiency(true) : reports.timeEfficiency(false),
  ]);

  // RevenueSplit is formatted strings; re-derive a numeric total when both parse.
  const recurringNum = parseMoney(revenue.recurring);
  const oneTimeNum = parseMoney(revenue.oneTime);
  const total =
    recurringNum != null && oneTimeNum != null ? recurringNum + oneTimeNum : null;

  // Utilization split (comp-free) → a categorical chart over attended minutes.
  const util = timeEff.utilization;
  const utilAttendedMin = util.billableMinutes + util.internalMinutes + util.adminMinutes;
  const utilizationData: CountDatum[] = [
    { label: "billable", count: Math.round(util.billableMinutes / 60) },
    { label: "internal", count: Math.round(util.internalMinutes / 60) },
    { label: "admin", count: Math.round(util.adminMinutes / 60) },
  ];

  // Labor cost — only present when the comp gate passed (timeEfficiency(true)).
  const laborCost = showLaborCost ? timeEff.laborCost : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Finance report"
        description="Recurring vs one-time revenue, utilization, and labor cost over the gold layer."
      >
        <Link
          href="/reporting"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          ← Reporting
        </Link>
      </PageHeader>

      {/* Headline revenue split (ADR-0062). RevenueSplit keeps recurring and
          one-time separate by design; the total is a re-derived convenience. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile
          label="Recurring MRR"
          value={revenue.recurring}
          hint="managed services"
        />
        <StatTile
          label="One-time fees"
          value={revenue.oneTime}
          hint="delivered assessments"
        />
        <StatTile
          label="Total revenue"
          value={total != null ? usd.format(total) : "—"}
          hint={total != null ? "recurring + one-time" : "no revenue recorded yet"}
        />
      </div>

      <ChartCard
        title="Revenue split"
        subtitle="Recurring managed services vs one-time assessment fees"
      >
        {total != null && total > 0 ? (
          <StatusBarChart
            data={[
              { label: "recurring", count: recurringNum ?? 0 },
              { label: "one-time", count: oneTimeNum ?? 0 },
            ]}
            color="#3FBF8F"
          />
        ) : (
          <p className="py-10 text-center text-sm text-dim">
            No revenue recorded yet — figures populate once managed services and
            assessments land.
          </p>
        )}
      </ChartCard>

      {/* Utilization — comp-free, always shown to finance/admin (ADR-0082). */}
      <SectionHeading
        id="utilization"
        title="Utilization"
        hint="billable / internal / admin attendance"
      />

      {utilAttendedMin > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Billable utilization"
              value={`${Math.round((util.billableMinutes / utilAttendedMin) * 100)}%`}
              hint="billable ÷ attended hours"
            />
            <StatTile
              label="Billable hours"
              value={fmtHours(util.billableMinutes)}
              hint="client-billable attendance"
            />
            <StatTile
              label="Internal hours"
              value={fmtHours(util.internalMinutes)}
              hint="internal work"
            />
            <StatTile
              label="Admin hours"
              value={fmtHours(util.adminMinutes)}
              hint="administrative overhead"
            />
          </div>
          <ChartCard
            title="Utilization split"
            subtitle="Attended hours by category — billable, internal, administrative"
          >
            <StatusBarChart data={utilizationData} color="#5B8DEF" />
          </ChartCard>
        </>
      ) : (
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="py-6 text-center text-sm text-dim">
            No attendance recorded yet — utilization populates once time entries flow.
          </p>
        </div>
      )}

      {/* Labor cost — comp-sensitive, finance/admin only (ADR-0082, #467). The whole
          section is omitted (not zeroed) when the comp gate is closed, and the cost
          query never ran. Figures are aggregate only — never a per-person rate. */}
      {laborCost && (
        <>
          <SectionHeading
            id="labor-cost"
            title="Labor cost"
            hint="aggregate — finance/admin only"
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatTile
              label="Labor cost (approved)"
              value={`$${fmtCount.format(laborCost.totalCost)}`}
              hint="Σ approved hours × effective rate — aggregate"
            />
            <StatTile
              label="Approved hours"
              value={fmtHours(laborCost.approvedHours * 60)}
              hint="corrected & approved timesheets"
            />
            <StatTile
              label="Blended rate"
              value={
                laborCost.blendedHourlyRate != null
                  ? `$${fmtCount.format(laborCost.blendedHourlyRate)}/h`
                  : "—"
              }
              hint="aggregate — not a per-person rate"
            />
          </div>
        </>
      )}
    </div>
  );
}

/** Anchored domain heading (ADR-0062), mirroring the BI hub's section headers. */
function SectionHeading({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <div id={id} className="mt-2 flex scroll-mt-16 items-baseline gap-2">
      <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
      {hint && <span className="text-xs text-dim">{hint}</span>}
    </div>
  );
}
