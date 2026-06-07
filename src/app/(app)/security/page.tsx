import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function SecurityPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Security"
        description="Access control, audit, and PII governance."
      />
      <ModulePlaceholder
        icon="ShieldCheck"
        title="Security & access"
        description="Roles derive from Entra groups; access to PII is audit-logged and agent actions inherit the acting user's scope."
        points={[
          "Entra-sourced roles → app permissions (ADR-0016)",
          "Audit log of actions; PII access logging",
          "Break-glass emergency access (ADR-0008)",
        ]}
      />
    </div>
  );
}
