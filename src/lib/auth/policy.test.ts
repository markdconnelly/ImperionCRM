import { describe, expect, test } from "vitest";
import { APP_ROLES, type AppRole } from "@/lib/auth/roles";
import { CAPABILITIES, type Capability, can } from "@/lib/auth/policy";

/**
 * The RBAC stress test (ADR-0045). The authoritative expectation of which roles
 * hold which WRITE capability lives here as an explicit table — independent of
 * `policy.ts`'s own matrix — so a regression in the policy is caught by a diff
 * against intent, not by re-reading the same source. `admin` holds everything.
 */
// time:write + expense:write are self-service (own timesheet/report) — every role holds them.
const EXPECTED: Record<Exclude<AppRole, "admin">, Capability[]> = {
  finance: ["contracts:write", "time:write", "time:payroll-approve", "expense:write"],
  sales: ["crm:write", "sales:write", "tickets:write", "comms:write", "time:write", "expense:write"],
  project_manager: ["crm:write", "delivery:write", "tickets:write", "time:write", "expense:write"],
  support: ["tickets:write", "comms:write", "time:write", "expense:write"],
};

describe("RBAC capability matrix", () => {
  test("admin holds every capability", () => {
    for (const cap of CAPABILITIES) {
      expect(can(["admin"], cap), `admin → ${cap}`).toBe(true);
    }
  });

  // For every non-admin role, assert the FULL row: granted caps allow, all others deny.
  for (const role of Object.keys(EXPECTED) as Array<keyof typeof EXPECTED>) {
    describe(`role: ${role}`, () => {
      for (const cap of CAPABILITIES) {
        const allowed = EXPECTED[role].includes(cap);
        test(`${allowed ? "may" : "may NOT"} ${cap}`, () => {
          expect(can([role], cap)).toBe(allowed);
        });
      }
    });
  }

  test("no role exists that is not covered by the expectation table", () => {
    const covered = new Set<AppRole>(["admin", ...(Object.keys(EXPECTED) as AppRole[])]);
    for (const role of APP_ROLES) expect(covered.has(role)).toBe(true);
  });

  test("empty or undefined roles deny everything (fail closed)", () => {
    for (const cap of CAPABILITIES) {
      expect(can([], cap)).toBe(false);
      expect(can(undefined, cap)).toBe(false);
    }
  });

  test("a multi-role user gets the UNION of its roles' capabilities", () => {
    // sales (crm/sales/tickets/comms) + finance (contracts) → contracts now allowed too.
    expect(can(["sales", "finance"], "contracts:write")).toBe(true);
    expect(can(["sales", "finance"], "sales:write")).toBe(true);
    // …but still nothing admin-only.
    expect(can(["sales", "finance"], "settings:write")).toBe(false);
    expect(can(["sales", "finance"], "catalog:write")).toBe(false);
  });

  test("settings + catalog + agent operations are admin-only", () => {
    for (const role of ["finance", "sales", "project_manager", "support"] as AppRole[]) {
      expect(can([role], "settings:write")).toBe(false);
      expect(can([role], "catalog:write")).toBe(false);
      // ADR-0050: convening the board / operating the agent layer spends real
      // model budget and its pages are admin-only — the capability matches.
      expect(can([role], "agents:operate")).toBe(false);
    }
    expect(can(["admin"], "agents:operate")).toBe(true);
  });
});
