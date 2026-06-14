import { describe, expect, test } from "vitest";
import {
  canManageCampaigns,
  canManageMileageRate,
  canManageProjects,
  canManageSales,
  canSeeAgentPages,
  canSeeLaborCost,
  canSeeRevenue,
  canSeeSettings,
  canSeeFeature,
  isAdmin,
  normalizeRoles,
  redactMoney,
  REDACTED_MONEY,
  DEFAULT_ROLE,
} from "@/lib/auth/roles";

describe("normalizeRoles", () => {
  test("keeps known roles, drops unknown, de-duplicates", () => {
    expect(normalizeRoles(["admin", "admin", "bogus", "sales"]).sort()).toEqual([
      "admin",
      "sales",
    ]);
  });
  test("empty / all-unknown / undefined fall back to the default role", () => {
    expect(normalizeRoles([])).toEqual([DEFAULT_ROLE]);
    expect(normalizeRoles(["nope"])).toEqual([DEFAULT_ROLE]);
    expect(normalizeRoles(undefined)).toEqual([DEFAULT_ROLE]);
  });
});

describe("predicates", () => {
  test("isAdmin / canSeeSettings are admin-only", () => {
    expect(isAdmin(["admin"])).toBe(true);
    expect(canSeeSettings(["admin"])).toBe(true);
    for (const r of ["finance", "sales", "project_manager", "support"] as const) {
      expect(isAdmin([r])).toBe(false);
      expect(canSeeSettings([r])).toBe(false);
    }
  });

  test("canSeeRevenue is false only when the sole role is support", () => {
    expect(canSeeRevenue(["support"])).toBe(false);
    expect(canSeeRevenue(["finance"])).toBe(true);
    expect(canSeeRevenue(["sales"])).toBe(true);
    expect(canSeeRevenue(["project_manager"])).toBe(true);
    expect(canSeeRevenue(["admin"])).toBe(true);
    // A mix that includes a non-support role can see revenue.
    expect(canSeeRevenue(["support", "finance"])).toBe(true);
  });

  test("canSeeLaborCost is finance/admin only (comp-sensitive — ADR-0082, #467)", () => {
    expect(canSeeLaborCost(["finance"])).toBe(true);
    expect(canSeeLaborCost(["admin"])).toBe(true);
    expect(canSeeLaborCost(["support", "finance"])).toBe(true);
    for (const r of ["sales", "project_manager", "support"] as const) {
      expect(canSeeLaborCost([r])).toBe(false);
    }
    expect(canSeeLaborCost(undefined)).toBe(false);
  });

  test("redactMoney blanks for support, passes through otherwise", () => {
    expect(redactMoney(["support"], "$4,200")).toBe(REDACTED_MONEY);
    expect(redactMoney(["finance"], "$4,200")).toBe("$4,200");
  });

  test("canSeeFeature gates settings/security, shows everything else", () => {
    expect(canSeeFeature("settings", ["support"])).toBe(false);
    expect(canSeeFeature("security", ["support"])).toBe(false);
    expect(canSeeFeature("settings", ["admin"])).toBe(true);
    expect(canSeeFeature("accounts", ["support"])).toBe(true);
  });

  test("canSeeAgentPages is admin-only (#90 — AI Agents + Board match the Settings gate)", () => {
    expect(canSeeAgentPages(["admin"])).toBe(true);
    expect(canSeeAgentPages(["support", "admin"])).toBe(true);
    for (const r of ["finance", "sales", "project_manager", "support"] as const) {
      expect(canSeeAgentPages([r])).toBe(false);
    }
    expect(canSeeAgentPages([])).toBe(false);
    expect(canSeeAgentPages(undefined)).toBe(false);
  });

  test("canManageProjects is admin | project_manager (ADR-0052 §8)", () => {
    expect(canManageProjects(["admin"])).toBe(true);
    expect(canManageProjects(["project_manager"])).toBe(true);
    expect(canManageProjects(["support", "project_manager"])).toBe(true);
    for (const r of ["finance", "sales", "support"] as const) {
      expect(canManageProjects([r])).toBe(false);
    }
    expect(canManageProjects([])).toBe(false);
    expect(canManageProjects(undefined)).toBe(false);
  });

  test("canManageSales is admin | sales (ADR-0052 §8)", () => {
    expect(canManageSales(["admin"])).toBe(true);
    expect(canManageSales(["sales"])).toBe(true);
    expect(canManageSales(["support", "sales"])).toBe(true);
    for (const r of ["finance", "project_manager", "support"] as const) {
      expect(canManageSales([r])).toBe(false);
    }
    expect(canManageSales([])).toBe(false);
    expect(canManageSales(undefined)).toBe(false);
  });

  test("canManageCampaigns is admin | sales (ADR-0053 §8)", () => {
    expect(canManageCampaigns(["admin"])).toBe(true);
    expect(canManageCampaigns(["sales"])).toBe(true);
    for (const r of ["finance", "project_manager", "support"] as const) {
      expect(canManageCampaigns([r])).toBe(false);
    }
    expect(canManageCampaigns(undefined)).toBe(false);
  });

  test("canSeeFeature hides the agents/board nav for non-admins (#90)", () => {
    for (const key of ["agents", "board"]) {
      expect(canSeeFeature(key, ["admin"])).toBe(true);
      for (const r of ["finance", "sales", "project_manager", "support"] as const) {
        expect(canSeeFeature(key, [r])).toBe(false);
      }
    }
  });

  test("mileage rate is comp-gated to finance∨admin only (ADR-0083 #490)", () => {
    // Mirrors Pay Rate's comp gate — finance and admin only, never employee-tier roles.
    expect(canManageMileageRate(["admin"])).toBe(true);
    expect(canManageMileageRate(["finance"])).toBe(true);
    for (const r of ["sales", "project_manager", "support"] as const) {
      expect(canManageMileageRate([r])).toBe(false);
    }
    expect(canManageMileageRate(undefined)).toBe(false);
    // The nav guard hides the surface for the same roles.
    expect(canSeeFeature("expense-mileage-rate", ["finance"])).toBe(true);
    expect(canSeeFeature("expense-mileage-rate", ["support"])).toBe(false);
  });
});
