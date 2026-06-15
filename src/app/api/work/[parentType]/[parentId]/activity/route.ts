import { NextResponse } from "next/server";
import { getRepositories } from "@/lib/data";
import type { WorkParentType } from "@/types";

/**
 * GET the activity feed for one work object (ADR-0064 A1, #330).
 *
 *   GET /api/work/:parentType/:parentId/activity?comments=1&limit=50&offset=0
 *
 * Returns the comments-∪-audit-events feed newest-first, paginated. This is the
 * read surface the in-app feed polls for "post without a full reload" (the form
 * post itself goes through the server action). Auth is enforced by middleware —
 * every /api route except /api/auth requires a signed-in session. Read-only; it
 * never returns soft-deleted comment bodies (the view excludes them).
 */
const PARENT_TYPES: readonly WorkParentType[] = ["task", "project", "milestone"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ parentType: string; parentId: string }> },
) {
  const { parentType, parentId } = await params;
  if (!(PARENT_TYPES as readonly string[]).includes(parentType)) {
    return NextResponse.json({ error: "invalid parentType" }, { status: 400 });
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
