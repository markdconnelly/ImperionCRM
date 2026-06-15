import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — work comments + activity feed (ADR-0064 A1,
// #330) are exercised against a fake pg pool (SQL shape + row mapping + the
// author/admin authorization predicate). Same pattern as saved-views.test.ts.
// deleteComment uses a pooled client (BEGIN/COMMIT) so the fake exposes connect().
const { query, clientQuery, getPool } = vi.hoisted(() => {
  const clientQuery =
    vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(async () => ({
      rows: [],
    }));
  const query = vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [] }),
  );
  const client = { query: clientQuery, release: vi.fn() };
  return {
    query,
    clientQuery,
    getPool: vi.fn((): unknown => ({ query, connect: async () => client })),
  };
});
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { postgresRepositories } from "./postgres-repositories";

const work = postgresRepositories.work;

beforeEach(() => {
  vi.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
  clientQuery.mockResolvedValue({ rows: [] });
});

describe("work comments + activity feed (ADR-0064 A1, #330)", () => {
  it("listComments reads only live rows for the object, oldest-first, with the author join", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "c1", parent_type: "project", parent_id: "p1",
          author_user_id: "u1", author: "Ada", body: "first",
          edited_at: null, created_at: "2026-06-14T00:00:00Z",
        },
      ],
    });
    const rows = await work.listComments("project", "p1");

    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("deleted_at IS NULL"); // soft-deletes never surface
    expect(sql).toContain("ORDER BY c.created_at ASC");
    expect(sql).toContain("LEFT JOIN app_user u"); // resolves display name
    expect(params).toEqual(["project", "p1"]);
    expect(rows[0]).toEqual({
      id: "c1", parentType: "project", parentId: "p1", authorUserId: "u1",
      author: "Ada", body: "first", editedAt: null, createdAt: "2026-06-14T00:00:00Z",
    });
  });

  it("listActivity reads the feed view newest-first and honors the comments-only filter", async () => {
    await work.listActivity("project", "p1", { commentsOnly: true, limit: 25, offset: 0 });
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("FROM work_activity_feed"); // the comments ∪ events view
    expect(sql).toContain("ORDER BY f.occurred_at DESC");
    // The A1 filter: commentsOnly=true drops the 'event' rows.
    expect(sql).toContain("($3::boolean IS FALSE OR f.kind = 'comment')");
    expect(params).toEqual(["project", "p1", true, 25, 0]);
  });

  it("listActivity clamps limit/offset into safe bounds", async () => {
    await work.listActivity("task", "t1", { limit: 9999, offset: -5 });
    const params = (query.mock.calls[0] as unknown as [string, unknown[]])[1];
    expect(params[3]).toBe(200); // limit capped
    expect(params[4]).toBe(0); // offset floored
  });

  it("addComment inserts and returns the mapped row with the author name", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "c9", parent_type: "task", parent_id: "t1", author_user_id: "u2",
          author: "Grace", body: "looks good", edited_at: null, created_at: "2026-06-14T01:00:00Z",
        },
      ],
    });
    const row = await work.addComment({
      parentType: "task", parentId: "t1", authorUserId: "u2", body: "looks good",
    });
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("INSERT INTO work_comment");
    expect(params).toEqual(["task", "t1", "u2", "looks good"]);
    expect(row).toMatchObject({ id: "c9", author: "Grace", parentType: "task" });
  });

  it("editComment is author-scoped unless admin (the WHERE carries the predicate)", async () => {
    await work.editComment("c1", "edited body", "u1", false);
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("SET body = $2, edited_at = now()");
    expect(sql).toContain("($4::boolean IS TRUE OR author_user_id = $3::uuid)");
    expect(sql).toContain("deleted_at IS NULL"); // can't edit a deleted comment
    expect(params).toEqual(["c1", "edited body", "u1", false]);
  });

  it("editComment returns null when no row matched (not author / not found)", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await work.editComment("c1", "x", "intruder", false)).toBeNull();
  });

  it("deleteComment soft-deletes, writes an audit_log record, and commits", async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ parent_type: "project", parent_id: "p1" }] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] }) // INSERT audit_log
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const ok = await work.deleteComment("c1", "u1", false);
    expect(ok).toBe(true);

    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls[0]).toContain("BEGIN");
    expect(sqls[1]).toContain("SET deleted_at = now()"); // soft-delete, retains audit (NFR-2)
    expect(sqls[1]).toContain("($3::boolean IS TRUE OR author_user_id = $2::uuid)");
    expect(sqls[2]).toContain("INSERT INTO audit_log");
    expect(sqls[2]).toContain("'comment.deleted'"); // acceptance: delete leaves an audit record
    expect(sqls[3]).toContain("COMMIT");
  });

  it("deleteComment rolls back and returns false when nothing was deleted", async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // UPDATE matched nothing
    const ok = await work.deleteComment("c1", "intruder", false);
    expect(ok).toBe(false);
    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls[sqls.length - 1]).toContain("ROLLBACK");
  });
});
