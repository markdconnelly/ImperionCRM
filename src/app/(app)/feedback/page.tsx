import { PageHeader } from "@/components/ui/page-header";
import { FeedbackForm } from "@/components/feedback/feedback-form";

const REPO = "markdconnelly/ImperionCRM";

export default function FeedbackPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Feedback"
        description="Request features and report issues — tracked on GitHub (ADR-0013)."
      >
        <a
          href={`https://github.com/${REPO}/issues`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
        >
          View all on GitHub →
        </a>
      </PageHeader>

      <p className="max-w-lg text-sm text-dim">
        Feature feedback is coupled to GitHub so requests, triage, and release tracking
        live in one place. Submitting opens a prefilled issue you can review before
        posting.
      </p>

      <FeedbackForm />
    </div>
  );
}
