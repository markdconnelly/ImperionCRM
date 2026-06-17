import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageCampaigns } from "@/lib/auth/roles";
import { getRepositories } from "@/lib/data";
import { TemplateForm } from "@/components/message-templates/template-form";

export const dynamic = "force-dynamic";

// Edit a message template (#731). Writes gated by canManageCampaigns (admin | sales).
export default async function EditMessageTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const roles = await getSessionRoles();
  if (!canManageCampaigns(roles)) redirect("/message-templates");

  const { id } = await params;
  const { messageTemplates } = getRepositories();
  const template = await messageTemplates.getTemplate(id);
  if (!template) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit message template"
        description={`Template id: ${template.id} — referenced by journey send steps.`}
      />
      <TemplateForm template={template} />
    </div>
  );
}
