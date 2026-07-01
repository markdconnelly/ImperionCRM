/**
 * PostgreSQL-backed repositories (ADR-0007). Reads the real schema and maps rows to
 * the UI shapes. Error paths route through the guarded fallback seam (#193,
 * `./fallback`): with NO database configured they return mock data so the UI still
 * renders; with a database configured they throw `DataUnavailableError` instead of
 * silently substituting demo data for a real outage.
 *
 * Server-only. Selected by lib/data/index.ts when a database is configured.
 */
import "server-only";
import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { getPool } from "@/lib/db/client";
import { mockRepositories, isSchemaLagError } from "@/lib/data/postgres/fallback";
import { fmtDate, fmtIso, fmtDateTime } from "@/lib/data/postgres/date-format";
import { ASSESSMENT_DIMENSIONS } from "@/lib/assessment";
import {
  costPerLead,
  mergeInbox,
  summarizeChannelMetrics,
  type SortableInboxItem,
} from "@/lib/social";
import { ONBOARDING_TEMPLATE } from "@/lib/onboarding-template";
import { classifyDevicePolicy } from "@/lib/security/device-policy";
import { labelDeviceOrigins } from "@/lib/cmdb/ci";
import { toActualCounts, sortByEstateSize } from "@/lib/recon/actual-count";
import type { ActualCountAggregate } from "@/lib/recon/actual-count";
import { deriveCriticality } from "@/lib/cmdb/criticality";
import { deriveLifecycle } from "@/lib/cmdb/lifecycle";
import {
  deriveChangeRisk,
  initialApprovalState,
  applyApprovalDecision,
  nextScheduleStatus,
} from "@/lib/change";
import { resolveMentions } from "@/lib/mentions";
import {
  planInstantiation,
  projectIdempotencyKey,
  taskTicketIdempotencyKey,
} from "@/lib/delivery/instantiate";
import { nextMilestone, rollupHealth } from "@/lib/portfolio";
import type { PortfolioMilestone } from "@/lib/portfolio";
import {
  projectPercentComplete,
  taskPercentComplete as goalTaskPercentComplete,
  manualPercent as goalManualPercent,
  rolledUpPercent as goalRolledUpPercent,
  displayPercent as goalDisplayPercent,
} from "@/lib/goals";
import { parseRRule, nextOccurrence } from "@/lib/recurrence";
import { effectiveWinProbability, weightedValue } from "@/lib/forecast";
import { leadScoreBand } from "@/lib/lead-score";
import {
  EMPTY_JOURNEY_DEFINITION,
  parseJourneyDefinition,
  summariseJourney,
} from "@/lib/journey";
import type { ForecastCategory } from "@/types";
import type {
  AccountDetail,
  AccountInput,
  AnswerInput,
  AdInput,
  AssessmentEditable,
  AssessmentInput,
  AudienceCriterion,
  AudienceInput,
  CampaignInput,
  CampaignSendInput,
  ClientCredentialInput,
  CompanyCredentialInput,
  PlatformCredentialInput,
  ConnectionInput,
  ConsentEventInput,
  ContactEditable,
  ContactInput,
  DiscoveryCallInput,
  EnrichmentInput,
  EventInput,
  InteractionFilter,
  InteractionInput,
  LeadHookInput,
  MeetingCreateInput,
  Option,
  ProjectEditable,
  ProjectInput,
  ProjectTypeInput,
  StatusDefRow,
  StatusDefInput,
  DeliveryInstantiationInput,
  DeliveryTemplateInput,
  ProjectTemplateInput,
  ProjectTemplateInstantiationInput,
  ChecklistTemplateInput,
  ApplyChecklistTemplateInput,
  IntakeFormInput,
  IntakeFormField,
  IntakeFormRow,
  IntakeFormDetail,
  IntakeSubmissionRow,
  IntakeSubmitResult,
  ExpenseItemInput,
  MileageItemInput,
  ReceiptAttachmentInput,
  OpportunityKnowledgeInput,
  OpportunityKnowledgeRow,
  OpportunityKnowledgeRef,
  ExpenseCorrection,
  ExpenseCategoryMappingInput,
  ExpenseCategoryAdminRow,
  QboExpenseAccountRow,
  TimeEntryInput,
  TimesheetCorrection,
  ProposalEditable,
  ProposalInput,
  QuestionEditable,
  QuestionInput,
  Repositories,
  SalesTaskInput,
  SavedViewInput,
  SavedViewRow,
  SbrInput,
  SbrScoreInput,
  SpawnOpportunityInput,
  SpawnProjectInput,
  SpawnTicketInput,
  TaskEditable,
  TaskInput,
  SprintInput,
  TaskTimeLogInput,
  TicketFilter,
  TicketFilterOptions,
  WorkflowInput,
  WorkflowStepInput,
  WorkCommentInput,
  WorkEventInput,
  WorkAttachmentInput,
  NotificationInput,
  TagApplicationInput,
  CustomFieldDefInput,
  CustomFieldValueInput,
  CustomFieldValueEntry,
  CustomFieldFilterInput,
} from "@/lib/data/repositories";
// Runtime values (not types): the checklist-template key prefix (#633) and the
// intake custom-field map prefix (#638).
import {
  CHECKLIST_TEMPLATE_KEY_PREFIX,
  INTAKE_CUSTOM_MAP_PREFIX,
} from "@/lib/data/repositories";
import type {
  Account,
  ActionItemRow,
  AnswerReviewRow,
  ArtifactRow,
  AssessmentConversion,
  AssessmentRow,
  AudienceMemberRow,
  AudienceRow,
  CampaignDetail,
  CampaignRow,
  CampaignSendRow,
  CommunicationDetail,
  ConnectionRow,
  ClientMappingUnit,
  ConsentEventRow,
  ContactCrmStage,
  ContactPipelineRow,
  ContactProfile,
  ContactRow,
  CountDatum,
  CurrentConsentRow,
  DeliveryTemplateRow,
  ProjectTemplateRow,
  ProjectTemplateDetail,
  ChecklistTemplateRow,
  ChecklistTemplateDetail,
  TemplateItem,
  TimesheetRow,
  TimesheetDetail,
  TimesheetReviewRow,
  PayrollTimesheetRow,
  AdminTimesheetReview,
  AdminTimesheetRow,
  EmployeeMappingRow,
  MileageRateRow,
  ExpenseReportRow,
  ExpenseReportDetail,
  ExpenseItemRow,
  ExpenseCategoryRow,
  ExpensePolicyViolationRow,
  MileiqDriveRow,
  MonthlyCloseRow,
  AdminMonthlyCloseRow,
  AdminExpenseRow,
  AdminExpenseReview,
  ExpenseReimbursementMatch,
  TimeEntryRow,
  TaskTimeEntryRow,
  ProjectTimeRollup,
  ReconciliationDay,
  DeliveryTemplateDetail,
  DeliveryBoardProject,
  TaskFireState,
  DirectoryGroupRow,
  DiscoveryCallDetail,
  DiscoveryCallRow,
  EnrichmentFactRow,
  EnrollmentRow,
  EventDetail,
  EventRegistrationRow,
  EventRow,
  ExternalIdentityRow,
  Health,
  IntelStrip,
  InteractionRow,
  KnowledgeHit,
  Kpi,
  LeadCaptureEventRow,
  LeadHookRow,
  OnboardingProject,
  OnboardingMilestone,
  OnboardingStep,
  SecurityPosture,
  OpportunityRow,
  OpportunityDetailRow,
  OpportunityForecastRow,
  QuotaRow,
  ForecastSnapshotRow,
  LeadScoreRow,
  LeadScoreKind,
  LeadScoreComponent,
  ChatSessionRow,
  ChatSessionStatus,
  ChatSessionChannel,
  ChatDeflectionKind,
  PipelineColumn,
  PipelineStage,
  PortfolioRow,
  GoalRow,
  GoalLinkedProject,
  GoalLinkedTask,
  GoalInput,
  GoalEditable,
  GoalLinkInput,
  ProjectRow,
  ProjectTypeRow,
  ProposalRow,
  QuestionRow,
  QuestionTemplateRow,
  MarketingSocialReport,
  ProjectTaskDependencyEdge,
  ReportSummary,
  RevenueSplit,
  SalesTaskRow,
  SecurityFleetReport,
  ServiceDeskReport,
  TimeEfficiencyReport,
  ExpenseAnalyticsReport,
  SbrDetail,
  SbrRow,
  SocialIdentityRow,
  ContactSourceRow,
  AccountSourceRow,
  StageValueDatum,
  TaskCategory,
  TaskRow,
  SprintRow,
  SprintBurndownData,
  SprintEstimatedTask,
  SprintVelocityRow,
  ProjectBaselineRow,
  ConversationRow,
  ConversationDetail,
  ConversationSegmentRow,
  ConversationInsightRow,
  EsignEnvelopeRow,
  ProjectSlippage,
  TaskHierarchy,
  TaskDependencies,
  TaskDependencyRow,
  TaskRecurrenceRow,
  TaskRecurrenceInput,
  WorkAssignments,
  WorkAssignmentRow,
  EngagementCounts,
  WorkRole,
  WorkloadRow,
  UserCapacity,
  TenantMapping,
  TenantPostureRollup,
  PosturePolicyRow,
  AccountDomain,
  AccountDomainHydrationResult,
  DnsDomainRollup,
  DnsRecordDrift,
  SecureScoreControl,
  CredentialExposureRow,
  DefenderIncidentCounts,
  MfaRegistrationCounts,
  SharePointSiteRow,
  TicketRow,
  TicketSlaBreachRow,
  TicketSlaState,
  ContractRow,
  DeviceInventoryRow,
  ConfigurationItem,
  DeviceManagedApp,
  CiType,
  CiRelationship,
  CiRelationshipInput,
  Criticality,
  CiCriticalityOverrideInput,
  InvoiceMirrorRow,
  InvoiceAgingBucket,
  CollectionsActivity,
  CollectionsActivityInput,
  CollectionsReminder,
  DunningStatus,
  AgentAutopilotPolicy,
  AutonomyDialQuery,
  AutonomyRung,
  AgentPlane,
  UnmappedTenant,
  AccountNeedingTenant,
  WorkflowDetail,
  WorkflowRow,
  JourneyRow,
  JourneyDetail,
  JourneyInput,
  MessageTemplateRow,
  MessageTemplateOption,
  MessageTemplateInput,
  MessageTemplateChannel,
  WorkParentType,
  WorkComment,
  WorkAttachment,
  WorkActivityEntry,
  CommentMention,
  MentionableUser,
  Notification,
  NotificationKind,
  NotificationChannel,
  NotificationPref,
  TagParentType,
  Tag,
  AppliedTag,
  CustomFieldDef,
  CustomFieldType,
  CustomFieldValue,
  CustomFieldParentType,
  ReportDefinition,
  ReportDefinitionInput,
  Dashboard,
  DashboardInput,
  DashboardItem,
  DashboardItemInput,
  ConnectorInstance,
  ConnectorInstanceInput,
  ConnectorStatus,
  SegmentSummary,
  SegmentDetail,
  SegmentMemberRow,
  SegmentMemberSource,
  SegmentInput,
  ChangeRequestSummary,
  ChangeRequestDetail,
  ChangeRequestInput,
  ChangeType,
  ChangeStatus,
  ChangeApprovalStatus,
  ApprovalDecision,
  SocialInboxItem,
  SocialPostRow,
  SocialPostDetail,
  SocialAnalyticsReport,
  SocialMetricDatum,
  SocialPostMetric,
  SocialAdResult,
  SocialPostChannelRow,
} from "@/types";

/** Add `n` days to a yyyy-mm-dd date, returning yyyy-mm-dd. */
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Derive a phase's R/Y/G from its checklist: green when every step is done; red
 * when past due with steps still open; amber otherwise. Falls back to the stored
 * (manual) health when the phase has no steps.
 */
function deriveHealth(
  stored: Health,
  total: number,
  done: number,
  due: string | null,
  today: string,
): Health {
  if (total === 0) return stored;
  if (done >= total) return "green";
  if (due && due < today) return "red";
  return "amber";
}

/** Empty string → null, for optional form fields. */
function nullIfEmpty(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
}

/**
 * Defensively parse the `website_opportunities.knowledge_blob_refs` jsonb into typed
 * refs (#429). The column is untyped jsonb (lossless bronze), so coerce each entry
 * and drop anything without a blob path — a malformed/legacy row degrades to the
 * entries it can read rather than throwing on the 360.
 */
function parseKnowledgeRefs(raw: unknown): OpportunityKnowledgeRef[] {
  if (!Array.isArray(raw)) return [];
  const out: OpportunityKnowledgeRef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const blobPath = typeof r.blobPath === "string" ? r.blobPath : null;
    if (!blobPath) continue;
    out.push({
      blobPath,
      filename: typeof r.filename === "string" ? r.filename : "knowledge",
      contentType: typeof r.contentType === "string" ? r.contentType : null,
      byteSize: typeof r.byteSize === "number" ? r.byteSize : null,
      contentHash: typeof r.contentHash === "string" ? r.contentHash : null,
      uploadedAt: typeof r.uploadedAt === "string" ? r.uploadedAt : "",
      uploadedByUserId: typeof r.uploadedByUserId === "string" ? r.uploadedByUserId : null,
    });
  }
  return out;
}

/** Raw status_def row as returned by the configurable-status queries (ADR-0065 B5, #616). */
type StatusDefDbRow = {
  id: string;
  scope: string;
  project_type_id: string | null;
  context: string;
  key: string;
  label: string;
  color: string | null;
  category: string;
  ordinal: number;
  wip_limit: number | null;
};

/** Map a snake_case status_def row to the camelCase StatusDefRow shape. */
function mapStatusDef(r: StatusDefDbRow): StatusDefRow {
  return {
    id: r.id,
    scope: r.scope,
    projectTypeId: r.project_type_id,
    context: r.context,
    key: r.key,
    label: r.label,
    color: r.color,
    category: r.category,
    ordinal: r.ordinal,
    wipLimit: r.wip_limit,
  };
}

/**
 * Ordered insert/update params for a status_def write. A global row carries no
 * project_type_id regardless of what the form posted, so the scope CHECK can never
 * be violated from this surface.
 */
function statusDefParams(input: StatusDefInput): unknown[] {
  return [
    input.scope,
    input.scope === "project_type" ? input.projectTypeId : null,
    input.context,
    input.key.trim(),
    input.label.trim(),
    nullIfEmpty(input.color),
    input.category,
    input.ordinal,
    input.wipLimit,
  ];
}

/**
 * Hard deviations block attestation (ADR-0082): an over-logged day (logged > attended
 * + tolerance, from the reconciliation view) OR two attendance blocks that overlap on
 * the same day. Soft deviations are attestable with a note and do NOT block.
 */
function hasHardDeviation(
  entries: TimeEntryRow[],
  reconciliation: ReconciliationDay[],
): boolean {
  if (reconciliation.some((d) => d.verdict === "over_logged")) return true;
  const byDay = new Map<string, TimeEntryRow[]>();
  for (const e of entries) {
    (byDay.get(e.workDate) ?? byDay.set(e.workDate, []).get(e.workDate)!).push(e);
  }
  for (const dayEntries of byDay.values()) {
    const sorted = [...dayEntries].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    for (let i = 1; i < sorted.length; i++) {
      // Overlap: this block starts before the previous one ends.
      if (sorted[i].startedAt < sorted[i - 1].endedAt) return true;
    }
  }
  return false;
}

/** The base timesheet columns both timesheet reads fetch before assembling the detail. */
interface BaseTimesheet {
  id: string;
  app_user_id: string;
  week_start: string;
  week_end: string;
  state: string;
  attested_at: Date | null;
}

/**
 * Load a timesheet's entries + per-day reconciliation (ADR-0082) and assemble the shared
 * `TimesheetDetail` from a base row. Used by both the employee-scoped `getTimesheetForWeek`
 * and the admin-scoped `getTimesheetById` (#477) so the entry/reconciliation shape stays
 * identical across surfaces.
 */
async function assembleTimesheetDetail(pool: Pool, t: BaseTimesheet): Promise<TimesheetDetail> {
  const { rows: eRows } = await pool.query<{
    id: string;
    work_date: string;
    started_at: Date;
    ended_at: Date;
    minutes: string;
    category: string;
    ancillary_ticket_ref: string | null;
    notes: string | null;
  }>(
    `SELECT id, to_char(work_date, 'YYYY-MM-DD') AS work_date,
            started_at, ended_at,
            (EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)::int AS minutes,
            category, ancillary_ticket_ref, notes
     FROM website_time_entry WHERE timesheet_id = $1
     ORDER BY started_at`,
    [t.id],
  );
  // Per-day reconciliation for the week (the memory-jogger seed), over the view.
  const { rows: rRows } = await pool.query<{
    work_date: string;
    attended_minutes: string;
    logged_minutes: string;
    delta_minutes: string;
    verdict: string;
  }>(
    `SELECT to_char(work_date, 'YYYY-MM-DD') AS work_date,
            attended_minutes, logged_minutes, delta_minutes, verdict
     FROM time_reconciliation_day
     WHERE app_user_id = $1 AND work_date BETWEEN $2 AND $3
     ORDER BY work_date`,
    [t.app_user_id, t.week_start, t.week_end],
  );
  const entries: TimeEntryRow[] = eRows.map((r) => ({
    id: r.id,
    workDate: r.work_date,
    startedAt: new Date(r.started_at).toISOString(),
    endedAt: new Date(r.ended_at).toISOString(),
    minutes: Number(r.minutes),
    category: r.category as TimeEntryRow["category"],
    ancillaryTicketRef: r.ancillary_ticket_ref,
    notes: r.notes,
  }));
  const reconciliation: ReconciliationDay[] = rRows.map((r) => ({
    workDate: r.work_date,
    attendedMinutes: Number(r.attended_minutes),
    loggedMinutes: Number(r.logged_minutes),
    deltaMinutes: Number(r.delta_minutes),
    verdict: r.verdict as ReconciliationDay["verdict"],
  }));
  return {
    id: t.id,
    employeeId: t.app_user_id,
    weekStart: t.week_start,
    weekEnd: t.week_end,
    state: t.state as TimesheetRow["state"],
    entryCount: entries.length,
    totalMinutes: entries.reduce((s, e) => s + e.minutes, 0),
    attestedAt: t.attested_at ? new Date(t.attested_at).toISOString() : null,
    entries,
    reconciliation,
    hasHardDeviation: hasHardDeviation(entries, reconciliation),
  };
}

/** The base `expense_report` columns a detail assembly needs (ADR-0083). */
interface BaseExpenseReport {
  id: string;
  app_user_id: string;
  period_year: number;
  period_month: number;
  state: string;
  attested_at: Date | null;
}

/** Map a raw silver `expense_item` (joined to its category) to `ExpenseItemRow`. */
interface RawExpenseItem {
  id: string;
  source: string;
  kind: string;
  item_date: string;
  category_name: string | null;
  amount: string | null;
  miles: string | null;
  reimbursable: boolean;
  billable: boolean;
  merchant: string | null;
  receipt_id: string | null;
  notes: string | null;
}
function mapExpenseItem(r: RawExpenseItem): ExpenseItemRow {
  return {
    id: r.id,
    source: r.source as ExpenseItemRow["source"],
    kind: r.kind as ExpenseItemRow["kind"],
    itemDate: r.item_date,
    categoryName: r.category_name,
    amount: Number(r.amount ?? 0),
    miles: r.miles === null ? null : Number(r.miles),
    reimbursable: r.reimbursable,
    billable: r.billable,
    merchant: r.merchant,
    hasReceipt: r.receipt_id !== null,
    notes: r.notes,
  };
}

/**
 * Load a report's silver items (ADR-0083) and assemble the shared `ExpenseReportDetail`
 * from a base row. Used by both the employee-scoped `getExpenseReportForPeriod` and the
 * admin-scoped `getExpenseReportById`, so the item shape stays identical across surfaces.
 */
async function assembleExpenseReportDetail(
  pool: Pool,
  r: BaseExpenseReport,
): Promise<ExpenseReportDetail> {
  const { rows: iRows } = await pool.query<RawExpenseItem>(
    `SELECT ei.id, ei.source, ei.kind,
            to_char(ei.item_date, 'YYYY-MM-DD') AS item_date,
            c.display_name AS category_name,
            ei.amount, ei.miles, ei.reimbursable, ei.billable, ei.merchant,
            ei.receipt_id, ei.notes
     FROM expense_item ei
     LEFT JOIN expense_category c ON c.id = ei.category_id
     WHERE ei.expense_report_id = $1
     ORDER BY ei.item_date, ei.created_at`,
    [r.id],
  );
  const items = iRows.map(mapExpenseItem);
  return {
    id: r.id,
    employeeId: r.app_user_id,
    periodYear: Number(r.period_year),
    periodMonth: Number(r.period_month),
    state: r.state as ExpenseReportRow["state"],
    itemCount: items.length,
    totalAmount: items.reduce((s, i) => s + i.amount, 0),
    reimbursableAmount: items.reduce((s, i) => s + (i.reimbursable ? i.amount : 0), 0),
    attestedAt: r.attested_at ? new Date(r.attested_at).toISOString() : null,
    items,
  };
}

/**
 * Whole days from one `yyyy-mm-dd` date to another (`to − from`); positive = `to`
 * is later. Both parsed as UTC midnight so the diff is exact day-count, DST-safe.
 * Used for planned-vs-actual slippage (ADR-0069 D6, #351). Returns null if either
 * date is missing.
 */
function daysBetween(fromYmd: string | null, toYmd: string | null): number | null {
  if (!fromYmd || !toYmd) return null;
  const a = Date.parse(`${fromYmd}T00:00:00Z`);
  const b = Date.parse(`${toYmd}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** Frozen plan stored in project_baseline.planned_dates (ADR-0069 D6, #351). */
interface PlannedDatesSnapshot {
  targetLiveDate: string | null;
  status: string;
  tasks: { id: string; title: string; dueAt: string | null }[];
}


/**
 * Shared task-list SELECT (ADR-0066 C1 board reads) — the same columns + n/m
 * subtask rollup (ADR-0065 B1) + logged-minutes sum (#346) that `listTasks` /
 * `listProjectTasks` build, factored out so the sprint board (#349) reads tasks
 * identically. Callers append their own `WHERE … ORDER BY …`. No trailing clause.
 */
const TASK_LIST_SELECT = `SELECT t.id, t.title, t.status, t.category, t.due_at, t.start_at,
                  t.estimate, t.estimate_unit, a.name AS account,
                  t.project_id, c.child_count, c.child_done_count,
                  COALESCE(te.logged_minutes, 0) AS logged_minutes,
                  sd.key AS status_def_key
           FROM task t
           LEFT JOIN account a ON a.id = t.account_id
           LEFT JOIN status_def sd ON sd.id = t.status_def_id
           LEFT JOIN LATERAL (
             SELECT count(*) AS child_count,
                    count(*) FILTER (WHERE ch.status = 'done') AS child_done_count
             FROM task ch WHERE ch.parent_task_id = t.id
           ) c ON true
           LEFT JOIN LATERAL (
             SELECT sum(minutes) AS logged_minutes
             FROM time_entry WHERE task_id = t.id
           ) te ON true`;

type TaskListSqlRow = {
  id: string;
  title: string;
  status: string;
  category: TaskCategory;
  due_at: Date | null;
  start_at: Date | null;
  estimate: string | null;
  estimate_unit: string | null;
  logged_minutes: string;
  account: string | null;
  project_id: string | null;
  child_count: string;
  child_done_count: string;
  status_def_key: string | null;
};

/** Map a TASK_LIST_SELECT row onto the shared TaskRow shape. */
function mapTaskListRow(row: TaskListSqlRow): TaskRow {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    category: row.category,
    due: fmtDate(row.due_at),
    account: row.account,
    projectId: row.project_id,
    childCount: Number(row.child_count),
    childDoneCount: Number(row.child_done_count),
    startAt: fmtDate(row.start_at),
    estimate: row.estimate,
    estimateUnit: row.estimate_unit,
    loggedMinutes: Number(row.logged_minutes),
    statusDefKey: row.status_def_key,
  };
}

/** Map a lead_score row joined to its contact onto LeadScoreRow (ADR-0073, #401). */
function mapLeadScoreRow(row: {
  id: string;
  contact_id: string;
  contact_name: string;
  account: string | null;
  kind: LeadScoreKind;
  score: string;
  breakdown: LeadScoreComponent[] | null;
  computed_at: string;
}): LeadScoreRow {
  const score = Number(row.score) || 0;
  return {
    id: row.id,
    contactId: row.contact_id,
    contactName: row.contact_name,
    account: row.account,
    kind: row.kind,
    score,
    band: leadScoreBand(score),
    breakdown: Array.isArray(row.breakdown) ? row.breakdown : [],
    computedAt: row.computed_at,
  };
}

/** Map a chat_session row joined to its (nullable) account/contact (ADR-0074 §5, #403). */
function mapChatSessionRow(row: {
  id: string;
  account_id: string | null;
  account: string | null;
  contact_id: string | null;
  contact_name: string | null;
  status: ChatSessionStatus;
  channel: ChatSessionChannel;
  deflected: boolean;
  deflection_kind: ChatDeflectionKind | null;
  escalated_ticket_ref: string | null;
  had_ticket: boolean;
  transcript_uri: string | null;
  summary: string | null;
  started_at: string;
  closed_at: string | null;
}): ChatSessionRow {
  return {
    id: row.id,
    accountId: row.account_id,
    account: row.account,
    contactId: row.contact_id,
    contactName: row.contact_name,
    status: row.status,
    channel: row.channel,
    deflected: row.deflected,
    deflectionKind: row.deflection_kind,
    escalatedTicketRef: row.escalated_ticket_ref,
    hadTicket: row.had_ticket,
    transcriptUri: row.transcript_uri,
    summary: row.summary,
    startedAt: row.started_at,
    closedAt: row.closed_at,
  };
}

/** Map a sprint list/detail row (with its task rollup) onto SprintRow (#349). */
function mapSprintRow(row: {
  id: string;
  name: string;
  project_id: string | null;
  project: string | null;
  starts_at: Date | null;
  ends_at: Date | null;
  status: string;
  task_count: string;
  done_count: string;
}): SprintRow {
  return {
    id: row.id,
    name: row.name,
    projectId: row.project_id,
    project: row.project,
    startsAt: fmtDate(row.starts_at),
    endsAt: fmtDate(row.ends_at),
    status: row.status,
    taskCount: Number(row.task_count),
    doneCount: Number(row.done_count),
  };
}

/**
 * Most common non-null estimate unit in a list (agile reporting C5, #345) — the
 * sprint's effort unit for axis labels. Ties resolve to first-seen; null when the
 * list is entirely null/empty.
 */
function dominantUnit(units: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const u of units) {
    if (u == null || u === "") continue;
    counts.set(u, (counts.get(u) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [u, n] of counts) {
    if (n > bestN) {
      best = u;
      bestN = n;
    }
  }
  return best;
}

const ONBOARDING_LIFECYCLE = ["onboarding", "implementation", "operational_readiness"];

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
function fmtUsd(n: number): string {
  return usd.format(Number.isFinite(n) ? n : 0);
}

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
function fmtUsdCompact(n: number): string {
  return usdCompact.format(Number.isFinite(n) ? n : 0);
}

/**
 * Human-friendly label for a status rollup bucket (ADR-0065 B5, #615). The three
 * canonical status_def categories get titled labels; any legacy `status` string
 * (used only when a row has no status_def_id) is de-snaked and title-cased so the
 * BI-hub chart reads sensibly either way.
 */
const STATUS_CATEGORY_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};
function humanizeStatusBucket(bucket: string): string {
  return (
    STATUS_CATEGORY_LABELS[bucket] ??
    bucket
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase())
  );
}

/** Fixed display order for opportunity sales stages. */
const SALES_STAGE_ORDER = ["lead", "qualified", "proposal", "won", "lost"];

/**
 * Autotask ships exactly two fixed, undeletable system ticket statuses (1=New,
 * 5=Complete); everything else is an instance-specific picklist whose label
 * lookup is deferred (0074) — render those as "Status N" until labels merge.
 */
const AUTOTASK_SYSTEM_STATUSES: Record<string, string> = { "1": "New", "5": "Complete" };
function labelAutotaskStatus(raw: string): string {
  return AUTOTASK_SYSTEM_STATUSES[raw] ?? (raw === "unknown" ? "unknown" : `Status ${raw}`);
}

/** Map the account lifecycle stage to the dashboard's five-stage strip. */
function toPipelineStage(lifecycle: string): PipelineStage {
  switch (lifecycle) {
    case "prospect":
      return "Lead";
    case "onboarding":
    case "implementation":
    case "operational_readiness":
      return "Onboarding";
    case "managed_active":
    case "dormant":
    default:
      return "Active";
  }
}

function toHealth(row: {
  is_active: boolean;
  relationship: string | null;
  health_score: number | null;
}): Health {
  if (row.health_score != null) {
    return row.health_score >= 70 ? "green" : row.health_score >= 40 ? "amber" : "red";
  }
  if (!row.is_active) return "red";
  return row.relationship === "customer" ? "green" : "amber";
}

const PIPELINE_ORDER: PipelineStage[] = [
  "Lead",
  "Qualified",
  "Proposal",
  "Onboarding",
  "Active",
];

export const postgresRepositories: Repositories = {
  dashboard: {
    async getKpis(): Promise<Kpi[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.dashboard.getKpis();
      try {
        const { rows } = await pool.query<{
          open_pipeline: string;
          active_mrr: string;
          open_deals: string;
          managed: string;
        }>(
          `SELECT
             coalesce(sum(o.amount_mrr) FILTER (WHERE o.sales_stage IN ('lead','qualified','proposal')), 0) AS open_pipeline,
             coalesce(sum(o.amount_mrr) FILTER (WHERE o.sales_stage = 'won'), 0)                            AS active_mrr,
             count(*) FILTER (WHERE o.sales_stage IN ('lead','qualified','proposal'))                       AS open_deals,
             (SELECT count(*) FROM account WHERE lifecycle_stage = 'managed_active')                        AS managed
           FROM opportunity o`,
        );
        const r = rows[0];
        return [
          { label: "Open Pipeline", value: fmtUsd(Number(r.open_pipeline)) },
          { label: "Active MRR", value: `${fmtUsd(Number(r.active_mrr))}/mo` },
          { label: "Managed", value: r.managed },
          { label: "Open Deals", value: r.open_deals },
        ];
      } catch {
        return mockRepositories.dashboard.getKpis();
      }
    },

    async getPipeline(): Promise<PipelineColumn[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.dashboard.getPipeline();
      try {
        const [opps, accts] = await Promise.all([
          pool.query<{ sales_stage: string; c: string; mrr: string }>(
            `SELECT sales_stage, count(*) AS c, coalesce(sum(amount_mrr),0) AS mrr
             FROM opportunity GROUP BY sales_stage`,
          ),
          pool.query<{ lifecycle_stage: string; c: string }>(
            `SELECT lifecycle_stage, count(*) AS c FROM account GROUP BY lifecycle_stage`,
          ),
        ]);
        const opp = new Map(opps.rows.map((r) => [r.sales_stage, r]));
        const stageCount = (s: string) => Number(opp.get(s)?.c ?? 0);
        const stageMrr = (s: string) => Number(opp.get(s)?.mrr ?? 0);
        const onboardingCount = accts.rows
          .filter((r) => ONBOARDING_LIFECYCLE.includes(r.lifecycle_stage))
          .reduce((sum, r) => sum + Number(r.c), 0);
        const managedCount = Number(
          accts.rows.find((r) => r.lifecycle_stage === "managed_active")?.c ?? 0,
        );

        const byStage: Record<PipelineStage, { count: number; value: string }> = {
          Lead: { count: stageCount("lead"), value: fmtUsd(stageMrr("lead")) },
          Qualified: { count: stageCount("qualified"), value: fmtUsd(stageMrr("qualified")) },
          Proposal: { count: stageCount("proposal"), value: fmtUsd(stageMrr("proposal")) },
          Onboarding: { count: onboardingCount, value: "—" },
          Active: { count: managedCount, value: `${fmtUsd(stageMrr("won"))}/mo` },
        };
        return PIPELINE_ORDER.map((stage) => ({ stage, ...byStage[stage] }));
      } catch {
        return mockRepositories.dashboard.getPipeline();
      }
    },

    async getAccountsNeedingAttention(): Promise<Account[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.dashboard.getAccountsNeedingAttention();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          lifecycle_stage: string;
          relationship: string | null;
          is_active: boolean;
          health_score: number | null;
          owner: string | null;
          mrr: string;
        }>(
          `SELECT a.id, a.name, a.lifecycle_stage, a.relationship, a.is_active,
                  a.health_score, u.display_name AS owner,
                  coalesce((SELECT sum(o.amount_mrr) FROM opportunity o
                            WHERE o.account_id = a.id AND o.sales_stage = 'won'), 0) AS mrr
           FROM account a
           LEFT JOIN app_user u ON u.id = a.owner_user_id
           WHERE NOT a.is_active OR a.lifecycle_stage IN ('prospect','dormant')
           ORDER BY a.is_active ASC, a.name
           LIMIT 8`,
        );
        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          stage: toPipelineStage(row.lifecycle_stage),
          owner: row.owner ?? "—",
          mrr: Number(row.mrr) > 0 ? `${fmtUsd(Number(row.mrr))}/mo` : "—",
          health: toHealth(row),
          note: row.is_active
            ? `${row.relationship ?? "unknown"} · ${row.lifecycle_stage.replace(/_/g, " ")}`
            : "Inactive — review relationship",
        }));
      } catch {
        return mockRepositories.dashboard.getAccountsNeedingAttention();
      }
    },

    async getIntelStrip(): Promise<IntelStrip> {
      const pool = getPool();
      if (!pool) return mockRepositories.dashboard.getIntelStrip();
      try {
        // One glance across the BI-hub domains (ADR-0062 §dashboard). Null =
        // source has no rows at all ("no coverage yet"), never a fake zero.
        const [leads, tickets, defender, mfa, social] = await Promise.all([
          pool.query<{ c: string }>(
            `SELECT count(*) AS c FROM lead_capture_event
             WHERE received_at >= now() - interval '7 days'`,
          ),
          pool.query<{ c: string }>(
            `SELECT count(*) AS c FROM ticket
             WHERE opened_at >= now() - interval '30 days'`,
          ),
          pool.query<{ open: string; total: string }>(
            `SELECT count(*) FILTER (WHERE lower(COALESCE(status, ''))
                      NOT IN ('resolved', 'redirected')) AS open,
                    count(*) AS total
             FROM defender_incidents`,
          ),
          pool.query<{ registered: string; total: string }>(
            `SELECT count(*) FILTER (WHERE lower(COALESCE(is_mfa_registered, '')) = 'true')
                      AS registered,
                    count(*) AS total
             FROM entra_auth_methods`,
          ),
          // Engagement from the schema-stable bronze counters, not insight
          // metric names (local #135 is still renaming those).
          pool.query<{ fb: string | null; ig: string | null; posts: string }>(
            `SELECT
               (SELECT sum(coalesce(nullif(reaction_count, '')::numeric, 0)
                         + coalesce(nullif(comment_count, '')::numeric, 0)
                         + coalesce(nullif(share_count, '')::numeric, 0))
                  FROM facebook_posts
                 WHERE nullif(created_time, '')::timestamptz >= now() - interval '30 days') AS fb,
               (SELECT sum(coalesce(nullif(like_count, '')::numeric, 0)
                         + coalesce(nullif(comments_count, '')::numeric, 0))
                  FROM instagram_media
                 WHERE nullif(created_time, '')::timestamptz >= now() - interval '30 days') AS ig,
               (SELECT count(*) FROM facebook_posts) + (SELECT count(*) FROM instagram_media)
                 AS posts`,
          ),
        ]);
        const d = defender.rows[0];
        const m = mfa.rows[0];
        const s = social.rows[0];
        return {
          newLeads7d: Number(leads.rows[0].c),
          ticketsOpened30d: Number(tickets.rows[0].c),
          defenderOpen: Number(d.total) > 0 ? Number(d.open) : null,
          mfaPct:
            Number(m.total) > 0
              ? Math.round((Number(m.registered) / Number(m.total)) * 100)
              : null,
          socialEngagement30d:
            Number(s.posts) > 0 ? Number(s.fb ?? 0) + Number(s.ig ?? 0) : null,
        };
      } catch {
        return mockRepositories.dashboard.getIntelStrip();
      }
    },
  },

  crm: {
    async listAccounts(): Promise<Account[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listAccounts();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          lifecycle_stage: string;
          relationship: string | null;
          is_active: boolean;
          health_score: number | null;
          owner: string | null;
          mrr: string;
        }>(
          `SELECT a.id, a.name, a.lifecycle_stage, a.relationship, a.is_active,
                  a.health_score, u.display_name AS owner,
                  coalesce((SELECT sum(o.amount_mrr) FROM opportunity o
                            WHERE o.account_id = a.id AND o.sales_stage = 'won'), 0) AS mrr
           FROM account a
           LEFT JOIN app_user u ON u.id = a.owner_user_id
           ORDER BY a.name`,
        );
        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          stage: toPipelineStage(row.lifecycle_stage),
          owner: row.owner ?? "—",
          mrr: Number(row.mrr) > 0 ? `${fmtUsd(Number(row.mrr))}/mo` : "—",
          health: toHealth(row),
          note: row.is_active
            ? `${row.relationship ?? "unknown"} · ${row.lifecycle_stage.replace(/_/g, " ")}`
            : "Inactive",
        }));
      } catch {
        return mockRepositories.crm.listAccounts();
      }
    },

    async listAccountSources(accountId: string): Promise<AccountSourceRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listAccountSources(accountId);
      try {
        const { rows } = await pool.query<{
          id: string;
          source: string;
          external_ref: string | null;
          payload_bronze: unknown | null;
          normalized_silver: unknown | null;
          match_confidence: number | null;
          matched_at: Date | null;
          last_seen_at: Date | null;
        }>(
          `SELECT id, source, external_ref, payload_bronze, normalized_silver,
                  match_confidence, matched_at, last_seen_at
           FROM account_bronze_all WHERE account_id = $1 ORDER BY last_seen_at DESC`,
          [accountId],
        );
        return rows.map((r) => ({
          id: r.id,
          source: r.source,
          externalRef: r.external_ref,
          payloadBronze: r.payload_bronze,
          normalizedSilver: r.normalized_silver,
          matchConfidence: r.match_confidence,
          matchedAt: fmtDateTime(r.matched_at),
          lastSeenAt: fmtDateTime(r.last_seen_at),
        }));
      } catch {
        return mockRepositories.crm.listAccountSources(accountId);
      }
    },

    async listAccountRelatedBronze(accountId: string): Promise<AccountSourceRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listAccountRelatedBronze(accountId);
      try {
        const { rows } = await pool.query<{
          kind: string;
          external_ref: string | null;
          label: string | null;
          payload_bronze: unknown | null;
          last_seen_at: Date | null;
        }>(
          `SELECT kind, external_ref, label, payload_bronze, last_seen_at
             FROM account_related_bronze WHERE account_id = $1 ORDER BY last_seen_at DESC NULLS LAST`,
          [accountId],
        );
        return rows.map((r, i) => ({
          id: `${r.kind}:${r.external_ref ?? i}`,
          source: r.kind,
          externalRef: r.external_ref,
          payloadBronze: r.payload_bronze,
          normalizedSilver: null,
          matchConfidence: null,
          matchedAt: null,
          lastSeenAt: fmtDateTime(r.last_seen_at),
          title: r.label,
        }));
      } catch {
        return mockRepositories.crm.listAccountRelatedBronze(accountId);
      }
    },

    async getAccount(id: string): Promise<AccountDetail | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          relationship: string | null;
          lifecycle_stage: string;
          is_active: boolean;
          health_score: string | null;
          owner: string | null;
          created_at: Date | null;
          updated_at: Date | null;
          archived_at: Date | null;
        }>(
          `SELECT a.id, a.name, a.relationship, a.lifecycle_stage, a.is_active,
                  a.health_score, u.display_name AS owner,
                  a.created_at, a.updated_at, a.archived_at
           FROM account a LEFT JOIN app_user u ON u.id = a.owner_user_id
           WHERE a.id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          name: r.name,
          relationship: r.relationship,
          lifecycleStage: r.lifecycle_stage,
          isActive: r.is_active,
          healthScore: r.health_score,
          owner: r.owner,
          createdAt: fmtDate(r.created_at),
          updatedAt: fmtDateTime(r.updated_at),
          archivedAt: fmtDate(r.archived_at),
        };
      } catch {
        return null;
      }
    },

    async listDeviceInventory(): Promise<DeviceInventoryRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listDeviceInventory();
      try {
        // Policy indicator (#162, ADR-0051 §6): join the Intune managedDevices
        // bronze (migration 0069 — web role holds an explicit SELECT grant for
        // exactly this read) by serial number, the one join key the inventory
        // view exposes. (azure_ad_device_id becomes usable once the pipeline's
        // silver merge stamps it; serial covers both view arms today.) Devices
        // without a matching, recently-synced Intune row show NO indicator.
        const { rows } = await pool.query<{
          id: string;
          name: string | null;
          device_type: string | null;
          manufacturer: string | null;
          model: string | null;
          serial_number: string | null;
          os: string | null;
          status: string | null;
          account: string | null;
          origin: string;
          last_seen: string | null;
          compliance_state: string | null;
          last_sync_date_time: string | null;
        }>(
          `SELECT v.id, v.name, v.device_type, v.manufacturer, v.model, v.serial_number,
                  v.os, v.status, v.account, v.origin, v.last_seen,
                  imd.compliance_state, imd.last_sync_date_time
           FROM device_inventory_all v
           LEFT JOIN LATERAL (
             SELECT i.compliance_state, i.last_sync_date_time
             FROM intune_managed_devices i
             WHERE i.serial_number = v.serial_number AND i.serial_number <> ''
             ORDER BY i.collected_at DESC
             LIMIT 1
           ) imd ON v.serial_number IS NOT NULL
           ORDER BY v.account NULLS LAST, v.name NULLS LAST`,
        );
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          deviceType: r.device_type,
          manufacturer: r.manufacturer,
          model: r.model,
          serialNumber: r.serial_number,
          os: r.os,
          status: r.status,
          account: r.account,
          origin: r.origin,
          // The view returns text timestamps (mixed bronze/silver) — trim to minutes.
          lastSeen: r.last_seen ? r.last_seen.slice(0, 16).replace("T", " ") : null,
          policyCompliance: classifyDevicePolicy(r.compliance_state, r.last_sync_date_time),
        }));
      } catch {
        return mockRepositories.crm.listDeviceInventory();
      }
    },

    async listConfigurationItems(): Promise<ConfigurationItem[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listConfigurationItems();
      try {
        // The cmdb_ci union read-model (#645, ADR-0078): one row per CI across the
        // v1 types, projected over EXISTING silver — NO new ingest/schema. Each arm
        // tags `ci_type` + owning `account_id` and carries up to four key display
        // attributes (label/value pairs) packed as a jsonb array.
        //
        // STAFF EXCLUSION: the `user` CI is silver `contact` (client end-user
        // identities) — Imperion staff/admin are `app_user`, a different table never
        // joined here. Every arm also requires a non-null `account_id`, so an
        // account-less/internal row can never enter the set.
        // Each arm also carries the raw silver signals the criticality derived rule
        // reads (account relationship/lifecycle, device_type) so the in-code rule
        // (`deriveCriticality`, #648) computes a meaningful default even before the
        // `cmdb_ci_overlay` table (migration 0132) is applied (it is DORMANT until then).
        // The device arm also projects the source signals the lifecycle rule reads
        // (#649): the Autotask config-item `status`, silver `last_seen_at`, and the
        // latest Intune managed-device row (joined by serial, like the inventory read)
        // for the enrollment signal. `deriveLifecycle` (in-code) maps them; an absent
        // signal degrades to `unknown`. No new ingest, no schema change.
        const { rows } = await pool.query<{
          ci_type: ConfigurationItem["ciType"];
          ci_id: string;
          account_id: string;
          account_name: string | null;
          display_name: string;
          attributes: { label: string; value: string }[] | null;
          relationship: string | null;
          lifecycle_stage: string | null;
          device_type: string | null;
          device_status: string | null;
          last_seen_at: string | null;
          intune_management_state: string | null;
          intune_enrolled_at: string | null;
          cloud_category: string | null;
          compliance_state: string | null;
          last_sync_date_time: string | null;
          device_origin: string | null;
        }>(
          `SELECT ci_type, ci_id, account_id, account_name, display_name, attributes,
                  relationship, lifecycle_stage, device_type,
                  device_status, last_seen_at, intune_management_state, intune_enrolled_at,
                  cloud_category, compliance_state, last_sync_date_time, device_origin
             FROM (
               SELECT 'account'::text AS ci_type,
                      a.id::text       AS ci_id,
                      a.id::text       AS account_id,
                      a.name           AS account_name,
                      a.name           AS display_name,
                      a.relationship::text AS relationship,
                      a.lifecycle_stage::text AS lifecycle_stage,
                      NULL::text       AS device_type,
                      NULL::text       AS device_status,
                      NULL::text       AS last_seen_at,
                      NULL::text       AS intune_management_state,
                      NULL::text       AS intune_enrolled_at,
                      NULL::text       AS cloud_category,
                      NULL::text       AS compliance_state,
                      NULL::text       AS last_sync_date_time,
                      NULL::text       AS device_origin,
                      jsonb_build_array(
                        jsonb_build_object('label','Lifecycle','value',replace(a.lifecycle_stage::text,'_',' ')),
                        jsonb_build_object('label','Relationship','value',coalesce(a.relationship::text,'—')),
                        jsonb_build_object('label','Active','value',CASE WHEN a.is_active THEN 'Yes' ELSE 'No' END)
                      ) AS attributes
                 FROM account a

               UNION ALL

               SELECT 'user'::text,
                      c.id::text,
                      c.account_id::text,
                      a.name,
                      c.full_name,
                      NULL::text,
                      NULL::text,
                      NULL::text,
                      NULL::text,
                      NULL::text,
                      NULL::text,
                      NULL::text,
                      NULL::text,
                      NULL::text, -- compliance_state (user arm: n/a)
                      NULL::text, -- last_sync_date_time
                      NULL::text, -- device_origin
                      jsonb_build_array(
                        jsonb_build_object('label','Email','value',coalesce(c.email,'—')),
                        jsonb_build_object('label','Phone','value',coalesce(c.phone,'—'))
                      )
                 FROM contact c
                 JOIN account a ON a.id = c.account_id
                WHERE c.account_id IS NOT NULL

               UNION ALL

               SELECT 'device'::text,
                      d.id::text,
                      d.account_id::text,
                      a.name,
                      coalesce(d.name, d.serial_number, 'Unnamed device'),
                      NULL::text,
                      NULL::text,
                      d.device_type,
                      d.status,
                      d.last_seen_at::text,
                      imd.management_state,
                      imd.enrolled_date_time,
                      NULL::text,
                      -- #882 convergence: carry the Devices-view richer signals onto the
                      -- device CI. Intune compliance (same lateral that already feeds the
                      -- lifecycle enrollment signal) + the merged bronze provenance, so the
                      -- CI reads identically to the inventory row.
                      imd.compliance_state,
                      imd.last_sync_date_time,
                      origin.sources,
                      jsonb_build_array(
                        jsonb_build_object('label','Type','value',coalesce(d.device_type,'—')),
                        jsonb_build_object('label','Make / model','value',trim(both ' ' from concat_ws(' ', d.manufacturer, d.model))),
                        jsonb_build_object('label','Serial','value',coalesce(d.serial_number,'—')),
                        jsonb_build_object('label','OS','value',coalesce(d.os,'—'))
                      )
                 FROM device d
                 JOIN account a ON a.id = d.account_id
                 LEFT JOIN LATERAL (
                   SELECT i.management_state, i.enrolled_date_time,
                          i.compliance_state, i.last_sync_date_time
                   FROM intune_managed_devices i
                   WHERE i.serial_number = d.serial_number AND i.serial_number <> ''
                   ORDER BY i.collected_at DESC
                   LIMIT 1
                 ) imd ON d.serial_number IS NOT NULL
                 LEFT JOIN LATERAL (
                   -- Merged provenance: which bronze sources contributed to this silver
                   -- device (device_bronze_all, migration 0036). Distinct source list, mapped
                   -- to friendly labels in code; absent → no Source attribute (graceful).
                   SELECT string_agg(DISTINCT db.source, ',' ORDER BY db.source) AS sources
                   FROM device_bronze_all db
                   WHERE db.device_id = d.id
                 ) origin ON true
                WHERE d.account_id IS NOT NULL

               UNION ALL

               -- cloud CI arm: silver cloud_asset (provider-agnostic; #874/#875). Owning
               -- account required (staff/internal exclusion — a tenant-unmapped asset has a
               -- NULL account_id and is dropped here, like the device arm). device_status +
               -- last_seen_at carry the lifecycle signal; cloud_category the criticality one.
               SELECT 'cloud'::text,
                      ca.id::text,
                      ca.account_id::text,
                      a.name,
                      coalesce(ca.name, ca.external_id, 'Cloud resource'),
                      NULL::text,
                      NULL::text,
                      NULL::text,
                      ca.status,
                      ca.last_seen_at::text,
                      NULL::text,
                      NULL::text,
                      ca.category::text,
                      NULL::text, -- compliance_state (cloud arm: n/a)
                      NULL::text, -- last_sync_date_time
                      NULL::text, -- device_origin
                      jsonb_build_array(
                        jsonb_build_object('label','Provider','value',
                          CASE ca.provider WHEN 'azure' THEN 'Azure' WHEN 'aws' THEN 'AWS'
                                           WHEN 'gcp' THEN 'GCP' ELSE 'Other' END),
                        jsonb_build_object('label','Type','value',coalesce(ca.native_type,'—')),
                        jsonb_build_object('label','Region','value',coalesce(ca.region,'—')),
                        jsonb_build_object('label','Resource group','value',coalesce(ca.resource_group,'—')),
                        jsonb_build_object('label','Subscription','value',coalesce(ca.subscription_ref,'—'))
                      )
                 FROM cloud_asset ca
                 JOIN account a ON a.id = ca.account_id
                WHERE ca.account_id IS NOT NULL

               UNION ALL

               -- software CI arm: silver software_ci (an Intune app install on a device;
               -- #652). Owning account required (staff/internal exclusion — software_ci.account_id
               -- resolves through the owning device, so an account-less install can never enter).
               -- Software is a SUPPORTING asset: no lifecycle signal (always 'unknown', badge
               -- suppressed) and a flat 'low' derived criticality (deriveCriticality), so every
               -- signal column is NULL; the four key attributes carry the display facts.
               SELECT 'software'::text,
                      s.id::text,
                      s.account_id::text,
                      a.name,
                      coalesce(s.name, 'Software'),
                      NULL::text,
                      NULL::text,
                      NULL::text,
                      NULL::text, -- device_status (no asset lifecycle for software)
                      NULL::text, -- last_seen_at (not a lifecycle input for software)
                      NULL::text,
                      NULL::text,
                      NULL::text,
                      NULL::text, -- compliance_state (software arm: n/a)
                      NULL::text, -- last_sync_date_time
                      NULL::text, -- device_origin
                      jsonb_build_array(
                        jsonb_build_object('label','Publisher','value',coalesce(s.publisher,'—')),
                        jsonb_build_object('label','Version','value',coalesce(s.version,'—')),
                        jsonb_build_object('label','Platform','value',coalesce(s.platform,'—')),
                        jsonb_build_object('label','Install state','value',coalesce(s.install_state,'—'))
                      )
                 FROM software_ci s
                 JOIN account a ON a.id = s.account_id
                WHERE s.account_id IS NOT NULL
             ) ci
            ORDER BY account_name NULLS LAST, ci_type, display_name`,
        );

        // The criticality overlay (#648, migration 0132) is fetched SEPARATELY and
        // merged in code — so a dormant overlay (table absent pre-apply) degrades to
        // the in-code derived default rather than emptying the whole register. Keyed
        // by `${ci_type}:${ci_id}`; stored derived_default wins over the in-code one
        // (they agree by construction), and `override ?? derived` is the effective value.
        const overlay = new Map<string, { derived: Criticality | null; override: Criticality | null }>();
        try {
          const { rows: ovl } = await pool.query<{
            ci_type: string;
            ci_id: string;
            derived_default: Criticality;
            override: Criticality | null;
          }>(
            `SELECT ci_type, ci_id, derived_default, override FROM cmdb_ci_overlay`,
          );
          for (const o of ovl) {
            overlay.set(`${o.ci_type}:${o.ci_id}`, {
              derived: o.derived_default,
              override: o.override,
            });
          }
        } catch {
          // Overlay table not applied yet (dormant) — fall back to in-code derivation.
        }

        return rows.map((r) => {
          const o = overlay.get(`${r.ci_type}:${r.ci_id}`);
          // #882 device-CI convergence signals (device arm only; null elsewhere).
          const policyCompliance =
            r.ci_type === "device"
              ? classifyDevicePolicy(r.compliance_state, r.last_sync_date_time)
              : null;
          const origin = r.ci_type === "device" ? labelDeviceOrigins(r.device_origin) : null;
          return {
            ciType: r.ci_type,
            ciId: r.ci_id,
            accountId: r.account_id,
            accountName: r.account_name,
            displayName: r.display_name,
            policyCompliance,
            origin,
            attributes: (r.attributes ?? []).map((kv) => ({
              label: kv.label,
              // Empty make/model concat collapses to '' — normalise to the dash.
              value: kv.value && kv.value.length > 0 ? kv.value : "—",
            })),
            derivedDefault:
              o?.derived ??
              deriveCriticality(r.ci_type, {
                accountRelationship: r.relationship,
                accountLifecycleStage: r.lifecycle_stage,
                deviceType: r.device_type,
                cloudCategory: r.cloud_category,
              }),
            override: o?.override ?? null,
            // Derived, read-only asset lifecycle (#649) — recomputed from source
            // signals every read; never persisted, never overridden.
            lifecycle: deriveLifecycle(r.ci_type, {
              deviceStatus: r.device_status,
              lastSeenAt: r.last_seen_at,
              intuneManagementState: r.intune_management_state,
              intuneEnrolledAt: r.intune_enrolled_at,
            }),
          };
        });
      } catch {
        return mockRepositories.crm.listConfigurationItems();
      }
    },

    // Agreement-reconciliation ACTUAL-count aggregation (#1079, epic #1041).
    async listActualCounts() {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listActualCounts();
      try {
        // Per-account roll-up of the ACTUAL deployed estate, projected over EXISTING
        // silver — NO new ingest/schema. We anchor on `account` (every managed client),
        // LEFT JOIN two pre-aggregated subqueries, and report 0 (not NULL) for a kind a
        // client has none of (coalesce in SQL + `toCount` in code — belt and braces):
        //   seats   = SUM(license_assignment.quantity)  (deploy-dormant until Pax8, #1042)
        //   devices = COUNT(device)
        //   backups = COUNT(device WHERE backup_protected)  (Datto BCDR posture, #683)
        // Anchoring on `account` (not the inventory tables) keeps the staff/internal
        // exclusion implicit: silver `account` is the client register, and both arms
        // already key on `account_id`. The `toActualCounts` guard drops any account-less
        // row defensively; `sortByEstateSize` orders largest-estate-first in code.
        const { rows } = await pool.query<{
          account_id: string;
          account_name: string | null;
          seats: string | null;
          devices: string | null;
          backups: string | null;
        }>(
          `SELECT a.id::text          AS account_id,
                  a.name              AS account_name,
                  lic.seats           AS seats,
                  dev.devices         AS devices,
                  dev.backups         AS backups
             FROM account a
             LEFT JOIN (
               SELECT account_id, COALESCE(SUM(quantity), 0) AS seats
                 FROM license_assignment
                WHERE account_id IS NOT NULL
                GROUP BY account_id
             ) lic ON lic.account_id = a.id
             LEFT JOIN (
               SELECT account_id,
                      COUNT(*)                                          AS devices,
                      COUNT(*) FILTER (WHERE backup_protected IS TRUE)  AS backups
                 FROM device
                WHERE account_id IS NOT NULL
                GROUP BY account_id
             ) dev ON dev.account_id = a.id
            WHERE lic.account_id IS NOT NULL OR dev.account_id IS NOT NULL`,
        );
        const aggregates: ActualCountAggregate[] = rows.map((r) => ({
          accountId: r.account_id,
          accountName: r.account_name,
          seats: r.seats,
          devices: r.devices,
          backups: r.backups,
        }));
        return sortByEstateSize(toActualCounts(aggregates));
      } catch (e) {
        // Schema-lag (license_assignment / device not yet applied) degrades to empty,
        // never crashes the surface — the inventory's cardinal rule (ADR-0051 §6).
        if (isSchemaLagError(e)) return mockRepositories.crm.listActualCounts();
        throw e;
      }
    },

    // Intune managed-apps drill (#261, epic #873, bronze intune_managed_apps migration 0148).
    async listDeviceManagedApps(deviceId: string): Promise<DeviceManagedApp[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listDeviceManagedApps(deviceId);
      try {
        // The per-device managed/detected app inventory for ONE silver device. Apps join the
        // device by the SAME keys the device CI already laterals intune_managed_devices on
        // (0069): the Intune managed-device id (preferred) or the serial number (fallback).
        // We resolve the device's serial + its Intune managed-device id, then match apps on
        // either. Bronze is all-text; the latest collected row per app wins (DISTINCT ON).
        // An absent bronze table (collector not yet run / migration not applied) throws and
        // degrades to [] via the catch — the section renders empty, never errors.
        const { rows } = await pool.query<{
          app_id: string | null;
          display_name: string | null;
          publisher: string | null;
          version: string | null;
          platform: string | null;
          install_state: string | null;
          install_state_detail: string | null;
          app_type: string | null;
        }>(
          `WITH dev AS (
             SELECT d.serial_number,
                    (SELECT i.external_id
                       FROM intune_managed_devices i
                      WHERE i.serial_number = d.serial_number AND i.serial_number <> ''
                      ORDER BY i.collected_at DESC
                      LIMIT 1) AS managed_device_id
               FROM device d
              WHERE d.id = $1::uuid
           )
           SELECT DISTINCT ON (ma.app_id, ma.display_name)
                  ma.app_id, ma.display_name, ma.publisher, ma.version, ma.platform,
                  ma.install_state, ma.install_state_detail, ma.app_type
             FROM intune_managed_apps ma, dev
            WHERE (dev.managed_device_id IS NOT NULL
                     AND ma.managed_device_id = dev.managed_device_id)
               OR (dev.serial_number IS NOT NULL AND dev.serial_number <> ''
                     AND ma.serial_number = dev.serial_number)
            ORDER BY ma.app_id, ma.display_name, ma.collected_at DESC`,
          [deviceId],
        );
        return rows.map((r) => ({
          appId: r.app_id,
          displayName: r.display_name,
          publisher: r.publisher,
          version: r.version,
          platform: r.platform,
          installState: r.install_state,
          installStateDetail: r.install_state_detail,
          appType: r.app_type,
        }));
      } catch {
        return mockRepositories.crm.listDeviceManagedApps(deviceId);
      }
    },

    // ── CMDB relationship layer (#647, migration 0131) ─────────────────────────
    async listCiRelationships(ciType: CiType, ciId: string): Promise<CiRelationship[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listCiRelationships(ciType, ciId);
      try {
        // Every edge touching this CI in BOTH directions (from OR to). CIs are
        // polymorphic (type,id) pairs, so we match on the pair on each end. Manual
        // edges sort first (the curated layer), then most-recent.
        const { rows } = await pool.query<{
          id: string;
          from_ci_type: CiType;
          from_ci_id: string;
          to_ci_type: CiType;
          to_ci_id: string;
          relation_type: string;
          source: CiRelationship["source"];
          note: string | null;
          created_at: Date;
          updated_at: Date;
        }>(
          `SELECT id::text AS id, from_ci_type, from_ci_id, to_ci_type, to_ci_id,
                  relation_type, source, note, created_at, updated_at
             FROM ci_relationship
            WHERE (from_ci_type = $1 AND from_ci_id = $2)
               OR (to_ci_type = $1 AND to_ci_id = $2)
            ORDER BY (source = 'manual') DESC, updated_at DESC`,
          [ciType, ciId],
        );
        return rows.map((r) => ({
          id: r.id,
          fromCiType: r.from_ci_type,
          fromCiId: r.from_ci_id,
          toCiType: r.to_ci_type,
          toCiId: r.to_ci_id,
          relationType: r.relation_type,
          source: r.source,
          note: r.note,
          createdAt: fmtIso(r.created_at) ?? "",
          updatedAt: fmtIso(r.updated_at) ?? "",
        }));
      } catch {
        return mockRepositories.crm.listCiRelationships(ciType, ciId);
      }
    },

    // The whole edge table — the n-hop input for impact analysis (#650). Small curated
    // graph, so reading it whole is cheap; the traversal happens in-process (impact.ts).
    async listAllCiRelationships(): Promise<CiRelationship[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listAllCiRelationships();
      try {
        const { rows } = await pool.query<{
          id: string;
          from_ci_type: CiType;
          from_ci_id: string;
          to_ci_type: CiType;
          to_ci_id: string;
          relation_type: string;
          source: CiRelationship["source"];
          note: string | null;
          created_at: Date;
          updated_at: Date;
        }>(
          `SELECT id::text AS id, from_ci_type, from_ci_id, to_ci_type, to_ci_id,
                  relation_type, source, note, created_at, updated_at
             FROM ci_relationship
            ORDER BY (source = 'manual') DESC, updated_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          fromCiType: r.from_ci_type,
          fromCiId: r.from_ci_id,
          toCiType: r.to_ci_type,
          toCiId: r.to_ci_id,
          relationType: r.relation_type,
          source: r.source,
          note: r.note,
          createdAt: fmtIso(r.created_at) ?? "",
          updatedAt: fmtIso(r.updated_at) ?? "",
        }));
      } catch {
        return mockRepositories.crm.listAllCiRelationships();
      }
    },

    async createCiRelationship(input: CiRelationshipInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createCiRelationship(input);
      // Validate BOTH endpoints exist in the CI union before inserting — a CI is a
      // projection over silver (#645), so there is no FK to enforce this. Re-add of the
      // same manual edge is a no-op (ON CONFLICT on the (from,to,relation,source) key).
      const items = await this.listConfigurationItems();
      const exists = (t: CiType, id: string) =>
        items.some((c) => c.ciType === t && c.ciId === id);
      if (!exists(input.fromCiType, input.fromCiId)) {
        throw new Error("Source CI not found in the configuration item register.");
      }
      if (!exists(input.toCiType, input.toCiId)) {
        throw new Error("Target CI not found in the configuration item register.");
      }
      if (
        input.fromCiType === input.toCiType &&
        input.fromCiId === input.toCiId
      ) {
        throw new Error("A relationship cannot point a CI at itself.");
      }
      await pool.query(
        `INSERT INTO ci_relationship
           (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source, note)
         VALUES ($1, $2, $3, $4, $5, 'manual', $6)
         ON CONFLICT (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
         DO NOTHING`,
        [
          input.fromCiType,
          input.fromCiId,
          input.toCiType,
          input.toCiId,
          input.relationType,
          input.note,
        ],
      );
    },

    async updateCiRelationship(
      id: string,
      patch: { relationType: string; note: string | null },
    ): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateCiRelationship(id, patch);
      // Only MANUAL edges are editable — a derived edge is recomputable, so the UPDATE
      // is scoped to source='manual' (it no-ops on a derived row).
      await pool.query(
        `UPDATE ci_relationship
            SET relation_type = $2, note = $3, updated_at = now()
          WHERE id = $1 AND source = 'manual'`,
        [id, patch.relationType, patch.note],
      );
    },

    async deleteCiRelationship(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteCiRelationship(id);
      // Only MANUAL edges are deletable — deleting a derived edge would just reappear on
      // the next re-derivation, so the DELETE is scoped to source='manual'.
      await pool.query(
        `DELETE FROM ci_relationship WHERE id = $1 AND source = 'manual'`,
        [id],
      );
    },

    async deriveCiRelationships(): Promise<number> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deriveCiRelationships();
      // The same recompute the migration's seed runs, on demand: replace ONLY the
      // derived edges from current silver FKs; manual edges are never touched. Done in
      // one transaction so a partial recompute never leaves the graph half-derived.
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`DELETE FROM ci_relationship WHERE source = 'derived'`);
        // device belongs-to account
        await client.query(
          `INSERT INTO ci_relationship
             (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
           SELECT 'device', d.id::text, 'account', d.account_id::text, 'belongs-to', 'derived'
             FROM device d
            WHERE d.account_id IS NOT NULL
           ON CONFLICT (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
           DO NOTHING`,
        );
        // user belongs-to account
        await client.query(
          `INSERT INTO ci_relationship
             (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
           SELECT 'user', c.id::text, 'account', c.account_id::text, 'belongs-to', 'derived'
             FROM contact c
            WHERE c.account_id IS NOT NULL
           ON CONFLICT (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
           DO NOTHING`,
        );
        // cloud-asset belongs-to account (cloud_asset.account_id, #653). cloud→device/service
        // is intentionally omitted — silver carries no such FK today (see migration 0131/0144).
        await client.query(
          `INSERT INTO ci_relationship
             (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
           SELECT 'cloud', ca.id::text, 'account', ca.account_id::text, 'belongs-to', 'derived'
             FROM cloud_asset ca
            WHERE ca.account_id IS NOT NULL
           ON CONFLICT (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
           DO NOTHING`,
        );
        // software runs-on device (software_ci.device_id — a REAL FK, #652) + software
        // belongs-to account (software_ci.account_id). software→user is omitted (no silver FK).
        await client.query(
          `INSERT INTO ci_relationship
             (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
           SELECT 'software', s.id::text, 'device', s.device_id::text, 'runs-on', 'derived'
             FROM software_ci s
           ON CONFLICT (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
           DO NOTHING`,
        );
        await client.query(
          `INSERT INTO ci_relationship
             (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
           SELECT 'software', s.id::text, 'account', s.account_id::text, 'belongs-to', 'derived'
             FROM software_ci s
            WHERE s.account_id IS NOT NULL
           ON CONFLICT (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
           DO NOTHING`,
        );
        const { rows } = await client.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM ci_relationship WHERE source = 'derived'`,
        );
        await client.query("COMMIT");
        return Number(rows[0]?.count ?? 0);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    // ── CMDB criticality overlay (#648, migration 0132) ─────────────────────────
    async setCiCriticalityOverride(input: CiCriticalityOverrideInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setCiCriticalityOverride(input);
      // Validate the CI exists in the union read-model first (a CI is a projection over
      // silver, #645 — there is no FK to enforce this). Then UPSERT the overlay row,
      // touching ONLY the override (+ its audit). If the row is new we must also stamp a
      // derived_default so the NOT NULL holds — recompute it in code from the same rule.
      const items = await this.listConfigurationItems();
      const ci = items.find((c) => c.ciType === input.ciType && c.ciId === input.ciId);
      if (!ci) throw new Error("CI not found in the configuration item register.");
      await pool.query(
        `INSERT INTO cmdb_ci_overlay (ci_type, ci_id, derived_default, override, override_at)
         VALUES ($1, $2, $3::ci_criticality, $4::ci_criticality, CASE WHEN $4 IS NULL THEN NULL ELSE now() END)
         ON CONFLICT (ci_type, ci_id)
         DO UPDATE SET override = EXCLUDED.override,
                       override_at = CASE WHEN EXCLUDED.override IS NULL THEN NULL ELSE now() END,
                       updated_at = now()`,
        [input.ciType, input.ciId, ci.derivedDefault, input.override],
      );
    },

    async deriveCiCriticality(): Promise<number> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deriveCiCriticality();
      // Recompute derived_default for every CI from current silver (the same rule the
      // migration seed runs), rewriting ONLY derived_default; override (+ audit) is
      // preserved. One transaction so a partial recompute never half-derives the overlay.
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO cmdb_ci_overlay (ci_type, ci_id, derived_default)
           SELECT 'account', a.id::text,
                  (CASE
                     WHEN a.relationship::text = 'customer' AND a.lifecycle_stage::text = 'managed_active' THEN 'high'
                     WHEN a.relationship::text = 'customer' THEN 'medium'
                     WHEN a.relationship::text = 'partner' THEN 'medium'
                     ELSE 'low'
                   END)::ci_criticality
             FROM account a
           ON CONFLICT (ci_type, ci_id)
           DO UPDATE SET derived_default = EXCLUDED.derived_default, updated_at = now()`,
        );
        await client.query(
          `INSERT INTO cmdb_ci_overlay (ci_type, ci_id, derived_default)
           SELECT 'device', d.id::text,
                  (CASE
                     WHEN lower(d.device_type) IN ('server', 'network') THEN 'high'
                     WHEN lower(d.device_type) IN ('workstation', 'mobile', 'laptop', 'desktop') THEN 'medium'
                     ELSE 'low'
                   END)::ci_criticality
             FROM device d
            WHERE d.account_id IS NOT NULL
           ON CONFLICT (ci_type, ci_id)
           DO UPDATE SET derived_default = EXCLUDED.derived_default, updated_at = now()`,
        );
        await client.query(
          `INSERT INTO cmdb_ci_overlay (ci_type, ci_id, derived_default)
           SELECT 'user', c.id::text, 'medium'::ci_criticality
             FROM contact c
            WHERE c.account_id IS NOT NULL
           ON CONFLICT (ci_type, ci_id)
           DO UPDATE SET derived_default = EXCLUDED.derived_default, updated_at = now()`,
        );
        // cloud → category (mirrors deriveCloudCriticality in src/lib/cmdb/criticality.ts:
        // database/identity/security → high; compute/network → medium; else low, #653).
        await client.query(
          `INSERT INTO cmdb_ci_overlay (ci_type, ci_id, derived_default)
           SELECT 'cloud', ca.id::text,
                  (CASE
                     WHEN ca.category::text IN ('database', 'identity', 'security') THEN 'high'
                     WHEN ca.category::text IN ('compute', 'network') THEN 'medium'
                     ELSE 'low'
                   END)::ci_criticality
             FROM cloud_asset ca
            WHERE ca.account_id IS NOT NULL
           ON CONFLICT (ci_type, ci_id)
           DO UPDATE SET derived_default = EXCLUDED.derived_default, updated_at = now()`,
        );
        // software → flat `low` baseline (supporting asset; mirrors deriveSoftwareCriticality
        // in src/lib/cmdb/criticality.ts and the migration 0204 seed, #652).
        await client.query(
          `INSERT INTO cmdb_ci_overlay (ci_type, ci_id, derived_default)
           SELECT 'software', s.id::text, 'low'::ci_criticality
             FROM software_ci s
            WHERE s.account_id IS NOT NULL
           ON CONFLICT (ci_type, ci_id)
           DO UPDATE SET derived_default = EXCLUDED.derived_default, updated_at = now()`,
        );
        const { rows } = await client.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM cmdb_ci_overlay`,
        );
        await client.query("COMMIT");
        return Number(rows[0]?.count ?? 0);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async listInvoices(): Promise<InvoiceMirrorRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listInvoices();
      try {
        // Read the `invoice_mirror` view (migration 0121, #668, ADR-0085).
        // A plain read-only projection over bronze qbo_invoices — every read recomputes
        // aging against the latest pulled invoices. Amounts/dates are already typed in the
        // view; cast numerics to text so they map straight to the typed string fields (no
        // driver-dependent numeric object). Sort oldest-overdue first (collections worklist):
        // open & overdue (90+ → 1-30) ahead of open-current ahead of paid, larger balance
        // breaking ties.
        const { rows } = await pool.query<{
          qbo_invoice_id: string;
          doc_number: string | null;
          qbo_customer_id: string | null;
          qbo_customer_name: string | null;
          account_id: string | null;
          account_name: string | null;
          txn_date: Date | null;
          due_date: Date | null;
          total_amount: string | null;
          balance: string | null;
          currency: string | null;
          email_status: string | null;
          is_open: boolean;
          days_overdue: number | null;
          aging_bucket: InvoiceAgingBucket;
        }>(
          `SELECT qbo_invoice_id, doc_number, qbo_customer_id, qbo_customer_name,
                  account_id::text AS account_id, account_name,
                  txn_date, due_date,
                  total_amount::text AS total_amount,
                  balance::text AS balance,
                  currency, email_status, is_open, days_overdue, aging_bucket
           FROM invoice_mirror
           ORDER BY
             CASE aging_bucket
               WHEN '90+'     THEN 0
               WHEN '61-90'   THEN 1
               WHEN '31-60'   THEN 2
               WHEN '1-30'    THEN 3
               WHEN 'current' THEN 4
               ELSE 5
             END,
             COALESCE(balance, 0) DESC`,
        );
        return rows.map((r) => ({
          qboInvoiceId: r.qbo_invoice_id,
          docNumber: r.doc_number,
          qboCustomerId: r.qbo_customer_id,
          qboCustomerName: r.qbo_customer_name,
          accountId: r.account_id,
          accountName: r.account_name,
          txnDate: fmtIso(r.txn_date),
          dueDate: fmtIso(r.due_date),
          totalAmount: r.total_amount,
          balance: r.balance,
          currency: r.currency,
          emailStatus: r.email_status,
          isOpen: r.is_open,
          daysOverdue: r.days_overdue,
          agingBucket: r.aging_bucket,
        }));
      } catch {
        return mockRepositories.crm.listInvoices();
      }
    },

    async getCollectionsActivity(qboInvoiceId: string): Promise<CollectionsActivity | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getCollectionsActivity(qboInvoiceId);
      try {
        // Read the app-native dunning overlay (collections_activity, migration 0122, #677)
        // for one invoice. Keyed by the QBO invoice id (the invoice mirror is a VIEW — no FK).
        // One CURRENT-state row per invoice; null when the invoice has never been worked.
        const { rows } = await pool.query<{
          id: string;
          qbo_invoice_id: string;
          status: DunningStatus;
          escalation_level: number;
          assignee_user_id: string | null;
          reminders: CollectionsReminder[] | null;
          notes: string | null;
          created_at: Date;
          updated_at: Date;
        }>(
          `SELECT id::text AS id, qbo_invoice_id, status, escalation_level,
                  assignee_user_id::text AS assignee_user_id, reminders, notes,
                  created_at, updated_at
             FROM collections_activity
            WHERE qbo_invoice_id = $1
            ORDER BY updated_at DESC
            LIMIT 1`,
          [qboInvoiceId],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          qboInvoiceId: r.qbo_invoice_id,
          status: r.status,
          escalationLevel: Number(r.escalation_level),
          assigneeUserId: r.assignee_user_id,
          reminders: Array.isArray(r.reminders) ? r.reminders : [],
          notes: r.notes,
          createdAt: fmtIso(r.created_at) ?? "",
          updatedAt: fmtIso(r.updated_at) ?? "",
        };
      } catch {
        return mockRepositories.crm.getCollectionsActivity(qboInvoiceId);
      }
    },

    // ── Collections worklist batched read (#678) ──────────────────────────────
    async getCollectionsActivityForMany(
      qboInvoiceIds: string[],
    ): Promise<Record<string, CollectionsActivity>> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getCollectionsActivityForMany(qboInvoiceIds);
      if (qboInvoiceIds.length === 0) return {};
      try {
        // One read over collections_activity for every overdue invoice on the worklist
        // (#678) — the bulk form of getCollectionsActivity. DISTINCT ON keeps one
        // CURRENT-state row per invoice (most recently updated wins), mirroring the
        // per-invoice read's `ORDER BY updated_at DESC LIMIT 1`.
        const { rows } = await pool.query<{
          id: string;
          qbo_invoice_id: string;
          status: DunningStatus;
          escalation_level: number;
          assignee_user_id: string | null;
          reminders: CollectionsReminder[] | null;
          notes: string | null;
          created_at: Date;
          updated_at: Date;
        }>(
          `SELECT DISTINCT ON (qbo_invoice_id)
                  id::text AS id, qbo_invoice_id, status, escalation_level,
                  assignee_user_id::text AS assignee_user_id, reminders, notes,
                  created_at, updated_at
             FROM collections_activity
            WHERE qbo_invoice_id = ANY($1::text[])
            ORDER BY qbo_invoice_id, updated_at DESC`,
          [qboInvoiceIds],
        );
        const out: Record<string, CollectionsActivity> = {};
        for (const r of rows) {
          out[r.qbo_invoice_id] = {
            id: r.id,
            qboInvoiceId: r.qbo_invoice_id,
            status: r.status,
            escalationLevel: Number(r.escalation_level),
            assigneeUserId: r.assignee_user_id,
            reminders: Array.isArray(r.reminders) ? r.reminders : [],
            notes: r.notes,
            createdAt: fmtIso(r.created_at) ?? "",
            updatedAt: fmtIso(r.updated_at) ?? "",
          };
        }
        return out;
      } catch (err) {
        if (isSchemaLagError(err)) return {};
        return mockRepositories.crm.getCollectionsActivityForMany(qboInvoiceIds);
      }
    },

    async upsertCollectionsActivity(input: CollectionsActivityInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.upsertCollectionsActivity(input);
      // Resolve the invoice's tenant from the read-only mirror — the overlay is scoped per
      // (tenant, invoice) and the QBO invoice id is unique within a tenant/realm. A missing
      // invoice (not in the mirror) is a programmer/data error; bail rather than write an
      // orphan overlay row. App-native — this NEVER writes QuickBooks.
      const tq = await pool.query<{ tenant_id: string }>(
        `SELECT tenant_id FROM invoice_mirror WHERE qbo_invoice_id = $1 LIMIT 1`,
        [input.qboInvoiceId],
      );
      const tenantId = tq.rows[0]?.tenant_id;
      if (!tenantId) {
        throw new Error(`collections overlay: invoice ${input.qboInvoiceId} not found in mirror`);
      }
      // Upsert the CURRENT-state row; the reminder log is APPENDED (jsonb || array), never
      // rewritten, so concurrent reminders don't clobber each other's history.
      const appended = input.appendReminder
        ? JSON.stringify([input.appendReminder])
        : "[]";
      await pool.query(
        `INSERT INTO collections_activity
           (tenant_id, qbo_invoice_id, status, escalation_level, assignee_user_id, reminders, notes)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
         ON CONFLICT (tenant_id, qbo_invoice_id) DO UPDATE SET
           status           = EXCLUDED.status,
           escalation_level = EXCLUDED.escalation_level,
           assignee_user_id = EXCLUDED.assignee_user_id,
           reminders        = collections_activity.reminders || EXCLUDED.reminders,
           notes            = EXCLUDED.notes,
           updated_at       = now()`,
        [
          tenantId,
          input.qboInvoiceId,
          input.status,
          input.escalationLevel,
          input.assigneeUserId ?? null,
          appended,
          input.notes ?? null,
        ],
      );
    },

    async createAccount(input: AccountInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createAccount(input);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO account (name, relationship, lifecycle_stage, is_active)
         VALUES ($1, $2::account_relationship, $3::account_lifecycle_stage, $4)
         RETURNING id`,
        [input.name, input.relationship, input.lifecycleStage, input.isActive],
      );
      await upsertWebsiteCompanyRow(pool, rows[0].id, input);
    },

    async updateAccount(id: string, input: AccountInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateAccount(id, input);
      await pool.query(
        `UPDATE account
         SET name = $1, relationship = $2::account_relationship,
             lifecycle_stage = $3::account_lifecycle_stage, is_active = $4
         WHERE id = $5`,
        [input.name, input.relationship, input.lifecycleStage, input.isActive, id],
      );
      await upsertWebsiteCompanyRow(pool, id, input);
    },

    async deleteAccount(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteAccount(id);
      // Remove manual provenance first (avoid merge resurrection — ADR-0039).
      await pool.query(`DELETE FROM website_companies WHERE account_id = $1`, [id]);
      await pool.query(`DELETE FROM account WHERE id = $1`, [id]);
    },

    async listContacts(opts?: { client?: boolean }): Promise<ContactRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listContacts(opts);
      try {
        const filterClient = opts?.client !== undefined;
        const { rows } = await pool.query<{
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          account: string | null;
        }>(
          `SELECT c.id, c.full_name, c.email, c.phone, a.name AS account
           FROM contact c
           LEFT JOIN account a ON a.id = c.account_id
           ${filterClient ? "WHERE c.is_client = $1" : ""}
           ORDER BY c.full_name`,
          filterClient ? [opts!.client] : [],
        );
        return rows.map((row) => ({
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          account: row.account,
        }));
      } catch {
        return mockRepositories.crm.listContacts(opts);
      }
    },

    async listContactsByStage(opts?: { client?: boolean }): Promise<ContactPipelineRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listContactsByStage(opts);
      try {
        const filterClient = opts?.client !== undefined;
        const { rows } = await pool.query<{
          id: string;
          full_name: string;
          email: string | null;
          account: string | null;
          crm_stage: ContactCrmStage;
        }>(
          `SELECT c.id, c.full_name, c.email, c.crm_stage, a.name AS account
           FROM contact c
           LEFT JOIN account a ON a.id = c.account_id
           ${filterClient ? "WHERE c.is_client = $1" : ""}
           ORDER BY c.full_name`,
          filterClient ? [opts!.client] : [],
        );
        return rows.map((row) => ({
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          account: row.account,
          crmStage: row.crm_stage,
        }));
      } catch {
        return mockRepositories.crm.listContactsByStage(opts);
      }
    },

    async setContactStage(id: string, stage: ContactCrmStage): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setContactStage(id, stage);
      await pool.query(
        `UPDATE contact SET crm_stage = $2::contact_crm_stage WHERE id = $1`,
        [id, stage],
      );
    },

    async listOpportunities(): Promise<OpportunityRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listOpportunities();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          account: string;
          stage: string;
          mrr: string;
        }>(
          `SELECT o.id, o.name, a.name AS account, o.sales_stage AS stage,
                  coalesce(o.amount_mrr, 0) AS mrr
           FROM opportunity o
           JOIN account a ON a.id = o.account_id
           ORDER BY a.name, o.name`,
        );
        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          account: row.account,
          stage: row.stage,
          mrr: Number(row.mrr) > 0 ? `${fmtUsd(Number(row.mrr))}/mo` : "—",
        }));
      } catch {
        return mockRepositories.crm.listOpportunities();
      }
    },

    // Deal/opportunity 360 (ADR-0068, #681) — one opportunity for the detail
    // route's header, with account_id so the page can key the account-scoped
    // conversation read and filter it to this deal.
    async getOpportunity(id: string): Promise<OpportunityDetailRow | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getOpportunity(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          account: string;
          account_id: string;
          stage: string;
          mrr: string;
        }>(
          `SELECT o.id, o.name, a.name AS account, o.account_id,
                  o.sales_stage AS stage, coalesce(o.amount_mrr, 0) AS mrr
             FROM opportunity o
             JOIN account a ON a.id = o.account_id
            WHERE o.id = $1`,
          [id],
        );
        const row = rows[0];
        if (!row) return null;
        return {
          id: row.id,
          name: row.name,
          account: row.account,
          accountId: row.account_id,
          stage: row.stage,
          mrr: Number(row.mrr) > 0 ? `${fmtUsd(Number(row.mrr))}/mo` : "—",
        };
      } catch {
        return mockRepositories.crm.getOpportunity(id);
      }
    },

    async setOpportunityStage(id: string, stage: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setOpportunityStage(id, stage);
      await pool.query(
        `UPDATE opportunity SET sales_stage = $2::opportunity_sales_stage WHERE id = $1`,
        [id, stage],
      );
    },

    async getOpportunityKnowledge(opportunityId: string): Promise<OpportunityKnowledgeRow> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getOpportunityKnowledge(opportunityId);
      try {
        const { rows } = await pool.query<{
          notes: string | null;
          knowledge_blob_refs: unknown;
          collected_at: string | null;
        }>(
          // The website bronze row is keyed by the silver opportunity id (external_id).
          `SELECT notes, knowledge_blob_refs, collected_at
             FROM website_opportunities
            WHERE source = 'website' AND external_id = $1
            LIMIT 1`,
          [opportunityId],
        );
        const row = rows[0];
        if (!row) return { notes: null, knowledge: [], updatedAt: null };
        return {
          notes: row.notes,
          knowledge: parseKnowledgeRefs(row.knowledge_blob_refs),
          updatedAt: row.collected_at,
        };
      } catch {
        // Bronze table may lag in some envs (0083) — honest empty, never fail the 360.
        return { notes: null, knowledge: [], updatedAt: null };
      }
    },

    async addOpportunityKnowledge(input: OpportunityKnowledgeInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.addOpportunityKnowledge(input);

      // Append the new knowledge refs to whatever is already recorded — history is
      // never rewritten (a prior upload stays even when notes are edited later).
      const existing = await this.getOpportunityKnowledge(input.opportunityId);
      const mergedKnowledge: OpportunityKnowledgeRef[] = [
        ...existing.knowledge,
        ...input.addedKnowledge,
      ];

      // The lossless bronze envelope (0083 LP style: tenant_id/source/external_id/
      // collected_at/raw_payload/content_hash). The website source is the MSP's own
      // GUI — not a per-client tenant — so it carries the stable 'website' envelope
      // tenant; the opportunity id (globally unique) is the external_id. content_hash
      // is computed over the manual payload so an unchanged re-save is a no-op merge.
      const payload = {
        title: input.title,
        stage: input.stage,
        account_ref: input.accountRef,
        owner_user_id: input.ownerUserId,
        notes: input.notes,
        knowledge_blob_refs: mergedKnowledge,
      };
      const raw = JSON.stringify(payload);
      const contentHash = createHash("sha256").update(raw).digest("hex");

      await pool.query(
        `INSERT INTO website_opportunities
           (title, stage, amount, close_date, account_ref, owner_user_id, notes,
            knowledge_blob_refs, tenant_id, source, external_id, collected_at,
            raw_payload, content_hash)
         VALUES ($1, $2, NULL, NULL, $3, $4, $5, $6::jsonb,
                 'website', 'website', $7, now()::text, $8::jsonb, $9)
         ON CONFLICT (tenant_id, source, external_id) DO UPDATE
           SET title = EXCLUDED.title, stage = EXCLUDED.stage,
               account_ref = EXCLUDED.account_ref, owner_user_id = EXCLUDED.owner_user_id,
               notes = EXCLUDED.notes, knowledge_blob_refs = EXCLUDED.knowledge_blob_refs,
               collected_at = EXCLUDED.collected_at, raw_payload = EXCLUDED.raw_payload,
               content_hash = EXCLUDED.content_hash`,
        [
          input.title,
          input.stage,
          input.accountRef,
          input.ownerUserId,
          input.notes,
          JSON.stringify(mergedKnowledge),
          input.opportunityId,
          raw,
          contentHash,
        ],
      );
    },

    async listOpportunityForecast(): Promise<OpportunityForecastRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listOpportunityForecast();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          account: string;
          stage: string;
          deal_value: string;
          expected_close_date: string | null;
          win_probability: string | null;
          forecast_category: ForecastCategory | null;
        }>(
          // Forecast read model (ADR-0072): the raw forecast fields per opportunity.
          // deal_value is amount_mrr in v1 (quote-derived post-CPQ, ADR-0067); the
          // effective probability + weighted value are computed in lib/forecast.ts.
          `SELECT o.id, o.name, a.name AS account, o.sales_stage AS stage,
                  coalesce(o.amount_mrr, 0) AS deal_value,
                  to_char(o.expected_close_date, 'YYYY-MM-DD') AS expected_close_date,
                  o.win_probability, o.forecast_category
           FROM opportunity o
           JOIN account a ON a.id = o.account_id
           ORDER BY a.name, o.name`,
        );
        return rows.map((row) => {
          const dealValue = Number(row.deal_value) || 0;
          const probability = effectiveWinProbability(
            row.stage,
            row.win_probability == null ? null : Number(row.win_probability),
          );
          return {
            id: row.id,
            name: row.name,
            account: row.account,
            stage: row.stage,
            dealValue,
            expectedCloseDate: row.expected_close_date,
            winProbability: probability,
            forecastCategory: row.forecast_category,
            weighted: weightedValue(dealValue, probability),
          };
        });
      } catch {
        return mockRepositories.crm.listOpportunityForecast();
      }
    },

    async listQuotas(): Promise<QuotaRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listQuotas();
      try {
        const { rows } = await pool.query<{
          id: string;
          owner_user_id: string | null;
          owner_name: string | null;
          team: string | null;
          period_start: string;
          period_end: string;
          amount: string;
        }>(
          `SELECT q.id, q.owner_user_id, u.display_name AS owner_name, q.team,
                  to_char(q.period_start, 'YYYY-MM-DD') AS period_start,
                  to_char(q.period_end, 'YYYY-MM-DD') AS period_end,
                  q.amount
           FROM quota q
           LEFT JOIN app_user u ON u.id = q.owner_user_id
           ORDER BY q.period_start DESC, q.period_end DESC`,
        );
        return rows.map((row) => ({
          id: row.id,
          ownerUserId: row.owner_user_id,
          ownerName: row.owner_name,
          team: row.team,
          periodStart: row.period_start,
          periodEnd: row.period_end,
          amount: Number(row.amount) || 0,
        }));
      } catch {
        return mockRepositories.crm.listQuotas();
      }
    },

    async listForecastSnapshots(): Promise<ForecastSnapshotRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listForecastSnapshots();
      try {
        const { rows } = await pool.query<{
          id: string;
          captured_on: string;
          owner_user_id: string | null;
          owner_name: string | null;
          team: string | null;
          period_start: string;
          period_end: string;
          weighted: string;
          commit_total: string;
          best_case_total: string;
          pipeline_total: string;
          closed_won: string;
          quota: string | null;
        }>(
          // Forecast-accuracy read model (ADR-0072 decision 5, #384): the nightly
          // point-in-time forecast calls. The accuracy/variance math lives in
          // lib/forecast-accuracy.ts; this only shapes rows. ORDER feeds the trend.
          `SELECT s.id,
                  to_char(s.captured_on, 'YYYY-MM-DD')  AS captured_on,
                  s.owner_user_id, u.display_name        AS owner_name, s.team,
                  to_char(s.period_start, 'YYYY-MM-DD')  AS period_start,
                  to_char(s.period_end, 'YYYY-MM-DD')    AS period_end,
                  s.weighted, s.commit_total, s.best_case_total, s.pipeline_total,
                  s.closed_won, s.quota
           FROM forecast_snapshot s
           LEFT JOIN app_user u ON u.id = s.owner_user_id
           ORDER BY s.period_end DESC, s.captured_on ASC`,
        );
        return rows.map((row) => ({
          id: row.id,
          capturedOn: row.captured_on,
          ownerUserId: row.owner_user_id,
          ownerName: row.owner_name,
          team: row.team,
          periodStart: row.period_start,
          periodEnd: row.period_end,
          weighted: Number(row.weighted) || 0,
          commitTotal: Number(row.commit_total) || 0,
          bestCaseTotal: Number(row.best_case_total) || 0,
          pipelineTotal: Number(row.pipeline_total) || 0,
          closedWon: Number(row.closed_won) || 0,
          quota: row.quota == null ? null : Number(row.quota) || 0,
        }));
      } catch {
        return mockRepositories.crm.listForecastSnapshots();
      }
    },

    async listLeadScores(kind: LeadScoreKind = "rule"): Promise<LeadScoreRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listLeadScores(kind);
      try {
        const { rows } = await pool.query<{
          id: string;
          contact_id: string;
          contact_name: string;
          account: string | null;
          kind: LeadScoreKind;
          score: string;
          breakdown: LeadScoreComponent[] | null;
          computed_at: string;
        }>(
          // Lead-score read model (ADR-0073, #401): the stored score per contact,
          // ranked high→low for routing/list use. The band is derived in the app.
          `SELECT ls.id, ls.contact_id, c.full_name AS contact_name,
                  a.name AS account, ls.kind, ls.score, ls.breakdown,
                  ls.computed_at
           FROM lead_score ls
           JOIN contact c ON c.id = ls.contact_id
           LEFT JOIN account a ON a.id = c.account_id
           WHERE ls.kind = $1
           ORDER BY ls.score DESC, c.full_name`,
          [kind],
        );
        return rows.map(mapLeadScoreRow);
      } catch {
        return mockRepositories.crm.listLeadScores(kind);
      }
    },

    async listLeadScoresForContact(contactId: string): Promise<LeadScoreRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listLeadScoresForContact(contactId);
      try {
        const { rows } = await pool.query<{
          id: string;
          contact_id: string;
          contact_name: string;
          account: string | null;
          kind: LeadScoreKind;
          score: string;
          breakdown: LeadScoreComponent[] | null;
          computed_at: string;
        }>(
          `SELECT ls.id, ls.contact_id, c.full_name AS contact_name,
                  a.name AS account, ls.kind, ls.score, ls.breakdown,
                  ls.computed_at
           FROM lead_score ls
           JOIN contact c ON c.id = ls.contact_id
           LEFT JOIN account a ON a.id = c.account_id
           WHERE ls.contact_id = $1
           ORDER BY ls.score DESC`,
          [contactId],
        );
        return rows.map(mapLeadScoreRow);
      } catch {
        return mockRepositories.crm.listLeadScoresForContact(contactId);
      }
    },

    // Chat-session read model (ADR-0074 §5, #403): Imperion-native pre-ticket / bot
    // conversations + deflection telemetry. Account/contact are LEFT-joined (a pre-ticket
    // session may be anonymous). WRITTEN by the backend chat process (ADR-0042); read here.
    async listChatSessions(limit = 200): Promise<ChatSessionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listChatSessions(limit);
      try {
        const { rows } = await pool.query<{
          id: string;
          account_id: string | null;
          account: string | null;
          contact_id: string | null;
          contact_name: string | null;
          status: ChatSessionStatus;
          channel: ChatSessionChannel;
          deflected: boolean;
          deflection_kind: ChatDeflectionKind | null;
          escalated_ticket_ref: string | null;
          had_ticket: boolean;
          transcript_uri: string | null;
          summary: string | null;
          started_at: string;
          closed_at: string | null;
        }>(
          `SELECT cs.id, cs.account_id, a.name AS account,
                  cs.contact_id, c.full_name AS contact_name,
                  cs.status, cs.channel, cs.deflected, cs.deflection_kind,
                  cs.escalated_ticket_ref, cs.had_ticket, cs.transcript_uri,
                  cs.summary, cs.started_at, cs.closed_at
           FROM chat_session cs
           LEFT JOIN contact c ON c.id = cs.contact_id
           LEFT JOIN account a ON a.id = cs.account_id
           ORDER BY cs.started_at DESC
           LIMIT $1`,
          [limit],
        );
        return rows.map(mapChatSessionRow);
      } catch {
        return mockRepositories.crm.listChatSessions(limit);
      }
    },

    async listChatSessionsForContact(contactId: string): Promise<ChatSessionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listChatSessionsForContact(contactId);
      try {
        const { rows } = await pool.query<{
          id: string;
          account_id: string | null;
          account: string | null;
          contact_id: string | null;
          contact_name: string | null;
          status: ChatSessionStatus;
          channel: ChatSessionChannel;
          deflected: boolean;
          deflection_kind: ChatDeflectionKind | null;
          escalated_ticket_ref: string | null;
          had_ticket: boolean;
          transcript_uri: string | null;
          summary: string | null;
          started_at: string;
          closed_at: string | null;
        }>(
          `SELECT cs.id, cs.account_id, a.name AS account,
                  cs.contact_id, c.full_name AS contact_name,
                  cs.status, cs.channel, cs.deflected, cs.deflection_kind,
                  cs.escalated_ticket_ref, cs.had_ticket, cs.transcript_uri,
                  cs.summary, cs.started_at, cs.closed_at
           FROM chat_session cs
           LEFT JOIN contact c ON c.id = cs.contact_id
           LEFT JOIN account a ON a.id = cs.account_id
           WHERE cs.contact_id = $1
           ORDER BY cs.started_at DESC`,
          [contactId],
        );
        return rows.map(mapChatSessionRow);
      } catch {
        return mockRepositories.crm.listChatSessionsForContact(contactId);
      }
    },

    async listTasks(): Promise<TaskRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listTasks();
      try {
        const { rows } = await pool.query<{
          id: string;
          title: string;
          status: string;
          category: TaskCategory;
          due_at: Date | null;
          start_at: Date | null;
          estimate: string | null;
          estimate_unit: string | null;
          logged_minutes: string;
          account: string | null;
          project_id: string | null;
          child_count: string;
          child_done_count: string;
          status_def_key: string | null;
        }>(
          // Top-level tasks only (parent_task_id IS NULL); subtasks surface under
          // their parent via getTaskChildren. The lateral counts the n/m rollup
          // (ADR-0065 B1, #335); the second lateral sums logged minutes (#346). The
          // status_def join exposes the configurable-status key (ADR-0065 B5, #613) so
          // the kanban board buckets by it when set, else the legacy text status.
          `SELECT t.id, t.title, t.status, t.category, t.due_at, t.start_at,
                  t.estimate, t.estimate_unit, a.name AS account,
                  t.project_id, c.child_count, c.child_done_count,
                  COALESCE(te.logged_minutes, 0) AS logged_minutes,
                  sd.key AS status_def_key
           FROM task t
           LEFT JOIN account a ON a.id = t.account_id
           LEFT JOIN status_def sd ON sd.id = t.status_def_id
           LEFT JOIN LATERAL (
             SELECT count(*) AS child_count,
                    count(*) FILTER (WHERE ch.status = 'done') AS child_done_count
             FROM task ch WHERE ch.parent_task_id = t.id
           ) c ON true
           LEFT JOIN LATERAL (
             SELECT sum(minutes) AS logged_minutes
             FROM time_entry WHERE task_id = t.id
           ) te ON true
           WHERE t.parent_task_id IS NULL
           ORDER BY t.due_at NULLS LAST, t.title`,
        );
        return rows.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          category: row.category,
          due: fmtDate(row.due_at),
          account: row.account,
          projectId: row.project_id,
          childCount: Number(row.child_count),
          childDoneCount: Number(row.child_done_count),
          startAt: fmtDate(row.start_at),
          estimate: row.estimate,
          estimateUnit: row.estimate_unit,
          loggedMinutes: Number(row.logged_minutes),
          statusDefKey: row.status_def_key,
        }));
      } catch {
        return mockRepositories.crm.listTasks();
      }
    },

    async listProjectTasks(projectId: string): Promise<TaskRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listProjectTasks(projectId);
      try {
        const { rows } = await pool.query<{
          id: string;
          title: string;
          status: string;
          category: TaskCategory;
          due_at: Date | null;
          start_at: Date | null;
          estimate: string | null;
          estimate_unit: string | null;
          logged_minutes: string;
          account: string | null;
          project_id: string | null;
          child_count: string;
          child_done_count: string;
        }>(
          // Top-level tasks for the project; subtasks surface under their parent
          // (ADR-0065 B1, #335). The second lateral sums logged minutes (#346).
          `SELECT t.id, t.title, t.status, t.category, t.due_at, t.start_at,
                  t.estimate, t.estimate_unit, a.name AS account,
                  t.project_id, c.child_count, c.child_done_count,
                  COALESCE(te.logged_minutes, 0) AS logged_minutes
           FROM task t
           LEFT JOIN account a ON a.id = t.account_id
           LEFT JOIN LATERAL (
             SELECT count(*) AS child_count,
                    count(*) FILTER (WHERE ch.status = 'done') AS child_done_count
             FROM task ch WHERE ch.parent_task_id = t.id
           ) c ON true
           LEFT JOIN LATERAL (
             SELECT sum(minutes) AS logged_minutes
             FROM time_entry WHERE task_id = t.id
           ) te ON true
           WHERE t.project_id = $1 AND t.parent_task_id IS NULL
           ORDER BY t.due_at NULLS LAST, t.title`,
          [projectId],
        );
        return rows.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          category: row.category,
          due: fmtDate(row.due_at),
          account: row.account,
          projectId: row.project_id,
          childCount: Number(row.child_count),
          childDoneCount: Number(row.child_done_count),
          startAt: fmtDate(row.start_at),
          estimate: row.estimate,
          estimateUnit: row.estimate_unit,
          loggedMinutes: Number(row.logged_minutes),
        }));
      } catch {
        return mockRepositories.crm.listProjectTasks(projectId);
      }
    },

    // ── Sprints / backlog (ADR-0069 D4, #349) ──────────────────────────────────
    async listSprints(): Promise<SprintRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listSprints();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          project_id: string | null;
          project: string | null;
          starts_at: Date | null;
          ends_at: Date | null;
          status: string;
          task_count: string;
          done_count: string;
        }>(
          // Each sprint + its owning project name + the committed-task rollup
          // (count + done) via a lateral, so a list row shows progress in one read.
          `SELECT s.id, s.name, s.project_id, p.name AS project,
                  s.starts_at, s.ends_at, s.status,
                  c.task_count, c.done_count
             FROM sprint s
             LEFT JOIN project p ON p.id = s.project_id
             LEFT JOIN LATERAL (
               SELECT count(*) AS task_count,
                      count(*) FILTER (WHERE t.status = 'done') AS done_count
                 FROM task t WHERE t.sprint_id = s.id
             ) c ON true
            ORDER BY s.created_at DESC`,
        );
        return rows.map(mapSprintRow);
      } catch (err) {
        // sprint (0107) may not be prod-applied yet → empty, not a 500.
        if (isSchemaLagError(err)) return [];
        return mockRepositories.crm.listSprints();
      }
    },

    async getSprint(id: string): Promise<SprintRow | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getSprint(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          project_id: string | null;
          project: string | null;
          starts_at: Date | null;
          ends_at: Date | null;
          status: string;
          task_count: string;
          done_count: string;
        }>(
          `SELECT s.id, s.name, s.project_id, p.name AS project,
                  s.starts_at, s.ends_at, s.status,
                  c.task_count, c.done_count
             FROM sprint s
             LEFT JOIN project p ON p.id = s.project_id
             LEFT JOIN LATERAL (
               SELECT count(*) AS task_count,
                      count(*) FILTER (WHERE t.status = 'done') AS done_count
                 FROM task t WHERE t.sprint_id = s.id
             ) c ON true
            WHERE s.id = $1`,
          [id],
        );
        return rows[0] ? mapSprintRow(rows[0]) : null;
      } catch (err) {
        if (isSchemaLagError(err)) return null;
        return mockRepositories.crm.getSprint(id);
      }
    },

    async createSprint(input: SprintInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createSprint(input);
      await pool.query(
        `INSERT INTO sprint (name, project_id, starts_at, ends_at, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [input.name, input.projectId, input.startsAt, input.endsAt, input.status],
      );
    },

    async updateSprint(id: string, input: SprintInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateSprint(id, input);
      await pool.query(
        `UPDATE sprint
            SET name = $2, project_id = $3, starts_at = $4, ends_at = $5, status = $6
          WHERE id = $1`,
        [id, input.name, input.projectId, input.startsAt, input.endsAt, input.status],
      );
    },

    async closeSprint(id: string): Promise<number> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.closeSprint(id);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Carry-over (#349 acceptance): the sprint's still-open tasks move to the
        // next planned sprint in the SAME scope (same project_id, NULL-safe),
        // earliest-starting; or to the backlog (sprint_id = NULL) when none exists.
        const { rowCount } = await client.query(
          `UPDATE task
              SET sprint_id = (
                SELECT ns.id FROM sprint ns
                 WHERE ns.status = 'planned'
                   AND ns.id <> $1
                   AND ns.project_id IS NOT DISTINCT FROM
                       (SELECT project_id FROM sprint WHERE id = $1)
                 ORDER BY ns.starts_at NULLS LAST, ns.created_at
                 LIMIT 1
              )
            WHERE sprint_id = $1 AND status <> 'done'`,
          [id],
        );
        await client.query(
          `UPDATE sprint SET status = 'completed' WHERE id = $1`,
          [id],
        );
        await client.query("COMMIT");
        return rowCount ?? 0;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async listSprintTasks(sprintId: string): Promise<TaskRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listSprintTasks(sprintId);
      try {
        const { rows } = await pool.query<TaskListSqlRow>(
          `${TASK_LIST_SELECT}
            WHERE t.sprint_id = $1 AND t.parent_task_id IS NULL
            ORDER BY t.due_at NULLS LAST, t.title`,
          [sprintId],
        );
        return rows.map(mapTaskListRow);
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.crm.listSprintTasks(sprintId);
      }
    },

    async listBacklogTasks(): Promise<TaskRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listBacklogTasks();
      try {
        const { rows } = await pool.query<TaskListSqlRow>(
          `${TASK_LIST_SELECT}
            WHERE t.sprint_id IS NULL AND t.parent_task_id IS NULL
              AND t.status <> 'done'
            ORDER BY t.due_at NULLS LAST, t.title`,
        );
        return rows.map(mapTaskListRow);
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.crm.listBacklogTasks();
      }
    },

    async setTaskSprint(taskId: string, sprintId: string | null): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setTaskSprint(taskId, sprintId);
      await pool.query(`UPDATE task SET sprint_id = $2 WHERE id = $1`, [taskId, sprintId]);
    },

    // ── Agile reporting — burndown / velocity (C5, ADR-0066, #345) ─────────────
    async getSprintBurndownData(sprintId: string): Promise<SprintBurndownData | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getSprintBurndownData(sprintId);
      try {
        const sprint = await this.getSprint(sprintId);
        if (!sprint) return null;
        // The sprint's committed tasks that carry a numeric estimate. `done` keys
        // off the status_def CATEGORY (ADR-0065 — rollups key off category, never
        // label), falling back to the legacy status='done' when no FK is set.
        // completed_at: honest degradation — no status-history table, so updated_at
        // is the best-available closure date for a done task (NULL otherwise).
        const { rows } = await pool.query<{
          estimate: string;
          estimate_unit: string | null;
          done: boolean;
          completed_at: Date | null;
        }>(
          `SELECT t.estimate,
                  t.estimate_unit,
                  (COALESCE(sd.category, t.status) = 'done') AS done,
                  CASE WHEN COALESCE(sd.category, t.status) = 'done'
                       THEN t.updated_at ELSE NULL END        AS completed_at
             FROM task t
             LEFT JOIN status_def sd ON sd.id = t.status_def_id
            WHERE t.sprint_id = $1
              AND t.estimate IS NOT NULL`,
          [sprintId],
        );
        // Un-estimated committed tasks (excluded from the burn, surfaced as a caveat).
        const { rows: unest } = await pool.query<{ n: string }>(
          `SELECT count(*) AS n FROM task WHERE sprint_id = $1 AND estimate IS NULL`,
          [sprintId],
        );

        const tasks: SprintEstimatedTask[] = rows.map((r) => ({
          estimate: Number(r.estimate),
          done: r.done,
          completedAt: fmtDate(r.completed_at),
        }));
        // Dominant unit: the most common estimate_unit among the estimated tasks.
        const unit = dominantUnit(rows.map((r) => r.estimate_unit));
        return {
          sprint,
          tasks,
          unit,
          unestimatedCount: Number(unest[0]?.n ?? 0),
        };
      } catch (err) {
        if (isSchemaLagError(err)) return null;
        return mockRepositories.crm.getSprintBurndownData(sprintId);
      }
    },

    async listSprintVelocity(): Promise<SprintVelocityRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listSprintVelocity();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          ends_at: Date | null;
          status: string;
          committed: string;
          completed: string;
          unit: string | null;
        }>(
          // Per sprint: Σ estimate of estimated committed tasks (committed) and Σ
          // estimate of done ones (completed), plus the modal estimate_unit. Done
          // keys off status_def category (legacy status fallback). completed-first,
          // then most-recently-ended, so the velocity chart reads left→right in time.
          `SELECT s.id, s.name, s.ends_at, s.status,
                  COALESCE(SUM(t.estimate), 0)                                   AS committed,
                  COALESCE(SUM(t.estimate) FILTER (
                    WHERE COALESCE(sd.category, t.status) = 'done'), 0)          AS completed,
                  MODE() WITHIN GROUP (ORDER BY t.estimate_unit)                 AS unit
             FROM sprint s
             LEFT JOIN task t
                    ON t.sprint_id = s.id AND t.estimate IS NOT NULL
             LEFT JOIN status_def sd ON sd.id = t.status_def_id
            GROUP BY s.id, s.name, s.ends_at, s.status
            ORDER BY (s.status = 'completed') DESC, s.ends_at DESC NULLS LAST, s.name`,
        );
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          endsAt: fmtDate(r.ends_at),
          status: r.status,
          committedEffort: Number(r.committed),
          completedEffort: Number(r.completed),
          unit: r.unit,
        }));
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.crm.listSprintVelocity();
      }
    },

    // ── Baselines / planned-vs-actual (ADR-0069 D6, #351) ──────────────────────
    async listProjectBaselines(projectId: string): Promise<ProjectBaselineRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listProjectBaselines(projectId);
      try {
        const { rows } = await pool.query<{
          id: string;
          captured_at: Date;
          planned_dates: PlannedDatesSnapshot;
        }>(
          `SELECT id, captured_at, planned_dates
           FROM project_baseline WHERE project_id = $1
           ORDER BY captured_at DESC`,
          [projectId],
        );
        return rows.map((r) => ({
          id: r.id,
          capturedAt: fmtDateTime(r.captured_at) ?? "",
          plannedTargetLive: r.planned_dates?.targetLiveDate ?? null,
          taskCount: Array.isArray(r.planned_dates?.tasks) ? r.planned_dates.tasks.length : 0,
        }));
      } catch {
        return [];
      }
    },

    async captureProjectBaseline(projectId: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.captureProjectBaseline(projectId);
      // Freeze the project's current target go-live + every task's due date into
      // an immutable planned_dates snapshot, in one statement (no read-then-write
      // race). to_char(null) → SQL null, mapped to JS null.
      await pool.query(
        `INSERT INTO project_baseline (project_id, planned_dates)
         SELECT p.id,
                jsonb_build_object(
                  'targetLiveDate', to_char(p.target_live_date, 'YYYY-MM-DD'),
                  'status', p.status::text,
                  'tasks', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                             'id', t.id,
                             'title', t.title,
                             'dueAt', to_char(t.due_at, 'YYYY-MM-DD'))
                           ORDER BY t.due_at NULLS LAST, t.title)
                    FROM task t WHERE t.project_id = p.id
                  ), '[]'::jsonb)
                )
         FROM project p WHERE p.id = $1`,
        [projectId],
      );
    },

    async getProjectSlippage(projectId: string): Promise<ProjectSlippage | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getProjectSlippage(projectId);
      try {
        // Latest baseline + the project's live completion state.
        const { rows } = await pool.query<{
          id: string;
          captured_at: Date;
          planned_dates: PlannedDatesSnapshot;
          status: string;
          completed_at: Date | null;
        }>(
          `SELECT b.id, b.captured_at, b.planned_dates, p.status, p.completed_at
           FROM project_baseline b
           JOIN project p ON p.id = b.project_id
           WHERE b.project_id = $1
           ORDER BY b.captured_at DESC
           LIMIT 1`,
          [projectId],
        );
        const r = rows[0];
        if (!r) return null;

        const plannedTasks = Array.isArray(r.planned_dates?.tasks) ? r.planned_dates.tasks : [];
        const plannedTargetLive = r.planned_dates?.targetLiveDate ?? null;
        const isComplete = r.status === "complete";
        const actual = isComplete ? fmtDate(r.completed_at) : null;
        // The #351 acceptance: a completed project shows actual − planned in days.
        const slippageDays = isComplete ? daysBetween(plannedTargetLive, actual) : null;

        // Per-task: join the frozen plan to the tasks' current due dates.
        const ids = plannedTasks.map((t) => t.id);
        const curMap = new Map<string, string | null>();
        if (ids.length > 0) {
          const cur = await pool.query<{ id: string; due_at: Date | null }>(
            `SELECT id, due_at FROM task WHERE id = ANY($1::uuid[])`,
            [ids],
          );
          for (const c of cur.rows) curMap.set(c.id, fmtDate(c.due_at));
        }
        const tasks = plannedTasks.map((t) => {
          const exists = curMap.has(t.id);
          const currentDue = exists ? (curMap.get(t.id) ?? null) : null;
          const plannedDue = t.dueAt ?? null;
          return {
            id: t.id,
            title: t.title,
            plannedDue,
            currentDue,
            slippageDays: exists ? daysBetween(plannedDue, currentDue) : null,
            exists,
          };
        });

        return {
          baselineId: r.id,
          capturedAt: fmtDateTime(r.captured_at) ?? "",
          plannedTargetLive,
          actual,
          isComplete,
          slippageDays,
          tasks,
        };
      } catch {
        return null;
      }
    },

    // ── Recurring tasks (ADR-0070 E2, #353) ────────────────────────────────────
    async getTaskRecurrence(taskId: string): Promise<TaskRecurrenceRow | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getTaskRecurrence(taskId);
      try {
        const { rows } = await pool.query<{
          id: string;
          task_id: string;
          rule: string;
          next_run_at: Date;
          ends_at: Date | null;
          count_remaining: number | null;
        }>(
          `SELECT id, task_id, rule, next_run_at, ends_at, count_remaining
             FROM task_recurrence WHERE task_id = $1`,
          [taskId],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          taskId: r.task_id,
          rule: r.rule,
          nextRunAt: fmtDate(r.next_run_at) ?? "",
          endsAt: fmtDate(r.ends_at),
          countRemaining: r.count_remaining,
        };
      } catch (err) {
        // task_recurrence (0110) may not be prod-applied yet → no series, not a 500.
        if (isSchemaLagError(err)) return null;
        return mockRepositories.crm.getTaskRecurrence(taskId);
      }
    },

    async upsertTaskRecurrence(input: TaskRecurrenceInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.upsertTaskRecurrence(input);
      // task_id is UNIQUE → re-saving the recurrence edits the series in place.
      await pool.query(
        `INSERT INTO task_recurrence (task_id, rule, next_run_at, ends_at, count_remaining)
         VALUES ($1, $2, $3::date, $4::date, $5)
         ON CONFLICT (task_id) DO UPDATE
            SET rule = EXCLUDED.rule,
                next_run_at = EXCLUDED.next_run_at,
                ends_at = EXCLUDED.ends_at,
                count_remaining = EXCLUDED.count_remaining,
                updated_at = now()`,
        [input.taskId, input.rule, input.nextRunAt, input.endsAt, input.countRemaining],
      );
    },

    async clearTaskRecurrence(taskId: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.clearTaskRecurrence(taskId);
      await pool.query(`DELETE FROM task_recurrence WHERE task_id = $1`, [taskId]);
    },

    async advanceTaskRecurrence(taskId: string): Promise<string | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.advanceTaskRecurrence(taskId);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Lock the series owned by the completed task. Absent → this task does not
        // own a (live) series, so completing it spawns nothing (idempotent: the row
        // moved to the previously-spawned task).
        const { rows } = await client.query<{
          id: string;
          rule: string;
          next_run_at: Date;
          ends_at: Date | null;
          count_remaining: number | null;
        }>(
          `SELECT id, rule, next_run_at, ends_at, count_remaining
             FROM task_recurrence WHERE task_id = $1 FOR UPDATE`,
          [taskId],
        );
        const r = rows[0];
        if (!r) {
          await client.query("COMMIT");
          return null;
        }

        const rule = parseRRule(r.rule);
        const nextRunAt = fmtDate(r.next_run_at) ?? "";
        const endsAt = fmtDate(r.ends_at);
        // Exhausted? (cap hit, end date passed, or an unparseable rule) → stop the
        // series; the already-spawned task is the final occurrence.
        const exhausted =
          !rule ||
          (r.count_remaining != null && r.count_remaining <= 0) ||
          (endsAt != null && nextRunAt > endsAt);
        if (exhausted) {
          await client.query(`DELETE FROM task_recurrence WHERE id = $1`, [r.id]);
          await client.query("COMMIT");
          return null;
        }

        // Clone the source task into the next occurrence: due = next_run_at,
        // preserving any start→due span (newStart = next_run_at − span). status
        // resets to 'open'; ordinal mirrors createTask. RETURNING the new id.
        const ins = await client.query<{ id: string }>(
          `INSERT INTO task (account_id, title, detail, status, category, due_at, start_at,
                             estimate, estimate_unit, project_id, parent_task_id, ordinal)
           SELECT account_id, title, detail, 'open', category,
                  $2::date,
                  CASE WHEN start_at IS NOT NULL AND due_at IS NOT NULL
                       THEN $2::date - (due_at::date - start_at) END,
                  estimate, estimate_unit, project_id, parent_task_id,
                  CASE WHEN parent_task_id IS NULL THEN 0
                       ELSE COALESCE((SELECT max(ordinal) + 1 FROM task c
                                       WHERE c.parent_task_id = task.parent_task_id), 0)
                  END
             FROM task WHERE id = $1
           RETURNING id`,
          [taskId, nextRunAt],
        );
        const newId = ins.rows[0]?.id ?? null;
        if (!newId) {
          // Source task vanished mid-transaction → nothing to recur.
          await client.query("ROLLBACK");
          return null;
        }

        const newNext = nextOccurrence(rule, nextRunAt);
        const newCount = r.count_remaining != null ? r.count_remaining - 1 : null;
        // Will the series outlive this spawn? Stop if the cap is now spent or the
        // following occurrence would pass the end date.
        const continues =
          (newCount == null || newCount > 0) && (endsAt == null || newNext <= endsAt);
        if (continues) {
          // Re-point the series at the freshly-spawned (now-live) task.
          await client.query(
            `UPDATE task_recurrence
                SET task_id = $2, next_run_at = $3::date, count_remaining = $4, updated_at = now()
              WHERE id = $1`,
            [r.id, newId, newNext, newCount],
          );
        } else {
          await client.query(`DELETE FROM task_recurrence WHERE id = $1`, [r.id]);
        }
        await client.query("COMMIT");
        return newId;
      } catch (err) {
        await client.query("ROLLBACK");
        // Schema not applied yet → silently no-op (completion still succeeds).
        if (isSchemaLagError(err)) return null;
        throw err;
      } finally {
        client.release();
      }
    },

    // ── Conversational intelligence (ADR-0068, #375) — read-only ─────────────────
    async listConversationsForAccount(accountId: string): Promise<ConversationRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listConversationsForAccount(accountId);
      try {
        const { rows } = await pool.query<{
          id: string;
          source: ConversationRow["source"];
          status: ConversationRow["status"];
          started_at: Date | null;
          duration_seconds: number | null;
          contact_id: string | null;
          opportunity_id: string | null;
          transcript_artifact_uri: string | null;
        }>(
          `SELECT id, source, status, started_at, duration_seconds,
                  contact_id, opportunity_id, transcript_artifact_uri
             FROM conversation WHERE account_id = $1
            ORDER BY started_at DESC NULLS LAST, created_at DESC`,
          [accountId],
        );
        return rows.map((r) => ({
          id: r.id,
          source: r.source,
          status: r.status,
          startedAt: fmtDateTime(r.started_at),
          durationSeconds: r.duration_seconds,
          contactId: r.contact_id,
          opportunityId: r.opportunity_id,
          hasTranscript: r.transcript_artifact_uri != null,
        }));
      } catch (err) {
        // conversation (0112) may not be prod-applied yet → empty list, not a 500.
        if (isSchemaLagError(err)) return [];
        return mockRepositories.crm.listConversationsForAccount(accountId);
      }
    },

    async getConversation(id: string): Promise<ConversationDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getConversation(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          account_id: string | null;
          contact_id: string | null;
          opportunity_id: string | null;
          source: ConversationRow["source"];
          status: ConversationRow["status"];
          external_ref: string | null;
          audio_artifact_uri: string | null;
          transcript_artifact_uri: string | null;
          started_at: Date | null;
          ended_at: Date | null;
          duration_seconds: number | null;
          consent_basis_id: string | null;
          retention_expires_at: Date | null;
        }>(
          `SELECT id, account_id, contact_id, opportunity_id, source, status,
                  external_ref, audio_artifact_uri, transcript_artifact_uri,
                  started_at, ended_at, duration_seconds, consent_basis_id,
                  retention_expires_at
             FROM conversation WHERE id = $1`,
          [id],
        );
        const c = rows[0];
        if (!c) return null;

        const seg = await pool.query<{
          id: string;
          speaker: string | null;
          start_ms: number | null;
          end_ms: number | null;
          text: string;
        }>(
          `SELECT id, speaker, start_ms, end_ms, text
             FROM conversation_segment WHERE conversation_id = $1
            ORDER BY start_ms NULLS LAST, created_at`,
          [id],
        );
        const ins = await pool.query<{
          id: string;
          kind: ConversationInsightRow["kind"];
          payload: Record<string, unknown> | null;
          model: string | null;
          created_at: Date;
        }>(
          `SELECT id, kind, payload, model, created_at
             FROM conversation_insight WHERE conversation_id = $1
            ORDER BY kind, created_at`,
          [id],
        );

        const segments: ConversationSegmentRow[] = seg.rows.map((s) => ({
          id: s.id,
          speaker: s.speaker,
          startMs: s.start_ms,
          endMs: s.end_ms,
          text: s.text,
        }));
        const insights: ConversationInsightRow[] = ins.rows.map((i) => ({
          id: i.id,
          kind: i.kind,
          payload: i.payload ?? {},
          model: i.model,
          createdAt: fmtDateTime(i.created_at) ?? "",
        }));

        return {
          id: c.id,
          accountId: c.account_id,
          contactId: c.contact_id,
          opportunityId: c.opportunity_id,
          source: c.source,
          status: c.status,
          externalRef: c.external_ref,
          audioArtifactUri: c.audio_artifact_uri,
          transcriptArtifactUri: c.transcript_artifact_uri,
          startedAt: fmtDateTime(c.started_at),
          endedAt: fmtDateTime(c.ended_at),
          durationSeconds: c.duration_seconds,
          consentBasisId: c.consent_basis_id,
          retentionExpiresAt: fmtDateTime(c.retention_expires_at),
          hasTranscript: c.transcript_artifact_uri != null,
          segments,
          insights,
        };
      } catch (err) {
        if (isSchemaLagError(err)) return null;
        return mockRepositories.crm.getConversation(id);
      }
    },

    async listEsignEnvelopesForProposal(proposalId: string): Promise<EsignEnvelopeRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listEsignEnvelopesForProposal(proposalId);
      try {
        const { rows } = await pool.query<{
          id: string;
          proposal_id: string;
          contract_id: string | null;
          provider: string;
          external_ref: string | null;
          status: EsignEnvelopeRow["status"];
          recipients: Array<Record<string, unknown>> | null;
          signed_pdf_uri: string | null;
          sent_at: Date | null;
          completed_at: Date | null;
          created_at: Date;
        }>(
          `SELECT id, proposal_id, contract_id, provider, external_ref, status,
                  recipients, signed_pdf_uri, sent_at, completed_at, created_at
             FROM esign_envelope WHERE proposal_id = $1
            ORDER BY created_at DESC`,
          [proposalId],
        );
        return rows.map((r) => ({
          id: r.id,
          proposalId: r.proposal_id,
          contractId: r.contract_id,
          provider: r.provider,
          externalRef: r.external_ref,
          status: r.status,
          recipients: Array.isArray(r.recipients) ? r.recipients : [],
          hasSignedPdf: r.signed_pdf_uri != null,
          sentAt: fmtDateTime(r.sent_at),
          completedAt: fmtDateTime(r.completed_at),
          createdAt: fmtDateTime(r.created_at) ?? "",
        }));
      } catch (err) {
        // esign_envelope (0113) may not be prod-applied yet → empty list, not a 500.
        if (isSchemaLagError(err)) return [];
        return mockRepositories.crm.listEsignEnvelopesForProposal(proposalId);
      }
    },

    async getTask(id: string): Promise<TaskEditable | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          account_id: string | null;
          title: string;
          detail: string | null;
          status: string;
          category: string;
          due_at: Date | null;
          start_at: Date | null;
          estimate: string | null;
          estimate_unit: string | null;
          project_id: string | null;
          parent_task_id: string | null;
          autotask_ticket_ref: string | null;
        }>(
          `SELECT id, account_id, title, detail, status, category, due_at, start_at,
                  estimate, estimate_unit, project_id, parent_task_id, autotask_ticket_ref
           FROM task WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          accountId: r.account_id,
          title: r.title,
          detail: r.detail,
          status: r.status,
          category: r.category,
          dueAt: fmtDate(r.due_at),
          startAt: fmtDate(r.start_at),
          estimate: r.estimate,
          estimateUnit: r.estimate_unit,
          projectId: r.project_id,
          parentTaskId: r.parent_task_id,
          autotaskTicketRef: r.autotask_ticket_ref,
        };
      } catch {
        return null;
      }
    },

    async createTask(input: TaskInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createTask(input);
      await pool.query(
        // A subtask inherits its order at the end of its parent's children
        // (COALESCE(max+1,0)); top-level creates default to ordinal 0 (ADR-0065 B1).
        `INSERT INTO task (account_id, title, detail, status, category, due_at, start_at,
                           estimate, estimate_unit, project_id, parent_task_id, ordinal)
         VALUES ($1, $2, $3, $4, $5::task_category, $6::timestamptz, $7::date,
                 $8::numeric, $9, $10, $11,
                 CASE WHEN $11::uuid IS NULL THEN 0
                      ELSE COALESCE((SELECT max(ordinal) + 1 FROM task WHERE parent_task_id = $11::uuid), 0)
                 END)`,
        [
          nullIfEmpty(input.accountId),
          input.title,
          nullIfEmpty(input.detail),
          input.status,
          input.category,
          nullIfEmpty(input.dueAt),
          nullIfEmpty(input.startAt ?? null),
          nullIfEmpty(input.estimate ?? null),
          nullIfEmpty(input.estimateUnit ?? null),
          nullIfEmpty(input.projectId),
          nullIfEmpty(input.parentTaskId ?? null),
        ],
      );
    },

    async updateTask(id: string, input: TaskInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateTask(id, input);
      // parent_task_id is intentionally NOT updated here — re-parenting goes
      // through reparentTask (which enforces the cycle guard, ADR-0065 B1).
      await pool.query(
        `UPDATE task
         SET account_id = $1, title = $2, detail = $3, status = $4,
             category = $5::task_category, due_at = $6::timestamptz, start_at = $7::date,
             estimate = $8::numeric, estimate_unit = $9, project_id = $10
         WHERE id = $11`,
        [
          nullIfEmpty(input.accountId),
          input.title,
          nullIfEmpty(input.detail),
          input.status,
          input.category,
          nullIfEmpty(input.dueAt),
          nullIfEmpty(input.startAt ?? null),
          nullIfEmpty(input.estimate ?? null),
          nullIfEmpty(input.estimateUnit ?? null),
          nullIfEmpty(input.projectId),
          id,
        ],
      );
    },

    async deleteTask(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteTask(id);
      // ON DELETE CASCADE on parent_task_id removes the subtree with the parent.
      await pool.query(`DELETE FROM task WHERE id = $1`, [id]);
    },

    // ── Time tracking (ADR-0069 D1, #346) ────────────────────────────────────
    async listTaskTimeEntries(taskId: string): Promise<TaskTimeEntryRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listTaskTimeEntries(taskId);
      try {
        const { rows } = await pool.query<{
          id: string;
          task_id: string;
          user_id: string;
          user_name: string | null;
          minutes: number;
          started_at: Date | null;
          note: string | null;
          billable: boolean;
          created_at: Date | null;
        }>(
          // Newest-first; the logger's display name (email local-part fallback).
          `SELECT te.id, te.task_id, te.user_id,
                  COALESCE(u.display_name, split_part(u.email, '@', 1)) AS user_name,
                  te.minutes, te.started_at, te.note, te.billable, te.created_at
           FROM time_entry te
           LEFT JOIN app_user u ON u.id = te.user_id
           WHERE te.task_id = $1
           ORDER BY te.created_at DESC`,
          [taskId],
        );
        return rows.map((r) => ({
          id: r.id,
          taskId: r.task_id,
          userId: r.user_id,
          user: r.user_name,
          minutes: Number(r.minutes),
          startedAt: fmtDate(r.started_at),
          note: r.note,
          billable: r.billable,
          createdAt: fmtDateTime(r.created_at),
        }));
      } catch {
        return mockRepositories.crm.listTaskTimeEntries(taskId);
      }
    },

    async logTime(input: TaskTimeLogInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.logTime(input);
      // user_id NOT NULL in the schema — a null resolved user (e.g. session not
      // mirrored) is a no-op rather than a constraint error (degrade gracefully).
      if (!input.userId) return;
      await pool.query(
        `INSERT INTO time_entry (task_id, user_id, minutes, started_at, note, billable)
         VALUES ($1, $2, $3, $4::timestamptz, $5, $6)`,
        [
          input.taskId,
          input.userId,
          input.minutes,
          nullIfEmpty(input.startedAt),
          nullIfEmpty(input.note),
          input.billable,
        ],
      );
    },

    async getProjectTimeRollup(projectId: string): Promise<ProjectTimeRollup> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getProjectTimeRollup(projectId);
      try {
        const { rows } = await pool.query<{
          logged_minutes: string;
          estimate_minutes: string | null;
        }>(
          // Logged minutes summed across the project's tasks (the acceptance
          // rollup). Estimate-as-minutes only sums tasks whose unit is 'hours'
          // (×60); points-based estimates don't convert to time, so they're left
          // out of the time remaining.
          `SELECT COALESCE(sum(te.logged_minutes), 0) AS logged_minutes,
                  sum(CASE WHEN lower(t.estimate_unit) = 'hours' AND t.estimate IS NOT NULL
                           THEN t.estimate * 60 END) AS estimate_minutes
           FROM task t
           LEFT JOIN LATERAL (
             SELECT sum(minutes) AS logged_minutes
             FROM time_entry WHERE task_id = t.id
           ) te ON true
           WHERE t.project_id = $1`,
          [projectId],
        );
        const r = rows[0];
        return {
          loggedMinutes: Number(r?.logged_minutes ?? 0),
          estimateMinutes: r?.estimate_minutes != null ? Number(r.estimate_minutes) : null,
        };
      } catch {
        return mockRepositories.crm.getProjectTimeRollup(projectId);
      }
    },

    async getTaskChildren(parentId: string): Promise<TaskHierarchy> {
      const empty: TaskHierarchy = { parentId, children: [], total: 0, done: 0 };
      const pool = getPool();
      if (!pool) return empty;
      try {
        const { rows } = await pool.query<{
          id: string;
          title: string;
          status: string;
          due_at: Date | null;
          ordinal: number;
          child_count: string;
          child_done_count: string;
        }>(
          `SELECT t.id, t.title, t.status, t.due_at, t.ordinal,
                  c.child_count, c.child_done_count
           FROM task t
           LEFT JOIN LATERAL (
             SELECT count(*) AS child_count,
                    count(*) FILTER (WHERE ch.status = 'done') AS child_done_count
             FROM task ch WHERE ch.parent_task_id = t.id
           ) c ON true
           WHERE t.parent_task_id = $1
           ORDER BY t.ordinal, t.title`,
          [parentId],
        );
        const children = rows.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          due: fmtDate(row.due_at),
          ordinal: row.ordinal,
          childCount: Number(row.child_count),
          childDoneCount: Number(row.child_done_count),
        }));
        return {
          parentId,
          children,
          total: children.length,
          done: children.filter((c) => c.status === "done").length,
        };
      } catch {
        return empty;
      }
    },

    async reparentTask(id: string, newParentId: string | null): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.reparentTask(id, newParentId);
      // A task can never be its own ancestor (would orphan the subtree behind a
      // cycle). Promote to top-level (null) is always safe; otherwise walk the
      // ancestor chain of the prospective parent and reject if `id` appears.
      if (newParentId) {
        if (newParentId === id) return false;
        const { rows } = await pool.query<{ cycles: boolean }>(
          `WITH RECURSIVE ancestors AS (
             SELECT id, parent_task_id FROM task WHERE id = $2
             UNION ALL
             SELECT t.id, t.parent_task_id FROM task t
             JOIN ancestors a ON t.id = a.parent_task_id
           )
           SELECT bool_or(id = $1) AS cycles FROM ancestors`,
          [id, newParentId],
        );
        if (rows[0]?.cycles) return false;
      }
      // New parent → append at the end of its children; promote to top-level → 0.
      await pool.query(
        `UPDATE task
         SET parent_task_id = $2,
             ordinal = CASE WHEN $2::uuid IS NULL THEN 0
                            ELSE COALESCE((SELECT max(ordinal) + 1 FROM task WHERE parent_task_id = $2::uuid AND id <> $1), 0)
                       END
         WHERE id = $1`,
        [id, newParentId],
      );
      return true;
    },

    async setTaskOrdinal(id: string, ordinal: number): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setTaskOrdinal(id, ordinal);
      await pool.query(`UPDATE task SET ordinal = $2 WHERE id = $1`, [id, ordinal]);
    },

    async getTaskDependencies(taskId: string): Promise<TaskDependencies> {
      const empty: TaskDependencies = { taskId, blockedBy: [], blocks: [], blocked: false };
      const pool = getPool();
      if (!pool) return empty;
      try {
        // Predecessors (what blocks this task): edges where this is the successor.
        // Successors (what this task blocks): edges where this is the predecessor.
        // One query each, joining task for the title/status the unmet-blocker flag
        // and the warning copy need.
        const [pre, suc] = await Promise.all([
          pool.query<{ task_id: string; title: string; status: string; type: string }>(
            `SELECT t.id AS task_id, t.title, t.status, d.type
               FROM task_dependency d
               JOIN task t ON t.id = d.predecessor_id
              WHERE d.successor_id = $1
              ORDER BY t.title`,
            [taskId],
          ),
          pool.query<{ task_id: string; title: string; status: string; type: string }>(
            `SELECT t.id AS task_id, t.title, t.status, d.type
               FROM task_dependency d
               JOIN task t ON t.id = d.successor_id
              WHERE d.predecessor_id = $1
              ORDER BY t.title`,
            [taskId],
          ),
        ]);
        const toRow = (r: { task_id: string; title: string; status: string; type: string }): TaskDependencyRow => ({
          taskId: r.task_id,
          title: r.title,
          status: r.status,
          type: "blocks",
        });
        const blockedBy = pre.rows.map(toRow);
        return {
          taskId,
          blockedBy,
          blocks: suc.rows.map(toRow),
          // Soft v1 flag: any predecessor not yet done is an unmet blocker.
          blocked: blockedBy.some((b) => b.status !== "done"),
        };
      } catch {
        return empty;
      }
    },

    async addTaskDependency(predecessorId: string, successorId: string): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.addTaskDependency(predecessorId, successorId);
      // A task can never block itself, and a link must not close a cycle (ADR-0065
      // B2: circular-dependency detection required). Adding "predecessor BLOCKS
      // successor" closes a loop iff `successor` already reaches `predecessor` by
      // following the existing blocks-edges forward. So walk the successor chain
      // DOWN from the prospective successor (predecessor_id = node → its successors)
      // and refuse if `predecessor` is reachable — mirrors the subtask ancestor
      // walk in reparentTask, in the forward direction.
      if (predecessorId === successorId) return false;
      const { rows } = await pool.query<{ cycles: boolean }>(
        `WITH RECURSIVE reachable AS (
           SELECT successor_id FROM task_dependency WHERE predecessor_id = $2
           UNION ALL
           SELECT d.successor_id
             FROM task_dependency d
             JOIN reachable r ON d.predecessor_id = r.successor_id
         )
         SELECT bool_or(successor_id = $1) AS cycles FROM reachable`,
        [predecessorId, successorId],
      );
      if (rows[0]?.cycles) return false;
      // Idempotent: re-linking the same directed pair is a no-op (PK collision).
      await pool.query(
        `INSERT INTO task_dependency (predecessor_id, successor_id, type)
         VALUES ($1, $2, 'blocks')
         ON CONFLICT (predecessor_id, successor_id, type) DO NOTHING`,
        [predecessorId, successorId],
      );
      return true;
    },

    async removeTaskDependency(predecessorId: string, successorId: string): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.removeTaskDependency(predecessorId, successorId);
      const { rowCount } = await pool.query(
        `DELETE FROM task_dependency
          WHERE predecessor_id = $1 AND successor_id = $2 AND type = 'blocks'`,
        [predecessorId, successorId],
      );
      return (rowCount ?? 0) > 0;
    },

    async listBlockedProjectTasks(projectId: string): Promise<Option[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listBlockedProjectTasks(projectId);
      try {
        // Open project tasks (the successor) that have a predecessor still not done.
        // EXISTS over task_dependency joined to the predecessor task; the soft v1
        // unmet-blocker signal for the close-project warning (ADR-0065 B2).
        const { rows } = await pool.query<{ id: string; name: string }>(
          `SELECT s.id, s.title AS name
             FROM task s
            WHERE s.project_id = $1
              AND s.status <> 'done'
              AND EXISTS (
                SELECT 1 FROM task_dependency d
                  JOIN task p ON p.id = d.predecessor_id
                 WHERE d.successor_id = s.id
                   AND p.status <> 'done'
              )
            ORDER BY s.title`,
          [projectId],
        );
        return rows.map((r) => ({ id: r.id, name: r.name }));
      } catch {
        return mockRepositories.crm.listBlockedProjectTasks(projectId);
      }
    },

    // ── Assignees & watchers (ADR-0065 B3, #337) ──────────────────────────────
    async getWorkAssignments(
      parentType: string,
      parentId: string,
      viewerEmail: string | null,
    ): Promise<WorkAssignments> {
      const empty: WorkAssignments = {
        parentType,
        parentId,
        primary: null,
        assignees: [],
        watchers: [],
        viewerWatching: false,
      };
      const pool = getPool();
      if (!pool) return empty;
      try {
        const { rows } = await pool.query<{
          user_id: string;
          name: string;
          role: WorkRole;
          email: string | null;
        }>(
          `SELECT wa.user_id, coalesce(u.display_name, u.email) AS name,
                  wa.role, u.email
             FROM work_assignment wa
             JOIN app_user u ON u.id = wa.user_id
            WHERE wa.parent_type = $1 AND wa.parent_id = $2
            ORDER BY (wa.role = 'primary') DESC, name`,
          [parentType, parentId],
        );
        const lcViewer = viewerEmail?.toLowerCase() ?? null;
        let primary: WorkAssignmentRow | null = null;
        const assignees: WorkAssignmentRow[] = [];
        const watchers: WorkAssignmentRow[] = [];
        let viewerWatching = false;
        for (const r of rows) {
          const row: WorkAssignmentRow = { userId: r.user_id, name: r.name, role: r.role };
          if (r.role === "primary") primary = row;
          else if (r.role === "assignee") assignees.push(row);
          else watchers.push(row);
          if (lcViewer && r.email && r.email.toLowerCase() === lcViewer) viewerWatching = true;
        }
        return { parentType, parentId, primary, assignees, watchers, viewerWatching };
      } catch {
        return empty;
      }
    },

    async listAssigneesForMany(
      parentType: WorkParentType,
      parentIds: string[],
    ): Promise<Record<string, WorkAssignmentRow[]>> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listAssigneesForMany(parentType, parentIds);
      if (parentIds.length === 0) return {};
      try {
        // One read over work_assignment for every visible card (#608, ADR-0066
        // C1-F4) — the bulk form of getWorkAssignments. Primary first, then by
        // name, mirroring the per-object read's ORDER BY so the avatar cap shows
        // the owner first.
        const { rows } = await pool.query<{
          parent_id: string;
          user_id: string;
          name: string;
          role: WorkRole;
        }>(
          `SELECT wa.parent_id::text AS parent_id, wa.user_id::text AS user_id,
                  coalesce(u.display_name, u.email) AS name, wa.role
             FROM work_assignment wa
             JOIN app_user u ON u.id = wa.user_id
            WHERE wa.parent_type = $1 AND wa.parent_id = ANY($2::uuid[])
            ORDER BY (wa.role = 'primary') DESC, name`,
          [parentType, parentIds],
        );
        const out: Record<string, WorkAssignmentRow[]> = {};
        for (const r of rows) {
          (out[r.parent_id] ??= []).push({ userId: r.user_id, name: r.name, role: r.role });
        }
        return out;
      } catch (err) {
        if (isSchemaLagError(err)) return {};
        return mockRepositories.crm.listAssigneesForMany(parentType, parentIds);
      }
    },

    async listEngagementCountsForMany(
      parentType: WorkParentType,
      parentIds: string[],
    ): Promise<Record<string, EngagementCounts>> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listEngagementCountsForMany(parentType, parentIds);
      if (parentIds.length === 0) return {};
      try {
        // Live (non-deleted) comment + attachment counts per object in one read
        // (#608, ADR-0064 A1/A4): a FULL OUTER JOIN of the two per-parent grouped
        // counts so an object with only comments OR only attachments still
        // appears, the other leg defaulting to 0.
        const { rows } = await pool.query<{
          parent_id: string;
          comments: string;
          attachments: string;
        }>(
          `SELECT coalesce(c.parent_id, a.parent_id)::text AS parent_id,
                  coalesce(c.n, 0) AS comments,
                  coalesce(a.n, 0) AS attachments
             FROM (
               SELECT parent_id, count(*) AS n
                 FROM work_comment
                WHERE parent_type = $1 AND parent_id = ANY($2::uuid[])
                  AND deleted_at IS NULL
                GROUP BY parent_id
             ) c
             FULL OUTER JOIN (
               SELECT parent_id, count(*) AS n
                 FROM work_attachment
                WHERE parent_type = $1 AND parent_id = ANY($2::uuid[])
                  AND deleted_at IS NULL
                GROUP BY parent_id
             ) a ON a.parent_id = c.parent_id`,
          [parentType, parentIds],
        );
        const out: Record<string, EngagementCounts> = {};
        for (const r of rows) {
          out[r.parent_id] = {
            comments: Number(r.comments),
            attachments: Number(r.attachments),
          };
        }
        return out;
      } catch (err) {
        if (isSchemaLagError(err)) return {};
        return mockRepositories.crm.listEngagementCountsForMany(parentType, parentIds);
      }
    },

    async setTaskAssignees(
      taskId: string,
      userIds: string[],
      actingUserId: string | null = null,
    ): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setTaskAssignees(taskId, userIds, actingUserId);
      // De-dup the requested set; the primary is excluded (they're already on the
      // object as owner) and never demoted by an assignee save.
      const wanted = Array.from(new Set(userIds.filter(Boolean)));
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Who is ALREADY attached (any role) — so we only notify NEWLY-added people.
        const { rows: before } = await client.query<{ user_id: string }>(
          `SELECT user_id::text AS user_id FROM work_assignment
            WHERE parent_type = 'task' AND parent_id = $1`,
          [taskId],
        );
        const alreadyOn = new Set(before.map((r) => r.user_id));
        // Drop every assignee row that is no longer wanted (leaves primary/watcher
        // rows untouched).
        await client.query(
          `DELETE FROM work_assignment
            WHERE parent_type = 'task' AND parent_id = $1 AND role = 'assignee'
              AND ($2::uuid[] = '{}' OR user_id <> ALL($2::uuid[]))`,
          [taskId, wanted],
        );
        // Upsert each wanted user as an assignee — unless they are the primary
        // (skip; a primary already owns the object). A user currently a watcher is
        // promoted to assignee via the role update on conflict.
        for (const uid of wanted) {
          await client.query(
            `INSERT INTO work_assignment (parent_type, parent_id, user_id, role)
             SELECT 'task', $1, $2, 'assignee'
              WHERE NOT EXISTS (
                SELECT 1 FROM work_assignment
                 WHERE parent_type = 'task' AND parent_id = $1
                   AND user_id = $2 AND role = 'primary'
              )
             ON CONFLICT (parent_type, parent_id, user_id)
               DO UPDATE SET role = 'assignee'
               WHERE work_assignment.role <> 'primary'`,
            [taskId, uid],
          );
          // A3 (#332): notify someone added to the task for the first time
          // (acceptance: "assigning notifies assignee in-app within one refresh").
          // The acting employee (#601) is stamped as the actor so the bell reads as
          // actor-attributed instead of a system event; null = no resolved actor.
          // insertNotification skips a self-assign (recipient === actor).
          if (!alreadyOn.has(uid)) {
            await insertNotification(client, uid, "assigned", "task", taskId, actingUserId, {
              title: "You were assigned to a task",
            });
          }
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async setTaskWatch(taskId: string, userId: string, watch: boolean): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setTaskWatch(taskId, userId, watch);
      if (watch) {
        // Add a watcher row only if the user holds no row yet — a primary/assignee
        // already sees the item, so watching is a no-op for them (DO NOTHING).
        await pool.query(
          `INSERT INTO work_assignment (parent_type, parent_id, user_id, role)
           VALUES ('task', $1, $2, 'watcher')
           ON CONFLICT (parent_type, parent_id, user_id) DO NOTHING`,
          [taskId, userId],
        );
      } else {
        // Unwatch removes ONLY a watcher row — never the primary owner or an
        // assignee (those are unfollowed by reassignment, not by the toggle).
        await pool.query(
          `DELETE FROM work_assignment
            WHERE parent_type = 'task' AND parent_id = $1
              AND user_id = $2 AND role = 'watcher'`,
          [taskId, userId],
        );
      }
    },

    async setTaskPrimary(
      taskId: string,
      userId: string,
      _role: Extract<WorkRole, "primary">,
    ): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setTaskPrimary(taskId, userId, _role);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Demote any current primary (other than the new one) to assignee — they
        // stay on the object, just not the owner. The partial unique index allows
        // only one primary, so this must happen before promoting the new one.
        await client.query(
          `UPDATE work_assignment SET role = 'assignee'
            WHERE parent_type = 'task' AND parent_id = $1
              AND role = 'primary' AND user_id <> $2`,
          [taskId, userId],
        );
        // Upsert the new primary (promotes an existing assignee/watcher row).
        await client.query(
          `INSERT INTO work_assignment (parent_type, parent_id, user_id, role)
           VALUES ('task', $1, $2, 'primary')
           ON CONFLICT (parent_type, parent_id, user_id)
             DO UPDATE SET role = 'primary'`,
          [taskId, userId],
        );
        // Keep the legacy owner FK in lockstep — the Sales Queue, rollups and RBAC
        // still read task.owner_user_id (acceptance: "primary still drives reporting").
        await client.query(`UPDATE task SET owner_user_id = $2 WHERE id = $1`, [taskId, userId]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async listWorkload(range?: { from: string; to: string }): Promise<WorkloadRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listWorkload(range);
      try {
        // Per-user HOURS load (ADR-0069 D1/D2, #591). Join `work_assignment` to
        // not-done tasks so a person counts whether they are the primary owner or an
        // additional assignee; watchers do NOT count (they only follow). `estimated_hours`
        // sums `task.estimate` where the unit is hours (the #346/#580 heavy lane authored
        // estimate + estimate_unit). `weekly_hours` is the user's `user_capacity` row
        // (LEFT JOIN — null when unset). due_at is timestamptz — bucket due-soon/overdue
        // in SQL so the horizon is server-evaluated and timezone-correct. When `range` is
        // given, scope load to tasks due in [from, to) (D2-F1 over a date range): tasks
        // with no due date stay in (open work without a date still counts as load).
        const { rows } = await pool.query<{
          user_id: string;
          name: string;
          estimated_hours: string;
          weekly_hours: string | null;
          open_tasks: string;
          due_soon: string;
          overdue: string;
        }>(
          `SELECT u.id::text AS user_id,
                  coalesce(u.display_name, split_part(u.email, '@', 1)) AS name,
                  coalesce(sum(t.estimate) FILTER (
                    WHERE t.estimate IS NOT NULL AND t.estimate_unit = 'hours'
                  ), 0)                                                 AS estimated_hours,
                  uc.weekly_hours                                       AS weekly_hours,
                  count(*)                                              AS open_tasks,
                  count(*) FILTER (
                    WHERE t.due_at IS NOT NULL
                      AND t.due_at >= now()
                      AND t.due_at < now() + interval '7 days'
                  )                                                     AS due_soon,
                  count(*) FILTER (
                    WHERE t.due_at IS NOT NULL AND t.due_at < now()
                  )                                                     AS overdue
             FROM work_assignment wa
             JOIN app_user u       ON u.id = wa.user_id
             JOIN task t           ON t.id = wa.parent_id
             LEFT JOIN user_capacity uc ON uc.user_id = u.id
            WHERE wa.parent_type = 'task'
              AND wa.role IN ('primary', 'assignee')
              AND t.status <> 'done'
              AND ($1::date IS NULL OR t.due_at IS NULL OR
                   (t.due_at >= $1::date AND t.due_at < ($2::date + interval '1 day')))
            GROUP BY u.id, name, uc.weekly_hours
            ORDER BY estimated_hours DESC, name`,
          [range?.from ?? null, range?.to ?? null],
        );
        return rows.map((r) => ({
          userId: r.user_id,
          name: r.name,
          estimatedHours: Number(r.estimated_hours),
          weeklyHours: r.weekly_hours == null ? null : Number(r.weekly_hours),
          openTasks: Number(r.open_tasks),
          dueSoon: Number(r.due_soon),
          overdue: Number(r.overdue),
        }));
      } catch (err) {
        // work_assignment / user_capacity / task.estimate may not be prod-applied
        // yet (the #346/#580 migration lands this wave) → empty, not a 500.
        if (isSchemaLagError(err)) return [];
        return mockRepositories.crm.listWorkload(range);
      }
    },

    // #591 user_capacity — per-user weekly-hours capacity (ADR-0069 D2)
    async listUserCapacity(): Promise<UserCapacity[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listUserCapacity();
      try {
        const { rows } = await pool.query<{
          user_id: string;
          name: string;
          weekly_hours: string | null;
        }>(
          `SELECT u.id::text AS user_id,
                  coalesce(u.display_name, split_part(u.email, '@', 1)) AS name,
                  uc.weekly_hours AS weekly_hours
             FROM app_user u
             LEFT JOIN user_capacity uc ON uc.user_id = u.id
            ORDER BY name`,
        );
        return rows.map((r) => ({
          userId: r.user_id,
          name: r.name,
          weeklyHours: r.weekly_hours == null ? null : Number(r.weekly_hours),
        }));
      } catch (err) {
        // user_capacity (the #346/#580 migration) may not be prod-applied yet.
        if (isSchemaLagError(err)) return [];
        return mockRepositories.crm.listUserCapacity();
      }
    },

    async setUserCapacity(userId: string, weeklyHours: number | null): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setUserCapacity(userId, weeklyHours);
      // Upsert the user's weekly capacity; null clears it. UNIQUE(user_id) on
      // user_capacity makes ON CONFLICT a clean overwrite.
      await pool.query(
        `INSERT INTO user_capacity (user_id, weekly_hours)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE
           SET weekly_hours = EXCLUDED.weekly_hours`,
        [userId, weeklyHours],
      );
    },

    async listProjectTaskDependencies(projectId: string): Promise<ProjectTaskDependencyEdge[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listProjectTaskDependencies(projectId);
      try {
        // `blocks` edges whose BOTH endpoints belong to the project — the
        // connectors the timeline draws (ADR-0066 C3, #343). Joining both ends to
        // `task` and filtering project_id on each keeps cross-project edges out.
        const { rows } = await pool.query<{ predecessor_id: string; successor_id: string }>(
          `SELECT d.predecessor_id, d.successor_id
             FROM task_dependency d
             JOIN task p ON p.id = d.predecessor_id
             JOIN task s ON s.id = d.successor_id
            WHERE d.type = 'blocks'
              AND p.project_id = $1
              AND s.project_id = $1`,
          [projectId],
        );
        return rows.map((r) => ({ predecessorId: r.predecessor_id, successorId: r.successor_id }));
      } catch {
        return mockRepositories.crm.listProjectTaskDependencies(projectId);
      }
    },

    async listSalesTasks(): Promise<SalesTaskRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listSalesTasks();
      try {
        const { rows } = await pool.query<{
          id: string;
          title: string;
          status: string;
          due_at: Date | null;
          account: string | null;
          opportunity: string | null;
          owner_user_id: string | null;
          owner: string | null;
        }>(
          `SELECT t.id, t.title, t.status, t.due_at, a.name AS account,
                  o.name AS opportunity, t.owner_user_id, u.display_name AS owner
           FROM task t
           LEFT JOIN account a ON a.id = t.account_id
           LEFT JOIN opportunity o ON o.id = t.opportunity_id
           LEFT JOIN app_user u ON u.id = t.owner_user_id
           WHERE t.category = 'sales' AND t.status <> 'done'
           ORDER BY t.due_at NULLS LAST, t.title`,
        );
        return rows.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          due: fmtDate(row.due_at),
          dueAt: fmtDate(row.due_at),
          account: row.account,
          opportunity: row.opportunity,
          ownerUserId: row.owner_user_id,
          owner: row.owner,
        }));
      } catch {
        return mockRepositories.crm.listSalesTasks();
      }
    },

    async createSalesTask(input: SalesTaskInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createSalesTask(input);
      await pool.query(
        `INSERT INTO task (account_id, opportunity_id, owner_user_id, title, detail,
                           status, category, due_at)
         VALUES ($1, $2, $3, $4, $5, 'open', 'sales'::task_category, $6::timestamptz)`,
        [
          nullIfEmpty(input.accountId),
          nullIfEmpty(input.opportunityId),
          nullIfEmpty(input.ownerUserId),
          input.title,
          nullIfEmpty(input.detail),
          nullIfEmpty(input.dueAt),
        ],
      );
    },

    async setTaskStatus(id: string, status: string): Promise<string | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setTaskStatus(id, status);
      // RETURNING the old value via a CTE so the caller can detect a real X→Y
      // move (#438) without a second round-trip; null = task absent (no-op).
      const { rows } = await pool.query<{ prev_status: string }>(
        `WITH prev AS (SELECT status FROM task WHERE id = $1)
         UPDATE task SET status = $2 WHERE id = $1
         RETURNING (SELECT status FROM prev) AS prev_status`,
        [id, status],
      );
      return rows[0]?.prev_status ?? null;
    },

    async setTaskStatusDef(id: string, statusDefId: string): Promise<string | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setTaskStatusDef(id, statusDefId);
      // Dual-stamp from a configurable-status drop (ADR-0065 B5, #613): set the FK AND
      // the legacy text `status` to the status_def's key (task.status is free text, so
      // any key fits). The status_def must be a 'task'-context row — a forged/wrong id
      // resolves no key and the UPDATE never runs (null = no-op). RETURNING the prior
      // legacy status via a CTE drives the #438 X→Y activity guard, like setTaskStatus.
      const { rows } = await pool.query<{ prev_status: string }>(
        `WITH sd AS (
           SELECT id, key FROM status_def WHERE id = $2 AND context = 'task'
         ),
         prev AS (SELECT status FROM task WHERE id = $1)
         UPDATE task t
            SET status = sd.key, status_def_id = sd.id
           FROM sd
          WHERE t.id = $1
         RETURNING (SELECT status FROM prev) AS prev_status`,
        [id, statusDefId],
      );
      return rows[0]?.prev_status ?? null;
    },

    async setTaskCategory(id: string, category: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setTaskCategory(id, category);
      await pool.query(`UPDATE task SET category = $2 WHERE id = $1`, [id, category]);
    },

    async setTaskDue(id: string, dueAt: string | null): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setTaskDue(id, dueAt);
      // Calendar drag-reschedule (ADR-0066 C2, #342) — writes the existing
      // due_at column (0007); a null clears the date. No new schema.
      await pool.query(`UPDATE task SET due_at = $2 WHERE id = $1`, [id, dueAt]);
    },

    async listProposals(): Promise<ProposalRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listProposals();
      try {
        const { rows } = await pool.query<{
          id: string;
          title: string;
          opportunity: string;
          account: string;
          status: string;
          amount_mrr: string | null;
          sent_at: Date | null;
        }>(
          `SELECT p.id, p.title, o.name AS opportunity, a.name AS account,
                  p.status, p.amount_mrr, p.sent_at
           FROM proposal p
           JOIN opportunity o ON o.id = p.opportunity_id
           JOIN account a ON a.id = o.account_id
           ORDER BY p.created_at DESC`,
        );
        return rows.map((row) => ({
          id: row.id,
          title: row.title,
          opportunity: row.opportunity,
          account: row.account,
          status: row.status,
          amount:
            row.amount_mrr != null && Number(row.amount_mrr) > 0
              ? `${fmtUsd(Number(row.amount_mrr))}/mo`
              : "—",
          sent: fmtDate(row.sent_at),
        }));
      } catch {
        return mockRepositories.crm.listProposals();
      }
    },

    async getProposal(id: string): Promise<ProposalEditable | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          opportunity_id: string;
          title: string;
          status: string;
          amount_mrr: string | null;
          document_url: string | null;
          notes: string | null;
        }>(
          `SELECT id, opportunity_id, title, status, amount_mrr, document_url, notes
           FROM proposal WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          opportunityId: r.opportunity_id,
          title: r.title,
          status: r.status,
          amountMrr: r.amount_mrr,
          documentUrl: r.document_url,
          notes: r.notes,
        };
      } catch {
        return null;
      }
    },

    async createProposal(input: ProposalInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createProposal(input);
      // Stamp lifecycle timestamps from the chosen status (ADR-0019).
      await pool.query(
        `INSERT INTO proposal
           (opportunity_id, title, status, amount_mrr, document_url, notes, sent_at, decided_at)
         VALUES (
           $1, $2, $3::proposal_status, $4::numeric, $5, $6,
           CASE WHEN $3 = 'draft' THEN NULL ELSE now() END,
           CASE WHEN $3 IN ('accepted','declined') THEN now() ELSE NULL END
         )`,
        [
          input.opportunityId,
          input.title,
          input.status,
          nullIfEmpty(input.amountMrr),
          nullIfEmpty(input.documentUrl),
          nullIfEmpty(input.notes),
        ],
      );
    },

    async updateProposal(id: string, input: ProposalInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateProposal(id, input);
      // Preserve an existing sent/decided timestamp; stamp on first transition.
      await pool.query(
        `UPDATE proposal
         SET opportunity_id = $1, title = $2, status = $3::proposal_status,
             amount_mrr = $4::numeric, document_url = $5, notes = $6,
             sent_at = CASE WHEN $3 = 'draft' THEN NULL ELSE coalesce(sent_at, now()) END,
             decided_at = CASE WHEN $3 IN ('accepted','declined')
                               THEN coalesce(decided_at, now()) ELSE NULL END
         WHERE id = $7`,
        [
          input.opportunityId,
          input.title,
          input.status,
          nullIfEmpty(input.amountMrr),
          nullIfEmpty(input.documentUrl),
          nullIfEmpty(input.notes),
          id,
        ],
      );
    },

    async deleteProposal(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteProposal(id);
      await pool.query(`DELETE FROM proposal WHERE id = $1`, [id]);
    },

    async listProjects(): Promise<ProjectRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listProjects();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          account: string;
          opportunity: string | null;
          type: string;
          type_key: string;
          owner: string | null;
          status: string;
          target_live_date: Date | null;
          status_def_key: string | null;
        }>(
          // status_def join exposes the configurable-status key (ADR-0065 B5, #613) so
          // the board buckets by it when set — letting a project sit in a per-type
          // custom column the legacy project_status enum cannot name.
          `SELECT pr.id, pr.name, a.name AS account, o.name AS opportunity,
                  pt.name AS type, pt.key AS type_key,
                  coalesce(u.display_name, u.email) AS owner,
                  pr.status, pr.target_live_date, sd.key AS status_def_key
           FROM project pr
           JOIN account a ON a.id = pr.account_id
           JOIN project_type pt ON pt.id = pr.project_type_id
           LEFT JOIN opportunity o ON o.id = pr.opportunity_id
           LEFT JOIN app_user u ON u.id = pr.owner_user_id
           LEFT JOIN status_def sd ON sd.id = pr.status_def_id
           ORDER BY pr.target_live_date NULLS LAST, a.name`,
        );
        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          account: row.account,
          opportunity: row.opportunity,
          type: row.type,
          typeKey: row.type_key,
          owner: row.owner,
          status: row.status,
          targetLive: fmtDate(row.target_live_date),
          statusDefKey: row.status_def_key,
        }));
      } catch {
        return mockRepositories.crm.listProjects();
      }
    },

    async listPortfolio(): Promise<PortfolioRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listPortfolio();
      try {
        const today = new Date().toISOString().slice(0, 10);
        // One row per project (canonical join, mirrors listProjects).
        const { rows } = await pool.query<{
          id: string;
          name: string;
          account: string;
          type: string;
          type_key: string;
          owner: string | null;
          status: string;
          target_live_date: Date | null;
        }>(
          `SELECT pr.id, pr.name, a.name AS account,
                  pt.name AS type, pt.key AS type_key,
                  coalesce(u.display_name, u.email) AS owner,
                  pr.status, pr.target_live_date
           FROM project pr
           JOIN account a ON a.id = pr.account_id
           JOIN project_type pt ON pt.id = pr.project_type_id
           LEFT JOIN app_user u ON u.id = pr.owner_user_id
           ORDER BY pr.target_live_date NULLS LAST, a.name`,
        );
        // All milestones, grouped per project for the health rollup + next milestone.
        const { rows: ms } = await pool.query<{
          project_id: string;
          name: string;
          status: string;
          health: Health;
          ordinal: number;
          due_at: Date | null;
        }>(
          `SELECT project_id, name, status::text AS status, health::text AS health,
                  ordinal, due_at
           FROM project_milestone
           ORDER BY ordinal, name`,
        );
        const byProject = new Map<string, PortfolioMilestone[]>();
        for (const m of ms) {
          const list = byProject.get(m.project_id) ?? [];
          list.push({
            status: m.status,
            // A past-due, not-yet-complete milestone reads red regardless of its
            // stored health — same intent as the onboarding deriveHealth fallback.
            health:
              m.status !== "complete" && fmtDate(m.due_at) && fmtDate(m.due_at)! < today
                ? "red"
                : m.health,
            ordinal: m.ordinal,
            name: m.name,
            due: fmtDate(m.due_at),
          });
          byProject.set(m.project_id, list);
        }
        return rows.map((row) => {
          const milestones = byProject.get(row.id) ?? [];
          const next = nextMilestone(milestones);
          return {
            id: row.id,
            name: row.name,
            account: row.account,
            type: row.type,
            typeKey: row.type_key,
            owner: row.owner,
            status: row.status,
            targetLive: fmtDate(row.target_live_date),
            health: rollupHealth(milestones),
            milestoneTotal: milestones.length,
            milestoneDone: milestones.filter((m) => m.status === "complete").length,
            nextMilestone: next?.name ?? null,
            nextMilestoneDue: next?.due ?? null,
          };
        });
      } catch {
        return mockRepositories.crm.listPortfolio();
      }
    },

    async listGoals(): Promise<GoalRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listGoals();
      try {
        // 1. The goals themselves + owner display name.
        const { rows } = await pool.query<{
          id: string;
          name: string;
          owner: string | null;
          period: string | null;
          target: string;
          current: string;
          progress_mode: "manual" | "rollup";
          notes: string | null;
        }>(
          `SELECT g.id, g.name,
                  coalesce(u.display_name, u.email) AS owner,
                  g.period, g.target, g.current, g.progress_mode, g.notes
             FROM goal g
             LEFT JOIN app_user u ON u.id = g.owner_user_id
            ORDER BY g.created_at DESC, g.name`,
        );
        // 2. Linked PROJECTS with their milestone completion (the rollup inputs,
        //    ADR-0069 D3).
        const { rows: links } = await pool.query<{
          goal_id: string;
          project_id: string;
          name: string;
          account: string;
          status: string;
          weight: string;
          milestone_total: string;
          milestone_done: string;
        }>(
          `SELECT gl.goal_id, pr.id AS project_id, pr.name, a.name AS account,
                  pr.status, gl.weight,
                  count(pm.id)                                          AS milestone_total,
                  count(pm.id) FILTER (WHERE pm.status = 'complete')    AS milestone_done
             FROM goal_link gl
             JOIN project pr ON pr.id = gl.parent_id AND gl.parent_type = 'project'
             JOIN account a  ON a.id = pr.account_id
             LEFT JOIN project_milestone pm ON pm.project_id = pr.id
            GROUP BY gl.goal_id, pr.id, pr.name, a.name, pr.status, gl.weight`,
        );
        const byGoal = new Map<string, GoalLinkedProject[]>();
        for (const l of links) {
          const list = byGoal.get(l.goal_id) ?? [];
          list.push({
            projectId: l.project_id,
            name: l.name,
            account: l.account,
            status: l.status,
            weight: Number(l.weight),
            percentComplete: projectPercentComplete({
              status: l.status,
              milestoneTotal: Number(l.milestone_total),
              milestoneDone: Number(l.milestone_done),
            }),
          });
          byGoal.set(l.goal_id, list);
        }
        // 3. Linked TASKS (issue #621). A task is binary (done → 100, else 0); it
        //    feeds the SAME weighted pool as project links via `goal_link.weight`.
        const { rows: taskRows } = await pool.query<{
          goal_id: string;
          task_id: string;
          title: string;
          status: string;
          weight: string;
        }>(
          `SELECT gl.goal_id, t.id AS task_id, t.title, t.status, gl.weight
             FROM goal_link gl
             JOIN task t ON t.id = gl.parent_id AND gl.parent_type = 'task'`,
        );
        const tasksByGoal = new Map<string, GoalLinkedTask[]>();
        for (const t of taskRows) {
          const list = tasksByGoal.get(t.goal_id) ?? [];
          list.push({
            taskId: t.task_id,
            title: t.title,
            status: t.status,
            weight: Number(t.weight),
            percentComplete: goalTaskPercentComplete(t.status),
          });
          tasksByGoal.set(t.goal_id, list);
        }
        return rows.map((g) => {
          const goalLinks = (byGoal.get(g.id) ?? []).sort((a, b) =>
            a.name.localeCompare(b.name),
          );
          const goalTaskLinks = (tasksByGoal.get(g.id) ?? []).sort((a, b) =>
            a.title.localeCompare(b.title),
          );
          const target = Number(g.target);
          const current = Number(g.current);
          const manual = goalManualPercent(current, target);
          // Project AND task links share one weighted average (issue #621).
          const rolledUp = goalRolledUpPercent([...goalLinks, ...goalTaskLinks]);
          return {
            id: g.id,
            name: g.name,
            owner: g.owner,
            period: g.period,
            target,
            current,
            progressMode: g.progress_mode,
            notes: g.notes,
            manualPercent: manual,
            rolledUpPercent: rolledUp,
            displayPercent: goalDisplayPercent({
              progressMode: g.progress_mode,
              manual,
              rolledUp,
            }),
            links: goalLinks,
            taskLinks: goalTaskLinks,
          };
        });
      } catch (err) {
        // goal/goal_link (0102) may not be prod-applied yet → empty, not a 500.
        if (isSchemaLagError(err)) return [];
        return mockRepositories.crm.listGoals();
      }
    },

    // ── Goal authoring + link CRUD (ADR-0069 D3, issue #621) ──────────────────

    async getGoal(id: string): Promise<GoalEditable | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getGoal(id);
      const { rows } = await pool.query<{
        id: string;
        name: string;
        owner_user_id: string | null;
        period: string | null;
        target: string;
        current: string;
        progress_mode: "manual" | "rollup";
        notes: string | null;
      }>(
        `SELECT id, owner_user_id, name, period, target, current, progress_mode, notes
           FROM goal WHERE id = $1`,
        [id],
      );
      const g = rows[0];
      if (!g) return null;
      return {
        id: g.id,
        name: g.name,
        ownerUserId: g.owner_user_id,
        period: g.period,
        target: Number(g.target),
        current: Number(g.current),
        progressMode: g.progress_mode,
        notes: g.notes,
      };
    },

    async createGoal(input: GoalInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createGoal(input);
      await pool.query(
        `INSERT INTO goal (name, owner_user_id, period, target, current, progress_mode, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          input.name,
          nullIfEmpty(input.ownerUserId),
          nullIfEmpty(input.period),
          input.target,
          input.current,
          input.progressMode,
          nullIfEmpty(input.notes),
        ],
      );
    },

    async updateGoal(id: string, input: GoalInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateGoal(id, input);
      await pool.query(
        `UPDATE goal
            SET name = $1, owner_user_id = $2, period = $3, target = $4,
                current = $5, progress_mode = $6, notes = $7
          WHERE id = $8`,
        [
          input.name,
          nullIfEmpty(input.ownerUserId),
          nullIfEmpty(input.period),
          input.target,
          input.current,
          input.progressMode,
          nullIfEmpty(input.notes),
          id,
        ],
      );
    },

    async deleteGoal(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteGoal(id);
      // goal_link rows CASCADE on the FK (migration 0102).
      await pool.query(`DELETE FROM goal WHERE id = $1`, [id]);
    },

    async addGoalLink(input: GoalLinkInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.addGoalLink(input);
      // Idempotent re-link via the UNIQUE (goal_id, parent_type, parent_id) — a
      // repeat updates the weight rather than erroring (migration 0102).
      await pool.query(
        `INSERT INTO goal_link (goal_id, parent_type, parent_id, weight)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (goal_id, parent_type, parent_id)
         DO UPDATE SET weight = EXCLUDED.weight`,
        [input.goalId, input.parentType, input.parentId, input.weight],
      );
    },

    async removeGoalLink(goalId: string, parentType: string, parentId: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.removeGoalLink(goalId, parentType, parentId);
      await pool.query(
        `DELETE FROM goal_link
          WHERE goal_id = $1 AND parent_type = $2 AND parent_id = $3`,
        [goalId, parentType, parentId],
      );
    },

    async goalLinkCandidates(): Promise<{ projects: Option[]; tasks: Option[] }> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.goalLinkCandidates();
      try {
        const [{ rows: projects }, { rows: tasks }] = await Promise.all([
          pool.query<{ id: string; name: string }>(
            `SELECT pr.id, a.name || ' — ' || pr.name AS name
               FROM project pr JOIN account a ON a.id = pr.account_id
              ORDER BY a.name, pr.name`,
          ),
          pool.query<{ id: string; name: string }>(
            `SELECT id, title AS name FROM task ORDER BY title`,
          ),
        ]);
        return {
          projects: projects.map((r) => ({ id: r.id, name: r.name })),
          tasks: tasks.map((r) => ({ id: r.id, name: r.name })),
        };
      } catch {
        return mockRepositories.crm.goalLinkCandidates();
      }
    },

    async getProject(id: string): Promise<ProjectEditable | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          account_id: string;
          opportunity_id: string | null;
          name: string;
          project_type_id: string;
          owner_user_id: string | null;
          status: string;
          target_live_date: Date | null;
          notes: string | null;
        }>(
          `SELECT id, account_id, opportunity_id, name, project_type_id,
                  owner_user_id, status, target_live_date, notes
           FROM project WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          accountId: r.account_id,
          opportunityId: r.opportunity_id,
          name: r.name,
          projectTypeId: r.project_type_id,
          ownerUserId: r.owner_user_id,
          status: r.status,
          targetLiveDate: fmtDate(r.target_live_date),
          notes: r.notes,
        };
      } catch {
        return null;
      }
    },

    async createProject(input: ProjectInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createProject(input);
      // Stamp lifecycle timestamps from the chosen status (ADR-0020).
      await pool.query(
        `INSERT INTO project
           (account_id, opportunity_id, name, project_type_id, owner_user_id,
            status, target_live_date, notes, started_at, completed_at)
         VALUES (
           $1, $2, $3, $4, $5, $6::project_status, $7::date, $8,
           CASE WHEN $6 = 'not_started' THEN NULL ELSE now() END,
           CASE WHEN $6 = 'complete' THEN now() ELSE NULL END
         )`,
        [
          input.accountId,
          nullIfEmpty(input.opportunityId),
          input.name,
          input.projectTypeId,
          nullIfEmpty(input.ownerUserId),
          input.status,
          nullIfEmpty(input.targetLiveDate),
          nullIfEmpty(input.notes),
        ],
      );
    },

    async updateProject(id: string, input: ProjectInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateProject(id, input);
      // Preserve existing started/completed timestamps; stamp on first transition.
      await pool.query(
        `UPDATE project
         SET account_id = $1, opportunity_id = $2, name = $3, project_type_id = $4,
             owner_user_id = $5, status = $6::project_status,
             target_live_date = $7::date, notes = $8,
             started_at = CASE WHEN $6 = 'not_started' THEN NULL
                               ELSE coalesce(started_at, now()) END,
             completed_at = CASE WHEN $6 = 'complete'
                                 THEN coalesce(completed_at, now()) ELSE NULL END
         WHERE id = $9`,
        [
          input.accountId,
          nullIfEmpty(input.opportunityId),
          input.name,
          input.projectTypeId,
          nullIfEmpty(input.ownerUserId),
          input.status,
          nullIfEmpty(input.targetLiveDate),
          nullIfEmpty(input.notes),
          id,
        ],
      );
    },

    async setProjectStatus(id: string, status: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setProjectStatus(id, status);
      // Status-only mutation for the kanban board drop. Keeps the same
      // started_at/completed_at stamping as updateProject so a drag transition
      // is indistinguishable from an edit-form transition.
      await pool.query(
        `UPDATE project
         SET status = $2::project_status,
             started_at = CASE WHEN $2 = 'not_started' THEN NULL
                               ELSE coalesce(started_at, now()) END,
             completed_at = CASE WHEN $2 = 'complete'
                                 THEN coalesce(completed_at, now()) ELSE NULL END
         WHERE id = $1`,
        [id, status],
      );
    },

    async setProjectStatusDef(id: string, statusDefId: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setProjectStatusDef(id, statusDefId);
      // Dual-stamp from a configurable-status drop (ADR-0065 B5, #613). project.status
      // is the project_status ENUM, which cannot hold a custom key, so the legacy
      // column is set to the enum value the status_def's CATEGORY maps to
      // (todo→not_started, in_progress→in_progress, done→complete) — the FK carries the
      // precise (possibly custom) column while the enum keeps the legacy rollup honest.
      // started_at/completed_at are stamped off that derived enum exactly as
      // setProjectStatus/updateProject do. The status_def must be a 'project'-context
      // row; a missing/wrong id resolves nothing and the UPDATE never runs (no-op).
      await pool.query(
        `WITH sd AS (
           SELECT id,
                  CASE category
                    WHEN 'todo' THEN 'not_started'
                    WHEN 'done' THEN 'complete'
                    ELSE 'in_progress'
                  END AS legacy_status
             FROM status_def WHERE id = $2 AND context = 'project'
         )
         UPDATE project pr
            SET status_def_id = sd.id,
                status = sd.legacy_status::project_status,
                started_at = CASE WHEN sd.legacy_status = 'not_started' THEN NULL
                                  ELSE coalesce(pr.started_at, now()) END,
                completed_at = CASE WHEN sd.legacy_status = 'complete'
                                    THEN coalesce(pr.completed_at, now()) ELSE NULL END
           FROM sd
          WHERE pr.id = $1`,
        [id, statusDefId],
      );
    },

    async setProjectType(id: string, projectTypeId: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setProjectType(id, projectTypeId);
      await pool.query(`UPDATE project SET project_type_id = $2 WHERE id = $1`, [id, projectTypeId]);
    },

    async deleteProject(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteProject(id);
      await pool.query(`DELETE FROM project WHERE id = $1`, [id]);
    },

    async listProjectTypes(): Promise<ProjectTypeRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listProjectTypes();
      try {
        const { rows } = await pool.query<{
          id: string;
          key: string;
          name: string;
          description: string | null;
          is_protected: boolean;
          project_count: string;
        }>(
          `SELECT pt.id, pt.key, pt.name, pt.description, pt.is_protected,
                  count(pr.id) AS project_count
           FROM project_type pt
           LEFT JOIN project pr ON pr.project_type_id = pt.id
           GROUP BY pt.id
           ORDER BY pt.is_protected DESC, pt.name`,
        );
        return rows.map((r) => ({
          id: r.id,
          key: r.key,
          name: r.name,
          description: r.description,
          isProtected: r.is_protected,
          projectCount: Number(r.project_count),
        }));
      } catch {
        return mockRepositories.crm.listProjectTypes();
      }
    },

    async createProjectType(input: ProjectTypeInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createProjectType(input);
      await pool.query(
        `INSERT INTO project_type (key, name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO NOTHING`,
        [input.key, input.name, nullIfEmpty(input.description)],
      );
    },

    async deleteProjectType(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteProjectType(id);
      // Protected types (Onboarding) are never deletable; a type in use fails
      // on the RESTRICT FK (ADR-0052 §1).
      await pool.query(`DELETE FROM project_type WHERE id = $1 AND NOT is_protected`, [id]);
    },

    // ── Configurable statuses (ADR-0065 B5, #339, migration 0104) ──────────────
    async listStatusDefs(
      context: string,
      projectTypeId?: string | null,
    ): Promise<StatusDefRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listStatusDefs(context, projectTypeId);
      try {
        // Resolve the effective set: prefer the project-type-scoped statuses when
        // that type defines its own for this context, else fall back to the seeded
        // global defaults. One round-trip — the typed set wins per the partial
        // unique indexes, and EXISTS gates the fallback so we never mix scopes.
        const { rows } = await pool.query<{
          id: string;
          scope: string;
          project_type_id: string | null;
          context: string;
          key: string;
          label: string;
          color: string | null;
          category: string;
          ordinal: number;
          wip_limit: number | null;
        }>(
          `SELECT id, scope, project_type_id, context, key, label, color,
                  category, ordinal, wip_limit
             FROM status_def
            WHERE context = $1
              AND (
                ($2::uuid IS NOT NULL
                   AND scope = 'project_type' AND project_type_id = $2::uuid)
                OR (scope = 'global'
                   AND NOT EXISTS (
                     SELECT 1 FROM status_def s2
                      WHERE s2.context = $1
                        AND s2.scope = 'project_type'
                        AND s2.project_type_id = $2::uuid))
              )
            ORDER BY ordinal, label`,
          [context, projectTypeId ?? null],
        );
        return rows.map((r) => ({
          id: r.id,
          scope: r.scope,
          projectTypeId: r.project_type_id,
          context: r.context,
          key: r.key,
          label: r.label,
          color: r.color,
          category: r.category,
          ordinal: r.ordinal,
          wipLimit: r.wip_limit,
        }));
      } catch {
        return mockRepositories.crm.listStatusDefs(context, projectTypeId);
      }
    },

    // ── Configurable-status admin CRUD (ADR-0065 B5, #616, migration 0104) ──────
    // The grant for INSERT/UPDATE/DELETE on status_def is in 0104's least-privilege
    // block (verified applied to prod). scope/project_type_id are kept consistent
    // by the status_def_scope_type_chk CHECK and the partial unique indexes — a
    // duplicate key within a (context, scope, type) raises, surfaced as a thrown
    // error to the gated action.
    async listStatusDefsForScope(
      context: string,
      scope: string,
      projectTypeId: string | null,
    ): Promise<StatusDefRow[]> {
      const pool = getPool();
      if (!pool) {
        return mockRepositories.crm.listStatusDefsForScope(context, scope, projectTypeId);
      }
      const { rows } = await pool.query<StatusDefDbRow>(
        `SELECT id, scope, project_type_id, context, key, label, color,
                category, ordinal, wip_limit
           FROM status_def
          WHERE context = $1 AND scope = $2
            AND project_type_id IS NOT DISTINCT FROM $3::uuid
          ORDER BY ordinal, label`,
        [context, scope, projectTypeId],
      );
      return rows.map(mapStatusDef);
    },

    async createStatusDef(input: StatusDefInput): Promise<StatusDefRow> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createStatusDef(input);
      const { rows } = await pool.query<StatusDefDbRow>(
        `INSERT INTO status_def
           (scope, project_type_id, context, key, label, color, category, ordinal, wip_limit)
         VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, scope, project_type_id, context, key, label, color,
                   category, ordinal, wip_limit`,
        statusDefParams(input),
      );
      return mapStatusDef(rows[0]);
    },

    async updateStatusDef(
      id: string,
      input: StatusDefInput,
    ): Promise<StatusDefRow | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateStatusDef(id, input);
      const { rows } = await pool.query<StatusDefDbRow>(
        `UPDATE status_def
            SET scope = $1, project_type_id = $2::uuid, context = $3, key = $4,
                label = $5, color = $6, category = $7, ordinal = $8, wip_limit = $9
          WHERE id = $10::uuid
        RETURNING id, scope, project_type_id, context, key, label, color,
                  category, ordinal, wip_limit`,
        [...statusDefParams(input), id],
      );
      return rows[0] ? mapStatusDef(rows[0]) : null;
    },

    async deleteStatusDef(id: string): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteStatusDef(id);
      const { rowCount } = await pool.query(
        `DELETE FROM status_def WHERE id = $1::uuid`,
        [id],
      );
      return (rowCount ?? 0) > 0;
    },

    async reorderStatusDefs(order: { id: string; ordinal: number }[]): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.reorderStatusDefs(order);
      if (order.length === 0) return;
      // One statement: VALUES list joined onto the table so the whole reorder is a
      // single atomic UPDATE (no per-row round-trips, no partial reorder on error).
      const values = order
        .map((_, i) => `($${i * 2 + 1}::uuid, $${i * 2 + 2}::integer)`)
        .join(", ");
      const params = order.flatMap((o) => [o.id, o.ordinal]);
      await pool.query(
        `UPDATE status_def AS sd
            SET ordinal = v.ordinal
           FROM (VALUES ${values}) AS v(id, ordinal)
          WHERE sd.id = v.id`,
        params,
      );
    },

    // ── Delivery templates (ADR-0081, migration 0084) ──────────────────────────
    async listDeliveryTemplates(opts): Promise<DeliveryTemplateRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listDeliveryTemplates(opts);
      try {
        const where: string[] = [];
        const params: unknown[] = [];
        if (opts?.activeOnly) where.push(`dt.is_active`);
        if (opts?.projectTypeId) {
          // A type filter matches templates bound to that type OR unbound (any-type).
          params.push(opts.projectTypeId);
          where.push(`(dt.project_type_id = $${params.length} OR dt.project_type_id IS NULL)`);
        }
        const { rows } = await pool.query<{
          id: string;
          key: string;
          name: string;
          description: string | null;
          version: number;
          project_type_id: string | null;
          project_type_name: string | null;
          is_active: boolean;
          phase_count: string;
          task_count: string;
        }>(
          `SELECT dt.id, dt.key, dt.name, dt.description, dt.version,
                  dt.project_type_id, pt.name AS project_type_name, dt.is_active,
                  count(DISTINCT p.id) AS phase_count,
                  count(t.id)          AS task_count
           FROM delivery_template dt
           LEFT JOIN project_type pt ON pt.id = dt.project_type_id
           LEFT JOIN delivery_template_phase p ON p.template_id = dt.id
           LEFT JOIN delivery_template_task  t ON t.phase_id = p.id
           ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
           GROUP BY dt.id, pt.name
           ORDER BY dt.is_active DESC, dt.name`,
          params,
        );
        return rows.map((r) => ({
          id: r.id,
          key: r.key,
          name: r.name,
          description: r.description,
          version: Number(r.version),
          projectTypeId: r.project_type_id,
          projectTypeName: r.project_type_name,
          isActive: r.is_active,
          phaseCount: Number(r.phase_count),
          taskCount: Number(r.task_count),
        }));
      } catch {
        return mockRepositories.crm.listDeliveryTemplates(opts);
      }
    },

    async getDeliveryTemplate(id: string): Promise<DeliveryTemplateDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getDeliveryTemplate(id);
      const { rows: tRows } = await pool.query<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        version: number;
        project_type_id: string | null;
        project_type_name: string | null;
        is_active: boolean;
      }>(
        `SELECT dt.id, dt.key, dt.name, dt.description, dt.version,
                dt.project_type_id, pt.name AS project_type_name, dt.is_active
         FROM delivery_template dt
         LEFT JOIN project_type pt ON pt.id = dt.project_type_id
         WHERE dt.id = $1`,
        [id],
      );
      const t = tRows[0];
      if (!t) return null;
      const { rows: pRows } = await pool.query<{
        id: string;
        ordinal: number;
        name: string;
        offset_days: number;
        duration_days: number;
      }>(
        `SELECT id, ordinal, name, offset_days, duration_days
         FROM delivery_template_phase WHERE template_id = $1 ORDER BY ordinal`,
        [id],
      );
      const { rows: taskRows } = await pool.query<{
        id: string;
        phase_id: string;
        ordinal: number;
        title: string;
        offset_days: number;
        duration_days: number;
        dispatches_ticket: boolean;
        ticket_queue_id: string | null;
        ticket_title: string | null;
        ticket_lead_days: number;
      }>(
        `SELECT t.id, t.phase_id, t.ordinal, t.title, t.offset_days, t.duration_days,
                t.dispatches_ticket, t.ticket_queue_id, t.ticket_title, t.ticket_lead_days
         FROM delivery_template_task t
         JOIN delivery_template_phase p ON p.id = t.phase_id
         WHERE p.template_id = $1 ORDER BY t.ordinal`,
        [id],
      );
      return {
        id: t.id,
        key: t.key,
        name: t.name,
        description: t.description,
        version: Number(t.version),
        projectTypeId: t.project_type_id,
        projectTypeName: t.project_type_name,
        isActive: t.is_active,
        phases: pRows.map((p) => ({
          id: p.id,
          ordinal: Number(p.ordinal),
          name: p.name,
          offsetDays: Number(p.offset_days),
          durationDays: Number(p.duration_days),
          tasks: taskRows
            .filter((tk) => tk.phase_id === p.id)
            .map((tk) => ({
              id: tk.id,
              ordinal: Number(tk.ordinal),
              title: tk.title,
              offsetDays: Number(tk.offset_days),
              durationDays: Number(tk.duration_days),
              dispatchesTicket: tk.dispatches_ticket,
              ticketQueueId: tk.ticket_queue_id == null ? null : Number(tk.ticket_queue_id),
              ticketTitle: tk.ticket_title,
              ticketLeadDays: Number(tk.ticket_lead_days),
            })),
        })),
      };
    },

    async createDeliveryTemplate(input: DeliveryTemplateInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createDeliveryTemplate(input);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO delivery_template (key, name, description, version, project_type_id, is_active)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            input.key,
            input.name,
            nullIfEmpty(input.description),
            input.version,
            input.projectTypeId,
            input.isActive,
          ],
        );
        const templateId = rows[0].id;
        let phaseOrd = 0;
        for (const phase of input.phases) {
          const { rows: phRows } = await client.query<{ id: string }>(
            `INSERT INTO delivery_template_phase (template_id, ordinal, name, offset_days, duration_days)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [templateId, phaseOrd++, phase.name, phase.offsetDays, phase.durationDays],
          );
          const phaseId = phRows[0].id;
          let taskOrd = 0;
          for (const task of phase.tasks) {
            await client.query(
              `INSERT INTO delivery_template_task
                 (phase_id, ordinal, title, offset_days, duration_days,
                  dispatches_ticket, ticket_queue_id, ticket_title, ticket_lead_days)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                phaseId,
                taskOrd++,
                task.title,
                task.offsetDays,
                task.durationDays,
                task.dispatchesTicket,
                task.dispatchesTicket ? task.ticketQueueId : null,
                task.dispatchesTicket ? nullIfEmpty(task.ticketTitle) : null,
                task.dispatchesTicket ? task.ticketLeadDays : 0,
              ],
            );
          }
        }
        await client.query("COMMIT");
        return templateId;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async deleteDeliveryTemplate(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteDeliveryTemplate(id);
      // CASCADE drops phases/tasks; project_provisioning.delivery_template_id SET NULL.
      await pool.query(`DELETE FROM delivery_template WHERE id = $1`, [id]);
    },

    async instantiateDeliveryTemplate(input: DeliveryInstantiationInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.instantiateDeliveryTemplate(input);
      // Normalize the start (same guard as applyOnboardingTemplate).
      const startDate = /^\d{4}-\d{2}-\d{2}$/.test(input.startDate)
        ? input.startDate
        : new Date().toISOString().slice(0, 10);

      // Load the template tree first (read).
      const template = await this.getDeliveryTemplate(input.deliveryTemplateId);
      if (!template) throw new Error(`Delivery template ${input.deliveryTemplateId} not found.`);

      // The won-opportunity seam. The KQM/Autotask ids the executor needs
      // (source_kqm_quote_id / autotask_opportunity_id, spike #427) live in the
      // opportunity BRONZE (0083) — the silver `opportunity` table does NOT yet
      // carry them; surfacing them is a deferred pipeline merge slice. So here we
      // only (a) re-validate the chosen opportunity is WON (the board offers only
      // won ones, but a forged id must not provision off a draft) and (b) link it
      // as project provenance via project.opportunity_id. The provisioning seam
      // columns stay NULL until the silver merge lands them — inert exactly as the
      // contract gate keeps the row inert in prod (#566 notes).
      let opportunityId: string | null = null;
      if (input.opportunityId) {
        const { rows: oppRows } = await pool.query<{ sales_stage: string }>(
          `SELECT sales_stage FROM opportunity WHERE id = $1`,
          [input.opportunityId],
        );
        if (oppRows[0]?.sales_stage === "won") opportunityId = input.opportunityId;
        else throw new Error("Provisioning requires a won opportunity.");
      }
      const sourceKqmQuoteId: string | null = null;
      const autotaskOpportunityId: number | null = null;

      // Pure plan: phase/task dates + per-task fire specs (mirrors the onboarding
      // date math). The transaction below supplies the real row ids for the keys.
      const plan = planInstantiation(template, startDate);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // 1. The native project — same shape as createProject, link the opportunity
        //    when one was chosen (provenance), not-started lifecycle.
        const { rows: projRows } = await client.query<{ id: string }>(
          `INSERT INTO project
             (account_id, opportunity_id, name, project_type_id, status, started_at, completed_at)
           VALUES ($1, $2, $3, $4, 'not_started'::project_status, NULL, NULL)
           RETURNING id`,
          [input.accountId, opportunityId, input.name, input.projectTypeId],
        );
        const projectId = projRows[0].id;

        // 2. Milestones per phase + tasks per template task (mirrors applyOnboardingTemplate
        //    row shapes: project_milestone start/due, task category 'project').
        for (const m of plan.milestones) {
          await client.query(
            `INSERT INTO project_milestone
               (project_id, name, ordinal, status, health, start_at, due_at)
             VALUES ($1, $2, $3, 'not_started', 'amber', $4::date, $5::date)`,
            [projectId, m.name, m.ordinal, m.startAt, m.dueAt],
          );
          for (const t of m.tasks) {
            const { rows: taskRows } = await client.query<{ id: string }>(
              `INSERT INTO task (account_id, project_id, title, status, category, due_at)
               VALUES ($1, $2, $3, 'open', 'project'::task_category, $4::date)
               RETURNING id`,
              [input.accountId, projectId, t.title, t.dueAt],
            );
            const taskId = taskRows[0].id;
            // 4. A task_ticket_fire row for each dispatching task. fire_state stays
            //    'none' (the board schedules later → 'scheduled'); scheduled_for is
            //    precomputed (task start − lead days) so the board recomputes nothing.
            if (t.fire) {
              await client.query(
                `INSERT INTO task_ticket_fire
                   (task_id, fire_state, scheduled_for, autotask_queue_id, idempotency_key)
                 VALUES ($1, 'none', $2::date, $3, $4)`,
                [taskId, t.fire.scheduledFor, t.fire.ticketQueueId, taskTicketIdempotencyKey(taskId)],
              );
            }
          }
        }

        // 3. The provisioning row — pending, contract gate 'none' (inert until
        //    DocuSign sets 'signed', #391-395), template ref + won→Autotask seam.
        await client.query(
          `INSERT INTO project_provisioning
             (project_id, source_kqm_quote_id, autotask_opportunity_id,
              provision_state, contract_state, idempotency_key, delivery_template_id)
           VALUES ($1, $2, $3, 'pending', 'none', $4, $5)`,
          [
            projectId,
            sourceKqmQuoteId,
            autotaskOpportunityId,
            projectIdempotencyKey(projectId),
            input.deliveryTemplateId,
          ],
        );

        await client.query("COMMIT");
        return projectId;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    // ── Project templates (ADR-0070 E1, migration 0109, #352) ───────────────────
    async listProjectTemplates(opts?: { projectTypeId?: string }): Promise<ProjectTemplateRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listProjectTemplates(opts);
      try {
        const params: unknown[] = [];
        let where = "";
        if (opts?.projectTypeId) {
          // A type filter matches templates bound to that type OR unbound (any-type).
          params.push(opts.projectTypeId);
          where = `WHERE (pt.project_type_id = $1 OR pt.project_type_id IS NULL)`;
        }
        const { rows } = await pool.query<{
          id: string;
          key: string;
          name: string;
          description: string | null;
          project_type_id: string | null;
          project_type_name: string | null;
          is_protected: boolean;
          milestone_count: string;
          item_count: string;
        }>(
          `SELECT pt.id, pt.key, pt.name, pt.description, pt.project_type_id,
                  ty.name AS project_type_name, pt.is_protected,
                  count(ti.id) FILTER (WHERE ti.kind = 'milestone')          AS milestone_count,
                  count(ti.id) FILTER (WHERE ti.kind IN ('step', 'task'))    AS item_count
           FROM project_template pt
           LEFT JOIN project_type ty ON ty.id = pt.project_type_id
           LEFT JOIN template_item ti ON ti.template_id = pt.id
           ${where}
           GROUP BY pt.id, ty.name
           ORDER BY pt.is_protected DESC, pt.name`,
          params,
        );
        return rows.map((r) => ({
          id: r.id,
          key: r.key,
          name: r.name,
          description: r.description,
          projectTypeId: r.project_type_id,
          projectTypeName: r.project_type_name,
          isProtected: r.is_protected,
          milestoneCount: Number(r.milestone_count),
          itemCount: Number(r.item_count),
        }));
      } catch {
        return mockRepositories.crm.listProjectTemplates(opts);
      }
    },

    async getProjectTemplate(id: string): Promise<ProjectTemplateDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getProjectTemplate(id);
      const { rows: tRows } = await pool.query<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        project_type_id: string | null;
        project_type_name: string | null;
        is_protected: boolean;
      }>(
        `SELECT pt.id, pt.key, pt.name, pt.description, pt.project_type_id,
                ty.name AS project_type_name, pt.is_protected
         FROM project_template pt
         LEFT JOIN project_type ty ON ty.id = pt.project_type_id
         WHERE pt.id = $1`,
        [id],
      );
      const t = tRows[0];
      if (!t) return null;
      // parent_id NULLS FIRST so a milestone always precedes its children; then by
      // ordinal so the tree rebuilds in authoring order.
      const { rows: iRows } = await pool.query<{
        id: string;
        parent_id: string | null;
        kind: "milestone" | "step" | "task";
        ordinal: number;
        payload: Record<string, unknown>;
      }>(
        `SELECT id, parent_id, kind, ordinal, payload
         FROM template_item WHERE template_id = $1
         ORDER BY parent_id NULLS FIRST, ordinal`,
        [id],
      );
      const items: TemplateItem[] = iRows.map((r) => {
        const p = r.payload ?? {};
        return {
          id: r.id,
          parentId: r.parent_id,
          kind: r.kind,
          ordinal: Number(r.ordinal),
          title: String((p.title ?? p.name ?? "") as string),
          offsetDays: Number((p.offsetDays ?? 0) as number),
          durationDays: Number((p.durationDays ?? 0) as number),
        };
      });
      return {
        id: t.id,
        key: t.key,
        name: t.name,
        description: t.description,
        projectTypeId: t.project_type_id,
        projectTypeName: t.project_type_name,
        isProtected: t.is_protected,
        items,
      };
    },

    async createProjectTemplate(input: ProjectTemplateInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createProjectTemplate(input);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO project_template (key, name, description, project_type_id, is_protected)
           VALUES ($1, $2, $3, $4, false)
           RETURNING id`,
          [input.key, input.name, nullIfEmpty(input.description), input.projectTypeId],
        );
        const templateId = rows[0].id;
        let mOrd = 0;
        for (const m of input.milestones) {
          const { rows: mRows } = await client.query<{ id: string }>(
            `INSERT INTO template_item (template_id, parent_id, kind, ordinal, payload)
             VALUES ($1, NULL, 'milestone', $2, $3::jsonb) RETURNING id`,
            [
              templateId,
              mOrd++,
              JSON.stringify({ name: m.name, offsetDays: m.offsetDays, durationDays: m.durationDays }),
            ],
          );
          const milestoneId = mRows[0].id;
          let cOrd = 0;
          for (const c of m.items) {
            await client.query(
              `INSERT INTO template_item (template_id, parent_id, kind, ordinal, payload)
               VALUES ($1, $2, $3, $4, $5::jsonb)`,
              [
                templateId,
                milestoneId,
                c.kind,
                cOrd++,
                JSON.stringify({ title: c.title, offsetDays: c.offsetDays, durationDays: c.durationDays }),
              ],
            );
          }
        }
        await client.query("COMMIT");
        return templateId;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async updateProjectTemplate(id: string, input: ProjectTemplateInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateProjectTemplate(id, input);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Patch the header, but only for a non-protected template (the seeded onboarding
        // default delegates to the hard-coded playbook and is uneditable). rowCount 0 →
        // missing or protected → abort.
        const { rowCount } = await client.query(
          `UPDATE project_template
              SET key = $2, name = $3, description = $4, project_type_id = $5
            WHERE id = $1 AND is_protected = false`,
          [id, input.key, input.name, nullIfEmpty(input.description), input.projectTypeId],
        );
        if (!rowCount) throw new Error("Template not found, or it is a protected default.");
        // Re-snapshot the tree: drop the old items, re-insert from input. Apply is a
        // snapshot (ADR-0070), so this never touches already-instantiated projects.
        await client.query(`DELETE FROM template_item WHERE template_id = $1`, [id]);
        let mOrd = 0;
        for (const m of input.milestones) {
          const { rows: mRows } = await client.query<{ id: string }>(
            `INSERT INTO template_item (template_id, parent_id, kind, ordinal, payload)
             VALUES ($1, NULL, 'milestone', $2, $3::jsonb) RETURNING id`,
            [
              id,
              mOrd++,
              JSON.stringify({ name: m.name, offsetDays: m.offsetDays, durationDays: m.durationDays }),
            ],
          );
          const milestoneId = mRows[0].id;
          let cOrd = 0;
          for (const c of m.items) {
            await client.query(
              `INSERT INTO template_item (template_id, parent_id, kind, ordinal, payload)
               VALUES ($1, $2, $3, $4, $5::jsonb)`,
              [
                id,
                milestoneId,
                c.kind,
                cOrd++,
                JSON.stringify({ title: c.title, offsetDays: c.offsetDays, durationDays: c.durationDays }),
              ],
            );
          }
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async deleteProjectTemplate(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteProjectTemplate(id);
      // CASCADE drops template_item rows. A protected (seeded) template is undeletable.
      const { rowCount } = await pool.query(
        `DELETE FROM project_template WHERE id = $1 AND is_protected = false`,
        [id],
      );
      if (!rowCount) throw new Error("Template not found, or it is a protected default.");
    },

    async instantiateProjectTemplate(input: ProjectTemplateInstantiationInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.instantiateProjectTemplate(input);
      const startDate = /^\d{4}-\d{2}-\d{2}$/.test(input.startDate)
        ? input.startDate
        : new Date().toISOString().slice(0, 10);

      const template = await this.getProjectTemplate(input.projectTemplateId);
      if (!template) throw new Error(`Project template ${input.projectTemplateId} not found.`);

      // The protected onboarding default carries no items: create the project, then
      // delegate to the hard-coded playbook (no behaviour change, no drift — ADR-0070
      // E1-F4). Two transactions are fine: the project is committed before the
      // playbook is applied (idempotent), mirroring the onboarding new-project flow.
      if (template.isProtected && template.items.length === 0) {
        const { rows } = await pool.query<{ id: string }>(
          `INSERT INTO project (account_id, name, project_type_id, status, started_at, completed_at)
           VALUES ($1, $2, $3, 'not_started'::project_status, NULL, NULL)
           RETURNING id`,
          [input.accountId, input.name, input.projectTypeId],
        );
        const projectId = rows[0].id;
        await this.applyOnboardingTemplate(projectId, startDate);
        return projectId;
      }

      // Generic template: snapshot the tree onto a new project in one transaction.
      const milestones = template.items.filter((i) => i.kind === "milestone");
      const childrenOf = (mid: string) =>
        template.items.filter((i) => i.parentId === mid).sort((a, b) => a.ordinal - b.ordinal);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows: projRows } = await client.query<{ id: string }>(
          `INSERT INTO project (account_id, name, project_type_id, status, started_at, completed_at)
           VALUES ($1, $2, $3, 'not_started'::project_status, NULL, NULL)
           RETURNING id`,
          [input.accountId, input.name, input.projectTypeId],
        );
        const projectId = projRows[0].id;

        let ordinal = 1;
        for (const m of milestones.sort((a, b) => a.ordinal - b.ordinal)) {
          const mStart = addDays(startDate, m.offsetDays);
          const mDue = addDays(mStart, m.durationDays);
          await client.query(
            `INSERT INTO project_milestone (project_id, name, ordinal, status, health, start_at, due_at)
             VALUES ($1, $2, $3, 'not_started', 'amber', $4::date, $5::date)`,
            [projectId, m.title, ordinal++, mStart, mDue],
          );
          for (const c of childrenOf(m.id)) {
            const due = addDays(mStart, c.offsetDays + c.durationDays);
            await client.query(
              `INSERT INTO task (account_id, project_id, title, status, category, due_at)
               VALUES ($1, $2, $3, 'open', 'project'::task_category, $4::date)`,
              [input.accountId, projectId, c.title, due],
            );
          }
        }
        await client.query("COMMIT");
        return projectId;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    // ── Task checklist templates (ADR-0070 E1-F3, #633) ────────────────────────
    // Reuse the project_template / template_item tables (no migration): a checklist
    // template is a project_template row whose key starts with the checklist prefix,
    // and its items are flat template_item rows (kind='task', parent_id NULL).
    async listChecklistTemplates(): Promise<ChecklistTemplateRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listChecklistTemplates();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          description: string | null;
          item_count: string;
        }>(
          `SELECT pt.id, pt.name, pt.description,
                  count(ti.id) AS item_count
           FROM project_template pt
           LEFT JOIN template_item ti ON ti.template_id = pt.id
           WHERE pt.key LIKE $1
           GROUP BY pt.id
           ORDER BY pt.name`,
          [`${CHECKLIST_TEMPLATE_KEY_PREFIX}%`],
        );
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          itemCount: Number(r.item_count),
        }));
      } catch {
        return mockRepositories.crm.listChecklistTemplates();
      }
    },

    async getChecklistTemplate(id: string): Promise<ChecklistTemplateDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getChecklistTemplate(id);
      // Only resolve rows that are actually checklist templates (key prefix).
      const { rows: tRows } = await pool.query<{
        id: string;
        name: string;
        description: string | null;
      }>(
        `SELECT id, name, description FROM project_template
         WHERE id = $1 AND key LIKE $2`,
        [id, `${CHECKLIST_TEMPLATE_KEY_PREFIX}%`],
      );
      const t = tRows[0];
      if (!t) return null;
      const { rows: iRows } = await pool.query<{ payload: Record<string, unknown> }>(
        `SELECT payload FROM template_item WHERE template_id = $1 ORDER BY ordinal`,
        [id],
      );
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        items: iRows.map((r) => String((r.payload?.title ?? "") as string)).filter(Boolean),
      };
    },

    async createChecklistTemplate(input: ChecklistTemplateInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createChecklistTemplate(input);
      const items = input.items.map((s) => s.trim()).filter(Boolean);
      // A unique, prefixed key (the table enforces UNIQUE) — slug + timestamp suffix
      // so two templates with the same name never collide.
      const slug = input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      const key = `${CHECKLIST_TEMPLATE_KEY_PREFIX}${slug || "checklist"}_${Date.now().toString(36)}`;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO project_template (key, name, description, project_type_id, is_protected)
           VALUES ($1, $2, $3, NULL, false)
           RETURNING id`,
          [key, input.name, nullIfEmpty(input.description)],
        );
        const templateId = rows[0].id;
        let ord = 0;
        for (const title of items) {
          await client.query(
            `INSERT INTO template_item (template_id, parent_id, kind, ordinal, payload)
             VALUES ($1, NULL, 'task', $2, $3::jsonb)`,
            [templateId, ord++, JSON.stringify({ title })],
          );
        }
        await client.query("COMMIT");
        return templateId;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async deleteChecklistTemplate(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteChecklistTemplate(id);
      // CASCADE drops template_item rows. The key-prefix guard prevents deleting a
      // project playbook through this path.
      const { rowCount } = await pool.query(
        `DELETE FROM project_template WHERE id = $1 AND key LIKE $2`,
        [id, `${CHECKLIST_TEMPLATE_KEY_PREFIX}%`],
      );
      if (!rowCount) throw new Error("Checklist template not found.");
    },

    async applyChecklistTemplateToTask(input: ApplyChecklistTemplateInput): Promise<number> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.applyChecklistTemplateToTask(input);
      const template = await this.getChecklistTemplate(input.checklistTemplateId);
      if (!template || template.items.length === 0) return 0;
      // The subtasks inherit the parent task's account/project/category so they live
      // in the same context (mirrors addSubtaskAction). Missing parent → no-op.
      const parent = await this.getTask(input.taskId);
      if (!parent) return 0;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        let created = 0;
        for (const title of template.items) {
          // ordinal = end of the parent's existing children (matches createTask).
          await client.query(
            `INSERT INTO task (account_id, title, status, category, project_id, parent_task_id, ordinal)
             VALUES ($1, $2, 'open', $3::task_category, $4, $5,
                     COALESCE((SELECT max(ordinal) + 1 FROM task WHERE parent_task_id = $5), 0))`,
            [parent.accountId, title, parent.category, parent.projectId, input.taskId],
          );
          created++;
        }
        await client.query("COMMIT");
        return created;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    // ── Intake forms (ADR-0070 E3, migration 0111, #354) ───────────────────────
    async listIntakeForms(): Promise<IntakeFormRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listIntakeForms();
      const { rows } = await pool.query<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        default_project_name: string | null;
        default_category: string;
        is_active: boolean;
        field_count: string;
        submission_count: string;
      }>(
        `SELECT f.id, f.key, f.name, f.description,
                p.name AS default_project_name, f.default_category, f.is_active,
                jsonb_array_length(f.fields) AS field_count,
                (SELECT count(*) FROM intake_submission s WHERE s.form_id = f.id) AS submission_count
         FROM intake_form f
         LEFT JOIN project p ON p.id = f.default_project_id
         ORDER BY f.is_active DESC, f.name`,
      );
      return rows.map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        description: r.description,
        defaultProjectName: r.default_project_name,
        defaultCategory: r.default_category,
        isActive: r.is_active,
        fieldCount: Number(r.field_count),
        submissionCount: Number(r.submission_count),
      }));
    },

    async getIntakeForm(id: string): Promise<IntakeFormDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getIntakeForm(id);
      const { rows } = await pool.query<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        fields: IntakeFormField[];
        default_project_id: string | null;
        default_account_id: string | null;
        default_owner_user_id: string | null;
        default_category: string;
        is_active: boolean;
        default_project_name: string | null;
        default_account_name: string | null;
        default_owner_name: string | null;
      }>(
        `SELECT f.id, f.key, f.name, f.description, f.fields,
                f.default_project_id, f.default_account_id, f.default_owner_user_id,
                f.default_category, f.is_active,
                p.name AS default_project_name, a.name AS default_account_name,
                u.display_name AS default_owner_name
         FROM intake_form f
         LEFT JOIN project p ON p.id = f.default_project_id
         LEFT JOIN account a ON a.id = f.default_account_id
         LEFT JOIN app_user u ON u.id = f.default_owner_user_id
         WHERE f.id = $1`,
        [id],
      );
      const f = rows[0];
      if (!f) return null;
      return {
        id: f.id,
        key: f.key,
        name: f.name,
        description: f.description,
        fields: Array.isArray(f.fields) ? f.fields : [],
        defaultProjectId: f.default_project_id,
        defaultAccountId: f.default_account_id,
        defaultOwnerUserId: f.default_owner_user_id,
        defaultCategory: f.default_category,
        isActive: f.is_active,
        defaultProjectName: f.default_project_name,
        defaultAccountName: f.default_account_name,
        defaultOwnerName: f.default_owner_name,
      };
    },

    async createIntakeForm(input: IntakeFormInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createIntakeForm(input);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO intake_form
           (key, name, description, fields, default_project_id, default_account_id,
            default_owner_user_id, default_category, is_active)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          input.key,
          input.name,
          nullIfEmpty(input.description),
          JSON.stringify(input.fields ?? []),
          nullIfEmpty(input.defaultProjectId),
          nullIfEmpty(input.defaultAccountId),
          nullIfEmpty(input.defaultOwnerUserId),
          input.defaultCategory,
          input.isActive,
        ],
      );
      return rows[0].id;
    },

    async updateIntakeForm(id: string, input: IntakeFormInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateIntakeForm(id, input);
      // Patch the existing row IN PLACE (ADR-0070 E3, #639): the id and `key` are
      // deliberately NOT touched, so the stable key and submission history
      // (intake_submission.form_id) survive the edit. rowCount 0 → missing → throw.
      const { rowCount } = await pool.query(
        `UPDATE intake_form
            SET name = $2, description = $3, fields = $4::jsonb,
                default_project_id = $5, default_account_id = $6,
                default_owner_user_id = $7, default_category = $8, is_active = $9
          WHERE id = $1`,
        [
          id,
          input.name,
          nullIfEmpty(input.description),
          JSON.stringify(input.fields ?? []),
          nullIfEmpty(input.defaultProjectId),
          nullIfEmpty(input.defaultAccountId),
          nullIfEmpty(input.defaultOwnerUserId),
          input.defaultCategory,
          input.isActive,
        ],
      );
      if (!rowCount) throw new Error("Intake form not found.");
    },

    async deleteIntakeForm(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteIntakeForm(id);
      // CASCADE drops intake_submission rows.
      await pool.query(`DELETE FROM intake_form WHERE id = $1`, [id]);
    },

    async submitIntakeForm(
      formId: string,
      payload: Record<string, string>,
      submittedBy: string | null,
    ): Promise<IntakeSubmitResult> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.submitIntakeForm(formId, payload, submittedBy);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Authoritative defaults + field maps come from the row, never the caller.
        const { rows: fRows } = await client.query<{
          name: string;
          fields: IntakeFormField[];
          default_project_id: string | null;
          default_account_id: string | null;
          default_owner_user_id: string | null;
          default_category: string;
        }>(
          `SELECT name, fields, default_project_id, default_account_id,
                  default_owner_user_id, default_category
           FROM intake_form WHERE id = $1`,
          [formId],
        );
        const form = fRows[0];
        if (!form) throw new Error(`Intake form ${formId} not found.`);

        // Map each answered field onto a task field per its mapsTo (ADR-0070 E3, #638).
        const fields = Array.isArray(form.fields) ? form.fields : [];
        let title = "";
        const detailParts: string[] = [];
        let dueAt: string | null = null;
        let assigneeId: string | null = null;
        // custom:<cf_key> field answers, collected here and written after the task
        // INSERT (they need the new task id). cfKey → the raw answer string.
        const customAnswers: { cfKey: string; raw: string }[] = [];
        for (const fld of fields) {
          const v = String(payload[fld.key] ?? "").trim();
          if (!v) continue;
          const mapsTo = fld.mapsTo;
          if (typeof mapsTo === "string" && mapsTo.startsWith(INTAKE_CUSTOM_MAP_PREFIX)) {
            customAnswers.push({ cfKey: mapsTo.slice(INTAKE_CUSTOM_MAP_PREFIX.length), raw: v });
            continue;
          }
          switch (mapsTo) {
            case "title":
              if (!title) title = v;
              break;
            case "detail":
              detailParts.push(v);
              break;
            case "note":
              detailParts.push(`${fld.label}: ${v}`);
              break;
            case "due_at":
              if (!dueAt && /^\d{4}-\d{2}-\d{2}$/.test(v)) dueAt = v;
              break;
            case "assignee":
              // First answered assignee field wins; it is an app_user id (the picker's
              // value). The DB FK rejects a bogus id, rolling back the whole submit.
              if (!assigneeId) assigneeId = v;
              break;
          }
        }
        // A task needs a title; fall back to the form name when none is mapped/filled.
        if (!title) title = form.name;
        const detail = detailParts.length ? detailParts.join("\n\n") : null;
        // The assignee field (when answered) overrides the form's default owner.
        const ownerUserId = assigneeId ?? form.default_owner_user_id;

        const { rows: tRows } = await client.query<{ id: string }>(
          `INSERT INTO task
             (account_id, title, detail, status, category, due_at, project_id, owner_user_id, ordinal)
           VALUES ($1, $2, $3, 'open', $4::task_category, $5::timestamptz, $6, $7, 0)
           RETURNING id`,
          [
            form.default_account_id,
            title,
            detail,
            form.default_category,
            dueAt,
            form.default_project_id,
            ownerUserId,
          ],
        );
        const taskId = tRows[0].id;

        // Custom-field answers (#638): resolve each chosen cf_key to its task-scoped
        // custom_field_def, coerce the raw answer to the field's type, and upsert the
        // value — all in this transaction so a write failure rolls back the task too.
        if (customAnswers.length > 0) {
          const keys = [...new Set(customAnswers.map((c) => c.cfKey))];
          const { rows: defRows } = await client.query<{
            id: string;
            key: string;
            field_type: string;
          }>(
            `SELECT id, key, field_type
               FROM custom_field_def
              WHERE scope = 'task'
                AND project_type_id IS NULL
                AND key = ANY($1::text[])`,
            [keys],
          );
          const defByKey = new Map(defRows.map((d) => [d.key, d]));
          for (const { cfKey, raw } of customAnswers) {
            const def = defByKey.get(cfKey);
            if (!def) continue; // unmatched/removed custom field → ignore
            const encoded = encodeIntakeCustomValue(def.field_type as CustomFieldType, raw);
            if (encoded === null) continue; // empty after coercion → no-op
            await client.query(
              `INSERT INTO custom_field_value (field_id, parent_type, parent_id, value)
               VALUES ($1::uuid, 'task', $2::uuid, $3::jsonb)
               ON CONFLICT (field_id, parent_type, parent_id)
                 DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
              [def.id, taskId, JSON.stringify(encoded)],
            );
          }
        }

        const { rows: sRows } = await client.query<{ id: string }>(
          `INSERT INTO intake_submission (form_id, payload, created_task_id, submitted_by)
           VALUES ($1, $2::jsonb, $3, $4)
           RETURNING id`,
          [formId, JSON.stringify(payload ?? {}), taskId, nullIfEmpty(submittedBy)],
        );
        await client.query("COMMIT");
        return { taskId, submissionId: sRows[0].id };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async listIntakeSubmissions(formId: string): Promise<IntakeSubmissionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listIntakeSubmissions(formId);
      const { rows } = await pool.query<{
        id: string;
        created_at: Date | null;
        created_task_id: string | null;
        task_title: string | null;
        submitted_by_name: string | null;
      }>(
        `SELECT s.id, s.created_at, s.created_task_id,
                t.title AS task_title, u.display_name AS submitted_by_name
         FROM intake_submission s
         LEFT JOIN task t ON t.id = s.created_task_id
         LEFT JOIN app_user u ON u.id = s.submitted_by
         WHERE s.form_id = $1
         ORDER BY s.created_at DESC`,
        [formId],
      );
      return rows.map((r) => ({
        id: r.id,
        createdAt: r.created_at ? r.created_at.toISOString() : null,
        createdTaskId: r.created_task_id,
        taskTitle: r.task_title,
        submittedBy: r.submitted_by_name,
      }));
    },

    async listProvisionedProjects(): Promise<DeliveryBoardProject[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listProvisionedProjects();
      try {
        // One read: provisioning ⋈ project ⋈ account ⋈ template, plus every
        // dispatching task's fire sidecar. We join task_ticket_fire (only
        // dispatching tasks have a row) so the board shows exactly the steerable
        // tasks; a project with no dispatching task still appears (LEFT JOIN).
        const { rows } = await pool.query<{
          project_id: string;
          name: string;
          account: string;
          provision_state: string;
          contract_state: string;
          autotask_project_id: string | null;
          template_name: string | null;
          proj_last_error: string | null;
          provisioned_created_at: Date;
          task_id: string | null;
          task_title: string | null;
          task_due_at: Date | null;
          fire_state: string | null;
          scheduled_for: Date | null;
          autotask_queue_id: string | null;
          autotask_ticket_id: string | null;
          task_last_error: string | null;
        }>(
          `SELECT pp.project_id, pr.name, a.name AS account,
                  pp.provision_state, pp.contract_state,
                  pp.autotask_project_id, dt.name AS template_name,
                  pp.last_error AS proj_last_error, pp.created_at AS provisioned_created_at,
                  t.id AS task_id, t.title AS task_title, t.due_at AS task_due_at,
                  ttf.fire_state, ttf.scheduled_for, ttf.autotask_queue_id,
                  ttf.autotask_ticket_id, ttf.last_error AS task_last_error
           FROM project_provisioning pp
           JOIN project pr ON pr.id = pp.project_id
           JOIN account a ON a.id = pr.account_id
           LEFT JOIN delivery_template dt ON dt.id = pp.delivery_template_id
           LEFT JOIN task_ticket_fire ttf ON ttf.task_id IN (
             SELECT id FROM task WHERE project_id = pp.project_id
           )
           LEFT JOIN task t ON t.id = ttf.task_id
           ORDER BY pp.created_at DESC, pr.name, t.due_at NULLS LAST`,
        );
        // Fold the flat join into one entry per project with its tasks.
        const byProject = new Map<string, DeliveryBoardProject>();
        for (const r of rows) {
          let proj = byProject.get(r.project_id);
          if (!proj) {
            proj = {
              projectId: r.project_id,
              name: r.name,
              account: r.account,
              provisionState: r.provision_state,
              contractState: r.contract_state,
              autotaskProjectId: r.autotask_project_id == null ? null : Number(r.autotask_project_id),
              deliveryTemplateName: r.template_name,
              lastError: r.proj_last_error,
              tasks: [],
            };
            byProject.set(r.project_id, proj);
          }
          if (r.task_id) {
            proj.tasks.push({
              taskId: r.task_id,
              title: r.task_title ?? "",
              dueAt: fmtDate(r.task_due_at),
              fire: {
                fireState: (r.fire_state ?? "none") as TaskFireState,
                scheduledFor: fmtDateTime(r.scheduled_for),
                autotaskQueueId: r.autotask_queue_id == null ? null : Number(r.autotask_queue_id),
                autotaskTicketId: r.autotask_ticket_id == null ? null : Number(r.autotask_ticket_id),
                lastError: r.task_last_error,
              },
            });
          }
        }
        return [...byProject.values()];
      } catch {
        return mockRepositories.crm.listProvisionedProjects();
      }
    },

    async scheduleTaskFire(taskId: string, scheduledFor: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.scheduleTaskFire(taskId, scheduledFor);
      // The ONLY mutation the web makes to a fire row (ADR-0042): set the intent.
      // Guarded in SQL — a 'fired' row is never re-scheduled (idempotent retry of
      // 'failed' is allowed). The executor reads 'scheduled' rows whose window has
      // arrived; "fire now" is this with scheduled_for = now.
      await pool.query(
        `UPDATE task_ticket_fire
            SET fire_state = 'scheduled', scheduled_for = $2::timestamptz
          WHERE task_id = $1 AND fire_state <> 'fired'`,
        [taskId, scheduledFor],
      );
    },

    // ── Time tracking (ADR-0082, migrations 0085–0087) ───────────────────────
    async listTimesheets(opts): Promise<TimesheetRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listTimesheets(opts);
      try {
        const { rows } = await pool.query<{
          id: string;
          app_user_id: string;
          week_start: string;
          week_end: string;
          state: string;
          attested_at: Date | null;
          entry_count: string;
          total_minutes: string;
        }>(
          `SELECT t.id, t.app_user_id,
                  to_char(t.week_start, 'YYYY-MM-DD') AS week_start,
                  to_char(t.week_end,   'YYYY-MM-DD') AS week_end,
                  t.state, t.attested_at,
                  count(w.id) AS entry_count,
                  COALESCE(SUM(EXTRACT(EPOCH FROM (w.ended_at - w.started_at)) / 60), 0)::int AS total_minutes
           FROM timesheet t
           LEFT JOIN website_time_entry w ON w.timesheet_id = t.id
           WHERE t.app_user_id = $1
           GROUP BY t.id
           ORDER BY t.week_start DESC`,
          [opts.employeeId],
        );
        return rows.map((r) => ({
          id: r.id,
          employeeId: r.app_user_id,
          weekStart: r.week_start,
          weekEnd: r.week_end,
          state: r.state as TimesheetRow["state"],
          entryCount: Number(r.entry_count),
          totalMinutes: Number(r.total_minutes),
          attestedAt: r.attested_at ? new Date(r.attested_at).toISOString() : null,
        }));
      } catch {
        return mockRepositories.crm.listTimesheets(opts);
      }
    },

    async getTimesheetForWeek(employeeId, weekStart): Promise<TimesheetDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getTimesheetForWeek(employeeId, weekStart);
      const { rows: tRows } = await pool.query<{
        id: string;
        app_user_id: string;
        week_start: string;
        week_end: string;
        state: string;
        attested_at: Date | null;
      }>(
        `SELECT id, app_user_id,
                to_char(week_start, 'YYYY-MM-DD') AS week_start,
                to_char(week_end,   'YYYY-MM-DD') AS week_end,
                state, attested_at
         FROM timesheet WHERE app_user_id = $1 AND week_start = $2`,
        [employeeId, weekStart],
      );
      const t = tRows[0];
      if (!t) return null;
      return assembleTimesheetDetail(pool, t);
    },

    async ensureTimesheetForWeek(employeeId, weekStart): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.ensureTimesheetForWeek(employeeId, weekStart);
      // Idempotent on UNIQUE (app_user_id, week_start); the no-op UPDATE lets us
      // RETURNING the id whether the row was inserted or already existed.
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO timesheet (app_user_id, week_start, week_end)
         VALUES ($1, $2, $2::date + 6)
         ON CONFLICT (app_user_id, week_start)
           DO UPDATE SET week_end = timesheet.week_end
         RETURNING id`,
        [employeeId, weekStart],
      );
      return rows[0].id;
    },

    async addTimeEntry(input: TimeEntryInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.addTimeEntry(input);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO website_time_entry
           (timesheet_id, app_user_id, work_date, started_at, ended_at, category, ancillary_ticket_ref, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          input.timesheetId,
          input.employeeId,
          input.workDate,
          input.startedAt,
          input.endedAt,
          input.category,
          nullIfEmpty(input.ancillaryTicketRef),
          nullIfEmpty(input.notes),
        ],
      );
      return rows[0].id;
    },

    async updateTimeEntry(id: string, input: TimeEntryInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateTimeEntry(id, input);
      await pool.query(
        `UPDATE website_time_entry
            SET work_date = $2, started_at = $3, ended_at = $4, category = $5,
                ancillary_ticket_ref = $6, notes = $7
          WHERE id = $1`,
        [
          id,
          input.workDate,
          input.startedAt,
          input.endedAt,
          input.category,
          nullIfEmpty(input.ancillaryTicketRef),
          nullIfEmpty(input.notes),
        ],
      );
    },

    async deleteTimeEntry(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteTimeEntry(id);
      await pool.query(`DELETE FROM website_time_entry WHERE id = $1`, [id]);
    },

    async submitTimesheet(id: string, attestedBy: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.submitTimesheet(id, attestedBy);
      // Attest: only an Open sheet → Submitted; snapshot the attested entries for
      // audit (preserved even when an admin later corrects). Atomic single statement.
      await pool.query(
        `UPDATE timesheet t
            SET state = 'submitted', attested_at = now(), attested_by = $2,
                attested_snapshot = (
                  SELECT COALESCE(jsonb_agg(to_jsonb(w) ORDER BY w.started_at), '[]'::jsonb)
                  FROM website_time_entry w WHERE w.timesheet_id = t.id
                )
          WHERE t.id = $1 AND t.state = 'open'`,
        [id, attestedBy],
      );
    },

    async listSubmittedTimesheets(): Promise<TimesheetReviewRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listSubmittedTimesheets();
      try {
        const { rows } = await pool.query<{
          id: string;
          app_user_id: string;
          employee_name: string | null;
          week_start: string;
          week_end: string;
          state: string;
          attested_at: Date | null;
          entry_count: string;
          total_minutes: string;
        }>(
          `SELECT t.id, t.app_user_id,
                  COALESCE(u.display_name, u.email) AS employee_name,
                  to_char(t.week_start, 'YYYY-MM-DD') AS week_start,
                  to_char(t.week_end,   'YYYY-MM-DD') AS week_end,
                  t.state, t.attested_at,
                  count(w.id) AS entry_count,
                  COALESCE(SUM(EXTRACT(EPOCH FROM (w.ended_at - w.started_at)) / 60), 0)::int AS total_minutes
           FROM timesheet t
           JOIN app_user u ON u.id = t.app_user_id
           LEFT JOIN website_time_entry w ON w.timesheet_id = t.id
           WHERE t.state = 'submitted'
           GROUP BY t.id, u.display_name, u.email
           ORDER BY t.attested_at NULLS LAST, week_start`,
        );
        return rows.map((r) => ({
          id: r.id,
          employeeId: r.app_user_id,
          employeeName: r.employee_name ?? "—",
          weekStart: r.week_start,
          weekEnd: r.week_end,
          state: r.state as TimesheetRow["state"],
          entryCount: Number(r.entry_count),
          totalMinutes: Number(r.total_minutes),
          attestedAt: r.attested_at ? new Date(r.attested_at).toISOString() : null,
        }));
      } catch {
        return mockRepositories.crm.listSubmittedTimesheets();
      }
    },

    async listAllTimesheets(): Promise<AdminTimesheetRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listAllTimesheets();
      try {
        // Unified lifecycle feed (#539): every sheet, every state. Base = the timesheet
        // table joined to its attendance entries (count + minutes); LEFT JOIN the comp-free
        // payroll view (0087) for approved minutes + the payment fact (NULL for open/submitted
        // sheets the view doesn't carry). NO Pay Rate / expected pay — that math is backend-only.
        const { rows } = await pool.query<{
          id: string;
          app_user_id: string;
          employee_name: string | null;
          week_start: string;
          week_end: string;
          state: string;
          attested_at: Date | null;
          entry_count: string;
          attended_minutes: string;
          approved_minutes: string | null;
          payroll_approved_at: Date | null;
          paid_at: Date | null;
          qb_payment_ref: string | null;
        }>(
          `SELECT t.id, t.app_user_id,
                  COALESCE(u.display_name, u.email) AS employee_name,
                  to_char(t.week_start, 'YYYY-MM-DD') AS week_start,
                  to_char(t.week_end,   'YYYY-MM-DD') AS week_end,
                  t.state, t.attested_at,
                  count(w.id) AS entry_count,
                  COALESCE(SUM(EXTRACT(EPOCH FROM (w.ended_at - w.started_at)) / 60), 0)::int AS attended_minutes,
                  p.approved_minutes, p.payroll_approved_at, p.paid_at, p.qb_payment_ref
           FROM timesheet t
           JOIN app_user u ON u.id = t.app_user_id
           LEFT JOIN website_time_entry w ON w.timesheet_id = t.id
           LEFT JOIN timesheet_payroll_status p ON p.timesheet_id = t.id
           GROUP BY t.id, u.display_name, u.email,
                    p.approved_minutes, p.payroll_approved_at, p.paid_at, p.qb_payment_ref
           ORDER BY t.week_start DESC, employee_name`,
        );
        return rows.map((r) => ({
          id: r.id,
          employeeId: r.app_user_id,
          employeeName: r.employee_name ?? "—",
          weekStart: r.week_start,
          weekEnd: r.week_end,
          state: r.state as AdminTimesheetRow["state"],
          entryCount: Number(r.entry_count),
          attendedMinutes: Number(r.attended_minutes),
          approvedMinutes: Number(r.approved_minutes ?? 0),
          attestedAt: r.attested_at ? new Date(r.attested_at).toISOString() : null,
          payrollApprovedAt: r.payroll_approved_at
            ? new Date(r.payroll_approved_at).toISOString()
            : null,
          paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
          qbPaymentRef: r.qb_payment_ref,
        }));
      } catch {
        return mockRepositories.crm.listAllTimesheets();
      }
    },

    async approveTimesheet(id: string, approvedBy: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.approveTimesheet(id, approvedBy);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Only a Submitted sheet → Approved; stamp the admin approver.
        const { rowCount } = await client.query(
          `UPDATE timesheet SET state = 'approved', approved_at = now(), approved_by = $2
           WHERE id = $1 AND state = 'submitted'`,
          [id, approvedBy],
        );
        // Create the pending Time Ticket tracking row the backend writer consumes
        // (idempotent on the timesheet — re-approval reuses the same row/external_ref).
        if (rowCount && rowCount > 0) {
          await client.query(
            `INSERT INTO time_ticket (timesheet_id, app_user_id, week_start, idempotency_key)
             SELECT t.id, t.app_user_id, t.week_start, 'imperioncrm-timeticket-' || t.id
             FROM timesheet t WHERE t.id = $1
             ON CONFLICT (timesheet_id) DO NOTHING`,
            [id],
          );
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async reopenTimesheet(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.reopenTimesheet(id);
      // Back to the employee for correction — re-attest required. Keep the attested
      // snapshot for the audit/diff.
      await pool.query(
        `UPDATE timesheet
            SET state = 'open', attested_at = NULL, attested_by = NULL,
                approved_at = NULL, approved_by = NULL
          WHERE id = $1 AND state IN ('submitted', 'approved')`,
        [id],
      );
      // Re-queue an already-documented week so the corrected hours reach Autotask:
      // reset a WRITTEN time_ticket back to 'pending' but KEEP external_ref, so the
      // backend writer PATCHes the same ticket on re-approval instead of leaving a
      // stale summary (no duplicate). Backend issue #103 / ADR-0047; the writer's
      // ON CONFLICT DO NOTHING insert means this reset, not re-approval, re-queues it.
      await pool.query(
        `UPDATE time_ticket
            SET write_state = 'pending', last_error = NULL
          WHERE timesheet_id = $1 AND write_state = 'written'`,
        [id],
      );
    },

    async getTimesheetById(id: string): Promise<AdminTimesheetReview | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getTimesheetById(id);
      const { rows: tRows } = await pool.query<{
        id: string;
        app_user_id: string;
        week_start: string;
        week_end: string;
        state: string;
        attested_at: Date | null;
        attested_snapshot: Array<Record<string, unknown>> | null;
      }>(
        `SELECT id, app_user_id,
                to_char(week_start, 'YYYY-MM-DD') AS week_start,
                to_char(week_end,   'YYYY-MM-DD') AS week_end,
                state, attested_at, attested_snapshot
         FROM timesheet WHERE id = $1`,
        [id],
      );
      const t = tRows[0];
      if (!t) return null;
      const detail = await assembleTimesheetDetail(pool, t);
      // The attested original (raw website_time_entry rows captured at submit), normalized
      // to the same TimeEntryRow shape so the #477 diff compares like-for-like. Immutable —
      // we only ever read it here.
      const attestedSnapshot: TimeEntryRow[] | null = Array.isArray(t.attested_snapshot)
        ? t.attested_snapshot.map((s) => {
            const startedAt = new Date(String(s.started_at)).toISOString();
            const endedAt = new Date(String(s.ended_at)).toISOString();
            return {
              id: String(s.id),
              workDate: String(s.work_date).slice(0, 10),
              startedAt,
              endedAt,
              minutes: Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60000),
              category: s.category as TimeEntryRow["category"],
              ancillaryTicketRef: (s.ancillary_ticket_ref as string | null) ?? null,
              notes: (s.notes as string | null) ?? null,
            };
          })
        : null;
      return { ...detail, attestedSnapshot };
    },

    async correctSubmittedTimesheet(
      timesheetId: string,
      op: TimesheetCorrection,
      correctedBy: string,
    ): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.correctSubmittedTimesheet(timesheetId, op, correctedBy);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Lock the sheet and confirm it's still Submitted — corrections are only valid
        // in that window. The owner (app_user_id) comes from the sheet, never the caller.
        const { rows: tRows } = await client.query<{ state: string; app_user_id: string }>(
          `SELECT state, app_user_id FROM timesheet WHERE id = $1 FOR UPDATE`,
          [timesheetId],
        );
        const sheet = tRows[0];
        if (!sheet || sheet.state !== "submitted") {
          await client.query("ROLLBACK");
          return false;
        }

        // Capture the before-image for edit/delete (must belong to THIS sheet).
        let before: Record<string, unknown> | null = null;
        if (op.kind !== "add") {
          const { rows: eRows } = await client.query<Record<string, unknown>>(
            `SELECT id, to_char(work_date, 'YYYY-MM-DD') AS work_date, started_at, ended_at,
                    category, ancillary_ticket_ref, notes
             FROM website_time_entry WHERE id = $1 AND timesheet_id = $2`,
            [op.entryId, timesheetId],
          );
          if (!eRows[0]) {
            await client.query("ROLLBACK");
            return false;
          }
          before = eRows[0];
        }

        let entryId: string | null = op.kind === "add" ? null : op.entryId;
        let after: Record<string, unknown> | null = null;
        if (op.kind === "add") {
          const { rows } = await client.query<{ id: string }>(
            `INSERT INTO website_time_entry
               (timesheet_id, app_user_id, work_date, started_at, ended_at, category, ancillary_ticket_ref, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
              timesheetId,
              sheet.app_user_id,
              op.entry.workDate,
              op.entry.startedAt,
              op.entry.endedAt,
              op.entry.category,
              nullIfEmpty(op.entry.ancillaryTicketRef),
              nullIfEmpty(op.entry.notes),
            ],
          );
          entryId = rows[0].id;
          after = { ...op.entry };
        } else if (op.kind === "update") {
          await client.query(
            `UPDATE website_time_entry
                SET work_date = $3, started_at = $4, ended_at = $5, category = $6,
                    ancillary_ticket_ref = $7, notes = $8
              WHERE id = $1 AND timesheet_id = $2`,
            [
              op.entryId,
              timesheetId,
              op.entry.workDate,
              op.entry.startedAt,
              op.entry.endedAt,
              op.entry.category,
              nullIfEmpty(op.entry.ancillaryTicketRef),
              nullIfEmpty(op.entry.notes),
            ],
          );
          after = { ...op.entry };
        } else {
          await client.query(
            `DELETE FROM website_time_entry WHERE id = $1 AND timesheet_id = $2`,
            [op.entryId, timesheetId],
          );
        }

        // Audit the correction against the attested original (who/when/before→after).
        // The attested_snapshot itself is never touched — it stays the immutable baseline.
        await client.query(
          `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, detail)
           VALUES ($1, 'timesheet.corrected', 'timesheet', $2,
                   jsonb_build_object('op', $3::text, 'entryId', $4::text,
                                      'before', $5::jsonb, 'after', $6::jsonb))`,
          [
            correctedBy,
            timesheetId,
            op.kind,
            entryId,
            before ? JSON.stringify(before) : null,
            after ? JSON.stringify(after) : null,
          ],
        );
        await client.query("COMMIT");
        return true;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async listPayrollTimesheets(): Promise<PayrollTimesheetRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listPayrollTimesheets();
      try {
        // Read the comp-free payroll view (0087) joined to the employee name. The view
        // carries approved attendance minutes, lifecycle state, and the matched QB payment
        // fact — NO Pay Rate / expected pay (that math lives in the backend alone, ADR-0082).
        const { rows } = await pool.query<{
          timesheet_id: string;
          app_user_id: string;
          employee_name: string | null;
          week_start: string;
          week_end: string;
          state: string;
          approved_minutes: string;
          payroll_approved_at: Date | null;
          paid_at: Date | null;
          qb_payment_ref: string | null;
        }>(
          `SELECT p.timesheet_id, p.app_user_id,
                  COALESCE(u.display_name, u.email) AS employee_name,
                  to_char(p.week_start, 'YYYY-MM-DD') AS week_start,
                  to_char(p.week_end,   'YYYY-MM-DD') AS week_end,
                  p.state, p.approved_minutes,
                  p.payroll_approved_at, p.paid_at, p.qb_payment_ref
           FROM timesheet_payroll_status p
           JOIN app_user u ON u.id = p.app_user_id
           WHERE p.state IN ('approved', 'payroll_approved', 'paid')
           ORDER BY p.state, p.week_start DESC, employee_name`,
        );
        return rows.map((r) => ({
          id: r.timesheet_id,
          employeeId: r.app_user_id,
          employeeName: r.employee_name ?? "—",
          weekStart: r.week_start,
          weekEnd: r.week_end,
          state: r.state as PayrollTimesheetRow["state"],
          approvedMinutes: Number(r.approved_minutes),
          payrollApprovedAt: r.payroll_approved_at
            ? new Date(r.payroll_approved_at).toISOString()
            : null,
          paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
          qbPaymentRef: r.qb_payment_ref,
        }));
      } catch {
        return mockRepositories.crm.listPayrollTimesheets();
      }
    },

    async payrollApproveTimesheet(id: string, approvedBy: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.payrollApproveTimesheet(id, approvedBy);
      // CFO payroll approval: only an Approved sheet → Payroll-Approved; stamp the approver.
      // Authorizes payment — the app never pays. Idempotent (a non-Approved sheet is untouched).
      await pool.query(
        `UPDATE timesheet
            SET state = 'payroll_approved', payroll_approved_at = now(), payroll_approved_by = $2
          WHERE id = $1 AND state = 'approved'`,
        [id, approvedBy],
      );
    },

    async unapprovePayrollTimesheet(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.unapprovePayrollTimesheet(id);
      // CFO undo before payment: Payroll-Approved → Approved; clear the payroll stamps.
      // A Paid sheet never reverts here (terminal); only payroll_approved moves.
      await pool.query(
        `UPDATE timesheet
            SET state = 'approved', payroll_approved_at = NULL, payroll_approved_by = NULL
          WHERE id = $1 AND state = 'payroll_approved'`,
        [id],
      );
    },

    async markTimesheetPaid(id: string, qbPaymentRef: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.markTimesheetPaid(id, qbPaymentRef);
      // Confirm the backend-suggested QuickBooks match: Payroll-Approved → Paid, recording
      // the matched payment ref. Only a payroll_approved sheet moves; idempotent. This records
      // the CFO's confirmation of the match — the comp math stays in the backend (ADR-0082).
      await pool.query(
        `UPDATE timesheet
            SET state = 'paid', paid_at = now(), qb_payment_ref = $2
          WHERE id = $1 AND state = 'payroll_approved'`,
        [id, qbPaymentRef],
      );
    },

    async listEmployeeMappings(): Promise<EmployeeMappingRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listEmployeeMappings();
      try {
        // Every active employee, left-joined to its mapping sidecar — rows with no
        // employee_profile yet still appear (unconfirmed) so the admin can confirm
        // them. Mapping cols + audit only; classification/pay_rate are NOT selected.
        const { rows } = await pool.query<{
          app_user_id: string;
          display_name: string | null;
          email: string;
          autotask_resource_id: string | null;
          quickbooks_vendor_id: string | null;
          mileiq_user_id: string | null;
          resolved_at: Date | null;
          confirmed_by_name: string | null;
        }>(
          `SELECT u.id AS app_user_id,
                  u.display_name, u.email,
                  ep.autotask_resource_id, ep.quickbooks_vendor_id, ep.mileiq_user_id,
                  ep.mappings_resolved_at AS resolved_at,
                  COALESCE(cb.display_name, cb.email) AS confirmed_by_name
           FROM app_user u
           LEFT JOIN employee_profile ep ON ep.app_user_id = u.id
           LEFT JOIN app_user cb ON cb.id = ep.mappings_confirmed_by
           ORDER BY COALESCE(u.display_name, u.email)`,
        );
        return rows.map((r) => ({
          appUserId: r.app_user_id,
          displayName: r.display_name ?? r.email,
          email: r.email,
          autotaskResourceId:
            r.autotask_resource_id != null ? Number(r.autotask_resource_id) : null,
          quickbooksVendorId: r.quickbooks_vendor_id,
          mileiqUserId: r.mileiq_user_id,
          confirmed: r.resolved_at != null,
          resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
          confirmedByName: r.confirmed_by_name,
        }));
      } catch {
        return mockRepositories.crm.listEmployeeMappings();
      }
    },

    async confirmEmployeeMapping(input, confirmedBy): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.confirmEmployeeMapping(input, confirmedBy);
      // Upsert the mapping sidecar (1:1 on app_user_id). classification keeps its
      // DEFAULT '1099' on insert; this write never touches comp data. Stamp who/when.
      await pool.query(
        `INSERT INTO employee_profile
           (app_user_id, autotask_resource_id, quickbooks_vendor_id, mileiq_user_id,
            mappings_resolved_at, mappings_confirmed_by)
         VALUES ($1, $2, $3, $4, now(), $5)
         ON CONFLICT (app_user_id) DO UPDATE
           SET autotask_resource_id  = EXCLUDED.autotask_resource_id,
               quickbooks_vendor_id  = EXCLUDED.quickbooks_vendor_id,
               mileiq_user_id        = EXCLUDED.mileiq_user_id,
               mappings_resolved_at  = now(),
               mappings_confirmed_by = EXCLUDED.mappings_confirmed_by`,
        [
          input.appUserId,
          input.autotaskResourceId,
          input.quickbooksVendorId,
          input.mileiqUserId,
          confirmedBy,
        ],
      );
    },

    // Mileage rate — effective-dated SYSTEM-wide comp figure (ADR-0083, #490). COMP DATA:
    // gated exactly like pay_rate; the caller (the payroll-gated mileage-rate admin) holds
    // `expense:finance-approve`. The per-employee mileage $ is derived by the backend.
    async listMileageRates(): Promise<MileageRateRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listMileageRates();
      try {
        const { rows } = await pool.query<{
          id: string;
          effective_from: string;
          rate: string;
          source: string;
          note: string | null;
          created_at: Date;
          created_by_name: string | null;
          is_current: boolean;
        }>(
          // The "current" rate is the latest effective_from on or before today — the one a
          // drive dated today reconciles against. Flag exactly that row for the admin.
          `SELECT mr.id,
                  to_char(mr.effective_from, 'YYYY-MM-DD') AS effective_from,
                  mr.rate, mr.source, mr.note, mr.created_at,
                  COALESCE(cb.display_name, cb.email) AS created_by_name,
                  (mr.effective_from = (
                     SELECT max(effective_from) FROM mileage_rate
                      WHERE effective_from <= CURRENT_DATE
                  )) AS is_current
             FROM mileage_rate mr
             LEFT JOIN app_user cb ON cb.id = mr.created_by
            ORDER BY mr.effective_from DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          effectiveFrom: r.effective_from,
          rate: Number(r.rate),
          source: r.source as MileageRateRow["source"],
          note: r.note,
          createdAt: new Date(r.created_at).toISOString(),
          createdByName: r.created_by_name,
          isCurrent: r.is_current === true,
        }));
      } catch {
        return mockRepositories.crm.listMileageRates();
      }
    },

    async setMileageRate(input, createdBy): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setMileageRate(input, createdBy);
      // Append a system-override rate. source is fixed to 'system_override' (the MileIQ
      // suggested rate is written elsewhere). Upsert on the UNIQUE effective_from so
      // re-setting the same date overwrites rather than failing.
      await pool.query(
        `INSERT INTO mileage_rate (effective_from, rate, source, note, created_by)
         VALUES ($1, $2, 'system_override', $3, $4)
         ON CONFLICT (effective_from) DO UPDATE
           SET rate       = EXCLUDED.rate,
               source     = 'system_override',
               note       = EXCLUDED.note,
               created_by = EXCLUDED.created_by,
               created_at = now()`,
        [input.effectiveFrom, input.rate, input.note, createdBy],
      );
    },

    // Expense tracking — monthly expense reports (ADR-0083, migrations 0088–0090)
    async listExpenseReports(opts): Promise<ExpenseReportRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listExpenseReports(opts);
      try {
        const { rows } = await pool.query<{
          id: string;
          app_user_id: string;
          period_year: number;
          period_month: number;
          state: string;
          attested_at: Date | null;
          item_count: string;
          total_amount: string;
          reimbursable_amount: string;
        }>(
          `SELECT er.id, er.app_user_id, er.period_year, er.period_month,
                  er.state, er.attested_at,
                  count(ei.id) AS item_count,
                  COALESCE(SUM(ei.amount), 0) AS total_amount,
                  COALESCE(SUM(ei.amount) FILTER (WHERE ei.reimbursable), 0) AS reimbursable_amount
           FROM expense_report er
           LEFT JOIN expense_item ei ON ei.expense_report_id = er.id
           WHERE er.app_user_id = $1
           GROUP BY er.id
           ORDER BY er.period_year DESC, er.period_month DESC`,
          [opts.employeeId],
        );
        return rows.map((r) => ({
          id: r.id,
          employeeId: r.app_user_id,
          periodYear: Number(r.period_year),
          periodMonth: Number(r.period_month),
          state: r.state as ExpenseReportRow["state"],
          itemCount: Number(r.item_count),
          totalAmount: Number(r.total_amount),
          reimbursableAmount: Number(r.reimbursable_amount),
          attestedAt: r.attested_at ? new Date(r.attested_at).toISOString() : null,
        }));
      } catch {
        return mockRepositories.crm.listExpenseReports(opts);
      }
    },

    async getExpenseReportForPeriod(employeeId, year, month): Promise<ExpenseReportDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getExpenseReportForPeriod(employeeId, year, month);
      const { rows } = await pool.query<BaseExpenseReport>(
        `SELECT id, app_user_id, period_year, period_month, state, attested_at
         FROM expense_report
         WHERE app_user_id = $1 AND period_year = $2 AND period_month = $3`,
        [employeeId, year, month],
      );
      const r = rows[0];
      if (!r) return null;
      return assembleExpenseReportDetail(pool, r);
    },

    async ensureExpenseReportForPeriod(employeeId, year, month): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.ensureExpenseReportForPeriod(employeeId, year, month);
      // Idempotent on UNIQUE (app_user_id, period_year, period_month); the no-op UPDATE
      // lets us RETURNING the id whether the row was inserted or already existed.
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO expense_report (app_user_id, period_year, period_month)
         VALUES ($1, $2, $3)
         ON CONFLICT (app_user_id, period_year, period_month)
           DO UPDATE SET app_user_id = expense_report.app_user_id
         RETURNING id`,
        [employeeId, year, month],
      );
      return rows[0].id;
    },

    async submitExpenseReport(id, attestedBy): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.submitExpenseReport(id, attestedBy);
      // Open → Submitted; stamp the attester and snapshot the items (in ExpenseItemRow
      // shape) so admin corrections can be diffed against the attested original.
      await pool.query(
        `UPDATE expense_report er
         SET state = 'submitted', attested_at = now(), attested_by = $2,
             attested_snapshot = (
               SELECT COALESCE(jsonb_agg(jsonb_build_object(
                 'id', ei.id, 'source', ei.source, 'kind', ei.kind,
                 'itemDate', to_char(ei.item_date, 'YYYY-MM-DD'),
                 'categoryName', c.display_name,
                 'amount', ei.amount, 'miles', ei.miles,
                 'reimbursable', ei.reimbursable, 'billable', ei.billable,
                 'merchant', ei.merchant, 'hasReceipt', ei.receipt_id IS NOT NULL,
                 'notes', ei.notes
               ) ORDER BY ei.item_date, ei.created_at), '[]'::jsonb)
               FROM expense_item ei
               LEFT JOIN expense_category c ON c.id = ei.category_id
               WHERE ei.expense_report_id = er.id
             )
         WHERE er.id = $1 AND er.state = 'open'`,
        [id, attestedBy],
      );
    },

    async reopenExpenseReport(id): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.reopenExpenseReport(id);
      // Back to the employee for correction — re-attest required. Keep the attested snapshot
      // + Autotask tracking row for the audit/diff.
      await pool.query(
        `UPDATE expense_report
         SET state = 'open', attested_at = NULL, attested_by = NULL,
             approved_at = NULL, approved_by = NULL,
             finance_approved_at = NULL, finance_approved_by = NULL,
             rejected_at = NULL, rejected_by = NULL, rejection_note = NULL
         WHERE id = $1 AND state IN ('submitted', 'approved', 'finance_approved', 'rejected')`,
        [id],
      );
    },

    async listAllExpenseReports(): Promise<AdminExpenseRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listAllExpenseReports();
      try {
        // Unified lifecycle feed (#548): every report, every state. The lifecycle stamps
        // live on expense_report itself; LEFT JOIN the items for the count + totals. NO
        // comp/pay data — the mileage rate + reimbursement math are backend-only.
        const { rows } = await pool.query<{
          id: string;
          app_user_id: string;
          employee_name: string | null;
          period_year: number;
          period_month: number;
          state: string;
          attested_at: Date | null;
          finance_approved_at: Date | null;
          reimbursed_at: Date | null;
          qb_payment_ref: string | null;
          item_count: string;
          total_amount: string;
          reimbursable_amount: string;
        }>(
          `SELECT er.id, er.app_user_id,
                  COALESCE(u.display_name, u.email) AS employee_name,
                  er.period_year, er.period_month, er.state, er.attested_at,
                  er.finance_approved_at, er.reimbursed_at,
                  er.qb_bill_payment_ref AS qb_payment_ref,
                  count(ei.id) AS item_count,
                  COALESCE(SUM(ei.amount), 0) AS total_amount,
                  COALESCE(SUM(ei.amount) FILTER (WHERE ei.reimbursable), 0) AS reimbursable_amount
           FROM expense_report er
           JOIN app_user u ON u.id = er.app_user_id
           LEFT JOIN expense_item ei ON ei.expense_report_id = er.id
           GROUP BY er.id, u.display_name, u.email
           ORDER BY er.period_year DESC, er.period_month DESC, employee_name`,
        );
        return rows.map((r) => ({
          id: r.id,
          employeeId: r.app_user_id,
          employeeName: r.employee_name ?? "—",
          periodYear: Number(r.period_year),
          periodMonth: Number(r.period_month),
          state: r.state as AdminExpenseRow["state"],
          itemCount: Number(r.item_count),
          totalAmount: Number(r.total_amount),
          reimbursableAmount: Number(r.reimbursable_amount),
          attestedAt: r.attested_at ? new Date(r.attested_at).toISOString() : null,
          financeApprovedAt: r.finance_approved_at
            ? new Date(r.finance_approved_at).toISOString()
            : null,
          reimbursedAt: r.reimbursed_at ? new Date(r.reimbursed_at).toISOString() : null,
          qbPaymentRef: r.qb_payment_ref,
        }));
      } catch {
        return mockRepositories.crm.listAllExpenseReports();
      }
    },

    async getExpenseReportById(id): Promise<AdminExpenseReview | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getExpenseReportById(id);
      const { rows } = await pool.query<BaseExpenseReport & { attested_snapshot: unknown }>(
        `SELECT id, app_user_id, period_year, period_month, state, attested_at, attested_snapshot
         FROM expense_report WHERE id = $1`,
        [id],
      );
      const r = rows[0];
      if (!r) return null;
      const detail = await assembleExpenseReportDetail(pool, r);
      // The immutable attested original (jsonb already in ExpenseItemRow shape); coerce the
      // numeric fields back from JSON for a faithful diff against the live items.
      const snap = Array.isArray(r.attested_snapshot)
        ? (r.attested_snapshot as ExpenseItemRow[]).map((i) => ({
            ...i,
            amount: Number(i.amount),
            miles: i.miles === null ? null : Number(i.miles),
          }))
        : null;
      return { ...detail, attestedSnapshot: snap };
    },

    async getExpenseReimbursementMatch(expenseReportId): Promise<ExpenseReimbursementMatch | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.getExpenseReimbursementMatch(expenseReportId);
      const { rows } = await pool.query<{
        expense_report_id: string;
        expected_reimbursable_total: string | null;
        qb_bill_payment_ref: string | null;
        qb_payment_amount: string | null;
        verdict: string;
        reconciled_at: Date | null;
      }>(
        `SELECT expense_report_id, expected_reimbursable_total, qb_bill_payment_ref,
                qb_payment_amount, verdict, reconciled_at
         FROM expense_reconciliation WHERE expense_report_id = $1`,
        [expenseReportId],
      );
      const r = rows[0];
      if (!r) return null;
      const verdict = r.verdict as ExpenseReimbursementMatch["verdict"];
      const detail =
        verdict === "matched"
          ? "Backend matched a QuickBooks Purchase within tolerance."
          : verdict === "mismatch"
            ? "Backend found a QuickBooks Purchase that doesn't match within tolerance — resolve before reimbursing."
            : "No QuickBooks match yet (recon pending or QBO not live in this environment).";
      return {
        expenseReportId: r.expense_report_id,
        matched: verdict === "matched",
        qbPaymentRef: r.qb_bill_payment_ref,
        reimbursedAt: r.reconciled_at ? new Date(r.reconciled_at).toISOString() : null,
        expectedReimbursableTotal:
          r.expected_reimbursable_total === null ? null : Number(r.expected_reimbursable_total),
        qbPaymentAmount: r.qb_payment_amount === null ? null : Number(r.qb_payment_amount),
        verdict,
        detail,
      };
    },

    async approveExpenseReport(id, approvedBy): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.approveExpenseReport(id, approvedBy);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Only a Submitted report → Approved; stamp the admin approver.
        const { rowCount } = await client.query(
          `UPDATE expense_report SET state = 'approved', approved_at = now(), approved_by = $2
           WHERE id = $1 AND state = 'submitted'`,
          [id, approvedBy],
        );
        // Create the pending Autotask ExpenseReport tracking row the backend writer consumes
        // (idempotent on the report — re-approval reuses the same row/external_ref).
        if (rowCount && rowCount > 0) {
          await client.query(
            `INSERT INTO autotask_expense_report
               (expense_report_id, app_user_id, period_year, period_month, idempotency_key)
             SELECT er.id, er.app_user_id, er.period_year, er.period_month,
                    'imperioncrm-expensereport-' || er.id
             FROM expense_report er WHERE er.id = $1
             ON CONFLICT (expense_report_id) DO NOTHING`,
            [id],
          );
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async financeApproveExpenseReport(id, approvedBy): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.financeApproveExpenseReport(id, approvedBy);
      // Only an Approved report → Finance-approved; authorizes reimbursement (the app never pays).
      await pool.query(
        `UPDATE expense_report
         SET state = 'finance_approved', finance_approved_at = now(), finance_approved_by = $2
         WHERE id = $1 AND state = 'approved'`,
        [id, approvedBy],
      );
    },

    async markExpenseReportReimbursed(id, qbPaymentRef): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.markExpenseReportReimbursed(id, qbPaymentRef);
      // Only a Finance-approved report → Reimbursed; records the CFO's confirmation of the
      // backend's QuickBooks match. NO comp data.
      await pool.query(
        `UPDATE expense_report
         SET state = 'reimbursed', reimbursed_at = now(), qb_bill_payment_ref = $2
         WHERE id = $1 AND state = 'finance_approved'`,
        [id, qbPaymentRef],
      );
    },

    async rejectExpenseReport(id, rejectedBy, note): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.rejectExpenseReport(id, rejectedBy, note);
      await pool.query(
        `UPDATE expense_report
         SET state = 'rejected', rejected_at = now(), rejected_by = $2, rejection_note = $3
         WHERE id = $1 AND state IN ('submitted', 'approved', 'finance_approved')`,
        [id, rejectedBy, nullIfEmpty(note)],
      );
    },

    async addExpenseItem(input: ExpenseItemInput): Promise<string | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.addExpenseItem(input);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Lock the report and re-check it is Open AND owned by the session employee — the
        // server-side gate (never trust the form): an attested report is locked, and an
        // employee can only add to their OWN report. Out-of-pocket goes to the bronze.
        const { rows: rep } = await client.query<{ state: string }>(
          `SELECT state FROM expense_report
            WHERE id = $1 AND app_user_id = $2 FOR UPDATE`,
          [input.expenseReportId, input.employeeId],
        );
        if (!rep[0] || rep[0].state !== "open") {
          await client.query("ROLLBACK");
          return null;
        }
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO website_expense_item
             (expense_report_id, app_user_id, item_date, category_id, amount, merchant,
              description, reimbursable, billable, autotask_company_id, receipt_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            input.expenseReportId,
            input.employeeId,
            input.itemDate,
            input.categoryId,
            input.amount,
            nullIfEmpty(input.merchant),
            nullIfEmpty(input.description),
            input.reimbursable,
            input.billable,
            input.autotaskCompanyId,
            input.receiptId,
          ],
        );
        await client.query("COMMIT");
        return rows[0].id;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async addMileageItem(input: MileageItemInput): Promise<string | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.addMileageItem(input);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Same self-scoping as addExpenseItem: lock the report and re-check it is Open AND
        // owned by the session employee (never trust the form). Manual mileage (#853) goes to
        // the website_mileage bronze — miles only; the reimbursement $ is backend-derived
        // (the comp reader), so the comp-gated rate is never read on this path.
        const { rows: rep } = await client.query<{ state: string }>(
          `SELECT state FROM expense_report
            WHERE id = $1 AND app_user_id = $2 FOR UPDATE`,
          [input.expenseReportId, input.employeeId],
        );
        if (!rep[0] || rep[0].state !== "open") {
          await client.query("ROLLBACK");
          return null;
        }
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO website_mileage
             (expense_report_id, app_user_id, item_date, miles, origin, destination,
              reimbursable, billable, autotask_company_id, ticket_ref, project_ref, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING id`,
          [
            input.expenseReportId,
            input.employeeId,
            input.itemDate,
            input.miles,
            nullIfEmpty(input.origin),
            nullIfEmpty(input.destination),
            input.reimbursable,
            input.billable,
            input.autotaskCompanyId,
            nullIfEmpty(input.ticketRef),
            nullIfEmpty(input.projectRef),
            nullIfEmpty(input.notes),
          ],
        );
        await client.query("COMMIT");
        return rows[0].id;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async attachReceiptToExpenseItem(input: ReceiptAttachmentInput): Promise<string | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.attachReceiptToExpenseItem(input);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Resolve + lock the item's report; only attach when it is Open AND owned by the
        // session employee. The join enforces ownership without trusting any form input —
        // an employee can only attach to their OWN pre-submit out-of-pocket line (mileage is
        // receipt-exempt and never lands in website_expense_item, so it can't match here).
        const { rows: rep } = await client.query<{ state: string }>(
          `SELECT er.state
             FROM website_expense_item wi
             JOIN expense_report er ON er.id = wi.expense_report_id
            WHERE wi.id = $1 AND wi.app_user_id = $2
            FOR UPDATE OF er`,
          [input.itemId, input.employeeId],
        );
        if (!rep[0] || rep[0].state !== "open") {
          await client.query("ROLLBACK");
          return null;
        }
        // Insert the receipt_attachment from the backend's custody fields (the bytes already
        // live in the private `receipts` blob, BE #200), then link the item. verified_in_
        // autotask stays false — the backend flips it on the approval push (ADR-0083 §Receipts).
        const { rows: rcpt } = await client.query<{ id: string }>(
          `INSERT INTO receipt_attachment
             (app_user_id, blob_path, content_hash, content_type, byte_size, original_filename)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            input.employeeId,
            input.blobPath,
            input.contentHash,
            input.contentType,
            input.byteSize,
            nullIfEmpty(input.originalFilename),
          ],
        );
        const receiptId = rcpt[0].id;
        await client.query(
          `UPDATE website_expense_item SET receipt_id = $1
            WHERE id = $2 AND app_user_id = $3`,
          [receiptId, input.itemId, input.employeeId],
        );
        await client.query("COMMIT");
        return receiptId;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async updateExpenseItem(id: string, input: ExpenseItemInput): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateExpenseItem(id, input);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Lock the owning report and re-check Open + owned by the session employee. Scope
        // the UPDATE to the item id + report id + owner so a forged report/owner can't
        // touch another employee's item.
        const { rows: rep } = await client.query<{ state: string }>(
          `SELECT state FROM expense_report
            WHERE id = $1 AND app_user_id = $2 FOR UPDATE`,
          [input.expenseReportId, input.employeeId],
        );
        if (!rep[0] || rep[0].state !== "open") {
          await client.query("ROLLBACK");
          return false;
        }
        const { rowCount } = await client.query(
          `UPDATE website_expense_item
              SET item_date = $4, category_id = $5, amount = $6, merchant = $7,
                  description = $8, reimbursable = $9, billable = $10,
                  autotask_company_id = $11, receipt_id = $12
            WHERE id = $1 AND expense_report_id = $2 AND app_user_id = $3`,
          [
            id,
            input.expenseReportId,
            input.employeeId,
            input.itemDate,
            input.categoryId,
            input.amount,
            nullIfEmpty(input.merchant),
            nullIfEmpty(input.description),
            input.reimbursable,
            input.billable,
            input.autotaskCompanyId,
            input.receiptId,
          ],
        );
        if (!rowCount) {
          await client.query("ROLLBACK");
          return false;
        }
        await client.query("COMMIT");
        return true;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async deleteExpenseItem(id: string, employeeId: string): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteExpenseItem(id, employeeId);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Resolve + lock the item's report; only delete when it is Open and owned by the
        // session employee. The join enforces ownership without trusting any form input.
        const { rows: rep } = await client.query<{ state: string }>(
          `SELECT er.state
             FROM website_expense_item wi
             JOIN expense_report er ON er.id = wi.expense_report_id
            WHERE wi.id = $1 AND wi.app_user_id = $2
            FOR UPDATE OF er`,
          [id, employeeId],
        );
        if (!rep[0] || rep[0].state !== "open") {
          await client.query("ROLLBACK");
          return false;
        }
        const { rowCount } = await client.query(
          `DELETE FROM website_expense_item WHERE id = $1 AND app_user_id = $2`,
          [id, employeeId],
        );
        await client.query("COMMIT");
        return (rowCount ?? 0) > 0;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async correctSubmittedExpenseReport(
      reportId: string,
      op: ExpenseCorrection,
      correctedBy: string,
    ): Promise<boolean> {
      const pool = getPool();
      if (!pool)
        return mockRepositories.crm.correctSubmittedExpenseReport(reportId, op, correctedBy);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Lock the report and confirm it's still Submitted — admin corrections are only valid
        // in that window (mirrors the timesheet #477 rule). The owner (app_user_id) comes from
        // the report, never the caller. An Open report is the employee's own to edit; an
        // Approved+ report is past the correction window.
        const { rows: rRows } = await client.query<{ state: string; app_user_id: string }>(
          `SELECT state, app_user_id FROM expense_report WHERE id = $1 FOR UPDATE`,
          [reportId],
        );
        const report = rRows[0];
        if (!report || report.state !== "submitted") {
          await client.query("ROLLBACK");
          return false;
        }

        // Capture the before-image for edit/delete (must be an out-of-pocket item on THIS
        // report). Mileage lives in mileiq_drive, never website_expense_item, so it is
        // structurally not correctable here.
        let before: Record<string, unknown> | null = null;
        if (op.kind !== "add") {
          const { rows: iRows } = await client.query<Record<string, unknown>>(
            `SELECT id, to_char(item_date, 'YYYY-MM-DD') AS item_date, category_id, amount,
                    merchant, description, reimbursable, billable, autotask_company_id
             FROM website_expense_item WHERE id = $1 AND expense_report_id = $2`,
            [op.itemId, reportId],
          );
          if (!iRows[0]) {
            await client.query("ROLLBACK");
            return false;
          }
          before = iRows[0];
        }

        let itemId: string | null = op.kind === "add" ? null : op.itemId;
        let after: Record<string, unknown> | null = null;
        if (op.kind === "add") {
          const { rows } = await client.query<{ id: string }>(
            `INSERT INTO website_expense_item
               (expense_report_id, app_user_id, item_date, category_id, amount, merchant,
                description, reimbursable, billable, autotask_company_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            [
              reportId,
              report.app_user_id,
              op.item.itemDate,
              op.item.categoryId,
              op.item.amount,
              nullIfEmpty(op.item.merchant),
              nullIfEmpty(op.item.description),
              op.item.reimbursable,
              op.item.billable,
              op.item.autotaskCompanyId,
            ],
          );
          itemId = rows[0].id;
          after = { ...op.item };
        } else if (op.kind === "update") {
          await client.query(
            `UPDATE website_expense_item
                SET item_date = $3, category_id = $4, amount = $5, merchant = $6,
                    description = $7, reimbursable = $8, billable = $9, autotask_company_id = $10
              WHERE id = $1 AND expense_report_id = $2`,
            [
              op.itemId,
              reportId,
              op.item.itemDate,
              op.item.categoryId,
              op.item.amount,
              nullIfEmpty(op.item.merchant),
              nullIfEmpty(op.item.description),
              op.item.reimbursable,
              op.item.billable,
              op.item.autotaskCompanyId,
            ],
          );
          after = { ...op.item };
        } else {
          await client.query(
            `DELETE FROM website_expense_item WHERE id = $1 AND expense_report_id = $2`,
            [op.itemId, reportId],
          );
        }

        // Audit the correction against the attested original (who/when/before→after).
        // The attested_snapshot itself is never touched — it stays the immutable baseline.
        await client.query(
          `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, detail)
           VALUES ($1, 'expense.corrected', 'expense_report', $2,
                   jsonb_build_object('op', $3::text, 'itemId', $4::text,
                                      'before', $5::jsonb, 'after', $6::jsonb))`,
          [
            correctedBy,
            reportId,
            op.kind,
            itemId,
            before ? JSON.stringify(before) : null,
            after ? JSON.stringify(after) : null,
          ],
        );
        await client.query("COMMIT");
        return true;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async listExpenseCategories(): Promise<ExpenseCategoryRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listExpenseCategories();
      try {
        // The visible, mapped (active), hand-enterable categories — exclude the rate-driven
        // system Mileage category. NEVER select the QuickBooks/Autotask ids (mapping concern).
        const { rows } = await pool.query<{
          id: string;
          key: string;
          display_name: string;
          billable_default: boolean;
          hard_cap: string | null;
          soft_threshold: string | null;
        }>(
          `SELECT id, key, display_name, billable_default, hard_cap, soft_threshold
             FROM expense_category
            WHERE is_active AND is_user_visible AND NOT is_system
            ORDER BY display_name`,
        );
        return rows.map((r) => ({
          id: r.id,
          key: r.key,
          displayName: r.display_name,
          billableDefault: r.billable_default,
          hardCap: r.hard_cap === null ? null : Number(r.hard_cap),
          softThreshold: r.soft_threshold === null ? null : Number(r.soft_threshold),
        }));
      } catch {
        return mockRepositories.crm.listExpenseCategories();
      }
    },

    // Category-mapping admin console (ADR-0083, #489) — reads the QuickBooks chart of
    // accounts + the full category config; writes the hard link + config. Comp-free.
    async listExpenseCategoriesAdmin(): Promise<ExpenseCategoryAdminRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listExpenseCategoriesAdmin();
      try {
        // EVERY category (placeholders, hidden, inactive, the system Mileage row), joined
        // to its QuickBooks account (for the display name) + the mapper (audit). The full
        // config — caps/Autotask id/visibility — unlike the entry-GUI subset. Comp-free.
        const { rows } = await pool.query<{
          id: string;
          key: string;
          display_name: string;
          qbo_account_id: string | null;
          qbo_account_name: string | null;
          hard_cap: string | null;
          soft_threshold: string | null;
          billable_default: boolean;
          autotask_expense_category_id: string | null;
          is_system: boolean;
          is_user_visible: boolean;
          is_active: boolean;
          mapped_by_name: string | null;
        }>(
          `SELECT ec.id, ec.key, ec.display_name, ec.qbo_account_id,
                  qa.name AS qbo_account_name,
                  ec.hard_cap, ec.soft_threshold, ec.billable_default,
                  ec.autotask_expense_category_id,
                  ec.is_system, ec.is_user_visible, ec.is_active,
                  COALESCE(mb.display_name, mb.email) AS mapped_by_name
             FROM expense_category ec
             LEFT JOIN qbo_expense_account qa ON qa.qbo_account_id = ec.qbo_account_id
             LEFT JOIN app_user mb            ON mb.id = ec.mapped_by
            ORDER BY ec.is_system DESC, ec.display_name`,
        );
        return rows.map((r) => ({
          id: r.id,
          key: r.key,
          displayName: r.display_name,
          qboAccountId: r.qbo_account_id,
          qboAccountName: r.qbo_account_name,
          hardCap: r.hard_cap === null ? null : Number(r.hard_cap),
          softThreshold: r.soft_threshold === null ? null : Number(r.soft_threshold),
          billableDefault: r.billable_default,
          autotaskExpenseCategoryId:
            r.autotask_expense_category_id === null
              ? null
              : Number(r.autotask_expense_category_id),
          isSystem: r.is_system,
          isUserVisible: r.is_user_visible,
          isActive: r.is_active,
          mappedByName: r.mapped_by_name,
        }));
      } catch {
        return mockRepositories.crm.listExpenseCategoriesAdmin();
      }
    },

    async listQboExpenseAccounts(): Promise<QboExpenseAccountRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listQboExpenseAccounts();
      try {
        // The synced QuickBooks chart of accounts (read-only bronze), each annotated with
        // the category key already hard-linked to it. Empty until LP #168 runs the pull.
        const { rows } = await pool.query<{
          qbo_account_id: string;
          name: string;
          fully_qualified_name: string | null;
          account_type: string | null;
          active: boolean;
          mapped_to_key: string | null;
        }>(
          `SELECT qa.qbo_account_id, qa.name, qa.fully_qualified_name,
                  qa.account_type, qa.active, ec.key AS mapped_to_key
             FROM qbo_expense_account qa
             LEFT JOIN expense_category ec ON ec.qbo_account_id = qa.qbo_account_id
            ORDER BY qa.name`,
        );
        return rows.map((r) => ({
          qboAccountId: r.qbo_account_id,
          name: r.name,
          fullyQualifiedName: r.fully_qualified_name,
          accountType: r.account_type,
          active: r.active,
          mappedToKey: r.mapped_to_key,
        }));
      } catch {
        return mockRepositories.crm.listQboExpenseAccounts();
      }
    },

    async updateExpenseCategoryMapping(
      input: ExpenseCategoryMappingInput,
      mappedBy: string,
    ): Promise<void> {
      const pool = getPool();
      if (!pool)
        return mockRepositories.crm.updateExpenseCategoryMapping(input, mappedBy);
      // A non-system category may only go active once it carries a QuickBooks link
      // (the DB CHECK `expense_category_active_requires_map` enforces this too — we
      // force it here so the write never trips the constraint). The system Mileage row
      // is rate-driven + mapping-exempt: its QuickBooks link is never touched here
      // (guard via `is_system = false`), but its caps/visibility can still be set.
      const effectiveActive = input.qboAccountId === null ? false : input.isActive;
      await pool.query(
        `UPDATE expense_category
            SET display_name                 = $2,
                qbo_account_id               = CASE WHEN is_system THEN qbo_account_id ELSE $3 END,
                hard_cap                     = $4,
                soft_threshold               = $5,
                billable_default             = $6,
                autotask_expense_category_id = $7,
                is_user_visible              = $8,
                is_active                    = CASE WHEN is_system THEN is_active
                                                    WHEN $3 IS NULL THEN false
                                                    ELSE $9 END,
                mapped_by                    = $10
          WHERE id = $1`,
        [
          input.id,
          input.displayName,
          input.qboAccountId,
          input.hardCap,
          input.softThreshold,
          input.billableDefault,
          input.autotaskExpenseCategoryId,
          input.isUserVisible,
          effectiveActive,
          mappedBy,
        ],
      );
    },

    async listMileiqDrives(employeeId, year, month): Promise<MileiqDriveRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listMileiqDrives(employeeId, year, month);
      try {
        // Read-only mileage feed for the month. Comp-free: miles + MileIQ's own suggested
        // $ snapshot, NEVER the Imperion mileage rate (that is backend-derived).
        const { rows } = await pool.query<{
          id: string;
          drive_date: string;
          miles: string;
          origin: string | null;
          destination: string | null;
          suggested_amount: string | null;
          matched_at: Date | null;
        }>(
          `SELECT id, to_char(drive_date, 'YYYY-MM-DD') AS drive_date, miles, origin,
                  destination, suggested_amount, matched_at
             FROM mileiq_drive
            WHERE app_user_id = $1
              AND EXTRACT(YEAR  FROM drive_date)::int = $2
              AND EXTRACT(MONTH FROM drive_date)::int = $3
            ORDER BY drive_date`,
          [employeeId, year, month],
        );
        return rows.map((r) => ({
          id: r.id,
          driveDate: r.drive_date,
          miles: Number(r.miles),
          origin: r.origin,
          destination: r.destination,
          suggestedAmount: r.suggested_amount === null ? null : Number(r.suggested_amount),
          matched: r.matched_at !== null,
        }));
      } catch {
        return mockRepositories.crm.listMileiqDrives(employeeId, year, month);
      }
    },

    async listExpensePolicyViolations(expenseReportId): Promise<ExpensePolicyViolationRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listExpensePolicyViolations(expenseReportId);
      try {
        // The derived per-item violation read model (the 0090 view) for one report — the
        // pre-attest memory-jogger. Hard rows block attest (the app layers suspected_duplicate).
        const { rows } = await pool.query<{
          expense_item_id: string;
          expense_report_id: string;
          rule_key: string;
          severity: string;
          detail: string;
        }>(
          `SELECT expense_item_id, expense_report_id, rule_key, severity, detail
             FROM expense_policy_violation
            WHERE expense_report_id = $1
            ORDER BY severity, rule_key`,
          [expenseReportId],
        );
        return rows.map((r) => ({
          expenseItemId: r.expense_item_id,
          expenseReportId: r.expense_report_id,
          ruleKey: r.rule_key,
          severity: r.severity as ExpensePolicyViolationRow["severity"],
          detail: r.detail,
        }));
      } catch {
        return mockRepositories.crm.listExpensePolicyViolations(expenseReportId);
      }
    },

    async listMonthlyClose(employeeId): Promise<MonthlyCloseRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listMonthlyClose(employeeId);
      try {
        // The unified time+expense close (the comp-free 0090 view) for one employee, newest
        // month first. Minutes + dollar amounts only — expected pay stays in the backend.
        const { rows } = await pool.query<{
          app_user_id: string;
          period_year: number;
          period_month: number;
          expense_report_id: string | null;
          expense_state: string | null;
          reimbursable_total: string;
          reimbursement_verdict: string;
          qb_bill_payment_ref: string | null;
          approved_time_minutes: string;
          timesheet_count: string;
          paid_count: string;
          expense_obligation_open: boolean | null;
          time_obligation_open: boolean | null;
        }>(
          `SELECT app_user_id, period_year, period_month, expense_report_id, expense_state,
                  reimbursable_total, reimbursement_verdict, qb_bill_payment_ref,
                  approved_time_minutes, timesheet_count, paid_count,
                  expense_obligation_open, time_obligation_open
             FROM monthly_close
            WHERE app_user_id = $1
            ORDER BY period_year DESC, period_month DESC`,
          [employeeId],
        );
        return rows.map((r) => ({
          appUserId: r.app_user_id,
          periodYear: Number(r.period_year),
          periodMonth: Number(r.period_month),
          expenseReportId: r.expense_report_id,
          expenseState: r.expense_state as MonthlyCloseRow["expenseState"],
          reimbursableTotal: Number(r.reimbursable_total),
          reimbursementVerdict:
            r.reimbursement_verdict as MonthlyCloseRow["reimbursementVerdict"],
          qbPaymentRef: r.qb_bill_payment_ref,
          approvedTimeMinutes: Number(r.approved_time_minutes),
          timesheetCount: Number(r.timesheet_count),
          paidCount: Number(r.paid_count),
          expenseObligationOpen: r.expense_obligation_open ?? false,
          timeObligationOpen: r.time_obligation_open ?? false,
        }));
      } catch {
        return mockRepositories.crm.listMonthlyClose(employeeId);
      }
    },

    async listAllMonthlyClose(): Promise<AdminMonthlyCloseRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listAllMonthlyClose();
      try {
        // The unified Monthly Close (#491) across ALL employees — the comp-free 0090 view
        // joined to the employee display name, newest month first. Minutes + dollar amounts
        // only; expected pay (hours × rate) stays in the backend (the sole comp reader).
        const { rows } = await pool.query<{
          app_user_id: string;
          employee_name: string | null;
          period_year: number;
          period_month: number;
          expense_report_id: string | null;
          expense_state: string | null;
          reimbursable_total: string;
          reimbursement_verdict: string;
          qb_bill_payment_ref: string | null;
          approved_time_minutes: string;
          timesheet_count: string;
          paid_count: string;
          expense_obligation_open: boolean | null;
          time_obligation_open: boolean | null;
        }>(
          `SELECT mc.app_user_id,
                  COALESCE(u.display_name, u.email) AS employee_name,
                  mc.period_year, mc.period_month, mc.expense_report_id, mc.expense_state,
                  mc.reimbursable_total, mc.reimbursement_verdict, mc.qb_bill_payment_ref,
                  mc.approved_time_minutes, mc.timesheet_count, mc.paid_count,
                  mc.expense_obligation_open, mc.time_obligation_open
             FROM monthly_close mc
             JOIN app_user u ON u.id = mc.app_user_id
            ORDER BY mc.period_year DESC, mc.period_month DESC, employee_name`,
        );
        return rows.map((r) => ({
          appUserId: r.app_user_id,
          employeeName: r.employee_name ?? "—",
          periodYear: Number(r.period_year),
          periodMonth: Number(r.period_month),
          expenseReportId: r.expense_report_id,
          expenseState: r.expense_state as AdminMonthlyCloseRow["expenseState"],
          reimbursableTotal: Number(r.reimbursable_total),
          reimbursementVerdict:
            r.reimbursement_verdict as AdminMonthlyCloseRow["reimbursementVerdict"],
          qbPaymentRef: r.qb_bill_payment_ref,
          approvedTimeMinutes: Number(r.approved_time_minutes),
          timesheetCount: Number(r.timesheet_count),
          paidCount: Number(r.paid_count),
          expenseObligationOpen: r.expense_obligation_open ?? false,
          timeObligationOpen: r.time_obligation_open ?? false,
        }));
      } catch {
        return mockRepositories.crm.listAllMonthlyClose();
      }
    },

    async listOnboarding(): Promise<OnboardingProject[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listOnboarding();
      try {
        const today = new Date().toISOString().slice(0, 10);
        const { rows } = await pool.query<{
          id: string;
          name: string;
          account: string | null;
          type: string;
          status: string;
          target_live_date: Date | null;
        }>(
          // `project.type` (the legacy project_type enum column) was dropped in
          // migration 0058 when project types became data — join project_type for
          // the display name, mirroring listProjects. Referencing the dropped column
          // here threw on every prod load (caught, but it silently served mock data
          // and surfaced as the /onboarding 500/empty board, #1137).
          `SELECT p.id, p.name, a.name AS account, pt.name AS type,
                  p.status::text AS status, p.target_live_date
           FROM project p
           LEFT JOIN account a ON a.id = p.account_id
           JOIN project_type pt ON pt.id = p.project_type_id
           ORDER BY p.target_live_date NULLS LAST, p.name`,
        );
        const { rows: ms } = await pool.query<{
          id: string;
          project_id: string;
          name: string;
          status: string;
          health: Health;
          start_at: Date | null;
          due_at: Date | null;
        }>(
          `SELECT id, project_id, name, status::text AS status, health::text AS health,
                  start_at, due_at
           FROM project_milestone
           ORDER BY ordinal, name`,
        );
        const { rows: steps } = await pool.query<{
          id: string;
          project_id: string;
          milestone_id: string | null;
          code: string;
          title: string;
          is_comm: boolean;
          status: string;
          due_at: Date | null;
          deploy_key: string | null;
          deploy_requested_at: Date | null;
          task_id: string | null;
        }>(
          `SELECT id, project_id, milestone_id, code, title, is_comm, status, due_at,
                  deploy_key, deploy_requested_at, task_id
           FROM onboarding_step
           ORDER BY ordinal, code`,
        );

        const stepsByMilestone = new Map<string, OnboardingStep[]>();
        const projectsWithSteps = new Set<string>();
        for (const s of steps) {
          projectsWithSteps.add(s.project_id);
          if (!s.milestone_id) continue;
          const list = stepsByMilestone.get(s.milestone_id) ?? [];
          list.push({
            id: s.id,
            code: s.code,
            title: s.title,
            isComm: s.is_comm,
            status: s.status,
            due: fmtDate(s.due_at),
            deployKey: s.deploy_key,
            deployRequestedAt: fmtDateTime(s.deploy_requested_at),
            taskId: s.task_id,
          });
          stepsByMilestone.set(s.milestone_id, list);
        }

        const byProject = new Map<string, OnboardingMilestone[]>();
        for (const m of ms) {
          const mSteps = stepsByMilestone.get(m.id) ?? [];
          const total = mSteps.length;
          const done = mSteps.filter((s) => s.status === "done").length;
          const due = fmtDate(m.due_at);
          const list = byProject.get(m.project_id) ?? [];
          list.push({
            id: m.id,
            name: m.name,
            status: m.status,
            health: deriveHealth(m.health, total, done, due, today),
            start: fmtDate(m.start_at),
            due,
            stepsTotal: total,
            stepsDone: done,
            steps: mSteps,
          });
          byProject.set(m.project_id, list);
        }
        return rows.map((p) => ({
          id: p.id,
          name: p.name,
          account: p.account,
          type: p.type,
          status: p.status,
          targetLive: fmtDate(p.target_live_date),
          hasTemplate: projectsWithSteps.has(p.id),
          milestones: byProject.get(p.id) ?? [],
        }));
      } catch {
        return mockRepositories.crm.listOnboarding();
      }
    },

    async setMilestoneHealth(id: string, health: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setMilestoneHealth(id, health);
      await pool.query(
        `UPDATE project_milestone SET health = $2::milestone_health WHERE id = $1`,
        [id, health],
      );
    },

    async applyOnboardingTemplate(projectId: string, startAt: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.applyOnboardingTemplate(projectId, startAt);
      const start = /^\d{4}-\d{2}-\d{2}$/.test(startAt)
        ? startAt
        : new Date().toISOString().slice(0, 10);
      const client = await pool.connect();
      try {
        // Idempotent: skip if the playbook is already instantiated for this project.
        const { rows: existing } = await client.query<{ n: string }>(
          `SELECT count(*)::int AS n FROM onboarding_step WHERE project_id = $1`,
          [projectId],
        );
        if (Number(existing[0]?.n ?? 0) > 0) return;

        // The project's account scopes the auto-created easy-mode tasks (#101).
        const { rows: pRows } = await client.query<{ account_id: string | null }>(
          `SELECT account_id FROM project WHERE id = $1`,
          [projectId],
        );
        const accountId = pRows[0]?.account_id ?? null;

        await client.query("BEGIN");
        for (const phase of ONBOARDING_TEMPLATE.phases) {
          const phaseStart = addDays(start, phase.offsetDays);
          const phaseEnd = addDays(phaseStart, phase.durationDays);
          const { rows: mRows } = await client.query<{ id: string }>(
            `INSERT INTO project_milestone
               (project_id, name, ordinal, status, health, start_at, due_at)
             VALUES ($1, $2, $3, 'not_started', 'amber', $4::date, $5::date)
             RETURNING id`,
            [projectId, phase.name, phase.ordinal, phaseStart, phaseEnd],
          );
          const milestoneId = mRows[0].id;
          let ord = 0;
          for (const step of phase.steps) {
            // Easy mode (ADR-0052 §3, #101): a deploy-flagged step auto-creates
            // ONE linked project task; ordinary checklist steps create nothing,
            // so the board shows deployment-shaped work without a 100-task flood.
            let taskId: string | null = null;
            if (step.deployKey) {
              const { rows: tRows } = await client.query<{ id: string }>(
                `INSERT INTO task (account_id, project_id, title, status, category, due_at)
                 VALUES ($1, $2, $3, 'open', 'project'::task_category, $4::date)
                 RETURNING id`,
                [accountId, projectId, step.title, phaseEnd],
              );
              taskId = tRows[0].id;
            }
            await client.query(
              `INSERT INTO onboarding_step
                 (project_id, milestone_id, code, title, is_comm, ordinal, status, due_at,
                  deploy_key, verify_key, task_id)
               VALUES ($1, $2, $3, $4, $5, $6, 'open', $7::date, $8, $9, $10)
               ON CONFLICT (project_id, code) DO NOTHING`,
              [
                projectId,
                milestoneId,
                step.code,
                step.title,
                Boolean(step.send),
                ord++,
                phaseEnd,
                step.deployKey ?? null,
                step.verifyKey ?? null,
                taskId,
              ],
            );
          }
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async setOnboardingStepStatus(id: string, done: boolean): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setOnboardingStepStatus(id, done);
      // Completing a step also closes its linked project task (#101, ADR-0052
      // §4) — the same close path the backend verification check drives.
      // Idempotent: re-completing a done step / done task is a no-op. A
      // deploy-flagged step completing with NO linked task records an audit
      // note instead of failing.
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query<{
          task_id: string | null;
          deploy_key: string | null;
        }>(
          `UPDATE onboarding_step
           SET status = $2, completed_at = ${done ? "now()" : "NULL"}
           WHERE id = $1
           RETURNING task_id, deploy_key`,
          [id, done ? "done" : "open"],
        );
        const step = rows[0];
        if (done && step?.task_id) {
          await client.query(
            `UPDATE task SET status = 'done' WHERE id = $1 AND status <> 'done'`,
            [step.task_id],
          );
        } else if (done && step?.deploy_key && !step.task_id) {
          await client.query(
            `INSERT INTO audit_log (action, entity_type, entity_id, detail)
             VALUES ('onboarding.deploy.no_linked_task', 'onboarding_step', $1::uuid,
                     jsonb_build_object('deployKey', $2::text, 'note',
                       'deploy-flagged step completed with no linked project task — no-op (#101)'))`,
            [id, step.deploy_key],
          );
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async requestOnboardingDeploy(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.requestOnboardingDeploy(id);
      // Records the deploy request + audit trail. The backend configuration
      // function named by deploy_key is dispatched in the integration phase
      // (ADR-0052 §3); verification (§4) closes the step + linked task.
      const { rows } = await pool.query<{ deploy_key: string | null }>(
        `UPDATE onboarding_step SET deploy_requested_at = now()
         WHERE id = $1 AND deploy_key IS NOT NULL
         RETURNING deploy_key`,
        [id],
      );
      if (rows[0]?.deploy_key) {
        await pool.query(
          `INSERT INTO audit_log (action, entity_type, entity_id, detail)
           VALUES ('onboarding.deploy.requested', 'onboarding_step', $1::uuid,
                   jsonb_build_object('deployKey', $2::text))`,
          [id, rows[0].deploy_key],
        );
      }
    },

    async listAssessments(): Promise<AssessmentRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listAssessments();
      try {
        const { rows } = await pool.query<Record<string, unknown>>(
          `SELECT a.id, a.name, acc.name AS account, a.status, a.fee_amount, a.kickoff_at,
                  a.identity_rating, a.endpoint_rating, a.network_rating,
                  a.email_rating, a.backup_rating, a.incident_rating
           FROM assessment a
           JOIN account acc ON acc.id = a.account_id
           ORDER BY a.created_at DESC`,
        );
        return rows.map((row) => ({
          id: row.id as string,
          name: row.name as string,
          account: row.account as string,
          status: row.status as string,
          fee:
            row.fee_amount != null && Number(row.fee_amount) > 0
              ? fmtUsd(Number(row.fee_amount))
              : "—",
          kickoff: fmtDate((row.kickoff_at as Date | null) ?? null),
          scores: ASSESSMENT_DIMENSIONS.map((d) => ({
            key: d.key,
            label: d.label,
            rating: (row[`${d.key}_rating`] as string | null) ?? null,
          })),
        }));
      } catch {
        return mockRepositories.crm.listAssessments();
      }
    },

    async getAssessment(id: string): Promise<AssessmentEditable | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<Record<string, unknown>>(
          `SELECT id, account_id, opportunity_id, name, status, fee_amount,
                  credit_to_onboarding, identity_rating, endpoint_rating, network_rating,
                  email_rating, backup_rating, incident_rating, top_priorities,
                  recommendation, report_url, notes, kickoff_at
           FROM assessment WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        const ratings: Record<string, string | null> = {};
        for (const d of ASSESSMENT_DIMENSIONS) {
          ratings[d.key] = (r[`${d.key}_rating`] as string | null) ?? null;
        }
        return {
          id: r.id as string,
          accountId: r.account_id as string,
          opportunityId: (r.opportunity_id as string | null) ?? null,
          name: r.name as string,
          status: r.status as string,
          feeAmount: r.fee_amount != null ? String(r.fee_amount) : null,
          creditToOnboarding: Boolean(r.credit_to_onboarding),
          ratings,
          topPriorities: (r.top_priorities as string | null) ?? null,
          recommendation: (r.recommendation as string | null) ?? null,
          reportUrl: (r.report_url as string | null) ?? null,
          notes: (r.notes as string | null) ?? null,
          kickoffAt: fmtDate((r.kickoff_at as Date | null) ?? null),
        };
      } catch {
        return null;
      }
    },

    async createAssessment(input: AssessmentInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.createAssessment(input);
      const ratings = ASSESSMENT_DIMENSIONS.map((d) => nullIfEmpty(input.ratings[d.key]));
      await pool.query(
        `INSERT INTO assessment
           (account_id, opportunity_id, name, status, fee_amount, credit_to_onboarding,
            identity_rating, endpoint_rating, network_rating, email_rating,
            backup_rating, incident_rating, top_priorities, recommendation, report_url,
            notes, kickoff_at, delivered_at)
         VALUES (
           $1, $2, $3, $4::assessment_status, $5::numeric, $6,
           $7::assessment_rating, $8::assessment_rating, $9::assessment_rating,
           $10::assessment_rating, $11::assessment_rating, $12::assessment_rating,
           $13, $14, $15, $16, $17::date,
           CASE WHEN $4 IN ('delivered','closed') THEN now() ELSE NULL END
         )`,
        [
          input.accountId,
          nullIfEmpty(input.opportunityId),
          input.name,
          input.status,
          nullIfEmpty(input.feeAmount),
          input.creditToOnboarding,
          ...ratings,
          nullIfEmpty(input.topPriorities),
          nullIfEmpty(input.recommendation),
          nullIfEmpty(input.reportUrl),
          nullIfEmpty(input.notes),
          nullIfEmpty(input.kickoffAt),
        ],
      );
    },

    async updateAssessment(id: string, input: AssessmentInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.updateAssessment(id, input);
      const ratings = ASSESSMENT_DIMENSIONS.map((d) => nullIfEmpty(input.ratings[d.key]));
      await pool.query(
        `UPDATE assessment
         SET account_id = $1, opportunity_id = $2, name = $3, status = $4::assessment_status,
             fee_amount = $5::numeric, credit_to_onboarding = $6,
             identity_rating = $7::assessment_rating, endpoint_rating = $8::assessment_rating,
             network_rating = $9::assessment_rating, email_rating = $10::assessment_rating,
             backup_rating = $11::assessment_rating, incident_rating = $12::assessment_rating,
             top_priorities = $13, recommendation = $14, report_url = $15, notes = $16,
             kickoff_at = $17::date,
             delivered_at = CASE WHEN $4 IN ('delivered','closed')
                                 THEN coalesce(delivered_at, now()) ELSE NULL END
         WHERE id = $18`,
        [
          input.accountId,
          nullIfEmpty(input.opportunityId),
          input.name,
          input.status,
          nullIfEmpty(input.feeAmount),
          input.creditToOnboarding,
          ...ratings,
          nullIfEmpty(input.topPriorities),
          nullIfEmpty(input.recommendation),
          nullIfEmpty(input.reportUrl),
          nullIfEmpty(input.notes),
          nullIfEmpty(input.kickoffAt),
          id,
        ],
      );
    },

    async deleteAssessment(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.deleteAssessment(id);
      await pool.query(`DELETE FROM assessment WHERE id = $1`, [id]);
    },

    async accountOptions(): Promise<Option[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.accountOptions();
      try {
        const { rows } = await pool.query<{ id: string; name: string }>(
          `SELECT id, name FROM account ORDER BY name`,
        );
        return rows.map((r) => ({ id: r.id, name: r.name }));
      } catch {
        return mockRepositories.crm.accountOptions();
      }
    },

    async taskOptions(excludeId?: string): Promise<Option[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.taskOptions(excludeId);
      try {
        const { rows } = await pool.query<{ id: string; name: string }>(
          `SELECT id, title AS name FROM task
            WHERE ($1::uuid IS NULL OR id <> $1::uuid)
            ORDER BY title`,
          [excludeId ?? null],
        );
        return rows.map((r) => ({ id: r.id, name: r.name }));
      } catch {
        return mockRepositories.crm.taskOptions(excludeId);
      }
    },

    async opportunityOptions(): Promise<Option[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.opportunityOptions();
      try {
        const { rows } = await pool.query<{ id: string; name: string }>(
          `SELECT o.id, a.name || ' — ' || o.name AS name
           FROM opportunity o
           JOIN account a ON a.id = o.account_id
           ORDER BY a.name, o.name`,
        );
        return rows.map((r) => ({ id: r.id, name: r.name }));
      } catch {
        return mockRepositories.crm.opportunityOptions();
      }
    },

    async contactOptions(): Promise<Option[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.contactOptions();
      try {
        const { rows } = await pool.query<{ id: string; name: string }>(
          `SELECT c.id, c.full_name || ' (' || coalesce(a.name, '—') || ')' AS name
           FROM contact c
           LEFT JOIN account a ON a.id = c.account_id
           ORDER BY c.full_name`,
        );
        return rows.map((r) => ({ id: r.id, name: r.name }));
      } catch {
        return mockRepositories.crm.contactOptions();
      }
    },

    async assessmentOptions(): Promise<Option[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.assessmentOptions();
      try {
        const { rows } = await pool.query<{ id: string; name: string }>(
          `SELECT s.id, a.name || ' — ' || s.name AS name
           FROM assessment s
           JOIN account a ON a.id = s.account_id
           ORDER BY a.name, s.created_at DESC`,
        );
        return rows.map((r) => ({ id: r.id, name: r.name }));
      } catch {
        return mockRepositories.crm.assessmentOptions();
      }
    },

    async userOptions(): Promise<Option[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.userOptions();
      try {
        const { rows } = await pool.query<{ id: string; name: string }>(
          `SELECT id, coalesce(display_name, email) AS name
           FROM app_user
           ORDER BY 2`,
        );
        return rows.map((r) => ({ id: r.id, name: r.name }));
      } catch {
        return mockRepositories.crm.userOptions();
      }
    },
  },

  agent: {
    // No agent runtime yet (ADR-0015 / ADR-0018 — hosted externally). Empty feed.
    async getConversation() {
      return [];
    },

    async getAutonomyPolicy(query: AutonomyDialQuery): Promise<AgentAutopilotPolicy | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.agent.getAutonomyPolicy(query);
      try {
        // Read the autonomy rung from the data-driven dial (agent_autopilot_policy,
        // migration 0123, #721; ADR-0087). Resolve the MOST-SPECIFIC matching row: a
        // row whose workflow_key equals the requested workflow wins over the '*' agent
        // default (ORDER BY puts the exact match first). workflowKey defaults to '*'.
        const workflowKey = query.workflowKey ?? "*";
        const { rows } = await pool.query<{
          id: string;
          agent_key: string;
          workflow_key: string;
          plane: AgentPlane;
          rung: AutonomyRung;
          mark_gated: boolean;
          note: string | null;
          created_at: Date;
          updated_at: Date;
        }>(
          `SELECT id::text AS id, agent_key, workflow_key, plane, rung, mark_gated, note,
                  created_at, updated_at
             FROM agent_autopilot_policy
            WHERE agent_key = $1 AND plane = $2 AND workflow_key IN ($3, '*')
            ORDER BY (workflow_key = $3) DESC
            LIMIT 1`,
          [query.agentKey, query.plane, workflowKey],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          agentKey: r.agent_key,
          workflowKey: r.workflow_key,
          plane: r.plane,
          rung: r.rung,
          markGated: r.mark_gated,
          note: r.note,
          createdAt: fmtIso(r.created_at) ?? "",
          updatedAt: fmtIso(r.updated_at) ?? "",
        };
      } catch {
        // Table missing (migration not applied) or DB unreachable — return null so the
        // caller assumes the safe default rung (gating is data; "no data" ⇒ conservative).
        return mockRepositories.agent.getAutonomyPolicy(query);
      }
    },
  },

  reports: {
    async getSummary(): Promise<ReportSummary> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.getSummary();
      try {
        const { rows } = await pool.query<{
          active_mrr: string;
          open_pipeline: string;
          won: string;
          lost: string;
          avg_ttl_days: string | null;
        }>(
          `SELECT
             coalesce(sum(o.amount_mrr) FILTER (WHERE o.sales_stage = 'won'), 0)        AS active_mrr,
             coalesce(sum(o.amount_mrr) FILTER (WHERE o.sales_stage IN
               ('lead','qualified','proposal')), 0)                                     AS open_pipeline,
             count(*) FILTER (WHERE o.sales_stage = 'won')                              AS won,
             count(*) FILTER (WHERE o.sales_stage = 'lost')                             AS lost,
             (SELECT avg(extract(epoch FROM (completed_at - started_at)) / 86400.0)
                FROM project
               WHERE status = 'complete' AND started_at IS NOT NULL
                 AND completed_at IS NOT NULL)                                          AS avg_ttl_days
           FROM opportunity o`,
        );
        const r = rows[0];
        const won = Number(r.won);
        const lost = Number(r.lost);
        const decided = won + lost;
        const ttl = r.avg_ttl_days != null ? Math.round(Number(r.avg_ttl_days)) : null;
        return {
          activeMrr: `${fmtUsdCompact(Number(r.active_mrr))}/mo`,
          openPipeline: fmtUsdCompact(Number(r.open_pipeline)),
          winRate: decided > 0 ? `${Math.round((won / decided) * 100)}%` : "—",
          avgTimeToLive: ttl != null ? `${ttl}d` : "—",
        };
      } catch {
        return mockRepositories.reports.getSummary();
      }
    },

    async pipelineByStage(): Promise<StageValueDatum[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.pipelineByStage();
      try {
        const { rows } = await pool.query<{ sales_stage: string; c: string; mrr: string }>(
          `SELECT sales_stage, count(*) AS c, coalesce(sum(amount_mrr), 0) AS mrr
           FROM opportunity GROUP BY sales_stage`,
        );
        const byStage = new Map(rows.map((r) => [r.sales_stage, r]));
        return SALES_STAGE_ORDER.map((stage) => ({
          stage,
          count: Number(byStage.get(stage)?.c ?? 0),
          mrr: Number(byStage.get(stage)?.mrr ?? 0),
        }));
      } catch {
        return mockRepositories.reports.pipelineByStage();
      }
    },

    async proposalsByStatus(): Promise<CountDatum[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.proposalsByStatus();
      try {
        const { rows } = await pool.query<{ status: string; c: string }>(
          `SELECT status, count(*) AS c FROM proposal GROUP BY status ORDER BY status`,
        );
        return rows.map((r) => ({ label: r.status, count: Number(r.c) }));
      } catch {
        return mockRepositories.reports.proposalsByStatus();
      }
    },

    async projectsByStatus(): Promise<CountDatum[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.projectsByStatus();
      try {
        // ADR-0065 B5 (#615): the BI-hub rollup keys off the status_def CATEGORY
        // (todo|in_progress|done), not the raw label, so a custom status (e.g.
        // "Waiting on client", category in_progress) rolls up under in_progress
        // rather than as its own bucket. JOIN status_def on the precise FK and
        // GROUP BY its category; fall back to the legacy `status` string only when
        // status_def_id IS NULL. Behaviour-preserving for seeded data: the project
        // category seeds reproduce today's rollups (blocked→in_progress,
        // complete→done) so the three buckets read sensibly (To Do / In Progress /
        // Done). ORDER BY the canonical category lifecycle, legacy labels last.
        const { rows } = await pool.query<{ bucket: string; c: string }>(
          `SELECT COALESCE(sd.category, p.status::text) AS bucket, count(*) AS c
             FROM project p
             LEFT JOIN status_def sd ON sd.id = p.status_def_id
            GROUP BY COALESCE(sd.category, p.status::text)
            ORDER BY CASE COALESCE(sd.category, p.status::text)
                       WHEN 'todo' THEN 0
                       WHEN 'in_progress' THEN 1
                       WHEN 'done' THEN 2
                       ELSE 3
                     END,
                     bucket`,
        );
        return rows.map((r) => ({ label: humanizeStatusBucket(r.bucket), count: Number(r.c) }));
      } catch {
        return mockRepositories.reports.projectsByStatus();
      }
    },

    async revenueSplit(): Promise<RevenueSplit> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.revenueSplit();
      try {
        const { rows } = await pool.query<{ one_time: string; recurring: string }>(
          `SELECT
             (SELECT coalesce(sum(fee_amount), 0) FROM assessment
               WHERE status IN ('delivered','closed'))         AS one_time,
             (SELECT coalesce(sum(amount_mrr), 0) FROM opportunity
               WHERE sales_stage = 'won')                       AS recurring`,
        );
        const r = rows[0];
        const oneTimeValue = Number(r.one_time);
        const recurringValue = Number(r.recurring);
        return {
          oneTime: fmtUsdCompact(oneTimeValue),
          recurring: `${fmtUsdCompact(recurringValue)}/mo`,
          oneTimeValue,
          recurringValue,
        };
      } catch {
        return mockRepositories.reports.revenueSplit();
      }
    },

    async assessmentConversion(): Promise<AssessmentConversion> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.assessmentConversion();
      try {
        const { rows } = await pool.query<{ delivered: string; converted: string }>(
          `SELECT
             count(*) FILTER (WHERE s.status IN ('delivered','closed'))            AS delivered,
             count(*) FILTER (WHERE s.status IN ('delivered','closed')
               AND a.lifecycle_stage = 'managed_active')                          AS converted
           FROM assessment s JOIN account a ON a.id = s.account_id`,
        );
        const delivered = Number(rows[0].delivered);
        const converted = Number(rows[0].converted);
        return {
          delivered,
          converted,
          rate: delivered > 0 ? `${Math.round((converted / delivered) * 100)}%` : "—",
        };
      } catch {
        return mockRepositories.reports.assessmentConversion();
      }
    },

    async sbrDimensionAverages(): Promise<CountDatum[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.sbrDimensionAverages();
      try {
        const { rows } = await pool.query<{ dimension: string; avg: string }>(
          `SELECT dimension,
                  avg(CASE rating
                        WHEN 'at_risk' THEN 1 WHEN 'needs_work' THEN 2
                        WHEN 'solid' THEN 3 WHEN 'strong' THEN 4 END) AS avg
           FROM sbr_dimension_score WHERE rating IS NOT NULL
           GROUP BY dimension`,
        );
        const byDim = new Map(rows.map((r) => [r.dimension, Number(r.avg)]));
        // Return in canonical dimension order with friendly labels.
        return ASSESSMENT_DIMENSIONS.filter((d) => byDim.has(d.key)).map((d) => ({
          label: d.label,
          count: Math.round((byDim.get(d.key) ?? 0) * 10) / 10,
        }));
      } catch {
        return mockRepositories.reports.sbrDimensionAverages();
      }
    },

    async marketingSocial(): Promise<MarketingSocialReport> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.marketingSocial();
      try {
        // Four independent aggregates (ADR-0062 §marketing). Metric-generic over
        // social_metric — names shift while local #135 tunes insight defaults.
        // Meta bronze counters are text (0075 envelope): cast defensively.
        const [leads, lifetime, daily, fb, ig, campaigns] = await Promise.all([
          pool.query<{ kind: string; c: string }>(
            `SELECT coalesce(h.kind::text, 'unknown') AS kind, count(*) AS c
             FROM lead_capture_event e
             LEFT JOIN lead_hook h ON h.id = e.hook_id
             WHERE e.received_at >= now() - interval '30 days'
             GROUP BY 1 ORDER BY 2 DESC`,
          ),
          pool.query<{ platform: string; metric: string; value: string | null }>(
            `SELECT DISTINCT ON (platform, metric) platform, metric, value
             FROM social_metric WHERE period = 'lifetime'
             ORDER BY platform, metric, captured_at DESC`,
          ),
          pool.query<{ platform: string; metric: string; value: string | null }>(
            `SELECT platform, metric, sum(value) AS value
             FROM social_metric
             WHERE period = 'day' AND captured_at >= now() - interval '28 days'
             GROUP BY 1, 2 ORDER BY 1, 2`,
          ),
          pool.query<{ posts: string; reactions: string; comments: string; shares: string }>(
            `SELECT count(*) AS posts,
                    coalesce(sum(nullif(reaction_count, '')::numeric), 0) AS reactions,
                    coalesce(sum(nullif(comment_count, '')::numeric), 0)  AS comments,
                    coalesce(sum(nullif(share_count, '')::numeric), 0)    AS shares
             FROM facebook_posts
             WHERE nullif(created_time, '')::timestamptz >= now() - interval '30 days'`,
          ),
          pool.query<{ media: string; likes: string; comments: string }>(
            `SELECT count(*) AS media,
                    coalesce(sum(nullif(like_count, '')::numeric), 0)     AS likes,
                    coalesce(sum(nullif(comments_count, '')::numeric), 0) AS comments
             FROM instagram_media
             WHERE nullif(created_time, '')::timestamptz >= now() - interval '30 days'`,
          ),
          pool.query<{
            name: string;
            platform: string;
            spend: string;
            clicks: string;
            leads: string;
          }>(
            `SELECT c.name, c.platform,
                    coalesce(sum(m.spend), 0)  AS spend,
                    coalesce(sum(m.clicks), 0) AS clicks,
                    coalesce(sum(m.leads), 0)  AS leads
             FROM campaign c JOIN campaign_metric m ON m.campaign_id = c.id
             GROUP BY c.id, c.name, c.platform
             ORDER BY 3 DESC LIMIT 5`,
          ),
        ]);
        const fbR = fb.rows[0];
        const igR = ig.rows[0];
        return {
          leadsBySource30d: leads.rows.map((r) => ({ label: r.kind, count: Number(r.c) })),
          socialStats: [
            ...lifetime.rows.map((r) => ({
              platform: r.platform,
              metric: r.metric,
              value: Number(r.value ?? 0),
              window: "lifetime" as const,
            })),
            ...daily.rows.map((r) => ({
              platform: r.platform,
              metric: r.metric,
              value: Number(r.value ?? 0),
              window: "28d" as const,
            })),
          ],
          engagement30d: {
            fbPosts: Number(fbR.posts),
            fbReactions: Number(fbR.reactions),
            fbComments: Number(fbR.comments),
            fbShares: Number(fbR.shares),
            igMedia: Number(igR.media),
            igLikes: Number(igR.likes),
            igComments: Number(igR.comments),
          },
          topCampaigns: campaigns.rows.map((r) => ({
            name: r.name,
            platform: r.platform,
            spend: Number(r.spend),
            clicks: Number(r.clicks),
            leads: Number(r.leads),
          })),
        };
      } catch {
        return mockRepositories.reports.marketingSocial();
      }
    },

    async serviceDesk(): Promise<ServiceDeskReport> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.serviceDesk();
      try {
        // ticket.status/queue are raw Autotask picklist ids (label lookup
        // deferred at 0074); only the fixed system statuses are named here.
        const [byStatus, byQueue, trend, totals, links] = await Promise.all([
          pool.query<{ k: string; c: string }>(
            `SELECT coalesce(status, 'unknown') AS k, count(*) AS c
             FROM ticket GROUP BY 1 ORDER BY 2 DESC`,
          ),
          pool.query<{ k: string | null; c: string }>(
            `SELECT queue AS k, count(*) AS c
             FROM ticket GROUP BY 1 ORDER BY 2 DESC`,
          ),
          pool.query<{ wk: string; c: string }>(
            `SELECT to_char(date_trunc('week', opened_at), 'YYYY-MM-DD') AS wk, count(*) AS c
             FROM ticket
             WHERE opened_at >= now() - interval '8 weeks'
             GROUP BY 1 ORDER BY 1`,
          ),
          pool.query<{ total: string; opened_30d: string }>(
            `SELECT count(*) AS total,
                    count(*) FILTER (WHERE opened_at >= now() - interval '30 days') AS opened_30d
             FROM ticket`,
          ),
          pool.query<{ c: string }>(`SELECT count(*) AS c FROM defender_incident_ticket_link`),
        ]);
        return {
          byStatus: byStatus.rows.map((r) => ({
            label: labelAutotaskStatus(r.k),
            count: Number(r.c),
          })),
          byQueue: byQueue.rows.map((r) => ({
            label: r.k == null || r.k === "" ? "unassigned" : `Queue ${r.k}`,
            count: Number(r.c),
          })),
          openedByWeek: trend.rows.map((r) => ({ label: r.wk, count: Number(r.c) })),
          total: Number(totals.rows[0].total),
          opened30d: Number(totals.rows[0].opened_30d),
          defenderLinked: Number(links.rows[0].c),
        };
      } catch {
        return mockRepositories.reports.serviceDesk();
      }
    },

    async securityFleet(): Promise<SecurityFleetReport> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.securityFleet();
      try {
        // Fleet-wide rollup across ALL mapped tenants (ADR-0062) — the
        // account-scoped reads on /security stay per-tenant (ADR-0051).
        // Bronze flags are text (0038 envelope): case-folded matches (#258).
        const [posture, mfa, defender, intune, exposures] = await Promise.all([
          pool.query<{
            tenants: string;
            cur: string;
            max: string;
            compliant: string;
            drift: string;
            ungoverned: string;
            missing: string;
            exposures_open: string;
          }>(
            `SELECT count(*) AS tenants,
                    coalesce(sum(secure_score_current), 0) AS cur,
                    coalesce(sum(secure_score_max), 0)     AS max,
                    coalesce(sum(policies_compliant), 0)   AS compliant,
                    coalesce(sum(policies_drift), 0)       AS drift,
                    coalesce(sum(policies_ungoverned), 0)  AS ungoverned,
                    coalesce(sum(policies_missing), 0)     AS missing,
                    coalesce(sum(exposures_open), 0)       AS exposures_open
             FROM tenant_posture`,
          ),
          pool.query<{ registered: string; total: string }>(
            `SELECT count(*) FILTER (WHERE lower(COALESCE(is_mfa_registered, '')) = 'true')
                      AS registered,
                    count(*) AS total
             FROM entra_auth_methods`,
          ),
          pool.query<{ sev: string; c: string }>(
            `SELECT coalesce(nullif(severity, ''), 'unknown') AS sev, count(*) AS c
             FROM defender_incidents
             WHERE lower(COALESCE(status, '')) NOT IN ('resolved', 'redirected')
             GROUP BY 1 ORDER BY 2 DESC`,
          ),
          pool.query<{ compliant: string; total: string }>(
            `SELECT count(*) FILTER (WHERE lower(COALESCE(compliance_state, '')) = 'compliant')
                      AS compliant,
                    count(*) AS total
             FROM intune_managed_devices`,
          ),
          pool.query<{ c: string }>(
            `SELECT count(*) AS c FROM credential_exposure WHERE status <> 'resolved'`,
          ),
        ]);
        const p = posture.rows[0];
        const max = Number(p.max);
        return {
          tenants: Number(p.tenants),
          secureScorePct: max > 0 ? Math.round((Number(p.cur) / max) * 100) : null,
          policyMix: [
            { label: "compliant", count: Number(p.compliant) },
            { label: "drift", count: Number(p.drift) },
            { label: "ungoverned", count: Number(p.ungoverned) },
            { label: "missing", count: Number(p.missing) },
          ],
          mfa: {
            registered: Number(mfa.rows[0].registered),
            total: Number(mfa.rows[0].total),
          },
          defenderOpenBySeverity: defender.rows.map((r) => ({
            label: r.sev,
            count: Number(r.c),
          })),
          intune: {
            compliant: Number(intune.rows[0].compliant),
            total: Number(intune.rows[0].total),
          },
          exposuresOpen: Number(exposures.rows[0].c),
        };
      } catch {
        return mockRepositories.reports.securityFleet();
      }
    },

    async timeEfficiency(includeLaborCost: boolean): Promise<TimeEfficiencyReport> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.timeEfficiency(includeLaborCost);
      try {
        // Utilization is COMP-FREE: the split of authoritative attendance minutes
        // (silver time_record, kind='attendance' — the website source is the source
        // of truth, ADR-0082) across the billable/internal/admin categories.
        // Allocation rows (autotask) carry a null category and are excluded.
        const util = await pool.query<{ billable: string; internal: string; admin: string }>(
          `SELECT coalesce(sum(minutes) FILTER (WHERE category = 'billable'), 0) AS billable,
                  coalesce(sum(minutes) FILTER (WHERE category = 'internal'), 0) AS internal,
                  coalesce(sum(minutes) FILTER (WHERE category = 'admin'),    0) AS admin
             FROM time_record
            WHERE kind = 'attendance'`,
        );
        const u = util.rows[0];
        const utilization = {
          billableMinutes: Number(u.billable),
          internalMinutes: Number(u.internal),
          adminMinutes: Number(u.admin),
        };

        // Labor cost is COMP-DERIVED and finance/admin-only — the query runs ONLY
        // when the caller is gated in, so pay_rate is never read otherwise. It is
        // AGGREGATE-ONLY (sum over employees); no per-person rate ever leaves here.
        // Effective rate = the latest pay_rate effective on/before the week start
        // (salaried folded to hourly at the 2080-hr convention). Counts corrected,
        // approved hours (state in approved/payroll_approved/paid).
        let laborCost: TimeEfficiencyReport["laborCost"] = null;
        if (includeLaborCost) {
          const cost = await pool.query<{ minutes: string; total: string }>(
            `SELECT coalesce(sum(ps.approved_minutes), 0)                       AS minutes,
                    coalesce(sum((ps.approved_minutes / 60.0) * pr.eff_hourly), 0) AS total
               FROM timesheet_payroll_status ps
               JOIN LATERAL (
                 SELECT CASE WHEN p.rate_kind = 'hourly' THEN p.hourly_rate
                             ELSE p.salaried_annual / 2080.0 END AS eff_hourly
                   FROM pay_rate p
                  WHERE p.app_user_id = ps.app_user_id
                    AND p.effective_from <= ps.week_start
                  ORDER BY p.effective_from DESC
                  LIMIT 1
               ) pr ON true
              WHERE ps.state IN ('approved', 'payroll_approved', 'paid')`,
          );
          const approvedHours = Math.round(Number(cost.rows[0].minutes) / 60);
          const totalCost = Math.round(Number(cost.rows[0].total));
          laborCost = {
            approvedHours,
            totalCost,
            blendedHourlyRate: approvedHours > 0 ? Math.round(totalCost / approvedHours) : null,
          };
        }
        return { utilization, laborCost };
      } catch {
        return mockRepositories.reports.timeEfficiency(includeLaborCost);
      }
    },

    async expenseAnalytics(): Promise<ExpenseAnalyticsReport> {
      const pool = getPool();
      if (!pool) return mockRepositories.reports.expenseAnalytics();
      try {
        // COMP-FREE: every figure is an aggregate of expense_item.amount (already
        // the reimbursement dollar — mileage amount is pre-derived by the backend,
        // the sole reader of mileage_rate). This read NEVER joins mileage_rate /
        // pay_rate / any comp store, and never selects a row-level person/merchant.
        // The GUI gates the whole section to finance|admin (canSeeLaborCost), like
        // Time Efficiency. Build-ahead: empty/zero until expense_item carries rows.

        // Totals + the reimbursable/billable split. Reimbursable and billable are
        // INDEPENDENT legs (ADR-0083) — an item can be both — so they sum separately.
        const totals = await pool.query<{
          reimbursable: string;
          billable: string;
          total: string;
          non_reimbursable: string;
        }>(
          `SELECT coalesce(sum(amount) FILTER (WHERE reimbursable), 0)      AS reimbursable,
                  coalesce(sum(amount) FILTER (WHERE billable), 0)          AS billable,
                  coalesce(sum(amount), 0)                                  AS total,
                  coalesce(sum(amount) FILTER (WHERE NOT reimbursable), 0)  AS non_reimbursable
             FROM expense_item`,
        );
        const t = totals.rows[0];
        const totalReimbursable = Math.round(Number(t.reimbursable));
        const totalBillable = Math.round(Number(t.billable));
        const totalSpend = Math.round(Number(t.total));
        const reimbursableSplit: CountDatum[] = [
          { label: "reimbursable", count: totalReimbursable },
          { label: "non-reimbursable", count: Math.round(Number(t.non_reimbursable)) },
        ];

        // Spend by category — the clean website-facing category display name
        // (uncategorized rows fold into an "uncategorized" bucket). No comp data.
        const byCategoryRows = await pool.query<{ label: string; spend: string }>(
          `SELECT coalesce(c.display_name, 'uncategorized') AS label,
                  coalesce(sum(ei.amount), 0)               AS spend
             FROM expense_item ei
             LEFT JOIN expense_category c ON c.id = ei.category_id
            GROUP BY coalesce(c.display_name, 'uncategorized')
            ORDER BY spend DESC`,
        );

        // Spend by employee — display name only (display_name|email), aggregate
        // dollars. This is a NAME label, not row-level PII (no merchant/desc/amount
        // per item). Mirrors the time-tracking employee_name idiom.
        const byEmployeeRows = await pool.query<{ label: string; spend: string }>(
          `SELECT coalesce(u.display_name, u.email) AS label,
                  coalesce(sum(ei.amount), 0)        AS spend
             FROM expense_item ei
             JOIN app_user u ON u.id = ei.app_user_id
            GROUP BY coalesce(u.display_name, u.email)
            ORDER BY spend DESC`,
        );

        // Spend by month (item_date month), last 12 months.
        const byMonthRows = await pool.query<{ label: string; spend: string }>(
          `SELECT to_char(date_trunc('month', item_date), 'YYYY-MM') AS label,
                  coalesce(sum(amount), 0)                            AS spend
             FROM expense_item
            WHERE item_date >= (date_trunc('month', CURRENT_DATE) - interval '11 months')
            GROUP BY date_trunc('month', item_date)
            ORDER BY date_trunc('month', item_date)`,
        );

        // Report count per lifecycle state.
        const stateRows = await pool.query<{ label: string; c: string }>(
          `SELECT state AS label, count(*) AS c FROM expense_report GROUP BY state`,
        );

        // Open policy violations by severity (the memory-jogger rollup) — derived
        // view over expense_item + caps + active rules. Pre-attest signal only.
        const violationRows = await pool.query<{ label: string; c: string }>(
          `SELECT severity AS label, count(*) AS c
             FROM expense_policy_violation GROUP BY severity`,
        );

        // Reimbursement reconciliation verdict counts.
        const verdictRows = await pool.query<{ label: string; c: string }>(
          `SELECT verdict AS label, count(*) AS c
             FROM expense_reconciliation GROUP BY verdict`,
        );

        const toSpend = (rows: { label: string; spend: string }[]): CountDatum[] =>
          rows.map((r) => ({ label: r.label, count: Math.round(Number(r.spend)) }));
        const toCount = (rows: { label: string; c: string }[]): CountDatum[] =>
          rows.map((r) => ({ label: r.label, count: Number(r.c) }));

        return {
          totalReimbursable,
          totalBillable,
          totalSpend,
          reimbursableSplit,
          byCategory: toSpend(byCategoryRows.rows),
          byEmployee: toSpend(byEmployeeRows.rows),
          byMonth: toSpend(byMonthRows.rows),
          reportsByState: toCount(stateRows.rows),
          violationsBySeverity: toCount(violationRows.rows),
          reconciliationByVerdict: toCount(verdictRows.rows),
        };
      } catch {
        return mockRepositories.reports.expenseAnalytics();
      }
    },
  },

  engagements: {
    async getQuestions(kind: string): Promise<QuestionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.getQuestions(kind);
      try {
        const { rows } = await pool.query<{
          id: string;
          key: string;
          prompt: string;
          help_text: string | null;
          response_type: string;
          options: string[] | null;
          dimension: string | null;
          ordinal: number;
          required: boolean;
        }>(
          `SELECT q.id, q.key, q.prompt, q.help_text, q.response_type, q.options,
                  q.dimension, q.ordinal, q.required
           FROM question q
           JOIN question_template t ON t.id = q.template_id
           WHERE t.kind = $1::engagement_kind AND t.status = 'active' AND q.active = true
             AND t.version = (SELECT max(version) FROM question_template
                              WHERE kind = $1::engagement_kind AND status = 'active')
           ORDER BY q.ordinal`,
          [kind],
        );
        return rows.map((r) => ({
          id: r.id,
          key: r.key,
          prompt: r.prompt,
          helpText: r.help_text,
          responseType: r.response_type,
          options: r.options,
          dimension: r.dimension,
          ordinal: r.ordinal,
          required: r.required,
          active: true,
        }));
      } catch {
        return mockRepositories.engagements.getQuestions(kind);
      }
    },

    async getActiveTemplate(kind: string): Promise<QuestionTemplateRow | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          kind: string;
          version: number;
          title: string;
        }>(
          `SELECT id, kind, version, title FROM question_template
           WHERE kind = $1::engagement_kind AND status = 'active'
           ORDER BY version DESC LIMIT 1`,
          [kind],
        );
        return rows[0] ?? null;
      } catch {
        return null;
      }
    },

    async listQuestionsForEditor(kind: string): Promise<QuestionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listQuestionsForEditor(kind);
      try {
        const { rows } = await pool.query<{
          id: string;
          key: string;
          prompt: string;
          help_text: string | null;
          response_type: string;
          options: string[] | null;
          dimension: string | null;
          ordinal: number;
          required: boolean;
          active: boolean;
        }>(
          `SELECT q.id, q.key, q.prompt, q.help_text, q.response_type, q.options,
                  q.dimension, q.ordinal, q.required, q.active
           FROM question q
           JOIN question_template t ON t.id = q.template_id
           WHERE t.kind = $1::engagement_kind AND t.status = 'active'
             AND t.version = (SELECT max(version) FROM question_template
                              WHERE kind = $1::engagement_kind AND status = 'active')
           ORDER BY q.ordinal, q.created_at`,
          [kind],
        );
        return rows.map((r) => ({
          id: r.id,
          key: r.key,
          prompt: r.prompt,
          helpText: r.help_text,
          responseType: r.response_type,
          options: r.options,
          dimension: r.dimension,
          ordinal: r.ordinal,
          required: r.required,
          active: r.active,
        }));
      } catch {
        return mockRepositories.engagements.listQuestionsForEditor(kind);
      }
    },

    async getQuestion(id: string): Promise<QuestionEditable | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          key: string;
          prompt: string;
          help_text: string | null;
          response_type: string;
          options: string[] | null;
          dimension: string | null;
          ordinal: number;
          required: boolean;
          active: boolean;
        }>(
          `SELECT id, key, prompt, help_text, response_type, options, dimension,
                  ordinal, required, active
           FROM question WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          key: r.key,
          prompt: r.prompt,
          helpText: r.help_text,
          responseType: r.response_type,
          options: r.options,
          dimension: r.dimension,
          ordinal: r.ordinal,
          required: r.required,
          active: r.active,
        };
      } catch {
        return null;
      }
    },

    async createQuestion(kind: string, input: QuestionInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.createQuestion(kind, input);
      // Resolve (or create) the active template for this kind, then add the question.
      const { rows: t } = await pool.query<{ id: string }>(
        `SELECT id FROM question_template
         WHERE kind = $1::engagement_kind AND status = 'active'
         ORDER BY version DESC LIMIT 1`,
        [kind],
      );
      let templateId = t[0]?.id;
      if (!templateId) {
        const { rows: created } = await pool.query<{ id: string }>(
          `INSERT INTO question_template (kind, version, title)
           VALUES ($1::engagement_kind, 1, $2) RETURNING id`,
          [kind, `${kind} questions (v1)`],
        );
        templateId = created[0].id;
      }
      const { rows: ins } = await pool.query<{ id: string }>(
        `INSERT INTO question
           (template_id, key, prompt, help_text, response_type, options, dimension,
            ordinal, required, active)
         VALUES ($1, $2, $3, $4, $5::question_response_type, $6::jsonb, $7, $8, $9, $10)
         RETURNING id`,
        [
          templateId,
          input.key,
          input.prompt,
          nullIfEmpty(input.helpText),
          input.responseType,
          input.options == null ? null : JSON.stringify(input.options),
          nullIfEmpty(input.dimension),
          input.ordinal,
          input.required,
          input.active,
        ],
      );
      // Mirror the home-template membership into the many-to-many (0040).
      await pool.query(
        `INSERT INTO question_template_question (template_id, question_id, ordinal, required)
         VALUES ($1, $2, $3, $4) ON CONFLICT (template_id, question_id) DO NOTHING`,
        [templateId, ins[0].id, input.ordinal, input.required],
      );
    },

    async updateQuestion(id: string, input: QuestionInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.updateQuestion(id, input);
      await pool.query(
        `UPDATE question
         SET key = $1, prompt = $2, help_text = $3, response_type = $4::question_response_type,
             options = $5::jsonb, dimension = $6, ordinal = $7, required = $8, active = $9
         WHERE id = $10`,
        [
          input.key,
          input.prompt,
          nullIfEmpty(input.helpText),
          input.responseType,
          input.options == null ? null : JSON.stringify(input.options),
          nullIfEmpty(input.dimension),
          input.ordinal,
          input.required,
          input.active,
          id,
        ],
      );
    },

    async listDiscoveryCalls(): Promise<DiscoveryCallRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listDiscoveryCalls();
      try {
        const { rows } = await pool.query<{
          id: string;
          account: string;
          status: string;
          verdict: string | null;
          held_at: Date | null;
          next_step: string | null;
        }>(
          `SELECT d.id, a.name AS account, d.status, d.verdict, d.held_at, d.next_step
           FROM discovery_call d JOIN account a ON a.id = d.account_id
           ORDER BY d.held_at DESC NULLS LAST, d.created_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          account: r.account,
          status: r.status,
          verdict: r.verdict,
          held: fmtDate(r.held_at),
          nextStep: r.next_step,
        }));
      } catch {
        return mockRepositories.engagements.listDiscoveryCalls();
      }
    },

    async getDiscoveryCall(id: string): Promise<DiscoveryCallDetail | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          account_id: string;
          opportunity_id: string | null;
          contact_id: string | null;
          template_id: string | null;
          status: string;
          held_at: Date | null;
          verdict: string | null;
          verdict_reason: string | null;
          next_step: string | null;
          sbr_cadence: string | null;
        }>(
          `SELECT id, account_id, opportunity_id, contact_id, template_id, status,
                  held_at, verdict, verdict_reason, next_step, sbr_cadence
           FROM discovery_call WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        const { rows: answers } = await pool.query<{
          question_id: string;
          key: string;
          prompt: string;
          response_type: string;
          value: string | null;
        }>(
          `SELECT ea.question_id, q.key, q.prompt, q.response_type,
                  COALESCE(ea.value_text, ea.value_number::text, ea.value_bool::text,
                           ea.value_date::text, ea.value_json::text) AS value
           FROM engagement_answer ea JOIN question q ON q.id = ea.question_id
           WHERE ea.engagement_type = 'discovery' AND ea.engagement_id = $1
           ORDER BY q.ordinal`,
          [id],
        );
        return {
          id: r.id,
          accountId: r.account_id,
          opportunityId: r.opportunity_id,
          contactId: r.contact_id,
          templateId: r.template_id,
          status: r.status,
          heldAt: fmtDate(r.held_at),
          verdict: r.verdict,
          verdictReason: r.verdict_reason,
          nextStep: r.next_step,
          sbrCadence: r.sbr_cadence,
          answers: answers.map((a) => ({
            questionId: a.question_id,
            key: a.key,
            prompt: a.prompt,
            responseType: a.response_type,
            value: a.value,
          })),
        };
      } catch {
        return null;
      }
    },

    async createDiscoveryCall(input: DiscoveryCallInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.createDiscoveryCall(input);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO discovery_call
           (account_id, opportunity_id, contact_id, template_id, status, held_at,
            verdict, verdict_reason, next_step, sbr_cadence)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::discovery_verdict, $8, $9, $10)
         RETURNING id`,
        [
          input.accountId,
          nullIfEmpty(input.opportunityId),
          nullIfEmpty(input.contactId),
          nullIfEmpty(input.templateId),
          input.status,
          nullIfEmpty(input.heldAt),
          nullIfEmpty(input.verdict),
          nullIfEmpty(input.verdictReason),
          nullIfEmpty(input.nextStep),
          nullIfEmpty(input.sbrCadence),
        ],
      );
      return rows[0].id;
    },

    async updateDiscoveryCall(id: string, input: DiscoveryCallInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.updateDiscoveryCall(id, input);
      await pool.query(
        `UPDATE discovery_call
         SET account_id = $1, opportunity_id = $2, contact_id = $3, template_id = $4,
             status = $5, held_at = $6::timestamptz, verdict = $7::discovery_verdict,
             verdict_reason = $8, next_step = $9, sbr_cadence = $10
         WHERE id = $11`,
        [
          input.accountId,
          nullIfEmpty(input.opportunityId),
          nullIfEmpty(input.contactId),
          nullIfEmpty(input.templateId),
          input.status,
          nullIfEmpty(input.heldAt),
          nullIfEmpty(input.verdict),
          nullIfEmpty(input.verdictReason),
          nullIfEmpty(input.nextStep),
          nullIfEmpty(input.sbrCadence),
          id,
        ],
      );
    },

    async deleteDiscoveryCall(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.deleteDiscoveryCall(id);
      await pool.query(`DELETE FROM discovery_call WHERE id = $1`, [id]);
    },

    async listSbrs(): Promise<SbrRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listSbrs();
      try {
        const { rows } = await pool.query<{
          id: string;
          account: string;
          review_date: Date;
          period_label: string | null;
          status: string;
        }>(
          `SELECT s.id, a.name AS account, s.review_date, s.period_label, s.status
           FROM strategic_business_review s JOIN account a ON a.id = s.account_id
           ORDER BY s.review_date DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          account: r.account,
          reviewDate: fmtDate(r.review_date) ?? "",
          periodLabel: r.period_label,
          status: r.status,
        }));
      } catch {
        return mockRepositories.engagements.listSbrs();
      }
    },

    async getSbr(id: string): Promise<SbrDetail | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          account_id: string;
          contact_id: string | null;
          benchmark_assessment_id: string | null;
          review_date: Date;
          period_label: string | null;
          status: string;
          concerns: string | null;
          summary: string | null;
          next_actions: string | null;
        }>(
          `SELECT id, account_id, contact_id, benchmark_assessment_id, review_date,
                  period_label, status, concerns, summary, next_actions
           FROM strategic_business_review WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        const [{ rows: scores }, { rows: tickets }] = await Promise.all([
          pool.query<{ dimension: string; rating: string | null; note: string | null }>(
            `SELECT dimension, rating, note FROM sbr_dimension_score
             WHERE sbr_id = $1 ORDER BY dimension`,
            [id],
          ),
          pool.query<{
            id: string;
            account: string;
            number: string | null;
            title: string;
            status: string | null;
            priority: string | null;
            opened_at: Date | null;
          }>(
            // Manually linked tickets (sbr_ticket) plus the backend-filed
            // business-review queue ticket (ticket.source_sbr_id, backend #19/#99).
            `SELECT DISTINCT t.id, a.name AS account, t.number, t.title, t.status,
                    t.priority, t.opened_at
             FROM ticket t
             JOIN account a ON a.id = t.account_id
             LEFT JOIN sbr_ticket st ON st.ticket_id = t.id AND st.sbr_id = $1
             WHERE st.sbr_id IS NOT NULL OR t.source_sbr_id = $1
             ORDER BY t.opened_at DESC NULLS LAST`,
            [id],
          ),
        ]);
        return {
          id: r.id,
          accountId: r.account_id,
          contactId: r.contact_id,
          benchmarkAssessmentId: r.benchmark_assessment_id,
          reviewDate: fmtDate(r.review_date) ?? "",
          periodLabel: r.period_label,
          status: r.status,
          concerns: r.concerns,
          summary: r.summary,
          nextActions: r.next_actions,
          dimensionScores: scores.map((s) => ({
            dimension: s.dimension,
            rating: s.rating,
            note: s.note,
          })),
          tickets: tickets.map((t) => ({
            id: t.id,
            account: t.account,
            number: t.number,
            title: t.title,
            status: t.status,
            priority: t.priority,
            opened: fmtDate(t.opened_at),
          })),
        };
      } catch {
        return null;
      }
    },

    async createSbr(input: SbrInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.createSbr(input);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO strategic_business_review
           (account_id, contact_id, benchmark_assessment_id, review_date, period_label,
            status, concerns, summary, next_actions)
         VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          input.accountId,
          nullIfEmpty(input.contactId),
          nullIfEmpty(input.benchmarkAssessmentId),
          input.reviewDate,
          nullIfEmpty(input.periodLabel),
          input.status,
          nullIfEmpty(input.concerns),
          nullIfEmpty(input.summary),
          nullIfEmpty(input.nextActions),
        ],
      );
      return rows[0].id;
    },

    async updateSbr(id: string, input: SbrInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.updateSbr(id, input);
      await pool.query(
        `UPDATE strategic_business_review
         SET account_id = $1, contact_id = $2, benchmark_assessment_id = $3,
             review_date = $4::date, period_label = $5, status = $6, concerns = $7,
             summary = $8, next_actions = $9
         WHERE id = $10`,
        [
          input.accountId,
          nullIfEmpty(input.contactId),
          nullIfEmpty(input.benchmarkAssessmentId),
          input.reviewDate,
          nullIfEmpty(input.periodLabel),
          input.status,
          nullIfEmpty(input.concerns),
          nullIfEmpty(input.summary),
          nullIfEmpty(input.nextActions),
          id,
        ],
      );
    },

    async deleteSbr(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.deleteSbr(id);
      await pool.query(`DELETE FROM strategic_business_review WHERE id = $1`, [id]);
    },

    async saveAnswers(
      engagementType: string,
      engagementId: string,
      answers: AnswerInput[],
    ): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.saveAnswers(engagementType, engagementId, answers);
      // One upsert per answer; the UNIQUE (type,id,question) constraint keeps one row.
      // Provenance (ADR-0027): agent/automation answers carry source/confidence/status;
      // omitted fields default to human/confirmed for backward compatibility.
      for (const a of answers) {
        await pool.query(
          `INSERT INTO engagement_answer
             (engagement_type, engagement_id, question_id, value_text, value_number,
              value_bool, value_json, value_date, answered_by_contact_id,
              source, confidence, status)
           VALUES ($1::engagement_kind, $2, $3, $4, $5::numeric, $6, $7::jsonb, $8::date, $9,
                   COALESCE($10, 'human'), $11::numeric, COALESCE($12, 'confirmed'))
           ON CONFLICT (engagement_type, engagement_id, question_id) DO UPDATE SET
             value_text = excluded.value_text, value_number = excluded.value_number,
             value_bool = excluded.value_bool, value_json = excluded.value_json,
             value_date = excluded.value_date,
             answered_by_contact_id = excluded.answered_by_contact_id, answered_at = now(),
             source = excluded.source, confidence = excluded.confidence, status = excluded.status`,
          [
            engagementType,
            engagementId,
            a.questionId,
            nullIfEmpty(a.valueText),
            nullIfEmpty(a.valueNumber),
            a.valueBool,
            a.valueJson == null ? null : JSON.stringify(a.valueJson),
            nullIfEmpty(a.valueDate),
            nullIfEmpty(a.answeredByContactId),
            a.source ?? null,
            nullIfEmpty(a.confidence ?? null),
            a.status ?? null,
          ],
        );
      }
    },

    async listAnswersForReview(
      engagementType: string,
      engagementId: string,
    ): Promise<AnswerReviewRow[]> {
      const pool = getPool();
      if (!pool) {
        return mockRepositories.engagements.listAnswersForReview(engagementType, engagementId);
      }
      try {
        const { rows } = await pool.query<{
          id: string;
          prompt: string;
          value: string | null;
          source: string;
          confidence: string | null;
          status: string;
        }>(
          `SELECT ea.id, q.prompt,
                  COALESCE(ea.value_text, ea.value_number::text, ea.value_bool::text,
                           ea.value_date::text, ea.value_json::text) AS value,
                  ea.source, ea.confidence, ea.status
           FROM engagement_answer ea JOIN question q ON q.id = ea.question_id
           WHERE ea.engagement_type = $1::engagement_kind AND ea.engagement_id = $2
           ORDER BY q.ordinal`,
          [engagementType, engagementId],
        );
        return rows.map((r) => ({
          id: r.id,
          prompt: r.prompt,
          value: r.value,
          source: r.source,
          confidence: r.confidence != null ? Number(r.confidence) : null,
          status: r.status,
        }));
      } catch {
        return mockRepositories.engagements.listAnswersForReview(engagementType, engagementId);
      }
    },

    async confirmAnswer(answerId: string, userId: string | null): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.confirmAnswer(answerId, userId);
      await pool.query(
        `UPDATE engagement_answer
         SET status = 'confirmed', approved_by_user_id = $2, approved_at = now()
         WHERE id = $1`,
        [answerId, userId],
      );
    },

    async rejectAnswer(answerId: string, userId: string | null): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.rejectAnswer(answerId, userId);
      await pool.query(
        `UPDATE engagement_answer
         SET status = 'rejected', approved_by_user_id = $2, approved_at = now()
         WHERE id = $1`,
        [answerId, userId],
      );
    },

    async saveSbrScores(sbrId: string, scores: SbrScoreInput[]): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.saveSbrScores(sbrId, scores);
      for (const s of scores) {
        await pool.query(
          `INSERT INTO sbr_dimension_score (sbr_id, dimension, rating, note)
           VALUES ($1, $2, $3::assessment_rating, $4)
           ON CONFLICT (sbr_id, dimension) DO UPDATE SET
             rating = excluded.rating, note = excluded.note`,
          [sbrId, s.dimension, nullIfEmpty(s.rating), nullIfEmpty(s.note)],
        );
      }
    },

    async setSbrTickets(sbrId: string, ticketIds: string[]): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.setSbrTickets(sbrId, ticketIds);
      // Replace the link set: clear, then insert the chosen tickets.
      await pool.query(`DELETE FROM sbr_ticket WHERE sbr_id = $1`, [sbrId]);
      for (const ticketId of ticketIds) {
        await pool.query(
          `INSERT INTO sbr_ticket (sbr_id, ticket_id) VALUES ($1, $2)
           ON CONFLICT (sbr_id, ticket_id) DO NOTHING`,
          [sbrId, ticketId],
        );
      }
    },

    async listAssessmentArtifacts(assessmentId: string): Promise<ArtifactRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listAssessmentArtifacts(assessmentId);
      try {
        const { rows } = await pool.query<{
          id: string;
          source: string;
          kind: string;
          title: string | null;
          dimension: string | null;
          collected_at: Date | null;
          summary_gold: string | null;
        }>(
          `SELECT id, source, kind, title, dimension, collected_at, summary_gold
           FROM assessment_artifact WHERE assessment_id = $1 ORDER BY collected_at DESC`,
          [assessmentId],
        );
        return rows.map((r) => ({
          id: r.id,
          source: r.source,
          kind: r.kind,
          title: r.title,
          dimension: r.dimension,
          collectedAt: fmtDate(r.collected_at),
          summary: r.summary_gold,
        }));
      } catch {
        return mockRepositories.engagements.listAssessmentArtifacts(assessmentId);
      }
    },

    async spawnOpportunity(input: SpawnOpportunityInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.spawnOpportunity(input);
      await pool.query(
        `INSERT INTO opportunity
           (account_id, name, sales_stage, amount_mrr, source,
            source_discovery_id, source_assessment_id, source_sbr_id)
         VALUES ($1, $2, $3::opportunity_sales_stage, $4::numeric, 'manual', $5, $6, $7)`,
        [
          input.accountId,
          input.name,
          input.salesStage,
          nullIfEmpty(input.amountMrr),
          nullIfEmpty(input.sourceDiscoveryId),
          nullIfEmpty(input.sourceAssessmentId),
          nullIfEmpty(input.sourceSbrId),
        ],
      );
    },

    async spawnProject(input: SpawnProjectInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.spawnProject(input);
      // `type` is the stable project_type key (ADR-0052: table, not enum).
      await pool.query(
        `INSERT INTO project
           (account_id, name, project_type_id, status, source_assessment_id, source_sbr_id)
         VALUES ($1, $2, (SELECT id FROM project_type WHERE key = $3),
                 'not_started', $4, $5)`,
        [
          input.accountId,
          input.name,
          input.type,
          nullIfEmpty(input.sourceAssessmentId),
          nullIfEmpty(input.sourceSbrId),
        ],
      );
    },

    async spawnTicket(input: SpawnTicketInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.spawnTicket(input);
      await pool.query(
        `INSERT INTO ticket
           (account_id, title, source, status, source_assessment_id, source_sbr_id)
         VALUES ($1, $2, 'manual', 'new', $3, $4)`,
        [
          input.accountId,
          input.title,
          nullIfEmpty(input.sourceAssessmentId),
          nullIfEmpty(input.sourceSbrId),
        ],
      );
    },

    async getTicketByRef(externalRef: string): Promise<TicketRow | null> {
      const pool = getPool();
      if (!pool) return null;
      try {
        const { rows } = await pool.query<{
          id: string;
          account: string;
          number: string | null;
          title: string;
          status: string | null;
          priority: string | null;
          opened_at: Date | null;
        }>(
          `SELECT t.id, a.name AS account, t.number, t.title, t.status, t.priority, t.opened_at
           FROM ticket t JOIN account a ON a.id = t.account_id
           WHERE t.source = 'autotask' AND t.external_ref = $1
           LIMIT 1`,
          [externalRef],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          account: r.account,
          number: r.number,
          title: r.title,
          status: r.status,
          priority: r.priority,
          opened: fmtDate(r.opened_at),
        };
      } catch {
        return null;
      }
    },

    async listTickets(filter?: TicketFilter): Promise<TicketRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listTickets();
      try {
        // Compose the WHERE from the optional filters (ADR-0046). Parameterized
        // throughout — filter values never reach the SQL text.
        const where: string[] = [];
        const params: unknown[] = [];
        if (filter?.status) {
          params.push(filter.status);
          where.push(`t.status = $${params.length}`);
        }
        if (filter?.priority) {
          params.push(filter.priority);
          where.push(`t.priority = $${params.length}`);
        }
        if (filter?.accountId) {
          params.push(filter.accountId);
          where.push(`t.account_id = $${params.length}`);
        }
        // Queue (#219, migration 0074): raw Autotask queue_id values as text.
        if (filter?.queue) {
          params.push(filter.queue);
          where.push(`t.queue = $${params.length}`);
        }
        if (filter?.openedWithinDays && Number.isFinite(filter.openedWithinDays)) {
          params.push(Math.floor(filter.openedWithinDays));
          where.push(`t.opened_at >= now() - make_interval(days => $${params.length}::int)`);
        }
        // Free-text search (#852): case-insensitive across number, title, account name.
        // Parameterized — the % wrapping happens in the bound value, never the SQL text.
        if (filter?.query && filter.query.trim()) {
          params.push(`%${filter.query.trim()}%`);
          where.push(
            `(t.number ILIKE $${params.length} OR t.title ILIKE $${params.length} OR a.name ILIKE $${params.length})`,
          );
        }
        const { rows } = await pool.query<{
          id: string;
          account: string;
          number: string | null;
          title: string;
          status: string | null;
          priority: string | null;
          opened_at: Date | null;
        }>(
          `SELECT t.id, a.name AS account, t.number, t.title, t.status, t.priority, t.opened_at
           FROM ticket t JOIN account a ON a.id = t.account_id
           ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
           ORDER BY t.opened_at DESC NULLS LAST`,
          params,
        );
        return rows.map((r) => ({
          id: r.id,
          account: r.account,
          number: r.number,
          title: r.title,
          status: r.status,
          priority: r.priority,
          opened: fmtDate(r.opened_at),
        }));
      } catch {
        return mockRepositories.engagements.listTickets();
      }
    },

    async listTicketSlaBreaches(): Promise<TicketSlaBreachRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listTicketSlaBreaches();
      try {
        // Read the `ticket_sla_breach` view (migration 0118, ADR-0074 §2). A plain
        // projection — every read recomputes against the latest pulled silver ticket.
        // `resolution_time_remaining` is a Postgres interval → cast to text so it maps
        // straight to the typed string field (no driver-dependent interval object).
        const { rows } = await pool.query<{
          ticket_id: string;
          account_id: string | null;
          number: string | null;
          status: string | null;
          priority: string | null;
          opened_at: Date | null;
          closed_at: Date | null;
          sla_applies: boolean;
          sla_id: string | null;
          is_open: boolean;
          first_response_due_at: Date | null;
          resolution_due_at: Date | null;
          first_response_breached: boolean;
          resolution_breached: boolean;
          resolution_time_remaining: string | null;
          sla_state: TicketSlaState;
        }>(
          `SELECT ticket_id, account_id, number, status, priority,
                  opened_at, closed_at, sla_applies, sla_id, is_open,
                  first_response_due_at, resolution_due_at,
                  first_response_breached, resolution_breached,
                  resolution_time_remaining::text AS resolution_time_remaining,
                  sla_state
           FROM ticket_sla_breach`,
        );
        return rows.map((r) => ({
          ticketId: r.ticket_id,
          accountId: r.account_id,
          number: r.number,
          status: r.status,
          priority: r.priority,
          openedAt: fmtIso(r.opened_at),
          closedAt: fmtIso(r.closed_at),
          slaApplies: r.sla_applies,
          slaId: r.sla_id,
          isOpen: r.is_open,
          firstResponseDueAt: fmtIso(r.first_response_due_at),
          resolutionDueAt: fmtIso(r.resolution_due_at),
          firstResponseBreached: r.first_response_breached,
          resolutionBreached: r.resolution_breached,
          resolutionTimeRemaining: r.resolution_time_remaining,
          slaState: r.sla_state,
        }));
      } catch {
        return mockRepositories.engagements.listTicketSlaBreaches();
      }
    },

    async ticketFilterOptions(): Promise<TicketFilterOptions> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.ticketFilterOptions();
      try {
        const [statuses, priorities, queues] = await Promise.all([
          pool.query<{ v: string }>(
            `SELECT DISTINCT status AS v FROM ticket WHERE status IS NOT NULL ORDER BY 1`,
          ),
          pool.query<{ v: string }>(
            `SELECT DISTINCT priority AS v FROM ticket WHERE priority IS NOT NULL ORDER BY 1`,
          ),
          // Raw Autotask queue ids (#219). Guarded separately: until migration
          // 0074 is applied the column does not exist, and that must degrade to
          // "no queue select" — never break the status/priority filters.
          pool
            .query<{ v: string }>(
              `SELECT DISTINCT queue AS v FROM ticket WHERE queue IS NOT NULL ORDER BY 1`,
            )
            .catch(() => ({ rows: [] as Array<{ v: string }> })),
        ]);
        return {
          statuses: statuses.rows.map((r) => r.v),
          priorities: priorities.rows.map((r) => r.v),
          queues: queues.rows.map((r) => r.v),
        };
      } catch {
        return mockRepositories.engagements.ticketFilterOptions();
      }
    },

    async listSavedViews(entityType: string, viewerEmail: string | null): Promise<SavedViewRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listSavedViews(entityType, viewerEmail);
      try {
        const { rows } = await pool.query<{
          id: string;
          entity_type: string;
          name: string;
          owner: string | null;
          is_mine: boolean;
          is_shared: boolean;
          is_default: boolean;
          filters: Record<string, string> | null;
        }>(
          `SELECT v.id, v.entity_type, v.name, u.display_name AS owner,
                  COALESCE(u.email = $2, false) AS is_mine,
                  v.is_shared, v.is_default, v.filters
           FROM saved_view v JOIN app_user u ON u.id = v.owner_user_id
           WHERE v.entity_type = $1 AND (v.is_shared OR u.email = $2)
           ORDER BY COALESCE(u.email = $2, false) DESC, v.name`,
          [entityType, viewerEmail],
        );
        return rows.map((r) => ({
          id: r.id,
          entityType: r.entity_type,
          name: r.name,
          owner: r.owner,
          isMine: r.is_mine,
          isShared: r.is_shared,
          isDefault: r.is_default,
          filters: r.filters ?? {},
        }));
      } catch {
        return mockRepositories.engagements.listSavedViews(entityType, viewerEmail);
      }
    },

    async createSavedView(input: SavedViewInput, ownerEmail: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.createSavedView(input, ownerEmail);
      const { rows } = await pool.query<{ id: string }>(
        `SELECT id FROM app_user WHERE email = $1 ORDER BY updated_at DESC LIMIT 1`,
        [ownerEmail],
      );
      const ownerId = rows[0]?.id;
      if (!ownerId) {
        throw new Error(`No app_user for ${ownerEmail} — sign in once so the identity is mirrored.`);
      }
      if (input.isDefault) {
        // One default per (owner, entity): clear the previous one first.
        await pool.query(
          `UPDATE saved_view SET is_default = false, updated_at = now()
           WHERE owner_user_id = $1 AND entity_type = $2 AND is_default`,
          [ownerId, input.entityType],
        );
      }
      await pool.query(
        `INSERT INTO saved_view (entity_type, name, owner_user_id, is_shared, is_default, filters)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT (owner_user_id, entity_type, name) DO UPDATE
           SET is_shared = EXCLUDED.is_shared,
               is_default = EXCLUDED.is_default,
               filters = EXCLUDED.filters,
               updated_at = now()`,
        [
          input.entityType,
          input.name,
          ownerId,
          input.isShared,
          input.isDefault,
          JSON.stringify(input.filters),
        ],
      );
    },

    async updateSavedView(
      id: string,
      patch: { name?: string; isDefault?: boolean },
      ownerEmail: string,
    ): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.updateSavedView(id, patch, ownerEmail);
      if (patch.isDefault) {
        // One default per (owner, entity): clear the owner's previous default for
        // this view's entity type first (scoped by ownership, like the write below).
        await pool.query(
          `UPDATE saved_view SET is_default = false, updated_at = now()
           WHERE owner_user_id =
                 (SELECT id FROM app_user WHERE email = $2 ORDER BY updated_at DESC LIMIT 1)
             AND entity_type = (SELECT entity_type FROM saved_view WHERE id = $1)
             AND is_default`,
          [id, ownerEmail],
        );
      }
      // Owner-only: the WHERE clause is the enforcement — a non-owner id updates 0 rows.
      await pool.query(
        `UPDATE saved_view
         SET name = COALESCE($3, name),
             is_default = COALESCE($4, is_default),
             updated_at = now()
         WHERE id = $1
           AND owner_user_id =
               (SELECT id FROM app_user WHERE email = $2 ORDER BY updated_at DESC LIMIT 1)`,
        [id, ownerEmail, patch.name ?? null, patch.isDefault ?? null],
      );
    },

    async deleteSavedView(id: string, ownerEmail: string | null, asAdmin: boolean): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.deleteSavedView(id, ownerEmail, asAdmin);
      await pool.query(
        `DELETE FROM saved_view
         WHERE id = $1
           AND ($3 OR owner_user_id =
                (SELECT id FROM app_user WHERE email = $2 ORDER BY updated_at DESC LIMIT 1))`,
        [id, ownerEmail, asAdmin],
      );
    },

    async listContracts(): Promise<ContractRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listContracts();
      try {
        // Silver `contract` (ADR-0044) — typed columns, account pre-linked by the
        // pipeline merge; bronze stays the raw tier behind it.
        const { rows } = await pool.query<{
          id: string; account: string | null; name: string | null; number: string | null;
          status: string | null; contract_type: string | null; start_date: string | null; end_date: string | null;
          source: string;
        }>(
          `SELECT c.id::text AS id, a.name AS account, c.name, c.contract_number AS number,
                  c.status, c.contract_type, c.start_date::text AS start_date, c.end_date::text AS end_date,
                  c.source
             FROM contract c
             LEFT JOIN account a ON a.id = c.account_id
            ORDER BY c.name NULLS LAST`,
        );
        return rows.map((r) => ({
          id: r.id, account: r.account, name: r.name, number: r.number,
          status: r.status, contractType: r.contract_type, startDate: r.start_date, endDate: r.end_date,
          source: r.source,
        }));
      } catch {
        return mockRepositories.engagements.listContracts();
      }
    },

    async listTemplates(): Promise<QuestionTemplateRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.listTemplates();
      try {
        const { rows } = await pool.query<{ id: string; kind: string; version: number; title: string }>(
          `SELECT id, kind, version, title FROM question_template ORDER BY kind, version DESC`,
        );
        return rows.map((r) => ({ id: r.id, kind: r.kind, version: r.version, title: r.title }));
      } catch {
        return mockRepositories.engagements.listTemplates();
      }
    },

    async createTemplate(kind: string, title: string): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.createTemplate(kind, title);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO question_template (kind, version, title)
         VALUES ($1::engagement_kind, COALESCE((SELECT max(version) FROM question_template WHERE kind = $1::engagement_kind), 0) + 1, $2)
         RETURNING id`,
        [kind, title],
      );
      return rows[0].id;
    },

    async getQuestionTemplateIds(questionId: string): Promise<string[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.getQuestionTemplateIds(questionId);
      try {
        const { rows } = await pool.query<{ template_id: string }>(
          `SELECT template_id FROM question_template_question WHERE question_id = $1`,
          [questionId],
        );
        return rows.map((r) => r.template_id);
      } catch {
        return mockRepositories.engagements.getQuestionTemplateIds(questionId);
      }
    },

    async setQuestionTemplates(questionId: string, templateIds: string[]): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.engagements.setQuestionTemplates(questionId, templateIds);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`DELETE FROM question_template_question WHERE question_id = $1`, [questionId]);
        for (const tid of templateIds) {
          await client.query(
            `INSERT INTO question_template_question (template_id, question_id, ordinal, required)
             SELECT $1, $2, q.ordinal, q.required FROM question q WHERE q.id = $2
             ON CONFLICT (template_id, question_id) DO NOTHING`,
            [tid, questionId],
          );
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  },

  // ── Communications (ADR-0011) ─────────────────────────────────────────────
  comms: {
    async listInteractions(filter: InteractionFilter): Promise<InteractionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.comms.listInteractions(filter);
      try {
        const where: string[] = [];
        const params: unknown[] = [];
        if (filter.contactId) { params.push(filter.contactId); where.push(`i.contact_id = $${params.length}`); }
        if (filter.accountId) { params.push(filter.accountId); where.push(`i.account_id = $${params.length}`); }
        if (filter.source) { params.push(filter.source); where.push(`i.source = $${params.length}::interaction_source`); }
        if (filter.kind) { params.push(filter.kind); where.push(`i.kind = $${params.length}`); }
        if (filter.projectId) { params.push(filter.projectId); where.push(`i.project_id = $${params.length}`); }
        if (filter.noProject) where.push(`i.project_id IS NULL`);
        const limit = Math.min(Math.max(filter.limit ?? 200, 1), 500);
        const { rows } = await pool.query<InteractionDbRow>(
          `SELECT i.id, i.source::text AS source, i.kind, i.channel, i.direction::text AS direction,
                  i.subject, i.summary_gold, i.occurred_at,
                  u.display_name AS owner, c.full_name AS contact, a.name AS account
           FROM interaction i
           LEFT JOIN app_user u ON u.id = i.owner_user_id
           LEFT JOIN contact c ON c.id = i.contact_id
           LEFT JOIN account a ON a.id = i.account_id
           ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
           ORDER BY i.occurred_at DESC
           LIMIT ${limit}`,
          params,
        );
        return rows.map(mapInteraction);
      } catch {
        return mockRepositories.comms.listInteractions(filter);
      }
    },

    async listInteractionsByContact(contactId: string): Promise<InteractionRow[]> {
      return postgresRepositories.comms.listInteractions({ contactId });
    },

    async listInteractionsByAccount(accountId: string): Promise<InteractionRow[]> {
      return postgresRepositories.comms.listInteractions({ accountId });
    },

    async getInteraction(id: string): Promise<CommunicationDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.comms.getInteraction(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          source: string;
          kind: string | null;
          channel: string | null;
          direction: string | null;
          subject: string | null;
          summary_gold: string | null;
          body: string | null;
          occurred_at: Date | null;
          owner: string | null;
          contact: string | null;
          contact_id: string | null;
          account: string | null;
          account_id: string | null;
          m_platform: string | null;
          m_title: string | null;
          m_copilot_recap: string | null;
          m_plaud_summary: string | null;
          m_transcript_ref: string | null;
        }>(
          `SELECT i.id, i.source::text AS source, i.kind, i.channel,
                  i.direction::text AS direction, i.subject, i.summary_gold,
                  coalesce(i.normalized_silver->>'body', i.payload_bronze->>'body') AS body,
                  i.occurred_at,
                  u.display_name AS owner,
                  c.full_name AS contact, c.id AS contact_id,
                  a.name AS account, a.id AS account_id,
                  mt.platform::text AS m_platform, mt.title AS m_title,
                  mt.copilot_recap AS m_copilot_recap, mt.plaud_summary AS m_plaud_summary,
                  mt.transcript_ref AS m_transcript_ref
           FROM interaction i
           LEFT JOIN app_user u ON u.id = i.owner_user_id
           LEFT JOIN contact c ON c.id = i.contact_id
           LEFT JOIN account a ON a.id = i.account_id
           LEFT JOIN meeting mt ON mt.interaction_id = i.id
           WHERE i.id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        const { rows: aiRows } = await pool.query<{
          id: string;
          description: string;
          status: string;
          due_at: Date | null;
          contact: string | null;
          owner: string | null;
          source_task_id: string | null;
        }>(
          `SELECT m.id, m.description, m.status, m.due_at,
                  c.full_name AS contact, u.display_name AS owner, m.source_task_id
           FROM meeting_action_item m
           LEFT JOIN contact c ON c.id = m.contact_id
           LEFT JOIN app_user u ON u.id = m.owner_user_id
           WHERE m.interaction_id = $1
           ORDER BY m.due_at NULLS LAST, m.created_at DESC`,
          [id],
        );
        return {
          id: r.id,
          source: r.source,
          kind: r.kind,
          channel: r.channel,
          direction: r.direction,
          subject: r.subject,
          summary: r.summary_gold,
          body: r.body,
          owner: r.owner,
          contact: r.contact,
          contactId: r.contact_id,
          account: r.account,
          accountId: r.account_id,
          occurredAt: fmtDateTime(r.occurred_at),
          meeting: r.m_platform || r.m_copilot_recap || r.m_plaud_summary || r.m_transcript_ref
            ? {
                platform: r.m_platform,
                title: r.m_title,
                copilotRecap: r.m_copilot_recap,
                plaudSummary: r.m_plaud_summary,
                transcriptRef: r.m_transcript_ref,
              }
            : null,
          actionItems: aiRows.map((a) => ({
            id: a.id,
            description: a.description,
            status: a.status,
            due: fmtDate(a.due_at),
            contact: a.contact,
            owner: a.owner,
            promotedToTask: a.source_task_id != null,
          })),
        };
      } catch {
        return mockRepositories.comms.getInteraction(id);
      }
    },

    async createInteraction(input: InteractionInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.comms.createInteraction(input);
      // Scaffold: logs the comm to the timeline. The real provider send is stubbed.
      await pool.query(
        `INSERT INTO interaction
           (account_id, contact_id, source, kind, direction, subject, summary_gold)
         VALUES ($1, $2, $3::interaction_source, $4, $5::interaction_direction, $6, $7)`,
        [
          nullIfEmpty(input.accountId),
          nullIfEmpty(input.contactId),
          input.source,
          input.kind,
          input.direction,
          nullIfEmpty(input.subject),
          nullIfEmpty(input.body),
        ],
      );
    },

    async createMeeting(input: MeetingCreateInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.comms.createMeeting(input);
      // One transaction: the interaction timeline entry + its 1:1 meeting silver
      // row (ADR-0052 §5). Meetings stay communication objects.
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query<{ id: string; occurred_at: Date }>(
          `INSERT INTO interaction
             (account_id, contact_id, opportunity_id, project_id, source, kind,
              direction, subject, summary_gold, occurred_at)
           VALUES ($1, $2, $3, $4, 'meeting'::interaction_source, 'meeting',
                   'internal'::interaction_direction, $5, $6,
                   COALESCE($7::timestamptz, now()))
           RETURNING id, occurred_at`,
          [
            nullIfEmpty(input.accountId),
            nullIfEmpty(input.contactId),
            nullIfEmpty(input.opportunityId),
            nullIfEmpty(input.projectId),
            input.title,
            nullIfEmpty(input.notes),
            nullIfEmpty(input.occurredAt),
          ],
        );
        await client.query(
          `INSERT INTO meeting (interaction_id, platform, title, summary_gold, occurred_at)
           VALUES ($1, 'other'::meeting_platform, $2, $3, $4)`,
          [rows[0].id, input.title, nullIfEmpty(input.notes), rows[0].occurred_at],
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async listActionItems(contactId?: string): Promise<ActionItemRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.comms.listActionItems(contactId);
      try {
        const params: unknown[] = [];
        let where = "";
        if (contactId) { params.push(contactId); where = `WHERE m.contact_id = $1`; }
        const { rows } = await pool.query<{
          id: string;
          description: string;
          status: string;
          due_at: Date | null;
          contact: string | null;
          owner: string | null;
          source_task_id: string | null;
        }>(
          `SELECT m.id, m.description, m.status, m.due_at,
                  c.full_name AS contact, u.display_name AS owner, m.source_task_id
           FROM meeting_action_item m
           LEFT JOIN contact c ON c.id = m.contact_id
           LEFT JOIN app_user u ON u.id = m.owner_user_id
           ${where}
           ORDER BY m.due_at NULLS LAST, m.created_at DESC`,
          params,
        );
        return rows.map((r) => ({
          id: r.id,
          description: r.description,
          status: r.status,
          due: fmtDate(r.due_at),
          contact: r.contact,
          owner: r.owner,
          promotedToTask: r.source_task_id != null,
        }));
      } catch {
        return mockRepositories.comms.listActionItems(contactId);
      }
    },

    async completeActionItem(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.comms.completeActionItem(id);
      await pool.query(`UPDATE meeting_action_item SET status = 'done' WHERE id = $1`, [id]);
    },
  },

  // ── Contacts 360 & enrichment (ADR-0025) ──────────────────────────────────
  contacts: {
    async getProfile(id: string): Promise<ContactProfile | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.getProfile(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          title: string | null;
          headline: string | null;
          location: string | null;
          avatar_url: string | null;
          lifecycle_status: string;
          crm_stage: string | null;
          account: string | null;
          account_id: string | null;
          last_enriched_at: Date | null;
        }>(
          `SELECT c.id, c.full_name, c.email, c.phone, c.title, c.headline, c.location,
                  c.avatar_url, c.lifecycle_status, c.crm_stage, a.name AS account, c.account_id,
                  c.last_enriched_at
           FROM contact c LEFT JOIN account a ON a.id = c.account_id
           WHERE c.id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          fullName: r.full_name,
          email: r.email,
          phone: r.phone,
          title: r.title,
          headline: r.headline,
          location: r.location,
          avatarUrl: r.avatar_url,
          lifecycleStatus: r.lifecycle_status,
          crmStage: r.crm_stage,
          account: r.account,
          accountId: r.account_id,
          lastEnrichedAt: fmtDate(r.last_enriched_at),
        };
      } catch {
        return mockRepositories.contacts.getProfile(id);
      }
    },

    async getContact(id: string): Promise<ContactEditable | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.getContact(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          account_id: string | null;
          full_name: string;
          email: string | null;
          phone: string | null;
          title: string | null;
          headline: string | null;
          location: string | null;
          lifecycle_status: string;
        }>(
          `SELECT id, account_id, full_name, email, phone, title, headline, location, lifecycle_status
           FROM contact WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          accountId: r.account_id,
          fullName: r.full_name,
          email: r.email,
          phone: r.phone,
          title: r.title,
          headline: r.headline,
          location: r.location,
          lifecycleStatus: r.lifecycle_status,
        };
      } catch {
        return mockRepositories.contacts.getContact(id);
      }
    },

    async createContact(input: ContactInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.createContact(input);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO contact
           (account_id, full_name, email, phone, title, headline, location, lifecycle_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          nullIfEmpty(input.accountId),
          input.fullName,
          nullIfEmpty(input.email),
          nullIfEmpty(input.phone),
          nullIfEmpty(input.title),
          nullIfEmpty(input.headline),
          nullIfEmpty(input.location),
          input.lifecycleStatus,
        ],
      );
      const id = rows[0].id;
      await upsertWebsiteContactRow(pool, id, input);
      return id;
    },

    async updateContact(id: string, input: ContactInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.updateContact(id, input);
      await pool.query(
        `UPDATE contact
         SET account_id = $1, full_name = $2, email = $3, phone = $4, title = $5,
             headline = $6, location = $7, lifecycle_status = $8
         WHERE id = $9`,
        [
          nullIfEmpty(input.accountId),
          input.fullName,
          nullIfEmpty(input.email),
          nullIfEmpty(input.phone),
          nullIfEmpty(input.title),
          nullIfEmpty(input.headline),
          nullIfEmpty(input.location),
          input.lifecycleStatus,
          id,
        ],
      );
      await upsertWebsiteContactRow(pool, id, input);
    },

    async deleteContact(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.deleteContact(id);
      // Remove the manual provenance row first so the merge can't resurrect the silver
      // contact from a now-orphaned website_contacts row (ADR-0039).
      await pool.query(`DELETE FROM website_contacts WHERE contact_id = $1`, [id]);
      await pool.query(`DELETE FROM contact WHERE id = $1`, [id]);
    },

    async listSocialIdentities(contactId: string): Promise<SocialIdentityRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.listSocialIdentities(contactId);
      try {
        const { rows } = await pool.query<{
          id: string;
          platform: string;
          handle: string | null;
          profile_url: string | null;
          follower_count: number | null;
          verified: boolean;
        }>(
          `SELECT id, platform, handle, profile_url, follower_count, verified
           FROM contact_social_identity WHERE contact_id = $1 ORDER BY platform`,
          [contactId],
        );
        return rows.map((r) => ({
          id: r.id,
          platform: r.platform,
          handle: r.handle,
          profileUrl: r.profile_url,
          followerCount: r.follower_count,
          verified: r.verified,
        }));
      } catch {
        return mockRepositories.contacts.listSocialIdentities(contactId);
      }
    },

    async listContactSources(contactId: string): Promise<ContactSourceRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.listContactSources(contactId);
      try {
        const { rows } = await pool.query<{
          id: string;
          source: string;
          external_ref: string | null;
          payload_bronze: unknown | null;
          normalized_silver: unknown | null;
          match_confidence: number | null;
          matched_at: Date | null;
          last_seen_at: Date | null;
        }>(
          `SELECT id, source, external_ref, payload_bronze, normalized_silver,
                  match_confidence, matched_at, last_seen_at
           FROM contact_bronze_all WHERE contact_id = $1 ORDER BY last_seen_at DESC`,
          [contactId],
        );
        return rows.map((r) => ({
          id: r.id,
          source: r.source,
          externalRef: r.external_ref,
          payloadBronze: r.payload_bronze,
          normalizedSilver: r.normalized_silver,
          matchConfidence: r.match_confidence,
          matchedAt: fmtDateTime(r.matched_at),
          lastSeenAt: fmtDateTime(r.last_seen_at),
        }));
      } catch {
        return mockRepositories.contacts.listContactSources(contactId);
      }
    },

    async listContactRelatedBronze(contactId: string): Promise<ContactSourceRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.listContactRelatedBronze(contactId);
      try {
        const { rows } = await pool.query<{
          kind: string;
          external_ref: string | null;
          label: string | null;
          payload_bronze: unknown | null;
          last_seen_at: Date | null;
        }>(
          `SELECT kind, external_ref, label, payload_bronze, last_seen_at
             FROM contact_related_bronze WHERE contact_id = $1 ORDER BY last_seen_at DESC NULLS LAST`,
          [contactId],
        );
        return rows.map((r, i) => ({
          id: `${r.kind}:${r.external_ref ?? i}`,
          source: r.kind,
          externalRef: r.external_ref,
          payloadBronze: r.payload_bronze,
          normalizedSilver: null,
          matchConfidence: null,
          matchedAt: null,
          lastSeenAt: fmtDateTime(r.last_seen_at),
          title: r.label,
        }));
      } catch {
        return mockRepositories.contacts.listContactRelatedBronze(contactId);
      }
    },

    async listDirectoryGroups(contactId: string): Promise<DirectoryGroupRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.listDirectoryGroups(contactId);
      try {
        // Bronze is all-text (0079). The contact reaches its membership through
        // its M365 bronze row: m365_contacts.external_ref = the Entra user
        // object id = m365_group_members.member_external_id (#257).
        const { rows } = await pool.query<{
          tenant_id: string;
          external_id: string;
          display_name: string | null;
          description: string | null;
          group_types: string | null;
          mail: string | null;
          security_enabled: string | null;
          mail_enabled: string | null;
          visibility: string | null;
          membership_rule_processing_state: string | null;
          collected_at: string;
        }>(
          `SELECT g.tenant_id, g.external_id, g.display_name, g.description,
                  g.group_types, g.mail, g.security_enabled, g.mail_enabled,
                  g.visibility, g.membership_rule_processing_state, g.collected_at
             FROM m365_contacts mc
             JOIN m365_group_members gm ON gm.member_external_id = mc.external_ref
             JOIN m365_groups g
               ON g.tenant_id = gm.tenant_id AND g.external_id = gm.group_external_id
            WHERE mc.contact_id = $1::uuid
            ORDER BY lower(COALESCE(g.display_name, g.external_id))`,
          [contactId],
        );
        return rows.map((r) => ({
          tenantId: r.tenant_id,
          externalId: r.external_id,
          displayName: r.display_name,
          description: r.description,
          groupTypes: r.group_types,
          mail: r.mail,
          securityEnabled: r.security_enabled,
          mailEnabled: r.mail_enabled,
          visibility: r.visibility,
          membershipRuleProcessingState: r.membership_rule_processing_state,
          collectedAt: r.collected_at,
        }));
      } catch (err) {
        // Optional enrichment (#301): a not-yet-migrated bronze table is schema lag, not
        // an outage — degrade to an empty section instead of blanking the contact page.
        if (isSchemaLagError(err)) return [];
        return mockRepositories.contacts.listDirectoryGroups(contactId);
      }
    },

    async listEnrichment(contactId: string): Promise<EnrichmentFactRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.listEnrichment(contactId);
      try {
        const { rows } = await pool.query<{
          id: string;
          attribute_key: string;
          value_text: string | null;
          value_json: unknown | null;
          confidence: string | null;
          source: string | null;
          source_connection: string | null;
          lawful_basis: string;
          observed_at: Date | null;
        }>(
          `SELECT e.id, e.attribute_key, e.value_text, e.value_json, e.confidence, e.source,
                  CASE WHEN cn.id IS NOT NULL THEN
                    initcap(cn.provider::text) ||
                    COALESCE(' · ' || COALESCE(u.display_name, u.email), '')
                  END AS source_connection,
                  e.lawful_basis::text AS lawful_basis, e.observed_at
           FROM contact_enrichment e
           LEFT JOIN connection cn ON cn.id = e.source_connection_id
           LEFT JOIN app_user u ON u.id = cn.owner_user_id
           WHERE e.contact_id = $1
           ORDER BY e.attribute_key, e.observed_at DESC`,
          [contactId],
        );
        return rows.map((r) => ({
          id: r.id,
          attributeKey: r.attribute_key,
          value: r.value_text ?? (r.value_json != null ? JSON.stringify(r.value_json) : null),
          confidence: r.confidence != null ? Number(r.confidence) : null,
          source: r.source,
          sourceConnection: r.source_connection,
          lawfulBasis: r.lawful_basis,
          observedAt: fmtDate(r.observed_at),
        }));
      } catch {
        return mockRepositories.contacts.listEnrichment(contactId);
      }
    },

    async addEnrichment(input: EnrichmentInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.contacts.addEnrichment(input);
      await pool.query(
        `INSERT INTO contact_enrichment
           (contact_id, attribute_key, value_text, confidence, source, lawful_basis)
         VALUES ($1, $2, $3, $4::numeric, $5, $6::lawful_basis)`,
        [
          input.contactId,
          input.attributeKey,
          nullIfEmpty(input.value),
          nullIfEmpty(input.confidence),
          nullIfEmpty(input.source),
          input.lawfulBasis,
        ],
      );
    },
  },

  // ── Consent ledger (ADR-0014) ─────────────────────────────────────────────
  consent: {
    async listConsent(contactId: string): Promise<ConsentEventRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.consent.listConsent(contactId);
      try {
        const { rows } = await pool.query<{
          id: string;
          channel: string;
          state: string;
          lawful_basis: string;
          source: string | null;
          occurred_at: Date | null;
        }>(
          `SELECT id, channel::text AS channel, state::text AS state,
                  lawful_basis::text AS lawful_basis, source, occurred_at
           FROM consent_event WHERE contact_id = $1 ORDER BY occurred_at DESC`,
          [contactId],
        );
        return rows.map((r) => ({
          id: r.id,
          channel: r.channel,
          state: r.state,
          lawfulBasis: r.lawful_basis,
          source: r.source,
          occurredAt: fmtDate(r.occurred_at),
        }));
      } catch {
        return mockRepositories.consent.listConsent(contactId);
      }
    },

    async currentConsent(contactId: string): Promise<CurrentConsentRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.consent.currentConsent(contactId);
      try {
        const { rows } = await pool.query<{ channel: string; state: string; lawful_basis: string }>(
          `SELECT channel::text AS channel, state::text AS state, lawful_basis::text AS lawful_basis
           FROM current_consent WHERE contact_id = $1 ORDER BY channel`,
          [contactId],
        );
        return rows.map((r) => ({ channel: r.channel, state: r.state, lawfulBasis: r.lawful_basis }));
      } catch {
        return mockRepositories.consent.currentConsent(contactId);
      }
    },

    async recordConsentEvent(input: ConsentEventInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.consent.recordConsentEvent(input);
      await pool.query(
        `INSERT INTO consent_event (contact_id, channel, state, lawful_basis, source)
         VALUES ($1, $2::consent_channel, $3::consent_state, $4::lawful_basis, $5)`,
        [input.contactId, input.channel, input.state, input.lawfulBasis, nullIfEmpty(input.source)],
      );
    },

    async canSend(contactId: string, channel: string): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.consent.canSend(contactId, channel);
      try {
        const { rows } = await pool.query<{ state: string }>(
          `SELECT state::text AS state FROM current_consent
           WHERE contact_id = $1 AND channel = $2::consent_channel`,
          [contactId, channel],
        );
        return rows[0]?.state === "opt_in";
      } catch {
        return mockRepositories.consent.canSend(contactId, channel);
      }
    },

    async canUseForAds(contactId: string): Promise<boolean> {
      return postgresRepositories.consent.canSend(contactId, "ad_targeting");
    },
  },

  // ── Connections & identity map (ADR-0012/0024) ────────────────────────────
  connections: {
    async listUserConnections(userEmail: string): Promise<ConnectionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.listUserConnections(userEmail);
      try {
        // Resolve the signed-in employee's app_user by email (the session carries
        // email, not the app_user id) — ADR-0024 per-user connections.
        const { rows } = await pool.query<ConnectionDbRow>(
          `SELECT cn.id, cn.scope::text AS scope, cn.provider::text AS provider, cn.display_name,
                  cn.status::text AS status, cn.scopes, u.display_name AS owner,
                  cn.keyvault_secret_ref, cn.last_sync_at, cn.connected_at, cn.poll_interval_minutes
           FROM connection cn LEFT JOIN app_user u ON u.id = cn.owner_user_id
           WHERE cn.scope = 'user'
             AND cn.owner_user_id = (
               SELECT id FROM app_user WHERE lower(email) = lower($1) ORDER BY created_at LIMIT 1
             )
           ORDER BY cn.provider`,
          [userEmail],
        );
        return rows.map(mapConnection);
      } catch {
        return mockRepositories.connections.listUserConnections(userEmail);
      }
    },

    async listCompanyConnections(): Promise<ConnectionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.listCompanyConnections();
      try {
        const { rows } = await pool.query<ConnectionDbRow>(
          `SELECT cn.id, cn.scope::text AS scope, cn.provider::text AS provider, cn.display_name,
                  cn.status::text AS status, cn.scopes, NULL::text AS owner,
                  cn.keyvault_secret_ref, cn.last_sync_at, cn.connected_at, cn.poll_interval_minutes
           FROM connection cn WHERE cn.scope = 'company' ORDER BY cn.provider`,
        );
        return rows.map(mapConnection);
      } catch {
        return mockRepositories.connections.listCompanyConnections();
      }
    },

    async listPlatformConnections(): Promise<ConnectionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.listPlatformConnections();
      try {
        // Platform-scope AI provider keys (ADR-0129) — custody-only rows (no account, no
        // cadence). Renders the KV secret NAME + status, never a secret value.
        const { rows } = await pool.query<ConnectionDbRow>(
          `SELECT cn.id, cn.scope::text AS scope, cn.provider::text AS provider, cn.display_name,
                  cn.status::text AS status, cn.scopes, NULL::text AS owner,
                  cn.keyvault_secret_ref, cn.last_sync_at, cn.connected_at, cn.poll_interval_minutes,
                  cn.auth_method
           FROM connection cn WHERE cn.scope = 'platform' ORDER BY cn.provider`,
        );
        return rows.map(mapConnection);
      } catch {
        return mockRepositories.connections.listPlatformConnections();
      }
    },

    async listAllConnections(): Promise<ConnectionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.listAllConnections();
      try {
        // The credential registry (ADR-0103): every custodied connection across scopes,
        // with the linked account name resolved. Renders the KV secret NAME + metadata —
        // NEVER a secret value. Ordered scope (client→company→user) then provider.
        const { rows } = await pool.query<ConnectionDbRow>(
          `SELECT cn.id, cn.scope::text AS scope, cn.provider::text AS provider, cn.display_name,
                  cn.status::text AS status, cn.scopes, u.display_name AS owner,
                  cn.keyvault_secret_ref, cn.last_sync_at, cn.connected_at, cn.poll_interval_minutes,
                  cn.account_id::text AS account_id, a.name AS account_name,
                  cn.auth_method, cn.cert_thumbprint, cn.client_id
             FROM connection cn
             LEFT JOIN app_user u ON u.id = cn.owner_user_id
             LEFT JOIN account a ON a.id = cn.account_id
            ORDER BY CASE cn.scope WHEN 'client' THEN 0 WHEN 'company' THEN 1 ELSE 2 END,
                     cn.provider, cn.display_name`,
        );
        return rows.map(mapConnection);
      } catch {
        return mockRepositories.connections.listAllConnections();
      }
    },

    async listAccountConnections(accountId: string): Promise<ConnectionRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.listAccountConnections(accountId);
      try {
        // Connections linked to one account (ADR-0103) — the account-page credentials panel.
        // Secret NAMES only.
        const { rows } = await pool.query<ConnectionDbRow>(
          `SELECT cn.id, cn.scope::text AS scope, cn.provider::text AS provider, cn.display_name,
                  cn.status::text AS status, cn.scopes, u.display_name AS owner,
                  cn.keyvault_secret_ref, cn.last_sync_at, cn.connected_at, cn.poll_interval_minutes,
                  cn.account_id::text AS account_id, a.name AS account_name,
                  cn.auth_method, cn.cert_thumbprint, cn.client_id
             FROM connection cn
             LEFT JOIN app_user u ON u.id = cn.owner_user_id
             LEFT JOIN account a ON a.id = cn.account_id
            WHERE cn.account_id = $1
            ORDER BY cn.provider, cn.display_name`,
          [accountId],
        );
        return rows.map(mapConnection);
      } catch {
        return mockRepositories.connections.listAccountConnections(accountId);
      }
    },

    async listClientMappingUnits(sourceSystem: string): Promise<ClientMappingUnit[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.listClientMappingUnits(sourceSystem);

      // M365 (E3 #1147) doesn't have a single bronze "companies" table — its units are Customer
      // Tenants. The universe is the posture-bronze tenant set (the same UNION listUnmappedTenants
      // envelopes) PLUS any tenant already linked in `entity_xref ('account','m365',guid)`
      // (backfilled by migration 0165), so a mapped tenant shows even with no posture rows yet.
      // The mapped link reads from entity_xref (the ADR-0112 authority); the legacy `account_tenant`
      // row supplies a friendly display name during the deferred posture-join cutover (#1049).
      if (sourceSystem === "m365") {
        try {
          const { rows } = await pool.query<{
            source_key: string;
            name: string | null;
            mapped_account_id: string | null;
            mapped_account_name: string | null;
          }>(
            `WITH tenants AS (
                          SELECT tenant_id FROM secure_scores
                UNION ALL SELECT tenant_id FROM entra_conditional_access_policies
                UNION ALL SELECT tenant_id FROM intune_security_policies
                UNION ALL SELECT tenant_id FROM device_configuration_policies
                UNION ALL SELECT tenant_id FROM autopilot_policies
                UNION ALL SELECT tenant_id FROM defender_xdr_security_policies
                UNION ALL SELECT source_key AS tenant_id FROM entity_xref
                            WHERE entity_type = 'account' AND source_system = 'm365'
                              AND match_method = 'manual'
             )
             SELECT t.tenant_id AS source_key,
                    COALESCE(a.name, at.display_name, t.tenant_id) AS name,
                    x.internal_entity_id::text AS mapped_account_id,
                    a.name AS mapped_account_name
               FROM (SELECT DISTINCT tenant_id FROM tenants WHERE tenant_id IS NOT NULL) t
               LEFT JOIN entity_xref x
                 ON x.entity_type = 'account' AND x.source_system = 'm365'
                AND x.source_key = t.tenant_id AND x.match_method = 'manual'
               LEFT JOIN account a ON a.id = x.internal_entity_id
               LEFT JOIN account_tenant at ON at.tenant_id = t.tenant_id
              ORDER BY name`,
          );
          return rows.map((r) => ({
            sourceKey: r.source_key,
            name: r.name ?? r.source_key,
            mappedAccountId: r.mapped_account_id,
            mappedAccountName: r.mapped_account_name,
          }));
        } catch {
          return mockRepositories.connections.listClientMappingUnits(sourceSystem);
        }
      }

      // Every other connector's units come from its own bronze table (F #1144). The
      // (table, key, name) shape is a SERVER-SIDE whitelist so neither the table nor the columns
      // are ever caller-derived — only the `source_system` VALUE is parameterized into the
      // entity_xref join. Two table shapes are covered: "companies"-style envelope tables
      // (autotask/itglue/televy: `external_ref` + `*_silver`/`*_bronze` JSON) and collector-style
      // tables (pax8/kqm/myitprocess/unifi: flat columns), including a few DISTINCT-derived sources
      // with no companies table (kqm customer, myitprocess account, unifi console). All bronze
      // except autotask is empty until its collector runs (data-in is Mark-gated).
      const UNIT_SOURCE_BY_SYSTEM: Record<
        string,
        { table: string; keyExpr: string; nameExpr: string }
      > = {
        autotask: {
          table: "autotask_companies",
          keyExpr: "external_ref",
          nameExpr:
            "COALESCE(normalized_silver->>'name', payload_bronze->>'companyName', payload_bronze->>'name', external_ref)",
        },
        itglue: {
          table: "itglue_companies",
          keyExpr: "external_ref",
          nameExpr:
            "COALESCE(normalized_silver->>'name', payload_bronze->>'name', payload_bronze->>'organization-name', external_ref)",
        },
        pax8: {
          table: "pax8_companies",
          keyExpr: "external_id",
          nameExpr: "COALESCE(name, external_id)",
        },
        quotemanager: {
          table: "kqm_opportunities",
          keyExpr: "customer_id",
          nameExpr: "customer_id",
        },
        myitprocess: {
          table: "myitprocess_recommendations",
          keyExpr: "account_ref",
          nameExpr: "account_ref",
        },
        televy: {
          table: "televy_reports",
          keyExpr: "external_ref",
          nameExpr:
            "COALESCE(normalized_silver->>'name', payload_bronze->>'company', external_ref)",
        },
        unifi: {
          table: "unifi_devices",
          keyExpr: "site",
          nameExpr: "site",
        },
      };
      const src = UNIT_SOURCE_BY_SYSTEM[sourceSystem];
      if (!src) return [];
      try {
        // DISTINCT (key,name) collapses both the companies tables (already one row per company)
        // and the DISTINCT-derived sources (one customer/console spans many rows). Manual
        // entity_xref link only (the curated spine, migration 0160) — an automatic resolver link
        // is not shown as "mapped" here.
        const { rows } = await pool.query<{
          source_key: string;
          name: string | null;
          mapped_account_id: string | null;
          mapped_account_name: string | null;
        }>(
          `SELECT c.source_key,
                  c.name,
                  x.internal_entity_id::text AS mapped_account_id,
                  a.name AS mapped_account_name
             FROM (
               SELECT DISTINCT ${src.keyExpr} AS source_key, ${src.nameExpr} AS name
                 FROM ${src.table}
                WHERE ${src.keyExpr} IS NOT NULL
             ) c
             LEFT JOIN entity_xref x
               ON x.entity_type = 'account' AND x.source_system = $1
              AND x.source_key = c.source_key AND x.match_method = 'manual'
             LEFT JOIN account a ON a.id = x.internal_entity_id
            ORDER BY c.name`,
          [sourceSystem],
        );
        return rows.map((r) => ({
          sourceKey: r.source_key,
          name: r.name ?? r.source_key,
          mappedAccountId: r.mapped_account_id,
          mappedAccountName: r.mapped_account_name,
        }));
      } catch {
        return mockRepositories.connections.listClientMappingUnits(sourceSystem);
      }
    },

    async listAccountDomains(accountId): Promise<AccountDomain[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.listAccountDomains(accountId);
      try {
        const { rows } = await pool.query<{
          domain: string;
          note: string | null;
          created_by: string | null;
          created_at: string | null;
        }>(
          `SELECT domain, note, created_by, created_at::text AS created_at
             FROM account_domain
            WHERE account_id = $1::uuid
            ORDER BY domain`,
          [accountId],
        );
        return rows.map((r) => ({
          domain: r.domain,
          note: r.note,
          createdBy: r.created_by,
          createdAt: r.created_at,
        }));
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.connections.listAccountDomains(accountId);
      }
    },

    async hydrateAccountDomainsFromTenants(
      accountId,
      actor,
    ): Promise<AccountDomainHydrationResult> {
      const pool = getPool();
      if (!pool)
        return mockRepositories.connections.hydrateAccountDomainsFromTenants(accountId, actor);
      // ADR-0126 gap (b): derive the account's tracked client domains from its mapped tenant(s).
      // account → account_tenant (account→tenant) → entra_domains (verified domains per tenant).
      // Idempotent: ON CONFLICT DO NOTHING preserves any operator-curated row + its note/provenance.
      // Verified, non-initial domains only — *.onmicrosoft.com initial domains are not mail domains.
      const createdBy = actor ?? "derived:entra";
      const ins = await pool.query<{ domain: string }>(
        `WITH candidate AS (
           SELECT DISTINCT lower(d.domain_name) AS domain
             FROM account_tenant t
             JOIN entra_domains d ON d.tenant_id = t.tenant_id
            WHERE t.account_id = $1::uuid
              AND d.domain_name IS NOT NULL AND d.domain_name <> ''
              AND d.is_verified = 'true'
              AND COALESCE(d.is_initial, 'false') <> 'true'
         )
         INSERT INTO account_domain (account_id, domain, note, created_by)
         SELECT $1::uuid, c.domain, 'Derived from M365 verified domains (ADR-0126)', $2::text
           FROM candidate c
         ON CONFLICT (account_id, domain) DO NOTHING
         RETURNING domain`,
        [accountId, createdBy],
      );
      const counts = await pool.query<{ tenants: string; candidates: string }>(
        `SELECT
           (SELECT count(*) FROM account_tenant WHERE account_id = $1::uuid)::text AS tenants,
           (SELECT count(DISTINCT lower(d.domain_name))
              FROM account_tenant t
              JOIN entra_domains d ON d.tenant_id = t.tenant_id
             WHERE t.account_id = $1::uuid
               AND d.domain_name IS NOT NULL AND d.domain_name <> ''
               AND d.is_verified = 'true'
               AND COALESCE(d.is_initial, 'false') <> 'true')::text AS candidates`,
        [accountId],
      );
      const inserted = ins.rowCount ?? 0;
      if (inserted > 0) {
        await pool.query(
          `INSERT INTO audit_log (action, entity_type, entity_id, detail)
           VALUES ('account_domain.hydrate', 'account', $1::uuid,
                   jsonb_build_object('inserted', $2::int, 'source', 'entra_domains',
                                      'domains', $3::jsonb))`,
          [accountId, inserted, JSON.stringify(ins.rows.map((r) => r.domain))],
        );
      }
      return {
        accountId,
        tenants: Number(counts.rows[0]?.tenants ?? 0),
        candidates: Number(counts.rows[0]?.candidates ?? 0),
        inserted,
      };
    },

    async connect(input: ConnectionInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.connect(input);
      // Scaffold: records the connection. Real OAuth + Key Vault token storage later.
      // A user-scope connection is attached to the signed-in employee (by email).
      await pool.query(
        `INSERT INTO connection (scope, owner_user_id, provider, display_name, scopes, status)
         VALUES ($1::connection_scope,
                 CASE WHEN $1 = 'user' AND $2 <> '' THEN
                   (SELECT id FROM app_user WHERE lower(email) = lower($2) ORDER BY created_at LIMIT 1)
                 ELSE NULL END,
                 $3::connection_provider, $4, $5, 'active')`,
        [
          input.scope,
          (input.ownerEmail ?? "").trim(),
          input.provider,
          nullIfEmpty(input.displayName),
          input.scopes,
        ],
      );
    },

    async saveCompanyCredential(input: CompanyCredentialInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.saveCompanyCredential(input);
      // Upsert by provider for company scope (uq_connection_company_provider, 0027).
      // The secret lives in Key Vault; we persist only its reference + status (+ any PUBLIC
      // external_account_id the connect step resolved — Meta's FB Page id, #1568). On rotation
      // a not-provided external_account_id (NULL param) PRESERVES the prior value via COALESCE,
      // so a re-save never wipes a once-resolved owned-asset id.
      const externalAccountId = nullIfEmpty(input.externalAccountId ?? null);
      await pool.query(
        `INSERT INTO connection
           (scope, provider, display_name, scopes, keyvault_secret_ref, status, external_account_id)
         VALUES ('company', $1::connection_provider, $2, $3, $4, $5::connection_status, $6)
         ON CONFLICT (provider) WHERE scope = 'company'
         DO UPDATE SET display_name        = EXCLUDED.display_name,
                       scopes              = EXCLUDED.scopes,
                       keyvault_secret_ref = EXCLUDED.keyvault_secret_ref,
                       status              = EXCLUDED.status,
                       external_account_id = COALESCE(EXCLUDED.external_account_id, connection.external_account_id),
                       connected_at        = now(),
                       updated_at          = now()`,
        [
          input.provider,
          nullIfEmpty(input.displayName),
          input.scopes,
          nullIfEmpty(input.keyvaultSecretRef),
          input.status,
          externalAccountId,
        ],
      );
    },

    async savePlatformCredential(input: PlatformCredentialInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.savePlatformCredential(input);
      // Platform scope has no partial unique index (only company does, 0027), so rotate via
      // UPDATE-then-INSERT keyed on (scope='platform', provider) — one row per AI provider.
      // auth_method='api_key' (the raw-scalar shape, ADR-0129); account_id stays NULL (system-wide).
      // The secret lives in Key Vault; we persist only its reference + status (never the key).
      const ref = nullIfEmpty(input.keyvaultSecretRef);
      const { rowCount } = await pool.query(
        `UPDATE connection
            SET display_name        = $2,
                keyvault_secret_ref = $3,
                status              = $4::connection_status,
                auth_method         = 'api_key',
                connected_at        = now(),
                updated_at          = now()
          WHERE scope = 'platform' AND provider = $1::connection_provider`,
        [input.provider, nullIfEmpty(input.displayName), ref, input.status],
      );
      if (!rowCount) {
        await pool.query(
          `INSERT INTO connection
             (scope, provider, display_name, scopes, auth_method, keyvault_secret_ref, status)
           VALUES ('platform', $1::connection_provider, $2, ARRAY[]::text[], 'api_key', $3, $4::connection_status)`,
          [input.provider, nullIfEmpty(input.displayName), ref, input.status],
        );
      }
    },

    async saveClientCredential(input: ClientCredentialInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.saveClientCredential(input);
      // ADR-0103 credential registry: one client-scope row per (account, provider, identity).
      // There is no DB unique index for client scope (identity differs per provider — m365
      // keys on client_id, unifi on external_account_id), so rotate via UPDATE-then-INSERT
      // keyed on COALESCE(client_id, external_account_id) — mirrors the backend client
      // custody upserts (shared/connections.ts). The secret lives in Key Vault; we persist
      // only its reference + the public auth metadata.
      const clientId = nullIfEmpty(input.clientId);
      const externalAccountId = nullIfEmpty(input.externalAccountId);
      const { rowCount } = await pool.query(
        `UPDATE connection
            SET display_name        = $4,
                scopes              = $5,
                auth_method         = $6,
                cert_thumbprint     = $7,
                client_id           = $8,
                keyvault_secret_ref = $9,
                external_account_id = $10,
                status              = $11::connection_status,
                connected_at        = now(),
                updated_at          = now()
          WHERE scope = 'client'
            AND account_id = $1
            AND provider = $2::connection_provider
            AND COALESCE(client_id, external_account_id, '') = COALESCE($3::text, '')`,
        [
          input.accountId,
          input.provider,
          clientId ?? externalAccountId,
          nullIfEmpty(input.displayName),
          input.scopes,
          nullIfEmpty(input.authMethod),
          nullIfEmpty(input.certThumbprint),
          clientId,
          nullIfEmpty(input.keyvaultSecretRef),
          externalAccountId,
          input.status,
        ],
      );
      if (rowCount === 0) {
        await pool.query(
          `INSERT INTO connection
             (scope, account_id, provider, display_name, scopes, auth_method,
              cert_thumbprint, client_id, keyvault_secret_ref, external_account_id, status)
           VALUES ('client', $1, $2::connection_provider, $3, $4, $5, $6, $7, $8, $9,
                   $10::connection_status)`,
          [
            input.accountId,
            input.provider,
            nullIfEmpty(input.displayName),
            input.scopes,
            nullIfEmpty(input.authMethod),
            nullIfEmpty(input.certThumbprint),
            clientId,
            nullIfEmpty(input.keyvaultSecretRef),
            externalAccountId,
            input.status,
          ],
        );
      }
    },

    async setPollInterval(id: string, minutes: number): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.setPollInterval(id, minutes);
      // Clamp non-negative; 0 = manual/paused (ADR-0038). The pipeline reads this.
      const safe = Math.max(0, Math.floor(minutes));
      await pool.query(
        `UPDATE connection SET poll_interval_minutes = $2 WHERE id = $1`,
        [id, safe],
      );
    },

    async disconnect(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.disconnect(id);
      await pool.query(`DELETE FROM connection WHERE id = $1`, [id]);
    },

    async listExternalIdentities(accountId: string): Promise<ExternalIdentityRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.connections.listExternalIdentities(accountId);
      try {
        const { rows } = await pool.query<{
          id: string;
          provider: string;
          external_id: string;
          contact: string | null;
        }>(
          `SELECT e.id, e.provider::text AS provider, e.external_id, c.full_name AS contact
           FROM external_identity e LEFT JOIN contact c ON c.id = e.contact_id
           WHERE e.account_id = $1 ORDER BY e.provider`,
          [accountId],
        );
        return rows.map((r) => ({
          id: r.id,
          provider: r.provider,
          externalId: r.external_id,
          contact: r.contact,
        }));
      } catch {
        return mockRepositories.connections.listExternalIdentities(accountId);
      }
    },
  },

  // ── Demand generation (ADR-0012/0026) ─────────────────────────────────────
  // ── Events: first-class objects campaigns promote (ADR-0053, #109) ────────
  events: {
    async listEvents(): Promise<EventRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.events.listEvents();
      try {
        const { rows } = await pool.query<{
          id: string;
          kind: string;
          name: string;
          status: string;
          starts_at: Date | null;
          registered: string;
          attended: string;
        }>(
          `SELECT e.id, e.kind::text AS kind, e.name, e.status::text AS status, e.starts_at,
                  COUNT(r.id) FILTER (WHERE r.status <> 'canceled') AS registered,
                  COUNT(r.id) FILTER (WHERE r.status = 'attended')  AS attended
           FROM event e LEFT JOIN event_registration r ON r.event_id = e.id
           GROUP BY e.id ORDER BY e.starts_at DESC NULLS LAST, e.created_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          kind: r.kind,
          name: r.name,
          status: r.status,
          startsAt: fmtDateTime(r.starts_at),
          registered: Number(r.registered),
          attended: Number(r.attended),
        }));
      } catch {
        return mockRepositories.events.listEvents();
      }
    },

    async getEvent(id: string): Promise<EventDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.events.getEvent(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          kind: string;
          name: string;
          description: string | null;
          status: string;
          starts_at: Date | null;
          ends_at: Date | null;
          timezone: string | null;
          capacity: number | null;
          join_url: string | null;
          location: string | null;
          reg_headline: string | null;
          reg_blurb: string | null;
          workflow_id: string | null;
          workflow_name: string | null;
          registered: string;
          attended: string;
          no_show: string;
        }>(
          `SELECT e.id, e.kind::text AS kind, e.name, e.description, e.status::text AS status,
                  e.starts_at, e.ends_at, e.timezone, e.capacity, e.join_url, e.location,
                  e.registration_page->>'headline' AS reg_headline,
                  e.registration_page->>'blurb'    AS reg_blurb,
                  e.workflow_id, w.name AS workflow_name,
                  COUNT(r.id) FILTER (WHERE r.status <> 'canceled') AS registered,
                  COUNT(r.id) FILTER (WHERE r.status = 'attended')  AS attended,
                  COUNT(r.id) FILTER (WHERE r.status = 'no_show')   AS no_show
           FROM event e
           LEFT JOIN workflow w ON w.id = e.workflow_id
           LEFT JOIN event_registration r ON r.event_id = e.id
           WHERE e.id = $1 GROUP BY e.id, w.name`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          kind: r.kind,
          name: r.name,
          description: r.description,
          status: r.status,
          startsAt: fmtDateTime(r.starts_at),
          endsAt: fmtDateTime(r.ends_at),
          timezone: r.timezone,
          capacity: r.capacity,
          joinUrl: r.join_url,
          location: r.location,
          registrationHeadline: r.reg_headline,
          registrationBlurb: r.reg_blurb,
          workflowId: r.workflow_id,
          workflowName: r.workflow_name,
          registered: Number(r.registered),
          attended: Number(r.attended),
          noShow: Number(r.no_show),
        };
      } catch {
        return mockRepositories.events.getEvent(id);
      }
    },

    async createEvent(input: EventInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.events.createEvent(input);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO event (kind, name, description, status, starts_at, ends_at, timezone,
                            capacity, join_url, location, registration_page, workflow_id)
         VALUES ($1::event_kind, $2, $3, $4::event_status, $5::timestamptz, $6::timestamptz,
                 $7, $8, $9, $10, $11::jsonb, $12::uuid)
         RETURNING id`,
        [
          input.kind,
          input.name,
          nullIfEmpty(input.description),
          input.status,
          nullIfEmpty(input.startsAt),
          nullIfEmpty(input.endsAt),
          nullIfEmpty(input.timezone),
          input.capacity,
          nullIfEmpty(input.joinUrl),
          nullIfEmpty(input.location),
          JSON.stringify({
            headline: input.registrationHeadline,
            blurb: input.registrationBlurb,
            fields: ["full_name", "email"],
          }),
          nullIfEmpty(input.workflowId),
        ],
      );
      return rows[0].id;
    },

    async updateEvent(id: string, input: EventInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.events.updateEvent(id, input);
      await pool.query(
        `UPDATE event SET kind = $2::event_kind, name = $3, description = $4,
                status = $5::event_status,
                -- blank schedule inputs keep the stored times (the edit form posts
                -- empty datetime fields; nulling starts_at would trip the
                -- leave-draft CHECK on scheduled events)
                starts_at = COALESCE($6::timestamptz, starts_at),
                ends_at   = COALESCE($7::timestamptz, ends_at),
                timezone = $8, capacity = $9, join_url = $10, location = $11,
                registration_page = registration_page || $12::jsonb,
                workflow_id = $13::uuid
         WHERE id = $1`,
        [
          id,
          input.kind,
          input.name,
          nullIfEmpty(input.description),
          input.status,
          nullIfEmpty(input.startsAt),
          nullIfEmpty(input.endsAt),
          nullIfEmpty(input.timezone),
          input.capacity,
          nullIfEmpty(input.joinUrl),
          nullIfEmpty(input.location),
          JSON.stringify({
            headline: input.registrationHeadline,
            blurb: input.registrationBlurb,
          }),
          nullIfEmpty(input.workflowId),
        ],
      );
    },

    async listRegistrations(eventId: string): Promise<EventRegistrationRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.events.listRegistrations(eventId);
      try {
        const { rows } = await pool.query<{
          id: string;
          contact: string | null;
          contact_id: string | null;
          status: string;
          source: string | null;
          registered_at: Date | null;
          checked_in_at: Date | null;
        }>(
          `SELECT r.id, c.full_name AS contact, r.contact_id, r.status, r.source,
                  r.registered_at, r.checked_in_at
           FROM event_registration r
           LEFT JOIN contact c ON c.id = r.contact_id
           WHERE r.event_id = $1
           ORDER BY r.registered_at DESC`,
          [eventId],
        );
        return rows.map((r) => ({
          id: r.id,
          contact: r.contact,
          contactId: r.contact_id,
          status: r.status,
          source: r.source,
          registeredAt: fmtDateTime(r.registered_at),
          checkedInAt: fmtDateTime(r.checked_in_at),
        }));
      } catch {
        return mockRepositories.events.listRegistrations(eventId);
      }
    },

    async setRegistrationStatus(
      registrationId: string,
      status: string,
      checkIn: boolean,
    ): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.events.setRegistrationStatus(registrationId, status, checkIn);
      await pool.query(
        `UPDATE event_registration
         SET status = $2,
             checked_in_at = CASE WHEN $3 THEN COALESCE(checked_in_at, now()) ELSE checked_in_at END
         WHERE id = $1`,
        [registrationId, status, checkIn],
      );
    },
  },

  campaigns: {
    async listCampaigns(): Promise<CampaignRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.listCampaigns();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          platform: string;
          status: string;
          budget: string | null;
          spend: string | null;
          leads: string | null;
        }>(
          `SELECT c.id, c.name, c.platform::text AS platform, c.status::text AS status, c.budget,
                  SUM(m.spend) AS spend, COALESCE(SUM(m.leads), 0) AS leads
           FROM campaign c LEFT JOIN campaign_metric m ON m.campaign_id = c.id
           GROUP BY c.id ORDER BY c.created_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          platform: r.platform,
          status: r.status,
          budget: r.budget != null ? fmtUsd(Number(r.budget)) : "—",
          spend: r.spend != null ? fmtUsd(Number(r.spend)) : "—",
          leads: Number(r.leads ?? 0),
        }));
      } catch {
        return mockRepositories.campaigns.listCampaigns();
      }
    },

    async getCampaign(id: string): Promise<CampaignDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.getCampaign(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          platform: string;
          objective: string | null;
          status: string;
          budget: string | null;
          start_at: Date | null;
          end_at: Date | null;
          event_id: string | null;
          event_name: string | null;
          workflow_name: string | null;
        }>(
          `SELECT c.id, c.name, c.platform::text AS platform, c.objective,
                  c.status::text AS status, c.budget, c.start_at, c.end_at,
                  c.event_id, ev.name AS event_name, w.name AS workflow_name
           FROM campaign c
           LEFT JOIN event ev ON ev.id = c.event_id
           LEFT JOIN workflow w ON w.id = c.workflow_id
           WHERE c.id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        const { rows: ads } = await pool.query<{
          id: string;
          name: string;
          status: string;
          creative: { headline?: string; copy?: string } | null;
          audience_name: string | null;
          spend: string | null;
          impressions: string | null;
          clicks: string | null;
          leads: string | null;
        }>(
          // Typed creative (ADR-0053 §3) carries an optional audienceId; legacy rows carry {copy}.
          `SELECT ad.id, ad.name, ad.status::text AS status, ad.creative,
                  au.name AS audience_name,
                  SUM(m.spend) AS spend, COALESCE(SUM(m.impressions),0) AS impressions,
                  COALESCE(SUM(m.clicks),0) AS clicks, COALESCE(SUM(m.leads),0) AS leads
           FROM ad
           LEFT JOIN campaign_metric m ON m.ad_id = ad.id
           LEFT JOIN audience au ON au.id::text = ad.creative->>'audienceId'
           WHERE ad.campaign_id = $1 GROUP BY ad.id, au.name ORDER BY ad.created_at`,
          [id],
        );
        return {
          id: r.id,
          name: r.name,
          platform: r.platform,
          objective: r.objective,
          status: r.status,
          budget: r.budget != null ? fmtUsd(Number(r.budget)) : "—",
          startAt: fmtDate(r.start_at),
          endAt: fmtDate(r.end_at),
          eventId: r.event_id,
          eventName: r.event_name,
          workflowName: r.workflow_name,
          ads: ads.map((ad) => ({
            id: ad.id,
            name: ad.name,
            status: ad.status,
            creative: ad.creative?.headline ?? ad.creative?.copy ?? null,
            audienceName: ad.audience_name,
            spend: ad.spend != null ? fmtUsd(Number(ad.spend)) : "—",
            impressions: Number(ad.impressions ?? 0),
            clicks: Number(ad.clicks ?? 0),
            leads: Number(ad.leads ?? 0),
          })),
        };
      } catch {
        return mockRepositories.campaigns.getCampaign(id);
      }
    },

    async createCampaign(input: CampaignInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.createCampaign(input);
      await pool.query(
        `INSERT INTO campaign (name, platform, objective, status, budget, start_at, end_at,
                               event_id, workflow_id)
         VALUES ($1, $2::campaign_platform, $3, $4::campaign_status, $5::numeric, $6::date,
                 $7::date, $8::uuid, $9::uuid)`,
        [
          input.name,
          input.platform,
          nullIfEmpty(input.objective),
          input.status,
          nullIfEmpty(input.budget),
          nullIfEmpty(input.startAt),
          nullIfEmpty(input.endAt),
          nullIfEmpty(input.eventId),
          nullIfEmpty(input.workflowId),
        ],
      );
    },

    async createAd(campaignId: string, input: AdInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.createAd(campaignId, input);
      // Typed creative shape (ADR-0053 §3) persisted as-is; legacy rows keep {copy}.
      await pool.query(
        `INSERT INTO ad (campaign_id, name, status, creative)
         VALUES ($1, $2, $3::campaign_status, $4::jsonb)`,
        [
          campaignId,
          input.name,
          input.status,
          input.creative == null ? null : JSON.stringify(input.creative),
        ],
      );
    },

    async listAudiences(): Promise<AudienceRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.listAudiences();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          description: string | null;
          kind: string;
          member_count: string;
          ad_ready: string;
        }>(
          `SELECT au.id, au.name, au.description, au.kind::text AS kind,
                  COUNT(am.contact_id) AS member_count,
                  COUNT(am.contact_id) FILTER (
                    WHERE cc.state = 'opt_in'
                  ) AS ad_ready
           FROM audience au
           LEFT JOIN audience_member am ON am.audience_id = au.id
           LEFT JOIN current_consent cc
             ON cc.contact_id = am.contact_id AND cc.channel = 'ad_targeting'
           GROUP BY au.id ORDER BY au.created_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          kind: r.kind,
          memberCount: Number(r.member_count),
          adReadyCount: Number(r.ad_ready),
        }));
      } catch {
        return mockRepositories.campaigns.listAudiences();
      }
    },

    async getAudienceMembers(id: string): Promise<AudienceMemberRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.getAudienceMembers(id);
      try {
        const { rows } = await pool.query<{
          contact_id: string;
          full_name: string;
          account: string | null;
          ad_consent: boolean;
        }>(
          `SELECT c.id AS contact_id, c.full_name, a.name AS account,
                  (cc.state = 'opt_in') AS ad_consent
           FROM audience_member am
           JOIN contact c ON c.id = am.contact_id
           LEFT JOIN account a ON a.id = c.account_id
           LEFT JOIN current_consent cc
             ON cc.contact_id = c.id AND cc.channel = 'ad_targeting'
           WHERE am.audience_id = $1 ORDER BY c.full_name`,
          [id],
        );
        return rows.map((r) => ({
          contactId: r.contact_id,
          fullName: r.full_name,
          account: r.account,
          adConsent: r.ad_consent === true,
        }));
      } catch {
        return mockRepositories.campaigns.getAudienceMembers(id);
      }
    },

    async createAudience(input: AudienceInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.createAudience(input);
      const valid = input.criteria.filter((c) => c.key && c.value);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO audience (name, description, kind, definition)
         VALUES ($1, $2, $3::audience_kind, $4::jsonb)
         RETURNING id`,
        [input.name, nullIfEmpty(input.description), input.kind, JSON.stringify({ criteria: valid })],
      );
      const audienceId = rows[0].id;
      // Materialize the member set from the criteria (over the enrichment dossier).
      const members = await queryAudienceMatches(pool, valid);
      for (const m of members) {
        await pool.query(
          `INSERT INTO audience_member (audience_id, contact_id, source)
           VALUES ($1, $2, 'criteria') ON CONFLICT DO NOTHING`,
          [audienceId, m.contactId],
        );
      }
    },

    async previewAudienceMembers(criteria: AudienceCriterion[]): Promise<AudienceMemberRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.previewAudienceMembers(criteria);
      try {
        return await queryAudienceMatches(pool, criteria);
      } catch {
        return mockRepositories.campaigns.previewAudienceMembers(criteria);
      }
    },

    async launchAudience(id: string): Promise<number> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.launchAudience(id);
      // Consent gate: only members with current ad_targeting opt-in are eligible.
      const members = await postgresRepositories.campaigns.getAudienceMembers(id);
      return members.filter((m) => m.adConsent).length;
    },

    // ── Campaign Sends (ADR-0053 §4, migration 0071) — schedule only ────────
    async listSends(campaignId: string): Promise<CampaignSendRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.listSends(campaignId);
      try {
        const { rows } = await pool.query<{
          id: string;
          channel: string;
          recipient_scope: string;
          audience_name: string | null;
          template: { subject?: string; text?: string } | null;
          status: string;
          send_at: Date | null;
          event_offset_minutes: number | null;
          queued_count: number;
          sent_count: number;
          delivered_count: number;
          failed_count: number;
        }>(
          `SELECT s.id, s.channel, s.recipient_scope, au.name AS audience_name, s.template,
                  s.status::text AS status, s.send_at, s.event_offset_minutes,
                  s.queued_count, s.sent_count, s.delivered_count, s.failed_count
           FROM campaign_send s LEFT JOIN audience au ON au.id = s.audience_id
           WHERE s.campaign_id = $1 ORDER BY s.created_at DESC`,
          [campaignId],
        );
        return rows.map((r) => {
          const offset = r.event_offset_minutes;
          const schedule =
            r.send_at != null
              ? (fmtDateTime(r.send_at) ?? "—")
              : offset != null
                ? offset === 0
                  ? "At event start"
                  : `${Math.abs(offset / 60) % 1 === 0 ? Math.abs(offset) / 60 + "h" : Math.abs(offset) + "m"} ${offset < 0 ? "before" : "after"} event`
                : "Draft — unscheduled";
          return {
            id: r.id,
            channel: r.channel,
            recipientScope: r.recipient_scope,
            audienceName: r.audience_name,
            summary: r.template?.subject ?? r.template?.text?.slice(0, 80) ?? null,
            status: r.status,
            schedule,
            queued: r.queued_count,
            sent: r.sent_count,
            delivered: r.delivered_count,
            failed: r.failed_count,
          };
        });
      } catch {
        return mockRepositories.campaigns.listSends(campaignId);
      }
    },

    async createSend(campaignId: string, input: CampaignSendInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.createSend(campaignId, input);
      // Typed template (ADR-0053 §3): email {subject, bodyMarkdown, mergeFields[]} / sms {text}.
      const template =
        input.channel === "sms"
          ? { text: input.smsText ?? "" }
          : {
              subject: input.subject ?? "",
              bodyMarkdown: input.bodyMarkdown ?? "",
              mergeFields: [...(input.bodyMarkdown ?? "").matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]),
            };
      // Scheduled needs exactly one grain (DB CHECK is the backstop).
      const sendAt = input.schedule ? nullIfEmpty(input.sendAt) : null;
      const offset = input.schedule && sendAt == null ? input.eventOffsetMinutes : null;
      const status = input.schedule && (sendAt != null || offset != null) ? "scheduled" : "draft";
      await pool.query(
        `INSERT INTO campaign_send
           (campaign_id, channel, recipient_scope, audience_id, template,
            send_at, event_offset_minutes, status)
         VALUES ($1, $2, $3, $4::uuid, $5::jsonb, $6::timestamptz, $7,
                 $8::campaign_send_status)`,
        [
          campaignId,
          input.channel,
          input.recipientScope,
          nullIfEmpty(input.audienceId),
          JSON.stringify(template),
          sendAt,
          offset,
          status,
        ],
      );
    },

    async cancelSend(sendId: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.campaigns.cancelSend(sendId);
      // Only pre-fire states cancel; sending/sent are immutable history (§5).
      await pool.query(
        `UPDATE campaign_send SET status = 'canceled'
         WHERE id = $1 AND status IN ('draft','scheduled')`,
        [sendId],
      );
    },
  },

  // ── Lead-capture hooks (ADR-0024) ─────────────────────────────────────────
  leads: {
    async listHooks(): Promise<LeadHookRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.leads.listHooks();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          kind: string;
          active: boolean;
          capture_count: string;
        }>(
          `SELECT h.id, h.name, h.kind::text AS kind, h.active,
                  COUNT(e.id) AS capture_count
           FROM lead_hook h LEFT JOIN lead_capture_event e ON e.hook_id = h.id
           GROUP BY h.id ORDER BY h.created_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          kind: r.kind,
          active: r.active,
          captureCount: Number(r.capture_count),
        }));
      } catch {
        return mockRepositories.leads.listHooks();
      }
    },

    async createHook(input: LeadHookInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.leads.createHook(input);
      await pool.query(
        `INSERT INTO lead_hook (name, kind, active, config)
         VALUES ($1, $2::lead_hook_kind, $3, $4::jsonb)`,
        [
          input.name,
          input.kind,
          input.active,
          input.config == null ? null : JSON.stringify(input.config),
        ],
      );
    },

    async listCaptureEvents(): Promise<LeadCaptureEventRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.leads.listCaptureEvents();
      try {
        const { rows } = await pool.query<{
          id: string;
          hook: string | null;
          status: string;
          contact: string | null;
          payload_bronze: unknown | null;
          received_at: Date | null;
        }>(
          `SELECT e.id, h.name AS hook, e.status, c.full_name AS contact,
                  e.payload_bronze, e.received_at
           FROM lead_capture_event e
           LEFT JOIN lead_hook h ON h.id = e.hook_id
           LEFT JOIN contact c ON c.id = e.contact_id
           ORDER BY e.received_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          hook: r.hook,
          status: r.status,
          contact: r.contact,
          summary: r.payload_bronze != null ? JSON.stringify(r.payload_bronze).slice(0, 160) : null,
          receivedAt: fmtDateTime(r.received_at),
        }));
      } catch {
        return mockRepositories.leads.listCaptureEvents();
      }
    },

    async resolveEvent(eventId: string): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.leads.resolveEvent(eventId);
      // Scaffold: mark resolved and return the linked contact (full resolution —
      // contact creation from the raw payload — lands with the ingestion service).
      const { rows } = await pool.query<{ contact_id: string | null }>(
        `UPDATE lead_capture_event SET status = 'resolved' WHERE id = $1
         RETURNING contact_id`,
        [eventId],
      );
      const contactId = rows[0]?.contact_id ?? "";
      // Event-registration hooks (ADR-0053 §2): resolving a capture from an
      // event_registration hook links the signup — one event_registration row per
      // (event, contact), idempotent on re-resolution via the partial unique index.
      // The hook's config carries the event id; no-op when the capture has no
      // contact yet or the hook isn't an event hook.
      if (contactId) {
        await pool.query(
          `INSERT INTO event_registration (event_id, contact_id, capture_event_id, source)
           SELECT (h.config->>'eventId')::uuid, e.contact_id, e.id, h.kind::text
           FROM lead_capture_event e
           JOIN lead_hook h ON h.id = e.hook_id
           WHERE e.id = $1
             AND h.kind = 'event_registration'
             AND h.config ? 'eventId'
           ON CONFLICT (event_id, contact_id) WHERE contact_id IS NOT NULL DO NOTHING`,
          [eventId],
        );
        // Auto-enroll (ADR-0053 §4, #112): a capture whose hook config names a
        // campaign enrolls the contact in campaign.workflow_id; an event-
        // registration hook enrolls in event.workflow_id. Silent no-op when no
        // workflow is set; idempotent on re-resolution via the one-active-
        // enrollment-per-(workflow, contact) partial unique index (migration
        // 0073). Each enrollment actually created is audit-logged.
        const { rows: targets } = await pool.query<{
          workflow_id: string;
          account_id: string | null;
          via: string;
          via_id: string;
        }>(
          `WITH cap AS (
             SELECT e.account_id, h.kind::text AS hook_kind, h.config
             FROM lead_capture_event e
             JOIN lead_hook h ON h.id = e.hook_id
             WHERE e.id = $1
           )
           SELECT c.workflow_id, cap.account_id, 'campaign' AS via, c.id::text AS via_id
           FROM cap JOIN campaign c ON c.id::text = cap.config->>'campaignId'
           WHERE c.workflow_id IS NOT NULL
           UNION
           SELECT ev.workflow_id, cap.account_id, 'event' AS via, ev.id::text AS via_id
           FROM cap JOIN event ev ON ev.id::text = cap.config->>'eventId'
           WHERE cap.hook_kind = 'event_registration' AND ev.workflow_id IS NOT NULL`,
          [eventId],
        );
        for (const t of targets) {
          const { rows: created } = await pool.query<{ id: string }>(
            `INSERT INTO workflow_enrollment (workflow_id, contact_id, account_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (workflow_id, contact_id) WHERE status = 'active' DO NOTHING
             RETURNING id`,
            [t.workflow_id, contactId, t.account_id],
          );
          if (created[0]) {
            await pool.query(
              `INSERT INTO audit_log (action, entity_type, entity_id, detail)
               VALUES ('workflow.auto_enroll', 'workflow_enrollment', $1::uuid,
                       jsonb_build_object('workflowId', $2::text, 'contactId', $3::text,
                                          'via', $4::text, 'viaId', $5::text,
                                          'captureEventId', $6::text))`,
              [created[0].id, t.workflow_id, contactId, t.via, t.via_id, eventId],
            );
          }
        }
      }
      return contactId;
    },

    async recordWebFormCapture(payload: Record<string, unknown>): Promise<void> {
      const pool = getPool();
      // No DB configured (mock/dev): the public opt-in page must still render its
      // confirmation, so silently no-op rather than throwing at an anonymous caller.
      if (!pool) return mockRepositories.leads.recordWebFormCapture(payload);
      // Find-or-create the standing public-opt-in web_form hook (idempotent — the
      // page is unauthenticated, so we never create from a user; the hook anchors
      // every public capture). Then append the raw payload as a bronze event.
      const { rows } = await pool.query<{ id: string }>(
        `WITH existing AS (
           SELECT id FROM lead_hook
           WHERE kind = 'web_form' AND name = 'Public opt-in page'
           LIMIT 1
         ), created AS (
           INSERT INTO lead_hook (name, kind, active)
           SELECT 'Public opt-in page', 'web_form', true
           WHERE NOT EXISTS (SELECT 1 FROM existing)
           RETURNING id
         )
         SELECT id FROM existing UNION ALL SELECT id FROM created`,
      );
      const hookId = rows[0]?.id ?? null;
      await pool.query(
        `INSERT INTO lead_capture_event (hook_id, payload_bronze, status)
         VALUES ($1, $2::jsonb, 'new')`,
        [hookId, JSON.stringify(payload)],
      );
    },
  },

  // ── Automation workflows (ADR-0014/0027) ──────────────────────────────────
  workflows: {
    async listWorkflows(): Promise<WorkflowRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.listWorkflows();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          kind: string;
          status: string;
          step_count: string;
          active_enrollments: string;
        }>(
          `SELECT w.id, w.name, w.kind::text AS kind, w.status,
                  COUNT(DISTINCT s.id) AS step_count,
                  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS active_enrollments
           FROM workflow w
           LEFT JOIN workflow_step s ON s.workflow_id = w.id
           LEFT JOIN workflow_enrollment e ON e.workflow_id = w.id
           GROUP BY w.id ORDER BY w.created_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          kind: r.kind,
          status: r.status,
          stepCount: Number(r.step_count),
          activeEnrollments: Number(r.active_enrollments),
        }));
      } catch {
        return mockRepositories.workflows.listWorkflows();
      }
    },

    async getWorkflow(id: string): Promise<WorkflowDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.getWorkflow(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          kind: string;
          status: string;
          trigger: unknown | null;
        }>(
          `SELECT id, name, kind::text AS kind, status, trigger FROM workflow WHERE id = $1`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        const { rows: steps } = await pool.query<{
          id: string;
          ordinal: number;
          kind: string;
          config: unknown | null;
        }>(
          `SELECT id, ordinal, kind::text AS kind, config
           FROM workflow_step WHERE workflow_id = $1 ORDER BY ordinal`,
          [id],
        );
        return {
          id: r.id,
          name: r.name,
          kind: r.kind,
          status: r.status,
          trigger: r.trigger != null ? JSON.stringify(r.trigger) : null,
          steps: steps.map((s) => ({
            id: s.id,
            ordinal: s.ordinal,
            kind: s.kind,
            summary: s.config != null ? JSON.stringify(s.config) : null,
          })),
        };
      } catch {
        return mockRepositories.workflows.getWorkflow(id);
      }
    },

    async createWorkflow(input: WorkflowInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.createWorkflow(input);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO workflow (name, kind, status, trigger)
         VALUES ($1, $2::workflow_kind, $3, $4::jsonb)
         RETURNING id`,
        [input.name, input.kind, input.status, input.trigger ? JSON.stringify({ note: input.trigger }) : null],
      );
      return rows[0].id;
    },

    async addStep(workflowId: string, input: WorkflowStepInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.addStep(workflowId, input);
      await pool.query(
        `INSERT INTO workflow_step (workflow_id, ordinal, kind, config)
         VALUES ($1,
                 COALESCE((SELECT MAX(ordinal) + 1 FROM workflow_step WHERE workflow_id = $1), 1),
                 $2::workflow_step_kind, $3::jsonb)`,
        [workflowId, input.kind, input.config ? JSON.stringify({ note: input.config }) : null],
      );
    },

    async deleteStep(stepId: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.deleteStep(stepId);
      await pool.query(`DELETE FROM workflow_step WHERE id = $1`, [stepId]);
    },

    async listEnrollments(): Promise<EnrollmentRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.listEnrollments();
      try {
        const { rows } = await pool.query<{
          id: string;
          contact: string | null;
          workflow: string;
          status: string;
          current_step_ordinal: number;
          enrolled_at: Date | null;
        }>(
          `SELECT e.id, c.full_name AS contact, w.name AS workflow, e.status,
                  e.current_step_ordinal, e.enrolled_at
           FROM workflow_enrollment e
           JOIN workflow w ON w.id = e.workflow_id
           LEFT JOIN contact c ON c.id = e.contact_id
           ORDER BY e.enrolled_at DESC`,
        );
        return rows.map((r) => ({
          id: r.id,
          contact: r.contact,
          workflow: r.workflow,
          status: r.status,
          currentStep: r.current_step_ordinal,
          enrolledAt: fmtDate(r.enrolled_at),
        }));
      } catch {
        return mockRepositories.workflows.listEnrollments();
      }
    },

    async enroll(workflowId: string, contactId: string, accountId: string | null): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.enroll(workflowId, contactId, accountId);
      // Idempotent: one ACTIVE enrollment per (workflow, contact) — migration 0073.
      await pool.query(
        `INSERT INTO workflow_enrollment (workflow_id, contact_id, account_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (workflow_id, contact_id) WHERE status = 'active' DO NOTHING`,
        [workflowId, contactId, nullIfEmpty(accountId)],
      );
    },

    async exitEnrollment(enrollmentId: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.exitEnrollment(enrollmentId);
      await pool.query(
        `UPDATE workflow_enrollment SET status = 'exited', completed_at = now() WHERE id = $1`,
        [enrollmentId],
      );
    },

    // ── Marketing journeys (ADR-0073, #397) — read-only over workflow kind='journey'.
    // Steps live in workflow.definition (jsonb); we parse + summarise via lib/journey.ts.
    async listJourneys(): Promise<JourneyRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.listJourneys();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          status: string;
          definition: unknown | null;
          active_enrollments: string;
        }>(
          `SELECT w.id, w.name, w.status, w.definition,
                  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS active_enrollments
           FROM workflow w
           LEFT JOIN workflow_enrollment e ON e.workflow_id = w.id
           WHERE w.kind = 'journey'
           GROUP BY w.id ORDER BY w.created_at DESC`,
        );
        return rows.map((r) => {
          const def = parseJourneyDefinition(r.definition);
          const summary = summariseJourney(def);
          return {
            id: r.id,
            name: r.name,
            status: r.status,
            stepCount: summary.stepCount,
            sendCount: summary.sendCount,
            hasAbTest: summary.hasAbTest,
            activeEnrollments: Number(r.active_enrollments),
          };
        });
      } catch {
        return mockRepositories.workflows.listJourneys();
      }
    },

    async getJourney(id: string): Promise<JourneyDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.getJourney(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          status: string;
          definition: unknown | null;
          active_enrollments: string;
        }>(
          `SELECT w.id, w.name, w.status, w.definition,
                  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS active_enrollments
           FROM workflow w
           LEFT JOIN workflow_enrollment e ON e.workflow_id = w.id
           WHERE w.id = $1 AND w.kind = 'journey'
           GROUP BY w.id`,
          [id],
        );
        const r = rows[0];
        if (!r) return null;
        const definition = parseJourneyDefinition(r.definition);
        return {
          id: r.id,
          name: r.name,
          status: r.status,
          definition,
          summary: summariseJourney(definition),
          activeEnrollments: Number(r.active_enrollments),
        };
      } catch {
        return mockRepositories.workflows.getJourney(id);
      }
    },

    // ── Journey builder (ADR-0073, #399). A journey is a SINGLE object: create
    // inserts a workflow row of kind='journey' with an empty definition; save writes
    // the whole `definition` jsonb plus name/status back onto that one row. No child
    // tables — the journey is authored/versioned as one object (ADR-0073 decision 1).
    async createJourney(name: string): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.createJourney(name);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO workflow (name, kind, status, definition)
         VALUES ($1, 'journey'::workflow_kind, 'paused', $2::jsonb)
         RETURNING id`,
        [name, JSON.stringify(EMPTY_JOURNEY_DEFINITION)],
      );
      return rows[0].id;
    },

    async saveJourney(id: string, input: JourneyInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.workflows.saveJourney(id, input);
      await pool.query(
        `UPDATE workflow
         SET name = $2, status = $3, definition = $4::jsonb
         WHERE id = $1 AND kind = 'journey'`,
        [id, input.name, input.status, JSON.stringify(input.definition)],
      );
    },
  },

  // ── Message templates (#731, ADR-0073) — render-content store for journey sends.
  // App/config content (not silver). The journey runner (BE #174) renders against
  // {id} → email {subject, html} | sms {body}. Reads degrade to [] under schema-lag
  // (migration 0134 not yet applied) so the index/picker never 500s.
  messageTemplates: {
    async listTemplates(): Promise<MessageTemplateRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.messageTemplates.listTemplates();
      try {
        const { rows } = await pool.query<MessageTemplateDbRow>(
          `SELECT id, name, channel, subject, html, body, merge_fields, updated_at
             FROM message_template
            ORDER BY created_at DESC`,
        );
        return rows.map(mapMessageTemplate);
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.messageTemplates.listTemplates();
      }
    },

    async listTemplateOptions(): Promise<MessageTemplateOption[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.messageTemplates.listTemplateOptions();
      try {
        const { rows } = await pool.query<{
          id: string;
          name: string;
          channel: MessageTemplateChannel;
        }>(`SELECT id, name, channel FROM message_template ORDER BY name ASC`);
        return rows.map((r) => ({ id: r.id, name: r.name, channel: r.channel }));
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.messageTemplates.listTemplateOptions();
      }
    },

    async getTemplate(id: string): Promise<MessageTemplateRow | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.messageTemplates.getTemplate(id);
      try {
        const { rows } = await pool.query<MessageTemplateDbRow>(
          `SELECT id, name, channel, subject, html, body, merge_fields, updated_at
             FROM message_template WHERE id = $1`,
          [id],
        );
        return rows[0] ? mapMessageTemplate(rows[0]) : null;
      } catch (err) {
        if (isSchemaLagError(err)) return null;
        return mockRepositories.messageTemplates.getTemplate(id);
      }
    },

    async createTemplate(input: MessageTemplateInput, ownerEmail: string): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.messageTemplates.createTemplate(input, ownerEmail);
      const ownerId = await resolveAppUserIdOrNull(pool, ownerEmail);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO message_template (name, channel, subject, html, body, merge_fields, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6::text[], $7)
         RETURNING id`,
        [
          input.name,
          input.channel,
          input.subject,
          input.html,
          input.body,
          input.mergeFields,
          ownerId,
        ],
      );
      return rows[0].id;
    },

    async updateTemplate(id: string, input: MessageTemplateInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.messageTemplates.updateTemplate(id, input);
      await pool.query(
        `UPDATE message_template
            SET name = $2, channel = $3, subject = $4, html = $5, body = $6,
                merge_fields = $7::text[], updated_at = now()
          WHERE id = $1`,
        [id, input.name, input.channel, input.subject, input.html, input.body, input.mergeFields],
      );
    },

    async deleteTemplate(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.messageTemplates.deleteTemplate(id);
      await pool.query(`DELETE FROM message_template WHERE id = $1`, [id]);
    },
  },

  // ── Knowledge search over the gold layer ──────────────────────────────────
  knowledge: {
    async search(query: string): Promise<KnowledgeHit[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.knowledge.search(query);
      const q = query.trim();
      if (q === "") return [];
      try {
        const like = `%${q}%`;
        const [contacts, interactions] = await Promise.all([
          pool.query<{ id: string; title: string; snippet: string | null }>(
            `SELECT c.id, c.full_name AS title,
                    COALESCE(c.headline, c.title, a.name) AS snippet
             FROM contact c LEFT JOIN account a ON a.id = c.account_id
             WHERE c.full_name ILIKE $1
                OR EXISTS (SELECT 1 FROM contact_enrichment e
                           WHERE e.contact_id = c.id AND e.value_text ILIKE $1)
             ORDER BY c.full_name LIMIT 15`,
            [like],
          ),
          pool.query<{
            id: string;
            title: string | null;
            snippet: string | null;
            occurred_at: Date | null;
          }>(
            `SELECT i.id, COALESCE(i.subject, i.source::text) AS title,
                    i.summary_gold AS snippet, i.occurred_at
             FROM interaction i
             WHERE i.summary_gold ILIKE $1 OR i.subject ILIKE $1
             ORDER BY i.occurred_at DESC LIMIT 15`,
            [like],
          ),
        ]);
        return [
          ...contacts.rows.map((r) => ({
            id: r.id,
            kind: "contact",
            title: r.title,
            snippet: r.snippet,
            href: `/contacts/${r.id}`,
            when: null,
          })),
          ...interactions.rows.map((r) => ({
            id: r.id,
            kind: "interaction",
            title: r.title ?? "Interaction",
            snippet: r.snippet,
            href: "/communications",
            when: fmtDateTime(r.occurred_at),
          })),
        ];
      } catch {
        return mockRepositories.knowledge.search(query);
      }
    },
  },

  // ── Security / compliance posture ─────────────────────────────────────────
  security: {
    async getPosture(): Promise<SecurityPosture> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.getPosture();
      try {
        const { rows } = await pool.query<{
          total_contacts: string;
          with_consent: string;
          ad_eligible: string;
          conn_active: string;
          conn_total: string;
        }>(
          `SELECT
             (SELECT count(*) FROM contact) AS total_contacts,
             (SELECT count(DISTINCT contact_id) FROM current_consent WHERE state = 'opt_in') AS with_consent,
             (SELECT count(DISTINCT contact_id) FROM current_consent
                WHERE channel = 'ad_targeting' AND state = 'opt_in') AS ad_eligible,
             (SELECT count(*) FROM connection WHERE status = 'active') AS conn_active,
             (SELECT count(*) FROM connection) AS conn_total`,
        );
        const { rows: channels } = await pool.query<{ label: string; count: string }>(
          `SELECT channel::text AS label, count(*) AS count
           FROM current_consent WHERE state = 'opt_in'
           GROUP BY channel ORDER BY channel`,
        );
        const r = rows[0];
        return {
          totalContacts: Number(r.total_contacts),
          contactsWithConsent: Number(r.with_consent),
          adEligible: Number(r.ad_eligible),
          connectionsActive: Number(r.conn_active),
          connectionsTotal: Number(r.conn_total),
          consentByChannel: channels.map((c) => ({ label: c.label, count: Number(c.count) })),
        };
      } catch {
        return mockRepositories.security.getPosture();
      }
    },

    // ── Tenant Mapping (ADR-0051 — admin-managed, never inferred from domains) ──
    async listTenantMappings(): Promise<TenantMapping[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.listTenantMappings();
      try {
        const { rows } = await pool.query<{
          tenant_id: string; account_id: string; account: string | null;
          display_name: string | null; updated_at: string | null;
        }>(
          `SELECT t.tenant_id, t.account_id::text AS account_id, a.name AS account,
                  t.display_name, t.updated_at::text AS updated_at
             FROM account_tenant t
             LEFT JOIN account a ON a.id = t.account_id
            ORDER BY a.name NULLS LAST, t.tenant_id`,
        );
        return rows.map((r) => ({
          tenantId: r.tenant_id, accountId: r.account_id, accountName: r.account,
          displayName: r.display_name, updatedAt: r.updated_at,
        }));
      } catch {
        return mockRepositories.security.listTenantMappings();
      }
    },

    async listTenantMappingsForAccount(accountId): Promise<TenantMapping[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.listTenantMappingsForAccount(accountId);
      try {
        const { rows } = await pool.query<{
          tenant_id: string; account_id: string; account: string | null;
          display_name: string | null; updated_at: string | null;
        }>(
          `SELECT t.tenant_id, t.account_id::text AS account_id, a.name AS account,
                  t.display_name, t.updated_at::text AS updated_at
             FROM account_tenant t
             LEFT JOIN account a ON a.id = t.account_id
            WHERE t.account_id = $1::uuid
            ORDER BY t.tenant_id`,
          [accountId],
        );
        return rows.map((r) => ({
          tenantId: r.tenant_id, accountId: r.account_id, accountName: r.account,
          displayName: r.display_name, updatedAt: r.updated_at,
        }));
      } catch {
        return mockRepositories.security.listTenantMappingsForAccount(accountId);
      }
    },

    async upsertTenantMapping(input): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.upsertTenantMapping(input);
      await pool.query(
        `INSERT INTO account_tenant (tenant_id, account_id, display_name)
         VALUES ($1, $2::uuid, $3)
         ON CONFLICT (tenant_id) DO UPDATE SET
           account_id = EXCLUDED.account_id, display_name = EXCLUDED.display_name,
           updated_at = now()`,
        [input.tenantId, input.accountId, input.displayName],
      );
    },

    async deleteTenantMapping(tenantId): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.deleteTenantMapping(tenantId);
      await pool.query(`DELETE FROM account_tenant WHERE tenant_id = $1`, [tenantId]);
    },

    async listUnmappedTenants(): Promise<UnmappedTenant[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.listUnmappedTenants();
      try {
        // Envelope tenant_id across the posture bronze set (local-pipeline
        // security-posture loads, migrations 0038–0041) minus the mapped set —
        // unmapped tenants surface rather than disappear (ADR-0051).
        const { rows } = await pool.query<{ tenant_id: string }>(
          `SELECT DISTINCT tenant_id FROM (
                     SELECT tenant_id FROM secure_scores
           UNION ALL SELECT tenant_id FROM entra_conditional_access_policies
           UNION ALL SELECT tenant_id FROM intune_security_policies
           UNION ALL SELECT tenant_id FROM device_configuration_policies
           UNION ALL SELECT tenant_id FROM autopilot_policies
           UNION ALL SELECT tenant_id FROM defender_xdr_security_policies
           ) b
           WHERE tenant_id IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM account_tenant m WHERE m.tenant_id = b.tenant_id)
           ORDER BY tenant_id`,
        );
        return rows.map((r) => ({ tenantId: r.tenant_id }));
      } catch {
        return mockRepositories.security.listUnmappedTenants();
      }
    },

    async listAccountsNeedingTenant(): Promise<AccountNeedingTenant[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.listAccountsNeedingTenant();
      try {
        // Active accounts with NO account_tenant row (issue #1371, epic #1366 gap (f)). Inverse of
        // listUnmappedTenants: these clients have a tenant in the real world but its GUID was never
        // collected (no posture bronze) nor linked, so the tenant-first table has nothing to show.
        // Inactive accounts are excluded — they don't get posture/comms collection (ADR-0126).
        const { rows } = await pool.query<{ account_id: string; name: string }>(
          `SELECT a.id::text AS account_id, a.name
             FROM account a
            WHERE a.is_active
              AND NOT EXISTS (SELECT 1 FROM account_tenant m WHERE m.account_id = a.id)
            ORDER BY a.name`,
        );
        return rows.map((r) => ({ accountId: r.account_id, accountName: r.name }));
      } catch {
        return mockRepositories.security.listAccountsNeedingTenant();
      }
    },

    // ── Account-scoped posture reads (#93, ADR-0051) ─────────────────────────
    async listTenantPostureForAccount(accountId): Promise<TenantPostureRollup[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.listTenantPostureForAccount(accountId);
      try {
        // LEFT JOIN: a mapped tenant the pipeline hasn't classified yet still
        // surfaces (all-null rollup) — "not refreshed" is a state, not an absence.
        const { rows } = await pool.query<{
          tenant_id: string; display_name: string | null;
          secure_score_current: string | null; secure_score_max: string | null;
          licensed_user_count: number | null; active_user_count: number | null;
          policies_compliant: number | null; policies_drift: number | null;
          policies_ungoverned: number | null; policies_missing: number | null;
          exposures_open: number | null; refreshed_at: string | null;
        }>(
          `SELECT m.tenant_id, m.display_name,
                  p.secure_score_current, p.secure_score_max,
                  p.licensed_user_count, p.active_user_count,
                  p.policies_compliant, p.policies_drift,
                  p.policies_ungoverned, p.policies_missing,
                  p.exposures_open, p.refreshed_at::text AS refreshed_at
             FROM account_tenant m
             LEFT JOIN tenant_posture p ON p.tenant_id = m.tenant_id
            WHERE m.account_id = $1::uuid
            ORDER BY m.display_name NULLS LAST, m.tenant_id`,
          [accountId],
        );
        return rows.map((r) => ({
          tenantId: r.tenant_id,
          displayName: r.display_name,
          secureScoreCurrent: r.secure_score_current === null ? null : Number(r.secure_score_current),
          secureScoreMax: r.secure_score_max === null ? null : Number(r.secure_score_max),
          licensedUserCount: r.licensed_user_count,
          activeUserCount: r.active_user_count,
          policiesCompliant: r.policies_compliant ?? 0,
          policiesDrift: r.policies_drift ?? 0,
          policiesUngoverned: r.policies_ungoverned ?? 0,
          policiesMissing: r.policies_missing ?? 0,
          exposuresOpen: r.exposures_open ?? 0,
          refreshedAt: r.refreshed_at,
        }));
      } catch (err) {
        // Optional posture enrichment (#301): not-yet-migrated table → empty card, not a
        // page failure. Real outages still fail closed via the guarded fallback.
        if (isSchemaLagError(err)) return [];
        return mockRepositories.security.listTenantPostureForAccount(accountId);
      }
    },

    async listPosturePoliciesForAccount(accountId): Promise<PosturePolicyRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.listPosturePoliciesForAccount(accountId);
      try {
        const { rows } = await pool.query<{
          tenant_id: string; policy_family: string; policy_id: string;
          policy_name: string | null; classification: string;
          observed_modified_at: string | null; golden_approved_at: string | null;
        }>(
          `SELECT p.tenant_id, p.policy_family, p.policy_id, p.policy_name,
                  p.classification,
                  p.observed_modified_at::text AS observed_modified_at,
                  p.golden_approved_at::text AS golden_approved_at
             FROM posture_policy p
             JOIN account_tenant m ON m.tenant_id = p.tenant_id
            WHERE m.account_id = $1::uuid
            ORDER BY p.policy_family,
                     array_position(ARRAY['drift','missing','ungoverned','compliant'], p.classification),
                     p.policy_name NULLS LAST`,
          [accountId],
        );
        return rows.map((r) => ({
          tenantId: r.tenant_id,
          policyFamily: r.policy_family,
          policyId: r.policy_id,
          policyName: r.policy_name,
          classification: r.classification,
          observedModifiedAt: r.observed_modified_at,
          goldenApprovedAt: r.golden_approved_at,
        }));
      } catch (err) {
        if (isSchemaLagError(err)) return []; // optional enrichment (#301)
        return mockRepositories.security.listPosturePoliciesForAccount(accountId);
      }
    },

    async listSecureScoreControlsForAccount(accountId): Promise<SecureScoreControl[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.listSecureScoreControlsForAccount(accountId);
      try {
        // Bronze is all-text (migration 0038): `deprecated` holds 'True'/'False'
        // strings verbatim from Graph, so the filter is a case-folded text match.
        const { rows } = await pool.query<{
          tenant_id: string; control_name: string | null; control_category: string | null;
          title: string | null; max_score: string | null; service: string | null;
          user_impact: string | null; tier: string | null;
        }>(
          `SELECT c.tenant_id, c.control_name, c.control_category, c.title,
                  c.max_score, c.service, c.user_impact, c.tier
             FROM secure_score_control_profiles c
             JOIN account_tenant m ON m.tenant_id = c.tenant_id
            WHERE m.account_id = $1::uuid
              AND lower(COALESCE(c.deprecated, 'false')) <> 'true'
            ORDER BY c.control_category NULLS LAST, c.title NULLS LAST`,
          [accountId],
        );
        return rows.map((r) => ({
          tenantId: r.tenant_id,
          controlName: r.control_name,
          controlCategory: r.control_category,
          title: r.title,
          maxScore: r.max_score,
          service: r.service,
          userImpact: r.user_impact,
          tier: r.tier,
        }));
      } catch (err) {
        if (isSchemaLagError(err)) return []; // optional enrichment (#301)
        return mockRepositories.security.listSecureScoreControlsForAccount(accountId);
      }
    },

    async listCredentialExposuresForAccount(accountId): Promise<CredentialExposureRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.listCredentialExposuresForAccount(accountId);
      try {
        const { rows } = await pool.query<{
          id: string; email: string | null; breach_source: string | null;
          breach_date: string | null; exposed_data: string[] | null;
          password_status: string | null; severity: string | null; status: string;
          last_seen_at: string | null;
        }>(
          `SELECT id::text AS id, email, breach_source, breach_date::text AS breach_date,
                  exposed_data, password_status, severity, status,
                  last_seen_at::text AS last_seen_at
             FROM credential_exposure
            WHERE account_id = $1::uuid
            ORDER BY (status = 'resolved'), last_seen_at DESC NULLS LAST`,
          [accountId],
        );
        return rows.map((r) => ({
          id: r.id,
          email: r.email,
          breachSource: r.breach_source,
          breachDate: r.breach_date,
          exposedData: r.exposed_data ?? [],
          passwordStatus: r.password_status,
          severity: r.severity,
          status: r.status,
          lastSeenAt: r.last_seen_at,
        }));
      } catch (err) {
        if (isSchemaLagError(err)) return []; // optional enrichment (#301)
        return mockRepositories.security.listCredentialExposuresForAccount(accountId);
      }
    },

    async countDefenderIncidentsForAccount(accountId): Promise<DefenderIncidentCounts> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.countDefenderIncidentsForAccount(accountId);
      try {
        // Bronze is all-text (0076): status holds Graph values verbatim
        // ('active'|'inProgress'|'awaitingAction'|'resolved'|'redirected'), so
        // "open" is a case-folded exclusion of the two terminal states.
        const { rows } = await pool.query<{ open: string; total: string }>(
          `SELECT COUNT(*) FILTER (
                    WHERE lower(COALESCE(i.status, '')) NOT IN ('resolved', 'redirected')
                  ) AS open,
                  COUNT(*) AS total
             FROM defender_incidents i
             JOIN account_tenant m ON m.tenant_id = i.tenant_id
            WHERE m.account_id = $1::uuid`,
          [accountId],
        );
        return { open: Number(rows[0]?.open ?? 0), total: Number(rows[0]?.total ?? 0) };
      } catch (err) {
        // optional badge (#301): not-yet-migrated table → "no coverage", not a page failure
        if (isSchemaLagError(err)) return { open: 0, total: 0 };
        return mockRepositories.security.countDefenderIncidentsForAccount(accountId);
      }
    },

    async countMfaRegistrationForAccount(accountId): Promise<MfaRegistrationCounts> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.countMfaRegistrationForAccount(accountId);
      try {
        // Bronze is all-text (0077): is_mfa_registered holds the Graph boolean
        // stringified, so "registered" is a case-folded 'true' match.
        const { rows } = await pool.query<{ registered: string; total: string }>(
          `SELECT COUNT(*) FILTER (
                    WHERE lower(COALESCE(a.is_mfa_registered, '')) = 'true'
                  ) AS registered,
                  COUNT(*) AS total
             FROM entra_auth_methods a
             JOIN account_tenant m ON m.tenant_id = a.tenant_id
            WHERE m.account_id = $1::uuid`,
          [accountId],
        );
        return {
          registered: Number(rows[0]?.registered ?? 0),
          total: Number(rows[0]?.total ?? 0),
        };
      } catch (err) {
        // optional badge (#301): not-yet-migrated table → "no coverage", not a page failure
        if (isSchemaLagError(err)) return { registered: 0, total: 0 };
        return mockRepositories.security.countMfaRegistrationForAccount(accountId);
      }
    },

    async listSharePointSitesForAccount(accountId): Promise<SharePointSiteRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.listSharePointSitesForAccount(accountId);
      try {
        // Bronze is all-text (0078): site METADATA only — the table has no
        // file/drive columns by design (Sites.Read.All; Files.Read.All pruned).
        const { rows } = await pool.query<{
          tenant_id: string;
          external_id: string;
          display_name: string | null;
          web_url: string | null;
          description: string | null;
          created_date_time: string | null;
          last_modified_date_time: string | null;
          web_template: string | null;
          is_personal_site: string | null;
          storage_used_bytes: string | null;
          storage_quota_bytes: string | null;
          collected_at: string;
        }>(
          `SELECT s.tenant_id, s.external_id, s.display_name, s.web_url, s.description,
                  s.created_date_time, s.last_modified_date_time, s.web_template,
                  s.is_personal_site, s.storage_used_bytes, s.storage_quota_bytes,
                  s.collected_at
             FROM sharepoint_sites s
             JOIN account_tenant m ON m.tenant_id = s.tenant_id
            WHERE m.account_id = $1::uuid
            ORDER BY lower(COALESCE(s.display_name, s.web_url, s.external_id))`,
          [accountId],
        );
        return rows.map((r) => ({
          tenantId: r.tenant_id,
          externalId: r.external_id,
          displayName: r.display_name,
          webUrl: r.web_url,
          description: r.description,
          createdAt: r.created_date_time,
          lastModifiedAt: r.last_modified_date_time,
          template: r.web_template,
          isPersonalSite: r.is_personal_site,
          storageUsedBytes: r.storage_used_bytes,
          storageQuotaBytes: r.storage_quota_bytes,
          collectedAt: r.collected_at,
        }));
      } catch (err) {
        if (isSchemaLagError(err)) return []; // optional enrichment (#301)
        return mockRepositories.security.listSharePointSitesForAccount(accountId);
      }
    },

    async listDnsDomainsForAccount(accountId): Promise<DnsDomainRollup[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.listDnsDomainsForAccount(accountId);
      try {
        // Account-keyed per the ADR-0063 amendment: one row per domain in the account's
        // GUI-managed account_domain list, LEFT JOINed to its dns_domain rollup — a
        // tracked-but-not-yet-captured domain still surfaces (null verdict) and sorts last.
        const { rows } = await pool.query<{
          domain: string; note: string | null; verdict: string | null;
          records_compliant: number | null; records_drift: number | null;
          records_ungoverned: number | null; records_missing: number | null;
          score: string | null; last_captured_at: string | null;
        }>(
          `SELECT ad.domain, ad.note, d.verdict,
                  d.records_compliant, d.records_drift,
                  d.records_ungoverned, d.records_missing,
                  d.score, d.last_captured_at::text AS last_captured_at
             FROM account_domain ad
             LEFT JOIN dns_domain d
                    ON d.account_id = ad.account_id AND d.domain = ad.domain
            WHERE ad.account_id = $1::uuid
            ORDER BY array_position(ARRAY['not-in-azure','in-azure-readonly','managed'], d.verdict) NULLS LAST,
                     d.records_drift DESC NULLS LAST, ad.domain`,
          [accountId],
        );
        return rows.map((r) => ({
          domain: r.domain,
          note: r.note,
          verdict: (r.verdict as DnsDomainRollup["verdict"]) ?? null,
          recordsCompliant: r.records_compliant ?? 0,
          recordsDrift: r.records_drift ?? 0,
          recordsUngoverned: r.records_ungoverned ?? 0,
          recordsMissing: r.records_missing ?? 0,
          score: r.score === null ? null : Number(r.score),
          lastCapturedAt: r.last_captured_at,
        }));
      } catch (err) {
        if (isSchemaLagError(err)) return []; // optional enrichment (#301)
        return mockRepositories.security.listDnsDomainsForAccount(accountId);
      }
    },

    async listDnsRecordDriftForAccount(accountId): Promise<DnsRecordDrift[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.security.listDnsRecordDriftForAccount(accountId);
      try {
        // Record-level drift (#576, ADR-0063 §3): full-outer-join the current public-plane
        // capture (dns_records) against the approved baseline (dns_golden.golden_records,
        // unnested) per (domain, record_type, name), classified with the SAME four-state
        // semantics as the on-prem Get-ImperionDnsDrift merge — computed read-only here so
        // the GUI can list the individual records that differ vs golden. Scoped to the
        // account's tracked domains (account_domain) and keyed on account_id for isolation;
        // 'compliant' records are omitted (the list is the drift worklist, not the full zone).
        const { rows } = await pool.query<{
          domain: string; record_type: string; name: string; status: string;
          observed_value: string | null; golden_value: string | null;
        }>(
          `WITH governed AS (
             SELECT ad.domain, ad.account_id
               FROM account_domain ad
              WHERE ad.account_id = $1::uuid
           ),
           golden_record AS (
             SELECT g.account_id, g.domain,
                    gr->>'record_type' AS record_type,
                    gr->>'name'        AS name,
                    gr->>'value'       AS value
               FROM dns_golden g
               CROSS JOIN LATERAL jsonb_array_elements(g.golden_records) AS gr
              WHERE g.account_id = $1::uuid
           ),
           captured_record AS (
             SELECT r.account_id, r.domain, r.record_type, r.name, r.value
               FROM dns_records r
              WHERE r.plane = 'public' AND r.account_id = $1::uuid
           )
           SELECT gov.domain,
                  COALESCE(g.record_type, c.record_type) AS record_type,
                  COALESCE(g.name, c.name)               AS name,
                  CASE
                      WHEN g.name IS NULL THEN 'ungoverned'
                      WHEN c.name IS NULL THEN 'missing'
                      WHEN c.value = g.value THEN 'compliant'
                      ELSE 'drift'
                  END AS status,
                  c.value AS observed_value,
                  g.value AS golden_value
             FROM governed gov
             LEFT JOIN golden_record g ON g.domain = gov.domain
             FULL OUTER JOIN captured_record c
                    ON c.domain = COALESCE(g.domain, gov.domain)
                   AND c.record_type = g.record_type
                   AND c.name = g.name
            WHERE COALESCE(g.domain, c.domain) IN (SELECT domain FROM governed)
              AND (CASE
                       WHEN g.name IS NULL THEN 'ungoverned'
                       WHEN c.name IS NULL THEN 'missing'
                       WHEN c.value = g.value THEN 'compliant'
                       ELSE 'drift'
                   END) <> 'compliant'
            ORDER BY array_position(ARRAY['missing','drift','ungoverned'],
                       (CASE
                            WHEN g.name IS NULL THEN 'ungoverned'
                            WHEN c.name IS NULL THEN 'missing'
                            WHEN c.value = g.value THEN 'compliant'
                            ELSE 'drift'
                        END)),
                     gov.domain, record_type, name`,
          [accountId],
        );
        return rows.map((r) => ({
          domain: r.domain,
          recordType: r.record_type,
          name: r.name,
          status: r.status as DnsRecordDrift["status"],
          observedValue: r.observed_value,
          goldenValue: r.golden_value,
        }));
      } catch (err) {
        if (isSchemaLagError(err)) return []; // optional enrichment (#301)
        return mockRepositories.security.listDnsRecordDriftForAccount(accountId);
      }
    },
  },

  // ── Work collaboration: comments + activity feed (ADR-0064 A1, migration 0094;
  //    @mentions A2, migration 0097, #331) ─────────────────────────
  work: {
    async listMentionableUsers(): Promise<MentionableUser[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.work.listMentionableUsers();
      try {
        // Candidate set for the typeahead: every app_user with a usable email
        // (the handle = lowercased local-part). Ordered for a stable typeahead.
        const { rows } = await pool.query<{ id: string; display_name: string | null; email: string }>(
          `SELECT id::text AS id, display_name, email
             FROM app_user
            WHERE email IS NOT NULL AND position('@' in email) > 1
            ORDER BY lower(coalesce(display_name, email))`,
        );
        return rows
          .map((r) => ({
            id: r.id,
            displayName: r.display_name ?? r.email.split("@")[0],
            handle: r.email.split("@")[0].toLowerCase(),
          }))
          .filter((u) => /^[a-z0-9._-]+$/.test(u.handle));
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.work.listMentionableUsers();
      }
    },

    async listComments(parentType: WorkParentType, parentId: string): Promise<WorkComment[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.work.listComments(parentType, parentId);
      try {
        const { rows } = await pool.query<{
          id: string; parent_type: string; parent_id: string;
          author_user_id: string | null; author: string | null;
          body: string; edited_at: string | null; created_at: string;
        }>(
          `SELECT c.id, c.parent_type, c.parent_id::text AS parent_id,
                  c.author_user_id::text AS author_user_id, u.display_name AS author,
                  c.body, c.edited_at::text AS edited_at, c.created_at::text AS created_at
             FROM work_comment c
             LEFT JOIN app_user u ON u.id = c.author_user_id
            WHERE c.parent_type = $1 AND c.parent_id = $2::uuid AND c.deleted_at IS NULL
            ORDER BY c.created_at ASC`,
          [parentType, parentId],
        );
        const mentions = await loadMentions(pool, rows.map((r) => r.id));
        return rows.map((r) => mapWorkComment(r, mentions.get(r.id) ?? []));
      } catch (err) {
        if (isSchemaLagError(err)) return []; // schema not applied yet (#330)
        return mockRepositories.work.listComments(parentType, parentId);
      }
    },

    async listActivity(
      parentType: WorkParentType,
      parentId: string,
      opts?: { commentsOnly?: boolean; limit?: number; offset?: number },
    ): Promise<WorkActivityEntry[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.work.listActivity(parentType, parentId, opts);
      const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
      const offset = Math.max(opts?.offset ?? 0, 0);
      try {
        // The feed is the view (comments ∪ audit events). app_user is joined for the
        // actor display name; commentsOnly drops the 'event' rows (A1 filter).
        const { rows } = await pool.query<{
          id: string; kind: "comment" | "event"; parent_type: string; parent_id: string;
          actor_user_id: string | null; actor: string | null;
          body: string | null; action: string | null; detail: unknown;
          edited_at: string | null; occurred_at: string;
        }>(
          `SELECT f.id, f.kind, f.parent_type, f.parent_id::text AS parent_id,
                  f.actor_user_id::text AS actor_user_id, u.display_name AS actor,
                  f.body, f.action, f.detail,
                  f.edited_at::text AS edited_at, f.occurred_at::text AS occurred_at
             FROM work_activity_feed f
             LEFT JOIN app_user u ON u.id = f.actor_user_id
            WHERE f.parent_type = $1 AND f.parent_id = $2::uuid
              AND ($3::boolean IS FALSE OR f.kind = 'comment')
            ORDER BY f.occurred_at DESC
            LIMIT $4 OFFSET $5`,
          [parentType, parentId, opts?.commentsOnly ?? false, limit, offset],
        );
        // Mentions hang off comment rows only; batch-load by the comment ids.
        const commentIds = rows.filter((r) => r.kind === "comment").map((r) => r.id);
        const mentions = await loadMentions(pool, commentIds);
        return rows.map((r) => ({
          id: r.id,
          kind: r.kind,
          parentType: r.parent_type as WorkParentType,
          parentId: r.parent_id,
          actorUserId: r.actor_user_id,
          actor: r.actor,
          body: r.body,
          action: r.action,
          detail: (r.detail as Record<string, unknown> | null) ?? null,
          editedAt: r.edited_at,
          occurredAt: r.occurred_at,
          mentions: r.kind === "comment" ? mentions.get(r.id) ?? [] : [],
        }));
      } catch (err) {
        if (isSchemaLagError(err)) return []; // schema not applied yet (#330)
        return mockRepositories.work.listActivity(parentType, parentId, opts);
      }
    },

    async addComment(input: WorkCommentInput): Promise<WorkComment> {
      const pool = getPool();
      if (!pool) return mockRepositories.work.addComment(input);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query<CommentDbRow>(
          `WITH ins AS (
             INSERT INTO work_comment (parent_type, parent_id, author_user_id, body)
             VALUES ($1, $2::uuid, $3::uuid, $4)
             RETURNING *
           )
           SELECT ins.id, ins.parent_type, ins.parent_id::text AS parent_id,
                  ins.author_user_id::text AS author_user_id, u.display_name AS author,
                  ins.body, ins.edited_at::text AS edited_at, ins.created_at::text AS created_at
             FROM ins LEFT JOIN app_user u ON u.id = ins.author_user_id`,
          [input.parentType, input.parentId, input.authorUserId, input.body],
        );
        const row = rows[0];
        // Parse @mentions, persist the links, and emit a notification event each
        // (ADR-0064 A2) — all in the comment's transaction so a comment never
        // half-mentions.
        const mentions = await persistMentions(
          client, row.id, input.body, input.parentType, input.parentId, input.authorUserId,
        );
        // A3 (#332): notify everyone watching/assigned to this object that a comment
        // landed (kind=commented), EXCLUDING the author (insertNotification skips
        // self) and anyone already notified by an @mention (kind=mentioned) above.
        const mentionedIds = new Set(mentions.map((m) => m.userId).filter(Boolean));
        const { rows: watchers } = await client.query<{ user_id: string }>(
          `SELECT user_id::text AS user_id FROM work_assignment
            WHERE parent_type = $1 AND parent_id = $2::uuid`,
          [input.parentType, input.parentId],
        );
        for (const w of watchers) {
          if (mentionedIds.has(w.user_id)) continue;
          await insertNotification(
            client, w.user_id, "commented", input.parentType, input.parentId,
            input.authorUserId, { title: "New comment on a work item you follow" },
          );
        }
        await client.query("COMMIT");
        return mapWorkComment(row, mentions);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async editComment(
      id: string,
      body: string,
      editorUserId: string | null,
      asAdmin: boolean,
    ): Promise<WorkComment | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.work.editComment(id, body, editorUserId, asAdmin);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Author-scoped unless admin; deleted comments can't be edited.
        const { rows } = await client.query<CommentDbRow>(
          `WITH upd AS (
             UPDATE work_comment
                SET body = $2, edited_at = now()
              WHERE id = $1::uuid AND deleted_at IS NULL
                AND ($4::boolean IS TRUE OR author_user_id = $3::uuid)
             RETURNING *
           )
           SELECT upd.id, upd.parent_type, upd.parent_id::text AS parent_id,
                  upd.author_user_id::text AS author_user_id, u.display_name AS author,
                  upd.body, upd.edited_at::text AS edited_at, upd.created_at::text AS created_at
             FROM upd LEFT JOIN app_user u ON u.id = upd.author_user_id`,
          [id, body, editorUserId, asAdmin],
        );
        const row = rows[0];
        if (!row) {
          await client.query("ROLLBACK");
          return null;
        }
        // Re-parse the edited body and reconcile the mention links: drop any whose
        // user is no longer mentioned, then upsert the current set (idempotent on
        // the unique constraint). A newly-added mention emits a notification event.
        const mentions = await reconcileMentions(
          client, row.id, body, row.parent_type as WorkParentType, row.parent_id, editorUserId,
        );
        await client.query("COMMIT");
        return mapWorkComment(row, mentions);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async deleteComment(id: string, actorUserId: string | null, asAdmin: boolean): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.work.deleteComment(id, actorUserId, asAdmin);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Soft-delete (author-scoped unless admin); retains the row for audit (NFR-2).
        const { rows } = await client.query<{ parent_type: string; parent_id: string }>(
          `UPDATE work_comment
              SET deleted_at = now()
            WHERE id = $1::uuid AND deleted_at IS NULL
              AND ($3::boolean IS TRUE OR author_user_id = $2::uuid)
          RETURNING parent_type, parent_id::text AS parent_id`,
          [id, actorUserId, asAdmin],
        );
        if (rows.length === 0) {
          await client.query("ROLLBACK");
          return false;
        }
        // Acceptance: a delete leaves an audit record in the activity feed.
        await client.query(
          `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, detail)
           VALUES ($1::uuid, 'comment.deleted', $2, $3::uuid,
                   jsonb_build_object('commentId', $4::text))`,
          [actorUserId, rows[0].parent_type, rows[0].parent_id, id],
        );
        await client.query("COMMIT");
        return true;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async emitWorkEvent(input: WorkEventInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.work.emitWorkEvent(input);
      try {
        // The (entity_type, entity_id) pair maps onto (parent_type, parent_id)
        // in work_activity_feed, so this audit row surfaces on the object's
        // feed (#438, ADR-0064 A1). No new schema — reuses the A1 mechanism.
        await pool.query(
          `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, detail)
           VALUES ($1::uuid, $2, $3, $4::uuid, $5::jsonb)`,
          [
            input.actorUserId,
            input.action,
            input.parentType,
            input.parentId,
            JSON.stringify(input.detail ?? {}),
          ],
        );
      } catch (err) {
        // Never fail the originating mutation on a feed-event write (house style).
        console.error(`[work] emitWorkEvent failed for ${input.action}:`, err);
      }
    },
  },

  // ── Attachments (ADR-0064 A4, #333) ────────────────────────────────────────
  attachments: {
    async listAttachments(parentType: WorkParentType, parentId: string): Promise<WorkAttachment[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.attachments.listAttachments(parentType, parentId);
      try {
        const { rows } = await pool.query<AttachmentDbRow>(
          `SELECT a.id, a.parent_type, a.parent_id::text AS parent_id,
                  a.storage_ref, a.filename, a.content_type, a.size_bytes::text AS size_bytes,
                  a.uploaded_by::text AS uploaded_by, u.display_name AS uploaded_by_name,
                  a.created_at::text AS created_at
             FROM work_attachment a
             LEFT JOIN app_user u ON u.id = a.uploaded_by
            WHERE a.parent_type = $1 AND a.parent_id = $2::uuid AND a.deleted_at IS NULL
            ORDER BY a.created_at DESC`,
          [parentType, parentId],
        );
        return rows.map(mapWorkAttachment);
      } catch (err) {
        if (isSchemaLagError(err)) return []; // schema not applied yet (#333)
        return mockRepositories.attachments.listAttachments(parentType, parentId);
      }
    },

    async addAttachment(input: WorkAttachmentInput): Promise<WorkAttachment> {
      const pool = getPool();
      if (!pool) return mockRepositories.attachments.addAttachment(input);
      const { rows } = await pool.query<AttachmentDbRow>(
        `WITH ins AS (
           INSERT INTO work_attachment
             (parent_type, parent_id, storage_ref, filename, content_type, size_bytes, uploaded_by)
           VALUES ($1, $2::uuid, $3, $4, $5, $6, $7::uuid)
           RETURNING *
         )
         SELECT ins.id, ins.parent_type, ins.parent_id::text AS parent_id,
                ins.storage_ref, ins.filename, ins.content_type, ins.size_bytes::text AS size_bytes,
                ins.uploaded_by::text AS uploaded_by, u.display_name AS uploaded_by_name,
                ins.created_at::text AS created_at
           FROM ins LEFT JOIN app_user u ON u.id = ins.uploaded_by`,
        [
          input.parentType, input.parentId, input.storageRef, input.filename,
          input.contentType, input.sizeBytes, input.uploadedByUserId,
        ],
      );
      return mapWorkAttachment(rows[0]);
    },

    async removeAttachment(
      id: string,
      actorUserId: string | null,
      asAdmin: boolean,
    ): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.attachments.removeAttachment(id, actorUserId, asAdmin);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Soft-delete (uploader-scoped unless admin); retains the row for audit (NFR-2).
        const { rows } = await client.query<{ parent_type: string; parent_id: string; filename: string }>(
          `UPDATE work_attachment
              SET deleted_at = now()
            WHERE id = $1::uuid AND deleted_at IS NULL
              AND ($3::boolean IS TRUE OR uploaded_by = $2::uuid)
          RETURNING parent_type, parent_id::text AS parent_id, filename`,
          [id, actorUserId, asAdmin],
        );
        if (rows.length === 0) {
          await client.query("ROLLBACK");
          return false;
        }
        // Acceptance: removal is audited + emits an activity event (the feed view
        // surfaces audit_log events for the same object).
        await client.query(
          `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, detail)
           VALUES ($1::uuid, 'attachment.removed', $2, $3::uuid,
                   jsonb_build_object('attachmentId', $4::text, 'filename', $5::text))`,
          [actorUserId, rows[0].parent_type, rows[0].parent_id, id, rows[0].filename],
        );
        await client.query("COMMIT");
        return true;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
  },

  // ── Notifications — the in-app bell (ADR-0064 A3, #332) ─────────────────────
  notifications: {
    async listForUser(
      recipientUserId: string,
      opts?: { unreadOnly?: boolean; limit?: number },
    ): Promise<Notification[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.notifications.listForUser(recipientUserId, opts);
      const limit = Math.min(Math.max(opts?.limit ?? 30, 1), 100);
      try {
        const { rows } = await pool.query<NotificationDbRow>(
          `SELECT n.id, n.kind, n.parent_type, n.parent_id::text AS parent_id,
                  coalesce(n.payload->>'actor', a.display_name) AS actor,
                  coalesce(n.payload->>'title', n.kind) AS title,
                  (n.read_at IS NOT NULL) AS read, n.created_at::text AS created_at
             FROM notification n
             LEFT JOIN app_user a ON a.id = n.actor_user_id
            WHERE n.recipient_user_id = $1::uuid
              AND ($2::boolean IS FALSE OR n.read_at IS NULL)
            ORDER BY n.created_at DESC
            LIMIT $3`,
          [recipientUserId, opts?.unreadOnly ?? false, limit],
        );
        return rows.map(mapNotification);
      } catch (err) {
        if (isSchemaLagError(err)) return []; // schema not applied yet (#332)
        return mockRepositories.notifications.listForUser(recipientUserId, opts);
      }
    },

    async unreadCount(recipientUserId: string): Promise<number> {
      const pool = getPool();
      if (!pool) return mockRepositories.notifications.unreadCount(recipientUserId);
      try {
        const { rows } = await pool.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM notification
            WHERE recipient_user_id = $1::uuid AND read_at IS NULL`,
          [recipientUserId],
        );
        return Number(rows[0]?.count ?? 0);
      } catch (err) {
        if (isSchemaLagError(err)) return 0; // schema not applied yet (#332)
        return mockRepositories.notifications.unreadCount(recipientUserId);
      }
    },

    async markRead(id: string, recipientUserId: string): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.notifications.markRead(id, recipientUserId);
      try {
        // Recipient-scoped: a user can only mark their OWN notifications read.
        const { rows } = await pool.query<{ id: string }>(
          `UPDATE notification SET read_at = now()
            WHERE id = $1::uuid AND recipient_user_id = $2::uuid AND read_at IS NULL
          RETURNING id`,
          [id, recipientUserId],
        );
        return rows.length > 0;
      } catch (err) {
        if (isSchemaLagError(err)) return false; // schema not applied yet (#332)
        throw err;
      }
    },

    async markAllRead(recipientUserId: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.notifications.markAllRead(recipientUserId);
      try {
        await pool.query(
          `UPDATE notification SET read_at = now()
            WHERE recipient_user_id = $1::uuid AND read_at IS NULL`,
          [recipientUserId],
        );
      } catch (err) {
        if (isSchemaLagError(err)) return; // schema not applied yet (#332)
        throw err;
      }
    },

    async dispatch(
      input: NotificationInput,
      recipientUserIds: string[],
      client?: Queryable,
    ): Promise<void> {
      const q: Queryable | Pool | null = client ?? getPool();
      if (!q) return mockRepositories.notifications.dispatch(input, recipientUserIds, client);
      // Never notify the actor; dedupe the recipient set.
      const recipients = Array.from(new Set(recipientUserIds)).filter(
        (uid) => uid && uid !== input.actorUserId,
      );
      if (recipients.length === 0) return;
      try {
        // One INSERT per recipient, suppressing any user that has explicitly muted
        // this kind on the in_app channel (notification_pref enabled=false). Absence
        // of a pref row = default ON (NOT EXISTS leaves the insert in place).
        for (const uid of recipients) {
          await q.query(
            `INSERT INTO notification
               (recipient_user_id, kind, parent_type, parent_id, actor_user_id, payload)
             SELECT $1::uuid, $2, $3, $4::uuid, $5::uuid, $6::jsonb
              WHERE NOT EXISTS (
                SELECT 1 FROM notification_pref p
                 WHERE p.user_id = $1::uuid AND p.kind = $2
                   AND p.channel = 'in_app' AND p.enabled = false
              )`,
            [
              uid, input.kind, input.parentType, input.parentId,
              input.actorUserId, JSON.stringify(input.payload),
            ],
          );
        }
      } catch (err) {
        // A notification must NEVER fail the originating work event (assignment /
        // comment). Swallow a schema-lag (table not applied yet) silently; rethrow
        // anything else only when not inside the caller's transaction.
        if (isSchemaLagError(err)) return;
        if (!client) return; // best-effort outside a txn
        throw err; // inside a txn the caller decides (its catch rolls back)
      }
    },

    async listPrefs(userId: string): Promise<NotificationPref[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.notifications.listPrefs(userId);
      try {
        const { rows } = await pool.query<{
          kind: NotificationKind;
          channel: NotificationChannel;
          enabled: boolean;
        }>(
          `SELECT kind, channel, enabled
             FROM notification_pref
            WHERE user_id = $1::uuid`,
          [userId],
        );
        return rows.map((r) => ({ kind: r.kind, channel: r.channel, enabled: r.enabled }));
      } catch (err) {
        // 0101 not applied yet — the prefs grid degrades to all-defaults.
        if (isSchemaLagError(err)) return [];
        throw err;
      }
    },

    async setPref(
      userId: string,
      kind: NotificationKind,
      channel: NotificationChannel,
      enabled: boolean,
    ): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.notifications.setPref(userId, kind, channel, enabled);
      try {
        // Upsert on the (user_id, kind, channel) PK — a toggle is idempotent.
        await pool.query(
          `INSERT INTO notification_pref (user_id, kind, channel, enabled, updated_at)
           VALUES ($1::uuid, $2, $3, $4, now())
           ON CONFLICT (user_id, kind, channel)
             DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()`,
          [userId, kind, channel, enabled],
        );
      } catch (err) {
        // 0101 not applied yet — the toggle is a no-op (the bell still defaults ON).
        if (isSchemaLagError(err)) return;
        throw err;
      }
    },
  },

  // ── Tags / labels (ADR-0065 B6, #340) ──────────────────────────────────────
  tags: {
    async listTags(): Promise<Tag[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.tags.listTags();
      try {
        const { rows } = await pool.query<{
          id: string; label: string; color: string; usage_count: string;
        }>(
          `SELECT t.id, t.label, t.color,
                  count(wt.tag_id) AS usage_count
             FROM tag t
             LEFT JOIN work_tag wt ON wt.tag_id = t.id
            GROUP BY t.id, t.label, t.color
            ORDER BY lower(t.label)`,
        );
        return rows.map((r) => ({
          id: r.id, label: r.label, color: r.color, usageCount: Number(r.usage_count),
        }));
      } catch (err) {
        if (isSchemaLagError(err)) return []; // schema not applied yet (#340)
        return mockRepositories.tags.listTags();
      }
    },

    async upsertTag(label: string, color: string, createdBy: string | null): Promise<Tag> {
      const pool = getPool();
      if (!pool) return mockRepositories.tags.upsertTag(label, color, createdBy);
      // Global vocabulary: a label exists once (case-insensitive). ON CONFLICT on
      // the lower(label) unique index makes upsert idempotent; colour is set on
      // create only (a re-upsert keeps the existing colour).
      const { rows } = await pool.query<{
        id: string; label: string; color: string; usage_count: string;
      }>(
        `WITH up AS (
           INSERT INTO tag (label, color, created_by)
           VALUES ($1, $2, $3::uuid)
           ON CONFLICT (lower(label)) DO UPDATE SET label = tag.label
           RETURNING id, label, color
         )
         SELECT up.id, up.label, up.color,
                (SELECT count(*) FROM work_tag wt WHERE wt.tag_id = up.id) AS usage_count
           FROM up`,
        [label.trim(), color, createdBy],
      );
      const r = rows[0];
      return { id: r.id, label: r.label, color: r.color, usageCount: Number(r.usage_count) };
    },

    async renameTag(id: string, label: string): Promise<Tag | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.tags.renameTag(id, label);
      try {
        const { rows } = await pool.query<{
          id: string; label: string; color: string; usage_count: string;
        }>(
          `WITH up AS (
             UPDATE tag SET label = $2 WHERE id = $1::uuid RETURNING id, label, color
           )
           SELECT up.id, up.label, up.color,
                  (SELECT count(*) FROM work_tag wt WHERE wt.tag_id = up.id) AS usage_count
             FROM up`,
          [id, label.trim()],
        );
        if (!rows[0]) return null;
        const r = rows[0];
        return { id: r.id, label: r.label, color: r.color, usageCount: Number(r.usage_count) };
      } catch (err) {
        // Unique-violation on lower(label) → label already taken; surface as null.
        if (typeof err === "object" && err && (err as { code?: string }).code === "23505") {
          return null;
        }
        throw err;
      }
    },

    async mergeTags(sourceId: string, targetId: string): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.tags.mergeTags(sourceId, targetId);
      if (sourceId === targetId) return false;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Repoint the source's applications onto the target, skipping any that
        // would collide with an existing (target, parent) pair, then drop source.
        await client.query(
          `UPDATE work_tag wt
              SET tag_id = $2::uuid
            WHERE wt.tag_id = $1::uuid
              AND NOT EXISTS (
                SELECT 1 FROM work_tag e
                 WHERE e.tag_id = $2::uuid
                   AND e.parent_type = wt.parent_type
                   AND e.parent_id = wt.parent_id
              )`,
          [sourceId, targetId],
        );
        const { rowCount } = await client.query(
          `DELETE FROM tag WHERE id = $1::uuid`,
          [sourceId],
        );
        await client.query("COMMIT");
        return (rowCount ?? 0) > 0;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async deleteTag(id: string): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.tags.deleteTag(id);
      const { rowCount } = await pool.query(`DELETE FROM tag WHERE id = $1::uuid`, [id]);
      return (rowCount ?? 0) > 0;
    },

    async listTagsFor(parentType: TagParentType, parentId: string): Promise<AppliedTag[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.tags.listTagsFor(parentType, parentId);
      try {
        const { rows } = await pool.query<{ id: string; label: string; color: string }>(
          `SELECT t.id, t.label, t.color
             FROM work_tag wt JOIN tag t ON t.id = wt.tag_id
            WHERE wt.parent_type = $1 AND wt.parent_id = $2::uuid
            ORDER BY lower(t.label)`,
          [parentType, parentId],
        );
        return rows;
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.tags.listTagsFor(parentType, parentId);
      }
    },

    async listTagsForMany(
      parentType: TagParentType,
      parentIds: string[],
    ): Promise<Record<string, AppliedTag[]>> {
      const pool = getPool();
      if (!pool) return mockRepositories.tags.listTagsForMany(parentType, parentIds);
      if (parentIds.length === 0) return {};
      try {
        const { rows } = await pool.query<{
          parent_id: string; id: string; label: string; color: string;
        }>(
          `SELECT wt.parent_id::text AS parent_id, t.id, t.label, t.color
             FROM work_tag wt JOIN tag t ON t.id = wt.tag_id
            WHERE wt.parent_type = $1 AND wt.parent_id = ANY($2::uuid[])
            ORDER BY lower(t.label)`,
          [parentType, parentIds],
        );
        const out: Record<string, AppliedTag[]> = {};
        for (const r of rows) {
          (out[r.parent_id] ??= []).push({ id: r.id, label: r.label, color: r.color });
        }
        return out;
      } catch (err) {
        if (isSchemaLagError(err)) return {};
        return mockRepositories.tags.listTagsForMany(parentType, parentIds);
      }
    },

    async applyTag(input: TagApplicationInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.tags.applyTag(input);
      // Idempotent — the PK makes a repeated application a no-op.
      await pool.query(
        `INSERT INTO work_tag (tag_id, parent_type, parent_id)
         VALUES ($1::uuid, $2, $3::uuid)
         ON CONFLICT DO NOTHING`,
        [input.tagId, input.parentType, input.parentId],
      );
    },

    async removeTag(input: TagApplicationInput): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.tags.removeTag(input);
      const { rowCount } = await pool.query(
        `DELETE FROM work_tag
          WHERE tag_id = $1::uuid AND parent_type = $2 AND parent_id = $3::uuid`,
        [input.tagId, input.parentType, input.parentId],
      );
      return (rowCount ?? 0) > 0;
    },
  },

  // ── Custom fields (ADR-0065 B4, #338) ──────────────────────────────────────
  customFields: {
    async listFieldDefs(): Promise<CustomFieldDef[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.customFields.listFieldDefs();
      try {
        const { rows } = await pool.query<CustomFieldDefDbRow>(
          `SELECT d.id, d.scope, d.project_type_id, pt.name AS project_type_name,
                  d.key, d.label, d.field_type, d.options, d.required, d.ordinal
             FROM custom_field_def d
             LEFT JOIN project_type pt ON pt.id = d.project_type_id
            ORDER BY d.scope, d.ordinal, lower(d.label)`,
        );
        return rows.map(mapCustomFieldDef);
      } catch (err) {
        if (isSchemaLagError(err)) return []; // schema not applied yet (#338)
        return mockRepositories.customFields.listFieldDefs();
      }
    },

    async listFieldDefsFor(
      scope: CustomFieldParentType,
      projectTypeId: string | null,
    ): Promise<CustomFieldDef[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.customFields.listFieldDefsFor(scope, projectTypeId);
      try {
        // A form sees the scope's global fields (project_type_id IS NULL) plus the
        // ones scoped to this project_type (when the object has a known type).
        const { rows } = await pool.query<CustomFieldDefDbRow>(
          `SELECT d.id, d.scope, d.project_type_id, pt.name AS project_type_name,
                  d.key, d.label, d.field_type, d.options, d.required, d.ordinal
             FROM custom_field_def d
             LEFT JOIN project_type pt ON pt.id = d.project_type_id
            WHERE d.scope = $1
              AND (d.project_type_id IS NULL OR d.project_type_id = $2::uuid)
            ORDER BY d.ordinal, lower(d.label)`,
          [scope, projectTypeId],
        );
        return rows.map(mapCustomFieldDef);
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.customFields.listFieldDefsFor(scope, projectTypeId);
      }
    },

    async createFieldDef(input: CustomFieldDefInput): Promise<CustomFieldDef> {
      const pool = getPool();
      if (!pool) return mockRepositories.customFields.createFieldDef(input);
      const { rows } = await pool.query<CustomFieldDefDbRow>(
        `WITH ins AS (
           INSERT INTO custom_field_def
             (scope, project_type_id, key, label, field_type, options, required, ordinal)
           VALUES ($1, $2::uuid, $3, $4, $5, $6::jsonb, $7, $8)
           RETURNING *
         )
         SELECT ins.id, ins.scope, ins.project_type_id,
                pt.name AS project_type_name, ins.key, ins.label, ins.field_type,
                ins.options, ins.required, ins.ordinal
           FROM ins LEFT JOIN project_type pt ON pt.id = ins.project_type_id`,
        defParams(input),
      );
      return mapCustomFieldDef(rows[0]);
    },

    async updateFieldDef(
      id: string,
      input: CustomFieldDefInput,
    ): Promise<CustomFieldDef | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.customFields.updateFieldDef(id, input);
      const { rows } = await pool.query<CustomFieldDefDbRow>(
        `WITH up AS (
           UPDATE custom_field_def
              SET scope = $1, project_type_id = $2::uuid, key = $3, label = $4,
                  field_type = $5, options = $6::jsonb, required = $7, ordinal = $8
            WHERE id = $9::uuid
           RETURNING *
         )
         SELECT up.id, up.scope, up.project_type_id,
                pt.name AS project_type_name, up.key, up.label, up.field_type,
                up.options, up.required, up.ordinal
           FROM up LEFT JOIN project_type pt ON pt.id = up.project_type_id`,
        [...defParams(input), id],
      );
      return rows[0] ? mapCustomFieldDef(rows[0]) : null;
    },

    async deleteFieldDef(id: string): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.customFields.deleteFieldDef(id);
      const { rowCount } = await pool.query(
        `DELETE FROM custom_field_def WHERE id = $1::uuid`,
        [id],
      );
      return (rowCount ?? 0) > 0;
    },

    async listValuesFor(
      parentType: CustomFieldParentType,
      parentId: string,
      projectTypeId: string | null,
    ): Promise<CustomFieldValue[]> {
      const pool = getPool();
      if (!pool) {
        return mockRepositories.customFields.listValuesFor(parentType, parentId, projectTypeId);
      }
      try {
        // LEFT JOIN so a field with no value yet still appears (value null) — the
        // form shows every applicable field, not only the answered ones.
        const { rows } = await pool.query<{
          field_id: string; key: string; label: string; field_type: string;
          options: unknown; required: boolean; value: unknown;
        }>(
          `SELECT d.id AS field_id, d.key, d.label, d.field_type, d.options, d.required,
                  v.value
             FROM custom_field_def d
             LEFT JOIN custom_field_value v
               ON v.field_id = d.id AND v.parent_type = $1 AND v.parent_id = $2::uuid
            WHERE d.scope = $1
              AND (d.project_type_id IS NULL OR d.project_type_id = $3::uuid)
            ORDER BY d.ordinal, lower(d.label)`,
          [parentType, parentId, projectTypeId],
        );
        return rows.map((r) => ({
          fieldId: r.field_id,
          key: r.key,
          label: r.label,
          fieldType: r.field_type as CustomFieldType,
          options: Array.isArray(r.options) ? (r.options as string[]) : [],
          required: r.required,
          value: (r.value ?? null) as CustomFieldValue["value"],
        }));
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.customFields.listValuesFor(parentType, parentId, projectTypeId);
      }
    },

    async setValue(input: CustomFieldValueInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.customFields.setValue(input);
      // A null/empty value clears the field (delete the row); otherwise upsert on
      // the PK so a re-write is idempotent.
      const cleared =
        input.value === null || (Array.isArray(input.value) && input.value.length === 0);
      if (cleared) {
        await pool.query(
          `DELETE FROM custom_field_value
            WHERE field_id = $1::uuid AND parent_type = $2 AND parent_id = $3::uuid`,
          [input.fieldId, input.parentType, input.parentId],
        );
        return;
      }
      await pool.query(
        `INSERT INTO custom_field_value (field_id, parent_type, parent_id, value)
         VALUES ($1::uuid, $2, $3::uuid, $4::jsonb)
         ON CONFLICT (field_id, parent_type, parent_id)
           DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [input.fieldId, input.parentType, input.parentId, JSON.stringify(input.value)],
      );
    },

    async listValuesForMany(
      parentType: CustomFieldParentType,
      parentIds: string[],
      fieldKeys?: string[],
    ): Promise<Record<string, CustomFieldValueEntry[]>> {
      const pool = getPool();
      if (!pool) {
        return mockRepositories.customFields.listValuesForMany(parentType, parentIds, fieldKeys);
      }
      if (parentIds.length === 0) return {};
      try {
        // One read for a whole list/board column (the per-object listValuesFor would
        // N+1). INNER JOIN the value table so only ANSWERED fields come back — the
        // column shows what's set, not the full definition list. Optionally narrow to
        // the displayed field keys.
        const narrow = fieldKeys && fieldKeys.length > 0;
        const { rows } = await pool.query<{
          parent_id: string; field_id: string; key: string; label: string;
          field_type: string; value: unknown;
        }>(
          `SELECT v.parent_id::text AS parent_id, d.id AS field_id, d.key, d.label,
                  d.field_type, v.value
             FROM custom_field_value v
             JOIN custom_field_def d ON d.id = v.field_id
            WHERE v.parent_type = $1 AND v.parent_id = ANY($2::uuid[])
              ${narrow ? "AND d.key = ANY($3::text[])" : ""}
            ORDER BY d.ordinal, lower(d.label)`,
          narrow ? [parentType, parentIds, fieldKeys] : [parentType, parentIds],
        );
        const out: Record<string, CustomFieldValueEntry[]> = {};
        for (const r of rows) {
          (out[r.parent_id] ??= []).push({
            fieldId: r.field_id,
            key: r.key,
            label: r.label,
            fieldType: r.field_type as CustomFieldType,
            value: r.value as CustomFieldValueEntry["value"],
          });
        }
        return out;
      } catch (err) {
        if (isSchemaLagError(err)) return {};
        return mockRepositories.customFields.listValuesForMany(parentType, parentIds, fieldKeys);
      }
    },

    async filterByCustomField(input: CustomFieldFilterInput): Promise<string[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.customFields.filterByCustomField(input);
      try {
        // Match over the GIN index on custom_field_value.value (#338 data-model note):
        //   eq       → value = the scalar (e.g. Risk level = 'High')
        //   contains → the multi-select array contains the scalar (jsonb @> [val])
        // Scoped to the (scope, projectTypeId) field group so a global and a
        // type-scoped field of the same key never bleed together.
        const json = JSON.stringify(input.value);
        const predicate =
          input.op === "contains"
            ? `v.value @> $4::jsonb`
            : `v.value = $4::jsonb`;
        const arg = input.op === "contains" ? JSON.stringify([input.value]) : json;
        const { rows } = await pool.query<{ parent_id: string }>(
          `SELECT v.parent_id::text AS parent_id
             FROM custom_field_value v
             JOIN custom_field_def d ON d.id = v.field_id
            WHERE d.scope = $1
              AND d.key = $2
              AND (($3::uuid IS NULL AND d.project_type_id IS NULL)
                   OR d.project_type_id = $3::uuid)
              AND v.parent_type = $1
              AND ${predicate}`,
          [input.scope, input.fieldKey, input.projectTypeId, arg],
        );
        return rows.map((r) => r.parent_id);
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.customFields.filterByCustomField(input);
      }
    },
  },

  // ── Self-serve report builder (ADR-0075, #410) ─────────────────────────────
  // Generalised saved views (ADR-0046): owner-scoped reads return the viewer's
  // own rows plus shared ones; mutations are owner-only (the WHERE clause is the
  // enforcement). root_object/fields are validated against the in-code semantic
  // registry (#409) at the call site, not here. Falls back to the mock when no
  // pool is configured.
  reportBuilder: {
    async listReportDefinitions(viewerEmail: string | null): Promise<ReportDefinition[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.listReportDefinitions(viewerEmail);
      try {
        const { rows } = await pool.query<ReportDefDbRow>(
          `SELECT r.id, u.display_name AS owner,
                  COALESCE(u.email = $1, false) AS is_mine,
                  r.name, r.root_object, r.fields, r.filters, r.group_by, r.viz, r.visibility
           FROM report_definition r JOIN app_user u ON u.id = r.owner_user_id
           WHERE r.visibility = 'shared' OR u.email = $1
           ORDER BY COALESCE(u.email = $1, false) DESC, r.name`,
          [viewerEmail],
        );
        return rows.map(mapReportDef);
      } catch {
        return mockRepositories.reportBuilder.listReportDefinitions(viewerEmail);
      }
    },

    async getReportDefinition(id: string, viewerEmail: string | null): Promise<ReportDefinition | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.getReportDefinition(id, viewerEmail);
      try {
        const { rows } = await pool.query<ReportDefDbRow>(
          `SELECT r.id, u.display_name AS owner,
                  COALESCE(u.email = $2, false) AS is_mine,
                  r.name, r.root_object, r.fields, r.filters, r.group_by, r.viz, r.visibility
           FROM report_definition r JOIN app_user u ON u.id = r.owner_user_id
           WHERE r.id = $1 AND (r.visibility = 'shared' OR u.email = $2)`,
          [id, viewerEmail],
        );
        return rows[0] ? mapReportDef(rows[0]) : null;
      } catch {
        return mockRepositories.reportBuilder.getReportDefinition(id, viewerEmail);
      }
    },

    async createReportDefinition(input: ReportDefinitionInput, ownerEmail: string): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.createReportDefinition(input, ownerEmail);
      const ownerId = await resolveAppUserId(pool, ownerEmail);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO report_definition
           (owner_user_id, name, root_object, fields, filters, group_by, viz, visibility)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8)
         RETURNING id`,
        [
          ownerId,
          input.name,
          input.rootObject,
          JSON.stringify(input.fields),
          JSON.stringify(input.filters),
          JSON.stringify(input.groupBy),
          input.viz,
          input.visibility,
        ],
      );
      return rows[0].id;
    },

    async updateReportDefinition(
      id: string,
      input: ReportDefinitionInput,
      ownerEmail: string,
    ): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.updateReportDefinition(id, input, ownerEmail);
      // Owner-only: the WHERE clause is the enforcement — a non-owner id updates 0 rows.
      await pool.query(
        `UPDATE report_definition
         SET name = $3, root_object = $4, fields = $5::jsonb, filters = $6::jsonb,
             group_by = $7::jsonb, viz = $8, visibility = $9, updated_at = now()
         WHERE id = $1
           AND owner_user_id =
               (SELECT id FROM app_user WHERE email = $2 ORDER BY updated_at DESC LIMIT 1)`,
        [
          id,
          ownerEmail,
          input.name,
          input.rootObject,
          JSON.stringify(input.fields),
          JSON.stringify(input.filters),
          JSON.stringify(input.groupBy),
          input.viz,
          input.visibility,
        ],
      );
    },

    async deleteReportDefinition(
      id: string,
      ownerEmail: string | null,
      asAdmin: boolean,
    ): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.deleteReportDefinition(id, ownerEmail, asAdmin);
      // dashboard_item.report_definition_id CASCADEs, so tiles clean up automatically.
      await pool.query(
        `DELETE FROM report_definition
         WHERE id = $1
           AND ($3 OR owner_user_id =
                (SELECT id FROM app_user WHERE email = $2 ORDER BY updated_at DESC LIMIT 1))`,
        [id, ownerEmail, asAdmin],
      );
    },

    async listDashboards(viewerEmail: string | null): Promise<Dashboard[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.listDashboards(viewerEmail);
      try {
        const { rows } = await pool.query<DashboardDbRow>(
          `SELECT d.id, u.display_name AS owner,
                  COALESCE(u.email = $1, false) AS is_mine,
                  d.name, d.layout, d.visibility
           FROM dashboard d JOIN app_user u ON u.id = d.owner_user_id
           WHERE d.visibility = 'shared' OR u.email = $1
           ORDER BY COALESCE(u.email = $1, false) DESC, d.name`,
          [viewerEmail],
        );
        return rows.map(mapDashboard);
      } catch {
        return mockRepositories.reportBuilder.listDashboards(viewerEmail);
      }
    },

    async getDashboard(id: string, viewerEmail: string | null): Promise<Dashboard | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.getDashboard(id, viewerEmail);
      try {
        const { rows } = await pool.query<DashboardDbRow>(
          `SELECT d.id, u.display_name AS owner,
                  COALESCE(u.email = $2, false) AS is_mine,
                  d.name, d.layout, d.visibility
           FROM dashboard d JOIN app_user u ON u.id = d.owner_user_id
           WHERE d.id = $1 AND (d.visibility = 'shared' OR u.email = $2)`,
          [id, viewerEmail],
        );
        return rows[0] ? mapDashboard(rows[0]) : null;
      } catch {
        return mockRepositories.reportBuilder.getDashboard(id, viewerEmail);
      }
    },

    async createDashboard(input: DashboardInput, ownerEmail: string): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.createDashboard(input, ownerEmail);
      const ownerId = await resolveAppUserId(pool, ownerEmail);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO dashboard (owner_user_id, name, layout, visibility)
         VALUES ($1, $2, $3::jsonb, $4)
         RETURNING id`,
        [ownerId, input.name, JSON.stringify(input.layout), input.visibility],
      );
      return rows[0].id;
    },

    async updateDashboard(id: string, input: DashboardInput, ownerEmail: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.updateDashboard(id, input, ownerEmail);
      await pool.query(
        `UPDATE dashboard
         SET name = $3, layout = $4::jsonb, visibility = $5, updated_at = now()
         WHERE id = $1
           AND owner_user_id =
               (SELECT id FROM app_user WHERE email = $2 ORDER BY updated_at DESC LIMIT 1)`,
        [id, ownerEmail, input.name, JSON.stringify(input.layout), input.visibility],
      );
    },

    async deleteDashboard(id: string, ownerEmail: string | null, asAdmin: boolean): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.deleteDashboard(id, ownerEmail, asAdmin);
      // dashboard_item.dashboard_id CASCADEs, so the tiles go with it.
      await pool.query(
        `DELETE FROM dashboard
         WHERE id = $1
           AND ($3 OR owner_user_id =
                (SELECT id FROM app_user WHERE email = $2 ORDER BY updated_at DESC LIMIT 1))`,
        [id, ownerEmail, asAdmin],
      );
    },

    async listDashboardItems(dashboardId: string): Promise<DashboardItem[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.listDashboardItems(dashboardId);
      try {
        const { rows } = await pool.query<DashboardItemDbRow>(
          `SELECT id, dashboard_id, report_definition_id, position
           FROM dashboard_item
           WHERE dashboard_id = $1
           ORDER BY COALESCE((position->>'ordinal')::numeric, 0), created_at`,
          [dashboardId],
        );
        return rows.map(mapDashboardItem);
      } catch {
        return mockRepositories.reportBuilder.listDashboardItems(dashboardId);
      }
    },

    async addDashboardItem(input: DashboardItemInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.addDashboardItem(input);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO dashboard_item (dashboard_id, report_definition_id, position)
         VALUES ($1, $2, $3::jsonb)
         RETURNING id`,
        [input.dashboardId, input.reportDefinitionId, JSON.stringify(input.position)],
      );
      return rows[0].id;
    },

    async removeDashboardItem(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.removeDashboardItem(id);
      await pool.query(`DELETE FROM dashboard_item WHERE id = $1`, [id]);
    },

    async reorderDashboardItem(id: string, position: Record<string, unknown>): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.reportBuilder.reorderDashboardItem(id, position);
      await pool.query(
        `UPDATE dashboard_item SET position = $2::jsonb WHERE id = $1`,
        [id, JSON.stringify(position)],
      );
    },
  },

  // ── Integration marketplace — connector instances (ADR-0076, #414) ───────────
  connectors: {
    async listConnectorInstances(): Promise<ConnectorInstance[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.connectors.listConnectorInstances();
      try {
        const { rows } = await pool.query<ConnectorInstanceDbRow>(
          `SELECT id, connector_key, account_scope, status, granted_scopes,
                  cadence_override_minutes, last_sync_at, health
           FROM connector_instance
           ORDER BY COALESCE(last_sync_at, updated_at) DESC, connector_key`,
        );
        return rows.map(mapConnectorInstance);
      } catch {
        return mockRepositories.connectors.listConnectorInstances();
      }
    },

    async getConnectorInstance(id: string): Promise<ConnectorInstance | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.connectors.getConnectorInstance(id);
      try {
        const { rows } = await pool.query<ConnectorInstanceDbRow>(
          `SELECT id, connector_key, account_scope, status, granted_scopes,
                  cadence_override_minutes, last_sync_at, health
           FROM connector_instance WHERE id = $1`,
          [id],
        );
        return rows[0] ? mapConnectorInstance(rows[0]) : null;
      } catch {
        return mockRepositories.connectors.getConnectorInstance(id);
      }
    },

    async getConnectorInstanceByKey(
      connectorKey: string,
      accountScope: string,
    ): Promise<ConnectorInstance | null> {
      const pool = getPool();
      if (!pool) {
        return mockRepositories.connectors.getConnectorInstanceByKey(connectorKey, accountScope);
      }
      try {
        const { rows } = await pool.query<ConnectorInstanceDbRow>(
          `SELECT id, connector_key, account_scope, status, granted_scopes,
                  cadence_override_minutes, last_sync_at, health
           FROM connector_instance WHERE connector_key = $1 AND account_scope = $2`,
          [connectorKey, accountScope],
        );
        return rows[0] ? mapConnectorInstance(rows[0]) : null;
      } catch {
        return mockRepositories.connectors.getConnectorInstanceByKey(connectorKey, accountScope);
      }
    },

    async enableConnector(input: ConnectorInstanceInput): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.connectors.enableConnector(input);
      // Upsert on the (connector_key, account_scope) UNIQUE: re-enabling refreshes the
      // grant + cadence and resets the lifecycle to 'connecting' (ADR-0076 §3).
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO connector_instance
           (connector_key, account_scope, status, granted_scopes, cadence_override_minutes)
         VALUES ($1, $2, 'connecting', $3::jsonb, $4)
         ON CONFLICT (connector_key, account_scope) DO UPDATE
           SET status = 'connecting',
               granted_scopes = EXCLUDED.granted_scopes,
               cadence_override_minutes = EXCLUDED.cadence_override_minutes,
               updated_at = now()
         RETURNING id`,
        [
          input.connectorKey,
          input.accountScope,
          JSON.stringify(input.grantedScopes),
          input.cadenceOverrideMinutes,
        ],
      );
      return rows[0].id;
    },

    async setConnectorStatus(
      id: string,
      status: ConnectorStatus,
      health?: Record<string, unknown>,
    ): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.connectors.setConnectorStatus(id, status, health);
      // last_sync_at is stamped when a sync completes ('polling' after 'first_sync').
      await pool.query(
        `UPDATE connector_instance
         SET status = $2,
             health = COALESCE($3::jsonb, health),
             last_sync_at = CASE WHEN $2 = 'polling' THEN now() ELSE last_sync_at END,
             updated_at = now()
         WHERE id = $1`,
        [id, status, health !== undefined ? JSON.stringify(health) : null],
      );
    },

    async setConnectorCadence(id: string, cadenceOverrideMinutes: number | null): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.connectors.setConnectorCadence(id, cadenceOverrideMinutes);
      await pool.query(
        `UPDATE connector_instance SET cadence_override_minutes = $2, updated_at = now() WHERE id = $1`,
        [id, cadenceOverrideMinutes],
      );
    },

    async disableConnector(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.connectors.disableConnector(id);
      await pool.query(`DELETE FROM connector_instance WHERE id = $1`, [id]);
    },
  },

  // CRM contact segments (ADR-0073 decision 2, migration 0126, #420/#421). Reads degrade
  // to empty/null on schema lag — segment/segment_member is dormant until Mark applies the
  // migration, so an undefined_table error is not an outage (the #301 isSchemaLagError
  // pattern). Writes resolve the acting user to app_user; membership add is idempotent.
  segments: {
    async listSegments(): Promise<SegmentSummary[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.segments.listSegments();
      try {
        const { rows } = await pool.query<SegmentDbRow>(
          `SELECT s.id, s.name, s.description, s.type, u.display_name AS owner,
                  s.rule_json, s.created_at, s.updated_at,
                  (SELECT count(*) FROM segment_member m WHERE m.segment_id = s.id) AS member_count
             FROM segment s
             LEFT JOIN app_user u ON u.id = s.owner_user_id
            ORDER BY s.created_at DESC`,
        );
        return rows.map(mapSegmentSummary);
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.segments.listSegments();
      }
    },

    async getSegment(id: string): Promise<SegmentDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.segments.getSegment(id);
      try {
        const { rows } = await pool.query<SegmentDbRow>(
          `SELECT s.id, s.name, s.description, s.type, u.display_name AS owner,
                  s.rule_json, s.created_at, s.updated_at,
                  (SELECT count(*) FROM segment_member m WHERE m.segment_id = s.id) AS member_count
             FROM segment s
             LEFT JOIN app_user u ON u.id = s.owner_user_id
            WHERE s.id = $1`,
          [id],
        );
        return rows[0] ? mapSegmentDetail(rows[0]) : null;
      } catch (err) {
        if (isSchemaLagError(err)) return null;
        return mockRepositories.segments.getSegment(id);
      }
    },

    async createSegment(input: SegmentInput, ownerEmail: string): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.segments.createSegment(input, ownerEmail);
      const ownerId = await resolveAppUserId(pool, ownerEmail);
      const ruleJson = input.type === "rule" ? input.ruleJson : null;
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO segment (name, description, type, owner_user_id, rule_json)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING id`,
        [
          input.name,
          input.description,
          input.type,
          ownerId,
          ruleJson !== null ? JSON.stringify(ruleJson) : null,
        ],
      );
      return rows[0].id;
    },

    async updateSegment(id: string, input: SegmentInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.segments.updateSegment(id, input);
      const ruleJson = input.type === "rule" ? input.ruleJson : null;
      await pool.query(
        `UPDATE segment
            SET name = $2, description = $3, type = $4, rule_json = $5::jsonb, updated_at = now()
          WHERE id = $1`,
        [
          id,
          input.name,
          input.description,
          input.type,
          ruleJson !== null ? JSON.stringify(ruleJson) : null,
        ],
      );
    },

    async deleteSegment(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.segments.deleteSegment(id);
      // segment_member.segment_id CASCADEs, so membership cleans up automatically.
      await pool.query(`DELETE FROM segment WHERE id = $1`, [id]);
    },

    async listSegmentMembers(segmentId: string): Promise<SegmentMemberRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.segments.listSegmentMembers(segmentId);
      try {
        const { rows } = await pool.query<SegmentMemberDbRow>(
          `SELECT m.id, m.segment_id, m.contact_id,
                  c.full_name AS contact_name, c.email AS contact_email,
                  a.name AS account, m.source, u.display_name AS added_by, m.added_at
             FROM segment_member m
             JOIN contact c ON c.id = m.contact_id
             LEFT JOIN account a ON a.id = c.account_id
             LEFT JOIN app_user u ON u.id = m.added_by
            WHERE m.segment_id = $1
            ORDER BY m.added_at DESC`,
          [segmentId],
        );
        return rows.map(mapSegmentMember);
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.segments.listSegmentMembers(segmentId);
      }
    },

    async addSegmentMembers(
      segmentId: string,
      contactIds: readonly string[],
      source: SegmentMemberSource,
      addedByEmail: string | null,
    ): Promise<number> {
      const pool = getPool();
      if (!pool)
        return mockRepositories.segments.addSegmentMembers(
          segmentId,
          contactIds,
          source,
          addedByEmail,
        );
      if (contactIds.length === 0) return 0;
      const addedBy = addedByEmail ? await resolveAppUserIdOrNull(pool, addedByEmail) : null;
      // Idempotent bulk insert: UNIQUE(segment_id, contact_id) makes re-adds no-ops; the
      // RETURNING count reflects only NEW rows (ON CONFLICT DO NOTHING skips dupes).
      const { rowCount } = await pool.query(
        `INSERT INTO segment_member (segment_id, contact_id, source, added_by)
         SELECT $1, cid, $3, $4 FROM unnest($2::uuid[]) AS cid
         ON CONFLICT (segment_id, contact_id) DO NOTHING`,
        [segmentId, Array.from(contactIds), source, addedBy],
      );
      return rowCount ?? 0;
    },

    async removeSegmentMember(memberId: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.segments.removeSegmentMember(memberId);
      await pool.query(`DELETE FROM segment_member WHERE id = $1`, [memberId]);
    },
  },

  // ── Change Enablement (ADR-0079, #656) — the app-native change working object
  // (`change_request`, migration 0135) + its affected-CI link. Reads degrade to []/null
  // when 0135 isn't applied (schema-lag-safe). Affected-CI display names resolve in-process
  // from the cmdb_ci union read-model (a CI is a projection — there is nothing to JOIN to).
  changes: {
    async listChangeRequests(): Promise<ChangeRequestSummary[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.changes.listChangeRequests();
      try {
        const { rows } = await pool.query<ChangeRequestDbRow>(
          `SELECT cr.id, cr.change_type, cr.status, cr.title, cr.description,
                  u.display_name AS requester, a.name AS account_name, cr.account_id,
                  cr.risk_derived, cr.risk_override, cr.approval_status,
                  cr.schedule_start, cr.schedule_end, cr.autotask_change_id,
                  cr.created_at, cr.updated_at,
                  (SELECT count(*) FROM change_affected_ci ac WHERE ac.change_id = cr.id)
                    AS affected_ci_count
             FROM change_request cr
             LEFT JOIN app_user u ON u.id = cr.requester_user_id
             LEFT JOIN account a ON a.id = cr.account_id
            ORDER BY cr.created_at DESC`,
        );
        return rows.map(mapChangeRequestSummary);
      } catch (err) {
        if (isSchemaLagError(err)) return [];
        return mockRepositories.changes.listChangeRequests();
      }
    },

    async getChangeRequest(id: string): Promise<ChangeRequestDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.changes.getChangeRequest(id);
      try {
        const { rows } = await pool.query<ChangeRequestDbRow>(
          `SELECT cr.id, cr.change_type, cr.status, cr.title, cr.description,
                  u.display_name AS requester, a.name AS account_name, cr.account_id,
                  cr.risk_derived, cr.risk_override, cr.approval_status,
                  cr.schedule_start, cr.schedule_end, cr.autotask_change_id,
                  cr.created_at, cr.updated_at,
                  (SELECT count(*) FROM change_affected_ci ac WHERE ac.change_id = cr.id)
                    AS affected_ci_count
             FROM change_request cr
             LEFT JOIN app_user u ON u.id = cr.requester_user_id
             LEFT JOIN account a ON a.id = cr.account_id
            WHERE cr.id = $1`,
          [id],
        );
        if (!rows[0]) return null;
        const summary = mapChangeRequestSummary(rows[0]);
        // Affected CIs: read the link rows, then resolve display names from the CI union
        // read-model in-process (the CI is a projection — no table to JOIN to).
        const { rows: links } = await pool.query<{
          id: string;
          ci_type: CiType;
          ci_id: string;
        }>(
          `SELECT id, ci_type, ci_id FROM change_affected_ci
            WHERE change_id = $1 ORDER BY created_at`,
          [id],
        );
        const items = await resolveCiIndex();
        const affectedCis = links.map((l) => {
          const ci = items.get(`${l.ci_type}:${l.ci_id}`);
          return {
            id: l.id,
            ciType: l.ci_type,
            ciId: l.ci_id,
            displayName: ci?.displayName ?? l.ci_id,
            accountName: ci?.accountName ?? null,
          };
        });
        return { ...summary, affectedCis };
      } catch (err) {
        if (isSchemaLagError(err)) return null;
        return mockRepositories.changes.getChangeRequest(id);
      }
    },

    async createChangeRequest(
      input: ChangeRequestInput,
      requesterEmail: string,
    ): Promise<string> {
      const pool = getPool();
      if (!pool) return mockRepositories.changes.createChangeRequest(input, requesterEmail);
      const requesterId = await resolveAppUserIdOrNull(pool, requesterEmail);
      const validCis = await filterValidCis(input.affectedCis);
      const riskDerived = await computeChangeRiskDerived(validCis);
      // #659: the change opens in the approval state its TYPE dictates — standard is
      // auto-approved (pre-authorized; system-attributed, approved_at = now), normal/emergency
      // open awaiting an approver (pending_approval/pending). The state machine is the single
      // source of this mapping (initialApprovalState), shared with the unit tests.
      const init = initialApprovalState(input.changeType);
      // Standard changes are auto-approved with no human actor (approved_by stays NULL =
      // system-attributed); the timestamp records WHEN the auto-approval landed.
      const autoApprovedAt = init.approvalStatus === "approved" ? new Date() : null;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO change_request
             (change_type, title, description, requester_user_id, account_id, risk_derived,
              status, approval_status, approved_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            input.changeType,
            input.title,
            input.description,
            requesterId,
            input.accountId,
            riskDerived,
            init.status,
            init.approvalStatus,
            autoApprovedAt,
          ],
        );
        const changeId = rows[0].id;
        // Audit the auto-approval of a standard change so the ledger shows WHY it skipped
        // human approval (the approver action below audits the human decisions symmetrically).
        if (init.approvalStatus === "approved") {
          await client.query(
            `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, detail)
             VALUES (NULL, 'change.auto_approved', 'change_request', $1::uuid,
                     jsonb_build_object('changeType', $2::text, 'reason', 'standard change pre-authorized'))`,
            [changeId, input.changeType],
          );
        }
        for (const ci of validCis) {
          await client.query(
            `INSERT INTO change_affected_ci (change_id, ci_type, ci_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (change_id, ci_type, ci_id) DO NOTHING`,
            [changeId, ci.ciType, ci.ciId],
          );
        }
        await client.query("COMMIT");
        return changeId;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async updateChangeRequest(id: string, input: ChangeRequestInput): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.changes.updateChangeRequest(id, input);
      const validCis = await filterValidCis(input.affectedCis);
      // Re-derive risk from the (new) affected-CI set — the affected CIs are the input to
      // CMDB-derived risk (#658), so any edit to that set recomputes `risk_derived`. The
      // admin `risk_override` is untouched here (override-wins survives re-derivation).
      const riskDerived = await computeChangeRiskDerived(validCis);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `UPDATE change_request
              SET change_type = $2, title = $3, description = $4, account_id = $5,
                  risk_derived = $6, updated_at = now()
            WHERE id = $1`,
          [id, input.changeType, input.title, input.description, input.accountId, riskDerived],
        );
        // Replace the affected-CI set (the picker is authoritative on save).
        await client.query(`DELETE FROM change_affected_ci WHERE change_id = $1`, [id]);
        for (const ci of validCis) {
          await client.query(
            `INSERT INTO change_affected_ci (change_id, ci_type, ci_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (change_id, ci_type, ci_id) DO NOTHING`,
            [id, ci.ciType, ci.ciId],
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async setChangeRiskOverride(id: string, override: number | null): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.changes.setChangeRiskOverride(id, override);
      await pool.query(
        `UPDATE change_request SET risk_override = $2, updated_at = now() WHERE id = $1`,
        [id, override],
      );
    },

    async decideChangeApproval(
      id: string,
      decision: ApprovalDecision,
      approverEmail: string,
    ): Promise<boolean> {
      const pool = getPool();
      if (!pool) return mockRepositories.changes.decideChangeApproval(id, decision, approverEmail);
      const approverId = await resolveAppUserIdOrNull(pool, approverEmail);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Read the current (status, approvalStatus) inside the txn and let the SAME pure state
        // machine the tests cover decide the move — refuses anything not awaiting approval.
        const { rows: cur } = await client.query<{
          status: ChangeStatus;
          approval_status: ChangeApprovalStatus | null;
        }>(
          `SELECT status, approval_status FROM change_request WHERE id = $1 FOR UPDATE`,
          [id],
        );
        if (!cur[0]) {
          await client.query("ROLLBACK");
          return false;
        }
        const next = applyApprovalDecision(
          { status: cur[0].status, approvalStatus: cur[0].approval_status },
          decision,
        );
        if (!next) {
          // Not in a decidable state (already decided / not pending) — no-op, no audit.
          await client.query("ROLLBACK");
          return false;
        }
        await client.query(
          `UPDATE change_request
              SET status = $2, approval_status = $3,
                  approved_by_user_id = $4, approved_at = now(), updated_at = now()
            WHERE id = $1`,
          [id, next.status, next.approvalStatus, approverId],
        );
        // Audit the approver's decision (who/what/when) — the gated mutation leaves a ledger
        // row exactly like the comment/expense mutations do.
        await client.query(
          `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, detail)
           VALUES ($1, $2, 'change_request', $3::uuid,
                   jsonb_build_object('approvalStatus', $4::text, 'status', $5::text))`,
          [
            approverId,
            decision === "approved" ? "change.approved" : "change.rejected",
            id,
            next.approvalStatus,
            next.status,
          ],
        );
        await client.query("COMMIT");
        return true;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async setChangeSchedule(
      id: string,
      start: string | null,
      end: string | null,
    ): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.changes.setChangeSchedule(id, start, end);
      const hasWindow = start !== null && end !== null;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Read the current status under lock and let the SAME pure rule the tests cover decide
        // the status move — scheduling only toggles approved ↔ scheduled, never approval state.
        const { rows: cur } = await client.query<{ status: ChangeStatus }>(
          `SELECT status FROM change_request WHERE id = $1 FOR UPDATE`,
          [id],
        );
        if (!cur[0]) {
          await client.query("ROLLBACK");
          return;
        }
        const nextStatus = nextScheduleStatus(cur[0].status, hasWindow);
        await client.query(
          `UPDATE change_request
              SET schedule_start = $2, schedule_end = $3, status = $4, updated_at = now()
            WHERE id = $1`,
          [id, start, end, nextStatus],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async deleteChangeRequest(id: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.changes.deleteChangeRequest(id);
      // change_affected_ci.change_id CASCADEs, so the links clean up automatically.
      await pool.query(`DELETE FROM change_request WHERE id = $1`, [id]);
    },
  },

  // ── Social Media Management plane (ADR-0124, #1340) — READ-ONLY ───────────────
  // Web has SELECT on interaction / social_engagement / social_post(_channel); it
  // renders the surface and never writes it (publish/reply/boost are backend Social
  // Actions through the cockpit, ADR-0058). Each method falls back to the (empty)
  // mock on a missing pool or a query error, so the surface degrades quietly.
  social: {
    async listInbox(filter: { channel?: string; limit?: number }): Promise<SocialInboxItem[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.social.listInbox(filter);
      const cap = Math.min(Math.max(filter.limit ?? 100, 1), 300);
      try {
        // Origin 1 — private DMs on the Interaction timeline (ADR-0124 #2 inbound split).
        // kind='dm'; source is the social channel (facebook/instagram/messenger/…).
        const dmWhere = ["i.kind = 'dm'"];
        const dmParams: unknown[] = [];
        if (filter.channel) {
          dmParams.push(filter.channel);
          dmWhere.push(`i.source = $${dmParams.length}::interaction_source`);
        }
        const dms = await pool.query<{
          id: string;
          channel: string;
          body: string | null;
          contact: string | null;
          occurred_at: Date | null;
        }>(
          `SELECT i.id, i.source::text AS channel,
                  COALESCE(i.summary_gold, i.subject) AS body,
                  c.full_name AS contact, i.occurred_at
           FROM interaction i
           LEFT JOIN contact c ON c.id = i.contact_id
           WHERE ${dmWhere.join(" AND ")}
           ORDER BY i.occurred_at DESC NULLS LAST
           LIMIT ${cap}`,
          dmParams,
        );
        // Origin 2 — public comments/mentions (social_engagement), with triage fields.
        const engWhere: string[] = [];
        const engParams: unknown[] = [];
        if (filter.channel) {
          engParams.push(filter.channel);
          engWhere.push(`e.channel = $${engParams.length}::social_channel`);
        }
        const engs = await pool.query<{
          id: string;
          channel: string;
          kind: string;
          body: string | null;
          author_display_name: string | null;
          author_handle: string | null;
          contact: string | null;
          posted_at: Date | null;
          ingested_at: Date | null;
          status: string;
          intent: string | null;
          assigned_agent_key: string | null;
          source_url: string | null;
        }>(
          `SELECT e.id, e.channel::text AS channel, e.kind::text AS kind, e.body,
                  e.author_display_name, e.author_handle, c.full_name AS contact,
                  e.posted_at, e.ingested_at, e.status::text AS status,
                  e.intent, e.assigned_agent_key, e.source_url
           FROM social_engagement e
           LEFT JOIN contact c ON c.id = e.contact_id
           ${engWhere.length ? `WHERE ${engWhere.join(" AND ")}` : ""}
           ORDER BY COALESCE(e.posted_at, e.ingested_at) DESC NULLS LAST
           LIMIT ${cap}`,
          engParams,
        );

        // Pair each row with a numeric sort key (epoch ms) for the cross-origin merge.
        const dmRows: SortableInboxItem[] = dms.rows.map((r) => ({
          sort: r.occurred_at ? r.occurred_at.getTime() : 0,
          item: {
            id: r.id,
            origin: "dm",
            kind: "dm",
            channel: r.channel,
            body: r.body,
            author: r.contact,
            contact: r.contact,
            occurredAt: fmtDateTime(r.occurred_at),
            engagementStatus: null,
            intent: null,
            assignedAgentKey: null,
            sourceUrl: null,
          },
        }));
        const engRows: SortableInboxItem[] = engs.rows.map((r) => {
          const when = r.posted_at ?? r.ingested_at;
          return {
            sort: when ? when.getTime() : 0,
            item: {
              id: r.id,
              origin: "engagement",
              kind: r.kind === "mention" ? "mention" : "comment",
              channel: r.channel,
              body: r.body,
              author: r.author_display_name ?? r.author_handle,
              contact: r.contact,
              occurredAt: fmtDateTime(when),
              engagementStatus: r.status,
              intent: r.intent,
              assignedAgentKey: r.assigned_agent_key,
              sourceUrl: r.source_url,
            },
          };
        });
        // Merge both origins newest-first, cap, then drop the sort key.
        return mergeInbox(dmRows, engRows, cap);
      } catch {
        return mockRepositories.social.listInbox(filter);
      }
    },

    async listPosts(): Promise<SocialPostRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.social.listPosts();
      try {
        const { rows } = await pool.query<{
          id: string;
          content: { body?: string } | null;
          status: string;
          campaign_name: string | null;
          author: string | null;
          scheduled_at: Date | null;
          created_at: Date | null;
          channels: { channel: string; publish_status: string }[] | null;
        }>(
          `SELECT p.id, p.content, p.status::text AS status, cmp.name AS campaign_name,
                  u.display_name AS author, p.scheduled_at, p.created_at,
                  COALESCE(
                    json_agg(json_build_object('channel', spc.channel::text,
                                               'publish_status', spc.publish_status::text)
                             ORDER BY spc.channel)
                      FILTER (WHERE spc.id IS NOT NULL),
                    '[]'::json) AS channels
           FROM social_post p
           LEFT JOIN campaign cmp ON cmp.id = p.campaign_id
           LEFT JOIN app_user u ON u.id = p.created_by_user_id
           LEFT JOIN social_post_channel spc ON spc.social_post_id = p.id
           GROUP BY p.id, cmp.name, u.display_name
           ORDER BY p.created_at DESC NULLS LAST`,
        );
        return rows.map((r) => ({
          id: r.id,
          summary: summarizePostContent(r.content),
          status: r.status,
          campaignName: r.campaign_name,
          author: r.author,
          scheduledAt: fmtDateTime(r.scheduled_at),
          channels: (r.channels ?? []).map((c) => ({
            channel: c.channel,
            publishStatus: c.publish_status,
          })),
          createdAt: fmtDateTime(r.created_at),
        }));
      } catch {
        return mockRepositories.social.listPosts();
      }
    },

    async getPost(id: string): Promise<SocialPostDetail | null> {
      const pool = getPool();
      if (!pool) return mockRepositories.social.getPost(id);
      try {
        const { rows } = await pool.query<{
          id: string;
          content: { body?: string } | null;
          status: string;
          campaign_name: string | null;
          author: string | null;
          scheduled_at: Date | null;
          created_at: Date | null;
        }>(
          `SELECT p.id, p.content, p.status::text AS status, cmp.name AS campaign_name,
                  u.display_name AS author, p.scheduled_at, p.created_at
           FROM social_post p
           LEFT JOIN campaign cmp ON cmp.id = p.campaign_id
           LEFT JOIN app_user u ON u.id = p.created_by_user_id
           WHERE p.id = $1`,
          [id],
        );
        const p = rows[0];
        if (!p) return null;
        const ch = await pool.query<{
          id: string;
          channel: string;
          publish_status: string;
          external_id: string | null;
          published_at: Date | null;
          error: string | null;
        }>(
          `SELECT id, channel::text AS channel, publish_status::text AS publish_status,
                  external_id, published_at, error
           FROM social_post_channel
           WHERE social_post_id = $1
           ORDER BY channel`,
          [id],
        );
        const channels: SocialPostChannelRow[] = ch.rows.map((r) => ({
          id: r.id,
          channel: r.channel,
          publishStatus: r.publish_status,
          externalId: r.external_id,
          publishedAt: fmtDateTime(r.published_at),
          error: r.error,
        }));
        return {
          id: p.id,
          body: p.content?.body ?? "",
          status: p.status,
          campaignName: p.campaign_name,
          author: p.author,
          scheduledAt: fmtDateTime(p.scheduled_at),
          channels,
          createdAt: fmtDateTime(p.created_at),
        };
      } catch {
        return mockRepositories.social.getPost(id);
      }
    },

    async analytics(): Promise<SocialAnalyticsReport> {
      const pool = getPool();
      if (!pool) return mockRepositories.social.analytics();
      try {
        // Three reads, then a data-layer union (ADR-0124 D, #1342) — no DB view, so no
        // migration. Organic = social_metric (per-channel + per-post); paid = campaign_metric
        // ad grain. Metric-generic over social_metric.metric (names shift, #135): the SQL
        // never whitelists names, the helper just groups whatever exists.
        const [lifetime, daily, posts, ads] = await Promise.all([
          // Per-channel organic — latest lifetime snapshot per (platform, metric).
          pool.query<{ platform: string; metric: string; value: string | null }>(
            `SELECT DISTINCT ON (platform, metric) platform, metric, value
             FROM social_metric WHERE period = 'lifetime'
             ORDER BY platform, metric, captured_at DESC`,
          ),
          // Per-channel organic — 28-day daily sum per (platform, metric).
          pool.query<{ platform: string; metric: string; value: string | null }>(
            `SELECT platform, metric, sum(value) AS value
             FROM social_metric
             WHERE period = 'day' AND captured_at >= now() - interval '28 days'
             GROUP BY 1, 2`,
          ),
          // Per-post organic — published social_post_channel joined to its post-grain
          // social_metric snapshots by the platform external_id (entity_kind='post').
          // Latest value per (post, metric); newest 12 posts by publish time.
          pool.query<{
            channel: string;
            external_id: string;
            body: string | null;
            metric: string;
            value: string | null;
          }>(
            `WITH pub AS (
               SELECT spc.channel::text AS channel, spc.external_id,
                      p.content->>'body' AS body, spc.published_at
               FROM social_post_channel spc
               JOIN social_post p ON p.id = spc.social_post_id
               WHERE spc.publish_status = 'published' AND spc.external_id IS NOT NULL
               ORDER BY spc.published_at DESC NULLS LAST
               LIMIT 12
             )
             SELECT pub.channel, pub.external_id, pub.body, sm.metric, sm.value
             FROM pub
             LEFT JOIN LATERAL (
               SELECT DISTINCT ON (m.metric) m.metric, m.value
               FROM social_metric m
               WHERE m.entity_kind = 'post'
                     AND m.platform = pub.channel
                     AND m.entity_external_id = pub.external_id
               ORDER BY m.metric, m.captured_at DESC
             ) sm ON true
             ORDER BY pub.published_at DESC NULLS LAST, sm.metric`,
          ),
          // Per-ad paid results — campaign_metric ad grain rolled up, shaped for
          // attribution (#1316): spend / impressions / clicks / results(leads).
          pool.query<{
            ad_id: string;
            ad_name: string;
            campaign_name: string;
            platform: string;
            spend: string | null;
            impressions: string | null;
            clicks: string | null;
            results: string | null;
          }>(
            `SELECT ad.id AS ad_id, ad.name AS ad_name, c.name AS campaign_name,
                    c.platform::text AS platform,
                    coalesce(sum(m.spend), 0)       AS spend,
                    coalesce(sum(m.impressions), 0) AS impressions,
                    coalesce(sum(m.clicks), 0)      AS clicks,
                    coalesce(sum(m.leads), 0)       AS results
             FROM ad
             JOIN campaign c ON c.id = ad.campaign_id
             JOIN campaign_metric m ON m.ad_id = ad.id
             GROUP BY ad.id, ad.name, c.name, c.platform
             ORDER BY 5 DESC LIMIT 20`,
          ),
        ]);

        const channelRows: SocialMetricDatum[] = [
          ...lifetime.rows.map((r) => ({
            platform: r.platform,
            metric: r.metric,
            value: Number(r.value ?? 0),
            window: "lifetime" as const,
          })),
          ...daily.rows.map((r) => ({
            platform: r.platform,
            metric: r.metric,
            value: Number(r.value ?? 0),
            window: "28d" as const,
          })),
        ];

        // Fold per-post rows (LEFT JOIN LATERAL → one row per post×metric, metric null
        // when a post has no snapshots yet) into one SocialPostMetric per post.
        const postMap = new Map<string, SocialPostMetric>();
        for (const r of posts.rows) {
          const key = `${r.channel}:${r.external_id}`;
          let entry = postMap.get(key);
          if (!entry) {
            const body = (r.body ?? "").trim();
            entry = {
              channel: r.channel,
              externalId: r.external_id,
              summary: body ? (body.length > 80 ? `${body.slice(0, 77)}…` : body) : "(no copy)",
              metrics: [],
            };
            postMap.set(key, entry);
          }
          if (r.metric) {
            entry.metrics.push({
              platform: r.channel,
              metric: r.metric,
              value: Number(r.value ?? 0),
              window: "lifetime",
            });
          }
        }

        const adResults: SocialAdResult[] = ads.rows.map((r) => {
          const spend = Number(r.spend ?? 0);
          const results = Number(r.results ?? 0);
          return {
            adId: r.ad_id,
            adName: r.ad_name,
            campaignName: r.campaign_name,
            platform: r.platform,
            spend,
            impressions: Number(r.impressions ?? 0),
            clicks: Number(r.clicks ?? 0),
            results,
            cpl: costPerLead(spend, results),
          };
        });

        return {
          byChannel: summarizeChannelMetrics(channelRows),
          topPosts: [...postMap.values()],
          adResults,
        };
      } catch {
        return mockRepositories.social.analytics();
      }
    },
  },
};

/** First ~120 chars of a social_post's authored copy (`content.body`), for the list. */
function summarizePostContent(content: { body?: string } | null): string {
  const body = (content?.body ?? "").trim();
  if (!body) return "(no copy)";
  return body.length > 120 ? `${body.slice(0, 117)}…` : body;
}

/** Compute a change's CMDB-derived risk (#658) from its (already-validated) affected-CI
 *  set: reads the full CI union + edge set the impact read-model needs, then delegates the
 *  scoring to the pure `deriveChangeRisk`. Returns 0 for an empty set (nothing to break). */
async function computeChangeRiskDerived(
  affected: { ciType: CiType; ciId: string }[],
): Promise<number> {
  if (affected.length === 0) return 0;
  const [items, edges] = await Promise.all([
    postgresRepositories.crm.listConfigurationItems(),
    postgresRepositories.crm.listAllCiRelationships(),
  ]);
  return deriveChangeRisk(affected, items, edges);
}

/** CI key → CI, for resolving affected-CI display names (a CI is a projection — there is
 *  nothing to JOIN to, so the small union read-model is read in-process). */
async function resolveCiIndex(): Promise<Map<string, ConfigurationItem>> {
  const items = await postgresRepositories.crm.listConfigurationItems();
  return new Map(items.map((i) => [`${i.ciType}:${i.ciId}`, i]));
}

/** Keep only the affected CIs that actually exist in the cmdb_ci union read-model
 *  (a CI is a projection, not a row — there is no FK to enforce this), de-duped. */
async function filterValidCis(
  cis: { ciType: CiType; ciId: string }[],
): Promise<{ ciType: CiType; ciId: string }[]> {
  if (cis.length === 0) return [];
  const index = await resolveCiIndex();
  const seen = new Set<string>();
  return cis.filter((ci) => {
    const key = `${ci.ciType}:${ci.ciId}`;
    if (seen.has(key) || !index.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** A select-type custom field carries an options list; the others store []. */
function isSelectFieldType(t: CustomFieldType): boolean {
  return t === "single_select" || t === "multi_select";
}

/**
 * Coerce a raw intake answer (always a string off the form) to the decoded shape a
 * custom_field_value stores for its field type (#638). Mirrors the decode contract
 * the task-edit CustomFields panel writes: number/currency → number, checkbox →
 * boolean, multi_select → string[] (comma-separated answer), everything else →
 * string (incl. `user`, which stores an app_user id, and the date/single_select/text
 * kinds). Returns null when the answer is empty after coercion so the caller can skip
 * the write (no empty custom_field_value rows).
 */
function encodeIntakeCustomValue(
  fieldType: CustomFieldType,
  raw: string,
): string | number | boolean | string[] | null {
  const v = raw.trim();
  if (!v) return null;
  switch (fieldType) {
    case "number":
    case "currency": {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    case "checkbox":
      // Truthy strings from a checkbox/select answer; anything else is false.
      return /^(true|1|yes|on|checked)$/i.test(v);
    case "multi_select": {
      const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
      return arr.length ? arr : null;
    }
    default:
      // text | date | single_select | user → the string answer verbatim.
      return v;
  }
}

/** Positional params shared by create/update of a custom_field_def. */
function defParams(input: CustomFieldDefInput): unknown[] {
  return [
    input.scope,
    input.scope === "project" ? input.projectTypeId : null, // a task field is never type-scoped
    input.key.trim(),
    input.label.trim(),
    input.fieldType,
    JSON.stringify(isSelectFieldType(input.fieldType) ? input.options : []),
    input.required,
    input.ordinal,
  ];
}

/** The selected shape of a custom_field_def row (snake_case), ADR-0065 B4. */
interface CustomFieldDefDbRow {
  id: string;
  scope: string;
  project_type_id: string | null;
  project_type_name: string | null;
  key: string;
  label: string;
  field_type: string;
  options: unknown;
  required: boolean;
  ordinal: number;
}

/** Map a custom_field_def DB row (snake_case) onto the {@link CustomFieldDef} type. */
function mapCustomFieldDef(r: CustomFieldDefDbRow): CustomFieldDef {
  return {
    id: r.id,
    scope: r.scope as CustomFieldParentType,
    projectTypeId: r.project_type_id,
    projectTypeName: r.project_type_name,
    key: r.key,
    label: r.label,
    fieldType: r.field_type as CustomFieldType,
    options: Array.isArray(r.options) ? (r.options as string[]) : [],
    required: r.required,
    ordinal: Number(r.ordinal),
  };
}

/** The selected shape of a work_comment row (snake_case) across the work repo. */
interface CommentDbRow {
  id: string; parent_type: string; parent_id: string;
  author_user_id: string | null; author: string | null;
  body: string; edited_at: string | null; created_at: string;
}

/** Map a work_comment DB row (snake_case) onto the {@link WorkComment} type. */
function mapWorkComment(r: CommentDbRow, mentions: CommentMention[] = []): WorkComment {
  return {
    id: r.id,
    parentType: r.parent_type as WorkParentType,
    parentId: r.parent_id,
    authorUserId: r.author_user_id,
    author: r.author,
    body: r.body,
    editedAt: r.edited_at,
    createdAt: r.created_at,
    mentions,
  };
}

/** The selected shape of a work_attachment row (snake_case), ADR-0064 A4. */
interface AttachmentDbRow {
  id: string; parent_type: string; parent_id: string;
  storage_ref: string; filename: string; content_type: string; size_bytes: string;
  uploaded_by: string | null; uploaded_by_name: string | null; created_at: string;
}

/** Map a work_attachment DB row (snake_case) onto the {@link WorkAttachment} type. */
function mapWorkAttachment(r: AttachmentDbRow): WorkAttachment {
  return {
    id: r.id,
    parentType: r.parent_type as WorkParentType,
    parentId: r.parent_id,
    storageRef: r.storage_ref,
    filename: r.filename,
    contentType: r.content_type,
    sizeBytes: Number(r.size_bytes),
    uploadedByUserId: r.uploaded_by,
    uploadedBy: r.uploaded_by_name,
    createdAt: r.created_at,
  };
}

/** The selected shape of a notification row (snake_case), ADR-0064 A3 / #332. */
interface NotificationDbRow {
  id: string; kind: string; parent_type: string; parent_id: string;
  actor: string | null; title: string; read: boolean; created_at: string;
}

/** Map a notification DB row (snake_case) onto the {@link Notification} type. */
function mapNotification(r: NotificationDbRow): Notification {
  return {
    id: r.id,
    kind: r.kind as Notification["kind"],
    parentType: r.parent_type as WorkParentType,
    parentId: r.parent_id,
    actor: r.actor,
    title: r.title,
    read: r.read,
    createdAt: r.created_at,
  };
}

// ── @mention persistence helpers (ADR-0064 A2, migration 0097, #331) ──
// A minimal client surface so these helpers work with both a Pool and a pooled
// client (the add/edit paths run inside a transaction).
type Queryable = { query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }> };

/**
 * Insert a single in-app notification (ADR-0064 A3, #332) inside the caller's
 * transaction, suppressing it when the recipient has explicitly muted this kind on
 * the in_app channel (notification_pref enabled=false; absence of a row = ON). Used
 * by the in-txn work-event paths (mention, comment, assignment). Swallows a
 * schema-lag (0101 not applied yet) so it NEVER fails the originating event; other
 * errors propagate to the caller's transaction (which rolls back). `payload` is
 * pre-rendered context (title + actor) carrying no client PII.
 */
async function insertNotification(
  client: Queryable,
  recipientUserId: string,
  kind: NotificationKind,
  parentType: WorkParentType,
  parentId: string,
  actorUserId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!recipientUserId || recipientUserId === actorUserId) return; // never notify yourself
  try {
    await client.query(
      `INSERT INTO notification
         (recipient_user_id, kind, parent_type, parent_id, actor_user_id, payload)
       SELECT $1::uuid, $2, $3, $4::uuid, $5::uuid, $6::jsonb
        WHERE NOT EXISTS (
          SELECT 1 FROM notification_pref p
           WHERE p.user_id = $1::uuid AND p.kind = $2
             AND p.channel = 'in_app' AND p.enabled = false
        )`,
      [recipientUserId, kind, parentType, parentId, actorUserId, JSON.stringify(payload)],
    );
  } catch (err) {
    if (isSchemaLagError(err)) return; // 0101 not applied — bell dormant, event still lands
    throw err;
  }
}

/**
 * Batch-load resolved mentions for a set of comment ids → Map(commentId →
 * mentions[]). Returns an empty map when 0097 isn't applied yet (schema lag) so
 * comments still render (A1 stays functional without A2's table).
 */
async function loadMentions(
  pool: Pool,
  commentIds: string[],
): Promise<Map<string, CommentMention[]>> {
  const out = new Map<string, CommentMention[]>();
  if (commentIds.length === 0) return out;
  try {
    const { rows } = await pool.query<{
      comment_id: string; mention_user_id: string | null;
      display_name: string | null; email: string | null;
    }>(
      `SELECT cm.comment_id::text AS comment_id,
              cm.mention_user_id::text AS mention_user_id,
              u.display_name, u.email
         FROM comment_mention cm
         LEFT JOIN app_user u ON u.id = cm.mention_user_id
        WHERE cm.comment_id = ANY($1::uuid[])
        ORDER BY cm.created_at ASC`,
      [commentIds],
    );
    for (const r of rows) {
      const list = out.get(r.comment_id) ?? [];
      list.push({
        userId: r.mention_user_id,
        handle: r.email ? r.email.split("@")[0].toLowerCase() : "",
        displayName: r.display_name,
      });
      out.set(r.comment_id, list);
    }
  } catch (err) {
    if (isSchemaLagError(err)) return out; // 0097 not applied — degrade to no mentions
    throw err;
  }
  return out;
}

/** The mentionable candidate set, read on the same client (used inside a txn). */
async function mentionCandidates(client: Queryable): Promise<MentionableUser[]> {
  const { rows } = await client.query<{ id: string; display_name: string | null; email: string }>(
    `SELECT id::text AS id, display_name, email
       FROM app_user
      WHERE email IS NOT NULL AND position('@' in email) > 1`,
  );
  return rows
    .map((r) => ({
      id: r.id,
      displayName: r.display_name ?? r.email.split("@")[0],
      handle: r.email.split("@")[0].toLowerCase(),
    }))
    .filter((u) => /^[a-z0-9._-]+$/.test(u.handle));
}

/**
 * Insert the mention links for a freshly-created comment and emit a
 * `comment.mentioned` audit event per mention (the A2 notification). Skips a
 * self-mention notification (don't notify yourself). Returns the resolved
 * mentions for the response.
 */
async function persistMentions(
  client: Queryable,
  commentId: string,
  body: string,
  parentType: WorkParentType,
  parentId: string,
  actorUserId: string | null,
): Promise<CommentMention[]> {
  const resolved = resolveMentions(body, await mentionCandidates(client));
  for (const u of resolved) {
    await client.query(
      `INSERT INTO comment_mention (comment_id, mention_user_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (comment_id, mention_user_id) DO NOTHING`,
      [commentId, u.id],
    );
    if (u.id !== actorUserId) {
      await client.query(
        `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, detail)
         VALUES ($1::uuid, 'comment.mentioned', $2, $3::uuid,
                 jsonb_build_object('commentId', $4::text, 'mentionedUserId', $5::text))`,
        [actorUserId, parentType, parentId, commentId, u.id],
      );
      // A3 (#332): also write the in-app notification the bell reads.
      await insertNotification(client, u.id!, "mentioned", parentType, parentId, actorUserId, {
        title: "You were mentioned in a comment",
      });
    }
  }
  return resolved.map((u) => ({ userId: u.id, handle: u.handle, displayName: u.displayName }));
}

/**
 * Reconcile mention links after an edit: delete links no longer present in the
 * body, then upsert the current set, emitting a notification only for newly-added
 * mentions. Returns the resolved current mentions.
 */
async function reconcileMentions(
  client: Queryable,
  commentId: string,
  body: string,
  parentType: WorkParentType,
  parentId: string,
  actorUserId: string | null,
): Promise<CommentMention[]> {
  const resolved = resolveMentions(body, await mentionCandidates(client));
  const wantedIds = resolved.map((u) => u.id);
  // Which links already exist (so we only notify on NEW ones).
  const { rows: existing } = await client.query<{ mention_user_id: string | null }>(
    `SELECT mention_user_id::text AS mention_user_id FROM comment_mention WHERE comment_id = $1::uuid`,
    [commentId],
  );
  const existingIds = new Set(existing.map((e) => e.mention_user_id));
  // Drop links whose user is no longer mentioned.
  await client.query(
    `DELETE FROM comment_mention
      WHERE comment_id = $1::uuid
        AND ($2::uuid[] = '{}' OR mention_user_id <> ALL($2::uuid[]))`,
    [commentId, wantedIds],
  );
  for (const u of resolved) {
    await client.query(
      `INSERT INTO comment_mention (comment_id, mention_user_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (comment_id, mention_user_id) DO NOTHING`,
      [commentId, u.id],
    );
    if (!existingIds.has(u.id) && u.id !== actorUserId) {
      await client.query(
        `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, detail)
         VALUES ($1::uuid, 'comment.mentioned', $2, $3::uuid,
                 jsonb_build_object('commentId', $4::text, 'mentionedUserId', $5::text))`,
        [actorUserId, parentType, parentId, commentId, u.id],
      );
      // A3 (#332): notify a NEWLY-added mention (existing ones already were).
      await insertNotification(client, u.id!, "mentioned", parentType, parentId, actorUserId, {
        title: "You were mentioned in a comment",
      });
    }
  }
  return resolved.map((u) => ({ userId: u.id, handle: u.handle, displayName: u.displayName }));
}

// ── Row mappers shared across methods ────────────────────────────────────────

interface InteractionDbRow {
  id: string;
  source: string;
  kind: string | null;
  channel: string | null;
  direction: string | null;
  subject: string | null;
  summary_gold: string | null;
  occurred_at: Date | null;
  owner: string | null;
  contact: string | null;
  account: string | null;
}

function mapInteraction(r: InteractionDbRow): InteractionRow {
  return {
    id: r.id,
    source: r.source,
    kind: r.kind,
    channel: r.channel,
    direction: r.direction,
    subject: r.subject,
    summary: r.summary_gold,
    owner: r.owner,
    contact: r.contact,
    account: r.account,
    occurredAt: fmtDateTime(r.occurred_at),
  };
}

interface ConnectionDbRow {
  id: string;
  scope: string;
  provider: string;
  display_name: string | null;
  status: string;
  scopes: string[];
  owner: string | null;
  keyvault_secret_ref: string | null;
  last_sync_at: Date | null;
  connected_at: Date | null;
  poll_interval_minutes: number | null;
  // Credential-registry fields (ADR-0103); absent from the legacy SELECTs → undefined → null.
  account_id?: string | null;
  account_name?: string | null;
  auth_method?: string | null;
  cert_thumbprint?: string | null;
  client_id?: string | null;
  // Self-expiring token lifecycle (FE #1502). Columns exist as of migration 0258 (#1798);
  // the backend writes them on connect/refresh (BE #506). Deliberately NOT selected yet —
  // adding them to the SELECTs before 0258 is prod-applied would 42703 the whole list
  // (Mark-gated apply) — so they stay absent → undefined → null until #1800 wires them post-apply.
  token_issued_at?: Date | null;
  token_expires_at?: Date | null;
}

/**
 * Record manual ("website") provenance for a contact (ADR-0039). Manual entries flow through
 * the `website_contacts` bronze table so every silver field is source-attributed. The row is
 * pre-linked to the silver contact and marked for re-merge (`matched_at = NULL`) so the
 * pipeline recomputes silver by precedence (website wins). The silver `contact` row is written
 * by the caller, so this is **best-effort** — a failure here never blocks the user's action.
 */
async function upsertWebsiteContactRow(
  pool: Pool,
  contactId: string,
  input: ContactInput,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO website_contacts (contact_id, external_ref, payload_bronze, match_confidence, last_seen_at)
       VALUES ($1, $1::text, $2::jsonb, 1, now())
       ON CONFLICT (external_ref) DO UPDATE
         SET payload_bronze = EXCLUDED.payload_bronze, contact_id = EXCLUDED.contact_id,
             matched_at = NULL, last_seen_at = now()`,
      [
        contactId,
        JSON.stringify({
          full_name: input.fullName,
          email: nullIfEmpty(input.email),
          phone: nullIfEmpty(input.phone),
          title: nullIfEmpty(input.title),
          headline: nullIfEmpty(input.headline),
          location: nullIfEmpty(input.location),
        }),
      ],
    );
  } catch {
    /* provenance is best-effort — never block the create/update */
  }
}

/** Record manual ("website") provenance for a company (ADR-0039). See upsertWebsiteContactRow. */
async function upsertWebsiteCompanyRow(
  pool: Pool,
  accountId: string,
  input: AccountInput,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO website_companies (account_id, external_ref, payload_bronze, match_confidence, last_seen_at)
       VALUES ($1, $1::text, $2::jsonb, 1, now())
       ON CONFLICT (external_ref) DO UPDATE
         SET payload_bronze = EXCLUDED.payload_bronze, account_id = EXCLUDED.account_id,
             matched_at = NULL, last_seen_at = now()`,
      [accountId, JSON.stringify({ name: input.name })],
    );
  } catch {
    /* best-effort */
  }
}

// ── Report builder row mappers + helper (ADR-0075, #410) ─────────────────────

interface ReportDefDbRow {
  id: string;
  owner: string | null;
  is_mine: boolean;
  name: string;
  root_object: string;
  fields: unknown[] | null;
  filters: Record<string, unknown> | null;
  group_by: unknown[] | null;
  viz: string;
  visibility: "private" | "shared";
}

interface DashboardDbRow {
  id: string;
  owner: string | null;
  is_mine: boolean;
  name: string;
  layout: Record<string, unknown> | null;
  visibility: "private" | "shared";
}

interface DashboardItemDbRow {
  id: string;
  dashboard_id: string;
  report_definition_id: string;
  position: Record<string, unknown> | null;
}

function mapReportDef(r: ReportDefDbRow): ReportDefinition {
  return {
    id: r.id,
    owner: r.owner,
    isMine: r.is_mine === true,
    name: r.name,
    rootObject: r.root_object,
    fields: r.fields ?? [],
    filters: r.filters ?? {},
    groupBy: r.group_by ?? [],
    viz: r.viz,
    visibility: r.visibility,
  };
}

function mapDashboard(r: DashboardDbRow): Dashboard {
  return {
    id: r.id,
    owner: r.owner,
    isMine: r.is_mine === true,
    name: r.name,
    layout: r.layout ?? {},
    visibility: r.visibility,
  };
}

function mapDashboardItem(r: DashboardItemDbRow): DashboardItem {
  return {
    id: r.id,
    dashboardId: r.dashboard_id,
    reportDefinitionId: r.report_definition_id,
    position: r.position ?? {},
  };
}

interface ConnectorInstanceDbRow {
  id: string;
  connector_key: string;
  account_scope: string;
  status: ConnectorStatus;
  granted_scopes: string[] | null;
  cadence_override_minutes: number | null;
  last_sync_at: Date | string | null;
  health: Record<string, unknown> | null;
}

function mapConnectorInstance(r: ConnectorInstanceDbRow): ConnectorInstance {
  return {
    id: r.id,
    connectorKey: r.connector_key,
    accountScope: r.account_scope,
    status: r.status,
    grantedScopes: r.granted_scopes ?? [],
    cadenceOverrideMinutes: r.cadence_override_minutes,
    lastSyncAt:
      r.last_sync_at instanceof Date
        ? r.last_sync_at.toISOString()
        : (r.last_sync_at ?? null),
    health: r.health ?? {},
  };
}

/** Resolve the app_user id for an email, or throw the same hint saved-view writes use. */
async function resolveAppUserId(pool: Pool, ownerEmail: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM app_user WHERE email = $1 ORDER BY updated_at DESC LIMIT 1`,
    [ownerEmail],
  );
  const id = rows[0]?.id;
  if (!id) {
    throw new Error(`No app_user for ${ownerEmail} — sign in once so the identity is mirrored.`);
  }
  return id;
}

/** Like resolveAppUserId but returns null instead of throwing (for nullable audit FKs). */
async function resolveAppUserIdOrNull(pool: Pool, email: string): Promise<string | null> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM app_user WHERE email = $1 ORDER BY updated_at DESC LIMIT 1`,
    [email],
  );
  return rows[0]?.id ?? null;
}

// ── Segment row mappers (migration 0126) ───────────────────────────────────────────
interface MessageTemplateDbRow {
  id: string;
  name: string;
  channel: MessageTemplateChannel;
  subject: string | null;
  html: string | null;
  body: string | null;
  merge_fields: string[] | null;
  updated_at: Date | null;
}

function mapMessageTemplate(r: MessageTemplateDbRow): MessageTemplateRow {
  return {
    id: r.id,
    name: r.name,
    channel: r.channel,
    subject: r.subject,
    html: r.html,
    body: r.body,
    mergeFields: r.merge_fields ?? [],
    updatedAt: r.updated_at ? r.updated_at.toISOString() : new Date(0).toISOString(),
  };
}

interface SegmentDbRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  owner: string | null;
  rule_json: Record<string, unknown> | null;
  created_at: Date | null;
  updated_at: Date | null;
  member_count: string; // count(*) comes back as a string from pg
}

interface SegmentMemberDbRow {
  id: string;
  segment_id: string;
  contact_id: string;
  contact_name: string;
  contact_email: string | null;
  account: string | null;
  source: string;
  added_by: string | null;
  added_at: Date | null;
}

function mapSegmentSummary(r: SegmentDbRow): SegmentSummary {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.type === "rule" ? "rule" : "manual",
    owner: r.owner,
    memberCount: Number(r.member_count ?? 0),
    createdAt: r.created_at ? r.created_at.toISOString() : null,
    updatedAt: r.updated_at ? r.updated_at.toISOString() : null,
  };
}

function mapSegmentDetail(r: SegmentDbRow): SegmentDetail {
  return { ...mapSegmentSummary(r), ruleJson: r.rule_json };
}

// ── Change Enablement row mapper (migration 0135, #656) ─────────────────────────────
interface ChangeRequestDbRow {
  id: string;
  change_type: ChangeType;
  status: ChangeStatus;
  title: string;
  description: string | null;
  requester: string | null;
  account_name: string | null;
  account_id: string | null;
  risk_derived: number | null;
  risk_override: number | null;
  approval_status: ChangeApprovalStatus | null;
  schedule_start: Date | null;
  schedule_end: Date | null;
  autotask_change_id: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  affected_ci_count: string; // count(*) comes back as a string from pg
}

function mapChangeRequestSummary(r: ChangeRequestDbRow): ChangeRequestSummary {
  return {
    id: r.id,
    changeType: r.change_type,
    status: r.status,
    title: r.title,
    description: r.description,
    requester: r.requester,
    accountName: r.account_name,
    accountId: r.account_id,
    riskDerived: r.risk_derived === null ? null : Number(r.risk_derived),
    riskOverride: r.risk_override === null ? null : Number(r.risk_override),
    approvalStatus: r.approval_status,
    scheduleStart: r.schedule_start ? r.schedule_start.toISOString() : null,
    scheduleEnd: r.schedule_end ? r.schedule_end.toISOString() : null,
    autotaskChangeId: r.autotask_change_id,
    affectedCiCount: Number(r.affected_ci_count ?? 0),
    createdAt: r.created_at ? r.created_at.toISOString() : null,
    updatedAt: r.updated_at ? r.updated_at.toISOString() : null,
  };
}

function mapSegmentMember(r: SegmentMemberDbRow): SegmentMemberRow {
  const source: SegmentMemberSource =
    r.source === "bulk" ? "bulk" : r.source === "rule" ? "rule" : "manual";
  return {
    id: r.id,
    segmentId: r.segment_id,
    contactId: r.contact_id,
    contactName: r.contact_name,
    contactEmail: r.contact_email,
    account: r.account,
    source,
    addedBy: r.added_by,
    addedAt: r.added_at ? r.added_at.toISOString() : null,
  };
}

function mapConnection(r: ConnectionDbRow): ConnectionRow {
  return {
    id: r.id,
    scope: r.scope,
    provider: r.provider,
    displayName: r.display_name,
    status: r.status,
    scopes: r.scopes ?? [],
    owner: r.owner,
    keyvaultSecretRef: r.keyvault_secret_ref,
    lastSync: fmtDateTime(r.last_sync_at),
    connectedAt: fmtDate(r.connected_at),
    pollIntervalMinutes: r.poll_interval_minutes ?? 60,
    accountId: r.account_id ?? null,
    accountName: r.account_name ?? null,
    authMethod: r.auth_method ?? null,
    certThumbprint: r.cert_thumbprint ?? null,
    clientId: r.client_id ?? null,
    tokenIssuedAt: fmtDateTime(r.token_issued_at ?? null),
    tokenExpiresAt: fmtDateTime(r.token_expires_at ?? null),
  };
}

/**
 * Match contacts against a set of enrichment criteria (ADR-0026). A contact matches
 * when, for every criterion, it has an enrichment fact whose attribute_key equals the
 * key and whose value contains the given value (ILIKE). Ad eligibility (current
 * ad_targeting consent) is flagged on each match. Empty criteria → no matches.
 */
async function queryAudienceMatches(
  pool: NonNullable<ReturnType<typeof getPool>>,
  criteria: AudienceCriterion[],
): Promise<AudienceMemberRow[]> {
  const valid = criteria.filter((c) => c.key && c.value);
  if (valid.length === 0) return [];
  const params: unknown[] = [];
  const clauses = valid.map((c) => {
    params.push(c.key);
    const ki = params.length;
    params.push(`%${c.value}%`);
    const vi = params.length;
    return `EXISTS (SELECT 1 FROM contact_enrichment e
              WHERE e.contact_id = c.id AND e.attribute_key = $${ki} AND e.value_text ILIKE $${vi})`;
  });
  const { rows } = await pool.query<{
    contact_id: string;
    full_name: string;
    account: string | null;
    ad_consent: boolean;
  }>(
    `SELECT c.id AS contact_id, c.full_name, a.name AS account,
            (cc.state = 'opt_in') AS ad_consent
     FROM contact c
     LEFT JOIN account a ON a.id = c.account_id
     LEFT JOIN current_consent cc ON cc.contact_id = c.id AND cc.channel = 'ad_targeting'
     WHERE ${clauses.join(" AND ")}
     ORDER BY c.full_name`,
    params,
  );
  return rows.map((r) => ({
    contactId: r.contact_id,
    fullName: r.full_name,
    account: r.account,
    adConsent: r.ad_consent === true,
  }));
}
