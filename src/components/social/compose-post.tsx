"use client";

import { useMemo, useState } from "react";
import { Field, TextArea, TextInput, Select, FormActions } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { SOCIAL_CHANNELS } from "@/lib/social";

/** Per-network soft character guidance for the compose-time preview (not enforced here). */
const CHANNEL_LIMIT: Record<string, number> = {
  facebook: 63206,
  instagram: 2200,
  threads: 500,
  linkedin: 3000,
  messenger: 1000,
};

/**
 * Compose-once → fan-out Builder (ADR-0053, ADR-0124 #3). Author one composition, choose
 * the networks to fan out to (one `social_post_channel` per checked network), optionally
 * link a campaign and pick a schedule. Save persists a DRAFT via the backend; nothing
 * publishes here — publish is a cockpit-gated Social Action (ADR-0058).
 */
export function ComposePost({
  action,
  campaigns,
}: {
  action: (formData: FormData) => void | Promise<void>;
  campaigns: { id: string; name: string }[];
}) {
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [scheduleMode, setScheduleMode] = useState("draft");

  const toggle = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const previews = useMemo(
    () =>
      SOCIAL_CHANNELS.filter((c) => selected.includes(c.key)).map((c) => ({
        ...c,
        limit: CHANNEL_LIMIT[c.key] ?? 0,
        over: CHANNEL_LIMIT[c.key] ? body.length > CHANNEL_LIMIT[c.key] : false,
      })),
    [selected, body],
  );

  return (
    <div className="flex flex-wrap items-start gap-6">
      <form
        action={action}
        className="flex max-w-lg flex-1 basis-96 flex-col gap-4 rounded-xl border border-border bg-panel p-5"
      >
        {/* Selected channels ride along as repeated hidden inputs (the fan-out set). */}
        {selected.map((key) => (
          <input key={key} type="hidden" name="channel" value={key} />
        ))}

        <Field label="Post copy">
          <TextArea
            name="body"
            rows={7}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What do you want to say across your networks?"
          />
        </Field>

        <div>
          <span className="mb-1 block text-xs text-dim">Fan out to</span>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_CHANNELS.map((c) => {
              const on = selected.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggle(c.key)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                    on
                      ? "border-accent bg-accent/10 text-text"
                      : "border-border text-dim hover:text-text"
                  }`}
                >
                  <Icon name={c.icon} size={12} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {campaigns.length > 0 ? (
          <Field label="Attribute to campaign (optional)">
            <Select name="campaignId" defaultValue="">
              <option value="">— none —</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Schedule">
            <Select
              name="scheduleMode"
              value={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.value)}
            >
              <option value="draft">Save as draft</option>
              <option value="absolute">At a specific time</option>
            </Select>
          </Field>
          {scheduleMode === "absolute" ? (
            <Field label="Publish at">
              <TextInput type="datetime-local" name="scheduledAt" required />
            </Field>
          ) : null}
        </div>

        <p className="rounded-md border border-border bg-panel-2 p-2.5 text-xs text-dim">
          Publishing is governed: every publish, reply, and boost is a Social Action through
          the approval cockpit (human-approved in v1). Saving here only drafts the post —
          nothing posts to any network now.
        </p>

        <FormActions cancelHref="/social/publishing" submitLabel="Save draft" />
      </form>

      <aside className="w-80 shrink-0 rounded-xl border border-border bg-panel-2 p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-dim">Per-network preview</p>
        {previews.length === 0 ? (
          <p className="text-sm text-dim">Pick one or more networks to see how it fans out.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {previews.map((p) => (
              <li key={p.key}>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                  <Icon name={p.icon} size={12} />
                  {p.label}
                  {p.over ? (
                    <span className="text-rose-400">· over {p.limit} chars</span>
                  ) : (
                    <span className="text-dim">· {body.length} chars</span>
                  )}
                </div>
                <p className="whitespace-pre-wrap rounded-md border border-border bg-panel p-2 text-sm">
                  {body || <span className="text-dim">Your copy renders here.</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
