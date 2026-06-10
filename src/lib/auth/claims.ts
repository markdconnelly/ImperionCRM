/**
 * Map Entra ID token claims → application roles (ADR-0030).
 *
 * Two claim shapes are supported, in priority order:
 *  1. App-Role `roles` claim (RECOMMENDED) — stable strings like
 *     "Application.ImperionCRM.Admins", mapped via APP_ROLE_CLAIM_MAP. Immune to
 *     the >200-group "groups overage" problem.
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

  // 1. App-Role strings (recommended path).
  for (const value of claims?.roles ?? []) {
    const mapped = APP_ROLE_CLAIM_MAP[value];
    if (mapped) candidates.push(mapped);
  }

  // 2. Groups claim → role. Match each value against the operator-configured env map (group
  //    object-id GUIDs) AND the stable App-Role name table — so it resolves whether the
  //    groups claim is configured to emit GUIDs or names like "Application.ImperionCRM.Admins".
  const groupMap = roleEnv.groupMap;
  for (const value of claims?.groups ?? []) {
    const mapped = groupMap[value] ?? APP_ROLE_CLAIM_MAP[value];
    if (mapped) candidates.push(mapped);
  }

  // 3. Local dev override.
  if (roleEnv.devRole) candidates.push(roleEnv.devRole);

  // 4. Bootstrap escape hatch (ADR-0045, supersedes ADR-0030's unconditional fail-open).
  // By DEFAULT this fails CLOSED: a user with no recognized claim gets no candidate here
  // and `normalizeRoles` falls them back to `support` (least privilege). Only when the
  // operator explicitly sets `RBAC_FAIL_OPEN_ADMIN=true` — a temporary measure while Entra
  // App Roles are being assigned — does a no-claim user open up to `admin`. Users who DO
  // carry a recognized claim always get exactly their real role, flag or not. Prefer
  // break-glass (forced admin) over this flag for interim admin access.
  if (candidates.length === 0 && roleEnv.failOpenAdmin) candidates.push("admin");

  return normalizeRoles(candidates);
}
