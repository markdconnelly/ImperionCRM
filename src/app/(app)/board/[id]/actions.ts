"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/guard";
import { boardService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import { resolveActingUser } from "@/lib/services/acting-user";

/** Backend validation limit (review schema, backend docs/agents/board.md). */
const RATIONALE_MAX = 8000;

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
