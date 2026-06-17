import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { PortfolioTable } from "@/components/reporting/portfolio-table";
import { StatusBarChart } from "@/components/reporting/report-charts";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeProjectReport } from "@/lib/auth/roles";
import type { Health } from "@/types";

export const metadata = { title: "Project report · Reporting" };
export const dynamic = "force-dynamic"; // role-gated delivery surface, never prerendered

const fmtCount = new Intl.NumberFormat("en-US");

function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="text-xs text-dim">{label}</div>
      <div
        className={`mt-2 font-display text-2xl font-semibold tracking-tight ${tone ?? ""}`}
      >
        {value}
      </div>
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

const HEALTH_TONE: Record<Health, string> = {
  green: "text-green",
  amber: "text-amber",
  red: "text-red",
};

/**
 * Project domain report (#830, replacing the #794 nav placeholder) — the delivery
 * BI leaf under the Reports group. A thin composition over the already-shipped
 * read model (ADR-0042: the GUI repo reads directly for rendering): the
 * cross-project portfolio rollup (`crm.listPortfolio()`, ADR-0069 D5 / #350) plus
 * the projects-by-status category rollup (`reports.projectsByStatus()`, ADR-0065
 * B5 / #615). No new data layer, no migration — it reuses the `PortfolioTable`
 * component (filters + CSV export) wholesale.
 *
 * RBAC (ADR-0030, #794): gated by `canSeeProjectReport` (admin | project_manager),
 * the same gate as the Projects group it lives under. Delivery health is comp-free,
 * so no per-figure redaction is needed.
 */
export default async function ProjectReportPage() {
  const roles = await getSessionRoles();
  if (!canSeeProjectReport(roles)) redirect("/");

  const { crm, reports } = getRepositories();
  const [rows, byStatus] = await Promise.all([
    crm.listPortfolio(),
    reports.projectsByStatus(),
  ]);

  // Headline counts off the portfolio rollup (the same read model the table
  // renders), so the tiles and the table never disagree.
  const total = rows.length;
  const active = rows.filter((r) => r.status !== "complete").length;
  const complete = total - active;

  // Health mix is the worst-of-milestone health per project; projects with no
  // milestones report `health: null` and are excluded from the R/Y/G tally.
  const healthCount = (h: Health) => rows.filter((r) => r.health === h).length;
  const red = healthCount("red");
  const amber = healthCount("amber");
  const green = healthCount("green");
  const tracked = red + amber + green;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Project report"
        description={`${fmtCount.format(total)} project${total === 1 ? "" : "s"} · ${fmtCount.format(active)} active — delivery health and status across every project (ADR-0069 D5).`}
      >
        <Link
          href="/reporting"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          ← Reporting
        </Link>
        <Link
          href="/projects"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          Project board →
        </Link>
      </PageHeader>

      {total === 0 ? (
        <div className="rounded-lg border border-border bg-panel px-4 py-8 text-center text-sm text-dim">
          No projects yet — delivery health and the portfolio rollup populate once
          projects land on the board.
        </div>
      ) : (
        <>
          {/* Headline delivery roll-up — counts off the portfolio read model. */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Projects"
              value={fmtCount.format(total)}
              hint={`${fmtCount.format(active)} active · ${fmtCount.format(complete)} complete`}
            />
            <StatTile
              label="At risk"
              value={fmtCount.format(red)}
              hint={tracked > 0 ? "red health (worst milestone)" : "no milestone health yet"}
              tone={red > 0 ? HEALTH_TONE.red : undefined}
            />
            <StatTile
              label="Needs attention"
              value={fmtCount.format(amber)}
              hint={tracked > 0 ? "amber health (worst milestone)" : "no milestone health yet"}
              tone={amber > 0 ? HEALTH_TONE.amber : undefined}
            />
            <StatTile
              label="On track"
              value={fmtCount.format(green)}
              hint={tracked > 0 ? "green health (worst milestone)" : "no milestone health yet"}
              tone={green > 0 ? HEALTH_TONE.green : undefined}
            />
          </div>

          {/* Projects-by-status category rollup (ADR-0065 B5, #615). */}
          <ChartCard
            title="Projects by status"
            subtitle="Every project grouped by its delivery status"
          >
            {byStatus.length > 0 ? (
              <StatusBarChart data={byStatus} color="#5B8DEF" />
            ) : (
              <p className="py-6 text-center text-sm text-dim">
                No status breakdown available yet.
              </p>
            )}
          </ChartCard>

          {/* Cross-project portfolio rollup — the reused #350 component (filters,
              health dots, next milestone, CSV export) over the same read model. */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-base font-semibold tracking-tight">
                Portfolio rollup
              </h2>
              <p className="text-xs text-dim">
                Every project with its rolled-up health and next milestone —
                filter by account/owner/type/health, or export the view to CSV
                (ADR-0069 D5).
              </p>
            </div>
            <PortfolioTable rows={rows} />
          </div>
        </>
      )}
    </div>
  );
}
