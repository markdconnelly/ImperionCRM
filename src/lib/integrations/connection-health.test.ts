import { describe, expect, it } from "vitest";
import {
  inferConnectionHealth,
  inferTokenExpiryHealth,
  TOKEN_EXPIRY_WARN_DAYS,
} from "./connection-health";
import { describeCapabilities } from "./ingest-summary";

const NOW = Date.parse("2026-06-23T12:00:00Z");

/** ISO timestamp `days` days from NOW (negative = in the past). */
function isoFromNow(days: number): string {
  return new Date(NOW + days * 24 * 60 * 60000).toISOString();
}

describe("inferConnectionHealth (ADR-0122 S2)", () => {
  it("no credential → dim, regardless of any stale instance", () => {
    const v = inferConnectionHealth({
      hasCredential: false,
      status: "active",
      lastSyncAt: "2020-01-01T00:00:00Z",
      pollIntervalMinutes: 60,
      nowMs: NOW,
    });
    expect(v.tone).toBe("dim");
  });

  it("error / revoked → red; expired / pending → amber", () => {
    const base = { hasCredential: true, lastSyncAt: null, pollIntervalMinutes: 60, nowMs: NOW };
    expect(inferConnectionHealth({ ...base, status: "error" }).tone).toBe("red");
    expect(inferConnectionHealth({ ...base, status: "revoked" }).tone).toBe("red");
    expect(inferConnectionHealth({ ...base, status: "expired" }).tone).toBe("amber");
    expect(inferConnectionHealth({ ...base, status: "pending" }).tone).toBe("amber");
  });

  it("active + fresh within cadence → green", () => {
    const v = inferConnectionHealth({
      hasCredential: true,
      status: "active",
      lastSyncAt: "2026-06-23T11:30:00Z", // 30m ago, cadence 60m
      pollIntervalMinutes: 60,
      nowMs: NOW,
    });
    expect(v.tone).toBe("green");
    expect(v.label).toBe("Healthy");
  });

  it("active + past 2× cadence → amber stale", () => {
    const v = inferConnectionHealth({
      hasCredential: true,
      status: "active",
      lastSyncAt: "2026-06-23T08:00:00Z", // 4h ago, cadence 60m → stale after 2h
      pollIntervalMinutes: 60,
      nowMs: NOW,
    });
    expect(v.tone).toBe("amber");
    expect(v.label).toBe("Stale");
  });

  it("active, on-demand (cadence 0) → green, no staleness", () => {
    const v = inferConnectionHealth({
      hasCredential: true,
      status: "active",
      lastSyncAt: null,
      pollIntervalMinutes: 0,
      nowMs: NOW,
    });
    expect(v.tone).toBe("green");
  });

  it("active, polled, never synced → amber no-sync-yet", () => {
    const v = inferConnectionHealth({
      hasCredential: true,
      status: "active",
      lastSyncAt: null,
      pollIntervalMinutes: 60,
      nowMs: NOW,
    });
    expect(v.tone).toBe("amber");
    expect(v.label).toBe("No sync yet");
  });
});

describe("inferTokenExpiryHealth (FE #1502)", () => {
  it("no expiry reported → dim 'Expiry unknown' (degrades honestly, never false-green)", () => {
    const v = inferTokenExpiryHealth({ issuedAt: null, expiresAt: null, nowMs: NOW });
    expect(v.tone).toBe("dim");
    expect(v.label).toBe("Expiry unknown");
  });

  it("missing issuedAt but present expiresAt → still computes from expiry", () => {
    const v = inferTokenExpiryHealth({ issuedAt: null, expiresAt: isoFromNow(30), nowMs: NOW });
    expect(v.tone).toBe("green");
    expect(v.label).toBe("Token valid");
  });

  it("expires comfortably in the future → green 'Token valid'", () => {
    const v = inferTokenExpiryHealth({
      issuedAt: isoFromNow(-10),
      expiresAt: isoFromNow(50),
      nowMs: NOW,
    });
    expect(v.tone).toBe("green");
    expect(v.label).toBe("Token valid");
  });

  it("expires within the warning window (≤7 days) → amber 'Expiring soon'", () => {
    const v = inferTokenExpiryHealth({
      issuedAt: isoFromNow(-55),
      expiresAt: isoFromNow(5),
      nowMs: NOW,
    });
    expect(v.tone).toBe("amber");
    expect(v.label).toBe("Expiring soon");
  });

  it("boundary: exactly at the warn window is amber, just past it is green", () => {
    expect(
      inferTokenExpiryHealth({
        issuedAt: null,
        expiresAt: isoFromNow(TOKEN_EXPIRY_WARN_DAYS),
        nowMs: NOW,
      }).tone,
    ).toBe("amber");
    expect(
      inferTokenExpiryHealth({
        issuedAt: null,
        expiresAt: isoFromNow(TOKEN_EXPIRY_WARN_DAYS + 1),
        nowMs: NOW,
      }).tone,
    ).toBe("green");
  });

  it("already past expiry → red 'Expired'", () => {
    const v = inferTokenExpiryHealth({
      issuedAt: isoFromNow(-65),
      expiresAt: isoFromNow(-5),
      nowMs: NOW,
    });
    expect(v.tone).toBe("red");
    expect(v.label).toBe("Expired");
  });

  it("a custom warnWithinDays widens the amber window", () => {
    const v = inferTokenExpiryHealth({
      issuedAt: null,
      expiresAt: isoFromNow(10),
      warnWithinDays: 14,
      nowMs: NOW,
    });
    expect(v.tone).toBe("amber");
  });

  it("unparseable expiry is treated as unknown, not expired", () => {
    const v = inferTokenExpiryHealth({ issuedAt: null, expiresAt: "not-a-date", nowMs: NOW });
    expect(v.tone).toBe("dim");
    expect(v.label).toBe("Expiry unknown");
  });
});

describe("describeCapabilities (ADR-0122 S2)", () => {
  it("groups verbs and humanizes nouns", () => {
    const s = describeCapabilities([
      "ingest:tickets",
      "ingest:companies",
      "write:tickets",
      "ingest:credential-exposures",
    ]);
    expect(s.ingests).toEqual(["tickets", "companies", "credential exposures"]);
    expect(s.writes).toEqual(["tickets"]);
    expect(s.enriches).toEqual([]);
  });

  it("enrich-only connector (apollo)", () => {
    const s = describeCapabilities(["enrich:contacts"]);
    expect(s.ingests).toEqual([]);
    expect(s.enriches).toEqual(["contacts"]);
  });
});
