import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { auth } from "@/auth";
import { deleteDashboardAction } from "./actions";

/**
 * Dashboards — list-first surface (ADR-0075 §3, #412). A dashboard is a named
 * composition of saved report definitions (#411). Lists the viewer's own dashboards
 * plus any shared ones (own first, per the data layer). No capability gate — reporting
 * is broadly available (like saved views, ADR-0046); mutation is owner-scoped.
 */
export default async function DashboardsPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const isAdmin = session?.user?.roles?.includes("admin") ?? false;
  const { reportBuilder } = getRepositories();
  const dashboards = await reportBuilder.listDashboards(email);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Dashboards"
        description="Compose your saved reports into a shareable dashboard."
      >
        <Link href="/reporting/builder" className="text-sm text-dim transition-colors hover:text-text">
          ← Report builder
        </Link>
        <Link
          href="/reporting/dashboards/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          + New dashboard
        </Link>
      </PageHeader>

      {dashboards.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel p-8 text-center text-sm text-dim">
          No dashboards yet. Create one and add report tiles to it.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {dashboards.map((d) => {
            const canManage = d.isMine || isAdmin;
            return (
              <li key={d.id} className="rounded-xl border border-border bg-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/reporting/dashboards/${d.id}`} className="font-medium hover:underline">
                    {d.name}
                  </Link>
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-dim">
                    {d.visibility}
                  </span>
                </div>
                {!d.isMine && d.owner && (
                  <div className="mt-1 text-xs text-dim">shared by {d.owner}</div>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <Link
                    href={`/reporting/dashboards/${d.id}`}
                    className="text-xs text-accent transition-colors hover:underline"
                  >
                    Open →
                  </Link>
                  {canManage && (
                    <form action={deleteDashboardAction}>
                      <input type="hidden" name="id" value={d.id} />
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
