"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import {
  SAVED_VIEWS_KEY,
  isViewSaved,
  parseSavedViews,
  removeSavedView,
  savedViewHref,
  serializeSavedViews,
  upsertSavedView,
  type SavedTaskView,
} from "@/lib/task-views";

/**
 * Saved task views (ADR-0066 C4, #344).
 *
 * The view toggle (List/Board/Calendar) and every filter/group/swimlane/tag are
 * already encoded in the URL (#342 C2), so switching a view preserves the active
 * filter set — that part of C4 is satisfied by the page's `href()` builder. This
 * component adds the missing half: PER-USER SAVED VIEWS. It snapshots the
 * current query string under a name in localStorage (NO migration — the C4 lane
 * carries none), and renders saved views as links that restore the whole filter
 * set in one click.
 *
 * `currentQuery` is the live `/tasks` query string (without "?") rendered by the
 * server page from its resolved searchParams, so "save" captures exactly the
 * canonical, normalised state the user is looking at.
 */
export function TaskSavedViews({ currentQuery }: { currentQuery: string }) {
  const [views, setViews] = useState<SavedTaskView[]>([]);
  const [ready, setReady] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      setViews(parseSavedViews(localStorage.getItem(SAVED_VIEWS_KEY)));
    } catch {
      /* corrupt/blocked store — start empty */
    }
    setReady(true);
  }, []);

  function persist(next: SavedTaskView[]) {
    setViews(next);
    try {
      localStorage.setItem(SAVED_VIEWS_KEY, serializeSavedViews(next));
    } catch {
      /* no-op — best-effort persistence */
    }
  }

  function save() {
    const next = upsertSavedView(views, name, currentQuery);
    persist(next);
    setName("");
    setNaming(false);
  }

  function remove(viewName: string) {
    persist(removeSavedView(views, viewName));
  }

  // Hide entirely until hydrated to avoid an SSR/CSR mismatch (localStorage is
  // client-only). The strip is additive chrome, so an empty first paint is fine.
  if (!ready) return null;

  const alreadySaved = isViewSaved(views, currentQuery);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-dim">Saved views</span>

      {views.length === 0 && !naming && (
        <span className="text-xs text-dim/70">none yet — save the current filters</span>
      )}

      {views.map((v) => {
        const active = isViewSaved([v], currentQuery);
        return (
          <span
            key={v.name}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-border bg-panel px-2 py-0.5 text-xs",
              active ? "ring-1 ring-text/40 text-text" : "text-dim hover:text-text",
            )}
          >
            <Link href={savedViewHref(v.query)} className="transition-colors">
              {v.name}
            </Link>
            <button
              type="button"
              aria-label={`Delete saved view ${v.name}`}
              onClick={() => remove(v.name)}
              className="text-dim/70 transition-colors hover:text-red"
            >
              ×
            </button>
          </span>
        );
      })}

      {naming ? (
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setNaming(false);
                setName("");
              }
            }}
            placeholder="View name"
            maxLength={40}
            className="w-32 rounded-md border border-border bg-panel-2 px-2 py-0.5 text-xs text-text outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={save}
            disabled={!name.trim()}
            className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-40"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setNaming(false);
              setName("");
            }}
            className="text-xs text-dim transition-colors hover:text-text"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setNaming(true)}
          disabled={alreadySaved}
          title={alreadySaved ? "These filters are already saved" : "Save the current filters as a view"}
          className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-dim transition-colors hover:text-text disabled:opacity-40 disabled:hover:text-dim"
        >
          {alreadySaved ? "Saved" : "+ Save view"}
        </button>
      )}
    </div>
  );
}
