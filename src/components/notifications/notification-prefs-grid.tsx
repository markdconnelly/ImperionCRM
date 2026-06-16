"use client";

import { useState, useTransition } from "react";
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_CHANNELS,
  KIND_LABEL,
  CHANNEL_LABEL,
  type PrefCell,
} from "@/lib/notifications/prefs";
import type { NotificationKind, NotificationChannel } from "@/types";

/**
 * Per-trigger × per-channel notification preference grid (ADR-0064 A3, #601).
 *
 * One toggle per (trigger kind × channel). Optimistic: the checkbox flips
 * immediately, then a server action persists the desired end-state (the action
 * upserts `notification_pref` scoped to the signed-in user). A failed write
 * reverts the cell. `in_app` is honoured by the FE bell; `email`/`teams` are
 * recorded here and dispatched by the BACKEND (no provider key in the FE).
 */
export function NotificationPrefsGrid({
  cells,
  saveAction,
}: {
  cells: PrefCell[];
  /** Server action: posts {kind, channel, enabled} for the signed-in user. */
  saveAction: (formData: FormData) => Promise<void>;
}) {
  // Local optimistic state, keyed `${kind}|${channel}` → enabled.
  const [state, setState] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const c of cells) m[`${c.kind}|${c.channel}`] = c.enabled;
    return m;
  });
  const [pending, startTransition] = useTransition();

  function toggle(kind: NotificationKind, channel: NotificationChannel, next: boolean) {
    const key = `${kind}|${channel}`;
    const prev = state[key];
    setState((s) => ({ ...s, [key]: next })); // optimistic
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("channel", channel);
    fd.set("enabled", String(next));
    startTransition(async () => {
      try {
        await saveAction(fd);
      } catch {
        setState((s) => ({ ...s, [key]: prev })); // revert on failure
      }
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full max-w-2xl border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-4 font-medium text-dim">Trigger</th>
            {NOTIFICATION_CHANNELS.map((ch) => (
              <th key={ch} className="px-3 py-2 text-center font-medium text-dim">
                {CHANNEL_LABEL[ch]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NOTIFICATION_KINDS.map((kind) => (
            <tr key={kind} className="border-b border-border/60">
              <td className="py-2.5 pr-4 text-text">{KIND_LABEL[kind]}</td>
              {NOTIFICATION_CHANNELS.map((channel) => {
                const key = `${kind}|${channel}`;
                const checked = state[key] ?? true;
                return (
                  <td key={channel} className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${KIND_LABEL[kind]} — ${CHANNEL_LABEL[channel]}`}
                      checked={checked}
                      disabled={pending}
                      onChange={(e) => toggle(kind, channel, e.target.checked)}
                      className="h-4 w-4 rounded border-border bg-panel-2 accent-accent disabled:opacity-50"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
