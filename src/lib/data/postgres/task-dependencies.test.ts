import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the task_dependency SQL shape, row mapping, the
// blocked-flag derivation, and the cycle guard (ADR-0065 B2, #336) are exercised
// against a fake pg pool. Same pattern as tags.test.ts / work-comments.test.ts.
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

const crm = postgresRepositories.crm;

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query, connect });
  query.mockResolvedValue({ rows: [], rowCount: 0 });
  client.query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe("task dependencies (ADR-0065 B2, #336)", () => {
  it("getTaskDependencies splits predecessors/successors and flags blocked on an open predecessor", async () => {
    // First query = predecessors (blocked-by); second = successors (blocks).
    query
      .mockResolvedValueOnce({
        rows: [{ task_id: "p1", title: "Design", status: "open", type: "blocks" }],
      })
      .mockResolvedValueOnce({
        rows: [{ task_id: "s1", title: "Ship", status: "open", type: "blocks" }],
      });
    const out = await crm.getTaskDependencies("t1");
    expect(out.blockedBy).toEqual([{ taskId: "p1", title: "Design", status: "open", type: "blocks" }]);
    expect(out.blocks).toEqual([{ taskId: "s1", title: "Ship", status: "open", type: "blocks" }]);
    // An open predecessor = an unmet blocker.
    expect(out.blocked).toBe(true);
  });

  it("getTaskDependencies is not blocked when every predecessor is done", async () => {
    query
      .mockResolvedValueOnce({
        rows: [{ task_id: "p1", title: "Design", status: "done", type: "blocks" }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const out = await crm.getTaskDependencies("t1");
    expect(out.blocked).toBe(false);
  });

  it("addTaskDependency rejects a self-link without touching the DB", async () => {
    const ok = await crm.addTaskDependency("t1", "t1");
    expect(ok).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it("addTaskDependency refuses a link that would close a cycle", async () => {
    // Cycle-check query reports the prospective predecessor is reachable.
    query.mockResolvedValueOnce({ rows: [{ cycles: true }] });
    const ok = await crm.addTaskDependency("a", "b");
    expect(ok).toBe(false);
    // Only the cycle check ran — no INSERT.
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatch(/RECURSIVE reachable/);
  });

  it("addTaskDependency inserts ON CONFLICT DO NOTHING when no cycle", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ cycles: false }] }) // cycle check
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // insert
    const ok = await crm.addTaskDependency("a", "b");
    expect(ok).toBe(true);
    const [sql, params] = query.mock.calls[1];
    expect(sql).toMatch(/INSERT INTO task_dependency/);
    expect(sql).toMatch(/ON CONFLICT \(predecessor_id, successor_id, type\) DO NOTHING/);
    expect(params).toEqual(["a", "b"]);
  });

  it("removeTaskDependency reports whether a row was deleted", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    expect(await crm.removeTaskDependency("a", "b")).toBe(true);
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await crm.removeTaskDependency("a", "b")).toBe(false);
  });

  it("listBlockedProjectTasks maps {id,name} for open tasks with unmet blockers", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: "x", name: "Cutover" }] });
    const out = await crm.listBlockedProjectTasks("proj-1");
    expect(out).toEqual([{ id: "x", name: "Cutover" }]);
    expect(query.mock.calls[0][0]).toMatch(/EXISTS/);
  });
});
