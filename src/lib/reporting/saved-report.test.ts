import { describe, expect, it } from "vitest";
import { selectionFromDefinition, filtersFromDefinition, type StoredReport } from "./saved-report";

/**
 * Unit tests for the pure saved-report → runnable-selection conversions (ADR-0075,
 * #412) — what a dashboard tile uses to turn a persisted `report_definition` row
 * (jsonb fields/groupBy/filters) back into a runner selection + filters.
 */
const stored: StoredReport = {
  rootObject: "opportunity",
  fields: [
    { field: "account", aggregation: "none" },
    { field: "dealValue", aggregation: "sum" },
  ],
  groupBy: ["account"],
  filters: { clauses: [{ field: "account", op: "contains", value: "acme" }] },
};

describe("selectionFromDefinition", () => {
  it("reconstructs root object, fields, and group_by", () => {
    const sel = selectionFromDefinition(stored);
    expect(sel.root_object).toBe("opportunity");
    expect(sel.fields).toHaveLength(2);
    expect(sel.group_by).toEqual(["account"]);
  });

  it("omits group_by when none was stored", () => {
    const sel = selectionFromDefinition({ ...stored, groupBy: [] });
    expect(sel.group_by).toBeUndefined();
  });

  it("tolerates empty/absent jsonb fields", () => {
    const sel = selectionFromDefinition({
      rootObject: "account",
      fields: [],
      groupBy: [],
      filters: {},
    });
    expect(sel.fields).toEqual([]);
    expect(sel.group_by).toBeUndefined();
  });
});

describe("filtersFromDefinition", () => {
  it("extracts the stored filter clauses", () => {
    expect(filtersFromDefinition(stored)).toEqual([
      { field: "account", op: "contains", value: "acme" },
    ]);
  });

  it("returns [] when filters has no clauses", () => {
    expect(filtersFromDefinition({ ...stored, filters: {} })).toEqual([]);
  });
});
