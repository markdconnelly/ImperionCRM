import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the sprint SQL shape + row mapping + the
// closeSprint carry-over transaction (ADR-0069 D4, #349) are exercised against a
// fake pg pool. Same pattern as status-def.test.ts.
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

describe("sprints / backlog (ADR-0069 D4, #349)", () => {
  it("listSprints reads from sprint with its task rollup and maps to SprintRow", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "sp1",
          name: "Sprint 7",
          project_id: "pr1",
          project: "Acme onboarding",
          starts_at: new Date("2026-06-15T00:00:00Z"),
          ends_at: new Date("2026-06-29T00:00:00Z"),
          status: "active",
          task_count: "5",
          done_count: "2",
        },
      ],
    });
    const out = await crm.listSprints();
    const [sql] = query.mock.calls[0];
    expect(sql).toMatch(/FROM sprint/);
    expect(sql).toMatch(/sprint_id = s\.id/); // the rollup lateral
    expect(out).toEqual([
      {
        id: "sp1",
        name: "Sprint 7",
        projectId: "pr1",
        project: "Acme onboarding",
        startsAt: "2026-06-15",
        endsAt: "2026-06-29",
        status: "active",
        taskCount: 5,
        doneCount: 2,
      },
    ]);
  });

  it("createSprint inserts the editable fields in order", async () => {
    await crm.createSprint({
      name: "Sprint 8",
      projectId: null,
      startsAt: "2026-07-01",
      endsAt: null,
      status: "planned",
    });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO sprint/);
    expect(params).toEqual(["Sprint 8", null, "2026-07-01", null, "planned"]);
  });

  it("listBacklogTasks reads only un-sprinted, open, top-level tasks", async () => {
    await crm.listBacklogTasks();
    const [sql] = query.mock.calls[0];
    expect(sql).toMatch(/sprint_id IS NULL/);
    expect(sql).toMatch(/parent_task_id IS NULL/);
    expect(sql).toMatch(/status <> 'done'/);
  });

  it("setTaskSprint commits a task to a sprint (or NULL = backlog)", async () => {
    await crm.setTaskSprint("t1", "sp1");
    expect(query.mock.calls[0][1]).toEqual(["t1", "sp1"]);
    await crm.setTaskSprint("t2", null);
    expect(query.mock.calls[1][1]).toEqual(["t2", null]);
  });

  it("closeSprint carries open tasks forward then marks completed, in a transaction", async () => {
    // The carry-over UPDATE reports 3 still-open tasks moved.
    clientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 3 }) // carry-over UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // status UPDATE
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const moved = await crm.closeSprint("sp1");
    expect(moved).toBe(3);
    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls[0]).toBe("BEGIN");
    // Carry-over: only not-done tasks of this sprint, targeting the next planned sprint in scope.
    expect(sqls[1]).toMatch(/UPDATE task/);
    expect(sqls[1]).toMatch(/status <> 'done'/);
    expect(sqls[1]).toMatch(/status = 'planned'/);
    expect(sqls[2]).toMatch(/UPDATE sprint SET status = 'completed'/);
    expect(sqls[3]).toBe("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });
});
