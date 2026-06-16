"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/data";
import { resolveActingUser } from "@/lib/services/acting-user";
import { isNotificationKind, isNotificationChannel } from "@/lib/notifications/prefs";

/**
 * Notification bell server actions (ADR-0064 A3, #332).
 *
 * Both actions are recipient-scoped: they resolve the signed-in employee
 * (email → app_user) and the data layer only touches that user's rows, so one
 * user can never mark another's notifications read. No capability gate — a user
 * always owns their own inbox. Unresolved / mock-mode users are a silent no-op
 * (house style: the bell degrades, never errors).
 *
 * No `revalidatePath` — the bell is a client component that re-fetches
 * `/api/notifications` after the action resolves; there is no server-rendered
 * surface to revalidate.
 */
export async function markNotificationReadAction(id: string): Promise<void> {
  const cleaned = id.trim();
  if (!cleaned) return;
  const acting = await resolveActingUser();
  if (!acting.ok) return;
  const { notifications } = getRepositories();
  await notifications.markRead(cleaned, acting.id);
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const acting = await resolveActingUser();
  if (!acting.ok) return;
  const { notifications } = getRepositories();
  await notifications.markAllRead(acting.id);
}

/**
 * Set one (trigger kind × channel) notification preference for the SIGNED-IN
 * employee (ADR-0064 A3, #601). The acting user is resolved server-side
 * (email → app_user); the action only ever writes that user's own prefs, so one
 * user can never mute another's notifications. No capability gate — a user owns
 * their own preferences. The `kind`/`channel` are validated against the schema
 * CHECK sets so a hand-crafted POST can't write a junk row. Unresolved / mock-mode
 * users are a silent no-op (house style: the surface degrades, never errors).
 *
 * `in_app` is honoured by the FE (the bell suppresses a muted kind at dispatch);
 * `email`/`teams` are recorded here but DISPATCHED by the backend (no provider
 * key in the FE — ADR-0064).
 */
export async function setNotificationPrefAction(formData: FormData): Promise<void> {
  const kind = String(formData.get("kind") ?? "").trim();
  const channel = String(formData.get("channel") ?? "").trim();
  // A checkbox-style toggle posts the DESIRED end-state as "true"/"false".
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!isNotificationKind(kind) || !isNotificationChannel(channel)) return;
  const acting = await resolveActingUser();
  if (!acting.ok) return;
  const { notifications } = getRepositories();
  await notifications.setPref(acting.id, kind, channel, enabled);
  revalidatePath("/notifications/preferences");
}
