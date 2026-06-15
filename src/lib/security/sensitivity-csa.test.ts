import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam (same pattern as posture-reads.test.ts) — the
// account-scoped sensitivity-label + custom-security-attribute reads (#259) are
// exercised against a fake pg pool, a null pool, and a schema-lag error.
const { query, getPool } = vi.hoisted(() => ({
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [] }),
  ),
  getPool: vi.fn((): unknown => ({ query })),
}));
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({})); // Next.js marker module — inert under vitest

import {
  benchmarkCustomAttributes,
  listSensitivityCsaForAccount,
  STANDARD_CSA_SET,
} from "./sensitivity-csa";

describe("benchmarkCustomAttributes (#259 — ADR-0051 golden-baseline)", () => {
  it("splits the standard set into present/missing case-insensitively, ignoring attribute set", () => {
    const b = benchmarkCustomAttributes([
      { name: "dataclassification" }, // case-folded match
      { name: "OwnerTeam" },
      { name: "SomethingExtra" }, // not in the standard — ignored
    ]);
    expect(b.present.sort()).toEqual(["DataClassification", "OwnerTeam"]);
    expect(b.missing).toEqual(["Environment", "Confidentiality"]);
    expect(b.coverage).toBeCloseTo(2 / STANDARD_CSA_SET.length);
  });

  it("full coverage when every standard attribute is present", () => {
    const b = benchmarkCustomAttributes(STANDARD_CSA_SET.map((name) => ({ name })));
    expect(b.missing).toEqual([]);
    expect(b.coverage).toBe(1);
  });

  it("zero coverage on no observed attributes", () => {
    const b = benchmarkCustomAttributes([]);
    expect(b.present).toEqual([]);
    expect(b.coverage).toBe(0);
  });

  it("empty standard set is vacuously fully covered", () => {
    expect(benchmarkCustomAttributes([], []).coverage).toBe(1);
  });
});

describe("listSensitivityCsaForAccount (#259)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPool.mockReturnValue({ query });
    query.mockResolvedValue({ rows: [] });
  });

  it("returns empty arrays when no pool is configured (local/demo)", async () => {
    getPool.mockReturnValue(null);
    await expect(listSensitivityCsaForAccount("acc-1")).resolves.toEqual({
      labels: [],
      attributes: [],
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("maps bronze text columns into typed rows (priority int, is_active bool, date slice)", async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            tenant_id: "t-1",
            label_id: "lbl-conf",
            name: "Confidential",
            priority: "2",
            is_active: "true",
            collected_at: "2026-06-14T03:00:00Z",
          },
          {
            tenant_id: "t-1",
            label_id: "lbl-x",
            name: "Public",
            priority: "",
            is_active: "false",
            collected_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            tenant_id: "t-1",
            attribute_set: "Governance",
            name: "DataClassification",
            data_type: "String",
            status: "Available",
            collected_at: "2026-06-14T03:00:00Z",
          },
        ],
      });

    const out = await listSensitivityCsaForAccount("acc-1");
    expect(out.labels[0]).toEqual({
      tenantId: "t-1",
      labelId: "lbl-conf",
      name: "Confidential",
      priority: 2,
      isActive: true,
      collectedAt: "2026-06-14",
    });
    expect(out.labels[1]).toMatchObject({ priority: null, isActive: false, collectedAt: null });
    expect(out.attributes[0]).toEqual({
      tenantId: "t-1",
      attributeSet: "Governance",
      name: "DataClassification",
      dataType: "String",
      status: "Available",
      collectedAt: "2026-06-14",
    });
  });

  it("schema-lag (undefined_table) on either feed degrades that feed to empty, not a throw", async () => {
    const lag = Object.assign(new Error("relation does not exist"), { code: "42P01" });
    query.mockRejectedValueOnce(lag).mockResolvedValueOnce({
      rows: [
        {
          tenant_id: "t-1",
          attribute_set: "Governance",
          name: "OwnerTeam",
          data_type: "String",
          status: "Available",
          collected_at: null,
        },
      ],
    });
    const out = await listSensitivityCsaForAccount("acc-1");
    expect(out.labels).toEqual([]);
    expect(out.attributes).toHaveLength(1);
  });

  it("a real (non-schema-lag) error still propagates — never silently masked", async () => {
    const outage = Object.assign(new Error("connection terminated"), { code: "57P01" });
    query.mockRejectedValueOnce(outage);
    await expect(listSensitivityCsaForAccount("acc-1")).rejects.toThrow("connection terminated");
  });
});
