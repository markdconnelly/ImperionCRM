import { describe, expect, test } from "vitest";
import { POLL_OPTIONS, pollOptionsFor } from "@/lib/poll-options";

describe("pollOptionsFor (#91 — the Daily preset must survive the round-trip)", () => {
  test("every preset value resolves to itself, including Daily (1440)", () => {
    for (const preset of [0, 15, 30, 60, 360, 720, 1440]) {
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

  test("a non-preset stored value is surfaced as its own option, in sort order", () => {
    const options = pollOptionsFor(45);
    expect(options.map((o) => o.value)).toEqual([0, 15, 30, 45, 60, 360, 720, 1440]);
    expect(options.find((o) => o.value === 45)?.label).toBe("Every 45 minutes");
    // and the canonical preset list is never mutated
    expect(POLL_OPTIONS).toHaveLength(7);
  });
});
