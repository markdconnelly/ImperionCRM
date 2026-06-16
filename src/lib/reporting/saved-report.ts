/**
 * Pure conversions between a persisted `report_definition` row and the runner's
 * selection/filters shape (ADR-0075, #412). Kept pure (no pg, no server-only) so a
 * dashboard tile — and the unit tests — can turn a saved report into a runnable
 * selection without a DB. The server-side execution that pairs these with the curated
 * loader lives in `run-saved-report.ts`.
 */
import type { ReportSelection, SelectedField } from "@/lib/reporting/semantic-model";
import type { ReportFilter } from "@/lib/reporting/report-runner";
import type { ReportDefinition } from "@/types";

/** The persisted bits a runnable selection needs (a full ReportDefinition satisfies it). */
export type StoredReport = Pick<ReportDefinition, "rootObject" | "fields" | "groupBy" | "filters">;

/** Reconstruct the registry selection from a stored report (fields/groupBy are jsonb). */
export function selectionFromDefinition(def: StoredReport): ReportSelection {
  const fields = (def.fields as SelectedField[] | undefined) ?? [];
  const groupBy = (def.groupBy as string[] | undefined) ?? [];
  return {
    root_object: def.rootObject,
    fields,
    ...(groupBy.length ? { group_by: groupBy } : {}),
  };
}

/** Reconstruct the builder's filter clauses from a stored report (`filters.clauses`). */
export function filtersFromDefinition(def: StoredReport): ReportFilter[] {
  const clauses = (def.filters as { clauses?: ReportFilter[] } | null)?.clauses;
  return clauses ?? [];
}
