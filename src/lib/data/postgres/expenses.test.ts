import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the pool seam (same harness as timesheets.test.ts). Item CRUD uses a
// pool.connect() transaction, so the client query spy is exposed too.
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
import type { ExpenseItemInput } from "@/lib/data/repositories";

const crm = postgresRepositories.crm;

/** A valid out-of-pocket item input owned by emp-1 on its open report. */
function input(overrides: Partial<ExpenseItemInput> = {}): ExpenseItemInput {
  return {
    expenseReportId: "rep-1",
    employeeId: "emp-1",
    itemDate: "2026-06-10",
    categoryId: "cat-1",
    amount: 42.5,
    merchant: "Cafe",
    description: "  ", // whitespace → null
    reimbursable: true,
    billable: false,
    autotaskCompanyId: null,
    receiptId: "rcpt-1",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query, connect });
  query.mockResolvedValue({ rows: [] });
  clientQuery.mockResolvedValue({ rows: [], rowCount: 1 });
});

describe("addExpenseItem (self-scoped, lock re-check, ADR-0083 #486)", () => {
  it("locks the OWN open report then inserts into the bronze and returns the id", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    clientQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (sql.includes("FOR UPDATE")) return { rows: [{ state: "open" }], rowCount: 1 };
      if (sql.includes("INSERT INTO website_expense_item"))
        return { rows: [{ id: "item-new" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const id = await crm.addExpenseItem(input());
    expect(id).toBe("item-new");
    const lock = calls.find((c) => c.sql.includes("FOR UPDATE"))!;
    // The lock select scopes to the report id AND the session employee (ownership).
    expect(lock.sql).toContain("app_user_id = $2");
    expect(lock.params).toEqual(["rep-1", "emp-1"]);
    const insert = calls.find((c) => c.sql.includes("INSERT INTO website_expense_item"))!;
    expect(insert.params![1]).toBe("emp-1"); // owner from session
    expect(insert.params![6]).toBeNull(); // blank description nulled
    expect(calls.at(-1)!.sql).toBe("COMMIT");
  });

  it("refuses (null, rolls back) when the report is not Open", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FOR UPDATE")) return { rows: [{ state: "submitted" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const id = await crm.addExpenseItem(input());
    expect(id).toBeNull();
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls).toContain("ROLLBACK");
    expect(sqls.some((s) => s.includes("INSERT INTO website_expense_item"))).toBe(false);
  });

  it("refuses (null) when the report isn't owned by the employee (no lock row)", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FOR UPDATE")) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    });
    const id = await crm.addExpenseItem(input({ employeeId: "intruder" }));
    expect(id).toBeNull();
    expect(clientQuery.mock.calls.map((c) => c[0] as string)).toContain("ROLLBACK");
  });

  it("rolls back and releases on a write error", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FOR UPDATE")) return { rows: [{ state: "open" }], rowCount: 1 };
      if (sql.includes("INSERT INTO website_expense_item")) throw new Error("boom");
      return { rows: [], rowCount: 1 };
    });
    await expect(crm.addExpenseItem(input())).rejects.toThrow("boom");
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls).toContain("ROLLBACK");
    expect(release).toHaveBeenCalled();
  });
});

describe("updateExpenseItem (self-scoped, lock re-check, ADR-0083 #486)", () => {
  it("updates only when the own report is Open; scopes the UPDATE to id+report+owner", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    clientQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (sql.includes("FOR UPDATE")) return { rows: [{ state: "open" }], rowCount: 1 };
      if (sql.includes("UPDATE website_expense_item")) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const ok = await crm.updateExpenseItem("item-1", input());
    expect(ok).toBe(true);
    const update = calls.find((c) => c.sql.includes("UPDATE website_expense_item"))!;
    expect(update.sql).toContain("WHERE id = $1 AND expense_report_id = $2 AND app_user_id = $3");
    expect(update.params!.slice(0, 3)).toEqual(["item-1", "rep-1", "emp-1"]);
    expect(calls.at(-1)!.sql).toBe("COMMIT");
  });

  it("refuses (false) when the report is locked (not Open)", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FOR UPDATE")) return { rows: [{ state: "approved" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const ok = await crm.updateExpenseItem("item-1", input());
    expect(ok).toBe(false);
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls).toContain("ROLLBACK");
    expect(sqls.some((s) => s.includes("UPDATE website_expense_item"))).toBe(false);
  });

  it("refuses (false) when the item isn't on this report/owner (rowCount 0)", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FOR UPDATE")) return { rows: [{ state: "open" }], rowCount: 1 };
      if (sql.includes("UPDATE website_expense_item")) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    });
    const ok = await crm.updateExpenseItem("not-mine", input());
    expect(ok).toBe(false);
    expect(clientQuery.mock.calls.map((c) => c[0] as string)).toContain("ROLLBACK");
  });
});

describe("deleteExpenseItem (self-scoped, lock re-check, ADR-0083 #486)", () => {
  it("deletes only an item on the own Open report", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    clientQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (sql.includes("FOR UPDATE OF er")) return { rows: [{ state: "open" }], rowCount: 1 };
      if (sql.includes("DELETE FROM website_expense_item")) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const ok = await crm.deleteExpenseItem("item-1", "emp-1");
    expect(ok).toBe(true);
    const lock = calls.find((c) => c.sql.includes("FOR UPDATE OF er"))!;
    expect(lock.sql).toContain("JOIN expense_report er");
    expect(lock.params).toEqual(["item-1", "emp-1"]);
    const del = calls.find((c) => c.sql.includes("DELETE FROM website_expense_item"))!;
    expect(del.params).toEqual(["item-1", "emp-1"]);
    expect(calls.at(-1)!.sql).toBe("COMMIT");
  });

  it("refuses (false) when the owning report is not Open", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FOR UPDATE OF er")) return { rows: [{ state: "reimbursed" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const ok = await crm.deleteExpenseItem("item-1", "emp-1");
    expect(ok).toBe(false);
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls).toContain("ROLLBACK");
    expect(sqls.some((s) => s.includes("DELETE FROM website_expense_item"))).toBe(false);
  });

  it("refuses (false) when the item/owner pair doesn't resolve", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FOR UPDATE OF er")) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    });
    const ok = await crm.deleteExpenseItem("item-1", "intruder");
    expect(ok).toBe(false);
    expect(clientQuery.mock.calls.map((c) => c[0] as string)).toContain("ROLLBACK");
  });
});

describe("listExpenseCategories (ADR-0083 #486)", () => {
  it("reads active, visible, non-system categories and coerces caps to numbers", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "cat-1",
          key: "meals",
          display_name: "Meals",
          billable_default: false,
          hard_cap: "50.00",
          soft_threshold: "25.00",
        },
        {
          id: "cat-2",
          key: "supplies",
          display_name: "Supplies",
          billable_default: true,
          hard_cap: null,
          soft_threshold: null,
        },
      ],
    });
    const rows = await crm.listExpenseCategories();
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("is_active AND is_user_visible AND NOT is_system"); // excludes Mileage
    // Never select the QuickBooks/Autotask mapping ids on the entry surface.
    expect(sql).not.toContain("qbo_account_id");
    expect(sql).not.toContain("autotask_expense_category_id");
    expect(rows[0]).toMatchObject({ key: "meals", hardCap: 50, softThreshold: 25 });
    expect(rows[1]).toMatchObject({ key: "supplies", hardCap: null, softThreshold: null });
  });
});

describe("listMileiqDrives (read-only, comp-free, ADR-0083 #486)", () => {
  it("filters by employee + month, derives matched, and never reads the rate", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "drv-1",
          drive_date: "2026-06-12",
          miles: "30.5",
          origin: "Office",
          destination: "Client",
          suggested_amount: "21.35",
          matched_at: "2026-06-13T00:00:00.000Z",
        },
        {
          id: "drv-2",
          drive_date: "2026-06-20",
          miles: "10",
          origin: null,
          destination: null,
          suggested_amount: null,
          matched_at: null,
        },
      ],
    });
    const rows = await crm.listMileiqDrives("emp-1", 2026, 6);
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain("FROM mileiq_drive");
    expect(sql).not.toContain("mileage_rate"); // comp-free: never the rate
    expect(sql).not.toContain("rate"); // not even the suggested_rate column
    expect(params).toEqual(["emp-1", 2026, 6]);
    expect(rows[0]).toMatchObject({ miles: 30.5, suggestedAmount: 21.35, matched: true });
    expect(rows[1]).toMatchObject({ suggestedAmount: null, matched: false });
  });
});

describe("listExpensePolicyViolations (ADR-0083 #486)", () => {
  it("reads the violation view for one report and maps the rows", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          expense_item_id: "i-1",
          expense_report_id: "rep-1",
          rule_key: "missing_receipt",
          severity: "hard",
          detail: "Out-of-pocket item has no receipt",
        },
      ],
    });
    const rows = await crm.listExpensePolicyViolations("rep-1");
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("FROM expense_policy_violation");
    expect(query.mock.calls[0][1]).toEqual(["rep-1"]);
    expect(rows[0]).toMatchObject({
      expenseItemId: "i-1",
      ruleKey: "missing_receipt",
      severity: "hard",
    });
  });
});

describe("listMonthlyClose (comp-free read model, ADR-0083 #486)", () => {
  it("reads the unified close view for an employee and maps minutes/totals/flags", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          app_user_id: "emp-1",
          period_year: 2026,
          period_month: 6,
          expense_report_id: "rep-1",
          expense_state: "finance_approved",
          reimbursable_total: "120.50",
          reimbursement_verdict: "pending",
          qb_bill_payment_ref: null,
          approved_time_minutes: "2400",
          timesheet_count: "4",
          paid_count: "3",
          expense_obligation_open: true,
          time_obligation_open: true,
        },
      ],
    });
    const rows = await crm.listMonthlyClose("emp-1");
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("FROM monthly_close");
    expect(sql).not.toContain("pay_rate");
    expect(sql).not.toContain("mileage_rate");
    expect(query.mock.calls[0][1]).toEqual(["emp-1"]);
    expect(rows[0]).toMatchObject({
      periodYear: 2026,
      periodMonth: 6,
      expenseState: "finance_approved",
      reimbursableTotal: 120.5,
      reimbursementVerdict: "pending",
      approvedTimeMinutes: 2400,
      timesheetCount: 4,
      paidCount: 3,
      expenseObligationOpen: true,
      timeObligationOpen: true,
    });
  });
});

describe("listExpenseCategoriesAdmin (mapping console, ADR-0083 #489)", () => {
  it("reads EVERY category with full config + QuickBooks join, comp-free", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "cat-mileage",
          key: "mileage",
          display_name: "Mileage",
          qbo_account_id: null,
          qbo_account_name: null,
          hard_cap: null,
          soft_threshold: null,
          billable_default: false,
          autotask_expense_category_id: null,
          is_system: true,
          is_user_visible: true,
          is_active: true,
          mapped_by_name: null,
        },
        {
          id: "cat-meals",
          key: "meals",
          display_name: "Meals",
          qbo_account_id: "QB-77",
          qbo_account_name: "Meals & Entertainment",
          hard_cap: "75.00",
          soft_threshold: "40.00",
          billable_default: false,
          autotask_expense_category_id: "12",
          is_system: false,
          is_user_visible: true,
          is_active: true,
          mapped_by_name: "Admin User",
        },
      ],
    });
    const rows = await crm.listExpenseCategoriesAdmin();
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("FROM expense_category");
    expect(sql).toContain("LEFT JOIN qbo_expense_account");
    // The mapping surface carries the full config (unlike the entry-GUI subset) but stays comp-free.
    expect(sql).not.toContain("mileage_rate");
    expect(sql).not.toContain("pay_rate");
    expect(rows[0]).toMatchObject({ key: "mileage", isSystem: true, qboAccountId: null });
    expect(rows[1]).toMatchObject({
      key: "meals",
      qboAccountId: "QB-77",
      qboAccountName: "Meals & Entertainment",
      hardCap: 75,
      softThreshold: 40,
      autotaskExpenseCategoryId: 12,
      mappedByName: "Admin User",
    });
  });
});

describe("listQboExpenseAccounts (synced read-only chart of accounts, ADR-0083 #489)", () => {
  it("reads the QuickBooks bronze + the category key already mapped to each account", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          qbo_account_id: "QB-77",
          name: "Meals & Entertainment",
          fully_qualified_name: "Expenses:Meals & Entertainment",
          account_type: "Expense",
          active: true,
          mapped_to_key: "meals",
        },
        {
          qbo_account_id: "QB-90",
          name: "Office Supplies",
          fully_qualified_name: null,
          account_type: "Expense",
          active: false,
          mapped_to_key: null,
        },
      ],
    });
    const rows = await crm.listQboExpenseAccounts();
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("FROM qbo_expense_account");
    expect(sql).toContain("LEFT JOIN expense_category");
    expect(rows[0]).toMatchObject({ qboAccountId: "QB-77", mappedToKey: "meals", active: true });
    expect(rows[1]).toMatchObject({ qboAccountId: "QB-90", mappedToKey: null, active: false });
  });
});

describe("updateExpenseCategoryMapping (admin write, ADR-0083 #489)", () => {
  const base = {
    id: "cat-meals",
    displayName: "Meals",
    qboAccountId: "QB-77",
    hardCap: 75,
    softThreshold: 40,
    billableDefault: false,
    autotaskExpenseCategoryId: 12,
    isUserVisible: true,
    isActive: true,
  };

  it("updates the row, stamps mapped_by, and guards the system link + active CHECK in SQL", async () => {
    await crm.updateExpenseCategoryMapping(base, "admin-1");
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain("UPDATE expense_category");
    // System Mileage row's QuickBooks link is mapping-exempt (never overwritten here).
    expect(sql).toContain("CASE WHEN is_system THEN qbo_account_id ELSE $3 END");
    // A non-system row cannot go active while unmapped (mirrors the DB CHECK).
    expect(sql).toContain("WHEN $3 IS NULL THEN false");
    expect(params[0]).toBe("cat-meals");
    expect(params[2]).toBe("QB-77");
    expect(params[9]).toBe("admin-1"); // mapped_by stamped last
  });

  it("forces inactive when a category is left unmapped (qboAccountId null)", async () => {
    await crm.updateExpenseCategoryMapping(
      { ...base, qboAccountId: null, isActive: true },
      "admin-1",
    );
    const params = query.mock.calls[0][1] as unknown[];
    expect(params[2]).toBeNull(); // qboAccountId
    expect(params[8]).toBe(false); // effectiveActive forced false despite isActive:true
  });
});

describe("listMileageRates (comp-gated read, ADR-0083 #490)", () => {
  it("orders newest-first, coerces the numeric rate, flags the in-force row", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "mr-2",
          effective_from: "2026-06-01",
          rate: "0.7000", // numeric comes back as string from pg
          source: "system_override",
          note: "matches IRS rate",
          created_at: "2026-05-28T00:00:00.000Z",
          created_by_name: "Fin One",
          is_current: true,
        },
        {
          id: "mr-1",
          effective_from: "2026-01-01",
          rate: "0.6550",
          source: "mileiq_suggested",
          note: null,
          created_at: "2025-12-30T00:00:00.000Z",
          created_by_name: null,
          is_current: false,
        },
      ],
    });
    const rows = await crm.listMileageRates();
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("FROM mileage_rate mr");
    // The in-force row = latest effective_from on or before today.
    expect(sql).toContain("effective_from <= CURRENT_DATE");
    expect(sql).toContain("ORDER BY mr.effective_from DESC");
    expect(rows[0]).toMatchObject({
      id: "mr-2",
      effectiveFrom: "2026-06-01",
      rate: 0.7,
      source: "system_override",
      createdByName: "Fin One",
      isCurrent: true,
    });
    expect(rows[1]).toMatchObject({ rate: 0.655, source: "mileiq_suggested", isCurrent: false });
  });
});

describe("setMileageRate (comp-gated override, ADR-0083 #490)", () => {
  it("inserts a system_override row, upserts on effective_from, stamps who set it", async () => {
    await crm.setMileageRate(
      { effectiveFrom: "2026-07-01", rate: 0.72, note: "Q3 bump" },
      "fin-1",
    );
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain("INSERT INTO mileage_rate");
    // source is fixed to system_override (MileIQ-suggested rows are written elsewhere).
    expect(sql).toContain("'system_override'");
    expect(sql).toContain("ON CONFLICT (effective_from) DO UPDATE");
    expect(params).toEqual(["2026-07-01", 0.72, "Q3 bump", "fin-1"]);
  });
});

describe("correctSubmittedExpenseReport (admin inline correction, ADR-0083 #488)", () => {
  const fields = {
    itemDate: "2026-06-11",
    categoryId: "cat-1",
    amount: 30.0,
    merchant: "Cab",
    description: "  ", // whitespace → null
    reimbursable: true,
    billable: false,
    autotaskCompanyId: null,
  };

  it("adds a line on a SUBMITTED report and audits it vs the attest", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    clientQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (sql.includes("FOR UPDATE"))
        return { rows: [{ state: "submitted", app_user_id: "emp-1" }], rowCount: 1 };
      if (sql.includes("INSERT INTO website_expense_item"))
        return { rows: [{ id: "item-new" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const ok = await crm.correctSubmittedExpenseReport(
      "rep-1",
      { kind: "add", item: fields },
      "admin-1",
    );
    expect(ok).toBe(true);
    const insert = calls.find((c) => c.sql.includes("INSERT INTO website_expense_item"))!;
    // owner comes from the LOCKED report, never the caller
    expect(insert.params![1]).toBe("emp-1");
    expect(insert.params![6]).toBeNull(); // blank description nulled
    const audit = calls.find((c) => c.sql.includes("INSERT INTO audit_log"))!;
    expect(audit.params![0]).toBe("admin-1"); // actor_user_id ($1)
    expect(audit.params![1]).toBe("rep-1"); // entity_id = report id ($2)
    expect(audit.sql).toContain("'expense.corrected'");
    expect(audit.params![3]).toBe("item-new"); // the new item id is recorded ($4)
    expect(calls.at(-1)!.sql).toBe("COMMIT");
  });

  it("captures the before-image on an update for the audit", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    clientQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (sql.includes("FOR UPDATE"))
        return { rows: [{ state: "submitted", app_user_id: "emp-1" }], rowCount: 1 };
      if (sql.includes("SELECT id") && sql.includes("website_expense_item"))
        return { rows: [{ id: "item-1", amount: "20.00", merchant: "Old" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const ok = await crm.correctSubmittedExpenseReport(
      "rep-1",
      { kind: "update", itemId: "item-1", item: fields },
      "admin-1",
    );
    expect(ok).toBe(true);
    const audit = calls.find((c) => c.sql.includes("INSERT INTO audit_log"))!;
    // before-image present, after present
    expect(audit.params![4]).toContain("Old");
    expect(audit.params![5]).toContain("Cab");
  });

  it("refuses (false, rolls back) when the report is not Submitted", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FOR UPDATE"))
        return { rows: [{ state: "approved", app_user_id: "emp-1" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const ok = await crm.correctSubmittedExpenseReport(
      "rep-1",
      { kind: "delete", itemId: "item-1" },
      "admin-1",
    );
    expect(ok).toBe(false);
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls).toContain("ROLLBACK");
    expect(sqls.some((s) => s.includes("DELETE FROM website_expense_item"))).toBe(false);
    expect(sqls.some((s) => s.includes("INSERT INTO audit_log"))).toBe(false);
  });

  it("refuses (false) when the target item isn't on the report (no before-image)", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FOR UPDATE"))
        return { rows: [{ state: "submitted", app_user_id: "emp-1" }], rowCount: 1 };
      if (sql.includes("SELECT id") && sql.includes("website_expense_item"))
        return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    });
    const ok = await crm.correctSubmittedExpenseReport(
      "rep-1",
      { kind: "delete", itemId: "ghost" },
      "admin-1",
    );
    expect(ok).toBe(false);
    expect(clientQuery.mock.calls.map((c) => c[0] as string)).toContain("ROLLBACK");
  });
});
