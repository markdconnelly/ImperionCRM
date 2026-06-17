import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeServiceReport } from "@/lib/auth/roles";
import { StatusBarChart } from "@/components/reporting/report-charts";

export const metadata = { title: "Service · Reporting" };
export const dynamic = "force-dynamic"; // role-gated service surface, never prerendered

const fmtCount = new Intl.NumberFormat("en-US");

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
 * Service domain report (#831) — the Reports group's "Service" leaf (#794),
 * promoting the deep-link target out of the BI hub's Service Desk section
 * (ADR-0062) into a dedicated page. One read over the already-shipped service
 * read model (`ReportsRepository.serviceDesk()`): ticket flow by status / queue,
 * the opened-per-week trend, and Defender↔ticket pairings (ADR-0059). This front
 * end only renders (ADR-0042); ingestion + the 0074 label lookup are backend work.
 *
 * RBAC (ADR-0030, #794): gated by `canSeeServiceReport` (admin | Technician) — the
 * same gate as the Service group it belongs to; other roles are redirected home.
 */
export default async function ServiceReportPage() {
  const roles = await getSessionRoles();
  if (!canSeeServiceReport(roles)) redirect("/");

  const { reports } = getRepositories();
  const serviceDesk = await reports.serviceDesk();

  // Queues actually in use — the source seeds an "unassigned" bucket; exclude it
  // so the tile reads as real routing destinations (mirrors the hub, ADR-0062).
  const queuesInUse = serviceDesk.byQueue.filter((q) => q.label !== "unassigned").length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Service report"
        description="Service-desk ticket flow, queue distribution, and Defender pairings over the gold layer (ADR-0062)."
      >
        <Link
          href="/reporting"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          ← Reporting
        </Link>
        <Link
          href="/reporting#service-desk"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          BI hub →
        </Link>
      </PageHeader>

      {/* Headline ticket flow (ADR-0062, #290). */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Tickets (all time)" value={fmtCount.format(serviceDesk.total)} />
        <StatTile
          label="Opened (30d)"
          value={fmtCount.format(serviceDesk.opened30d)}
          hint="from Autotask webhook + bulk merge"
        />
        <StatTile
          label="Defender-linked"
          value={fmtCount.format(serviceDesk.defenderLinked)}
          hint="incident ↔ ticket pairings (ADR-0059)"
        />
        <StatTile
          label="Queues in use"
          value={fmtCount.format(queuesInUse)}
          hint="labels pending (0074)"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard
          title="Tickets by status"
          subtitle="Raw Autotask statuses — labels land with the 0074 follow-up"
        >
          {serviceDesk.byStatus.length > 0 ? (
            <StatusBarChart data={serviceDesk.byStatus} color="#5B8DEF" />
          ) : (
            <p className="py-10 text-center text-sm text-dim">No tickets ingested yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Tickets by queue" subtitle="Open + closed, all time">
          {serviceDesk.byQueue.length > 0 ? (
            <StatusBarChart data={serviceDesk.byQueue} color="#7C6BF0" />
          ) : (
            <p className="py-10 text-center text-sm text-dim">No tickets ingested yet.</p>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Tickets opened per week"
        subtitle="Last 8 weeks (no completion dates in the source yet — opened flow only)"
      >
        {serviceDesk.openedByWeek.length > 0 ? (
          <StatusBarChart data={serviceDesk.openedByWeek} color="#3FBF8F" />
        ) : (
          <p className="py-10 text-center text-sm text-dim">
            No tickets opened in the last 8 weeks.
          </p>
        )}
      </ChartCard>
    </div>
  );
}
