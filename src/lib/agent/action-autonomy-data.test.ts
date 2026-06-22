import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pins the FE-owned `agent_action_autonomy` data layer (#1013 / 2E-3, ADR-0109):
 * the read maps rows + derives the tier ceiling and degrades to mock/empty, and the
 * write upserts on the `(agent_key, action_class)` key and reports not-configured in
 * mock mode rather than throwing.
 */
const { poolQuery, getPool } = vi.hoisted(() => {
  const poolQuery =
    vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(async () => ({
      rows: [],
    }));
  const getPool = vi.fn((): unknown => ({ query: poolQuery }));
  return { poolQuery, getPool };
});
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { listActionAutonomyDials, upsertActionAutonomyDial } from "./action-autonomy-data";

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query: poolQuery });
  poolQuery.mockResolvedValue({ rows: [] });
});

describe("listActionAutonomyDials", () => {
  it("maps rows and derives the resolved tier ceiling", async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [
        { agent_key: "*", action_class: "*", level: 1, ceilings: {}, note: null, updated_at: "t" },
        { agent_key: "sales", action_class: "*", level: 3, ceilings: {}, note: "ok", updated_at: "t" },
      ],
    });
    const dials = await listActionAutonomyDials();
    expect(dials).toHaveLength(2);
    expect(dials[0]).toMatchObject({ agentKey: "*", level: 1, resolvedCeiling: "T0" });
    expect(dials[1]).toMatchObject({ agentKey: "sales", level: 3, resolvedCeiling: "T2", note: "ok" });
  });

  it("honors a per-row ceilings override", async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [{ agent_key: "sales", action_class: "*", level: 3, ceilings: { "3": "T1" }, note: null, updated_at: null }],
    });
    const [dial] = await listActionAutonomyDials();
    expect(dial.resolvedCeiling).toBe("T1");
  });

  it("falls back to a mock dial in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    const dials = await listActionAutonomyDials();
    expect(dials).toHaveLength(1);
    expect(dials[0].agentKey).toBe("*");
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("returns [] on a query failure (never a page error)", async () => {
    poolQuery.mockRejectedValueOnce(new Error("db down"));
    await expect(listActionAutonomyDials()).resolves.toEqual([]);
  });
});

describe("upsertActionAutonomyDial", () => {
  it("upserts on the (agent_key, action_class) conflict key", async () => {
    const out = await upsertActionAutonomyDial({ agentKey: "sales", actionClass: "*", level: 3, note: "go" });
    expect(out).toEqual({ ok: true });
    const [sql, params] = poolQuery.mock.calls[0];
    expect(sql).toContain("INSERT INTO agent_action_autonomy");
    expect(sql).toContain("ON CONFLICT (agent_key, action_class)");
    expect(sql).toContain("updated_at = now()");
    expect(params).toEqual(["sales", "*", 3, "go"]);
  });

  it("writes a null note when none is given", async () => {
    await upsertActionAutonomyDial({ agentKey: "*", actionClass: "*", level: 1 });
    expect((poolQuery.mock.calls[0][1] as unknown[])[3]).toBeNull();
  });

  it("reports not-configured in mock mode without throwing", async () => {
    getPool.mockReturnValue(null);
    const out = await upsertActionAutonomyDial({ agentKey: "sales", actionClass: "*", level: 2 });
    expect(out).toEqual({ ok: false, notConfigured: true, message: expect.any(String) });
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("reports a failure (not not-configured) on a DB error", async () => {
    poolQuery.mockRejectedValueOnce(new Error("db down"));
    const out = await upsertActionAutonomyDial({ agentKey: "sales", actionClass: "*", level: 2 });
    expect(out).toEqual({ ok: false, notConfigured: false, message: expect.any(String) });
  });
});
