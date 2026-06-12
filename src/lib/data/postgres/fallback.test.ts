import { beforeEach, describe, expect, it, vi } from "vitest";

// The guarded mock-fallback seam (#193): pass-through mocks when no DB is configured,
// loud DataUnavailableError when a configured DB's query just failed.
const h = vi.hoisted(() => ({
  isDbConfigured: vi.fn(),
  getKpis: vi.fn(),
  createAccount: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ isDbConfigured: h.isDbConfigured }));
vi.mock("@/lib/data/mock/mock-repositories", () => ({
  mockRepositories: {
    dashboard: { getKpis: h.getKpis, someValue: 42 },
    crm: { createAccount: h.createAccount },
  },
}));

import { DataUnavailableError, mockRepositories } from "./fallback";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("guarded mock fallback (#193)", () => {
  it("runs the real mock when no database is configured (dev/demo unchanged)", async () => {
    h.isDbConfigured.mockReturnValue(false);
    h.getKpis.mockResolvedValue([{ label: "Open Pipeline", value: "$0" }]);
    await expect(mockRepositories.dashboard.getKpis()).resolves.toEqual([
      { label: "Open Pipeline", value: "$0" },
    ]);
    expect(h.getKpis).toHaveBeenCalledTimes(1);
  });

  it("throws DataUnavailableError naming the method when a database IS configured", async () => {
    h.isDbConfigured.mockReturnValue(true);
    expect(() => mockRepositories.dashboard.getKpis()).toThrow(DataUnavailableError);
    expect(() => mockRepositories.dashboard.getKpis()).toThrow(/dashboard\.getKpis/);
    expect(h.getKpis).not.toHaveBeenCalled();
  });

  it("guards WRITE methods too — a failed mutation can never fake success", () => {
    h.isDbConfigured.mockReturnValue(true);
    expect(() =>
      (mockRepositories.crm as unknown as { createAccount: (i: unknown) => unknown }).createAccount(
        { name: "Contoso" },
      ),
    ).toThrow(/crm\.createAccount/);
    expect(h.createAccount).not.toHaveBeenCalled();
  });

  it("decides per call, not at import time", async () => {
    h.isDbConfigured.mockReturnValue(true);
    expect(() => mockRepositories.dashboard.getKpis()).toThrow(DataUnavailableError);
    h.isDbConfigured.mockReturnValue(false);
    h.getKpis.mockResolvedValue([]);
    await expect(mockRepositories.dashboard.getKpis()).resolves.toEqual([]);
  });

  it("passes non-function properties through untouched", () => {
    h.isDbConfigured.mockReturnValue(true);
    expect(
      (mockRepositories.dashboard as unknown as { someValue: number }).someValue,
    ).toBe(42);
  });
});
