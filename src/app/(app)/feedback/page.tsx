import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function FeedbackPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Feedback"
        description="Request and prioritize features for Imperion CRM."
      />
      <ModulePlaceholder
        icon="Lightbulb"
        title="Feature feedback"
        description="Employees submit and upvote feature requests; admins triage and prioritize. Accepted items are pushed to GitHub and tracked through release."
        points={[
          "Submit + upvote, admin triage and priority (ADR-0013)",
          "On acceptance, opens a GitHub issue on the project board",
          "Status and release reflected back to submitters",
        ]}
      />
    </div>
  );
}
