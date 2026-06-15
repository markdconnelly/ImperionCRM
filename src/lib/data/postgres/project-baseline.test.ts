import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the project_baseline SQL shape + the
// planned-vs-actual slippage computation (ADR-0069 D6, #351) are exercised
// against a fake pg pool. Same pattern as sprint.test.ts.
const { query, getPool } = vi.hoisted(() => {
  const query = vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>>(
    async () => ({ rows: [], rowCount: 0 }),
  );
  return { query, getPool: vi.fn((): unknown => ({ query })) };
});
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { postgresRepositories } from "./postgres-repositories";

const crm = postgresRepositories.crm;

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query });
  query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe("baselines / planned-vs-actual (ADR-0069 D6, #351)", () => {
  it("listProjectBaselines reads from project_baseline newest-first and maps the snapshot", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "b1",
          captured_at: new Date("2026-06-15T12:00:00Z"),
          planned_dates: {
            targetLiveDate: "2026-07-01",
            status: "in_progress",
            tasks: [
              { id: "t1", title: "Cutover", dueAt: "2026-06-20" },
              { id: "t2", title: "Handoff", dueAt: null },
            ],
          },
        },
      ],
    });
    const out = await crm.listProjectBaselines("pr1");
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/FROM project_baseline/);
    expect(sql).toMatch(/ORDER BY captured_at DESC/);
    expect(params).toEqual(["pr1"]);
    expect(out).toEqual([
      { id: "b1", capturedAt: "2026-06-15 12:00", plannedTargetLive: "2026-07-01", taskCount: 2 },
    ]);
  });

  it("captureProjectBaseline freezes target go-live + task due dates into a jsonb snapshot", async () => {
    await crm.captureProjectBaseline("pr1");
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO project_baseline/);
    expect(sql).toMatch(/jsonb_build_object/);
    expect(sql).toMatch(/'targetLiveDate'/);
    expect(sql).toMatch(/FROM task t WHERE t\.project_id = p\.id/);
    expect(params).toEqual(["pr1"]);
  });

  it("getProjectSlippage shows +14d when a project completes two weeks past its baseline (the #351 acceptance)", async () => {
    // Latest baseline: planned go-live 2026-07-01; project completed 2026-07-15.
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "b1",
          captured_at: new Date("2026-06-15T12:00:00Z"),
          planned_dates: {
            targetLiveDate: "2026-07-01",
            status: "in_progress",
            tasks: [{ id: "t1", title: "Cutover", dueAt: "2026-06-20" }],
          },
          status: "complete",
          completed_at: new Date("2026-07-15T00:00:00Z"),
        },
      ],
    });
    // Current dues for the snapshotted tasks: t1 slipped 5 days (06-20 → 06-25).
    query.mockResolvedValueOnce({
      rows: [{ id: "t1", due_at: new Date("2026-06-25T00:00:00Z") }],
    });

    const out = await crm.getProjectSlippage("pr1");
    expect(out?.isComplete).toBe(true);
    expect(out?.plannedTargetLive).toBe("2026-07-01");
    expect(out?.actual).toBe("2026-07-15");
    expect(out?.slippageDays).toBe(14); // +14d late — the acceptance
    expect(out?.tasks).toEqual([
      {
        id: "t1",
        title: "Cutover",
        plannedDue: "2026-06-20",
        currentDue: "2026-06-25",
        slippageDays: 5,
        exists: true,
      },
    ]);
  });

  it("getProjectSlippage leaves slippageDays null while the project is in flight", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "b1",
          captured_at: new Date("2026-06-15T12:00:00Z"),
          planned_dates: { targetLiveDate: "2026-07-01", status: "in_progress", tasks: [] },
          status: "in_progress",
          completed_at: null,
        },
      ],
    });
    const out = await crm.getProjectSlippage("pr1");
    expect(out?.isComplete).toBe(false);
    expect(out?.actual).toBeNull();
    expect(out?.slippageDays).toBeNull();
    expect(out?.tasks).toEqual([]);
    // No tasks in the snapshot → no second (current-dues) query.
    expect(query).toHaveBeenCalledOnce();
  });

  it("getProjectSlippage returns null when the project has no baseline", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await crm.getProjectSlippage("pr1")).toBeNull();
  });
});
