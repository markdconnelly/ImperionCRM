import { NextResponse } from "next/server";
import { getRepositories } from "@/lib/data";
import { resolveActingUser } from "@/lib/services/acting-user";
import type { WorkParentType } from "@/types";

/**
 * GET the activity feed for one work object (ADR-0064 A1, #330).
 *
 *   GET /api/work/:parentType/:parentId/activity?comments=1&limit=50&offset=0
 *
 * Returns the comments-∪-audit-events feed newest-first, paginated. This is the
 * read surface the in-app feed polls for "post without a full reload" (the form
 * post itself goes through the server action). Read-only; it never returns
 * soft-deleted comment bodies (the view excludes them).
 *
 * Authz (#883, defense-in-depth): middleware gates a signed-in session, and on
 * top of that this handler validates `parentId` is a well-formed UUID and
 * requires a *provisioned* acting user (`app_user` row) — an unprovisioned /
 * non-employee session fails closed to an empty feed (house style, mirrors the
 * notifications route) rather than dumping comment bodies + audit detail JSON.
 * It does NOT yet enforce object/account-scoped visibility: the app has no
 * account-visibility model and reads are intentionally broad for employees;
 * whether that should change is the deferred ADR (#884).
 */
const PARENT_TYPES: readonly WorkParentType[] = ["task", "project", "milestone"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ parentType: string; parentId: string }> },
) {
  const { parentType, parentId } = await params;
  if (!(PARENT_TYPES as readonly string[]).includes(parentType)) {
    return NextResponse.json({ error: "invalid parentType" }, { status: 400 });
  }
  if (!UUID_RE.test(parentId)) {
    return NextResponse.json({ error: "invalid parentId" }, { status: 400 });
  }
  // Beyond the middleware sign-in gate: only a provisioned employee may read the
  // feed. Unprovisioned / non-employee sessions get an empty feed (#883, #884).
  const acting = await resolveActingUser();
  if (!acting.ok) {
    return NextResponse.json({ entries: [] });
  }
  const url = new URL(request.url);
  const commentsOnly = url.searchParams.get("comments") === "1";
  const limit = clampInt(url.searchParams.get("limit"), 50, 1, 200);
  const offset = clampInt(url.searchParams.get("offset"), 0, 0, 100000);

  const { work } = getRepositories();
  const entries = await work.listActivity(parentType as WorkParentType, parentId, {
    commentsOnly,
    limit,
    offset,
  });
  return NextResponse.json({ entries });
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw === null ? fallback : Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}
