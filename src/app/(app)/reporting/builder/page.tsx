import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { auth } from "@/auth";
import { getReportableObject } from "@/lib/reporting/semantic-model";
import { deleteReportAction } from "./actions";

/**
 * Self-serve report builder — list-first surface (ADR-0075, #411). Lists the viewer's
 * own report definitions plus any shared ones (own first, per the data layer), and
 * routes to the builder for a new or existing report. Reporting is broadly available
 * (like saved views, ADR-0046): no capability gate — RBAC is enforced on FIELDS inside
 * the builder, and mutation is owner-scoped. Reports persist to `report_definition`
 * (migration 0124) and render over the curated BI-hub read model.
 */
export default async function ReportBuilderPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const isAdmin = session?.user?.roles?.includes("admin") ?? false;
  const { reportBuilder } = getRepositories();
  const reports = await reportBuilder.listReportDefinitions(email);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Report builder"
        description="Build your own reports over the BI-hub read model — pick an object, fields, grouping, and a chart. Save and share."
      >
        <Link href="/reporting" className="text-sm text-dim transition-colors hover:text-text">
          ← Reporting
        </Link>
        <Link
          href="/reporting/builder/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          + New report
        </Link>
      </PageHeader>

      {reports.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel p-8 text-center text-sm text-dim">
          No saved reports yet. Create one to get started.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {reports.map((r) => {
            const objLabel = getReportableObject(r.rootObject)?.label ?? r.rootObject;
            const canManage = r.isMine || isAdmin;
            return (
              <li key={r.id} className="rounded-xl border border-border bg-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{r.name}</div>
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-dim">
                    {r.visibility}
                  </span>
                </div>
                <div className="mt-1 text-xs text-dim">
                  {objLabel} · {r.fields.length} field{r.fields.length === 1 ? "" : "s"}
                  {!r.isMine && r.owner && ` · shared by ${r.owner}`}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  {r.isMine ? (
                    <Link
                      href={`/reporting/builder/${r.id}`}
                      className="text-xs text-accent transition-colors hover:underline"
                    >
                      Open & edit →
                    </Link>
                  ) : (
                    <span className="text-xs text-dim">View only (not owner)</span>
                  )}
                  {canManage && (
                    <form action={deleteReportAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="text-xs text-dim transition-colors hover:text-red">
                        Delete
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
