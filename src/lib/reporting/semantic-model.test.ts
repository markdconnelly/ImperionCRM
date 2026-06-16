import { describe, expect, test } from "vitest";
import type { AppRole } from "@/lib/auth/roles";
import {
  SEMANTIC_MODEL,
  getReportableObject,
  listReportableObjects,
  reportableFields,
  isFieldAllowed,
  allowedAggregations,
  validateReportSelection,
} from "@/lib/reporting/semantic-model";

const SUPPORT: AppRole[] = ["support"];
const SALES: AppRole[] = ["sales"];
const FINANCE: AppRole[] = ["finance"];
const ADMIN: AppRole[] = ["admin"];

describe("registry shape", () => {
  test("declares the v1 core objects with stable keys", () => {
    expect(SEMANTIC_MODEL.map((o) => o.key).sort()).toEqual([
      "account",
      "campaign",
      "contact",
      "opportunity",
      "ticket",
    ]);
  });

  test("every field includes `none` in its aggregations and a known grant", () => {
    for (const obj of SEMANTIC_MODEL) {
      expect(obj.fields.length).toBeGreaterThan(0);
      for (const f of obj.fields) {
        expect(f.aggregations).toContain("none");
        expect([null, "revenue", "labor_cost"]).toContain(f.grant);
      }
    }
  });

  test("getReportableObject resolves known keys, rejects unknown", () => {
    expect(getReportableObject("account")?.label).toBe("Account");
    expect(getReportableObject("nope")).toBeUndefined();
  });
});

describe("RBAC filtering — build-time enforcement", () => {
  test("a support-only user cannot see the revenue-gated MRR field on account", () => {
    const keys = reportableFields("account", SUPPORT).map((f) => f.key);
    expect(keys).not.toContain("mrr");
    expect(keys).toContain("name"); // broadly readable survives
  });

  test("a sales user CAN see the revenue-gated fields (canSeeRevenue)", () => {
    expect(reportableFields("account", SALES).map((f) => f.key)).toContain("mrr");
    expect(reportableFields("opportunity", SALES).map((f) => f.key)).toContain("dealValue");
    expect(reportableFields("campaign", SALES).map((f) => f.key)).toContain("budget");
  });

  test("admin sees every field", () => {
    for (const obj of SEMANTIC_MODEL) {
      expect(reportableFields(obj.key, ADMIN)).toHaveLength(obj.fields.length);
    }
  });

  test("isFieldAllowed mirrors reportableFields per field", () => {
    expect(isFieldAllowed("account", "mrr", SUPPORT)).toBe(false);
    expect(isFieldAllowed("account", "mrr", SALES)).toBe(true);
    expect(isFieldAllowed("account", "mrr", FINANCE)).toBe(true);
    // unknown object / field → false
    expect(isFieldAllowed("nope", "mrr", ADMIN)).toBe(false);
    expect(isFieldAllowed("account", "nope", ADMIN)).toBe(false);
  });

  test("listReportableObjects returns all v1 objects for any role (each has a readable field)", () => {
    expect(listReportableObjects(SUPPORT).map((o) => o.key).sort()).toEqual(
      SEMANTIC_MODEL.map((o) => o.key).sort(),
    );
  });
});

describe("allowedAggregations", () => {
  test("currency measures allow sum/avg, dimensions only count", () => {
    expect(allowedAggregations("account", "mrr")).toContain("sum");
    expect(allowedAggregations("account", "name")).toEqual(["none", "count"]);
  });
  test("unknown object/field → empty", () => {
    expect(allowedAggregations("nope", "x")).toEqual([]);
    expect(allowedAggregations("account", "x")).toEqual([]);
  });
});

describe("validateReportSelection — the build+run seam", () => {
  test("unknown root_object is rejected with no selection", () => {
    const r = validateReportSelection({ root_object: "nope", fields: [] }, ADMIN);
    expect(r.ok).toBe(false);
    expect(r.selection).toBeNull();
    expect(r.rejections[0].kind).toBe("unknown_object");
  });

  test("strips a revenue-gated field for a support-only author (run-time strip)", () => {
    const r = validateReportSelection(
      {
        root_object: "account",
        fields: [
          { field: "name", aggregation: "none" },
          { field: "mrr", aggregation: "sum" },
        ],
      },
      SUPPORT,
    );
    expect(r.ok).toBe(false); // a forbidden field was dropped
    expect(r.selection?.fields.map((f) => f.field)).toEqual(["name"]);
    expect(r.rejections.some((x) => x.kind === "forbidden_field")).toBe(true);
  });

  test("the same selection is fully valid for sales (keeps mrr)", () => {
    const r = validateReportSelection(
      {
        root_object: "account",
        fields: [
          { field: "name", aggregation: "none" },
          { field: "mrr", aggregation: "sum" },
        ],
        group_by: ["name"],
      },
      SALES,
    );
    expect(r.ok).toBe(true);
    expect(r.selection?.fields).toHaveLength(2);
    expect(r.selection?.group_by).toEqual(["name"]);
    expect(r.rejections).toHaveLength(0);
  });

  test("rejects an aggregation not declared for the field", () => {
    const r = validateReportSelection(
      { root_object: "account", fields: [{ field: "name", aggregation: "sum" }] },
      ADMIN,
    );
    expect(r.ok).toBe(false);
    expect(r.rejections[0].kind).toBe("invalid_aggregation");
    expect(r.selection?.fields).toHaveLength(0);
  });

  test("rejects an unknown field", () => {
    const r = validateReportSelection(
      { root_object: "account", fields: [{ field: "ssn", aggregation: "none" }] },
      ADMIN,
    );
    expect(r.ok).toBe(false);
    expect(r.rejections[0].kind).toBe("unknown_field");
  });

  test("group_by that is not a surviving selected field is rejected", () => {
    // mrr is stripped for support, so a group_by on mrr cannot survive
    const r = validateReportSelection(
      {
        root_object: "account",
        fields: [{ field: "mrr", aggregation: "sum" }],
        group_by: ["mrr"],
      },
      SUPPORT,
    );
    expect(r.ok).toBe(false);
    expect(r.selection?.group_by).toBeUndefined();
    expect(r.rejections.some((x) => x.kind === "unknown_group_by")).toBe(true);
  });
});
