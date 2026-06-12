import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — saved-view visibility/ownership rules (#92,
// ADR-0046) are exercised against a fake pg pool (SQL shape + row mapping).
// Same pattern as posture-reads.test.ts / tenant-mapping.test.ts.
const { query, getPool } = vi.hoisted(() => ({
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [] }),
  ),
  getPool: vi.fn((): unknown => ({ query })),
}));
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { postgresRepositories } from "./postgres-repositories";

const engagements = postgresRepositories.engagements;

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query });
  query.mockResolvedValue({ rows: [] });
});

describe("saved-view visibility (#92 — personal vs company-shared, ADR-0046)", () => {
  it("a viewer sees their own views plus company-shared ones, mine first", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "v1", entity_type: "ticket", name: "My escalations", owner: "Ada",
          is_mine: true, is_shared: false, is_default: true, filters: { status: "open" },
        },
        {
          id: "v2", entity_type: "ticket", name: "Company P1s", owner: "Grace",
          is_mine: false, is_shared: true, is_default: false, filters: null,
        },
      ],
    });
    const rows = await engagements.listSavedViews("ticket", "ada@imperionllc.com");

    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    // THE visibility rule: shared OR mine — nothing else ever leaves the DB.
    expect(sql).toContain("(v.is_shared OR u.email = $2)");
    // Mine sort first so personal views lead the chip row.
    expect(sql).toContain("ORDER BY COALESCE(u.email = $2, false) DESC");
    expect(params).toEqual(["ticket", "ada@imperionllc.com"]);

    expect(rows[0]).toEqual({
      id: "v1", entityType: "ticket", name: "My escalations", owner: "Ada",
      isMine: true, isShared: false, isDefault: true, filters: { status: "open" },
    });
    expect(rows[1]).toMatchObject({ id: "v2", isMine: false, isShared: true, filters: {} });
  });

  it("createSavedView upserts by (owner, entity, name) and clears the previous default first", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: "u-1" }] }) // app_user lookup
      .mockResolvedValue({ rows: [] });
    await engagements.createSavedView(
      {
        entityType: "ticket",
        name: "Mine",
        isShared: false,
        isDefault: true,
        filters: { days: "30" },
      },
      "ada@imperionllc.com",
    );
    const calls = query.mock.calls.map((c) => String(c[0]));
    expect(calls[1]).toContain("SET is_default = false");
    expect(calls[2]).toContain("ON CONFLICT (owner_user_id, entity_type, name) DO UPDATE");
  });

  it("updateSavedView renames/sets default ONLY for the owner — enforcement is in the WHERE", async () => {
    await engagements.updateSavedView("v1", { name: "Renamed", isDefault: true }, "ada@imperionllc.com");
    const calls = query.mock.calls.map((c) => [String(c[0]), c[1]] as [string, unknown[]]);
    // Setting default clears the owner's previous default for the entity first…
    expect(calls[0][0]).toContain("SET is_default = false");
    expect(calls[0][0]).toContain("owner_user_id =");
    // …then the patch itself is ownership-scoped: non-owners update 0 rows.
    expect(calls[1][0]).toContain("WHERE id = $1");
    expect(calls[1][0]).toContain("owner_user_id =");
    expect(calls[1][1]).toEqual(["v1", "ada@imperionllc.com", "Renamed", true]);
  });

  it("updateSavedView without isDefault skips the default-clearing write", async () => {
    await engagements.updateSavedView("v1", { name: "Just a rename" }, "ada@imperionllc.com");
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0])).toContain("COALESCE($3, name)");
  });

  it("deleteSavedView lets owners delete their own and admins delete any", async () => {
    await engagements.deleteSavedView("v1", "ada@imperionllc.com", false);
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("($3 OR owner_user_id =");
    expect(params).toEqual(["v1", "ada@imperionllc.com", false]);

    await engagements.deleteSavedView("v2", "admin@imperionllc.com", true);
    expect((query.mock.calls[1] as unknown as [string, unknown[]])[1]).toEqual([
      "v2",
      "admin@imperionllc.com",
      true,
    ]);
  });
});
