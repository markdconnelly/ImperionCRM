import { NextResponse } from "next/server";
import { getRepositories } from "@/lib/data";
import { resolveActingUser } from "@/lib/services/acting-user";

/**
 * GET the signed-in employee's in-app notifications (ADR-0064 A3, #332).
 *
 *   GET /api/notifications?unread=1&limit=30
 *
 * The bell polls this for its badge count + dropdown list. Recipients are scoped
 * to the resolved acting user (email → app_user), so a user only ever sees their
 * own notifications. Auth is enforced by middleware — every /api route except
 * /api/auth requires a signed-in session. Read-only.
 *
 * Degrades gracefully: in mock mode / before the signed-in user is provisioned in
 * `app_user`, returns an empty, zero-count payload instead of erroring (house
 * style — the bell renders empty rather than failing the shell).
 */
export async function GET(request: Request) {
  const acting = await resolveActingUser();
  if (!acting.ok) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "1";
  const limit = clampInt(url.searchParams.get("limit"), 30, 1, 100);

  const { notifications } = getRepositories();
  const [list, unreadCount] = await Promise.all([
    notifications.listForUser(acting.id, { unreadOnly, limit }),
    notifications.unreadCount(acting.id),
  ]);
  return NextResponse.json({ notifications: list, unreadCount });
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw === null ? fallback : Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}
