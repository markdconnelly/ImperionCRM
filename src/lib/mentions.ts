/**
 * @mention parsing for work comments (ADR-0064 A2, #331).
 *
 * A mention in a comment body is `@handle`, where the handle is the lowercased
 * local-part of a user's email (e.g. `ada@imperion.com` -> `@ada`). Handles are
 * stable, unique-enough, and free of spaces — unlike display names — so they are
 * what we both render the typeahead against and parse back out of a saved body.
 *
 * This module is PURE (no DB, no React) so it is trivially testable and reusable
 * by the data layer (resolve parsed tokens to user ids) and the UI (render the
 * body with mentions linked). It never trusts the body — tokens are bounded by a
 * conservative charset and resolved against a known handle set; an unknown token
 * is left as literal text, never a link.
 */

/** A user that can be @mentioned (typeahead row + resolution target). */
export interface MentionableUser {
  id: string;
  displayName: string;
  /** Lowercased email local-part, the text after `@` in a mention. */
  handle: string;
}

// A handle token: `@` then 1+ of [a-z0-9._-]. Case-insensitive; we lowercase on
// match. Bounded charset keeps emails like `first.last` working without letting
// a body smuggle arbitrary text into a "mention".
const MENTION_TOKEN = /@([a-z0-9._-]+)/gi;

/** Derive a mention handle from an email address (lowercased local-part). */
export function handleFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const local = email.split("@")[0]?.trim().toLowerCase();
  return local && /^[a-z0-9._-]+$/.test(local) ? local : null;
}

/**
 * Extract the DISTINCT, lowercased handles referenced in a comment body. Order
 * is first-seen; duplicates collapse. Resolution to user ids is the caller's job
 * (an unknown handle here is not a mention).
 */
export function parseMentionHandles(body: string): string[] {
  const seen = new Set<string>();
  for (const m of body.matchAll(MENTION_TOKEN)) {
    seen.add(m[1].toLowerCase());
  }
  return [...seen];
}

/**
 * Resolve the handles in a body to the matching users from a candidate set.
 * Returns the DISTINCT users actually mentioned (the rows persisted to
 * comment_mention). A handle with no matching candidate is dropped.
 */
export function resolveMentions(body: string, users: MentionableUser[]): MentionableUser[] {
  const byHandle = new Map(users.map((u) => [u.handle, u]));
  const out: MentionableUser[] = [];
  for (const handle of parseMentionHandles(body)) {
    const u = byHandle.get(handle);
    if (u) out.push(u);
  }
  return out;
}

/** One run of a body when split for rendering: literal text or a resolved mention. */
export type MentionSegment =
  | { kind: "text"; text: string }
  | { kind: "mention"; handle: string; user: MentionableUser };

/**
 * Split a body into ordered text / mention segments for rendering. Only handles
 * that resolve to a known user become `mention` segments (rendered as a link);
 * every other `@token` stays literal text. The body is otherwise untouched, so
 * the caller still renders it as PLAIN TEXT (never HTML) — segmenting does not
 * weaken the XSS posture of 0094/NFR-3.
 */
export function segmentBody(body: string, users: MentionableUser[]): MentionSegment[] {
  const byHandle = new Map(users.map((u) => [u.handle, u]));
  const segments: MentionSegment[] = [];
  let last = 0;
  for (const m of body.matchAll(MENTION_TOKEN)) {
    const handle = m[1].toLowerCase();
    const user = byHandle.get(handle);
    if (!user) continue; // unknown token stays in the surrounding text run
    const start = m.index ?? 0;
    if (start > last) segments.push({ kind: "text", text: body.slice(last, start) });
    segments.push({ kind: "mention", handle, user });
    last = start + m[0].length;
  }
  if (last < body.length) segments.push({ kind: "text", text: body.slice(last) });
  return segments;
}
