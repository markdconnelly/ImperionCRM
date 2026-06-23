import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * company_scoped_record data layer (#979, ADR-0105 §3a). Pins that reads/writes route
 * through withIdentity (so the company/role RLS policy applies), that the SELECT relies on
 * RLS rather than a role WHERE clause, and that the transaction carries app.groups. Actual
 * RLS enforcement is a DB property (docs/testing/rls-access-spine.md); these pin the WIRING.
 * Mocks the pool seam (same style as personal-note.test.ts) so the real withIdentity
 * transaction runs.
 */
const { connect, clientQuery, getPool } = vi.hoisted(() => {
  const clientQuery =
    vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(async () => ({
      rows: [],
    }));
  const release = vi.fn();
  const connect = vi.fn(async () => ({ query: clientQuery, release }));
  const getPool = vi.fn((): unknown => ({ connect }));
  return { connect, clientQuery, release, getPool };
});
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { createCompanyScopedRecord, listCompanyScopedRecords } from "./company-scoped-record";

const IDENTITY = { userId: null, groups: ["finance"] };

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ connect });
  clientQuery.mockResolvedValue({ rows: [] });
});

describe("listCompanyScopedRecords", () => {
  it("runs inside a withIdentity transaction that sets app.groups", async () => {
    await listCompanyScopedRecords(IDENTITY);
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(sqls.some((s) => s.includes("app.groups"))).toBe(true);
  });

  it("the SELECT relies on RLS — no role/app.groups WHERE clause", async () => {
    await listCompanyScopedRecords(IDENTITY);
    const select = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("FROM company_scoped_record"),
    )![0] as string;
    expect(select).not.toMatch(/where/i);
    expect(select).not.toContain("app.groups");
  });

  it("maps rows to the CompanyScopedRecord shape", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM company_scoped_record")) {
        return {
          rows: [{ id: "r1", label: "q4-comp", created_at: "2026-06-23", updated_at: "2026-06-23" }],
        };
      }
      return { rows: [] };
    });
    const records = await listCompanyScopedRecords(IDENTITY);
    expect(records).toEqual([
      { id: "r1", label: "q4-comp", createdAt: "2026-06-23", updatedAt: "2026-06-23" },
    ]);
  });

  it("returns [] in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    expect(await listCompanyScopedRecords(IDENTITY)).toEqual([]);
    expect(connect).not.toHaveBeenCalled();
  });
});

describe("createCompanyScopedRecord", () => {
  it("INSERTs the label and relies on the policy WITH CHECK for the gate", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO company_scoped_record")) {
        return { rows: [{ id: "r1", label: "x", created_at: "t", updated_at: "t" }] };
      }
      return { rows: [] };
    });
    const rec = await createCompanyScopedRecord(IDENTITY, "x");
    const insert = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("INSERT INTO company_scoped_record"),
    )!;
    expect(insert[0] as string).not.toMatch(/where/i); // gate is the policy, not a clause
    expect((insert[1] as unknown[])[0]).toBe("x");
    expect(rec).toEqual({ id: "r1", label: "x", createdAt: "t", updatedAt: "t" });
  });

  it("returns null in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    expect(await createCompanyScopedRecord(IDENTITY, "x")).toBeNull();
    expect(connect).not.toHaveBeenCalled();
  });
});
