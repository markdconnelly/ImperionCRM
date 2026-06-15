import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { IntakeFormBuilder } from "@/components/intake/intake-form-builder";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { createIntakeFormAction } from "../actions";

/**
 * Author a new intake form (ADR-0070 E3, #354). Gated to canManageProjects
 * (`delivery:write`) — the same gate the create action re-checks server-side.
 */
export default async function NewIntakeFormPage() {
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) redirect("/intake");
  const { crm } = getRepositories();
  const projects = await crm.listProjects();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New intake form"
        description="Define the fields a requester fills in and where each answer lands on the created task."
      />
      <IntakeFormBuilder projects={projects} action={createIntakeFormAction} />
    </div>
  );
}
