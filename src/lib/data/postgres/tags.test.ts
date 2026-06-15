import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the tags vocabulary + polymorphic application
// SQL shape and row mapping (ADR-0065 B6, #340) are exercised against a fake pg
// pool. Same pattern as saved-views.test.ts / work-comments.test.ts.
const { query, connect, client, getPool } = vi.hoisted(() => {
  const client = {
    query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>>(
      async () => ({ rows: [], rowCount: 0 }),
    ),
    release: vi.fn(),
  };
  const query = vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>>(
    async () => ({ rows: [], rowCount: 0 }),
  );
  const connect = vi.fn(async () => client);
  return {
    client,
    query,
    connect,
    getPool: vi.fn((): unknown => ({ query, connect })),
  };
});
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { postgresRepositories } from "./postgres-repositories";

const tags = postgresRepositories.tags;

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query, connect });
  query.mockResolvedValue({ rows: [], rowCount: 0 });
  client.query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe("tags repository (ADR-0065 B6, #340)", () => {
  it("listTags maps rows with usage counts, label-sorted", async () => {
    query.mockResolvedValueOnce({
      rows: [
        { id: "t1", label: "urgent", color: "red", usage_count: "3" },
        { id: "t2", label: "waiting", color: "amber", usage_count: "0" },
      ],
    });
    const out = await tags.listTags();
    expect(out).toEqual([
      { id: "t1", label: "urgent", color: "red", usageCount: 3 },
      { id: "t2", label: "waiting", color: "amber", usageCount: 0 },
    ]);
    expect(query.mock.calls[0][0]).toMatch(/ORDER BY lower\(t\.label\)/);
  });

  it("upsertTag is idempotent via ON CONFLICT on lower(label)", async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: "t1", label: "Urgent", color: "red", usage_count: "0" }],
    });
    const tag = await tags.upsertTag("  Urgent  ", "red", "u1");
    expect(tag).toEqual({ id: "t1", label: "Urgent", color: "red", usageCount: 0 });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/ON CONFLICT \(lower\(label\)\)/);
    expect(params).toEqual(["Urgent", "red", "u1"]); // trimmed
  });

  it("renameTag surfaces a unique-violation as null (label taken)", async () => {
    query.mockRejectedValueOnce({ code: "23505" });
    expect(await tags.renameTag("t1", "urgent")).toBeNull();
  });

  it("applyTag inserts ON CONFLICT DO NOTHING (idempotent application)", async () => {
    await tags.applyTag({ tagId: "t1", parentType: "task", parentId: "task-1" });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO work_tag/);
    expect(sql).toMatch(/ON CONFLICT DO NOTHING/);
    expect(params).toEqual(["t1", "task", "task-1"]);
  });

  it("removeTag returns false when no application matched", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await tags.removeTag({ tagId: "t1", parentType: "task", parentId: "x" })).toBe(false);
  });

  it("removeTag returns true when an application was deleted", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    expect(await tags.removeTag({ tagId: "t1", parentType: "task", parentId: "task-1" })).toBe(true);
  });

  it("listTagsForMany groups applied tags by parentId", async () => {
    query.mockResolvedValueOnce({
      rows: [
        { parent_id: "task-1", id: "t1", label: "urgent", color: "red" },
        { parent_id: "task-1", id: "t2", label: "blocked", color: "amber" },
        { parent_id: "task-2", id: "t1", label: "urgent", color: "red" },
      ],
    });
    const out = await tags.listTagsForMany("task", ["task-1", "task-2"]);
    expect(out["task-1"]).toHaveLength(2);
    expect(out["task-2"]).toEqual([{ id: "t1", label: "urgent", color: "red" }]);
  });

  it("listTagsForMany short-circuits on an empty id list (no query)", async () => {
    const out = await tags.listTagsForMany("task", []);
    expect(out).toEqual({});
    expect(query).not.toHaveBeenCalled();
  });

  it("mergeTags repoints applications then deletes the source in one transaction", async () => {
    client.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 2 }) // UPDATE repoint
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE source
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT
    expect(await tags.mergeTags("src", "tgt")).toBe(true);
    const sqls = client.query.mock.calls.map((c) => String(c[0]));
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls[1]).toMatch(/UPDATE work_tag/);
    expect(sqls[2]).toMatch(/DELETE FROM tag/);
    expect(sqls[3]).toBe("COMMIT");
  });

  it("mergeTags is a no-op when source === target", async () => {
    expect(await tags.mergeTags("same", "same")).toBe(false);
    expect(connect).not.toHaveBeenCalled();
  });
});
