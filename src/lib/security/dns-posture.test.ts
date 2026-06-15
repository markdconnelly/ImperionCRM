import { describe, expect, it } from "vitest";
import type { DnsDomainRollup } from "@/types";
import {
  summarizeDnsPosture,
  verdictBadgeClass,
  verdictLabel,
} from "./dns-posture";

function domain(over: Partial<DnsDomainRollup>): DnsDomainRollup {
  return {
    domain: "example.com",
    note: null,
    verdict: null,
    recordsCompliant: 0,
    recordsDrift: 0,
    recordsUngoverned: 0,
    recordsMissing: 0,
    score: null,
    lastCapturedAt: null,
    ...over,
  };
}

describe("DNS verdict badge mapping (#309, ADR-0063)", () => {
  it("colors managed green, in-azure-readonly amber, not-in-azure red, null grey", () => {
    expect(verdictBadgeClass("managed")).toContain("text-green");
    expect(verdictBadgeClass("in-azure-readonly")).toContain("text-amber");
    expect(verdictBadgeClass("not-in-azure")).toContain("text-red");
    expect(verdictBadgeClass(null)).toContain("text-dim");
  });

  it("labels each verdict, with a tracked-but-uncaptured domain reading 'Tracked'", () => {
    expect(verdictLabel("managed")).toBe("Managed");
    expect(verdictLabel("in-azure-readonly")).toBe("In Azure (read-only)");
    expect(verdictLabel("not-in-azure")).toBe("Not in Azure");
    expect(verdictLabel(null)).toBe("Tracked");
  });
});

describe("summarizeDnsPosture (#309)", () => {
  it("worst verdict wins across captured domains and counts/dates aggregate", () => {
    const s = summarizeDnsPosture([
      domain({ domain: "a.com", verdict: "managed", recordsDrift: 1, lastCapturedAt: "2026-06-10" }),
      domain({
        domain: "b.com",
        verdict: "not-in-azure",
        recordsDrift: 2,
        recordsMissing: 3,
        lastCapturedAt: "2026-06-12",
      }),
    ]);
    expect(s.verdict).toBe("not-in-azure"); // worst of the two captured
    expect(s.domainCount).toBe(2);
    expect(s.capturedCount).toBe(2);
    expect(s.recordsDrift).toBe(3);
    expect(s.recordsMissing).toBe(3);
    expect(s.lastCapturedAt).toBe("2026-06-12"); // newest capture
  });

  it("an uncaptured (null-verdict) domain never improves the verdict but still counts", () => {
    const s = summarizeDnsPosture([
      domain({ domain: "a.com", verdict: "in-azure-readonly", lastCapturedAt: "2026-06-11" }),
      domain({ domain: "tracked.io" }), // null verdict, no capture
    ]);
    expect(s.verdict).toBe("in-azure-readonly");
    expect(s.domainCount).toBe(2);
    expect(s.capturedCount).toBe(1);
    expect(s.lastCapturedAt).toBe("2026-06-11");
  });

  it("all-uncaptured rollup is a null verdict with zero captured", () => {
    const s = summarizeDnsPosture([domain({ domain: "x.io" }), domain({ domain: "y.io" })]);
    expect(s.verdict).toBeNull();
    expect(s.domainCount).toBe(2);
    expect(s.capturedCount).toBe(0);
    expect(s.lastCapturedAt).toBeNull();
  });

  it("empty list summarizes to an empty rollup", () => {
    expect(summarizeDnsPosture([])).toEqual({
      verdict: null,
      domainCount: 0,
      capturedCount: 0,
      recordsDrift: 0,
      recordsMissing: 0,
      lastCapturedAt: null,
    });
  });
});
