"use client";

import { useMemo, useState } from "react";
import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import type { AudienceRow } from "@/types";

/** Sample values for the rendered merge-field preview (ADR-0053 §3). */
const SAMPLE: Record<string, string> = {
  first_name: "Jordan",
  last_name: "Rivera",
  company: "Contoso Manufacturing",
  event_name: "Security Readiness Webinar",
};

function renderMergeFields(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, f: string) => SAMPLE[f] ?? `[${f}]`);
}

/** GSM-7 ~160 chars/segment (153 when concatenated) — close enough for compose-time guidance. */
function smsSegments(text: string): number {
  if (text.length === 0) return 0;
  return text.length <= 160 ? 1 : Math.ceil(text.length / 153);
}

/**
 * Email/SMS blast composer (ADR-0053 §3–§4): typed template + merge-field preview,
 * segment-aware SMS counter, and the two scheduling grains. Save/schedule only —
 * nothing fires until the backend executor exists.
 */
export function SendComposer({
  action,
  campaignId,
  channel,
  audiences,
  eventName,
}: {
  action: (formData: FormData) => void | Promise<void>;
  campaignId: string;
  channel: "email" | "sms";
  audiences: AudienceRow[];
  /** The campaign's linked event, when present — enables event-relative scheduling. */
  eventName: string | null;
}) {
  const [body, setBody] = useState("");
  const [smsText, setSmsText] = useState("");
  const [scheduleMode, setScheduleMode] = useState("draft");
  const [scope, setScope] = useState(eventName ? "event_registrants" : "audience");
  const preview = useMemo(
    () => renderMergeFields(channel === "email" ? body : smsText),
    [channel, body, smsText],
  );
  const segments = smsSegments(smsText);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <form
        action={action}
        className="flex max-w-lg flex-1 basis-96 flex-col gap-4 rounded-xl border border-border bg-panel p-5"
      >
        <input type="hidden" name="campaignId" value={campaignId} />
        <input type="hidden" name="channel" value={channel} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Recipients">
            <Select
              name="recipientScope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="audience">Audience</option>
              {eventName ? (
                <option value="event_registrants">Event registrants ({eventName})</option>
              ) : null}
            </Select>
          </Field>
          {scope === "audience" ? (
            <Field label="Audience">
              <Select name="audienceId" defaultValue="" required>
                <option value="" disabled>
                  Choose…
                </option>
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.memberCount})
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>

        {channel === "email" ? (
          <>
            <Field label="Subject">
              <TextInput name="subject" required placeholder="e.g. {{first_name}}, your seat is reserved" />
            </Field>
            <Field label="Body (markdown · {{first_name}} merge fields)">
              <TextArea
                name="bodyMarkdown"
                rows={8}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </Field>
          </>
        ) : (
          <Field label={`Text · ${smsText.length} chars · ${segments} segment${segments === 1 ? "" : "s"}`}>
            <TextArea
              name="smsText"
              rows={4}
              required
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Schedule">
            <Select
              name="scheduleMode"
              value={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.value)}
            >
              <option value="draft">Save as draft</option>
              <option value="absolute">At a specific time</option>
              {eventName ? <option value="offset">Relative to {eventName}</option> : null}
            </Select>
          </Field>
          {scheduleMode === "absolute" ? (
            <Field label="Send at">
              <TextInput type="datetime-local" name="sendAt" required />
            </Field>
          ) : null}
          {scheduleMode === "offset" ? (
            <Field label="Minutes vs event start (−1440 = 1 day before)">
              <TextInput type="number" name="eventOffsetMinutes" step="1" required defaultValue="-1440" />
            </Field>
          ) : null}
        </div>

        <p className="rounded-md border border-border bg-panel-2 p-2.5 text-xs text-dim">
          Consent is enforced at fire time, per recipient per channel ({channel} opt-in via the
          consent ledger). Recipients materialize when the send fires, never now. Nothing sends
          until the backend executor is live — scheduled blasts wait honestly.
        </p>

        <FormActions cancelHref={`/campaigns/${campaignId}`} />
      </form>

      <aside className="w-80 shrink-0 rounded-xl border border-border bg-panel-2 p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-dim">Rendered preview</p>
        <p className="whitespace-pre-wrap text-sm">
          {preview || <span className="text-dim">Merge fields render with sample values here.</span>}
        </p>
      </aside>
    </div>
  );
}
