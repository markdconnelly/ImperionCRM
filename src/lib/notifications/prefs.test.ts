import { describe, expect, it } from "vitest";
import {
  buildPrefGrid,
  isNotificationKind,
  isNotificationChannel,
  NOTIFICATION_KINDS,
  NOTIFICATION_CHANNELS,
} from "./prefs";

/**
 * Unit tests for the notification-preference vocabulary + grid overlay
 * (ADR-0064 A3, #601).
 */
describe("buildPrefGrid", () => {
  it("returns one cell per (kind × channel) defaulting to in-app/outbound ON", () => {
    const cells = buildPrefGrid([]);
    expect(cells).toHaveLength(NOTIFICATION_KINDS.length * NOTIFICATION_CHANNELS.length);
    // With no explicit rows every cell is the default-on, non-explicit state.
    expect(cells.every((c) => c.enabled && !c.explicit)).toBe(true);
  });

  it("overlays an explicit mute onto the default grid", () => {
    const cells = buildPrefGrid([{ kind: "assigned", channel: "email", enabled: false }]);
    const muted = cells.find((c) => c.kind === "assigned" && c.channel === "email");
    expect(muted).toMatchObject({ enabled: false, explicit: true });
    // A sibling cell is untouched (still the default).
    const other = cells.find((c) => c.kind === "assigned" && c.channel === "in_app");
    expect(other).toMatchObject({ enabled: true, explicit: false });
  });

  it("honours an explicit enabled=true opt-in as explicit", () => {
    const cells = buildPrefGrid([{ kind: "blocked", channel: "teams", enabled: true }]);
    const cell = cells.find((c) => c.kind === "blocked" && c.channel === "teams");
    expect(cell).toMatchObject({ enabled: true, explicit: true });
  });
});

describe("type guards", () => {
  it("accepts the canonical kinds/channels and rejects junk", () => {
    expect(isNotificationKind("assigned")).toBe(true);
    expect(isNotificationKind("nope")).toBe(false);
    expect(isNotificationChannel("teams")).toBe(true);
    expect(isNotificationChannel("sms")).toBe(false);
  });
});
