import { beforeEach, describe, expect, it, vi } from "vitest";

// external-client carries the error classes the call-guard classifies; mock it the way
// every caller test does (avoids pulling the MI/identity deps).
vi.mock("@/lib/services/external-client", () => {
  class ServiceNotConfiguredError extends Error {
    constructor(serviceName: string, envVar: string) {
      super(`${serviceName} not configured (${envVar})`);
    }
  }
  class ServiceCallError extends Error {
    constructor(
      name: string,
      public status: number,
      body: string,
    ) {
      super(`${name} returned ${status}: ${body}`);
    }
  }
  return { ServiceNotConfiguredError, ServiceCallError };
});
vi.mock("server-only", () => ({}));

const { reconcile } = vi.hoisted(() => ({ reconcile: vi.fn() }));
vi.mock("@/lib/services", () => ({ timeReconciliationService: { reconcile } }));

import { ServiceCallError, ServiceNotConfiguredError } from "@/lib/services/external-client";
import { getTimeDeviations } from "./deviations";

const TS_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTimeDeviations (#502 — backend reconciliation overlay)", () => {
  it("returns the backend's deviation list on success", async () => {
    reconcile.mockResolvedValueOnce({
      timesheetId: TS_ID,
      deviations: [
        { workDate: "2026-06-09", type: "over_logged", severity: "hard", attendedMinutes: 240, loggedMinutes: 360, detail: "x" },
      ],
      hardCount: 1,
      softCount: 0,
    });
    const result = await getTimeDeviations(TS_ID);
    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("over_logged");
    expect(reconcile).toHaveBeenCalledWith({ timesheetId: TS_ID });
  });

  it("returns [] when the backend isn't configured (graceful degradation)", async () => {
    reconcile.mockRejectedValueOnce(
      new ServiceNotConfiguredError("Time Reconciliation", "AGENT_SERVICE_URL"),
    );
    expect(await getTimeDeviations(TS_ID)).toEqual([]);
  });

  it("returns [] when the backend rejects (e.g. 404 unknown timesheet)", async () => {
    reconcile.mockRejectedValueOnce(new ServiceCallError("time-reconciliation", 404, "not found"));
    expect(await getTimeDeviations(TS_ID)).toEqual([]);
  });

  it("returns [] on an unreachable backend (network/timeout)", async () => {
    reconcile.mockRejectedValueOnce(new Error("fetch failed"));
    expect(await getTimeDeviations(TS_ID)).toEqual([]);
  });
});
