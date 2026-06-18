import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExpenseItemRow } from "@/types";

/**
 * Server-gate wiring tests for expense attestation (#895). ADR-0083 specifies that a
 * report cannot be attested while any out-of-pocket item is missing a receipt / over a
 * category hard cap / dated outside the report month — but `attestExpenseReportAction`
 * never called the `hasHardViolation` gate, so the rule was unenforced (dead code in
 * `src/lib/expenses/policy.ts`). These pin the enforcement: the action loads the report
 * items + category caps, refuses (no submit) when a hard rule trips, and submits only when
 * the report is clean — exactly mirroring the timesheet `hasHardDeviation` attest guard.
 * Boundaries mocked; the real policy gate runs.
 */
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  resolveAppUserIdByEmail: vi.fn(),
  getExpenseReportForPeriod: vi.fn(),
  listExpenseCategories: vi.fn(),
  submitExpenseReport: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { email: "emp@imperionllc.com" } })) }));
vi.mock("@/lib/data/app-user", () => ({ resolveAppUserIdByEmail: h.resolveAppUserIdByEmail }));
vi.mock("@/lib/data", () => ({
  getRepositories: () => ({
    crm: {
      getExpenseReportForPeriod: h.getExpenseReportForPeriod,
      listExpenseCategories: h.listExpenseCategories,
      submitExpenseReport: h.submitExpenseReport,
    },
  }),
}));

import { attestExpenseReportAction } from "./actions";

const EMP = "11111111-1111-4111-8111-111111111111";
const PERIOD = "2026-06";

function item(over: Partial<ExpenseItemRow> = {}): ExpenseItemRow {
  return {
    id: "item-1",
    source: "website",
    kind: "out_of_pocket",
    itemDate: "2026-06-10",
    categoryName: "Meals",
    amount: 20,
    miles: null,
    reimbursable: true,
    billable: false,
    merchant: "Cafe",
    hasReceipt: true,
    notes: null,
    ...over,
  };
}

function form(period = PERIOD): FormData {
  const fd = new FormData();
  fd.set("period", period);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.resolveAppUserIdByEmail.mockResolvedValue(EMP);
  h.listExpenseCategories.mockResolvedValue([
    { id: "c1", key: "meals", displayName: "Meals", billableDefault: false, hardCap: 50, softThreshold: 30 },
  ]);
});

describe("attestExpenseReportAction hard-violation gate (#895, ADR-0083)", () => {
  it("submits + redirects when the open report is clean", async () => {
    h.getExpenseReportForPeriod.mockResolvedValue({
      id: "rep-1",
      state: "open",
      periodYear: 2026,
      periodMonth: 6,
      items: [item()],
    });
    await expect(attestExpenseReportAction(form())).rejects.toThrow(
      `NEXT_REDIRECT:/expenses?period=${PERIOD}`,
    );
    expect(h.submitExpenseReport).toHaveBeenCalledWith("rep-1", EMP);
  });

  it("refuses (no submit) when an out-of-pocket item is missing its receipt", async () => {
    h.getExpenseReportForPeriod.mockResolvedValue({
      id: "rep-1",
      state: "open",
      periodYear: 2026,
      periodMonth: 6,
      items: [item({ hasReceipt: false })],
    });
    await attestExpenseReportAction(form());
    expect(h.submitExpenseReport).not.toHaveBeenCalled();
    expect(h.redirect).not.toHaveBeenCalled();
  });

  it("refuses when an item is over its category hard cap", async () => {
    h.getExpenseReportForPeriod.mockResolvedValue({
      id: "rep-1",
      state: "open",
      periodYear: 2026,
      periodMonth: 6,
      items: [item({ amount: 75 })], // cap is 50
    });
    await attestExpenseReportAction(form());
    expect(h.submitExpenseReport).not.toHaveBeenCalled();
  });

  it("refuses when an item is dated outside the report month", async () => {
    h.getExpenseReportForPeriod.mockResolvedValue({
      id: "rep-1",
      state: "open",
      periodYear: 2026,
      periodMonth: 6,
      items: [item({ itemDate: "2026-05-31" })],
    });
    await attestExpenseReportAction(form());
    expect(h.submitExpenseReport).not.toHaveBeenCalled();
  });

  it("is a no-op (no gate bypass) when the report is not open", async () => {
    h.getExpenseReportForPeriod.mockResolvedValue({
      id: "rep-1",
      state: "submitted",
      periodYear: 2026,
      periodMonth: 6,
      items: [item()],
    });
    await attestExpenseReportAction(form());
    expect(h.requireCapability).toHaveBeenCalledWith("expense:write");
    expect(h.submitExpenseReport).not.toHaveBeenCalled();
  });
});
