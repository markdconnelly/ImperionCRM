import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { runSavedReport } from "@/lib/reporting/run-saved-report";
import { getReportableObject } from "@/lib/reporting/semantic-model";
import { ReportResultView } from "@/components/reporting/report-result-view";
import { addTileAction, removeTileAction, updateDashboardAction } from "../actions";

const inputCls =
  "rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none";

/**
 * A dashboard — composes saved report definitions into tiles (ADR-0075 §3, #412). Each
 * tile RE-EXECUTES its saved report against the VIEWER's roles (run-time RBAC, ADR-0075
 * §2) via `runSavedReport`, so a shared dashboard never leaks a field the viewer can't
 * see. Owner-only controls (add/remove tile, rename/share) appear only for the owner;
 * the actions re-enforce ownership server-side.
 */
export default async function DashboardViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const email = session?.user?.email ?? null;
  const repos = getRepositories();
  const dashboard = await repos.reportBuilder.getDashboard(id, email);
  if (!dashboard) redirect("/reporting/dashboards");

  const [roles, items, allReports] = await Promise.all([
    getSessionRoles(),
    repos.reportBuilder.listDashboardItems(id),
    repos.reportBuilder.listReportDefinitions(email),
  ]);

  // Order tiles by their stored ordinal, then resolve + execute each saved report.
  const ordered = [...items].sort(
    (a, b) => Number((a.position?.ordinal as number) ?? 0) - Number((b.position?.ordinal as number) ?? 0),
  );
  const tiles = await Promise.all(
    ordered.map(async (item) => {
      const def = await repos.reportBuilder.getReportDefinition(item.reportDefinitionId, email);
      const result = def ? await runSavedReport(def, roles, repos) : null;
      return { item, def, result };
    }),
  );

  const usedReportIds = new Set(items.map((i) => i.reportDefinitionId));
  const addable = allReports.filter((r) => !usedReportIds.has(r.id));
  const canManage = dashboard.isMine;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={dashboard.name} description="A composed dashboard of saved reports.">
        <Link href="/reporting/dashboards" className="text-sm text-dim transition-colors hover:text-text">
          ← Dashboards
        </Link>
        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-dim">
          {dashboard.visibility}
        </span>
      </PageHeader>

      {canManage && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-panel p-4 md:flex-row md:items-end md:justify-between">
          {/* Add a tile from the viewer's available reports */}
          <form action={addTileAction} className="flex items-end gap-2">
            <input type="hidden" name="dashboardId" value={dashboard.id} />
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-dim">Add a report tile</span>
              <select name="reportDefinitionId" className={inputCls} disabled={addable.length === 0}>
                {addable.length === 0 ? (
                  <option value="">No more reports to add</option>
                ) : (
                  addable.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <button
              type="submit"
              disabled={addable.length === 0}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              Add tile
            </button>
          </form>

          {/* Rename / re-share */}
          <form action={updateDashboardAction} className="flex items-end gap-2">
            <input type="hidden" name="id" value={dashboard.id} />
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-dim">Name</span>
              <input name="name" defaultValue={dashboard.name} required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-dim">Visibility</span>
              <select name="visibility" defaultValue={dashboard.visibility} className={inputCls}>
                <option value="private">private</option>
                <option value="shared">shared</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-panel-2"
            >
              Save
            </button>
          </form>
        </div>
      )}

      {tiles.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel p-8 text-center text-sm text-dim">
          No tiles yet.{canManage && " Add a report above."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {tiles.map(({ item, def, result }) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-border bg-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{def?.name ?? "Unavailable report"}</div>
                  {def && (
                    <div className="text-xs text-dim">
                      {getReportableObject(def.rootObject)?.label ?? def.rootObject}
                    </div>
                  )}
                </div>
                {canManage && (
                  <form action={removeTileAction}>
                    <input type="hidden" name="dashboardId" value={dashboard.id} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <button type="submit" className="text-xs text-dim transition-colors hover:text-red">
                      Remove
                    </button>
                  </form>
                )}
              </div>
              {result ? (
                <ReportResultView result={result} viz={def?.viz ?? "table"} />
              ) : (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-dim">
                  {def
                    ? "This report has no fields you can view."
                    : "The underlying report was deleted or is no longer shared with you."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
