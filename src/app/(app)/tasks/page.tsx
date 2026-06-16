import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { TasksTable } from "@/components/tasks/tasks-table";
import { TasksBoard, type TaskGroupBy, type TaskSwimBy } from "@/components/tasks/tasks-board";
import { TasksCalendar } from "@/components/tasks/tasks-calendar";
import { TaskSavedViews } from "@/components/tasks/task-saved-views";
import { parseMonth } from "@/lib/calendar";
import { getRepositories } from "@/lib/data";
import { parseCustomFieldFilter, encodeCustomFieldFilter } from "@/lib/custom-fields";
import { TagChip } from "@/components/tags/tag-chip";
import {
  deleteTaskAction,
  moveTaskStatusDefAction,
  moveTaskCategoryAction,
  moveTaskDueAction,
} from "./actions";
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
  { key: "calendar", label: "Calendar" },
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

/** Preserve the active category / group / swimlane / tag / custom-field / month when switching view. */
function href(
  category: string,
  view: string,
  group: string,
  swim: string,
  tag: string,
  month = "",
  cf = "",
) {
  const qs = new URLSearchParams();
  if (category !== "all") qs.set("category", category);
  if (view !== "list") qs.set("view", view);
  if (group !== "status") qs.set("group", group);
  if (swim !== "none") qs.set("swim", swim);
  if (tag) qs.set("tag", tag);
  if (month) qs.set("month", month);
  if (cf) qs.set("cf", cf);
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
    month?: string;
    cf?: string;
  }>;
}) {
  const { category, view, group, swim, tag, month, cf } = await searchParams;
  const active = category ?? "all";
  const activeView = view === "board" ? "board" : view === "calendar" ? "calendar" : "list";
  // Calendar month (ADR-0066 C2) — resolved against the server's "today" so the
  // default month and the highlighted day are SSR-stable.
  const todayIso = new Date().toISOString().slice(0, 10);
  const { year, month: monthNum } = parseMonth(month, todayIso);
  const activeMonth = activeView === "calendar" ? `${year}-${String(monthNum).padStart(2, "0")}` : "";
  const activeGroup: TaskGroupBy = group === "category" ? "category" : "status";
  // A swimlane that duplicates the active column group-by is meaningless — drop it.
  const activeSwim: TaskSwimBy =
    (swim === "account" || swim === "category") && swim !== activeGroup ? swim : "none";
  const { crm, tags, customFields } = getRepositories();
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
  const tagged = activeTag
    ? byCategory.filter((t) => (tagsByTask[t.id] ?? []).some((x) => x.id === activeTag))
    : byCategory;

  // Custom-field filter + columns (ADR-0065 B4-F2, #714). The `?cf=key:value`
  // token narrows to tasks whose custom field matches (over the GIN index), and the
  // SAME token rides in the URL so a saved view (#344) captures it for free. Task
  // fields are never project-type-scoped (the migration forces null), so the filter
  // resolves the global task field of that key. Honest degradation: an unknown key
  // (no such defined field) leaves the list unfiltered and shows no column.
  const taskFieldDefs = await customFields.listFieldDefsFor("task", null);
  const cfFilter = parseCustomFieldFilter(cf);
  const activeCf =
    cfFilter && taskFieldDefs.some((d) => d.key === cfFilter.key) ? cfFilter : null;
  let tasks = tagged;
  if (activeCf) {
    const def = taskFieldDefs.find((d) => d.key === activeCf.key)!;
    const matchIds = new Set(
      await customFields.filterByCustomField({
        scope: "task",
        projectTypeId: null,
        fieldKey: activeCf.key,
        op: def.fieldType === "multi_select" ? "contains" : "eq",
        value: activeCf.value,
      }),
    );
    tasks = tagged.filter((t) => matchIds.has(t.id));
  }
  // Batched values for the column — one read over the visible tasks (never N+1).
  // Only render a custom-field column when at least one task field is defined.
  const valuesByTask =
    taskFieldDefs.length > 0
      ? await customFields.listValuesForMany(
          "task",
          tasks.map((t) => t.id),
        )
      : {};

  // Rich-card remainder (#608 C1-F4): assignee avatars + comment/attachment
  // counts, two bulk reads over the visible tasks — board view ONLY (the list
  // and calendar render neither), so the table/calendar paths skip the DB cost.
  const [assigneesByTask, countsByTask] =
    activeView === "board"
      ? await Promise.all([
          crm.listAssigneesForMany(
            "task",
            tasks.map((t) => t.id),
          ),
          crm.listEngagementCountsForMany(
            "task",
            tasks.map((t) => t.id),
          ),
        ])
      : [{}, {}];

  // Status columns for the board (#613, ADR-0065 B5): the resolved task status_def
  // set, ordered by ordinal. Tasks are never project-type-scoped (the 0104 migration
  // forces task rows to scope=global), so this is the single global task set. Board
  // view only — the list/calendar render neither.
  const taskStatusDefs =
    activeView === "board" ? await crm.listStatusDefs("task", null) : [];

  // Saved views (ADR-0066 C4, #344): the current canonical query string the
  // user is looking at, derived from the SAME `href()` builder the toggle uses
  // so a "save" snapshot round-trips exactly. Empty string = default List view.
  const activeCfToken = activeCf ? encodeCustomFieldFilter(activeCf.key, activeCf.value) : "";
  const currentQuery = href(
    active,
    activeView,
    activeGroup,
    activeSwim,
    activeTag,
    activeMonth,
    activeCfToken,
  ).replace(/^\/tasks\??/, "");

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
              href={href(f.key, activeView, activeGroup, activeSwim, activeTag, activeMonth, activeCfToken)}
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
                  href={href(active, activeView, g.key, activeSwim, activeTag, activeMonth, activeCfToken)}
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
                  href={href(active, activeView, activeGroup, s.key, activeTag, activeMonth, activeCfToken)}
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
                href={href(
                  active,
                  v.key,
                  activeGroup,
                  activeSwim,
                  activeTag,
                  v.key === "calendar" ? activeMonth : "",
                  activeCfToken,
                )}
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

      {/* Saved views (ADR-0066 C4, #344): per-user named snapshots of the full
          filter/view query string, persisted client-side (no migration). The
          view toggle already preserves the active filter set across List/Board/
          Calendar via the URL — this lets the user name and recall a filter set. */}
      <TaskSavedViews currentQuery={currentQuery} />

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
                href={href(active, activeView, activeGroup, activeSwim, selected ? "" : v.id, activeMonth, activeCfToken)}
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
              href={href(active, activeView, activeGroup, activeSwim, "", activeMonth, activeCfToken)}
              className="ml-1 text-xs text-dim hover:text-text"
            >
              Clear
            </Link>
          )}
        </div>
      )}

      {/* Custom-field filter strip (ADR-0065 B4-F2, #714): for each select-type task
          field, its options are clickable — pick one to show only tasks with that
          value (over the GIN index). The choice rides in the URL (?cf=key:value), so
          a saved view (#344) captures it for free. Select types are the naturally
          filterable case (the B4 AC); free-text fields are shown as a column only. */}
      {taskFieldDefs
        .filter((d) => d.fieldType === "single_select" || d.fieldType === "multi_select")
        .map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-dim">{d.label}</span>
            {d.options.map((opt) => {
              const token = encodeCustomFieldFilter(d.key, opt);
              const selected = activeCfToken === token;
              return (
                <Link
                  key={opt}
                  href={href(
                    active,
                    activeView,
                    activeGroup,
                    activeSwim,
                    activeTag,
                    activeMonth,
                    selected ? "" : token,
                  )}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs transition-colors",
                    selected
                      ? "border-accent bg-accent/15 text-text"
                      : "border-border text-dim hover:text-text",
                  )}
                >
                  {opt}
                </Link>
              );
            })}
          </div>
        ))}

      {activeView === "board" ? (
        <TasksBoard
          tasks={tasks}
          statusDefs={taskStatusDefs}
          groupBy={activeGroup}
          swimBy={activeSwim}
          tagsByTask={tagsByTask}
          assigneesByTask={assigneesByTask}
          countsByTask={countsByTask}
          moveStatusAction={moveTaskStatusDefAction}
          moveCategoryAction={moveTaskCategoryAction}
        />
      ) : activeView === "calendar" ? (
        <TasksCalendar
          tasks={tasks}
          month={{ year, monthNum }}
          today={todayIso}
          monthHref={(ym) => href(active, "calendar", activeGroup, activeSwim, activeTag, ym, activeCfToken)}
          moveDueAction={moveTaskDueAction}
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
          customFieldsByTask={valuesByTask}
          customFieldDefs={taskFieldDefs}
        />
      )}
    </div>
  );
}
