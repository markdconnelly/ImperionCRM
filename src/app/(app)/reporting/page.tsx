import { PageHeader } from "@/components/ui/page-header";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";

export default function ReportingPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Reporting"
        description="Operational and revenue analytics across the platform."
      />
      <ModulePlaceholder
        icon="BarChart3"
        title="Reporting & analytics"
        description="Pipeline, MRR, account health, onboarding throughput, and campaign ROI — read from the Gold layer."
        points={[
          "Pipeline and MRR trends over time",
          "Onboarding time-to-live and readiness metrics",
          "Health distribution and at-risk accounts",
        ]}
      />
    </div>
  );
}
