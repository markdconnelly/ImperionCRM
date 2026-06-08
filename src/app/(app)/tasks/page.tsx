import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { TasksTable } from "@/components/tasks/tasks-table";
import { getRepositories } from "@/lib/data";
import { deleteTaskAction } from "./actions";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "sales", label: "Sales" },
  { key: "project", label: "Project" },
  { key: "onboarding", label: "Onboarding" },
  { key: "general", label: "General" },
] as const;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = category ?? "all";
  const { crm } = getRepositories();
  const all = await crm.listTasks();
  const tasks = active === "all" ? all : all.filter((t) => t.category === active);

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

      <div className="inline-flex w-fit rounded-lg border border-border bg-panel p-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/tasks" : `/tasks?category=${f.key}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active === f.key ? "bg-panel-2 text-text" : "text-dim hover:text-text",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <TasksTable tasks={tasks} deleteAction={deleteTaskAction} />
    </div>
  );
}
