"use server";

import { signOut } from "@/auth";

/**
 * Sign the current user out and return to the login page (ADR-0002/0008).
 *
 * Runs in the Node route handler (not edge) because `@/auth` pulls in the
 * certificate-assertion / `pg` code path. Auth.js clears the session cookie and
 * redirects; the middleware then keeps the user on `/login` until they re-auth.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
