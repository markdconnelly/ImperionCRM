import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function ProposalsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Proposals"
        description="Draft, send, and track proposals tied to opportunities."
      />
      <ModulePlaceholder
        icon="FileText"
        title="Proposal lifecycle"
        description="Proposals attach to an opportunity and move through draft → sent → accepted, with the document stored in object storage."
        points={[
          "One proposal per opportunity, with status and timestamps",
          "Generated from Kaseya Quote Manager quotes (future feed)",
          "Acceptance advances the opportunity toward onboarding",
        ]}
      />
    </div>
  );
}
