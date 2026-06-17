import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageCampaigns } from "@/lib/auth/roles";
import { TemplateForm } from "@/components/message-templates/template-form";

export const dynamic = "force-dynamic";

// New message template (#731). Writes are gated by canManageCampaigns (admin | sales).
export default async function NewMessageTemplatePage() {
  const roles = await getSessionRoles();
  if (!canManageCampaigns(roles)) redirect("/message-templates");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New message template"
        description="Create reusable content for a journey send. Email needs a subject (+ optional HTML); SMS needs a body."
      />
      <TemplateForm />
    </div>
  );
}
