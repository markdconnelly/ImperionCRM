import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the task_recurrence SQL shape + row mapping + the
// advanceTaskRecurrence spawn/stop transaction (ADR-0070 E2, #353) are exercised
// against a fake pg pool. Same pattern as sprint.test.ts.
const { query, clientQuery, release, connect, getPool } = vi.hoisted(() => {
  const query = vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>>(
    async () => ({ rows: [], rowCount: 0 }),
  );
  const clientQuery = vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>>(
    async () => ({ rows: [], rowCount: 0 }),
  );
  const release = vi.fn();
  const connect = vi.fn(async () => ({ query: clientQuery, release }));
  return { query, clientQuery, release, connect, getPool: vi.fn((): unknown => ({ query, connect })) };
});
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { postgresRepositories } from "./postgres-repositories";

const crm = postgresRepositories.crm;

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query, connect });
  query.mockResolvedValue({ rows: [], rowCount: 0 });
  clientQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe("recurring tasks (ADR-0070 E2, #353)", () => {
  it("getTaskRecurrence reads the series by task_id and maps to TaskRecurrenceRow", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "rec1",
          task_id: "t1",
          rule: "FREQ=WEEKLY;INTERVAL=1",
          next_run_at: new Date("2026-06-22T00:00:00Z"),
          ends_at: null,
          count_remaining: null,
        },
      ],
    });
    const out = await crm.getTaskRecurrence("t1");
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/FROM task_recurrence WHERE task_id = \$1/);
    expect(params).toEqual(["t1"]);
    expect(out).toEqual({
      id: "rec1",
      taskId: "t1",
      rule: "FREQ=WEEKLY;INTERVAL=1",
      nextRunAt: "2026-06-22",
      endsAt: null,
      countRemaining: null,
    });
  });

  it("getTaskRecurrence returns null when the task has no series", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await crm.getTaskRecurrence("t1")).toBeNull();
  });

  it("upsertTaskRecurrence inserts ON CONFLICT(task_id) DO UPDATE (edit in place)", async () => {
    await crm.upsertTaskRecurrence({
      taskId: "t1",
      rule: "FREQ=WEEKLY;INTERVAL=2",
      nextRunAt: "2026-06-29",
      endsAt: null,
      countRemaining: 3,
    });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO task_recurrence/);
    expect(sql).toMatch(/ON CONFLICT \(task_id\) DO UPDATE/);
    expect(params).toEqual(["t1", "FREQ=WEEKLY;INTERVAL=2", "2026-06-29", null, 3]);
  });

  it("clearTaskRecurrence deletes the series", async () => {
    await crm.clearTaskRecurrence("t1");
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM task_recurrence WHERE task_id = \$1/);
    expect(params).toEqual(["t1"]);
  });

  it("advanceTaskRecurrence no-ops (returns null) when the task owns no series", async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // SELECT … FOR UPDATE → none
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const out = await crm.advanceTaskRecurrence("t1");
    expect(out).toBeNull();
    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls[1]).toMatch(/FROM task_recurrence WHERE task_id = \$1 FOR UPDATE/);
    expect(sqls[2]).toBe("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });

  it("advanceTaskRecurrence spawns the next instance and re-points the series", async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: "rec1",
            rule: "FREQ=WEEKLY;INTERVAL=1",
            next_run_at: new Date("2026-06-22T00:00:00Z"),
            ends_at: null,
            count_remaining: null,
          },
        ],
      }) // SELECT … FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ id: "t2" }] }) // INSERT new task RETURNING id
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE task_recurrence re-point
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const out = await crm.advanceTaskRecurrence("t1");
    expect(out).toBe("t2");
    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls[2]).toMatch(/INSERT INTO task/);
    expect(sqls[2]).toMatch(/'open'/); // status resets
    // Re-point to the spawned task, advancing one week → 2026-06-29.
    expect(sqls[3]).toMatch(/UPDATE task_recurrence/);
    const repointParams = clientQuery.mock.calls[3][1];
    expect(repointParams).toEqual(["rec1", "t2", "2026-06-29", null]);
    expect(sqls[4]).toBe("COMMIT");
  });

  it("advanceTaskRecurrence deletes the series after the final counted occurrence", async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: "rec1",
            rule: "FREQ=WEEKLY;INTERVAL=1",
            next_run_at: new Date("2026-06-22T00:00:00Z"),
            ends_at: null,
            count_remaining: 1, // last spawn
          },
        ],
      }) // SELECT … FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ id: "t2" }] }) // INSERT
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE task_recurrence
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const out = await crm.advanceTaskRecurrence("t1");
    expect(out).toBe("t2"); // the final instance is still spawned
    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls[3]).toMatch(/DELETE FROM task_recurrence WHERE id = \$1/);
    expect(clientQuery.mock.calls[3][1]).toEqual(["rec1"]);
  });

  it("advanceTaskRecurrence stops (deletes, no spawn) once next_run_at passes ends_at", async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: "rec1",
            rule: "FREQ=WEEKLY;INTERVAL=1",
            next_run_at: new Date("2026-07-01T00:00:00Z"),
            ends_at: new Date("2026-06-30T00:00:00Z"), // already past
            count_remaining: null,
          },
        ],
      }) // SELECT … FOR UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE task_recurrence
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const out = await crm.advanceTaskRecurrence("t1");
    expect(out).toBeNull();
    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    // No INSERT — the second statement after SELECT is the DELETE.
    expect(sqls.some((s) => /INSERT INTO task/.test(s))).toBe(false);
    expect(sqls[2]).toMatch(/DELETE FROM task_recurrence WHERE id = \$1/);
    expect(sqls[3]).toBe("COMMIT");
  });
});
