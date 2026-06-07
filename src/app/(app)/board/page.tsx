import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function BoardPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Board of Directors"
        description="AI persona advisors to help grow the business."
      />
      <ModulePlaceholder
        icon="Users"
        title="AI Board of Directors"
        description="Custom persona agents mimicking executive roles (CFO, CMO, COO, …). Consult one 1:1, or convene a board session where members deliberate and synthesize a recommendation."
        points={[
          "Persona agents on the shared agent core (ADR-0015)",
          "Convened sessions with a synthesized recommendation",
          "Reads granted context; walled off from CRM operations",
        ]}
      />
    </div>
  );
}
