import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ChecklistTemplateRow, TaskHierarchy } from "@/types";

const statusTone: Record<string, string> = {
  open: "text-amber",
  in_progress: "text-accent",
  done: "text-green",
};

/**
 * Subtasks panel on the task edit page (ADR-0065 B1, #335).
 *
 * Shows the n/m completion rollup, the ordered child list (each linking to its
 * own edit page so depth is navigable), an inline "add subtask" form, and — when
 * this task is itself a subtask — a "promote to top-level" control. Reorder and
 * deeper reparent UIs are deliberately minimal in v1: ordering follows creation
 * order (the data layer assigns ordinals) and promote/demote covers the required
 * B1-F3 case. Auto-complete-on-children is MANUAL (ADR-0065): the rollup flags
 * "all done" but never forces the parent done.
 */
export function TaskSubtasks({
  taskId,
  parentTaskId,
  hierarchy,
  addSubtaskAction,
  reparentTaskAction,
  checklistTemplates,
  applyChecklistTemplateAction,
}: {
  taskId: string;
  parentTaskId: string | null | undefined;
  hierarchy: TaskHierarchy;
  addSubtaskAction: (formData: FormData) => void | Promise<void>;
  reparentTaskAction: (formData: FormData) => void | Promise<void>;
  /** Checklist templates the user can seed this task's subtasks from (ADR-0070 E1-F3, #633). */
  checklistTemplates: ChecklistTemplateRow[];
  applyChecklistTemplateAction: (formData: FormData) => void | Promise<void>;
}) {
  const { children, total, done } = hierarchy;
  const allDone = total > 0 && done === total;

  return (
    <section className="max-w-lg rounded-xl border border-border bg-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold tracking-tight">Subtasks</h3>
        {total > 0 && (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px]",
              allDone ? "border-green/40 text-green" : "border-border text-dim",
            )}
          >
            {done}/{total} done
          </span>
        )}
      </div>

      {/* This task is itself a child — offer promote-to-top-level (B1-F3). */}
      {parentTaskId && (
        <form action={reparentTaskAction} className="mt-3">
          <input type="hidden" name="id" value={taskId} />
          {/* Empty parentTaskId = promote to top-level. */}
          <input type="hidden" name="parentTaskId" value="" />
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-xs text-dim transition-colors hover:text-text"
          >
            Promote to top-level task
          </button>
          <p className="mt-1 text-[11px] text-dim">
            This is a subtask of{" "}
            <Link href={`/tasks/${parentTaskId}/edit`} className="text-accent hover:underline">
              its parent
            </Link>
            . Promoting detaches it.
          </p>
        </form>
      )}

      {children.length > 0 ? (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
          {children.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <Link href={`/tasks/${c.id}/edit`} className="font-medium hover:underline">
                {c.title}
                {c.childCount > 0 && (
                  <span className="ml-2 text-[10px] text-dim">
                    ({c.childDoneCount}/{c.childCount})
                  </span>
                )}
              </Link>
              <span className="flex items-center gap-3">
                {c.due && <span className="text-xs text-dim">{c.due}</span>}
                <span className={cn("text-xs", statusTone[c.status] ?? "text-dim")}>
                  {c.status.replace(/_/g, " ")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-dim">No subtasks yet.</p>
      )}

      {/* Inline add-child (ADR-0065 B1-F1). Inherits the parent's account/project
          and category server-side — only a title + optional due date here. */}
      <form action={addSubtaskAction} className="mt-3 flex items-end gap-2">
        <input type="hidden" name="parentTaskId" value={taskId} />
        <label className="flex-1">
          <span className="mb-1 block text-[11px] text-dim">New subtask</span>
          <input
            name="title"
            required
            placeholder="Subtask title"
            className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
          />
        </label>
        <label>
          <span className="mb-1 block text-[11px] text-dim">Due</span>
          <input
            type="date"
            name="dueAt"
            className="rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Add
        </button>
      </form>

      {/* Apply a checklist template (ADR-0070 E1-F3, #633): instantiate a reusable
          subtask set under this task. Snapshot — later template edits never touch
          subtasks already applied. Only shown when templates exist. */}
      {checklistTemplates.length > 0 && (
        <form action={applyChecklistTemplateAction} className="mt-3 flex items-end gap-2 border-t border-border pt-3">
          <input type="hidden" name="taskId" value={taskId} />
          <label className="flex-1">
            <span className="mb-1 block text-[11px] text-dim">Apply checklist template</span>
            <select
              name="checklistTemplateId"
              required
              defaultValue=""
              className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
            >
              <option value="" disabled>
                Choose a checklist…
              </option>
              {checklistTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.itemCount})
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
          >
            Apply
          </button>
        </form>
      )}
    </section>
  );
}
