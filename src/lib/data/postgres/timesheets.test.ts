import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the pool seam (same harness as delivery-templates.test.ts). Most methods read/
// write via pool.query; approveTimesheet uses a pool.connect() transaction, so the
// client query spy is exposed too.
const { query, connect, clientQuery, release, getPool } = vi.hoisted(() => {
  const query = vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [] }),
  );
  const clientQuery = vi.fn<
    (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>
  >(async () => ({ rows: [], rowCount: 1 }));
  const release = vi.fn();
  const connect = vi.fn(async () => ({ query: clientQuery, release }));
  const getPool = vi.fn((): unknown => ({ query, connect }));
  return { query, connect, clientQuery, release, getPool };
});

vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { postgresRepositories } from "./postgres-repositories";

const crm = postgresRepositories.crm;

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query, connect });
  query.mockResolvedValue({ rows: [] });
  clientQuery.mockResolvedValue({ rows: [], rowCount: 1 });
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

describe("listSubmittedTimesheets (admin queue, ADR-0082)", () => {
  it("queries only submitted sheets, joins the employee name, maps the row", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "ts-1",
          app_user_id: "emp-1",
          employee_name: "Dana Tech",
          week_start: "2026-06-08",
          week_end: "2026-06-14",
          state: "submitted",
          attested_at: "2026-06-15T10:00:00.000Z",
          entry_count: "5",
          total_minutes: "2400",
        },
      ],
    });
    const rows = await crm.listSubmittedTimesheets();
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("t.state = 'submitted'");
    expect(sql).toContain("JOIN app_user u ON u.id = t.app_user_id");
    expect(rows[0]).toMatchObject({
      id: "ts-1",
      employeeId: "emp-1",
      employeeName: "Dana Tech",
      entryCount: 5,
      totalMinutes: 2400,
    });
  });
});

describe("approveTimesheet (transaction + Time Ticket request, ADR-0082)", () => {
  it("commits: Submitted→Approved then upserts the pending time_ticket", async () => {
    const sqls: string[] = [];
    clientQuery.mockImplementation(async (sql: string) => {
      sqls.push(sql);
      return { rows: [], rowCount: 1 };
    });
    await crm.approveTimesheet("ts-1", "admin-1");
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(sqls.some((s) => s.includes("state = 'approved'") && s.includes("approved_by = $2"))).toBe(true);
    expect(sqls.some((s) => s.includes("INSERT INTO time_ticket") && s.includes("ON CONFLICT (timesheet_id) DO NOTHING"))).toBe(true);
  });

  it("does NOT create a ticket when the sheet was not in Submitted (rowCount 0)", async () => {
    const sqls: string[] = [];
    clientQuery.mockImplementation(async (sql: string) => {
      sqls.push(sql);
      return { rows: [], rowCount: sql.includes("UPDATE timesheet") ? 0 : 1 };
    });
    await crm.approveTimesheet("ts-1", "admin-1");
    expect(sqls.some((s) => s.includes("INSERT INTO time_ticket"))).toBe(false);
    expect(sqls.at(-1)).toBe("COMMIT");
  });

  it("rolls back on error and releases the client", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("UPDATE timesheet")) throw new Error("boom");
      return { rows: [], rowCount: 1 };
    });
    await expect(crm.approveTimesheet("ts-1", "admin-1")).rejects.toThrow("boom");
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls).toContain("ROLLBACK");
    expect(release).toHaveBeenCalled();
  });
});

describe("reopenTimesheet (send back, ADR-0082)", () => {
  it("clears attest/approve stamps and guards the source state", async () => {
    await crm.reopenTimesheet("ts-1");
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain("state = 'open'");
    expect(sql).toContain("attested_at = NULL");
    expect(sql).toContain("approved_at = NULL");
    expect(sql).toContain("state IN ('submitted', 'approved')");
    expect(params).toEqual(["ts-1"]);
  });
});

describe("listPayrollTimesheets (CFO payroll queue, ADR-0082 #466)", () => {
  it("reads the comp-free payroll view, filters payroll states, maps the row", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          timesheet_id: "ts-1",
          app_user_id: "emp-1",
          employee_name: "Dana Tech",
          week_start: "2026-06-08",
          week_end: "2026-06-14",
          state: "payroll_approved",
          approved_minutes: "2400",
          payroll_approved_at: "2026-06-16T10:00:00.000Z",
          paid_at: null,
          qb_payment_ref: null,
        },
      ],
    });
    const rows = await crm.listPayrollTimesheets();
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("FROM timesheet_payroll_status p");
    expect(sql).toContain("JOIN app_user u ON u.id = p.app_user_id");
    expect(sql).toContain("p.state IN ('approved', 'payroll_approved', 'paid')");
    // The payroll queue is comp-free — never select pay rate / the comp store.
    expect(sql).not.toContain("pay_rate");
    expect(sql).not.toContain("employee_profile");
    expect(rows[0]).toMatchObject({
      id: "ts-1",
      employeeId: "emp-1",
      employeeName: "Dana Tech",
      state: "payroll_approved",
      approvedMinutes: 2400,
      paidAt: null,
      qbPaymentRef: null,
    });
  });
});

describe("payrollApproveTimesheet (CFO gate, ADR-0082 #466)", () => {
  it("moves only an Approved sheet → Payroll-Approved and stamps the approver", async () => {
    await crm.payrollApproveTimesheet("ts-1", "cfo-1");
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain("state = 'payroll_approved'");
    expect(sql).toContain("payroll_approved_at = now()");
    expect(sql).toContain("payroll_approved_by = $2");
    expect(sql).toContain("state = 'approved'"); // source-state guard
    expect(sql).not.toContain("pay_rate");
    expect(params).toEqual(["ts-1", "cfo-1"]);
  });
});

describe("unapprovePayrollTimesheet (CFO undo, ADR-0082 #466)", () => {
  it("reverts Payroll-Approved → Approved and clears the payroll stamps", async () => {
    await crm.unapprovePayrollTimesheet("ts-1");
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain("state = 'approved'");
    expect(sql).toContain("payroll_approved_at = NULL");
    expect(sql).toContain("state = 'payroll_approved'"); // only un-approve before payment
    expect(params).toEqual(["ts-1"]);
  });
});

describe("markTimesheetPaid (confirm QB match, ADR-0082 #466)", () => {
  it("moves only a Payroll-Approved sheet → Paid and records the payment ref", async () => {
    await crm.markTimesheetPaid("ts-1", "QB-PMT-99");
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain("state = 'paid'");
    expect(sql).toContain("paid_at = now()");
    expect(sql).toContain("qb_payment_ref = $2");
    expect(sql).toContain("state = 'payroll_approved'"); // source-state guard
    expect(sql).not.toContain("pay_rate");
    expect(params).toEqual(["ts-1", "QB-PMT-99"]);
  });
});

describe("listEmployeeMappings (admin mapping UI, ADR-0082 #468)", () => {
  it("left-joins the mapping sidecar, coerces the numeric Resource id, derives confirmed", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          app_user_id: "emp-1",
          display_name: "Dana Tech",
          email: "dana@imperion.example",
          autotask_resource_id: "29384", // numeric comes back as string from pg
          quickbooks_vendor_id: "QB-77",
          resolved_at: "2026-06-13T10:00:00.000Z",
          confirmed_by_name: "Admin One",
        },
        {
          app_user_id: "emp-2",
          display_name: null, // falls back to email
          email: "sam@imperion.example",
          autotask_resource_id: null,
          quickbooks_vendor_id: null,
          resolved_at: null,
          confirmed_by_name: null,
        },
      ],
    });
    const rows = await crm.listEmployeeMappings();
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("FROM app_user u");
    expect(sql).toContain("LEFT JOIN employee_profile ep ON ep.app_user_id = u.id");
    // Never select comp data on this surface.
    expect(sql).not.toContain("classification");
    expect(sql).not.toContain("pay_rate");
    expect(rows[0]).toMatchObject({
      appUserId: "emp-1",
      displayName: "Dana Tech",
      autotaskResourceId: 29384,
      quickbooksVendorId: "QB-77",
      confirmed: true,
      confirmedByName: "Admin One",
    });
    expect(rows[1]).toMatchObject({
      appUserId: "emp-2",
      displayName: "sam@imperion.example", // email fallback
      autotaskResourceId: null,
      confirmed: false,
    });
  });
});

describe("confirmEmployeeMapping (admin upsert, ADR-0082 #468)", () => {
  it("upserts mapping cols + stamps who/when, never touching comp data", async () => {
    await crm.confirmEmployeeMapping(
      { appUserId: "emp-1", autotaskResourceId: 29384, quickbooksVendorId: "QB-77" },
      "admin-1",
    );
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain("INSERT INTO employee_profile");
    expect(sql).toContain("ON CONFLICT (app_user_id) DO UPDATE");
    expect(sql).toContain("mappings_resolved_at  = now()");
    expect(sql).not.toContain("classification");
    expect(params).toEqual(["emp-1", 29384, "QB-77", "admin-1"]);
  });

  it("passes nulls through to clear a mapping", async () => {
    await crm.confirmEmployeeMapping(
      { appUserId: "emp-2", autotaskResourceId: null, quickbooksVendorId: null },
      "admin-1",
    );
    const params = query.mock.calls[0][1] as unknown[];
    expect(params).toEqual(["emp-2", null, null, "admin-1"]);
  });
});
