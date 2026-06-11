/**
 * Map Entra ID token claims → application roles (ADR-0030).
 *
 * Two claim shapes are supported, in priority order:
 *  1. `roles` claim — App-Role value strings like
 *     "Application.ImperionCRM.Admins" (APP_ROLE_CLAIM_MAP), or group object-id
 *     GUIDs when the app registration emits groups as the role claim
 *     (`emit_as_roles`, the live Entra config — #169), mapped via env.
 *  2. `groups` claim — raw group object-id GUIDs, mapped via env (`roleEnv`),
 *     which the operator populates with the five group GUIDs.
 *
 * A local `DEV_ROLE` override is appended when set, for testing restricted GUIs
 * without a live claim. Everything falls back to `['support']` (DEFAULT_ROLE).
 *
 * PURE / edge-safe: imports only `roles.ts` and the env getters (no pg/node).
 */
import {
  type AppRole,
  APP_ROLE_CLAIM_MAP,
  normalizeRoles,
} from "@/lib/auth/roles";
import { roleEnv } from "@/lib/env";

/** Minimal shape of the claims we read off the Entra ID token / profile. */
export interface RoleClaims {
  groups?: string[];
  roles?: string[];
}

export function rolesFromClaims(claims: RoleClaims | null | undefined): AppRole[] {
  const candidates: string[] = [];
  const groupMap = roleEnv.groupMap;

  // 1. `roles` claim. Carries App-Role value strings when App Roles are assigned,
  //    OR group object-id GUIDs when the app registration emits groups as the role
  //    claim (`emit_as_roles` — the live config since 2026-06-11, #169). Check both
  //    tables so the mapping survives either Entra configuration.
  for (const value of claims?.roles ?? []) {
    const mapped = APP_ROLE_CLAIM_MAP[value] ?? groupMap[value];
    if (mapped) candidates.push(mapped);
  }

  // 2. Groups claim → role. Match each value against the operator-configured env map (group
  //    object-id GUIDs) AND the stable App-Role name table — so it resolves whether the
  //    groups claim is configured to emit GUIDs or names like "Application.ImperionCRM.Admins".
  for (const value of claims?.groups ?? []) {
    const mapped = groupMap[value] ?? APP_ROLE_CLAIM_MAP[value];
    if (mapped) candidates.push(mapped);
  }

  // 3. Local dev override.
  if (roleEnv.devRole) candidates.push(roleEnv.devRole);

  // 4. Bootstrap escape hatch — INTERIM UNCONDITIONAL FAIL-OPEN (#140). Entra App
  // Roles are not yet assigned (#139), so every token arrives claimless; ADR-0045's
  // fail-closed default therefore locks everyone (including the operator) out of the
  // admin-gated pages. Until #139's role assignment lands, a no-claim user opens up
  // to `admin` regardless of `RBAC_FAIL_OPEN_ADMIN`. Users who DO carry a recognized
  // claim always get exactly their real role. REVERT to the env-gated line below when
  // closing out #139 (restores ADR-0045 fail-closed):
  //   if (candidates.length === 0 && roleEnv.failOpenAdmin) candidates.push("admin");
  if (candidates.length === 0) candidates.push("admin");

  return normalizeRoles(candidates);
}
