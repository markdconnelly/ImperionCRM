import { cn } from "@/lib/cn";
import type { Option } from "@/lib/data/repositories";
import type { WorkAssignments } from "@/types";

/**
 * Assignees & watchers panel on the task edit page (ADR-0065 B3, #337).
 *
 * One work object keeps a single primary owner (drives rollups / the Sales Queue /
 * RBAC) but can carry many additional assignees plus watchers:
 *  - a multi-select of users posts the full `assignee` set (replace-on-save); the
 *    primary is shown but disabled in the picker (they already own the object);
 *  - each non-primary attached user can be promoted to primary inline;
 *  - a watch / unwatch toggle adds or removes the signed-in user as a follower.
 *
 * Everyone listed here (primary + assignees + watchers) sees the item and receives
 * the relevant notifications once the ADR-0064 A1 activity-feed fan-out lands; the
 * primary alone still drives reporting. v1 keeps the UI deliberately lean (server
 * forms, no client state).
 */
export function TaskAssignees({
  taskId,
  assignments,
  users,
  setAssigneesAction,
  setPrimaryAction,
  setWatchAction,
}: {
  taskId: string;
  assignments: WorkAssignments;
  users: Option[];
  setAssigneesAction: (formData: FormData) => void | Promise<void>;
  setPrimaryAction: (formData: FormData) => void | Promise<void>;
  setWatchAction: (formData: FormData) => void | Promise<void>;
}) {
  const { primary, assignees, watchers, viewerWatching } = assignments;
  const assigneeIds = new Set(assignees.map((a) => a.userId));
  const primaryId = primary?.userId ?? null;

  return (
    <section className="max-w-lg rounded-xl border border-border bg-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold tracking-tight">Assignees &amp; watchers</h3>
        {/* Watch / unwatch the item as the signed-in user. */}
        <form action={setWatchAction}>
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="watch" value={viewerWatching ? "false" : "true"} />
          <button
            type="submit"
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors",
              viewerWatching
                ? "border-accent/40 text-accent hover:bg-accent/10"
                : "border-border text-dim hover:text-text",
            )}
          >
            {viewerWatching ? "Watching" : "Watch"}
          </button>
        </form>
      </div>

      {/* Primary owner — the single owner driving rollups / RBAC (acceptance). */}
      <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm">
        <span className="flex items-center gap-2">
          <span className="rounded-full border border-accent/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
            Primary
          </span>
          <span className="font-medium">{primary ? primary.name : "Unassigned"}</span>
        </span>
      </div>

      {/* Additional assignees (multi-select). The full checked set posts on save and
          replaces the assignee rows; primary/watcher rows are untouched server-side. */}
      <form action={setAssigneesAction} className="mt-3">
        <input type="hidden" name="taskId" value={taskId} />
        <p className="mb-1 text-[11px] text-dim">Assignees</p>
        <div className="max-h-44 overflow-auto rounded-lg border border-border">
          {users.length === 0 ? (
            <p className="px-3 py-2 text-sm text-dim">No users available.</p>
          ) : (
            <ul className="divide-y divide-border">
              {users.map((u) => {
                const isPrimary = u.id === primaryId;
                return (
                  <li key={u.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <label className={cn("flex items-center gap-2", isPrimary && "text-dim")}>
                      <input
                        type="checkbox"
                        name="assignee"
                        value={u.id}
                        defaultChecked={assigneeIds.has(u.id)}
                        disabled={isPrimary}
                        className="h-3.5 w-3.5 rounded border-border bg-panel-2 accent-accent"
                      />
                      <span>{u.name}</span>
                    </label>
                    {isPrimary && <span className="text-[10px] uppercase text-dim">owner</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <button
          type="submit"
          className="mt-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Save assignees
        </button>
      </form>

      {/* Promote any non-primary attached user to primary (single-owner swap). */}
      {assignees.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[11px] text-dim">Make primary owner</p>
          <ul className="flex flex-wrap gap-2">
            {assignees.map((a) => (
              <li key={a.userId}>
                <form action={setPrimaryAction}>
                  <input type="hidden" name="taskId" value={taskId} />
                  <input type="hidden" name="userId" value={a.userId} />
                  <button
                    type="submit"
                    className="rounded-md border border-border px-2.5 py-1 text-xs text-dim transition-colors hover:text-text"
                  >
                    {a.name}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Watchers — followers who see the item + get notifications, not owners. */}
      <div className="mt-3">
        <p className="mb-1 text-[11px] text-dim">Watchers</p>
        {watchers.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {watchers.map((w) => (
              <li
                key={w.userId}
                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-dim"
              >
                {w.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-dim">No watchers yet.</p>
        )}
      </div>
    </section>
  );
}
