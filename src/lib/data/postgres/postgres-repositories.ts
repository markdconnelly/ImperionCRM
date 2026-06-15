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
import type { Pool } from "pg";
import { getPool } from "@/lib/db/client";
import { mockRepositories, isSchemaLagError } from "@/lib/data/postgres/fallback";
import { ASSESSMENT_DIMENSIONS } from "@/lib/assessment";
import { ONBOARDING_TEMPLATE } from "@/lib/onboarding-template";
import { classifyDevicePolicy } from "@/lib/security/device-policy";
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
  manualPercent as goalManualPercent,
  rolledUpPercent as goalRolledUpPercent,
  displayPercent as goalDisplayPercent,
} from "@/lib/goals";
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
  CompanyCredentialInput,
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
  DeliveryInstantiationInput,
  DeliveryTemplateInput,
  ExpenseItemInput,
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
  ConsentEventRow,
  ContactCrmStage,
  ContactPipelineRow,
  ContactProfile,
  ContactRow,
  CountDatum,
  CurrentConsentRow,
  DeliveryTemplateRow,
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
  PipelineColumn,
  PipelineStage,
  PortfolioRow,
  GoalRow,
  GoalLinkedProject,
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
  SbrDetail,
  SbrRow,
  SocialIdentityRow,
  ContactSourceRow,
  AccountSourceRow,
  StageValueDatum,
  TaskCategory,
  TaskRow,
  TaskHierarchy,
  TaskDependencies,
  TaskDependencyRow,
  WorkAssignments,
  WorkAssignmentRow,
  WorkRole,
  WorkloadRow,
  TenantMapping,
  TenantPostureRollup,
  PosturePolicyRow,
  DnsDomainRollup,
  DnsRecordDrift,
  SecureScoreControl,
  CredentialExposureRow,
  DefenderIncidentCounts,
  MfaRegistrationCounts,
  SharePointSiteRow,
  TicketRow,
  ContractRow,
  DeviceInventoryRow,
  UnmappedTenant,
  WorkflowDetail,
  WorkflowRow,
  WorkParentType,
  WorkComment,
  WorkAttachment,
  WorkActivityEntry,
  CommentMention,
  MentionableUser,
  Notification,
  NotificationKind,
  TagParentType,
  Tag,
  AppliedTag,
  CustomFieldDef,
  CustomFieldType,
  CustomFieldValue,
  CustomFieldParentType,
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

function fmtDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** "yyyy-mm-dd hh:mm" for timeline entries. */
function fmtDateTime(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 16).replace("T", " ") : null;
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

    async setOpportunityStage(id: string, stage: string): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setOpportunityStage(id, stage);
      await pool.query(
        `UPDATE opportunity SET sales_stage = $2::opportunity_sales_stage WHERE id = $1`,
        [id, stage],
      );
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
        }>(
          // Top-level tasks only (parent_task_id IS NULL); subtasks surface under
          // their parent via getTaskChildren. The lateral counts the n/m rollup
          // (ADR-0065 B1, #335); the second lateral sums logged minutes (#346).
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

    async setTaskAssignees(taskId: string, userIds: string[]): Promise<void> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.setTaskAssignees(taskId, userIds);
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
          // Actor is unattributed here — the assignee save carries no acting user;
          // a later slice threads it through (#332 follow-up).
          if (!alreadyOn.has(uid)) {
            await insertNotification(client, uid, "assigned", "task", taskId, null, {
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

    async listWorkload(): Promise<WorkloadRow[]> {
      const pool = getPool();
      if (!pool) return mockRepositories.crm.listWorkload();
      try {
        // Per-user open-task load (ADR-0069 D2, #347). Join `work_assignment` to
        // not-done tasks so a person counts whether they are the primary owner or
        // an additional assignee; watchers do NOT count as load (they only follow).
        // due_at is timestamptz — bucket against now()/now()+7d in SQL so the
        // horizon is server-evaluated and timezone-correct. No `task.estimate` yet
        // (D1, #346) → counts, not hours.
        const { rows } = await pool.query<{
          user_id: string;
          name: string;
          open_tasks: string;
          due_soon: string;
          overdue: string;
        }>(
          `SELECT u.id::text AS user_id,
                  coalesce(u.display_name, split_part(u.email, '@', 1)) AS name,
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
             JOIN app_user u ON u.id = wa.user_id
             JOIN task t      ON t.id = wa.parent_id
            WHERE wa.parent_type = 'task'
              AND wa.role IN ('primary', 'assignee')
              AND t.status <> 'done'
            GROUP BY u.id, name
            ORDER BY open_tasks DESC, name`,
        );
        return rows.map((r) => ({
          userId: r.user_id,
          name: r.name,
          openTasks: Number(r.open_tasks),
          dueSoon: Number(r.due_soon),
          overdue: Number(r.overdue),
        }));
      } catch (err) {
        // work_assignment (0099) may not be prod-applied yet → empty, not a 500.
        if (isSchemaLagError(err)) return [];
        return mockRepositories.crm.listWorkload();
      }
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
        }>(
          `SELECT pr.id, pr.name, a.name AS account, o.name AS opportunity,
                  pt.name AS type, pt.key AS type_key,
                  coalesce(u.display_name, u.email) AS owner,
                  pr.status, pr.target_live_date
           FROM project pr
           JOIN account a ON a.id = pr.account_id
           JOIN project_type pt ON pt.id = pr.project_type_id
           LEFT JOIN opportunity o ON o.id = pr.opportunity_id
           LEFT JOIN app_user u ON u.id = pr.owner_user_id
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
        //    ADR-0069 D3). Only project links roll up today (the AC is project
        //    rollup); task links can join later via the same `goal_link` table.
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
        return rows.map((g) => {
          const goalLinks = (byGoal.get(g.id) ?? []).sort((a, b) =>
            a.name.localeCompare(b.name),
          );
          const target = Number(g.target);
          const current = Number(g.current);
          const manual = goalManualPercent(current, target);
          const rolledUp = goalRolledUpPercent(goalLinks);
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
          };
        });
      } catch (err) {
        // goal/goal_link (0102) may not be prod-applied yet → empty, not a 500.
        if (isSchemaLagError(err)) return [];
        return mockRepositories.crm.listGoals();
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
          `SELECT p.id, p.name, a.name AS account, p.type::text AS type,
                  p.status::text AS status, p.target_live_date
           FROM project p
           LEFT JOIN account a ON a.id = p.account_id
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
        const { rows } = await pool.query<{ status: string; c: string }>(
          `SELECT status, count(*) AS c FROM project GROUP BY status ORDER BY status`,
        );
        return rows.map((r) => ({ label: r.status, count: Number(r.c) }));
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
        return {
          oneTime: fmtUsdCompact(Number(r.one_time)),
          recurring: `${fmtUsdCompact(Number(r.recurring))}/mo`,
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
      // The secret lives in Key Vault; we persist only its reference + status.
      await pool.query(
        `INSERT INTO connection
           (scope, provider, display_name, scopes, keyvault_secret_ref, status)
         VALUES ('company', $1::connection_provider, $2, $3, $4, $5::connection_status)
         ON CONFLICT (provider) WHERE scope = 'company'
         DO UPDATE SET display_name        = EXCLUDED.display_name,
                       scopes              = EXCLUDED.scopes,
                       keyvault_secret_ref = EXCLUDED.keyvault_secret_ref,
                       status              = EXCLUDED.status,
                       connected_at        = now(),
                       updated_at          = now()`,
        [
          input.provider,
          nullIfEmpty(input.displayName),
          input.scopes,
          nullIfEmpty(input.keyvaultSecretRef),
          input.status,
        ],
      );
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
  },
};

/** A select-type custom field carries an options list; the others store []. */
function isSelectFieldType(t: CustomFieldType): boolean {
  return t === "single_select" || t === "multi_select";
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
