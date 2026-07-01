/**
 * Poll-cadence presets for the per-connection selector (ADR-0038). Pure module so
 * the option math is unit-testable (#91 regression: the Daily/1440 preset must
 * survive the save round-trip).
 */
export interface PollOption {
  value: number;
  label: string;
}

/** Smallest cadence the UI accepts for a live poll (0 is the separate "paused" case). */
export const MIN_POLL_MINUTES = 1;

export const POLL_OPTIONS: PollOption[] = [
  { value: 0, label: "Manual (paused)" },
  { value: 5, label: "Every 5 minutes" },
  { value: 15, label: "Every 15 minutes" },
  { value: 30, label: "Every 30 minutes" },
  { value: 60, label: "Hourly" },
  { value: 360, label: "Every 6 hours" },
  { value: 720, label: "Every 12 hours" },
  { value: 1440, label: "Daily" },
];

/**
 * Clamp/normalise a raw custom-minute entry to a storable cadence. Non-finite or
 * sub-minimum input floors to `MIN_POLL_MINUTES`; a real value is floored to a whole
 * minute. (0 = paused is chosen via the preset, not this path.)
 */
export function normalizeCustomMinutes(raw: number): number {
  if (!Number.isFinite(raw) || raw < MIN_POLL_MINUTES) return MIN_POLL_MINUTES;
  return Math.floor(raw);
}

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
