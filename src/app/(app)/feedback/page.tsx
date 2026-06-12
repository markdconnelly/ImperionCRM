import { randomUUID } from "node:crypto";
import { PageHeader } from "@/components/ui/page-header";
import { Field, TextInput, TextArea, Select } from "@/components/ui/form";
import { submitFeedbackAction } from "./actions";

/**
 * Feedback files an Autotask ticket in the app-dev queue (#100, ADR-0058 —
 * supersedes ADR-0013's GitHub-issue coupling). The form carries a per-render
 * submission id: the backend's idempotency ledger (backend #19) makes a retried
 * post return the same ticket instead of filing twice.
 */
export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; ref?: string }>;
}) {
  const { status, ref } = await searchParams;
  const submissionId = randomUUID();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Feedback"
        description="Request features and report issues — filed to the app-dev queue (ADR-0058)."
      />

      {status === "filed" && (
        <p className="max-w-lg rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm text-green">
          Thanks — your feedback is filed as ticket #{ref ?? "?"} in the app-dev queue.
          Re-submitting the same form never files twice.
        </p>
      )}
      {status === "error" && (
        <p className="max-w-lg rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
          Your feedback could not be filed right now (the ticket service is unavailable).
          Nothing was saved — please try again shortly.
        </p>
      )}
      {status === "unconfigured" && (
        <p className="max-w-lg rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
          The feedback queue is not configured yet (internal account mapping missing).
          Tell an admin — nothing was filed.
        </p>
      )}

      <p className="max-w-lg text-sm text-dim">
        Feedback lands as a ticket in the app-dev queue in Autotask, where it is triaged
        and tracked like any other work item. You&apos;ll see the ticket number here once
        it&apos;s filed.
      </p>

      <form
        action={submitFeedbackAction}
        className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
      >
        <input type="hidden" name="submissionId" value={submissionId} />
        <Field label="Title">
          <TextInput name="title" placeholder="Short summary of the request" required />
        </Field>
        <Field label="Type">
          <Select name="type" defaultValue="enhancement">
            <option value="enhancement">Feature request</option>
            <option value="bug">Bug</option>
            <option value="documentation">Docs</option>
          </Select>
        </Field>
        <Field label="Detail">
          <TextArea name="detail" rows={4} placeholder="What should it do, and why?" />
        </Field>
        <div>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            File feedback →
          </button>
        </div>
        <p className="text-[11px] text-dim">
          Files a ticket in the app-dev queue under Imperion&apos;s internal account.
          Retrying a failed submission is safe — the same submission can never file twice.
        </p>
      </form>
    </div>
  );
}
