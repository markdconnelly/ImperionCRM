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
  base = "/onboarding",
  showType = true,
  canWrite = true,
}: {
  projects: ProjectRow[];
  deleteAction: (formData: FormData) => void | Promise<void>;
  /** Surface owning the row links: "/projects" (board, with detail pages) or "/onboarding". */
  base?: "/projects" | "/onboarding";
  /** Hide the Type column inside the board's per-type sections. */
  showType?: boolean;
  /** Hide Edit/Delete for roles without canManageProjects (ADR-0030 GUI gating). */
  canWrite?: boolean;
}) {
  const cols = showType ? 7 : 6;
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Project</th>
              <th className="px-4 py-2 font-medium">Account</th>
              {showType && <th className="px-4 py-2 font-medium">Type</th>}
              <th className="px-4 py-2 font-medium">Owner</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Target live</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">
                  {base === "/projects" ? (
                    <Link href={`/projects/${p.id}`} className="hover:text-accent">
                      {p.name}
                    </Link>
                  ) : (
                    p.name
                  )}
                </td>
                <td className="px-4 py-3 text-dim">{p.account}</td>
                {showType && <td className="px-4 py-3 text-dim">{p.type}</td>}
                <td className="px-4 py-3 text-dim">{p.owner ?? "—"}</td>
                <td className={cn("px-4 py-3", statusTone[p.status] ?? "text-dim")}>
                  {p.status.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3 text-dim">{p.targetLive ?? "—"}</td>
                <td className="px-4 py-3">
                  {canWrite && (
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`${base}/${p.id}/edit`}
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
                  )}
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={cols} className="px-4 py-8 text-center text-dim">
                  No projects yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
