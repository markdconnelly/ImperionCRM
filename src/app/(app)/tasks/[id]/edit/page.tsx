import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TaskForm } from "@/components/tasks/task-form";
import { updateTaskAction } from "../../actions";
import { getRepositories } from "@/lib/data";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm } = getRepositories();
  const [task, accounts] = await Promise.all([
    crm.getTask(id),
    crm.accountOptions(),
  ]);
  if (!task) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Edit task" description={task.title} />
      <TaskForm action={updateTaskAction} task={task} accounts={accounts} />
    </div>
  );
}
