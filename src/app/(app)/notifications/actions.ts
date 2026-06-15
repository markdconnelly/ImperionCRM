"use server";

import { getRepositories } from "@/lib/data";
import { resolveActingUser } from "@/lib/services/acting-user";

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
