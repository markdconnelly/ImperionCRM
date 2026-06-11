/**
 * Poll-cadence presets for the per-connection selector (ADR-0038). Pure module so
 * the option math is unit-testable (#91 regression: the Daily/1440 preset must
 * survive the save round-trip).
 */
export interface PollOption {
  value: number;
  label: string;
}

export const POLL_OPTIONS: PollOption[] = [
  { value: 0, label: "Manual (paused)" },
  { value: 15, label: "Every 15 minutes" },
  { value: 30, label: "Every 30 minutes" },
  { value: 60, label: "Hourly" },
  { value: 360, label: "Every 6 hours" },
  { value: 720, label: "Every 12 hours" },
  { value: 1440, label: "Daily" },
];

/**
 * The options to render for a stored value. If the value isn't one of the presets
 * (e.g. set via SQL), include it so the select reflects reality rather than
 * silently snapping to a preset.
 */
export function pollOptionsFor(value: number): PollOption[] {
  return POLL_OPTIONS.some((o) => o.value === value)
    ? POLL_OPTIONS
    : [...POLL_OPTIONS, { value, label: `Every ${value} minutes` }].sort(
        (a, b) => a.value - b.value,
      );
}
