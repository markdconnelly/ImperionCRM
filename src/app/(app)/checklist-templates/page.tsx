import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { deleteChecklistTemplateAction } from "./actions";

/**
 * Checklist-template manager (ADR-0070 E1-F3, #633). Reusable named sets of subtasks
 * that any task can be seeded with via "Apply checklist template" on the task edit
 * page. Authoring/delete is `delivery:write` (canManageProjects); everyone may view.
 * Stored on the project_template / template_item tables (no migration — #633),
 * distinct from project playbooks (the Project templates surface, #352).
 */
export default async function ChecklistTemplatesPage() {
  const { crm } = getRepositories();
  const [roles, templates] = await Promise.all([
    getSessionRoles(),
    crm.listChecklistTemplates(),
  ]);
  const canWrite = canManageProjects(roles);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Checklist templates"
        description="Reusable sets of subtasks. Apply one to a task to seed its checklist."
      >
        <Link href="/project-templates" className="text-sm text-dim transition-colors hover:text-text">
          ← Project templates
        </Link>
        {canWrite && (
          <Link
            href="/checklist-templates/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New checklist
          </Link>
        )}
      </PageHeader>

      {templates.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel p-8 text-center text-sm text-dim">
          No checklist templates yet.{canWrite && " Create one to apply it to a task."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id} className="rounded-xl border border-border bg-panel p-4">
              <div className="font-medium">{t.name}</div>
              {t.description && <p className="mt-1 text-xs text-dim">{t.description}</p>}
              <div className="mt-2 text-xs text-dim">
                {t.itemCount} {t.itemCount === 1 ? "item" : "items"}
              </div>
              {canWrite && (
                <form action={deleteChecklistTemplateAction} className="mt-3">
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
