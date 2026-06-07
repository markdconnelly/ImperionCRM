import { PageHeader } from "@/components/ui/page-header";
import { TaskForm } from "@/components/tasks/task-form";
import { createTaskAction } from "../actions";
import { getRepositories } from "@/lib/data";

export default async function NewTaskPage() {
  const { crm } = getRepositories();
  const accounts = await crm.accountOptions();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="New task" description="Create a task manually." />
      <TaskForm action={createTaskAction} accounts={accounts} />
    </div>
  );
}
