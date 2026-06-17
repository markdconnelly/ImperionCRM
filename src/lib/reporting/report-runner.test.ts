import { describe, expect, it } from "vitest";
import { runReport, MAX_DETAIL_ROWS, type ReportRow } from "./report-runner";
import type { ReportSelection } from "./semantic-model";

/**
 * Unit tests for the pure report runner (ADR-0075 §4, #411). The runner shapes a
 * curated row set per a validated selection — detail projection vs grouped
 * aggregation, filters, and the honest detail-row cap (ADR-0075 §5). Rows are keyed
 * by `opportunity` registry field keys so labels resolve from the real registry.
 */
const oppRows: ReportRow[] = [
  { name: "Acme MSA", account: "Acme", stage: "qualified", dealValue: 1000, winProbability: 0.5, weighted: 500 },
  { name: "Acme Add-on", account: "Acme", stage: "proposal", dealValue: 2000, winProbability: 0.8, weighted: 1600 },
  { name: "Globex MSA", account: "Globex", stage: "qualified", dealValue: 3000, winProbability: 0.4, weighted: 1200 },
];

describe("runReport — detail mode", () => {
  it("projects selected fields, one row per source row, no aggregation", () => {
    const sel: ReportSelection = {
      root_object: "opportunity",
      fields: [
        { field: "name", aggregation: "none" },
        { field: "dealValue", aggregation: "none" },
      ],
    };
    const res = runReport(sel, oppRows);
    expect(res.rowCount).toBe(3);
    expect(res.columns.map((c) => c.key)).toEqual(["name", "dealValue"]);
    expect(res.columns.find((c) => c.key === "dealValue")?.numeric).toBe(true);
    expect(res.rows[0]).toEqual({ name: "Acme MSA", dealValue: 1000 });
    expect(res.truncated).toBe(false);
  });

  it("caps detail rows at MAX_DETAIL_ROWS and flags truncation", () => {
    const many: ReportRow[] = Array.from({ length: MAX_DETAIL_ROWS + 5 }, (_, i) => ({
      name: `Deal ${i}`,
      dealValue: i,
    }));
    const sel: ReportSelection = {
      root_object: "opportunity",
      fields: [{ field: "name", aggregation: "none" }],
    };
    const res = runReport(sel, many);
    expect(res.rowCount).toBe(MAX_DETAIL_ROWS);
    expect(res.sourceCount).toBe(MAX_DETAIL_ROWS + 5);
    expect(res.truncated).toBe(true);
  });
});

describe("runReport — aggregate mode", () => {
  it("groups by a dimension and sums a measure", () => {
    const sel: ReportSelection = {
      root_object: "opportunity",
      fields: [
        { field: "account", aggregation: "none" },
        { field: "dealValue", aggregation: "sum" },
      ],
      group_by: ["account"],
    };
    const res = runReport(sel, oppRows);
    expect(res.rowCount).toBe(2); // Acme + Globex
    const acme = res.rows.find((r) => r.account === "Acme");
    expect(acme?.dealValue__sum).toBe(3000);
    const globex = res.rows.find((r) => r.account === "Globex");
    expect(globex?.dealValue__sum).toBe(3000);
    // First measure descending → Acme/Globex tie keeps both; sum column is numeric.
    expect(res.columns.map((c) => c.key)).toEqual(["account", "dealValue__sum"]);
  });

  it("computes count / avg / min / max", () => {
    const sel: ReportSelection = {
      root_object: "opportunity",
      fields: [
        { field: "stage", aggregation: "none" },
        { field: "dealValue", aggregation: "avg" },
        { field: "weighted", aggregation: "max" },
        { field: "name", aggregation: "count" },
      ],
      group_by: ["stage"],
    };
    const res = runReport(sel, oppRows);
    const qualified = res.rows.find((r) => r.stage === "qualified");
    expect(qualified?.dealValue__avg).toBe(2000); // (1000 + 3000) / 2
    expect(qualified?.weighted__max).toBe(1200);
    expect(qualified?.name__count).toBe(2);
  });

  it("produces a single grand-total bucket when a measure is chosen without group_by", () => {
    const sel: ReportSelection = {
      root_object: "opportunity",
      fields: [{ field: "dealValue", aggregation: "sum" }],
    };
    const res = runReport(sel, oppRows);
    expect(res.rowCount).toBe(1);
    expect(res.rows[0].dealValue__sum).toBe(6000);
  });
});

describe("runReport — filters", () => {
  it("applies a contains filter on a selected field before aggregating", () => {
    const sel: ReportSelection = {
      root_object: "opportunity",
      fields: [
        { field: "account", aggregation: "none" },
        { field: "dealValue", aggregation: "sum" },
      ],
      group_by: ["account"],
    };
    const res = runReport(sel, oppRows, [{ field: "account", op: "contains", value: "acme" }]);
    expect(res.rowCount).toBe(1);
    expect(res.rows[0].account).toBe("Acme");
    expect(res.rows[0].dealValue__sum).toBe(3000);
  });

  it("applies a numeric gt filter", () => {
    const sel: ReportSelection = {
      root_object: "opportunity",
      fields: [
        { field: "name", aggregation: "none" },
        { field: "dealValue", aggregation: "none" },
      ],
    };
    const res = runReport(sel, oppRows, [{ field: "dealValue", op: "gt", value: "1500" }]);
    expect(res.rowCount).toBe(2);
    expect(res.rows.every((r) => (r.dealValue as number) > 1500)).toBe(true);
  });

  it("ignores a filter on a field that is not selected", () => {
    const sel: ReportSelection = {
      root_object: "opportunity",
      fields: [{ field: "name", aggregation: "none" }],
    };
    const res = runReport(sel, oppRows, [{ field: "stage", op: "eq", value: "qualified" }]);
    expect(res.rowCount).toBe(3); // filter on unselected field is a no-op
  });
});

/**
 * Query-cost guardrails (ADR-0075 §5, #413). `ticket` is a `requiresFilter` object in the
 * registry, so an unfiltered DETAIL scan is blocked; `opportunity` is not, so it runs freely.
 * Aggregate reports are always exempt from the gate. Rows keyed by `ticket` field keys.
 */
const ticketRows: ReportRow[] = [
  { number: "T-1", title: "VPN down", account: "Acme", status: "open", priority: "high", opened: "2026-06-01" },
  { number: "T-2", title: "Slow email", account: "Acme", status: "closed", priority: "low", opened: "2026-06-02" },
  { number: "T-3", title: "New laptop", account: "Globex", status: "open", priority: "medium", opened: "2026-06-03" },
];

describe("runReport — query-cost guardrails (#413)", () => {
  it("blocks an unfiltered detail report on a requiresFilter object without scanning", () => {
    const sel: ReportSelection = {
      root_object: "ticket",
      fields: [
        { field: "number", aggregation: "none" },
        { field: "title", aggregation: "none" },
      ],
    };
    const res = runReport(sel, ticketRows);
    expect(res.guardrail.requiresFilter).toBe(true);
    expect(res.guardrail.blockedReason).toContain("must include at least one filter");
    expect(res.rows).toHaveLength(0);
    expect(res.rowCount).toBe(0);
    expect(res.sourceCount).toBe(0); // proves it never scanned
    expect(res.columns.map((c) => c.key)).toEqual(["number", "title"]); // intended shape still shown
  });

  it("runs a detail report on a requiresFilter object once a filter on a selected field is present", () => {
    const sel: ReportSelection = {
      root_object: "ticket",
      fields: [
        { field: "account", aggregation: "none" },
        { field: "status", aggregation: "none" },
      ],
    };
    const res = runReport(sel, ticketRows, [{ field: "account", op: "eq", value: "Acme" }]);
    expect(res.guardrail.blockedReason).toBeNull();
    expect(res.rowCount).toBe(2);
    expect(res.rows.every((r) => r.account === "Acme")).toBe(true);
  });

  it("still blocks when the only filter targets an unselected field (not an effective filter)", () => {
    const sel: ReportSelection = {
      root_object: "ticket",
      fields: [{ field: "number", aggregation: "none" }],
    };
    // Filter is on `status`, which is not in the selection → not effective → gate still trips.
    const res = runReport(sel, ticketRows, [{ field: "status", op: "eq", value: "open" }]);
    expect(res.guardrail.blockedReason).not.toBeNull();
    expect(res.rowCount).toBe(0);
  });

  it("exempts aggregate reports on a requiresFilter object from the gate", () => {
    const sel: ReportSelection = {
      root_object: "ticket",
      fields: [
        { field: "status", aggregation: "none" },
        { field: "number", aggregation: "count" },
      ],
      group_by: ["status"],
    };
    const res = runReport(sel, ticketRows); // no filter — still allowed (collapses to buckets)
    expect(res.guardrail.blockedReason).toBeNull();
    expect(res.rowCount).toBe(2); // open + closed
    expect(res.rows.find((r) => r.status === "open")?.number__count).toBe(2);
  });

  it("reports an unfiltered, non-gated object freely with default cap and no block", () => {
    const sel: ReportSelection = {
      root_object: "opportunity",
      fields: [{ field: "name", aggregation: "none" }],
    };
    const res = runReport(sel, oppRows);
    expect(res.guardrail.requiresFilter).toBe(false);
    expect(res.guardrail.maxDetailRows).toBe(MAX_DETAIL_ROWS);
    expect(res.guardrail.blockedReason).toBeNull();
    expect(res.rowCount).toBe(3);
  });
});
