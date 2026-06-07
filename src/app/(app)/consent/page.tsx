import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function ConsentPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Consent"
        description="The consent ledger and compliance posture."
      />
      <ModulePlaceholder
        icon="FileCheck"
        title="Consent ledger"
        description="An append-only record of opt-in/opt-out per contact and channel (email, SMS, call recording), with timestamp, source, and proof — a defensible audit trail for TCPA/CAN-SPAM/GDPR."
        points={[
          "Current consent derived from the ledger (ADR-0014)",
          "Outbound sends blocked unless consent is current",
          "Immutable history for dispute defensibility",
        ]}
      />
    </div>
  );
}
