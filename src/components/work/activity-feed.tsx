import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { auth } from "@/auth";
import { TextArea } from "@/components/ui/form";
import {
  addCommentAction,
  deleteCommentAction,
} from "@/app/(app)/projects/[id]/comment-actions";
import type { WorkParentType } from "@/types";

/**
 * Comments + unified activity feed for a work object (ADR-0064 A1, #330).
 *
 * Polymorphic by (parentType, parentId): the same component drops onto task,
 * project, or milestone detail. The feed interleaves comments with audit_log
 * system events newest-first, filterable to comments-only via the `?feed=`
 * query param (no client JS — links toggle the filter; the form posts a comment
 * through a server action and the page revalidates). Comment bodies are rendered
 * as plain text (`whitespace-pre-wrap`) — never as HTML — so a malicious body
 * cannot inject script (NFR-3 / unified-security-standard.md).
 *
 * Mentions (A2), notifications (A3) and attachments (A4) are separate ADR-0064
 * issues and are intentionally out of this slice.
 */
export async function ActivityFeed({
  parentType,
  parentId,
  canComment,
  commentsOnly = false,
  basePath,
}: {
  parentType: WorkParentType;
  parentId: string;
  /** Whether the viewer may post (gated on `delivery:write` by the caller). */
  canComment: boolean;
  /** Comments-only filter (drives the toggle's active state). */
  commentsOnly?: boolean;
  /** The detail page path the filter links point back to, e.g. `/projects/<id>`. */
  basePath: string;
}) {
  const { work } = getRepositories();
  const [entries, roles, session] = await Promise.all([
    work.listActivity(parentType, parentId, { commentsOnly, limit: 100 }),
    getSessionRoles(),
    auth(),
  ]);
  const admin = isAdmin(roles);
  const myUserId = await resolveAppUserIdByEmail(session?.user?.email ?? "");

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">Activity</h3>
          <p className="mt-0.5 text-sm text-dim">
            Comments and system events in one feed (ADR-0064). Newest first.
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <FilterTab href={basePath} label="All" active={!commentsOnly} />
          <FilterTab href={`${basePath}?feed=comments`} label="Comments" active={commentsOnly} />
        </div>
      </div>

      {canComment && (
        <form
          action={addCommentAction}
          className="flex flex-col gap-2 rounded-lg border border-border bg-panel px-4 py-3"
        >
          <input type="hidden" name="parentType" value={parentType} />
          <input type="hidden" name="parentId" value={parentId} />
          <TextArea
            name="body"
            rows={2}
            placeholder="Add a comment… (markdown, @mentions coming soon)"
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Comment
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="rounded-lg border border-border bg-panel px-4 py-3 text-sm text-dim">
          No activity yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((e) => (
            <li
              key={`${e.kind}-${e.id}`}
              className="rounded-lg border border-border bg-panel px-4 py-2.5"
            >
              <div className="flex items-center justify-between gap-3 text-xs text-dim">
                <span className="font-medium text-text">
                  {e.actor ?? "System"}
                  {e.kind === "event" && (
                    <span className="ml-1.5 rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-dim">
                      {e.action}
                    </span>
                  )}
                </span>
                <span>
                  {e.occurredAt}
                  {e.editedAt && " · edited"}
                </span>
              </div>
              {e.kind === "comment" ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-text">{e.body}</p>
              ) : (
                <p className="mt-1 text-sm text-dim">{describeEvent(e.action, e.detail)}</p>
              )}
              {e.kind === "comment" && canComment && (admin || e.actorUserId === myUserId) && (
                <form action={deleteCommentAction} className="mt-1.5">
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="parentType" value={parentType} />
                  <input type="hidden" name="parentId" value={parentId} />
                  <button
                    type="submit"
                    className="text-xs text-dim transition-colors hover:text-red"
                  >
                    Delete
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      className={
        active
          ? "rounded-md bg-panel-2 px-2 py-1 font-medium text-text"
          : "rounded-md px-2 py-1 text-dim transition-colors hover:text-text"
      }
    >
      {label}
    </a>
  );
}

/** Human-readable one-liner for an audit event in the feed. */
function describeEvent(action: string | null, detail: Record<string, unknown> | null): string {
  if (action === "comment.deleted") return "deleted a comment";
  const verb = action?.replace(/_/g, " ") ?? "system event";
  if (detail && typeof detail === "object" && Object.keys(detail).length > 0) {
    return `${verb}`;
  }
  return verb;
}
