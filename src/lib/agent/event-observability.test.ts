import { afterEach, describe, expect, it, vi } from "vitest";

// `server-only` is a Next.js build-time guard with no runtime export; stub it under vitest.
vi.mock("server-only", () => ({}));

// The read-side degrades on no-DB → mock rows, and on query failure → empty/zero. Mock the pool
// accessor to drive both tiers (mirrors the subscriptions / icm-runs read-side pattern).
const mocks = vi.hoisted(() => ({ getPool: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getPool: mocks.getPool }));

import {
  getDlqDepth,
  listDeadLetteredEvents,
  listRecentEventLineage,
} from "./event-observability";

afterEach(() => vi.clearAllMocks());

describe("listRecentEventLineage", () => {
  it("returns mock rows when the DB is unset", async () => {
    mocks.getPool.mockReturnValue(null);
    const rows = await listRecentEventLineage();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("runs");
  });

  it("enumerates per-event runs via the eventKey lateral join (1:N, not 1:1)", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: "evt-1",
          event_type: "autotask.ticket.created",
          source: "pipeline:webhook:autotask",
          status: "dispatched",
          attempts: 1,
          last_error: null,
          created_at: new Date("2026-06-22T09:00:00Z"),
          dispatched_at: new Date("2026-06-22T09:00:05Z"),
          dead_lettered_at: null,
          replayed_at: null,
          // Two runs fanned out from ONE event — the surface must show both.
          runs: [
            { runId: "run-tech", workflowKey: "technician", status: "succeeded", startedAt: "2026-06-22T09:00:05Z" },
            { runId: "run-vcio", workflowKey: "vcio", status: "running", startedAt: "2026-06-22T09:00:05Z" },
          ],
        },
      ],
    });
    mocks.getPool.mockReturnValue({ query });

    const rows = await listRecentEventLineage();
    // The query must join agent_run by the eventKey PREFIX, not the single run_id FK.
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("permission_scope->>'eventKey'");
    expect(sql).toContain("|| ':%'");
    expect(rows[0].runs).toHaveLength(2);
    expect(rows[0].runs.map((r) => r.workflowKey)).toEqual(["technician", "vcio"]);
  });

  it("renders an event with no runs cleanly (ignored / dead)", async () => {
    mocks.getPool.mockReturnValue({
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: "evt-2",
            event_type: "x.y.z",
            source: "pipeline",
            status: "ignored",
            attempts: 1,
            last_error: null,
            created_at: new Date(),
            dispatched_at: null,
            dead_lettered_at: null,
            replayed_at: null,
            runs: [],
          },
        ],
      }),
    });
    const rows = await listRecentEventLineage();
    expect(rows[0].runs).toEqual([]);
  });

  it("degrades to an empty list on query failure (never throws)", async () => {
    mocks.getPool.mockReturnValue({ query: vi.fn().mockRejectedValue(new Error("db down")) });
    await expect(listRecentEventLineage()).resolves.toEqual([]);
  });
});

describe("listDeadLetteredEvents", () => {
  it("returns mock dead rows when the DB is unset", async () => {
    mocks.getPool.mockReturnValue(null);
    const rows = await listDeadLetteredEvents();
    expect(rows.length).toBeGreaterThan(0);
  });

  it("selects only status='dead', newest-dead first", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: "evt-dead",
          event_type: "autotask.ticket.created",
          source: "pipeline:webhook:autotask",
          attempts: 5,
          last_error: "producer down",
          created_at: new Date(),
          dead_lettered_at: new Date(),
          replayed_at: null,
        },
      ],
    });
    mocks.getPool.mockReturnValue({ query });
    const rows = await listDeadLetteredEvents();
    expect(String(query.mock.calls[0][0])).toContain("status = 'dead'");
    expect(rows[0]).toMatchObject({ id: "evt-dead", attempts: 5, replayedAt: null });
  });

  it("degrades to an empty list on query failure", async () => {
    mocks.getPool.mockReturnValue({ query: vi.fn().mockRejectedValue(new Error("db down")) });
    await expect(listDeadLetteredEvents()).resolves.toEqual([]);
  });
});

describe("getDlqDepth", () => {
  it("counts dead + deferred from the grouped query", async () => {
    mocks.getPool.mockReturnValue({
      query: vi.fn().mockResolvedValue({
        rows: [
          { status: "dead", n: "3" },
          { status: "deferred", n: "1" },
        ],
      }),
    });
    await expect(getDlqDepth()).resolves.toEqual({ dead: 3, deferred: 1 });
  });

  it("returns zeros when a status group is absent", async () => {
    mocks.getPool.mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [{ status: "deferred", n: "2" }] }),
    });
    await expect(getDlqDepth()).resolves.toEqual({ dead: 0, deferred: 2 });
  });

  it("degrades to zeros on query failure", async () => {
    mocks.getPool.mockReturnValue({ query: vi.fn().mockRejectedValue(new Error("db down")) });
    await expect(getDlqDepth()).resolves.toEqual({ dead: 0, deferred: 0 });
  });
});
