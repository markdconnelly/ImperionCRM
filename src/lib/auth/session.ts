/**
 * Server-side session role helpers (ADR-0030).
 *
 * Use these in server components / server actions to gate data BEFORE it is
 * rendered — e.g. redacting revenue for Support. Hiding values only in JSX is
 * insufficient because the numbers would still be shipped to the client.
 */
import "server-only";
import { auth } from "@/auth";
import { type AppRole, DEFAULT_ROLE } from "@/lib/auth/roles";

/** The signed-in user's roles, defaulting to the most-restricted role. */
export async function getSessionRoles(): Promise<AppRole[]> {
  const session = await auth();
  return session?.user?.roles ?? [DEFAULT_ROLE];
}
