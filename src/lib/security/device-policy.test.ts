import { describe, expect, it } from "vitest";
import { classifyDevicePolicy } from "./device-policy";

const NOW = new Date("2026-06-12T12:00:00Z");
const RECENT = "2026-06-11T08:00:00Z"; // 1 day ago
const STALE = "2026-04-01T08:00:00Z"; // > 30 days ago

describe("classifyDevicePolicy (#162, ADR-0051 §6)", () => {
  it("maps a recently-synced compliant device to compliant", () => {
    expect(classifyDevicePolicy("compliant", RECENT, NOW)).toBe("compliant");
  });

  it("is case/whitespace tolerant (bronze flat columns are stringified text)", () => {
    expect(classifyDevicePolicy(" Compliant ", RECENT, NOW)).toBe("compliant");
  });

  it.each(["noncompliant", "conflict", "error", "inGracePeriod"])(
    "maps %s to drift",
    (state) => {
      expect(classifyDevicePolicy(state, RECENT, NOW)).toBe("drift");
    },
  );

  it.each(["unknown", "configManager", "somethingNew", ""])(
    "maps %s (no policy verdict) to ungoverned",
    (state) => {
      expect(classifyDevicePolicy(state, RECENT, NOW)).toBe("ungoverned");
    },
  );

  it("treats a null compliance state with a recent sync as ungoverned", () => {
    expect(classifyDevicePolicy(null, RECENT, NOW)).toBe("ungoverned");
  });

  it("withholds the indicator when the device has not synced recently — even if compliant", () => {
    expect(classifyDevicePolicy("compliant", STALE, NOW)).toBeNull();
    expect(classifyDevicePolicy("noncompliant", STALE, NOW)).toBeNull();
  });

  it("withholds the indicator when last sync is missing or unparseable", () => {
    expect(classifyDevicePolicy("compliant", null, NOW)).toBeNull();
    expect(classifyDevicePolicy("compliant", "not-a-date", NOW)).toBeNull();
  });

  it("accepts a sync exactly at the boundary as still reporting", () => {
    const boundary = new Date(NOW.getTime() - 30 * 86_400_000).toISOString();
    expect(classifyDevicePolicy("compliant", boundary, NOW)).toBe("compliant");
  });
});
