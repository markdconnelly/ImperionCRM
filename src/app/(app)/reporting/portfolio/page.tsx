import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PortfolioTable } from "@/components/reporting/portfolio-table";
import { getRepositories } from "@/lib/data";

export const metadata = { title: "Portfolio rollup · Reporting" };

/**
 * Portfolio rollup (ADR-0069 D5, #350) — the cross-project planning surface that
 * goes beyond the project board's per-type grouping: one screen lists every
 * project with its rolled-up R/Y/G health and its next milestone, filterable by
 * account/owner/type/health and exportable to CSV. Pure read model over
 * `project` + `project_milestone` (no new tables) — the GUI repo reads directly
 * for rendering (ADR-0042). Money/comp-free, so no role redaction is needed here.
 */
export default async function PortfolioPage() {
  const { crm } = getRepositories();
  const rows = await crm.listPortfolio();
  const open = rows.filter((r) => r.status !== "complete").length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Portfolio rollup"
        description={`${rows.length} projects · ${open} active — health and next milestone across every project (ADR-0069 D5).`}
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

      <PortfolioTable rows={rows} />
    </div>
  );
}
