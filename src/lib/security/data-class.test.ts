import { describe, expect, it } from "vitest";

import {
  actionWithinCeiling,
  ALWAYS_GATE_CLASSES,
  DATA_CLASSES,
  DEFAULT_ROLE_CLASS_GRANTS,
  isAlwaysGate,
  isDataClass,
  permittedClassesForRoles,
  type DataClass,
} from "./data-class";

/**
 * data_class — the third access axis (#1034, agentic-OS contract). These tests pin the
 * ACTION-PLANE ceiling (the FE mirror of the SQL `app_data_class_allowed()`); the READ axis is a
 * DB property verified live (docs/testing/rls-access-spine.md). The cross-class matrix below is
 * the acceptance criterion: a technician (support) cannot invoke a Financial-class action, etc.
 */

describe("data_class taxonomy", () => {
  it("is the 5 coarse classes", () => {
    expect(DATA_CLASSES).toEqual([
      "operational",
      "financial",
      "people_hr",
      "security_credentials",
      "client_pii",
    ]);
  });

  it("isDataClass narrows known classes and rejects unknown", () => {
    expect(isDataClass("financial")).toBe(true);
    expect(isDataClass("nonsense")).toBe(false);
    expect(isDataClass("")).toBe(false);
  });

  it("always-gate = money + credentials + customer-facing (the #1036 hard ceiling)", () => {
    expect([...ALWAYS_GATE_CLASSES].sort()).toEqual(
      ["client_pii", "financial", "security_credentials"].sort(),
    );
    expect(isAlwaysGate("financial")).toBe(true);
    expect(isAlwaysGate("client_pii")).toBe(true);
    expect(isAlwaysGate("security_credentials")).toBe(true);
    expect(isAlwaysGate("operational")).toBe(false);
    expect(isAlwaysGate("people_hr")).toBe(false);
    expect(isAlwaysGate("unknown")).toBe(false);
  });
});

describe("permittedClassesForRoles", () => {
  it("admin reaches every class", () => {
    const allowed = permittedClassesForRoles(["admin"]);
    for (const cls of DATA_CLASSES) expect(allowed.has(cls)).toBe(true);
  });

  it("finance adds financial but not people_hr or security_credentials", () => {
    const allowed = permittedClassesForRoles(["finance"]);
    expect(allowed.has("financial")).toBe(true);
    expect(allowed.has("operational")).toBe(true);
    expect(allowed.has("people_hr")).toBe(false);
    expect(allowed.has("security_credentials")).toBe(false);
  });

  it("support (technician) gets only operational + client_pii", () => {
    const allowed = permittedClassesForRoles(["support"]);
    expect([...allowed].sort()).toEqual(["client_pii", "operational"].sort());
  });

  it("unions across multiple roles", () => {
    const allowed = permittedClassesForRoles(["finance", "security"]);
    expect(allowed.has("financial")).toBe(true);
    expect(allowed.has("security_credentials")).toBe(true);
    expect(allowed.has("people_hr")).toBe(false);
  });

  it("fail-closed: no roles → no classes", () => {
    expect(permittedClassesForRoles([]).size).toBe(0);
  });

  it("fail-closed: an unknown role grants nothing", () => {
    expect(permittedClassesForRoles(["wat"]).size).toBe(0);
  });

  it("honors an explicit live grant map over the default", () => {
    const live: Record<string, DataClass[]> = { support: ["operational"] };
    const allowed = permittedClassesForRoles(["support"], live);
    expect(allowed.has("client_pii")).toBe(false); // tightened by the live map
    expect(allowed.has("operational")).toBe(true);
  });
});

describe("actionWithinCeiling — the cross-class action matrix (#1034 acceptance)", () => {
  const support = permittedClassesForRoles(["support"]); // a technician
  const finance = permittedClassesForRoles(["finance"]);
  const admin = permittedClassesForRoles(["admin"]);

  it("a technician CANNOT invoke a Financial-class action", () => {
    expect(actionWithinCeiling("financial", support)).toBe(false);
  });

  it("a technician CANNOT invoke a People-HR or Security-credentials action", () => {
    expect(actionWithinCeiling("people_hr", support)).toBe(false);
    expect(actionWithinCeiling("security_credentials", support)).toBe(false);
  });

  it("a technician CAN invoke an Operational-class action", () => {
    expect(actionWithinCeiling("operational", support)).toBe(true);
  });

  it("finance CAN invoke a Financial-class action but NOT a Security-credentials action", () => {
    expect(actionWithinCeiling("financial", finance)).toBe(true);
    expect(actionWithinCeiling("security_credentials", finance)).toBe(false);
  });

  it("admin can invoke every class", () => {
    for (const cls of DATA_CLASSES) expect(actionWithinCeiling(cls, admin)).toBe(true);
  });

  it("fail-closed: an unknown action class is never within any ceiling", () => {
    expect(actionWithinCeiling("nonsense", admin)).toBe(false);
  });

  it("the default grant map keeps client_pii broad-read but classes still gate actions", () => {
    // ADR-0100: client data is broad-read in v1; every role's default map includes client_pii.
    expect(DEFAULT_ROLE_CLASS_GRANTS.support).toContain("client_pii");
    // …but the action ceiling still refuses the always-gate financial class for a technician.
    expect(actionWithinCeiling("financial", support)).toBe(false);
  });
});
