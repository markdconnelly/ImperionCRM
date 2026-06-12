import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import type { EventDetail, WorkflowRow } from "@/types";

/**
 * The webinar / live-event builder (ADR-0053 §3): one structured form whose
 * channel-specific fields follow the kind — Teams join link for webinars, venue
 * for live events — plus the typed registration-page config, with a live-ish
 * preview card rendered server-side from the defaults (re-rendered on save).
 */
export function EventForm({
  action,
  kind,
  event,
  workflows,
}: {
  action: (formData: FormData) => void | Promise<void>;
  kind: "webinar" | "live_event";
  event?: EventDetail | null;
  /** Workflows registrants auto-enroll into on resolution (ADR-0053 §4, #112). */
  workflows?: WorkflowRow[];
}) {
  const isWebinar = kind === "webinar";
  return (
    <div className="flex flex-wrap items-start gap-6">
      <form
        action={action}
        className="flex max-w-lg flex-1 basis-96 flex-col gap-4 rounded-xl border border-border bg-panel p-5"
      >
        {event ? <input type="hidden" name="id" value={event.id} /> : null}
        <input type="hidden" name="kind" value={kind} />

        <Field label="Name">
          <TextInput name="name" required defaultValue={event?.name} />
        </Field>
        <Field label="Description">
          <TextArea name="description" rows={3} defaultValue={event?.description ?? ""} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select name="status" defaultValue={event?.status ?? "draft"}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </Select>
          </Field>
          <Field label="Capacity">
            <TextInput
              type="number"
              name="capacity"
              min="0"
              step="1"
              defaultValue={event?.capacity ?? ""}
              placeholder="unlimited"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts (required to leave draft)">
            <TextInput type="datetime-local" name="startsAt" />
          </Field>
          <Field label="Ends">
            <TextInput type="datetime-local" name="endsAt" />
          </Field>
        </div>
        <Field label="Timezone">
          <TextInput name="timezone" placeholder="e.g. America/New_York" defaultValue={event?.timezone ?? ""} />
        </Field>

        {isWebinar ? (
          <Field label="Teams join link">
            <TextInput
              type="url"
              name="joinUrl"
              placeholder="https://teams.microsoft.com/…"
              defaultValue={event?.joinUrl ?? ""}
            />
          </Field>
        ) : (
          <Field label="Venue / location">
            <TextInput name="location" defaultValue={event?.location ?? ""} />
          </Field>
        )}

        <div className="rounded-lg border border-border bg-panel-2 p-3">
          <p className="mb-2 text-xs font-medium text-dim">Registration page</p>
          <div className="flex flex-col gap-3">
            <Field label="Headline">
              <TextInput
                name="registrationHeadline"
                defaultValue={event?.registrationHeadline ?? ""}
              />
            </Field>
            <Field label="Blurb">
              <TextArea name="registrationBlurb" rows={2} defaultValue={event?.registrationBlurb ?? ""} />
            </Field>
          </div>
        </div>

        {workflows && workflows.length > 0 ? (
          <Field label="Auto-enroll registrants into workflow (optional)">
            <Select name="workflowId" defaultValue={event?.workflowId ?? ""}>
              <option value="">— none —</option>
              {workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <FormActions cancelHref="/events" />
      </form>

      {/* Preview card — what the registration page leads with. */}
      <aside className="w-72 shrink-0 rounded-xl border border-border bg-panel-2 p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-dim">Preview</p>
        <p className="text-xs text-dim">
          {isWebinar ? "Webinar" : "Live event"} · registration feeds the capture inbox
        </p>
        <p className="mt-2 font-display text-sm font-semibold">
          {event?.registrationHeadline ?? event?.name ?? "Your headline"}
        </p>
        <p className="mt-1 text-xs text-dim">
          {event?.registrationBlurb ?? "Registration blurb appears here."}
        </p>
        <p className="mt-3 text-xs text-dim">
          Fields: full name · email
        </p>
      </aside>
    </div>
  );
}
