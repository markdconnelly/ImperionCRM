"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/guard";
import { boardService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import { resolveActingUser } from "@/lib/services/acting-user";

/** Backend validation limits (review/resume schemas, backend docs/agents/board.md). */
const RATIONALE_MAX = 8000;
const CISO_POSITION_MAX = 8000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the review panel renders after a verdict attempt. */
export interface ReviewRecommendationResult {
  ok: boolean;
  message: string;
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

  const acting = await resolveActingUser();
  if (!acting.ok) {
    return {
      ok: false,
      message: "Couldn't resolve your app user — sign in again (or provision your account under Settings).",
    };
  }

  const outcome = await callServiceWithFallback(
    () =>
      boardService.reviewRecommendation(recommendationId, {
        actingUserId: acting.id,
        reviewStatus: verdict,
        rationale,
      }),
    {
      label: "reviewRecommendationAction",
      notConfigured:
        "The board backend isn't wired up in this environment (AGENT_SERVICE_URL unset) — reviews can't be recorded yet.",
      failed: "Something went wrong recording the verdict — try again in a moment.",
    },
  );
  if (!outcome.ok) return { ok: false, message: outcome.message };

  revalidatePath("/board");
  revalidatePath(`/board/${outcome.value.sessionId}`);
  return {
    ok: true,
    message: verdict === "ratified" ? "Recommendation ratified." : "Recommendation overruled — it no longer reads as board consensus.",
  };
}

/** What the deputy-pause panel renders after a resume attempt. */
export interface ResumeSessionResult {
  ok: boolean;
  message: string;
}

/**
 * Resume a deputy-paused (awaiting_ciso) session with the human CISO's position
 * (ADR-0054 §4 second stage, #185; backend #64). A PROCESS, so it goes through
 * the backend POST (ADR-0042): persists ciso_position_md, audits board.resume,
 * and runs synthesis → conclude. The position is REQUIRED — it is what the pause
 * was waiting for (approve the deputy draft by adopting it, or amend it). Gate
 * matches the page + convene gate (`agents:operate`, ADR-0050 admin-only).
 */
export async function resumeSessionAction(formData: FormData): Promise<ResumeSessionResult> {
  await requireCapability("agents:operate");

  const sessionId = String(formData.get("sessionId") ?? "");
  const cisoPosition = String(formData.get("cisoPosition") ?? "").trim();

  if (!UUID_RE.test(sessionId)) {
    return { ok: false, message: "This session can't be resumed (sample data or bad id)." };
  }
  if (!cisoPosition) {
    return {
      ok: false,
      message: "The human CISO position is required — it is what the pause is waiting for.",
    };
  }
  if (cisoPosition.length > CISO_POSITION_MAX) {
    return { ok: false, message: `Keep the position under ${CISO_POSITION_MAX} characters.` };
  }

  const acting = await resolveActingUser();
  if (!acting.ok) {
    return {
      ok: false,
      message:
        "Couldn't resolve your app user — sign in again (or provision your account under Settings).",
    };
  }

  const outcome = await callServiceWithFallback(
    () => boardService.resume(sessionId, { actingUserId: acting.id, cisoPosition }),
    {
      label: "resumeSessionAction",
      notConfigured:
        "The board backend isn't wired up in this environment (AGENT_SERVICE_URL unset) — the session stays paused.",
      failed: "Something went wrong reaching the board runtime — the session stays resumable.",
    },
  );
  if (!outcome.ok) return { ok: false, message: outcome.message };

  revalidatePath("/board");
  revalidatePath(`/board/${sessionId}`);
  const result = outcome.value;
  if (result.status === "concluded") {
    return { ok: true, message: "Position recorded — the session resumed and concluded." };
  }
  if (result.status === "paused") {
    return { ok: false, message: result.message || "Monthly budget reached — try again next cycle." };
  }
  // 'awaiting_ciso' again = synthesis failed; the position persisted, still resumable.
  return {
    ok: false,
    message:
      result.message ||
      "Your position was recorded, but synthesis failed — the session stays resumable.",
  };
}
