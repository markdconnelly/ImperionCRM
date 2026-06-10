/**
 * Server-side authorization guard for mutating server actions (ADR-0045).
 *
 * Call `requireCapability(cap)` at the TOP of every server action that writes.
 * It resolves the signed-in user's roles (defaulting to the most-restricted
 * `support`) and throws `AuthorizationError` if they lack the capability — the
 * action then never runs, so authorization fails closed. This is defense in
 * depth: the GUI also hides controls the user can't use (ADR-0030), but the
 * server never trusts the client to have done so.
 *
 * Server-only: imports `getSessionRoles` (which reads the Auth.js session). The
 * pure decision lives in `policy.ts` so it can be unit-tested without a session.
 */
import "server-only";
import { getSessionRoles } from "@/lib/auth/session";
import { can, type Capability } from "@/lib/auth/policy";

/** Thrown when the current user lacks a required write capability. */
export class AuthorizationError extends Error {
  constructor(public readonly capability: Capability) {
    super(`Forbidden: missing capability "${capability}"`);
    this.name = "AuthorizationError";
  }
}

/**
 * Enforce that the signed-in user holds `capability`. Throws `AuthorizationError`
 * (fail-closed) otherwise. Returns the resolved roles for callers that want them.
 */
export async function requireCapability(capability: Capability) {
  const roles = await getSessionRoles();
  if (!can(roles, capability)) throw new AuthorizationError(capability);
  return roles;
}
