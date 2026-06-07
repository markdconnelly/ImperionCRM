import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function OnboardingPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Onboarding"
        description="Onboarding and implementation projects for won accounts."
      />
      <ModulePlaceholder
        icon="Rocket"
        title="Delivery projects"
        description="When a deal is won, an onboarding/implementation project tracks the path to a managed customer."
        points={[
          "Tasks and milestones per project",
          "Operational-readiness checklist (validation before handoff)",
          "Handoff record to ongoing managed services",
        ]}
      />
    </div>
  );
}
