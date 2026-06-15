import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { deleteProjectTemplateAction } from "./actions";

/**
 * Project-template manager (ADR-0070 E1, #352). Admin-editable project playbooks
 * that the project-create flow instantiates from — generalising the hard-coded
 * onboarding playbook. Authoring/delete is `delivery:write` (canManageProjects);
 * everyone may view. Distinct from Delivery templates (ADR-0081), the sale→delivery
 * provisioning playbooks.
 */
export default async function ProjectTemplatesPage() {
  const { crm } = getRepositories();
  const [roles, templates] = await Promise.all([getSessionRoles(), crm.listProjectTemplates()]);
  const canWrite = canManageProjects(roles);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Project templates"
        description="Reusable project playbooks. Create a project from one to instantiate its milestones and tasks."
      >
        <Link href="/projects" className="text-sm text-dim transition-colors hover:text-text">
          ← Project board
        </Link>
        {canWrite && (
          <Link
            href="/project-templates/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New template
          </Link>
        )}
      </PageHeader>

      {templates.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel p-8 text-center text-sm text-dim">
          No project templates yet.{canWrite && " Create one to instantiate projects from it."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id} className="rounded-xl border border-border bg-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/project-templates/${t.id}`} className="font-medium hover:text-accent">
                  {t.name}
                </Link>
                {t.isProtected && (
                  <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] text-dim">
                    protected
                  </span>
                )}
              </div>
              {t.description && <p className="mt-1 text-xs text-dim">{t.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-dim">
                <span className="rounded-full bg-panel-2 px-2 py-0.5">{t.projectTypeName ?? "Any type"}</span>
                <span>
                  {t.milestoneCount} {t.milestoneCount === 1 ? "milestone" : "milestones"} · {t.itemCount}{" "}
                  {t.itemCount === 1 ? "item" : "items"}
                </span>
              </div>
              {canWrite && !t.isProtected && (
                <form action={deleteProjectTemplateAction} className="mt-3">
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="text-xs text-dim transition-colors hover:text-red">
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
