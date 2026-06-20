import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pins the `app_user` mirror upsert wiring for the access spine (#974): raw
 * Entra group object-ids land in `group_ids` (migration 0152), and the write
 * is a no-op in mock mode / for a claimless principal.
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

import { upsertAppUser } from "./app-user";

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query: poolQuery });
  poolQuery.mockResolvedValue({ rows: [] });
});

describe("upsertAppUser", () => {
  it("writes group_ids alongside roles", async () => {
    await upsertAppUser({
      entraObjectId: "oid-1",
      email: "a@b.com",
      displayName: "A",
      roles: ["admin"],
      groupIds: ["g-1", "g-2"],
    });
    const [sql, params] = poolQuery.mock.calls[0];
    expect(sql).toContain("group_ids");
    expect(sql).toContain("group_ids = EXCLUDED.group_ids");
    expect(params).toEqual(["oid-1", "a@b.com", "A", ["admin"], ["g-1", "g-2"]]);
  });

  it("defaults group_ids to [] when omitted (back-compat)", async () => {
    await upsertAppUser({
      entraObjectId: "oid-1",
      email: "a@b.com",
      displayName: null,
      roles: ["support"],
    });
    expect((poolQuery.mock.calls[0][1] as unknown[])[4]).toEqual([]);
  });

  it("is a no-op in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    await upsertAppUser({
      entraObjectId: "oid-1",
      email: "a@b.com",
      displayName: null,
      roles: ["support"],
      groupIds: ["g-1"],
    });
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("never throws on a DB failure (sign-in must not break)", async () => {
    poolQuery.mockRejectedValueOnce(new Error("db down"));
    await expect(
      upsertAppUser({
        entraObjectId: "oid-1",
        email: "a@b.com",
        displayName: null,
        roles: ["support"],
      }),
    ).resolves.toBeUndefined();
  });
});
