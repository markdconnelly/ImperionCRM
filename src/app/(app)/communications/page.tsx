import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function CommunicationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Communications"
        description="Email, SMS, and consent across the customer lifecycle."
      />
      <ModulePlaceholder
        icon="MessagesSquare"
        title="Outreach & consent"
        description="Send email/SMS and run nurture sequences, gated by an append-only consent ledger for TCPA/CAN-SPAM/GDPR defensibility."
        points={[
          "Consent ledger per contact and channel (ADR-0014)",
          "Sends blocked unless consent is current",
          "Nurture workflows; powered by an external comms service",
        ]}
      />
    </div>
  );
}
