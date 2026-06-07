import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function WorkflowsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Workflows"
        description="Automated sequences triggered across the lifecycle."
      />
      <ModulePlaceholder
        icon="Workflow"
        title="Workflow automation"
        description="In-app nurture and operational sequences (e.g. when a lead enters, request consent then follow up). Steps run in the app; Power Automate only fires the actual send/notify."
        points={[
          "Workflow + steps + enrollment model (ADR-0014)",
          "Consent-gated sends (see Consent)",
          "Triggers on lifecycle and pipeline events",
        ]}
      />
    </div>
  );
}
