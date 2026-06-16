/**
 * Execute a SAVED report definition (ADR-0075, #412) — the dashboard-tile counterpart
 * of the builder's live preview (#411). Re-validates + RBAC-strips the stored selection
 * against the VIEWER's roles (run-time enforcement, ADR-0075 §2 — a report shared by an
 * admin still strips money for a support viewer), loads the curated source rows, and
 * shapes them with the pure runner. Returns `null` when nothing the viewer may see
 * survives validation.
 *
 * Server-only: it resolves repositories via the curated loader.
 */
import "server-only";
import type { AppRole } from "@/lib/auth/roles";
import type { Repositories } from "@/lib/data/repositories";
import type { ReportDefinition } from "@/types";
import { validateReportSelection } from "@/lib/reporting/semantic-model";
import { loadReportRows } from "@/lib/reporting/curated-sources";
import { runReport, type ReportResult } from "@/lib/reporting/report-runner";
import { selectionFromDefinition, filtersFromDefinition } from "@/lib/reporting/saved-report";

export async function runSavedReport(
  def: ReportDefinition,
  roles: readonly AppRole[] | undefined,
  repos: Repositories,
): Promise<ReportResult | null> {
  const { selection } = validateReportSelection(selectionFromDefinition(def), roles);
  if (!selection || selection.fields.length === 0) return null;
  const rows = await loadReportRows(selection.root_object, repos);
  return runReport(selection, rows, filtersFromDefinition(def));
}
