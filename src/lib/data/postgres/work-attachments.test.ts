import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — work attachments (ADR-0064 A4, #333) are
// exercised against a fake pg pool (SQL shape + row mapping + the uploader/admin
// authorization predicate). Same pattern as work-comments.test.ts.
// removeAttachment uses a pooled client (BEGIN/COMMIT) so the fake exposes connect().
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

const attachments = postgresRepositories.attachments;

beforeEach(() => {
  vi.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
  clientQuery.mockResolvedValue({ rows: [] });
});

describe("work attachments (ADR-0064 A4, #333)", () => {
  it("listAttachments reads only live rows for the object, newest-first, with the uploader join", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "a1", parent_type: "task", parent_id: "t1",
          storage_ref: "pending:task/t1/spec.pdf", filename: "spec.pdf",
          content_type: "application/pdf", size_bytes: "2048",
          uploaded_by: "u1", uploaded_by_name: "Ada", created_at: "2026-06-15T00:00:00Z",
        },
      ],
    });
    const rows = await attachments.listAttachments("task", "t1");

    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("FROM work_attachment");
    expect(sql).toContain("deleted_at IS NULL"); // soft-deletes never surface
    expect(sql).toContain("ORDER BY a.created_at DESC");
    expect(sql).toContain("LEFT JOIN app_user u"); // resolves uploader display name
    expect(params).toEqual(["task", "t1"]);
    expect(rows[0]).toEqual({
      id: "a1", parentType: "task", parentId: "t1",
      storageRef: "pending:task/t1/spec.pdf", filename: "spec.pdf",
      contentType: "application/pdf", sizeBytes: 2048,
      uploadedByUserId: "u1", uploadedBy: "Ada", createdAt: "2026-06-15T00:00:00Z",
    });
  });

  it("addAttachment inserts the metadata and returns the mapped row", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "a9", parent_type: "project", parent_id: "p1",
          storage_ref: "pending:project/p1/plan.docx", filename: "plan.docx",
          content_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size_bytes: "4096", uploaded_by: "u2", uploaded_by_name: "Grace",
          created_at: "2026-06-15T01:00:00Z",
        },
      ],
    });
    const row = await attachments.addAttachment({
      parentType: "project", parentId: "p1",
      storageRef: "pending:project/p1/plan.docx", filename: "plan.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 4096, uploadedByUserId: "u2",
    });
    const [sql] = query.mock.calls[0] as unknown as [string];
    expect(sql).toContain("INSERT INTO work_attachment");
    expect(row).toMatchObject({ id: "a9", filename: "plan.docx", sizeBytes: 4096, uploadedBy: "Grace" });
  });

  it("removeAttachment soft-deletes, writes an attachment.removed audit record, and commits", async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ parent_type: "task", parent_id: "t1", filename: "spec.pdf" }] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] }) // INSERT audit_log
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const ok = await attachments.removeAttachment("a1", "u1", false);
    expect(ok).toBe(true);

    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls[0]).toContain("BEGIN");
    expect(sqls[1]).toContain("SET deleted_at = now()"); // soft-delete, retains audit (NFR-2)
    expect(sqls[1]).toContain("($3::boolean IS TRUE OR uploaded_by = $2::uuid)"); // uploader/admin scope
    expect(sqls[2]).toContain("INSERT INTO audit_log");
    expect(sqls[2]).toContain("'attachment.removed'"); // acceptance: removal audited + emits event
    expect(sqls[3]).toContain("COMMIT");
  });

  it("removeAttachment rolls back and returns false when nothing was removed", async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // UPDATE matched nothing (not uploader / not found)
    const ok = await attachments.removeAttachment("a1", "intruder", false);
    expect(ok).toBe(false);
    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls[sqls.length - 1]).toContain("ROLLBACK");
  });
});
