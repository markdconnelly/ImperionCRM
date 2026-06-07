import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function KnowledgePage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Knowledge"
        description="The client's lifetime history and AI-ready knowledge."
      />
      <ModulePlaceholder
        icon="BrainCircuit"
        title="Lifetime history & knowledge"
        description="The unified interaction timeline (emails, Teams, Plaud calls, meetings, notes) distilled to Gold summaries and embeddings for semantic search and agents."
        points={[
          "Append-only timeline, bronze → silver → gold (ADR-0011)",
          "Semantic search over summaries and documents (pgvector)",
          "Documents from IT Glue / SharePoint, referenced not duplicated",
        ]}
      />
    </div>
  );
}
