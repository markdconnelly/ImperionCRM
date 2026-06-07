import { PageHeader } from "@/components/ui/page-header";
import { WorkflowForm } from "@/components/workflows/workflow-form";
import { createWorkflowAction } from "../actions";

export default function NewWorkflowPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New workflow"
        description="Create the workflow, then add its steps."
      />
      <WorkflowForm action={createWorkflowAction} />
    </div>
  );
}
