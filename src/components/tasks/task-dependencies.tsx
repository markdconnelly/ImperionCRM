import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Option } from "@/lib/data/repositories";
import type { TaskDependencies as TaskDependenciesData, TaskDependencyRow } from "@/types";

const statusTone: Record<string, string> = {
  open: "text-amber",
  in_progress: "text-accent",
  done: "text-green",
};

/**
 * Dependencies panel on the task edit page (ADR-0065 B2, #336).
 *
 * Shows what blocks this task (predecessors) and what it blocks (successors), each
 * link navigable to its own edit page so "A blocks B shows on both" is true from
 * either side. When any predecessor isn't done the panel flags the task BLOCKED —
 * the soft v1 signal (warned, never hard-blocked; ADR-0065 B2). Add picks another
 * task and a direction; remove drops the edge. Self-links and cycles are refused in
 * the data layer (recursive walk), so a bad pick is a silent no-op.
 */
export function TaskDependencies({
  taskId,
  deps,
  options,
  addAction,
  removeAction,
}: {
  taskId: string;
  deps: TaskDependenciesData;
  options: Option[];
  addAction: (formData: FormData) => void | Promise<void>;
  removeAction: (formData: FormData) => void | Promise<void>;
}) {
  const { blockedBy, blocks, blocked } = deps;

  const row = (d: TaskDependencyRow, direction: "blocked-by" | "blocks") => (
    <li key={`${direction}-${d.taskId}`} className="flex items-center justify-between px-3 py-2 text-sm">
      <Link href={`/tasks/${d.taskId}/edit`} className="font-medium hover:underline">
        {d.title}
      </Link>
      <span className="flex items-center gap-3">
        <span className={cn("text-xs", statusTone[d.status] ?? "text-dim")}>
          {d.status.replace(/_/g, " ")}
        </span>
        <form action={removeAction}>
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="otherTaskId" value={d.taskId} />
          <input type="hidden" name="direction" value={direction} />
          <button
            type="submit"
            className="text-xs text-dim transition-colors hover:text-red"
            aria-label="Remove dependency"
          >
            Remove
          </button>
        </form>
      </span>
    </li>
  );

  return (
    <section className="max-w-lg rounded-xl border border-border bg-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold tracking-tight">Dependencies</h3>
        {blocked && (
          <span className="rounded-full border border-amber/40 px-2 py-0.5 text-[11px] text-amber">
            Blocked — unmet predecessor
          </span>
        )}
      </div>

      {/* Blocked by (predecessors) — what must finish before this task. */}
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-dim">Blocked by</p>
      {blockedBy.length > 0 ? (
        <ul className="mt-1 divide-y divide-border rounded-lg border border-border">
          {blockedBy.map((d) => row(d, "blocked-by"))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-dim">Nothing blocks this task.</p>
      )}

      {/* Blocks (successors) — what waits on this task. */}
      <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-dim">Blocks</p>
      {blocks.length > 0 ? (
        <ul className="mt-1 divide-y divide-border rounded-lg border border-border">
          {blocks.map((d) => row(d, "blocks"))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-dim">This task blocks nothing.</p>
      )}

      {/* Add a dependency: pick a task + which side this task is on. The data layer
          rejects self-links and cycles, so a bad pick is a silent no-op. */}
      {options.length > 0 ? (
        <form action={addAction} className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <label className="flex-1">
            <span className="mb-1 block text-[11px] text-dim">Task</span>
            <select
              name="otherTaskId"
              required
              defaultValue=""
              className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
            >
              <option value="" disabled>
                Pick a task…
              </option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[11px] text-dim">Relationship</span>
            <select
              name="direction"
              defaultValue="blocked-by"
              className="rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
            >
              <option value="blocked-by">blocks this task</option>
              <option value="blocks">is blocked by this task</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Add
          </button>
        </form>
      ) : (
        <p className="mt-4 text-[11px] text-dim">No other tasks to depend on yet.</p>
      )}
    </section>
  );
}
