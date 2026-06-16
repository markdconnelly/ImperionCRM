import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Field, TextInput, TextArea, Select } from "@/components/ui/form";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { submitIntakeFormAction } from "../actions";

/**
 * Fill + submit an intake form (ADR-0070 E3, #354). Renders the form's fields,
 * submits through the `delivery:write`-guarded action (v1 = staff-authenticated),
 * and lists recent submissions (with the task each created). Admins also get the
 * routing summary + a link to the audit trail.
 */
export default async function IntakeFormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { crm } = getRepositories();
  const [form, roles] = await Promise.all([crm.getIntakeForm(id), getSessionRoles()]);
  if (!form) notFound();
  const canManage = canManageProjects(roles);
  // App-user options for any assignee-mapped field's picker (#638). Only fetched
  // when the form actually has an assignee field.
  const hasAssignee = form.fields.some((f) => f.mapsTo === "assignee");
  const [submissions, users] = await Promise.all([
    canManage ? crm.listIntakeSubmissions(id) : Promise.resolve([]),
    hasAssignee ? crm.userOptions() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={form.name} description={form.description ?? "Submit to create a task."}>
        <Link href="/intake" className="text-sm text-dim transition-colors hover:text-text">
          ← Intake forms
        </Link>
        {canManage && (
          <Link
            href={`/intake/${form.id}/edit`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
          >
            Edit
          </Link>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 text-xs text-dim">
        <span className="rounded-full bg-panel-2 px-2 py-0.5">
          Files into: {form.defaultProjectName ?? "no project"}
        </span>
        <span className="rounded-full bg-panel-2 px-2 py-0.5">Queue: {form.defaultCategory}</span>
        {form.defaultOwnerName && (
          <span className="rounded-full bg-panel-2 px-2 py-0.5">Owner: {form.defaultOwnerName}</span>
        )}
      </div>

      {error === "missing" && (
        <p className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
          Please fill in every required field.
        </p>
      )}

      <form action={submitIntakeFormAction} className="flex flex-col gap-4 rounded-xl border border-border bg-panel p-5">
        <input type="hidden" name="formId" value={form.id} />
        {form.fields.map((f) => {
          const name = `f_${f.key}`;
          const label = f.required ? `${f.label} *` : f.label;
          return (
            <Field key={f.key} label={label}>
              {f.mapsTo === "assignee" ? (
                // An assignee-mapped field always picks a real app_user (its answer
                // becomes the task's owner), regardless of the field's input type (#638).
                <Select name={name} required={f.required} defaultValue="">
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              ) : f.type === "textarea" ? (
                <TextArea name={name} rows={3} required={f.required} />
              ) : f.type === "select" ? (
                <Select name={name} required={f.required} defaultValue="">
                  <option value="">Select…</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : (
                <TextInput name={name} type={f.type === "date" ? "date" : "text"} required={f.required} />
              )}
            </Field>
          );
        })}
        <div>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Submit request
          </button>
        </div>
      </form>

      {canManage && (
        <div className="rounded-xl border border-border bg-panel p-5">
          <h2 className="mb-3 text-sm font-medium">Recent submissions</h2>
          {submissions.length === 0 ? (
            <p className="text-sm text-dim">No submissions yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {submissions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-dim">
                    {s.createdAt ? s.createdAt.slice(0, 10) : "—"}
                    {s.submittedBy && ` · ${s.submittedBy}`}
                  </span>
                  {s.createdTaskId ? (
                    <Link href={`/tasks/${s.createdTaskId}/edit`} className="hover:text-accent">
                      {s.taskTitle ?? "View task"}
                    </Link>
                  ) : (
                    <span className="text-dim">{s.taskTitle ?? "task deleted"}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
