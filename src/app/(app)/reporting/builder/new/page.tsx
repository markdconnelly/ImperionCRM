import { PageHeader } from "@/components/ui/page-header";
import { getSessionRoles } from "@/lib/auth/session";
import { listReportableObjects, reportableFields } from "@/lib/reporting/semantic-model";
import { ReportBuilderClient } from "../report-builder-client";

/**
 * Author a new report (ADR-0075, #411). The reportable objects/fields are RBAC-filtered
 * server-side (build-time enforcement, ADR-0075 §2) so a field the caller can't see is
 * never offered; the save action re-validates against roles. No capability gate —
 * self-serve reporting is broadly available, like saved views (ADR-0046).
 */
export default async function NewReportPage() {
  const roles = await getSessionRoles();
  const objects = listReportableObjects(roles).map((o) => ({
    ...o,
    fields: reportableFields(o.key, roles),
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New report"
        description="Pick an object, choose fields and grouping, filter, and preview. Save it private or share it with the team."
      />
      <ReportBuilderClient objects={objects} />
    </div>
  );
}
