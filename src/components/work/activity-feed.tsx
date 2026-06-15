import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { auth } from "@/auth";
import { deleteCommentAction } from "@/app/(app)/projects/[id]/comment-actions";
import { CommentComposer } from "@/components/work/comment-composer";
import { segmentBody, type MentionableUser } from "@/lib/mentions";
import type { CommentMention, WorkParentType } from "@/types";

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
 * @mentions (A2, #331) are live: the composer offers an `@` typeahead over the
 * mentionable roster and saved comments render each resolved mention as an
 * accent chip. Notifications (A3) and attachments (A4) remain separate ADR-0064
 * issues; a mention currently emits a durable `comment.mentioned` audit event
 * (which surfaces here) that the future A3 inbox will consume.
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
  const [entries, roles, session, mentionable] = await Promise.all([
    work.listActivity(parentType, parentId, { commentsOnly, limit: 100 }),
    getSessionRoles(),
    auth(),
    canComment ? work.listMentionableUsers() : Promise.resolve([]),
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
        <CommentComposer parentType={parentType} parentId={parentId} users={mentionable} />
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
                <CommentBody body={e.body ?? ""} mentions={e.mentions} />
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

/**
 * Render a comment body with its resolved @mentions highlighted (ADR-0064 A2).
 * Segments by the mention handles actually persisted for this comment, so an
 * `@token` that resolves to no user stays literal text. Each segment is rendered
 * as a React text node / element — never `dangerouslySetInnerHTML` — so the body
 * cannot inject markup (NFR-3 / unified-security-standard.md). The wrapper keeps
 * `whitespace-pre-wrap` so newlines and spacing are preserved as before.
 */
function CommentBody({ body, mentions }: { body: string; mentions: CommentMention[] }) {
  // segmentBody resolves against handle → so feed only the mentions on THIS comment.
  const users: MentionableUser[] = mentions
    .filter((m) => m.handle)
    .map((m) => ({ id: m.userId ?? m.handle, displayName: m.displayName ?? m.handle, handle: m.handle }));
  const segments = segmentBody(body, users);
  return (
    <p className="mt-1 whitespace-pre-wrap text-sm text-text">
      {segments.map((s, i) =>
        s.kind === "mention" ? (
          <span
            key={i}
            className="rounded bg-accent/15 px-1 font-medium text-accent"
            title={s.user.displayName}
          >
            @{s.user.displayName}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </p>
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

/** Map a raw task status onto a board-friendly label for the feed copy (#438). */
const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
};
const statusLabel = (s: unknown): string =>
  typeof s === "string" ? STATUS_LABELS[s] ?? s.replace(/_/g, " ") : "—";

/** Human-readable one-liner for an audit event in the feed. */
function describeEvent(action: string | null, detail: Record<string, unknown> | null): string {
  if (action === "comment.deleted") return "deleted a comment";
  if (action === "comment.mentioned") return "mentioned a teammate in a comment";
  // Status move (#438): render the X→Y transition when the payload carries it.
  if (action === "task.status_changed") {
    const from = detail?.from;
    const to = detail?.to;
    return from || to
      ? `moved status ${statusLabel(from)} → ${statusLabel(to)}`
      : "changed task status";
  }
  if (action === "attachment.removed") return "removed an attachment";
  const verb = action?.replace(/_/g, " ") ?? "system event";
  return verb;
}
