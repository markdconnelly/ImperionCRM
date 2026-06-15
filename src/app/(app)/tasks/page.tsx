import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { TasksTable } from "@/components/tasks/tasks-table";
import { TasksBoard, type TaskGroupBy, type TaskSwimBy } from "@/components/tasks/tasks-board";
import { getRepositories } from "@/lib/data";
import { TagChip } from "@/components/tags/tag-chip";
import { deleteTaskAction, moveTaskAction, moveTaskCategoryAction } from "./actions";
import {
  applyTagAction,
  applyExistingTagAction,
  removeTagAction,
} from "./tag-actions";

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

const GROUPS = [
  { key: "status", label: "Status" },
  { key: "category", label: "Category" },
] as const;

const SWIMS = [
  { key: "none", label: "None" },
  { key: "account", label: "Account" },
  { key: "category", label: "Category" },
] as const;

/** Preserve the active category / group / swimlane / tag when switching view. */
function href(category: string, view: string, group: string, swim: string, tag: string) {
  const qs = new URLSearchParams();
  if (category !== "all") qs.set("category", category);
  if (view !== "list") qs.set("view", view);
  if (group !== "status") qs.set("group", group);
  if (swim !== "none") qs.set("swim", swim);
  if (tag) qs.set("tag", tag);
  const s = qs.toString();
  return s ? `/tasks?${s}` : "/tasks";
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    view?: string;
    group?: string;
    swim?: string;
    tag?: string;
  }>;
}) {
  const { category, view, group, swim, tag } = await searchParams;
  const active = category ?? "all";
  const activeView = view === "board" ? "board" : "list";
  const activeGroup: TaskGroupBy = group === "category" ? "category" : "status";
  // A swimlane that duplicates the active column group-by is meaningless — drop it.
  const activeSwim: TaskSwimBy =
    (swim === "account" || swim === "category") && swim !== activeGroup ? swim : "none";
  const { crm, tags } = getRepositories();
  const all = await crm.listTasks();
  const byCategory = active === "all" ? all : all.filter((t) => t.category === active);

  // Tags (ADR-0065 B6, #340): the vocabulary for pickers + a parentId→chips map for
  // the visible tasks. The `?tag=` filter narrows to tasks carrying that tag (the
  // B6 acceptance: filter all "urgent" work).
  const [vocabulary, tagsByTask] = await Promise.all([
    tags.listTags(),
    tags.listTagsForMany(
      "task",
      byCategory.map((t) => t.id),
    ),
  ]);
  const activeTag = tag && vocabulary.some((v) => v.id === tag) ? tag : "";
  const tasks = activeTag
    ? byCategory.filter((t) => (tagsByTask[t.id] ?? []).some((x) => x.id === activeTag))
    : byCategory;

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
              href={href(f.key, activeView, activeGroup, activeSwim, activeTag)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                active === f.key ? "bg-panel-2 text-text" : "text-dim hover:text-text",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {activeView === "board" && (
            <div className="inline-flex w-fit items-center rounded-lg border border-border bg-panel p-1">
              <span className="px-2 text-xs text-dim">Group</span>
              {GROUPS.map((g) => (
                <Link
                  key={g.key}
                  href={href(active, activeView, g.key, activeSwim, activeTag)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    activeGroup === g.key ? "bg-panel-2 text-text" : "text-dim hover:text-text",
                  )}
                >
                  {g.label}
                </Link>
              ))}
            </div>
          )}

          {activeView === "board" && (
            <div className="inline-flex w-fit items-center rounded-lg border border-border bg-panel p-1">
              <span className="px-2 text-xs text-dim">Swimlane</span>
              {SWIMS.filter((s) => s.key !== activeGroup).map((s) => (
                <Link
                  key={s.key}
                  href={href(active, activeView, activeGroup, s.key, activeTag)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    activeSwim === s.key ? "bg-panel-2 text-text" : "text-dim hover:text-text",
                  )}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          )}

          <div className="inline-flex w-fit rounded-lg border border-border bg-panel p-1">
            {VIEWS.map((v) => (
              <Link
                key={v.key}
                href={href(active, v.key, activeGroup, activeSwim, activeTag)}
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
      </div>

      {/* Tag filter strip (ADR-0065 B6, #340): click a tag to show only tasks
          carrying it across every category/project; click again to clear. */}
      {vocabulary.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-dim">Tags</span>
          {vocabulary.map((v) => {
            const selected = activeTag === v.id;
            return (
              <Link
                key={v.id}
                href={href(active, activeView, activeGroup, activeSwim, selected ? "" : v.id)}
                className={cn(
                  "rounded-full transition-opacity",
                  selected ? "ring-2 ring-text/50" : "opacity-70 hover:opacity-100",
                )}
              >
                <TagChip tag={v} />
              </Link>
            );
          })}
          {activeTag && (
            <Link
              href={href(active, activeView, activeGroup, activeSwim, "")}
              className="ml-1 text-xs text-dim hover:text-text"
            >
              Clear
            </Link>
          )}
        </div>
      )}

      {activeView === "board" ? (
        <TasksBoard
          tasks={tasks}
          groupBy={activeGroup}
          swimBy={activeSwim}
          moveStatusAction={moveTaskAction}
          moveCategoryAction={moveTaskCategoryAction}
        />
      ) : (
        <TasksTable
          tasks={tasks}
          deleteAction={deleteTaskAction}
          tagsByTask={tagsByTask}
          vocabulary={vocabulary}
          applyTagAction={applyTagAction}
          applyExistingTagAction={applyExistingTagAction}
          removeTagAction={removeTagAction}
        />
      )}
    </div>
  );
}
