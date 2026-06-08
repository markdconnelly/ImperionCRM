import Link from "next/link";
import { cn } from "@/lib/cn";
import type { TaskRow } from "@/types";

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
}: {
  tasks: TaskRow[];
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Task</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Due</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">{t.title}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] text-dim">
                    {CATEGORY_LABEL[t.category] ?? t.category}
                  </span>
                </td>
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
                <td colSpan={6} className="px-4 py-8 text-center text-dim">
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
