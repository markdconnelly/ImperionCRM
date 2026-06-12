import Link from "next/link";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Field, TextInput, Select } from "@/components/ui/form";
import { getRepositories } from "@/lib/data";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageSales } from "@/lib/auth/roles";
import { groupByDueBucket, splitByOwner } from "@/lib/sales-queue";
import type { SalesTaskRow } from "@/types";
import {
  completeSalesTaskAction,
  createSalesMeetingAction,
  createSalesTaskAction,
} from "./actions";

/**
 * Sales Activity (ADR-0052 §6) — the Sales Queue read model: a rep's open
 * sales tasks grouped by due date and deal, plus recent sales meetings. No new
 * tables; writes (create/complete) are gated by sales:write (canManageSales).
 */
export default async function SalesActivityPage() {
  const { crm, comms } = getRepositories();
  const roles = await getSessionRoles();
  const canWrite = canManageSales(roles);

  const session = await auth();
  const email = session?.user?.email ?? null;
  const currentUserId = email ? await resolveAppUserIdByEmail(email) : null;

  const [tasks, accounts, opportunities, meetings] = await Promise.all([
    crm.listSalesTasks(),
    canWrite ? crm.accountOptions() : Promise.resolve([]),
    canWrite ? crm.opportunityOptions() : Promise.resolve([]),
    // Sales meetings = kind 'meeting' with NO project linkage (ADR-0052 §6).
    comms.listInteractions({ kind: "meeting", noProject: true, limit: 10 }),
  ]);

  const { mine, others } = splitByOwner(tasks, currentUserId);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Sales Activity"
        description={`${tasks.length} open sales tasks across the team`}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          {canWrite && (
            <form
              action={createSalesTaskAction}
              className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-panel p-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <div className="sm:col-span-2 xl:col-span-4 text-sm font-medium text-text">
                New sales task
              </div>
              <Field label="Title">
                <TextInput name="title" placeholder="Call back about renewal…" required />
              </Field>
              <Field label="Account">
                <Select name="accountId" defaultValue="">
                  <option value="">— None —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Deal">
                <Select name="opportunityId" defaultValue="">
                  <option value="">— None —</option>
                  {opportunities.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Due date">
                <TextInput type="date" name="dueAt" />
              </Field>
              <div className="sm:col-span-2 xl:col-span-4">
                <button
                  type="submit"
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
                >
                  Add to my queue
                </button>
              </div>
            </form>
          )}

          <QueueCard title="My sales queue" tasks={mine} today={today} canWrite={canWrite} />

          {others.map((group) => (
            <QueueCard
              key={group.owner}
              title={group.owner}
              tasks={group.tasks}
              today={today}
              canWrite={canWrite}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-xl border border-border bg-panel p-4">
            <h2 className="mb-3 text-sm font-medium text-text">Recent sales meetings</h2>
            {canWrite && (
              <form action={createSalesMeetingAction} className="mb-3 flex flex-col gap-2">
                <TextInput name="title" placeholder="Log a sales meeting…" required />
                <div className="grid grid-cols-2 gap-2">
                  <Select name="accountId" defaultValue="">
                    <option value="">Account —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                  <Select name="opportunityId" defaultValue="">
                    <option value="">Deal —</option>
                    {opportunities.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex gap-2">
                  <TextInput type="date" name="occurredAt" />
                  <button
                    type="submit"
                    className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
                  >
                    + Log
                  </button>
                </div>
              </form>
            )}
            {meetings.length === 0 ? (
              <p className="text-sm text-dim">No meetings logged yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {meetings.map((m) => (
                  <li key={m.id} className="rounded-lg border border-border bg-panel-2 p-3">
                    <Link
                      href={`/communications/${m.id}`}
                      className="block text-sm text-text hover:text-accent"
                    >
                      {m.subject ?? "Meeting"}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-dim">
                      {m.contact && <span>{m.contact}</span>}
                      {m.account && <span>· {m.account}</span>}
                      {m.occurredAt && <span>· {m.occurredAt}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function QueueCard({
  title,
  tasks,
  today,
  canWrite,
}: {
  title: string;
  tasks: SalesTaskRow[];
  today: string;
  canWrite: boolean;
}) {
  const groups = groupByDueBucket(tasks, today);
  return (
    <section className="rounded-xl border border-border bg-panel p-4">
      <h2 className="mb-3 flex items-baseline gap-2 text-sm font-medium text-text">
        {title}
        <span className="text-xs font-normal text-dim">{tasks.length} open</span>
      </h2>
      {groups.length === 0 ? (
        <p className="text-sm text-dim">No open sales tasks. Queue clear.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <div key={g.bucket}>
              <div
                className={
                  g.bucket === "overdue"
                    ? "mb-1 text-xs font-medium text-red"
                    : "mb-1 text-xs font-medium text-dim"
                }
              >
                {g.label}
              </div>
              <ul className="flex flex-col gap-1.5">
                {g.tasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-panel-2 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-text">{t.title}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-dim">
                        {t.opportunity && (
                          <span className="text-accent">{t.opportunity}</span>
                        )}
                        {t.account && <span>{t.account}</span>}
                        {t.due && <span>due {t.due}</span>}
                      </div>
                    </div>
                    {canWrite && (
                      <form action={completeSalesTaskAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-border px-2.5 py-1 text-xs text-dim transition-colors hover:border-green hover:text-green"
                        >
                          Complete
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
