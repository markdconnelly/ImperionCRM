import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Settings"
        description="Workspace, profile, and platform configuration."
      />
      <ModulePlaceholder
        icon="Settings"
        title="Settings"
        description="Manage your profile, workspace preferences, integration configuration, and the model-routing layer for AI features."
        points={[
          "Profile and notification preferences",
          "Integration + external-service endpoints",
          "AI model-routing configuration (provider-agnostic)",
        ]}
      />
    </div>
  );
}
