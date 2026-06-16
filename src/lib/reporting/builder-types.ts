/**
 * Shared report-builder payload types (ADR-0075, #411) — kept in a plain module so
 * BOTH the client builder and the `"use server"` actions can import them ("use server"
 * files may only export async functions, so the payload shape cannot live there).
 */
import type { ReportSelection } from "@/lib/reporting/semantic-model";
import type { ReportFilter } from "@/lib/reporting/report-runner";
import type { ReportVisibility } from "@/types";

/** The builder's full payload — a registry selection + filters + presentation. */
export interface BuilderPayload {
  name: string;
  visibility: ReportVisibility;
  viz: string;
  selection: ReportSelection;
  filters: ReportFilter[];
}
