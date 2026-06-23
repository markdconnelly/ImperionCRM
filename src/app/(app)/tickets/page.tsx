import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import type { TicketFilter } from "@/lib/data/repositories";
import { labelTicketStatus, labelTicketPriority } from "@/lib/tickets/autotask-labels";
import {
  createSavedViewAction,
  deleteSavedViewAction,
  renameSavedViewAction,
  setDefaultViewAction,
} from "./actions";

const DAY_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
];

type Params = {
  status?: string;
  priority?: string;
  account?: string;
  queue?: string;
  days?: string;
  view?: string;
  f?: string; // present when the filter form was submitted (even with all-blank values)
  saved?: string;
};

/**
 * The ticket board (ADR-0046): a filter block (status / priority / account /
 * queue / time window) + named saved views — personal and company-shared, with
 * one per-user default that applies when the page opens without explicit
 * filters. The queue select (#219, migration 0074) shows raw Autotask queue
 * ids (label lookup is deferred polish) and hides itself until queue data
 * exists in silver.
 */
export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const session = await auth();
  const email = session?.user?.email ?? null;

  const { engagements, crm } = getRepositories();
  const [views, options, accounts] = await Promise.all([
    engagements.listSavedViews("ticket", email),
    engagements.ticketFilterOptions(),
    crm.listAccounts(),
  ]);

  // Resolve the active filter set: explicit URL params win; a ?view= applies
  // that saved view; otherwise the user's default view (if any) applies.
  const explicit = Boolean(
    params.f || params.status || params.priority || params.account || params.queue || params.days,
  );
  const requestedView = params.view ? views.find((v) => v.id === params.view) : undefined;
  const defaultView = !explicit && !requestedView ? views.find((v) => v.isMine && v.isDefault) : undefined;
  const activeView = requestedView ?? defaultView;

  const raw: Record<string, string | undefined> = activeView
    ? activeView.filters
    : {
        status: params.status,
        priority: params.priority,
        account: params.account,
        queue: params.queue,
        days: params.days,
      };

  const filter: TicketFilter = {
    status: raw.status || undefined,
    priority: raw.priority || undefined,
    accountId: raw.account || undefined,
    queue: raw.queue || undefined,
    openedWithinDays: raw.days ? Number(raw.days) || undefined : undefined,
  };

  const tickets = await engagements.listTickets(filter);
  const filterCount = Object.values(filter).filter((v) => v !== undefined).length;

  // Keep a persisted queue selectable even if no current ticket carries it
  // (e.g. a saved view from before the queue emptied out).
  const queueOptions =
    raw.queue && !options.queues.includes(raw.queue)
      ? [...options.queues, raw.queue]
      : options.queues;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tickets"
        description="Support tickets synced from Autotask, plus items spawned from engagements."
      />

      {params.saved && (
        <div className="rounded-md border border-green/40 bg-green/10 px-4 py-2 text-sm text-green">
          View saved.
        </div>
      )}

      {/* Saved views: chips for mine + company-shared */}
      {views.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-dim">Views:</span>
          <Link
            href="/tickets?f=1"
            className={`rounded-md border px-2.5 py-1 text-xs ${
              !activeView ? "border-accent text-accent" : "border-border text-dim hover:text-text"
            }`}
          >
            All tickets
          </Link>
          {views.map((v) => (
            <span
              key={v.id}
              className={`relative flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
                activeView?.id === v.id
                  ? "border-accent text-accent"
                  : "border-border text-dim"
              }`}
            >
              <Link href={`/tickets?view=${v.id}`} className="hover:text-text">
                {v.name}
              </Link>
              {v.isDefault && v.isMine && <Icon name="Star" size={11} />}
              {v.isShared && (
                <span title={`Shared${v.owner ? ` by ${v.owner}` : ""}`}>
                  <Icon name="Users" size={11} />
                </span>
              )}
              {v.isMine && (
                // Manage menu for views I own (#92): rename, (un)set default, delete.
                // <details> popover — server-rendered, no client JS.
                <details className="group">
                  <summary
                    aria-label={`Manage view ${v.name}`}
                    className="flex cursor-pointer list-none items-center hover:text-text [&::-webkit-details-marker]:hidden"
                  >
                    <Icon name="MoreHorizontal" size={12} />
                  </summary>
                  <div className="absolute left-0 top-full z-10 mt-1 flex w-56 flex-col gap-2 rounded-md border border-border bg-panel-2 p-2 shadow-lg">
                    <form action={renameSavedViewAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={v.id} />
                      <input
                        type="text"
                        name="name"
                        required
                        defaultValue={v.name}
                        aria-label={`Rename view ${v.name}`}
                        className="w-full min-w-0 rounded border border-border bg-panel px-2 py-1 text-xs text-text"
                      />
                      <button type="submit" className="rounded border border-border px-1.5 py-1 text-dim hover:text-text">
                        Rename
                      </button>
                    </form>
                    <div className="flex items-center justify-between gap-1.5">
                      <form action={setDefaultViewAction} className="flex">
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="makeDefault" value={v.isDefault ? "0" : "1"} />
                        <button type="submit" className="flex items-center gap-1 rounded border border-border px-1.5 py-1 text-dim hover:text-text">
                          <Icon name="Star" size={11} />
                          {v.isDefault ? "Clear default" : "Make default"}
                        </button>
                      </form>
                      <form action={deleteSavedViewAction} className="flex">
                        <input type="hidden" name="id" value={v.id} />
                        <button
                          type="submit"
                          aria-label={`Delete view ${v.name}`}
                          className="flex items-center gap-1 rounded border border-border px-1.5 py-1 text-dim hover:text-red"
                        >
                          <Icon name="X" size={11} />
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                </details>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Filter block */}
      <section className="rounded-xl border border-border bg-panel p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
          <Icon name="SlidersHorizontal" size={15} />
          Filters
          {activeView && (
            <span className="rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-normal text-accent">
              viewing “{activeView.name}”
            </span>
          )}
        </h3>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="f" value="1" />
          <Select
            label="Status"
            name="status"
            value={raw.status}
            options={options.statuses.map((s) => ({ value: s, label: labelTicketStatus(s) }))}
          />
          <Select
            label="Priority"
            name="priority"
            value={raw.priority}
            options={options.priorities.map((p) => ({ value: p, label: labelTicketPriority(p) }))}
          />
          <Select
            label="Account"
            name="account"
            value={raw.account}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          />
          {/* Hidden until queue data lands in silver (migration 0074 + pipeline
              merge). Raw Autotask queue ids — labels are deferred polish (#219). */}
          {queueOptions.length > 0 && (
            <Select label="Queue" name="queue" value={raw.queue} options={queueOptions} />
          )}
          <Select label="Opened" name="days" value={raw.days} options={DAY_OPTIONS} />
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            Apply
          </button>
          <Link href="/tickets?f=1" className="px-2 py-2 text-sm text-dim hover:text-text">
            Clear
          </Link>
        </form>

        {/* Save the current filter set as a named view */}
        <form
          action={createSavedViewAction}
          className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3"
        >
          {Object.entries(raw).map(([k, v]) =>
            v ? <input key={k} type="hidden" name={`filter_${k}`} value={v} /> : null,
          )}
          <input
            type="text"
            name="name"
            required
            placeholder="Save current filters as…"
            className="w-56 rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm text-text placeholder:text-dim"
          />
          <label className="flex items-center gap-1.5 text-xs text-dim">
            <input type="checkbox" name="shared" className="accent-[#5B8DEF]" /> Share with company
          </label>
          <label className="flex items-center gap-1.5 text-xs text-dim">
            <input type="checkbox" name="default" className="accent-[#5B8DEF]" /> My default view
          </label>
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
          >
            Save view
          </button>
        </form>
      </section>

      {/* Results */}
      <div className="rounded-lg border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-dim">
          <span>
            {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
            {filterCount > 0 ? ` · ${filterCount} filter${filterCount === 1 ? "" : "s"} applied` : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-dim">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Priority</th>
                <th className="px-4 py-2 font-medium">Opened</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-panel-2">
                  <td className="px-4 py-3 text-dim">
                    <Link href={`/tickets/${t.id}`} className="hover:text-accent">
                      {t.number ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/tickets/${t.id}`} className="hover:text-accent">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-dim">{t.account}</td>
                  <td className="px-4 py-3 text-dim">{labelTicketStatus(t.status)}</td>
                  <td className="px-4 py-3 text-dim">{labelTicketPriority(t.priority)}</td>
                  <td className="px-4 py-3 text-dim">{t.opened ?? "—"}</td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-dim">
                    {filterCount > 0
                      ? "No tickets match these filters."
                      : "No tickets yet. They appear here once Autotask sync runs or one is spawned from an engagement."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Select({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string | undefined;
  options: Array<string | { value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-dim">
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="min-w-36 rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text"
      >
        <option value="">All</option>
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
