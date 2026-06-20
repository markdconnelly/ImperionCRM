import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { groupIdsFromClaims, rolesFromClaims } from "@/lib/auth/claims";

/**
 * `rolesFromClaims` reads two env knobs through `roleEnv` (DEV_ROLE and
 * RBAC_FAIL_OPEN_ADMIN). Snapshot + restore them so tests are independent.
 */
const ENV_KEYS = ["DEV_ROLE", "RBAC_FAIL_OPEN_ADMIN", "ENTRA_GROUP_SALES"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("rolesFromClaims", () => {
  test("maps App-Role `roles` claim strings to app roles", () => {
    expect(rolesFromClaims({ roles: ["Application.ImperionCRM.Admins"] })).toEqual(["admin"]);
    expect(rolesFromClaims({ roles: ["Application.ImperionCRM.Sales"] })).toEqual(["sales"]);
  });

  test("maps a `groups` claim that carries App-Role names", () => {
    expect(rolesFromClaims({ groups: ["Application.ImperionCRM.Finance"] })).toEqual(["finance"]);
  });

  test("maps a `groups` claim of GUIDs via the env group map", () => {
    process.env.ENTRA_GROUP_SALES = "11111111-2222-3333-4444-555555555555";
    expect(rolesFromClaims({ groups: ["11111111-2222-3333-4444-555555555555"] })).toEqual([
      "sales",
    ]);
  });

  test("maps group GUIDs arriving in the `roles` claim (emit_as_roles) via the env group map", () => {
    process.env.ENTRA_GROUP_SALES = "11111111-2222-3333-4444-555555555555";
    expect(rolesFromClaims({ roles: ["11111111-2222-3333-4444-555555555555"] })).toEqual([
      "sales",
    ]);
    // unmapped GUIDs in roles still fall through (fail-closed: default support)
    expect(rolesFromClaims({ roles: ["99999999-0000-0000-0000-000000000000"] })).toEqual([
      "support",
    ]);
  });

  // ADR-0045 fail-closed restored (#171): the #140 interim ended when #139/#169
  // landed the live claim mapping and Mark verified sign-in.
  test("a claimless user fails CLOSED to the default support role", () => {
    expect(rolesFromClaims({})).toEqual(["support"]);
    expect(rolesFromClaims({ roles: ["SomethingUnmapped"] })).toEqual(["support"]);
    expect(rolesFromClaims(null)).toEqual(["support"]);
  });

  test("RBAC_FAIL_OPEN_ADMIN=true is the documented break-glass for claimless users", () => {
    process.env.RBAC_FAIL_OPEN_ADMIN = "true";
    expect(rolesFromClaims({})).toEqual(["admin"]);
    process.env.RBAC_FAIL_OPEN_ADMIN = "false";
    expect(rolesFromClaims({})).toEqual(["support"]);
  });

  test("the break-glass NEVER overrides a recognized claim", () => {
    process.env.RBAC_FAIL_OPEN_ADMIN = "true";
    expect(rolesFromClaims({ roles: ["Application.ImperionCRM.Support"] })).toEqual(["support"]);
  });

  test("DEV_ROLE is appended for local preview", () => {
    process.env.DEV_ROLE = "admin";
    expect(rolesFromClaims({})).toEqual(["admin"]);
  });
});

describe("groupIdsFromClaims (#974)", () => {
  const G1 = "11111111-2222-3333-4444-555555555555";
  const G2 = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  test("collects GUIDs from the `groups` claim", () => {
    expect(groupIdsFromClaims({ groups: [G1, G2] })).toEqual([G1, G2]);
  });

  test("collects group GUIDs arriving in the `roles` claim (emit_as_roles, #169)", () => {
    expect(groupIdsFromClaims({ roles: [G1] })).toEqual([G1]);
  });

  test("ignores App-Role value strings — only GUIDs are group ids", () => {
    expect(
      groupIdsFromClaims({ roles: ["Application.ImperionCRM.Admins"], groups: [G1] }),
    ).toEqual([G1]);
  });

  test("dedupes (same GUID in both claim positions) and lowercases", () => {
    expect(groupIdsFromClaims({ groups: [G1.toUpperCase()], roles: [G1] })).toEqual([G1]);
  });

  test("a claimless user yields no group ids", () => {
    expect(groupIdsFromClaims({})).toEqual([]);
    expect(groupIdsFromClaims(null)).toEqual([]);
  });
});
