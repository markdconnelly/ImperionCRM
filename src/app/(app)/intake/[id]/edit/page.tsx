import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import {
  IntakeFormBuilder,
  type IntakeFormDraft,
} from "@/components/intake/intake-form-builder";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { updateIntakeFormAction } from "../../actions";

/**
 * In-place edit of an existing intake form (ADR-0070 E3, #639). Loads the form's
 * definition, rebuilds it into the builder's draft shape, and patches the row
 * through `updateIntakeFormAction` — the id and `key` are preserved, so prior
 * submissions (`intake_submission.form_id`) survive the edit. Gated to
 * `canManageProjects` (`delivery:write`) — the same gate the update action
 * re-checks server-side.
 */
export default async function EditIntakeFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) redirect(`/intake/${id}`);

  const { crm } = getRepositories();
  const [form, projects] = await Promise.all([crm.getIntakeForm(id), crm.listProjects()]);
  if (!form) notFound();

  // Rebuild the stored definition into the builder's draft shape (options array →
  // the comma-separated string the builder edits).
  const initial: IntakeFormDraft = {
    name: form.name,
    description: form.description ?? "",
    defaultProjectId: form.defaultProjectId ?? "",
    defaultCategory: form.defaultCategory,
    isActive: form.isActive,
    fields: form.fields.map((f) => ({
      label: f.label,
      type: f.type,
      required: f.required,
      mapsTo: f.mapsTo,
      options: f.options.join(", "),
    })),
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Edit ${form.name}`}
        description="Change the fields and routing. Saving edits this form in place — its key and prior submissions are kept."
      />
      <IntakeFormBuilder
        projects={projects}
        action={updateIntakeFormAction}
        initial={initial}
        formId={form.id}
        submitLabel="Save changes"
      />
    </div>
  );
}
