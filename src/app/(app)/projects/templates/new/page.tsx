import { PageHeader } from "@/components/ui/page-header";
import { DeliveryTemplateForm } from "@/components/projects/delivery-template-form";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createDeliveryTemplateAction } from "../actions";

/**
 * Author a new delivery template (ADR-0081, #453). Gated to canManageProjects
 * (`delivery:write`) — the same gate the create action re-checks server-side.
 */
export default async function NewDeliveryTemplatePage() {
  const [roles, { crm }] = await Promise.all([getSessionRoles(), Promise.resolve(getRepositories())]);
  if (!canManageProjects(roles)) redirect("/projects/templates");
  const types = await crm.listProjectTypes();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New delivery template"
        description="Define the phases and tasks a won opportunity is provisioned into. Flag tasks that dispatch an Autotask ticket."
      />
      <DeliveryTemplateForm types={types} action={createDeliveryTemplateAction} />
    </div>
  );
}
