import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { auth } from "@/auth";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import {
  listReportableObjects,
  reportableFields,
  type SelectedField,
} from "@/lib/reporting/semantic-model";
import type { ReportFilter } from "@/lib/reporting/report-runner";
import { ReportBuilderClient, type BuilderInitial } from "../report-builder-client";

/**
 * Open & edit a saved report (ADR-0075, #411). Editing is owner-only — a non-owner
 * (including someone the report is merely shared with) is redirected to the list; the
 * update action re-enforces ownership server-side regardless. Fields are RBAC-filtered
 * the same way as the new-report page (ADR-0075 §2).
 */
export default async function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const email = session?.user?.email ?? null;
  const { reportBuilder } = getRepositories();
  const def = await reportBuilder.getReportDefinition(id, email);
  if (!def || !def.isMine) redirect("/reporting/builder");

  const roles = await getSessionRoles();
  const objects = listReportableObjects(roles).map((o) => ({
    ...o,
    fields: reportableFields(o.key, roles),
  }));

  const groupBy = (def.groupBy as string[]) ?? [];
  const initial: BuilderInitial = {
    id: def.id,
    name: def.name,
    visibility: def.visibility,
    viz: def.viz,
    selection: {
      root_object: def.rootObject,
      fields: (def.fields as SelectedField[]) ?? [],
      ...(groupBy.length ? { group_by: groupBy } : {}),
    },
    filters: ((def.filters?.clauses as ReportFilter[] | undefined) ?? []),
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Edit · ${def.name}`} description="Adjust the report and re-run the preview, then save." />
      <ReportBuilderClient objects={objects} initial={initial} />
    </div>
  );
}
