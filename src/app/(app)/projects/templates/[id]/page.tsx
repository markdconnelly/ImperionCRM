import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";

/**
 * Read-only view of a delivery-template tree (ADR-0081, #453): phases with their
 * scheduling skeleton and tasks, dispatch-ticket tasks badged. Edit is
 * delete+recreate in v1, so there is no edit form here yet.
 */
export default async function DeliveryTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm } = getRepositories();
  const t = await crm.getDeliveryTemplate(id);
  if (!t) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.name} description={t.description ?? "Delivery template"}>
        <Link href="/projects/templates" className="text-sm text-dim transition-colors hover:text-text">
          ← All templates
        </Link>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 text-xs text-dim">
        <span className="rounded-full bg-panel-2 px-2 py-0.5">v{t.version}</span>
        <span className="rounded-full bg-panel-2 px-2 py-0.5">{t.projectTypeName ?? "Any type"}</span>
        {!t.isActive && <span className="rounded-full bg-panel-2 px-2 py-0.5">inactive</span>}
      </div>

      {t.phases.map((phase) => (
        <section key={phase.id} className="rounded-xl border border-border bg-panel p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-base font-semibold tracking-tight">{phase.name}</h3>
            <span className="text-xs text-dim">
              start +{phase.offsetDays}d · lasts {phase.durationDays}d
            </span>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {phase.tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-panel-2 px-3 py-2 text-sm"
              >
                <span>{task.title}</span>
                <span className="flex items-center gap-2 text-xs text-dim">
                  <span>
                    +{task.offsetDays}d · {task.durationDays}d
                  </span>
                  {task.dispatchesTicket && (
                    <span
                      className="rounded-full bg-accent/15 px-2 py-0.5 text-accent"
                      title={`Queue ${task.ticketQueueId ?? "—"}, fires ${task.ticketLeadDays}d before start`}
                    >
                      ticket −{task.ticketLeadDays}d
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
