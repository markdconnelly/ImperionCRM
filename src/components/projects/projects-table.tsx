import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ProjectRow } from "@/types";

const statusTone: Record<string, string> = {
  not_started: "text-dim",
  in_progress: "text-accent",
  blocked: "text-red",
  complete: "text-green",
};

export function ProjectsTable({
  projects,
  deleteAction,
}: {
  projects: ProjectRow[];
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Project</th>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Target live</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-dim">{p.account}</td>
                <td className="px-4 py-3 text-dim">{p.type}</td>
                <td className={cn("px-4 py-3", statusTone[p.status] ?? "text-dim")}>
                  {p.status.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3 text-dim">{p.targetLive ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/onboarding/${p.id}/edit`}
                      className="text-dim hover:text-text"
                    >
                      Edit
                    </Link>
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="text-dim hover:text-red">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-dim">
                  No delivery projects yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
