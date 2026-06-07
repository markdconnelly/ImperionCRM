import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TasksTable } from "@/components/tasks/tasks-table";
import { getRepositories } from "@/lib/data";
import { deleteTaskAction } from "./actions";

export default async function TasksPage() {
  const { crm } = getRepositories();
  const tasks = await crm.listTasks();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Tasks" description={`${tasks.length} tasks across sales and delivery`}>
        <Link
          href="/tasks/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          + New task
        </Link>
      </PageHeader>
      <TasksTable tasks={tasks} deleteAction={deleteTaskAction} />
    </div>
  );
}
