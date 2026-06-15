import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { deleteIntakeFormAction } from "./actions";

/**
 * Intake-form manager (ADR-0070 E3, #354). Internal, staff-authenticated forms
 * that create a task on submit, routed to a default project/queue. Authoring/delete
 * is `delivery:write` (canManageProjects); everyone may view + submit.
 */
export default async function IntakeFormsPage() {
  const { crm } = getRepositories();
  const [roles, forms] = await Promise.all([getSessionRoles(), crm.listIntakeForms()]);
  const canWrite = canManageProjects(roles);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Intake forms"
        description="Internal request forms that create a task on submit, routed to a default project and queue."
      >
        <Link href="/tasks" className="text-sm text-dim transition-colors hover:text-text">
          ← Tasks
        </Link>
        {canWrite && (
          <Link
            href="/intake/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New form
          </Link>
        )}
      </PageHeader>

      {forms.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel p-8 text-center text-sm text-dim">
          No intake forms yet.{canWrite && " Create one to start filing requests as tasks."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {forms.map((f) => (
            <li key={f.id} className="rounded-xl border border-border bg-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/intake/${f.id}`} className="font-medium hover:text-accent">
                  {f.name}
                </Link>
                {!f.isActive && (
                  <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] text-dim">inactive</span>
                )}
              </div>
              {f.description && <p className="mt-1 text-xs text-dim">{f.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-dim">
                <span className="rounded-full bg-panel-2 px-2 py-0.5">{f.defaultProjectName ?? "No project"}</span>
                <span className="rounded-full bg-panel-2 px-2 py-0.5">{f.defaultCategory}</span>
                <span>
                  {f.fieldCount} {f.fieldCount === 1 ? "field" : "fields"} · {f.submissionCount}{" "}
                  {f.submissionCount === 1 ? "submission" : "submissions"}
                </span>
              </div>
              {canWrite && (
                <form action={deleteIntakeFormAction} className="mt-3">
                  <input type="hidden" name="id" value={f.id} />
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
