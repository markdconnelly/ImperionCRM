import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Integrations"
        description="Connections to Microsoft 365, Kaseya, and ad platforms."
      />
      <ModulePlaceholder
        icon="Plug"
        title="External systems"
        description="Manage connections and the identity map that links each account to its records across systems. Some sources ingest into the timeline; others are polled on demand."
        points={[
          "Ingest: M365 email/Teams, Plaud calls, Facebook",
          "Poll, never duplicated: Autotask tickets, IT Glue",
          "Credentials in Key Vault; runs in an external service (ADR-0012/0018)",
        ]}
      />
    </div>
  );
}
