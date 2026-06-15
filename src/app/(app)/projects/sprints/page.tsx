import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import type { SprintRow } from "@/types";

export const metadata = { title: "Sprints & backlog · Projects" };

const STATUS_TONE: Record<string, string> = {
  planned: "border-border text-dim",
  active: "border-accent/40 text-accent",
  completed: "border-green/40 text-green",
};

/** Section order on the list: the active work first, then what's queued, then history. */
const SECTIONS: { key: string; label: string; hint: string }[] = [
  { key: "active", label: "Active", hint: "the board scopes here" },
  { key: "planned", label: "Planned", hint: "queued — open items carry forward into these" },
  { key: "completed", label: "Completed", hint: "closed; their open work was carried forward" },
];

function fmtWindow(s: SprintRow): string {
  if (s.startsAt && s.endsAt) return `${s.startsAt} → ${s.endsAt}`;
  if (s.startsAt) return `from ${s.startsAt}`;
  if (s.endsAt) return `until ${s.endsAt}`;
  return "no dates set";
}

/**
 * Sprints / backlog (ADR-0069 D4, #349) — the iteration containers that scope a
 * task board to a window of work. Tasks with no sprint are the backlog (the pool
 * the "add to sprint" picker draws from on each sprint's detail page). Pure read
 * over `sprint` + its task rollup; the GUI repo reads directly for rendering
 * (ADR-0042). Delivery-management only (`canManageProjects`, ADR-0069) — the same
 * gate as the rest of the project-board planning surface (Goals / Workload).
 */
export default async function SprintsPage() {
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Sprints & backlog" description="Time-boxed iterations" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to sprints — the planning surface is
          delivery-management only (admin / project manager, ADR-0069).
        </div>
      </div>
    );
  }

  const { crm } = getRepositories();
  const sprints = await crm.listSprints();
  const byStatus = (status: string) => sprints.filter((s) => s.status === status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sprints & backlog"
        description={`${sprints.length} ${sprints.length === 1 ? "sprint" : "sprints"} — iterations that scope a board to a window of work (ADR-0069 D4)`}
      >
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-sm text-dim transition-colors hover:text-text">
            ← Project board
          </Link>
          <Link
            href="/projects/sprints/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New sprint
          </Link>
        </div>
      </PageHeader>

      {sprints.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel p-8 text-center text-sm text-dim">
          No sprints yet. Create one to scope a board to a window of work; tasks
          with no sprint stay in the backlog until you add them.
        </div>
      ) : (
        SECTIONS.map((section) => {
          const items = byStatus(section.key);
          if (items.length === 0) return null;
          return (
            <section key={section.key} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-text">
                {section.label}
                <span className="ml-2 text-xs font-normal text-dim">{section.hint}</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <Link
                    key={s.id}
                    href={`/projects/sprints/${s.id}`}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-panel p-4 transition-colors hover:border-accent/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-text">{s.name}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[11px] capitalize",
                          STATUS_TONE[s.status] ?? "border-border text-dim",
                        )}
                      >
                        {s.status}
                      </span>
                    </div>
                    <div className="text-xs text-dim">{s.project ?? "Cross-project"}</div>
                    <div className="text-xs text-dim">{fmtWindow(s)}</div>
                    <div className="text-xs text-dim">
                      {s.taskCount === 0
                        ? "no tasks"
                        : `${s.doneCount}/${s.taskCount} done`}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
