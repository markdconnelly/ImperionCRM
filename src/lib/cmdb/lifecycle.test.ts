import { describe, expect, test } from "vitest";
import {
  LIFECYCLE_STATES,
  STALE_SEEN_DAYS,
  asLifecycle,
  deriveLifecycle,
} from "@/lib/cmdb/lifecycle";

/**
 * Pure CMDB asset-lifecycle helpers (#649). The DERIVED rule (status tokens →
 * activity fallback) is unit-tested here without a DB — the postgres read path feeds
 * the SAME signals (device status / last_seen_at / Intune enrollment) into
 * `deriveLifecycle`, so these tests pin the contract the read path depends on.
 */

const NOW = new Date("2026-06-17T00:00:00Z");
const recent = (days: number) =>
  new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("scale", () => {
  test("states include the four asset states plus unknown", () => {
    expect([...LIFECYCLE_STATES]).toEqual([
      "in-use",
      "in-stock",
      "retired",
      "disposed",
      "unknown",
    ]);
  });

  test("asLifecycle narrows known states and rejects junk", () => {
    expect(asLifecycle("in-use")).toBe("in-use");
    expect(asLifecycle("disposed")).toBe("disposed");
    expect(asLifecycle("zombie")).toBeNull();
    expect(asLifecycle("")).toBeNull();
    expect(asLifecycle(null)).toBeNull();
    expect(asLifecycle(undefined)).toBeNull();
  });
});

describe("deriveLifecycle — non-asset CIs", () => {
  test("account and user are never physical assets → always unknown", () => {
    expect(deriveLifecycle("account", { deviceStatus: "active" }, NOW)).toBe("unknown");
    expect(deriveLifecycle("user", { lastSeenAt: recent(1) }, NOW)).toBe("unknown");
  });
});

describe("deriveLifecycle — device status tokens (most authoritative)", () => {
  test("a disposed/scrapped status → disposed", () => {
    expect(deriveLifecycle("device", { deviceStatus: "Disposed" }, NOW)).toBe("disposed");
    expect(deriveLifecycle("device", { deviceStatus: "scrapped" }, NOW)).toBe("disposed");
  });

  test("a retired/decommissioned/inactive status → retired", () => {
    expect(deriveLifecycle("device", { deviceStatus: "Retired" }, NOW)).toBe("retired");
    expect(deriveLifecycle("device", { deviceStatus: "Decommissioned" }, NOW)).toBe("retired");
    expect(deriveLifecycle("device", { deviceStatus: "Inactive" }, NOW)).toBe("retired");
  });

  test("a stock/spare/available status → in-stock", () => {
    expect(deriveLifecycle("device", { deviceStatus: "In Stock" }, NOW)).toBe("in-stock");
    expect(deriveLifecycle("device", { deviceStatus: "Spare" }, NOW)).toBe("in-stock");
    expect(deriveLifecycle("device", { deviceStatus: "Unassigned" }, NOW)).toBe("in-stock");
  });

  test("an active/deployed status → in-use", () => {
    expect(deriveLifecycle("device", { deviceStatus: "Active" }, NOW)).toBe("in-use");
    expect(deriveLifecycle("device", { deviceStatus: "Deployed" }, NOW)).toBe("in-use");
  });

  test("terminal status wins even when recently seen", () => {
    expect(
      deriveLifecycle("device", { deviceStatus: "Disposed", lastSeenAt: recent(1) }, NOW),
    ).toBe("disposed");
  });
});

describe("deriveLifecycle — activity fallback when no/ambiguous status", () => {
  test("a live Intune enrollment (management_state) → in-use", () => {
    expect(
      deriveLifecycle("device", { intuneManagementState: "managed" }, NOW),
    ).toBe("in-use");
  });

  test("an enrolled-date signal alone → in-use", () => {
    expect(
      deriveLifecycle("device", { intuneEnrolledAt: recent(400) }, NOW),
    ).toBe("in-use");
  });

  test("seen recently with no status/enrollment → in-use", () => {
    expect(deriveLifecycle("device", { lastSeenAt: recent(5) }, NOW)).toBe("in-use");
  });

  test("seen long ago with no enrollment → retired (aged out)", () => {
    expect(
      deriveLifecycle("device", { lastSeenAt: recent(STALE_SEEN_DAYS + 1) }, NOW),
    ).toBe("retired");
  });

  test("the stale boundary is inclusive (exactly STALE_SEEN_DAYS = still in-use)", () => {
    expect(
      deriveLifecycle("device", { lastSeenAt: recent(STALE_SEEN_DAYS) }, NOW),
    ).toBe("in-use");
  });
});

describe("deriveLifecycle — missing signals are graceful (never crash, → unknown)", () => {
  test("a device with no signals at all → unknown", () => {
    expect(deriveLifecycle("device", {}, NOW)).toBe("unknown");
  });

  test("null/empty/garbage signals → unknown, never a throw", () => {
    expect(
      deriveLifecycle(
        "device",
        {
          deviceStatus: null,
          lastSeenAt: "not-a-date",
          intuneManagementState: null,
          intuneEnrolledAt: "",
        },
        NOW,
      ),
    ).toBe("unknown");
  });

  test("an unrecognised status with no activity falls through to unknown", () => {
    expect(deriveLifecycle("device", { deviceStatus: "weird-vendor-code" }, NOW)).toBe(
      "unknown",
    );
  });
});

describe("deriveLifecycle — cloud (same status+activity rule, no Intune)", () => {
  test("provider power/provisioning states map via the shared tokens", () => {
    expect(deriveLifecycle("cloud", { deviceStatus: "Running" }, NOW)).toBe("in-use");
    expect(deriveLifecycle("cloud", { deviceStatus: "Succeeded" }, NOW)).toBe("in-use");
    expect(deriveLifecycle("cloud", { deviceStatus: "Deallocated" }, NOW)).toBe("in-stock");
    expect(deriveLifecycle("cloud", { deviceStatus: "Deleting" }, NOW)).toBe("disposed");
  });

  test("falls back to last_seen_at when status is silent", () => {
    expect(deriveLifecycle("cloud", { lastSeenAt: recent(5) }, NOW)).toBe("in-use");
    expect(
      deriveLifecycle("cloud", { lastSeenAt: recent(STALE_SEEN_DAYS + 1) }, NOW),
    ).toBe("retired");
  });

  test("no signal → unknown (graceful)", () => {
    expect(deriveLifecycle("cloud", {}, NOW)).toBe("unknown");
  });
});
