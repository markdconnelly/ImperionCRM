import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { rolesFromClaims } from "@/lib/auth/claims";

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

  test("FAILS CLOSED by default: an unrecognized user becomes support", () => {
    expect(rolesFromClaims({})).toEqual(["support"]);
    expect(rolesFromClaims({ roles: ["SomethingUnmapped"] })).toEqual(["support"]);
    expect(rolesFromClaims(null)).toEqual(["support"]);
  });

  test("RBAC_FAIL_OPEN_ADMIN=true opens an unrecognized user to admin (bootstrap only)", () => {
    process.env.RBAC_FAIL_OPEN_ADMIN = "true";
    expect(rolesFromClaims({})).toEqual(["admin"]);
  });

  test("the fail-open flag NEVER overrides a recognized claim", () => {
    process.env.RBAC_FAIL_OPEN_ADMIN = "true";
    expect(rolesFromClaims({ roles: ["Application.ImperionCRM.Support"] })).toEqual(["support"]);
  });

  test("DEV_ROLE is appended for local preview", () => {
    process.env.DEV_ROLE = "admin";
    expect(rolesFromClaims({})).toEqual(["admin"]);
  });
});
