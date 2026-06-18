import { describe, expect, test } from "vitest";
import {
  canManageCampaigns,
  canManageMileageRate,
  canManageProjects,
  canManageSales,
  canSeeCollections,
  canSeeAgentPages,
  canSeeCmdb,
  canSeeConnectors,
  canSeeLaborCost,
  canSeeRevenue,
  canSeeSettings,
  canSeeFeature,
  canSeeMarketing,
  canSeeSales,
  canSeeProjects,
  canSeeService,
  canSeeFinance,
  roleLabel,
  isAdmin,
  normalizeRoles,
  redactMoney,
  REDACTED_MONEY,
  DEFAULT_ROLE,
  type AppRole,
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

  test("canSeeCmdb is admin | technician(support) (#794 — IA matrix moves CMDB to the Service tier)", () => {
    expect(canSeeCmdb(["admin"])).toBe(true);
    expect(canSeeCmdb(["support"])).toBe(true);
    expect(canSeeCmdb(["support", "admin"])).toBe(true);
    for (const r of ["finance", "sales", "project_manager"] as const) {
      expect(canSeeCmdb([r])).toBe(false);
    }
    expect(canSeeCmdb([])).toBe(false);
    expect(canSeeCmdb(undefined)).toBe(false);
    // and the nav guard hides /cmdb for roles outside admin | technician
    expect(canSeeFeature("cmdb", ["admin"])).toBe(true);
    expect(canSeeFeature("cmdb", ["support"])).toBe(true);
    expect(canSeeFeature("cmdb", ["sales"])).toBe(false);
  });

  test("canSeeConnectors is admin-only (#416 — connector catalog matches the Settings gate)", () => {
    expect(canSeeConnectors(["admin"])).toBe(true);
    expect(canSeeConnectors(["support", "admin"])).toBe(true);
    for (const r of ["finance", "sales", "project_manager", "support"] as const) {
      expect(canSeeConnectors([r])).toBe(false);
    }
    expect(canSeeConnectors([])).toBe(false);
    expect(canSeeConnectors(undefined)).toBe(false);
  });

  test("the consolidated Connections nav (#864) is admin-only", () => {
    // /connectors + the Company-credentials tab folded into /settings/connections,
    // which now collects credentials so it carries the Settings gate.
    expect(canSeeFeature("settings-connections", ["admin"])).toBe(true);
    expect(canSeeFeature("settings-connections", ["support"])).toBe(false);
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

  test("collections / AR-dunning is the finance gate — finance∨admin (#677)", () => {
    // collections:read GUI twin — admin and finance only (AR work), like contracts.
    expect(canSeeCollections(["admin"])).toBe(true);
    expect(canSeeCollections(["finance"])).toBe(true);
    for (const r of ["sales", "project_manager", "support"] as const) {
      expect(canSeeCollections([r])).toBe(false);
    }
    expect(canSeeCollections(undefined)).toBe(false);
    // The nav guard hides the worklist (#678) for the same roles.
    expect(canSeeFeature("collections", ["finance"])).toBe(true);
    expect(canSeeFeature("collections", ["support"])).toBe(false);
  });
});

describe("nav group guards + role labels (#794, ADR-0030)", () => {
  // Expected group visibility per the #794 permission matrix.
  const matrix: Record<
    string,
    { guard: (r: readonly AppRole[]) => boolean; roles: AppRole[] }
  > = {
    "grp-marketing": { guard: canSeeMarketing, roles: ["admin", "sales"] },
    "grp-sales": { guard: canSeeSales, roles: ["admin", "sales"] },
    "grp-projects": { guard: canSeeProjects, roles: ["admin", "project_manager"] },
    "grp-service": { guard: canSeeService, roles: ["admin", "support"] },
    "grp-finance": { guard: canSeeFinance, roles: ["admin", "finance"] },
  };

  const allRoles: AppRole[] = [
    "admin",
    "finance",
    "sales",
    "project_manager",
    "support",
  ];

  test("each MID group is visible to exactly the matrix roles (hide-entirely)", () => {
    for (const [key, { guard, roles }] of Object.entries(matrix)) {
      for (const r of allRoles) {
        const expected = roles.includes(r);
        expect(guard([r])).toBe(expected);
        expect(canSeeFeature(key, [r])).toBe(expected);
      }
    }
  });

  test("Top + Employee groups are visible to every role", () => {
    for (const r of allRoles) {
      expect(canSeeFeature("dashboard", [r])).toBe(true);
      expect(canSeeFeature("timesheets", [r])).toBe(true);
      expect(canSeeFeature("expenses", [r])).toBe(true);
      // Employee group header carries no guard → visible to all.
      expect(canSeeFeature("grp-employee", [r])).toBe(true);
    }
  });

  test("Board + Settings groups are admin-only", () => {
    expect(canSeeFeature("grp-settings", ["admin"])).toBe(true);
    expect(canSeeFeature("board", ["admin"])).toBe(true);
    for (const r of ["finance", "sales", "project_manager", "support"] as const) {
      expect(canSeeFeature("grp-settings", [r])).toBe(false);
      expect(canSeeFeature("board", [r])).toBe(false);
    }
  });

  test("per-domain Reports leaves ride their domain group gate", () => {
    expect(canSeeFeature("report-marketing", ["sales"])).toBe(true);
    expect(canSeeFeature("report-sales", ["sales"])).toBe(true);
    expect(canSeeFeature("report-projects", ["project_manager"])).toBe(true);
    expect(canSeeFeature("report-service", ["support"])).toBe(true);
    expect(canSeeFeature("report-finance", ["finance"])).toBe(true);
    // Expense analytics (#492) is comp-adjacent — rides the finance gate.
    expect(canSeeFeature("report-expense", ["finance"])).toBe(true);
    expect(canSeeFeature("report-expense", ["admin"])).toBe(true);
    // A technician sees only the service report among the reports.
    expect(canSeeFeature("report-marketing", ["support"])).toBe(false);
    expect(canSeeFeature("report-finance", ["support"])).toBe(false);
    expect(canSeeFeature("report-expense", ["support"])).toBe(false);
    expect(canSeeFeature("report-expense", ["sales"])).toBe(false);
  });

  test("the default role surfaces as the 'Technician' label (key stays support)", () => {
    expect(DEFAULT_ROLE).toBe("support");
    expect(roleLabel("support")).toBe("Technician");
    expect(roleLabel("admin")).toBe("Admin");
    expect(roleLabel("project_manager")).toBe("Project Manager");
    expect(roleLabel("unknown")).toBe("unknown");
  });
});
