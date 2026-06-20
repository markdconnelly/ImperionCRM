/**
 * Build the DB-session `IdentityContext` for the signed-in employee (#975,
 * ADR-0105). The single place a request's Entra identity is turned into the
 * facts `withIdentity` carries into Postgres for RLS:
 *   - `userId`  ← the acting user's `app_user.id` (owner/personal axis)
 *   - `groups`  ← the session's normalized app roles (company axis; the exact
 *                 element vocabulary is settled with the slice-3 company policies)
 *
 * `oid` (Entra object id) is not exposed on the session and the owner axis does
 * not need it, so it is left unset. When the user is unresolved (mock mode / not
 * provisioned), `userId` is null → owner policies match no rows (fail-closed).
 *
 * Server-only.
 */
import "server-only";
import { auth } from "@/auth";
import type { IdentityContext } from "@/lib/db/identity";
import { resolveActingUser } from "@/lib/services/acting-user";

export async function requestIdentity(): Promise<IdentityContext> {
  const session = await auth();
  const roles = session?.user?.roles ?? [];
  const acting = await resolveActingUser();
  return {
    userId: acting.ok ? acting.id : null,
    groups: roles,
  };
}
