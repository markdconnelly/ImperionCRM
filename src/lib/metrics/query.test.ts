import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pins the agent + BI metric query interface (#1115, epic #1050): the SINGLE read path so an
 * agent and BI resolve identical numbers. The load-bearing assertions are the security ones —
 * the data_class read gate (#1034) refuses an out-of-ceiling metric WITHOUT a backend call, and
 * the FE never sends SQL (only a key + sanitized temporal params). The DB read, the backend
 * resolve, and the request identity are all mocked — the unit under test is pure logic.
 */

vi.mock("server-only", () => ({}));

const { lookup, withIdentity, requestIdentity, ServiceNotConfiguredError, ServiceCallError } =
  vi.hoisted(() => {
    class ServiceNotConfiguredError extends Error {}
    class ServiceCallError extends Error {
      constructor(
        name: string,
        public status: number,
        body: string,
      ) {
        super(`${name} returned ${status}: ${body}`);
      }
    }
    return {
      lookup: vi.fn(),
      withIdentity: vi.fn(),
      requestIdentity: vi.fn(),
      ServiceNotConfiguredError,
      ServiceCallError,
    };
  });

vi.mock("@/lib/services", () => ({ metricsService: { lookup } }));
vi.mock("@/lib/services/external-client", () => ({ ServiceNotConfiguredError, ServiceCallError }));
vi.mock("@/lib/db/identity", () => ({ withIdentity }));
vi.mock("@/lib/auth/request-identity", () => ({ requestIdentity }));

import {
  sanitizeParams,
  queryMetric,
  listGovernedMetrics,
  permittedClassesForCaller,
} from "./query";
import type { DataClass } from "@/lib/security/data-class";

/** A metric_definition row as the DB read returns it. */
function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    key: "open_tickets",
    name: "Open Tickets",
    description: "current backlog",
    grain: "point_in_time",
    unit: "count",
    expression: "SELECT COUNT(*) AS value FROM ticket WHERE closed_at IS NULL",
    owner: "service-delivery",
    data_class: "operational",
    ...overrides,
  };
}

/** Make `withIdentity(identity, fn)` run `fn` against a fake client returning `rows`. */
function dbReturns(rows: unknown[] | null) {
  withIdentity.mockImplementation(async (_identity: unknown, fn?: (c: unknown) => Promise<unknown>) => {
    if (rows === null) return null; // mock mode
    const client = { query: vi.fn(async () => ({ rows })) };
    return fn ? fn(client) : null;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requestIdentity.mockResolvedValue({ userId: "u1", groups: ["support"] });
  lookup.mockResolvedValue({
    key: "open_tickets",
    name: "Open Tickets",
    value: 7,
    unit: "count",
    grain: "point_in_time",
    asOf: "2026-06-23T00:00:00.000Z",
    dataClass: "operational",
    status: "ok",
  });
});

describe("sanitizeParams", () => {
  it("keeps only well-formed YYYY-MM-DD temporal params", () => {
    expect(sanitizeParams({ period_start: "2026-06-01", period: "nope" })).toEqual({
      period_start: "2026-06-01",
    });
  });
  it("returns undefined when nothing valid remains", () => {
    expect(sanitizeParams({ period: "bad" })).toBeUndefined();
    expect(sanitizeParams(undefined)).toBeUndefined();
  });
});

describe("permittedClassesForCaller", () => {
  it("maps a support role to operational + client_pii (fail-closed default map)", async () => {
    const set = await permittedClassesForCaller(["support"]);
    expect(set.has("operational")).toBe(true);
    expect(set.has("financial")).toBe(false);
  });
  it("permits no class for a role-less caller", async () => {
    expect((await permittedClassesForCaller([])).size).toBe(0);
  });
});

describe("listGovernedMetrics", () => {
  it("filters the catalog to the caller's data_class ceiling", async () => {
    dbReturns([
      row(),
      row({ key: "new_business_mrr", data_class: "financial", expression: "SELECT 1 AS value" }),
    ]);
    const list = await listGovernedMetrics(); // support → operational only
    expect(list.map((m) => m.key)).toEqual(["open_tickets"]);
    expect(list[0].bound).toBe(true);
  });

  it("marks an unbound (non-SELECT fragment) definition as bound:false", async () => {
    dbReturns([row({ key: "mrr", expression: "SUM(x) FROM contract" })]);
    const list = await listGovernedMetrics();
    expect(list[0].bound).toBe(false);
  });

  it("degrades to an empty catalog in mock mode", async () => {
    dbReturns(null);
    expect(await listGovernedMetrics()).toEqual([]);
  });
});

describe("queryMetric — the data_class read gate runs BEFORE the backend call", () => {
  const ALL: ReadonlySet<DataClass> = new Set<DataClass>(["operational", "financial"]);

  it("rejects an invalid key without touching the DB or backend", async () => {
    const r = await queryMetric("BadKey!");
    expect(r.status).toBe("not_found");
    expect(withIdentity).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("returns not_found for an absent/inactive metric", async () => {
    dbReturns([]); // getGovernedMetric → no row
    const r = await queryMetric("open_tickets", undefined, ALL);
    expect(r.status).toBe("not_found");
    expect(lookup).not.toHaveBeenCalled();
  });

  it("FORBIDS an out-of-ceiling class WITHOUT calling the backend engine", async () => {
    dbReturns([row({ data_class: "financial" })]);
    const r = await queryMetric("open_tickets", undefined, new Set<DataClass>(["operational"]));
    expect(r.status).toBe("forbidden");
    expect(r.value).toBeNull();
    expect(lookup).not.toHaveBeenCalled(); // the gate short-circuits the value evaluation
  });

  it("resolves the value through the backend when the class is permitted", async () => {
    dbReturns([row()]);
    const r = await queryMetric("open_tickets", { period_start: "2026-06-01" }, ALL);
    expect(r.status).toBe("ok");
    expect(r.value).toBe(7);
    expect(lookup).toHaveBeenCalledWith("open_tickets", { period_start: "2026-06-01" });
  });

  it("forwards only the metric key + sanitized params — never SQL", async () => {
    dbReturns([row()]);
    await queryMetric("open_tickets", { period: "DROP TABLE x" as string }, ALL);
    // the bad param is dropped; lookup is called with no params object
    expect(lookup).toHaveBeenCalledWith("open_tickets", undefined);
  });

  it("maps a not-configured backend to status not_configured", async () => {
    dbReturns([row()]);
    lookup.mockRejectedValueOnce(new ServiceNotConfiguredError("Metric query engine"));
    const r = await queryMetric("open_tickets", undefined, ALL);
    expect(r.status).toBe("not_configured");
    expect(r.value).toBeNull();
  });

  it("maps a backend HTTP error to status error", async () => {
    dbReturns([row()]);
    lookup.mockRejectedValueOnce(new ServiceCallError("Metric query engine", 502, "bad"));
    const r = await queryMetric("open_tickets", undefined, ALL);
    expect(r.status).toBe("error");
  });
});
