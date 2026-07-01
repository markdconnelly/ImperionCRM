"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { MIN_POLL_MINUTES, pollOptionsFor } from "@/lib/poll-options";

/** Sentinel select value that switches the control into free-entry minute mode. */
const CUSTOM = "custom";

/**
 * Per-connection polling-cadence selector (ADR-0038). Lets an operator choose how
 * often the ingestion pipeline polls a connection for new data. Auto-submits on
 * change (no separate save button) via the enclosing form's server action; the
 * pipeline reads `poll_interval_minutes` and acts on it. 0 = manual/paused.
 *
 * Beyond the presets, a **Custom…** entry (#1789) reveals a minutes input so any
 * cadence down to `MIN_POLL_MINUTES` can be dialed (e.g. a 5-minute social poll) —
 * "Daily" is just the 1440-minute preset. The stored value is minute-based end to
 * end; `setPollIntervalAction` already floors + persists any non-negative value.
 *
 * The select is CONTROLLED (#91): React 19 resets uncontrolled form fields to
 * their defaultValue when a form action resolves, which visually snapped a
 * just-saved cadence back to the previous one (the DB write succeeded; only the
 * display reverted, and an uncontrolled select never picks up the revalidated
 * defaultValue without a remount). Controlled state is immune to the action
 * reset; the effect re-syncs it when the server round-trip lands a new value.
 */
export function PollFrequency({
  connectionId,
  value,
  action,
}: {
  connectionId: string;
  value: number;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [selected, setSelected] = useState(String(value));
  const [custom, setCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(String(Math.max(value, MIN_POLL_MINUTES)));
  // A saved value round-trips back through `value`: re-sync and leave custom mode so the
  // select shows the now-listed cadence (pollOptionsFor surfaces a non-preset value).
  useEffect(() => {
    setSelected(String(value));
    setCustom(false);
    setCustomMinutes(String(Math.max(value, MIN_POLL_MINUTES)));
  }, [value]);

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

      {custom ? (
        <span className="flex items-center gap-1">
          <input
            type="number"
            name="pollIntervalMinutes"
            aria-label="Custom poll interval in minutes"
            min={MIN_POLL_MINUTES}
            step={1}
            value={customMinutes}
            autoFocus
            onChange={(e) => setCustomMinutes(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            className="w-16 rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text outline-none focus:border-accent"
          />
          <span className="text-[11px] text-dim">min</span>
          <button
            type="submit"
            className="rounded-md border border-border px-2 py-1 text-xs text-dim transition-colors hover:text-text"
          >
            Set
          </button>
          <button
            type="button"
            title="Back to presets"
            onClick={() => {
              setCustom(false);
              setSelected(String(value));
            }}
            className="rounded-md p-1 text-dim hover:text-text"
          >
            <Icon name="X" size={12} />
          </button>
        </span>
      ) : (
        <select
          id={`poll-${connectionId}`}
          name="pollIntervalMinutes"
          value={selected}
          onChange={(e) => {
            const next = e.currentTarget.value;
            if (next === CUSTOM) {
              // Seed the input from the current cadence and swap to free entry; do NOT submit yet.
              setCustomMinutes(String(Math.max(value, MIN_POLL_MINUTES)));
              setCustom(true);
              return;
            }
            setSelected(next);
            e.currentTarget.form?.requestSubmit();
          }}
          className="rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text outline-none focus:border-accent"
        >
          {pollOptionsFor(value).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value={CUSTOM}>Custom…</option>
        </select>
      )}
    </form>
  );
}
