import { MessageSquare, Paperclip } from "lucide-react";
import { cn } from "@/lib/cn";
import type { EngagementCounts, WorkAssignmentRow } from "@/types";

/**
 * Kanban card engagement strip (#608, ADR-0066 C1-F4): the remainder of the rich
 * cards — assignee avatars + a comment / attachment count footer — shared by the
 * tasks and projects boards. The data comes from two bulk reads on the board page
 * (`listAssigneesForMany` / `listEngagementCountsForMany`) so the board never
 * N+1s; this component is pure render over the per-card slice.
 *
 * Honest degradation (CLAUDE.md §6): no assignees → no avatar row; 0/0 counts →
 * no footer. A missing count is shown as nothing, never a fabricated number.
 */

/** Max avatars shown before collapsing the rest into a "+N" chip. */
const AVATAR_CAP = 3;

/** Up-to-two-letter initials from a display name (mirrors the sidebar avatar). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Pure derivation of a card's engagement content — kept separate from the JSX so
 * it is unit-testable in the node test env (no DOM). Caps the avatars at
 * {@link AVATAR_CAP}, rolls the rest into `overflow` (0 = none), and flags whether
 * the count footer should render at all (any non-zero count).
 */
export function cardEngagement(
  assignees: WorkAssignmentRow[] | undefined,
  counts: EngagementCounts | undefined,
) {
  const people = assignees ?? [];
  const shown = people.slice(0, AVATAR_CAP);
  const overflow = Math.max(0, people.length - shown.length);
  const comments = counts?.comments ?? 0;
  const attachments = counts?.attachments ?? 0;
  return {
    shown,
    overflow,
    showAvatars: shown.length > 0,
    comments,
    attachments,
    showCounts: comments > 0 || attachments > 0,
  };
}

export function CardEngagement({
  assignees,
  counts,
}: {
  assignees?: WorkAssignmentRow[];
  counts?: EngagementCounts;
}) {
  const meta = cardEngagement(assignees, counts);
  if (!meta.showAvatars && !meta.showCounts) return null;
  return (
    <div className="mt-1.5 flex items-center justify-between gap-2">
      {meta.showAvatars ? (
        <div className="flex -space-x-1.5">
          {meta.shown.map((p) => (
            <span
              key={p.userId}
              title={`${p.name}${p.role === "primary" ? " (owner)" : ""}`}
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full border border-panel bg-panel-2 text-[9px] font-medium text-dim",
                p.role === "primary" && "ring-1 ring-accent/60 text-text",
              )}
            >
              {initialsOf(p.name)}
            </span>
          ))}
          {meta.overflow > 0 && (
            <span
              title={`+${meta.overflow} more`}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-panel bg-panel text-[9px] font-medium text-dim"
            >
              +{meta.overflow}
            </span>
          )}
        </div>
      ) : (
        <span />
      )}
      {meta.showCounts && (
        <div className="flex items-center gap-2 text-[11px] text-dim">
          {meta.comments > 0 && (
            <span className="inline-flex items-center gap-0.5" title={`${meta.comments} comments`}>
              <MessageSquare className="h-3 w-3" aria-hidden />
              {meta.comments}
            </span>
          )}
          {meta.attachments > 0 && (
            <span
              className="inline-flex items-center gap-0.5"
              title={`${meta.attachments} attachments`}
            >
              <Paperclip className="h-3 w-3" aria-hidden />
              {meta.attachments}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
