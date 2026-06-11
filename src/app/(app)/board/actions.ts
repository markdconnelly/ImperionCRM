"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getPool } from "@/lib/db/client";
import { requireCapability } from "@/lib/auth/guard";
import { boardService } from "@/lib/services";
import { ServiceNotConfiguredError } from "@/lib/services/external-client";

/** Backend validation limits (backend ADR-0039 convene schema + 0059 seats). */
const TOPIC_MAX = 2000;
const CONTEXT_MAX = 8000;
const CISO_POSITION_MAX = 8000;
const PERSONAS_MAX = 5;
/** Epic #122: max 2 invitees (the backend separately trims to the 7-seat cap). */
const ADVISORS_MAX = 2;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the Convene card renders after a deliberation attempt. */
export interface ConveneBoardResult {
  ok: boolean;
  /** 'paused' = monthly budget reached, no session started (backend ADR-0037/0039). */
  status: "concluded" | "failed" | "paused" | "error";
  message: string;
  sessionId: string | null;
  recommendation: string | null;
}

/** Resolve the signed-in employee's app_user.id (same lookup as the agent panel). */
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
 * Convene the AI Board and run one full deliberation (backend ADR-0039 —
 * POST /board/sessions). This is a PROCESS, so it goes through the backend
 * (ADR-0042); the web role deliberately has no INSERT grant on board_* (0056).
 *
 * Capability: `agents:operate` (ADR-0050, superseding ADR-0049's `sales:write`
 * choice). With the Board page admin-only (#90), a broader write grant would be
 * unreachable from the GUI yet still invokable as a server-action endpoint —
 * exactly the gap ADR-0045 closes. Convening spends real premium-tier model
 * budget, so the action gate matches the page gate.
 */
export async function conveneBoardAction(formData: FormData): Promise<ConveneBoardResult> {
  await requireCapability("agents:operate");

  const topic = String(formData.get("topic") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  // The human CISO's stated position (ADR-0054 §4 deputy model) — optional,
  // shown to every seat with veto weight on security matters; the deputy defers.
  const cisoPosition = String(formData.get("cisoPosition") ?? "").trim();
  // Checkbox chips post one entry per selected persona. Non-UUID values (mock
  // personas) are dropped; an empty remainder means "default: all active".
  const personaAgentIds = formData
    .getAll("personaAgentIds")
    .map((v) => String(v))
    .filter((v) => UUID_RE.test(v))
    .slice(0, PERSONAS_MAX);
  // Invited advisors — counsel, not votes (ADR-0054). Same chip mechanics.
  const advisorAgentIds = formData
    .getAll("advisorAgentIds")
    .map((v) => String(v))
    .filter((v) => UUID_RE.test(v))
    .slice(0, ADVISORS_MAX);

  if (!topic) {
    return { ok: false, status: "error", message: "Give the board a topic to deliberate.", sessionId: null, recommendation: null };
  }
  if (topic.length > TOPIC_MAX) {
    return { ok: false, status: "error", message: `Keep the topic under ${TOPIC_MAX} characters.`, sessionId: null, recommendation: null };
  }
  if (context.length > CONTEXT_MAX) {
    return { ok: false, status: "error", message: `Keep the context under ${CONTEXT_MAX} characters.`, sessionId: null, recommendation: null };
  }
  if (cisoPosition.length > CISO_POSITION_MAX) {
    return { ok: false, status: "error", message: `Keep the CISO position under ${CISO_POSITION_MAX} characters.`, sessionId: null, recommendation: null };
  }

  const actingUserId = await resolveActingUserId();
  if (!actingUserId) {
    return {
      ok: false,
      status: "error",
      message: "Couldn't resolve your app user — sign in again (or provision your account under Settings).",
      sessionId: null,
      recommendation: null,
    };
  }

  try {
    const result = await boardService.convene({
      topic,
      actingUserId,
      ...(personaAgentIds.length > 0 ? { personaAgentIds } : {}),
      ...(advisorAgentIds.length > 0 ? { advisorAgentIds } : {}),
      ...(context ? { context } : {}),
      ...(cisoPosition ? { cisoPosition } : {}),
    });
    revalidatePath("/board");
    return {
      ok: result.status === "concluded",
      status: result.status,
      message: result.message,
      sessionId: result.sessionId,
      recommendation: result.recommendation,
    };
  } catch (err) {
    if (err instanceof ServiceNotConfiguredError) {
      return {
        ok: false,
        status: "error",
        message:
          "The board backend isn't wired up in this environment (AGENT_SERVICE_URL unset) — sessions can't be convened yet.",
        sessionId: null,
        recommendation: null,
      };
    }
    console.error("conveneBoardAction failed:", err);
    return {
      ok: false,
      status: "error",
      message: "Something went wrong reaching the board runtime — try again in a moment.",
      sessionId: null,
      recommendation: null,
    };
  }
}
