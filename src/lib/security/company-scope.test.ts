import { describe, expect, it } from "vitest";

import {
  COMPANY_ROLE_SLUGS,
  COMPANY_SCOPED_RECORD_ROLES,
  rolesInScope,
} from "./company-scope";

/**
 * Company / role axis (#979, ADR-0105 §3a). These tests pin the FE mirror of the SQL
 * `app_role_in_scope()` predicate; the READ axis itself is a DB property verified live
 * (docs/testing/rls-access-spine.md). The cross-role matrix below is the acceptance
 * criterion: a technician (support) is NOT in scope for the finance+admin gate; finance and
 * admin are.
 */

describe("company role vocabulary", () => {
  it("is the app.groups slug set", () => {
    expect([...COMPANY_ROLE_SLUGS].sort()).toEqual(
      ["admin", "finance", "hr", "project_manager", "sales", "security", "support"].sort(),
    );
  });

  it("the first gated surface allows exactly finance + admin (mirrors migration 0186)", () => {
    expect([...COMPANY_SCOPED_RECORD_ROLES].sort()).toEqual(["admin", "finance"].sort());
  });
});

describe("rolesInScope", () => {
  it("a finance caller is in scope for the finance+admin gate", () => {
    expect(rolesInScope(["finance"], COMPANY_SCOPED_RECORD_ROLES)).toBe(true);
  });

  it("an admin caller is in scope", () => {
    expect(rolesInScope(["admin"], COMPANY_SCOPED_RECORD_ROLES)).toBe(true);
  });

  it("a technician (support) is NOT in scope — the acceptance criterion", () => {
    expect(rolesInScope(["support"], COMPANY_SCOPED_RECORD_ROLES)).toBe(false);
  });

  it("sales / project_manager / hr / security are not in scope for finance+admin", () => {
    expect(rolesInScope(["sales"], COMPANY_SCOPED_RECORD_ROLES)).toBe(false);
    expect(rolesInScope(["project_manager"], COMPANY_SCOPED_RECORD_ROLES)).toBe(false);
    expect(rolesInScope(["hr"], COMPANY_SCOPED_RECORD_ROLES)).toBe(false);
    expect(rolesInScope(["security"], COMPANY_SCOPED_RECORD_ROLES)).toBe(false);
  });

  it("a caller holding multiple roles is in scope if ANY intersects (union)", () => {
    expect(rolesInScope(["support", "finance"], COMPANY_SCOPED_RECORD_ROLES)).toBe(true);
  });

  it("fail-closed: no roles → never in scope (mirrors '{}' && allowed → FALSE)", () => {
    expect(rolesInScope([], COMPANY_SCOPED_RECORD_ROLES)).toBe(false);
  });

  it("an unknown slug never matches", () => {
    expect(rolesInScope(["nonsense"], COMPANY_SCOPED_RECORD_ROLES)).toBe(false);
  });
});
