import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { TasksTable } from "@/components/tasks/tasks-table";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { getRepositories } from "@/lib/data";
import { deleteTaskAction, moveTaskAction } from "./actions";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "sales", label: "Sales" },
  { key: "project", label: "Project" },
  { key: "onboarding", label: "Onboarding" },
  { key: "general", label: "General" },
] as const;

const VIEWS = [
  { key: "list", label: "List" },
  { key: "board", label: "Board" },
] as const;

/** Preserve the active category when switching view (and vice-versa). */
function href(category: string, view: string) {
  const qs = new URLSearchParams();
  if (category !== "all") qs.set("category", category);
  if (view !== "list") qs.set("view", view);
  const s = qs.toString();
  return s ? `/tasks?${s}` : "/tasks";
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; view?: string }>;
}) {
  const { category, view } = await searchParams;
  const active = category ?? "all";
  const activeView = view === "board" ? "board" : "list";
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex w-fit rounded-lg border border-border bg-panel p-1">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={href(f.key, activeView)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                active === f.key ? "bg-panel-2 text-text" : "text-dim hover:text-text",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="inline-flex w-fit rounded-lg border border-border bg-panel p-1">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={href(active, v.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                activeView === v.key ? "bg-panel-2 text-text" : "text-dim hover:text-text",
              )}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>

      {activeView === "board" ? (
        <TasksBoard tasks={tasks} moveAction={moveTaskAction} />
      ) : (
        <TasksTable tasks={tasks} deleteAction={deleteTaskAction} />
      )}
    </div>
  );
}
