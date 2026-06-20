import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Access spine slice 1 (#974, parent #967). Pins the load-bearing safety
 * property of `withIdentity`: the Entra security context is set with
 * transaction-scoped `SET LOCAL` (via `set_config(..., is_local=true)`) inside
 * an explicit BEGIN…COMMIT, so it CANNOT leak across pooled-connection reuse.
 * A `SET` without `LOCAL` on a shared pool is a cross-user data-leak bug — this
 * test exists to keep that from regressing.
 */
const { connect, clientQuery, release, getPool } = vi.hoisted(() => {
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

import { withIdentity } from "./identity";

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ connect });
  clientQuery.mockResolvedValue({ rows: [] });
});

const OID = "11111111-1111-1111-1111-111111111111";

describe("withIdentity", () => {
  it("wraps fn in BEGIN → SET LOCAL oid/groups → COMMIT", async () => {
    await withIdentity({ oid: OID, groups: ["admin", "finance"] }, async (client) => {
      await client.query("SELECT 1");
    });

    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    // The two GUCs are set before any caller query runs.
    const beginIdx = sqls.indexOf("BEGIN");
    const oidIdx = sqls.findIndex((s) => s.includes("app.oid"));
    const groupsIdx = sqls.findIndex((s) => s.includes("app.groups"));
    const callerIdx = sqls.indexOf("SELECT 1");
    expect(beginIdx).toBeLessThan(oidIdx);
    expect(oidIdx).toBeLessThan(callerIdx);
    expect(groupsIdx).toBeLessThan(callerIdx);
  });

  it("sets app.user_id (owner axis) only when userId is resolved", async () => {
    const UID = "99999999-9999-9999-9999-999999999999";
    await withIdentity({ oid: OID, groups: [], userId: UID }, async () => {});
    const userIdCall = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("app.user_id"),
    )!;
    expect(userIdCall[1]).toEqual([UID]);
    expect(userIdCall[0] as string).toMatch(/,\s*true\)\s*$/); // is_local
  });

  it("leaves app.user_id UNSET when userId is absent/null (fail-closed, never empty)", async () => {
    await withIdentity({ oid: OID, groups: [] }, async () => {});
    expect(
      clientQuery.mock.calls.find((c) => (c[0] as string).includes("app.user_id")),
    ).toBeUndefined();
    await withIdentity({ oid: OID, groups: [], userId: null }, async () => {});
    expect(
      clientQuery.mock.calls.find((c) => (c[0] as string).includes("app.user_id")),
    ).toBeUndefined();
  });

  it("sets the context with is_local=true (transaction-scoped, never leaks)", async () => {
    await withIdentity({ oid: OID, groups: ["support"] }, async () => {});

    const setCalls = clientQuery.mock.calls.filter((c) =>
      (c[0] as string).includes("set_config"),
    );
    // Both GUCs go through set_config(name, value, is_local) with is_local = true,
    // which is a statically-visible SQL literal so it can never be passed false.
    expect(setCalls).toHaveLength(2);
    for (const call of setCalls) {
      expect(call[0] as string).toMatch(/,\s*true\)\s*$/); // is_local — the pool-leak guard
    }
    // Claim values are parameterized, never string-concatenated into the SQL.
    const oidCall = setCalls.find((c) => (c[0] as string).includes("app.oid"))!;
    expect(oidCall[1]).toEqual([OID]);
  });

  it("serializes groups as a Postgres text[] literal", async () => {
    await withIdentity({ oid: OID, groups: ["admin", "finance"] }, async () => {});
    const groupsCall = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("app.groups"),
    )!;
    expect((groupsCall[1] as unknown[])[0]).toBe('{"admin","finance"}');
  });

  it("serializes empty groups as an empty array literal", async () => {
    await withIdentity({ oid: OID, groups: [] }, async () => {});
    const groupsCall = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("app.groups"),
    )!;
    expect((groupsCall[1] as unknown[])[0]).toBe("{}");
  });

  it("does NOT leak identity across two sequential pooled calls", async () => {
    const OID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const OID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    await withIdentity({ oid: OID_A, groups: ["a"] }, async () => {});
    await withIdentity({ oid: OID_B, groups: ["b"] }, async () => {});

    // Each call checks out its own client and re-issues SET LOCAL for ITS oid —
    // identity is never set once-globally on the pool.
    expect(connect).toHaveBeenCalledTimes(2);
    const oidValues = clientQuery.mock.calls
      .filter((c) => (c[0] as string).includes("app.oid"))
      .map((c) => (c[1] as unknown[])[0]);
    expect(oidValues).toEqual([OID_A, OID_B]);
    // No bare `SET ` (without LOCAL) ever reaches the connection.
    const bareSet = clientQuery.mock.calls.find((c) => /^SET\s/i.test(c[0] as string));
    expect(bareSet).toBeUndefined();
  });

  it("propagates the fn return value", async () => {
    clientQuery.mockResolvedValue({ rows: [{ n: 42 }] });
    const result = await withIdentity({ oid: OID, groups: [] }, async (client) => {
      const { rows } = await client.query<{ n: number }>("SELECT 42 AS n");
      return rows[0].n;
    });
    expect(result).toBe(42);
  });

  it("ROLLs BACK and always releases on error", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("boom")) throw new Error("boom");
      return { rows: [] };
    });
    await expect(
      withIdentity({ oid: OID, groups: [] }, async (client) => {
        await client.query("boom");
      }),
    ).rejects.toThrow("boom");
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls).toContain("ROLLBACK");
    expect(sqls).not.toContain("COMMIT");
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("returns null in mock mode (no pool) without touching a connection", async () => {
    getPool.mockReturnValue(null);
    const fn = vi.fn();
    const result = await withIdentity({ oid: OID, groups: [] }, fn);
    expect(result).toBeNull();
    expect(fn).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });
});
