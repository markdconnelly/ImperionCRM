"use client";

import { useRef, useState } from "react";
import type { MentionableUser, WorkParentType } from "@/types";
import { addCommentAction } from "@/app/(app)/projects/[id]/comment-actions";

/**
 * Comment composer with an @mention typeahead (ADR-0064 A2, #331).
 *
 * A thin client wrapper over the existing server action (no client data
 * fetching — the mentionable roster is passed in from the server component).
 * Typing `@` followed by letters opens a roster-filtered popover; picking a user
 * splices their `@handle` into the textarea at the cursor. The body still posts
 * through `addCommentAction`, which re-parses the handles server-side — the
 * typeahead is a convenience, never the source of truth.
 */
export function CommentComposer({
  parentType,
  parentId,
  users,
}: {
  parentType: WorkParentType;
  parentId: string;
  users: MentionableUser[];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [query, setQuery] = useState<string | null>(null); // active @token, or null

  // Find a `@token` immediately left of the caret (letters/.-_ only, no space).
  function detectMention(text: string, caret: number) {
    const upto = text.slice(0, caret);
    const m = /@([a-z0-9._-]*)$/i.exec(upto);
    return m ? m[1].toLowerCase() : null;
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    setQuery(detectMention(e.target.value, e.target.selectionStart ?? e.target.value.length));
  }

  function pick(user: MentionableUser) {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, caret).replace(/@([a-z0-9._-]*)$/i, `@${user.handle} `);
    const next = before + value.slice(caret);
    setValue(next);
    setQuery(null);
    // Restore focus + caret after the inserted handle.
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = before.length;
    });
  }

  const matches =
    query === null
      ? []
      : users
          .filter(
            (u) =>
              u.handle.startsWith(query) ||
              u.displayName.toLowerCase().includes(query),
          )
          .slice(0, 6);

  return (
    <form
      action={addCommentAction}
      className="relative flex flex-col gap-2 rounded-lg border border-border bg-panel px-4 py-3"
    >
      <input type="hidden" name="parentType" value={parentType} />
      <input type="hidden" name="parentId" value={parentId} />
      <textarea
        ref={ref}
        name="body"
        rows={2}
        required
        value={value}
        onChange={onChange}
        placeholder="Add a comment… type @ to mention a teammate"
        className="w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
      />
      {matches.length > 0 && (
        <ul
          className="absolute left-4 top-[4.5rem] z-10 w-64 overflow-hidden rounded-md border border-border bg-panel-2 shadow-lg"
          role="listbox"
        >
          {matches.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => pick(u)}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-text hover:bg-panel"
              >
                <span>{u.displayName}</span>
                <span className="text-xs text-dim">@{u.handle}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Comment
        </button>
      </div>
    </form>
  );
}
