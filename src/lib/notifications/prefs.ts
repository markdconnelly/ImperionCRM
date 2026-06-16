/**
 * Shared notification-preference vocabulary (ADR-0064 A3, #601).
 *
 * The canonical trigger-kind and channel sets, their human labels, the
 * per-channel default state, and the overlay that turns a user's EXPLICIT pref
 * rows into a full grid. Mirrors the `notification_pref` CHECK constraints
 * (migration 0101). Imported by both the prefs surface and the server action so
 * the vocabulary lives in exactly one place.
 *
 * No `server-only` — this is pure data + helpers usable from the client grid and
 * the server action alike.
 */
import type { NotificationKind, NotificationChannel, NotificationPref } from "@/types";

/** Every notification trigger (mirrors the schema CHECK + ADR-0064 A3). */
export const NOTIFICATION_KINDS: readonly NotificationKind[] = [
  "assigned",
  "mentioned",
  "commented",
  "due_soon",
  "overdue",
  "blocked",
] as const;

/** Every delivery channel (mirrors the schema CHECK). */
export const NOTIFICATION_CHANNELS: readonly NotificationChannel[] = [
  "in_app",
  "email",
  "teams",
] as const;

/** Human labels for the trigger kinds (the prefs grid row headers). */
export const KIND_LABEL: Record<NotificationKind, string> = {
  assigned: "Assigned to me",
  mentioned: "Mentioned me",
  commented: "Comment on something I watch",
  due_soon: "Due soon",
  overdue: "Overdue",
  blocked: "Became blocked",
};

/** Human labels for the channels (the prefs grid column headers). */
export const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  in_app: "In-app",
  email: "Email",
  teams: "Teams",
};

/**
 * The DEFAULT enabled state when a user has no explicit row (migration 0101):
 * in-app is ON (the bell honours an explicit mute), and the outbound channels
 * default ON too — the BACKEND dispatcher is what actually sends, and it reads
 * the same `enabled=false` mute. The grid shows these until the user toggles.
 */
export const CHANNEL_DEFAULT: Record<NotificationChannel, boolean> = {
  in_app: true,
  email: true,
  teams: true,
};

export function isNotificationKind(v: string): v is NotificationKind {
  return (NOTIFICATION_KINDS as readonly string[]).includes(v);
}

export function isNotificationChannel(v: string): v is NotificationChannel {
  return (NOTIFICATION_CHANNELS as readonly string[]).includes(v);
}

/** One resolved cell of the prefs grid: its effective state + whether it differs from default. */
export interface PrefCell {
  kind: NotificationKind;
  channel: NotificationChannel;
  enabled: boolean;
  /** True when an explicit row overrides the default (drives a "muted"/"custom" hint). */
  explicit: boolean;
}

/**
 * Overlay a user's explicit pref rows onto the default grid → one cell per
 * (kind × channel). An absent row = the channel default; an explicit row wins.
 */
export function buildPrefGrid(explicit: NotificationPref[]): PrefCell[] {
  const byKey = new Map<string, boolean>();
  for (const p of explicit) byKey.set(`${p.kind}|${p.channel}`, p.enabled);
  const cells: PrefCell[] = [];
  for (const kind of NOTIFICATION_KINDS) {
    for (const channel of NOTIFICATION_CHANNELS) {
      const key = `${kind}|${channel}`;
      const has = byKey.has(key);
      cells.push({
        kind,
        channel,
        enabled: has ? (byKey.get(key) as boolean) : CHANNEL_DEFAULT[channel],
        explicit: has,
      });
    }
  }
  return cells;
}
