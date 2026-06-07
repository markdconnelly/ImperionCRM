import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function AgentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="AI Agents"
        description="Configure the orchestrator and its sub-agents."
      />
      <ModulePlaceholder
        icon="Bot"
        title="Agent platform"
        description="Manage agent definitions — instructions, model routing, and tool scope — for the single orchestrator and its CRM sub-agents. Every run is audited and inherits the acting user's permissions."
        points={[
          "Agent definitions, runs, and memory in Postgres (ADR-0015)",
          "Provider-agnostic model routing (OpenAI / Azure / Claude)",
          "The orchestrator chat lives in the right-hand panel",
        ]}
      />
    </div>
  );
}
