import { describe, expect, test } from "vitest";
import {
  MIN_POLL_MINUTES,
  POLL_OPTIONS,
  normalizeCustomMinutes,
  pollOptionsFor,
} from "@/lib/poll-options";

describe("pollOptionsFor (#91 — the Daily preset must survive the round-trip)", () => {
  test("every preset value resolves to itself, including Daily (1440)", () => {
    for (const preset of [0, 5, 15, 30, 60, 360, 720, 1440]) {
      const options = pollOptionsFor(preset);
      expect(options).toBe(POLL_OPTIONS); // presets render the canonical list
      expect(options.some((o) => o.value === preset)).toBe(true);
    }
  });

  test("Daily is a distinct preset, not coerced toward Hourly", () => {
    const daily = POLL_OPTIONS.find((o) => o.value === 1440);
    expect(daily?.label).toBe("Daily");
    expect(POLL_OPTIONS.filter((o) => o.value === 1440)).toHaveLength(1);
  });

  test("5 minutes is a preset (the sub-15 floor is gone, #1789)", () => {
    expect(POLL_OPTIONS.find((o) => o.value === 5)?.label).toBe("Every 5 minutes");
    expect(POLL_OPTIONS).toHaveLength(8);
  });

  test("a non-preset stored value is surfaced as its own option, in sort order", () => {
    const options = pollOptionsFor(45);
    expect(options.map((o) => o.value)).toEqual([0, 5, 15, 30, 45, 60, 360, 720, 1440]);
    expect(options.find((o) => o.value === 45)?.label).toBe("Every 45 minutes");
    // and the canonical preset list is never mutated
    expect(POLL_OPTIONS).toHaveLength(8);
  });
});

describe("normalizeCustomMinutes (#1789 — custom-entry clamping)", () => {
  test("floors a fractional value to a whole minute", () => {
    expect(normalizeCustomMinutes(5.9)).toBe(5);
  });

  test("clamps sub-minimum / non-finite input up to MIN_POLL_MINUTES", () => {
    expect(normalizeCustomMinutes(0)).toBe(MIN_POLL_MINUTES);
    expect(normalizeCustomMinutes(0.4)).toBe(MIN_POLL_MINUTES);
    expect(normalizeCustomMinutes(-3)).toBe(MIN_POLL_MINUTES);
    expect(normalizeCustomMinutes(Number.NaN)).toBe(MIN_POLL_MINUTES);
  });

  test("passes a normal cadence through (e.g. a 5-minute social poll)", () => {
    expect(normalizeCustomMinutes(5)).toBe(5);
    expect(normalizeCustomMinutes(1440)).toBe(1440);
  });
});
