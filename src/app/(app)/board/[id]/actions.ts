"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getPool } from "@/lib/db/client";
import { requireCapability } from "@/lib/auth/guard";
import { boardService } from "@/lib/services";
import { ServiceNotConfiguredError } from "@/lib/services/external-client";

/** Backend validation limit (review schema, backend docs/agents/board.md). */
const RATIONALE_MAX = 8000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the review panel renders after a verdict attempt. */
export interface ReviewRecommendationResult {
  ok: boolean;
  message: string;
}

/** Resolve the signed-in employee's app_user.id (same lookup as the convene action). */
async function resolveActingUserId(): Promise<string | undefined> {
  const email = (await auth())?.user?.email;
  const pool = getPool();
  if (!email || !pool) return undefined;
  try {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM app_user WHERE lower(email) = lower($1) ORDER BY created_at LIMIT 1`,
      [email],
    );
    return rows[0]?.id;
  } catch {
    return undefined;
  }
}

/**
 * The human CISO's verdict on a board recommendation (ADR-0054 §4): ratify or
 * overrule, rationale REQUIRED for both. A PROCESS, so it goes through the
 * backend POST (ADR-0042) — every call appends a board.review audit row and the
 * verdict stays amendable. Gate matches the page + convene gate
 * (`agents:operate`, ADR-0050 admin-only).
 */
export async function reviewRecommendationAction(
  formData: FormData,
): Promise<ReviewRecommendationResult> {
  await requireCapability("agents:operate");

  const recommendationId = String(formData.get("recommendationId") ?? "");
  const verdict = String(formData.get("reviewStatus") ?? "");
  const rationale = String(formData.get("rationale") ?? "").trim();

  if (!UUID_RE.test(recommendationId)) {
    return { ok: false, message: "This recommendation can't be reviewed (sample data or bad id)." };
  }
  if (verdict !== "ratified" && verdict !== "overruled") {
    return { ok: false, message: "Pick a verdict — ratify or overrule." };
  }
  if (!rationale) {
    return { ok: false, message: "A written rationale is required for both verdicts (ADR-0054 §4)." };
  }
  if (rationale.length > RATIONALE_MAX) {
    return { ok: false, message: `Keep the rationale under ${RATIONALE_MAX} characters.` };
  }

  const actingUserId = await resolveActingUserId();
  if (!actingUserId) {
    return {
      ok: false,
      message: "Couldn't resolve your app user — sign in again (or provision your account under Settings).",
    };
  }

  try {
    const result = await boardService.reviewRecommendation(recommendationId, {
      actingUserId,
      reviewStatus: verdict,
      rationale,
    });
    revalidatePath("/board");
    revalidatePath(`/board/${result.sessionId}`);
    return {
      ok: true,
      message: verdict === "ratified" ? "Recommendation ratified." : "Recommendation overruled — it no longer reads as board consensus.",
    };
  } catch (err) {
    if (err instanceof ServiceNotConfiguredError) {
      return {
        ok: false,
        message: "The board backend isn't wired up in this environment (AGENT_SERVICE_URL unset) — reviews can't be recorded yet.",
      };
    }
    console.error("reviewRecommendationAction failed:", err);
    return { ok: false, message: "Something went wrong recording the verdict — try again in a moment." };
  }
}
