"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { pollOptionsFor } from "@/lib/poll-options";

/**
 * Per-connection polling-cadence selector (ADR-0038). Lets an operator choose how
 * often the ingestion pipeline polls a connection for new data. Auto-submits on
 * change (no separate save button) via the enclosing form's server action; the
 * pipeline reads `poll_interval_minutes` and acts on it. 0 = manual/paused.
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
  useEffect(() => {
    setSelected(String(value));
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
      <select
        id={`poll-${connectionId}`}
        name="pollIntervalMinutes"
        value={selected}
        onChange={(e) => {
          setSelected(e.currentTarget.value);
          e.currentTarget.form?.requestSubmit();
        }}
        className="rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text outline-none focus:border-accent"
      >
        {pollOptionsFor(value).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
