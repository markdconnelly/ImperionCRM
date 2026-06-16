import { cn } from "@/lib/cn";
import { Field, Select, TextInput } from "@/components/ui/form";
import type { Option } from "@/lib/data/repositories";
import type { GoalRow } from "@/types";
import { addGoalLinkAction, removeGoalLinkAction } from "@/app/(app)/projects/goals/actions";

/**
 * Goal link-management UI (ADR-0069 D3, issue #621). Lists a goal's currently-linked
 * projects AND tasks (each row removable), plus an "add link" form that picks a
 * project or task and a rollup weight. Server component: every mutation posts to a
 * `delivery:write`-gated action. Projects and tasks share one weighted rollup pool —
 * the add form lets the author pick either kind.
 */

const statusTone: Record<string, string> = {
  not_started: "text-dim",
  open: "text-dim",
  in_progress: "text-accent",
  blocked: "text-red",
  complete: "text-green",
  done: "text-green",
};

function LinkRow({
  goalId,
  parentType,
  parentId,
  label,
  sublabel,
  status,
  weight,
  percentComplete,
}: {
  goalId: string;
  parentType: "project" | "task";
  parentId: string;
  label: string;
  sublabel: string;
  status: string;
  weight: number;
  percentComplete: number;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 px-3 py-2 text-sm last:border-b-0">
      <span className="w-16 shrink-0 text-xs uppercase tracking-wide text-dim">{parentType}</span>
      <span className="flex-1 truncate text-text" title={label}>
        {label}
        {sublabel && <span className="ml-2 text-xs text-dim">{sublabel}</span>}
      </span>
      <span className={cn("w-24 text-right", statusTone[status] ?? "text-dim")}>
        {status.replace(/_/g, " ")}
      </span>
      <span className="w-16 text-right tabular-nums text-dim">{weight}</span>
      <span className="w-14 text-right tabular-nums text-text">{percentComplete}%</span>
      <form action={removeGoalLinkAction} className="shrink-0">
        <input type="hidden" name="goalId" value={goalId} />
        <input type="hidden" name="parentType" value={parentType} />
        <input type="hidden" name="parentId" value={parentId} />
        <button
          type="submit"
          className="rounded-md border border-border px-2 py-1 text-xs text-dim hover:border-red/50 hover:text-red"
        >
          Remove
        </button>
      </form>
    </div>
  );
}

export function GoalLinkManager({
  goal,
  candidates,
}: {
  goal: GoalRow;
  candidates: { projects: Option[]; tasks: Option[] };
}) {
  const hasLinks = goal.links.length > 0 || goal.taskLinks.length > 0;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-panel p-5">
      <div>
        <h3 className="font-display text-base font-semibold tracking-tight text-text">
          Linked contributing work
        </h3>
        <p className="mt-0.5 text-sm text-dim">
          Projects and tasks linked here feed the goal&apos;s weighted rollup (issue #621).
        </p>
      </div>

      {hasLinks ? (
        <div className="overflow-hidden rounded-md border border-border/60">
          <div className="flex items-center gap-3 border-b border-border/60 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-dim">
            <span className="w-16 shrink-0">Type</span>
            <span className="flex-1">Work</span>
            <span className="w-24 text-right">Status</span>
            <span className="w-16 text-right">Weight</span>
            <span className="w-14 text-right">Done</span>
            <span className="w-[68px] shrink-0" />
          </div>
          {goal.links.map((l) => (
            <LinkRow
              key={`project-${l.projectId}`}
              goalId={goal.id}
              parentType="project"
              parentId={l.projectId}
              label={l.name}
              sublabel={l.account}
              status={l.status}
              weight={l.weight}
              percentComplete={l.percentComplete}
            />
          ))}
          {goal.taskLinks.map((t) => (
            <LinkRow
              key={`task-${t.taskId}`}
              goalId={goal.id}
              parentType="task"
              parentId={t.taskId}
              label={t.title}
              sublabel=""
              status={t.status}
              weight={t.weight}
              percentComplete={t.percentComplete}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-dim">
          No work linked yet. Add a project or task below to start rolling up progress.
        </p>
      )}

      {/* Add-link form */}
      <form action={addGoalLinkAction} className="flex flex-col gap-3 rounded-md border border-border/60 bg-panel-2 p-4">
        <input type="hidden" name="goalId" value={goal.id} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Project">
            <Select name="parentId" defaultValue="" data-link-kind="project">
              <option value="">— Pick a project —</option>
              {candidates.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Weight">
            <TextInput type="number" name="weight" defaultValue="1" min={1} />
          </Field>
        </div>
        <input type="hidden" name="parentType" value="project" />
        <button
          type="submit"
          className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Link project
        </button>
      </form>

      {/* Add-task-link form (tasks roll up too — issue #621) */}
      <form action={addGoalLinkAction} className="flex flex-col gap-3 rounded-md border border-border/60 bg-panel-2 p-4">
        <input type="hidden" name="goalId" value={goal.id} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Task">
            <Select name="parentId" defaultValue="">
              <option value="">— Pick a task —</option>
              {candidates.tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Weight">
            <TextInput type="number" name="weight" defaultValue="1" min={1} />
          </Field>
        </div>
        <input type="hidden" name="parentType" value="task" />
        <button
          type="submit"
          className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Link task
        </button>
      </form>
    </section>
  );
}
