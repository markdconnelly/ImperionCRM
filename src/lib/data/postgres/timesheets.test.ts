import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the pool seam (same harness as delivery-templates.test.ts). These methods
// read/write via pool.query (no transactions), so only query + getPool are needed.
const { query, connect, getPool } = vi.hoisted(() => {
  const query = vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [] }),
  );
  const connect = vi.fn(async () => ({ query, release: vi.fn() }));
  const getPool = vi.fn((): unknown => ({ query, connect }));
  return { query, connect, getPool };
});

vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { postgresRepositories } from "./postgres-repositories";

const crm = postgresRepositories.crm;

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query, connect });
  query.mockResolvedValue({ rows: [] });
});

describe("listTimesheets (ADR-0082)", () => {
  it("filters by employee, derives minutes, maps counts to numbers", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "ts-1",
          app_user_id: "emp-1",
          week_start: "2026-06-08",
          week_end: "2026-06-14",
          state: "open",
          attested_at: null,
          entry_count: "3",
          total_minutes: "480",
        },
      ],
    });
    const rows = await crm.listTimesheets({ employeeId: "emp-1" });
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain("t.app_user_id = $1");
    expect(sql).toContain("EXTRACT(EPOCH FROM (w.ended_at - w.started_at))");
    expect(params).toEqual(["emp-1"]);
    expect(rows[0]).toMatchObject({
      id: "ts-1",
      employeeId: "emp-1",
      weekStart: "2026-06-08",
      state: "open",
      entryCount: 3,
      totalMinutes: 480,
      attestedAt: null,
    });
  });
});

describe("getTimesheetForWeek (ADR-0082)", () => {
  it("returns null when no sheet exists for the week", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const result = await crm.getTimesheetForWeek("emp-1", "2026-06-08");
    expect(result).toBeNull();
  });

  it("assembles entries + reconciliation and flags an over-logged Hard deviation", async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "ts-1",
            app_user_id: "emp-1",
            week_start: "2026-06-08",
            week_end: "2026-06-14",
            state: "open",
            attested_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "e-1",
            work_date: "2026-06-08",
            started_at: "2026-06-08T09:00:00.000Z",
            ended_at: "2026-06-08T12:00:00.000Z",
            minutes: "180",
            category: "billable",
            ancillary_ticket_ref: "T123",
            notes: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            work_date: "2026-06-08",
            attended_minutes: "180",
            logged_minutes: "260",
            delta_minutes: "80",
            verdict: "over_logged",
          },
        ],
      });
    const result = await crm.getTimesheetForWeek("emp-1", "2026-06-08");
    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(1);
    expect(result!.entries[0]).toMatchObject({ minutes: 180, category: "billable" });
    expect(result!.reconciliation[0].verdict).toBe("over_logged");
    expect(result!.totalMinutes).toBe(180);
    expect(result!.hasHardDeviation).toBe(true); // over-logged day blocks attest
  });

  it("flags a same-day overlap as a Hard deviation even when reconciliation is balanced", async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "ts-1",
            app_user_id: "emp-1",
            week_start: "2026-06-08",
            week_end: "2026-06-14",
            state: "open",
            attested_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "e-1",
            work_date: "2026-06-08",
            started_at: "2026-06-08T09:00:00.000Z",
            ended_at: "2026-06-08T11:00:00.000Z",
            minutes: "120",
            category: "internal",
            ancillary_ticket_ref: null,
            notes: null,
          },
          {
            id: "e-2",
            work_date: "2026-06-08",
            started_at: "2026-06-08T10:30:00.000Z", // overlaps e-1
            ended_at: "2026-06-08T12:00:00.000Z",
            minutes: "90",
            category: "internal",
            ancillary_ticket_ref: null,
            notes: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }); // no reconciliation rows
    const result = await crm.getTimesheetForWeek("emp-1", "2026-06-08");
    expect(result!.hasHardDeviation).toBe(true);
  });

  it("is clean (no Hard deviation) for non-overlapping balanced days", async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "ts-1",
            app_user_id: "emp-1",
            week_start: "2026-06-08",
            week_end: "2026-06-14",
            state: "open",
            attested_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "e-1",
            work_date: "2026-06-08",
            started_at: "2026-06-08T09:00:00.000Z",
            ended_at: "2026-06-08T11:00:00.000Z",
            minutes: "120",
            category: "admin",
            ancillary_ticket_ref: null,
            notes: null,
          },
          {
            id: "e-2",
            work_date: "2026-06-08",
            started_at: "2026-06-08T11:00:00.000Z", // back-to-back, no overlap
            ended_at: "2026-06-08T12:00:00.000Z",
            minutes: "60",
            category: "admin",
            ancillary_ticket_ref: null,
            notes: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            work_date: "2026-06-08",
            attended_minutes: "180",
            logged_minutes: "170",
            delta_minutes: "-10",
            verdict: "balanced",
          },
        ],
      });
    const result = await crm.getTimesheetForWeek("emp-1", "2026-06-08");
    expect(result!.hasHardDeviation).toBe(false);
  });
});

describe("ensureTimesheetForWeek (ADR-0082)", () => {
  it("upserts on (app_user_id, week_start) and returns the id", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: "ts-new" }] });
    const id = await crm.ensureTimesheetForWeek("emp-1", "2026-06-08");
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain("ON CONFLICT (app_user_id, week_start)");
    expect(sql).toContain("$2::date + 6"); // Sunday derived
    expect(params).toEqual(["emp-1", "2026-06-08"]);
    expect(id).toBe("ts-new");
  });
});

describe("addTimeEntry (ADR-0082)", () => {
  it("inserts an attendance block and returns the new id", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: "e-new" }] });
    const id = await crm.addTimeEntry({
      timesheetId: "ts-1",
      employeeId: "emp-1",
      workDate: "2026-06-08",
      startedAt: "2026-06-08T09:00:00.000Z",
      endedAt: "2026-06-08T12:00:00.000Z",
      category: "billable",
      ancillaryTicketRef: "T123",
      notes: "  ", // whitespace → null
    });
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain("INSERT INTO website_time_entry");
    expect(params[6]).toBe("T123");
    expect(params[7]).toBeNull(); // blank notes nulled
    expect(id).toBe("e-new");
  });
});

describe("submitTimesheet (attest, ADR-0082)", () => {
  it("transitions only an Open sheet → Submitted and snapshots the entries", async () => {
    await crm.submitTimesheet("ts-1", "emp-1");
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain("state = 'submitted'");
    expect(sql).toContain("attested_at = now()");
    expect(sql).toContain("jsonb_agg(to_jsonb(w)"); // attested snapshot
    expect(sql).toContain("t.state = 'open'"); // self-lock guard
    expect(params).toEqual(["ts-1", "emp-1"]);
  });
});
