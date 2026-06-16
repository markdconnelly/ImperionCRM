import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import {
  buildBurndownSeries,
  totalEffort,
  completedEffort,
  averageVelocity,
} from "@/lib/agile-reporting";
import { BurndownChart, VelocityChart } from "@/components/reporting/agile-charts";

export const metadata = { title: "Agile reporting · Reporting" };
export const dynamic = "force-dynamic"; // sprint param + live task state, never prerendered

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

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="text-xs text-dim">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-dim">{hint}</div>}
    </div>
  );
}

const fmt1 = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Agile reporting (C5, ADR-0066, #345) — sprint burndown + velocity on the BI hub
 * (ADR-0062). Sourced from per-task estimates (D1, migration 0105) committed to
 * sprints (D4, migration 0107). The GUI only renders (ADR-0042); the burndown /
 * velocity series come from `src/lib/agile-reporting.ts` (pure, unit-tested).
 *
 * HONEST DEGRADATION (no faking): the schema has NO task status-history table, so a
 * true per-day remaining-effort time-series can't be reconstructed. The actual
 * burndown line is derived from each done task's best-available completion date
 * (`task.updated_at`), and CUMULATIVE-FLOW (todo/doing/done bands over time) is
 * OMITTED rather than fabricated — it genuinely requires status history. Both
 * caveats are stated on the surface.
 *
 * RBAC: cross-sprint delivery analytics is delivery-management data (the same gate
 * as the sprint board + workload view, ADR-0069), so this is admin | project_manager
 * (`canManageProjects`). Comp-free, so no money redaction is needed.
 */
export default async function AgileReportingPage({
  searchParams,
}: {
  searchParams: Promise<{ sprint?: string }>;
}) {
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Agile reporting"
          description="Sprint burndown & velocity"
        />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to agile reporting — cross-sprint delivery
          analytics is delivery-management only (admin / project manager, ADR-0069).
        </div>
      </div>
    );
  }

  const { sprint: sprintParam } = await searchParams;
  const { crm } = getRepositories();

  const [sprints, velocity] = await Promise.all([crm.listSprints(), crm.listSprintVelocity()]);

  // Default the selector to the active sprint, else the most recent (first listed).
  const selectedId =
    sprintParam ??
    sprints.find((s) => s.status === "active")?.id ??
    sprints[0]?.id ??
    null;

  const burndown = selectedId ? await crm.getSprintBurndownData(selectedId) : null;
  const series = burndown ? buildBurndownSeries(burndown) : [];

  const avgVelocity = averageVelocity(velocity);
  const velUnit = velocity.find((v) => v.unit)?.unit ?? null;
  // Chart wants oldest → newest; the read returns completed-first / newest-first.
  const velocityData = [...velocity]
    .reverse()
    .map((v) => ({ name: v.name, committed: v.committedEffort, completed: v.completedEffort }));

  const total = burndown ? totalEffort(burndown) : 0;
  const done = burndown ? completedEffort(burndown) : 0;
  const remaining = Math.max(0, total - done);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Agile reporting"
        description="Sprint burndown & velocity from task estimates and sprint commitment (ADR-0066 C5)."
      >
        <Link href="/reporting" className="text-sm text-dim transition-colors hover:text-text">
          ← Reporting
        </Link>
        <Link
          href="/projects/sprints"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          Sprints →
        </Link>
      </PageHeader>

      {/* Honest-degradation caveat — stated, not hidden (CLAUDE.md §6 honesty). */}
      <div className="rounded-lg border border-amber/40 bg-amber/5 px-4 py-2 text-xs text-amber">
        Burndown is derived from each completed task&apos;s last-updated date — there is
        no per-day status history in the system, so the actual line is a best-effort
        reconstruction, not an audited daily record. Cumulative-flow (status bands over
        time) is omitted for the same reason rather than estimated.
      </div>

      {sprints.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel px-4 py-10 text-center text-sm text-dim">
          No sprints yet — create a sprint and commit estimated tasks to it, and the
          burndown and velocity charts populate here.
        </div>
      ) : (
        <>
          {/* Sprint selector — a GET form so the choice is a shareable ?sprint= URL. */}
          <form method="GET" className="flex items-center gap-2">
            <label htmlFor="sprint" className="text-xs text-dim">
              Sprint
            </label>
            <select
              id="sprint"
              name="sprint"
              defaultValue={selectedId ?? undefined}
              className="rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm text-text"
            >
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.project ? ` · ${s.project}` : ""} ({s.status})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm text-text transition-colors hover:border-accent/40"
            >
              View
            </button>
          </form>

          {/* Burndown */}
          {!burndown || series.length === 0 ? (
            <div className="rounded-lg border border-border bg-panel px-4 py-10 text-center text-sm text-dim">
              {burndown && burndown.unestimatedCount > 0
                ? `This sprint has ${burndown.unestimatedCount} committed task${burndown.unestimatedCount === 1 ? "" : "s"} but none carry an effort estimate — add estimates (and set the sprint's start/end dates) to draw a burndown.`
                : "This sprint has no estimated tasks or no dated window — burndown needs both a start→end window and tasks with effort estimates."}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile
                  label="Committed effort"
                  value={fmt1(total)}
                  hint={burndown.unit ?? "estimated"}
                />
                <StatTile label="Completed" value={fmt1(done)} hint="of done tasks" />
                <StatTile label="Remaining" value={fmt1(remaining)} hint="not yet done" />
                <StatTile
                  label="Un-estimated"
                  value={String(burndown.unestimatedCount)}
                  hint="committed tasks excluded"
                />
              </div>

              <ChartCard
                title={`Burndown — ${burndown.sprint.name}`}
                subtitle={
                  burndown.sprint.startsAt && burndown.sprint.endsAt
                    ? `${burndown.sprint.startsAt} → ${burndown.sprint.endsAt} · ideal vs actual remaining (${burndown.unit ?? "effort"})`
                    : "ideal vs actual remaining effort"
                }
              >
                <BurndownChart data={series} unit={burndown.unit} />
              </ChartCard>
            </>
          )}

          {/* Velocity */}
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-base font-semibold tracking-tight">Velocity</h2>
              {avgVelocity != null && (
                <span className="text-xs text-dim">
                  Avg {fmt1(avgVelocity)}
                  {velUnit ? ` ${velUnit}` : ""} / completed sprint
                </span>
              )}
            </div>

            {velocity.length === 0 ? (
              <div className="rounded-lg border border-border bg-panel px-4 py-8 text-center text-sm text-dim">
                No velocity yet — it accrues as sprints complete with estimated tasks.
              </div>
            ) : (
              <ChartCard
                title="Committed vs completed effort"
                subtitle="Per sprint, oldest → newest. Completed = Σ estimate of done tasks."
              >
                <VelocityChart data={velocityData} />
              </ChartCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}
