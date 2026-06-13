import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { deleteDeliveryTemplateAction } from "./actions";

/**
 * Delivery-template manager (ADR-0081, #453). The authoring surface for the
 * data-driven provisioning playbooks the board picks from when provisioning a
 * won opportunity. Authoring/delete is `delivery:write` (canManageProjects);
 * everyone may view.
 */
export default async function DeliveryTemplatesPage() {
  const { crm } = getRepositories();
  const [roles, templates] = await Promise.all([getSessionRoles(), crm.listDeliveryTemplates()]);
  const canWrite = canManageProjects(roles);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Delivery templates"
        description="Reusable provisioning playbooks. A won opportunity is provisioned from one of these on the board."
      >
        <Link href="/projects" className="text-sm text-dim transition-colors hover:text-text">
          ← Project board
        </Link>
        {canWrite && (
          <Link
            href="/projects/templates/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New template
          </Link>
        )}
      </PageHeader>

      {templates.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel p-8 text-center text-sm text-dim">
          No delivery templates yet.{canWrite && " Create one to provision won deals from it."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id} className="rounded-xl border border-border bg-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/projects/templates/${t.id}`}
                  className="font-medium hover:text-accent"
                >
                  {t.name}
                </Link>
                {!t.isActive && (
                  <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] text-dim">
                    inactive
                  </span>
                )}
              </div>
              {t.description && <p className="mt-1 text-xs text-dim">{t.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-dim">
                <span className="rounded-full bg-panel-2 px-2 py-0.5">v{t.version}</span>
                <span className="rounded-full bg-panel-2 px-2 py-0.5">
                  {t.projectTypeName ?? "Any type"}
                </span>
                <span>
                  {t.phaseCount} {t.phaseCount === 1 ? "phase" : "phases"} · {t.taskCount}{" "}
                  {t.taskCount === 1 ? "task" : "tasks"}
                </span>
              </div>
              {canWrite && (
                <form action={deleteDeliveryTemplateAction} className="mt-3">
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="text-xs text-dim transition-colors hover:text-red"
                  >
                    Delete
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
