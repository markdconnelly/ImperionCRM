"use client";

import { Icon } from "@/components/ui/icon";

/**
 * Per-connection polling-cadence selector (ADR-0038). Lets an operator choose how
 * often the ingestion pipeline polls a connection for new data. Auto-submits on
 * change (no separate save button) via the enclosing form's server action; the
 * pipeline reads `poll_interval_minutes` and acts on it. 0 = manual/paused.
 */
const POLL_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Manual (paused)" },
  { value: 15, label: "Every 15 minutes" },
  { value: 30, label: "Every 30 minutes" },
  { value: 60, label: "Hourly" },
  { value: 360, label: "Every 6 hours" },
  { value: 720, label: "Every 12 hours" },
  { value: 1440, label: "Daily" },
];

export function PollFrequency({
  connectionId,
  value,
  action,
}: {
  connectionId: string;
  value: number;
  action: (formData: FormData) => void | Promise<void>;
}) {
  // If a stored value isn't one of the presets (e.g. set via SQL), show it too so
  // the select reflects reality rather than silently snapping to a preset.
  const options = POLL_OPTIONS.some((o) => o.value === value)
    ? POLL_OPTIONS
    : [...POLL_OPTIONS, { value, label: `Every ${value} minutes` }].sort(
        (a, b) => a.value - b.value,
      );

  return (
    <form action={action} className="mt-1 flex items-center justify-between gap-2">
      <input type="hidden" name="id" value={connectionId} />
      <label
        htmlFor={`poll-${connectionId}`}
        className="flex items-center gap-1 text-[11px] text-dim"
      >
        <Icon name="Clock" size={12} />
        Poll frequency
      </label>
      <select
        id={`poll-${connectionId}`}
        name="pollIntervalMinutes"
        defaultValue={String(value)}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text outline-none focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
