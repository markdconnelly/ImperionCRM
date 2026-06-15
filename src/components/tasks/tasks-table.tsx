import Link from "next/link";
import { cn } from "@/lib/cn";
import { TaskTagEditor } from "@/components/tags/task-tag-editor";
import type { AppliedTag, Tag, TaskRow } from "@/types";

const statusTone: Record<string, string> = {
  open: "text-amber",
  in_progress: "text-accent",
  done: "text-green",
};

const CATEGORY_LABEL: Record<string, string> = {
  sales: "Sales",
  project: "Project",
  onboarding: "Onboarding",
  general: "General",
};

export function TasksTable({
  tasks,
  deleteAction,
  tagsByTask = {},
  vocabulary = [],
  applyTagAction,
  applyExistingTagAction,
  removeTagAction,
}: {
  tasks: TaskRow[];
  deleteAction: (formData: FormData) => void | Promise<void>;
  /** parentId → applied tag chips (ADR-0065 B6, #340). */
  tagsByTask?: Record<string, AppliedTag[]>;
  /** Whole tag vocabulary for the "apply existing" picker. */
  vocabulary?: Tag[];
  applyTagAction?: (formData: FormData) => void | Promise<void>;
  applyExistingTagAction?: (formData: FormData) => void | Promise<void>;
  removeTagAction?: (formData: FormData) => void | Promise<void>;
}) {
  const tagsEnabled = Boolean(applyTagAction && applyExistingTagAction && removeTagAction);
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Task</th>
              <th className="px-4 py-2 font-medium">Category</th>
              {tagsEnabled && <th className="px-4 py-2 font-medium">Tags</th>}
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Due</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">
                  <span>{t.title}</span>
                  {/* Subtask rollup (ADR-0065 B1, #335): n/m children done. */}
                  {t.childCount > 0 && (
                    <span
                      title={`${t.childDoneCount} of ${t.childCount} subtasks done`}
                      className={cn(
                        "ml-2 rounded-full border px-1.5 py-0.5 align-middle text-[10px]",
                        t.childDoneCount === t.childCount
                          ? "border-green/40 text-green"
                          : "border-border text-dim",
                      )}
                    >
                      {t.childDoneCount}/{t.childCount}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] text-dim">
                    {CATEGORY_LABEL[t.category] ?? t.category}
                  </span>
                </td>
                {tagsEnabled && (
                  <td className="px-4 py-3">
                    <TaskTagEditor
                      parentType="task"
                      parentId={t.id}
                      applied={tagsByTask[t.id] ?? []}
                      vocabulary={vocabulary}
                      applyAction={applyTagAction!}
                      applyExistingAction={applyExistingTagAction!}
                      removeAction={removeTagAction!}
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-dim">{t.account ?? "—"}</td>
                <td className={cn("px-4 py-3", statusTone[t.status] ?? "text-dim")}>
                  {t.status.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3 text-dim">{t.due ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/tasks/${t.id}/edit`}
                      className="text-dim hover:text-text"
                    >
                      Edit
                    </Link>
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" className="text-dim hover:text-red">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={tagsEnabled ? 7 : 6} className="px-4 py-8 text-center text-dim">
                  No tasks yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
