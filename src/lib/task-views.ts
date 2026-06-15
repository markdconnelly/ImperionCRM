/**
 * Saved task views (ADR-0066 C4, #344).
 *
 * The Tasks page already encodes its full filter/group/swimlane/tag/view state
 * in the URL query string (the `href()` builder on the page, #342 C2). A "saved
 * view" is therefore nothing more than a *named* snapshot of that query string,
 * persisted per-user. Per the C4 contract this carries NO migration — saved
 * views live in the browser's localStorage, not a schema column — so this module
 * owns the (de)serialisation of that store as a tested PURE function with no
 * `localStorage`/`window` access of its own (the client component injects the
 * raw string).
 *
 * The stored shape is deliberately minimal and forward-compatible: a JSON array
 * of `{ name, query }`. `query` is the bare query string WITHOUT a leading "?"
 * (e.g. `category=project&view=board&group=category`); an empty string means the
 * default unfiltered List view.
 */

/** One saved view: a human label + the URL query string it restores. */
export interface SavedTaskView {
  /** User-supplied label, trimmed and non-empty. */
  name: string;
  /** Query string without a leading "?" — may be empty for the default view. */
  query: string;
}

/** The localStorage key the saved-views store lives under (per browser/user). */
export const SAVED_VIEWS_KEY = "imperion.tasks.savedViews";

/** Cap the store so a runaway client can't bloat localStorage. */
export const MAX_SAVED_VIEWS = 20;

/**
 * Parse the raw localStorage string into a clean, deduped list. Tolerates null,
 * malformed JSON, and partial objects — anything unparseable yields `[]` rather
 * than throwing, because a corrupt store must never break the page render.
 */
export function parseSavedViews(raw: string | null): SavedTaskView[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const out: SavedTaskView[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const name = typeof (item as { name?: unknown }).name === "string" ? (item as { name: string }).name.trim() : "";
    if (!name) continue;
    const query =
      typeof (item as { query?: unknown }).query === "string"
        ? normalizeQuery((item as { query: string }).query)
        : "";
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, query });
    if (out.length >= MAX_SAVED_VIEWS) break;
  }
  return out;
}

/** Serialise a list back to the string stored in localStorage. */
export function serializeSavedViews(views: SavedTaskView[]): string {
  return JSON.stringify(views.map((v) => ({ name: v.name, query: v.query })));
}

/**
 * Add (or replace by case-insensitive name) a saved view, returning a NEW list.
 * Replacing keeps the view's original position; adding appends. Names are
 * trimmed; an empty name is rejected (returns the list unchanged). Honours
 * `MAX_SAVED_VIEWS` — a brand-new view past the cap is dropped.
 */
export function upsertSavedView(
  views: SavedTaskView[],
  name: string,
  query: string,
): SavedTaskView[] {
  const trimmed = name.trim();
  if (!trimmed) return views;
  const next: SavedTaskView = { name: trimmed, query: normalizeQuery(query) };
  const idx = views.findIndex((v) => v.name.toLowerCase() === trimmed.toLowerCase());
  if (idx >= 0) {
    const copy = views.slice();
    copy[idx] = next;
    return copy;
  }
  if (views.length >= MAX_SAVED_VIEWS) return views;
  return [...views, next];
}

/** Remove a saved view by case-insensitive name, returning a NEW list. */
export function removeSavedView(views: SavedTaskView[], name: string): SavedTaskView[] {
  const key = name.trim().toLowerCase();
  return views.filter((v) => v.name.toLowerCase() !== key);
}

/**
 * Build the `/tasks` href for a saved view's query. Centralised so the saved-
 * views UI and any caller agree on the leading-"?" rule.
 */
export function savedViewHref(query: string): string {
  const q = normalizeQuery(query);
  return q ? `/tasks?${q}` : "/tasks";
}

/**
 * Normalise a query string: drop a leading "?", trim, and canonicalise key
 * order via URLSearchParams so two equivalent filter sets compare equal (used to
 * decide whether the *current* view is already saved). Returns "" for empties.
 */
export function normalizeQuery(query: string): string {
  const raw = (query ?? "").trim().replace(/^\?/, "");
  if (!raw) return "";
  const params = new URLSearchParams(raw);
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const sorted = new URLSearchParams();
  for (const [k, v] of entries) sorted.append(k, v);
  return sorted.toString();
}

/** True when `query` matches a saved view's stored query (order-insensitive). */
export function isViewSaved(views: SavedTaskView[], query: string): boolean {
  const target = normalizeQuery(query);
  return views.some((v) => normalizeQuery(v.query) === target);
}
