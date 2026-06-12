/**
 * The ONE acting-user resolver for backend calls (#190).
 *
 * Backend processes are scoped/audited by the acting employee's `app_user.id`
 * (backend ADR-0036/0037/0039). Three server actions grew private copies of the
 * session-email → app_user lookup; this is the single shared resolution, built
 * on `resolveAppUserIdByEmail` (ADR-0016/0030 mirror).
 *
 * The discriminated `reason` lets callers keep their own degradation posture:
 * best-effort audit attribution omits the id, hard-required flows (board) show
 * the matching message.
 *
 * Server-only.
 */
import "server-only";
import { auth } from "@/auth";
import { getPool } from "@/lib/db/client";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";

export type ActingUserResolution =
  | { ok: true; id: string }
  | {
      ok: false;
      /**
       * no_session — not signed in / session carries no email;
       * no_database — mock mode (no pool), nothing to resolve against;
       * not_provisioned — signed in, DB live, but no app_user row exists yet.
       */
      reason: "no_session" | "no_database" | "not_provisioned";
      email: string | null;
    };

/** Resolve the signed-in employee's `app_user.id`. Never throws. */
export async function resolveActingUser(): Promise<ActingUserResolution> {
  const email = (await auth())?.user?.email?.trim() || null;
  if (!email) return { ok: false, reason: "no_session", email: null };
  if (!getPool()) return { ok: false, reason: "no_database", email };
  const id = await resolveAppUserIdByEmail(email); // catches its own query failures
  return id ? { ok: true, id } : { ok: false, reason: "not_provisioned", email };
}
