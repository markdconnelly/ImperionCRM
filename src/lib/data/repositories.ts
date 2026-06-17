/**
 * Data-access contracts (CLAUDE.md §7.4).
 *
 * The application talks to these interfaces, never to a concrete data source.
 * Today they are backed by mock data; once PostgreSQL + pgvector is configured
 * (ADR-0003) a Postgres implementation is swapped in behind the same contracts
 * with no change to callers. This is also where the bronze/silver/gold pipeline
 * (§4) surfaces "gold" agent-ready reads to the UI and agents.
 *
 * Methods are async on purpose — they will become real queries.
 */
import type {
  Account,
  ActionItemRow,
  AgentAutopilotPolicy,
  AgentMessage,
  AutonomyDialQuery,
  AnswerReviewRow,
  ArtifactRow,
  AssessmentConversion,
  AssessmentRow,
  AudienceMemberRow,
  AudienceRow,
  CampaignDetail,
  CampaignRow,
  CampaignSendRow,
  CollectionsActivity,
  CollectionsActivityInput,
  CommunicationDetail,
  ConnectionRow,
  ConsentEventRow,
  ContactCrmStage,
  ContactPipelineRow,
  ContactProfile,
  ContactSourceRow,
  AccountSourceRow,
  ContactRow,
  CountDatum,
  CurrentConsentRow,
  DirectoryGroupRow,
  DiscoveryCallDetail,
  DiscoveryCallRow,
  EnrichmentFactRow,
  EnrollmentRow,
  EventDetail,
  EventRegistrationRow,
  EventRow,
  ExternalIdentityRow,
  GoalRow,
  GoalEditable,
  GoalInput,
  GoalLinkInput,
  IntelStrip,
  InteractionRow,
  InvoiceMirrorRow,
  KnowledgeHit,
  Kpi,
  LeadCaptureEventRow,
  DeliveryTemplateRow,
  DeliveryTemplateDetail,
  ProjectTemplateRow,
  ProjectTemplateDetail,
  ChecklistTemplateRow,
  ChecklistTemplateDetail,
  DeliveryBoardProject,
  TimesheetRow,
  TimesheetDetail,
  TimesheetReviewRow,
  PayrollTimesheetRow,
  AdminTimesheetReview,
  AdminTimesheetRow,
  EmployeeMappingRow,
  MileageRateRow,
  MileageRateInput,
  ExpenseReportRow,
  ExpenseReportDetail,
  AdminExpenseRow,
  AdminExpenseReview,
  ExpenseReimbursementMatch,
  ExpenseCategoryRow,
  ExpensePolicyViolationRow,
  MileiqDriveRow,
  MonthlyCloseRow,
  AdminMonthlyCloseRow,
  TimeEntryCategory,
  LeadHookRow,
  MarketingSocialReport,
  OnboardingProject,
  SecurityFleetReport,
  ServiceDeskReport,
  TimeEfficiencyReport,
  SecurityPosture,
  OpportunityRow,
  OpportunityDetailRow,
  OpportunityForecastRow,
  QuotaRow,
  ForecastSnapshotRow,
  LeadScoreRow,
  LeadScoreKind,
  ChatSessionRow,
  PipelineColumn,
  PortfolioRow,
  ProjectRow,
  ProjectTypeRow,
  ProposalRow,
  ProjectTaskDependencyEdge,
  QuestionRow,
  QuestionTemplateRow,
  ReportSummary,
  RevenueSplit,
  SalesTaskRow,
  SbrDetail,
  SbrRow,
  SocialIdentityRow,
  StageValueDatum,
  TaskRow,
  TaskHierarchy,
  TaskDependencies,
  TaskRecurrenceRow,
  TaskRecurrenceInput,
  ConversationRow,
  ConversationDetail,
  EsignEnvelopeRow,
  TaskTimeEntryRow,
  ProjectTimeRollup,
  ProjectBaselineRow,
  ProjectSlippage,
  SprintRow,
  SprintBurndownData,
  SprintVelocityRow,
  WorkAssignments,
  WorkAssignmentRow,
  EngagementCounts,
  WorkRole,
  WorkloadRow,
  UserCapacity,
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
  TicketSlaBreachRow,
  ContractRow,
  DeviceInventoryRow,
  ConfigurationItem,
  CiType,
  CiRelationship,
  CiRelationshipInput,
  UnmappedTenant,
  WorkflowDetail,
  WorkflowRow,
  JourneyRow,
  JourneyDetail,
  JourneyInput,
  WorkParentType,
  WorkComment,
  WorkActivityEntry,
  MentionableUser,
  WorkAttachment,
  Notification,
  NotificationKind,
  NotificationChannel,
  NotificationPref,
  TagParentType,
  Tag,
  AppliedTag,
  CustomFieldParentType,
  CustomFieldType,
  CustomFieldDef,
  CustomFieldValue,
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
} from "@/types";

/** Editable account fields (create/update forms). */
export interface AccountInput {
  name: string;
  relationship: string | null;
  lifecycleStage: string;
  isActive: boolean;
}
export interface AccountEditable extends AccountInput {
  id: string;
}

/**
 * The full silver account record for the Company 360 (read-only superset of the
 * editable fields). The extra attributes are pipeline-/system-owned: health is
 * scored, owner mirrors Entra, timestamps come from the merge.
 */
export interface AccountDetail extends AccountEditable {
  healthScore: string | null; // numeric → string via pg; null until scored
  owner: string | null; // app_user display name
  createdAt: string | null;
  updatedAt: string | null;
  archivedAt: string | null;
}

/** Editable task fields. */
export interface TaskInput {
  accountId: string | null;
  title: string;
  detail: string | null;
  status: string;
  category: string; // sales|project|onboarding|general (ADR-0034)
  dueAt: string | null; // yyyy-mm-dd or null
  projectId: string | null; // owning project (one task model, ADR-0052)
  /** Subtask parent (ADR-0065 B1, #335): the task this hangs under, or null for
   * a top-level task. Optional on the wire — omitting it means "top-level". */
  parentTaskId?: string | null;
  /** Task start date (#580): yyyy-mm-dd or null — the other end of the span. */
  startAt: string | null;
  /** Per-task effort estimate (ADR-0069 D1, #346): numeric-as-string or null. */
  estimate: string | null;
  /** Unit the estimate is in (ADR-0069 D1, #346): 'hours' | 'points' | … or null. */
  estimateUnit: string | null;
}
export interface TaskEditable extends TaskInput {
  id: string;
  /** Autotask ticket ref set by the on-demand push (backend #19, ADR-0052 §7).
   * Read-only here — the backend writes it server-side, never the form. */
  autotaskTicketRef: string | null;
}

/** Editable sprint fields (ADR-0069 D4, #349). */
export interface SprintInput {
  name: string;
  projectId: string | null; // owning project, or null = cross-project sprint
  startsAt: string | null; // yyyy-mm-dd or null
  endsAt: string | null; // yyyy-mm-dd or null
  status: string; // planned|active|completed
}

/**
 * Fields for logging time against a task (ADR-0069 D1, #346). Named
 * `TaskTimeLogInput` to stay distinct from the timesheet `TimeEntryInput`
 * (silver `time_record`, ADR-0082) — this writes the per-task `time_entry` table.
 */
export interface TaskTimeLogInput {
  taskId: string;
  userId: string | null; // resolved server-side from the session; null in mock
  minutes: number; // logged duration (the UI converts hours+minutes)
  startedAt: string | null; // yyyy-mm-dd or null
  note: string | null;
  billable: boolean;
}

/**
 * A sales task created from the Sales Activity page (ADR-0052 §6): always
 * `category='sales'`, owned by the creating rep, optionally tied to a deal.
 */
export interface SalesTaskInput {
  title: string;
  detail: string | null;
  accountId: string | null;
  opportunityId: string | null;
  ownerUserId: string | null;
  dueAt: string | null; // yyyy-mm-dd or null
}

/** Editable proposal fields. A proposal always belongs to one opportunity. */
export interface ProposalInput {
  opportunityId: string;
  title: string;
  status: string; // draft|sent|accepted|declined
  amountMrr: string | null; // numeric as string from the form, or null
  documentUrl: string | null;
  notes: string | null;
}
export interface ProposalEditable extends ProposalInput {
  id: string;
}

/** Editable AI Security Readiness Assessment fields (ADR-0022). */
export interface AssessmentInput {
  accountId: string;
  opportunityId: string | null;
  name: string;
  status: string; // proposed|scheduled|in_progress|delivered|closed
  feeAmount: string | null; // one-time fee, numeric as string or null
  creditToOnboarding: boolean;
  /** Dimension key (identity, endpoint, …) → rating or null (not yet scored). */
  ratings: Record<string, string | null>;
  topPriorities: string | null;
  recommendation: string | null;
  reportUrl: string | null;
  notes: string | null;
  kickoffAt: string | null; // yyyy-mm-dd or null
}
export interface AssessmentEditable extends AssessmentInput {
  id: string;
}

/** Editable delivery-project fields. A project always belongs to one account. */
export interface ProjectInput {
  accountId: string;
  opportunityId: string | null;
  name: string;
  projectTypeId: string; // FK into project_type (table, not enum — ADR-0052)
  ownerUserId: string | null; // owning app_user
  status: string; // not_started|in_progress|blocked|complete
  targetLiveDate: string | null; // yyyy-mm-dd or null
  notes: string | null;
}
export interface ProjectEditable extends ProjectInput {
  id: string;
}

/** Fields for creating a project type from the project board (ADR-0052 §1). */
export interface ProjectTypeInput {
  key: string; // stable machine key, slugified from the name
  name: string;
  description: string | null;
}

/**
 * A configurable status (ADR-0065 B5, #339) from `status_def`. `category`
 * (todo|in_progress|done) is the reporting partition — rollups key off it, never
 * `label`. A global row has `projectTypeId === null`; a typed row scopes the set
 * to one project type. `wipLimit` (ADR-0066 C1) is the optional per-status board
 * cap (null = no limit). The default seeded sets reproduce the legacy enums.
 */
export interface StatusDefRow {
  id: string;
  scope: string; // 'global' | 'project_type'
  projectTypeId: string | null;
  context: string; // 'task' | 'project'
  key: string;
  label: string;
  color: string | null;
  category: string; // 'todo' | 'in_progress' | 'done'
  ordinal: number;
  wipLimit: number | null;
}

/**
 * Admin input to create/update a status definition (ADR-0065 B5, #616). `scope`
 * is 'global' (a default set shared by every project type; `projectTypeId` null)
 * or 'project_type' (scoped to one type; `projectTypeId` required). `context`
 * partitions the task set from the project set. `category` (todo|in_progress|done)
 * is the reporting partition — rollups key off it, never `label`. `wipLimit` is
 * carried for round-tripping but its dedicated editing UI + over-limit board
 * highlight are the deferred part 2 of #616 (blocked on board-columns #613).
 */
export interface StatusDefInput {
  scope: string; // 'global' | 'project_type'
  projectTypeId: string | null;
  context: string; // 'task' | 'project'
  key: string;
  label: string;
  color: string | null;
  category: string; // 'todo' | 'in_progress' | 'done'
  ordinal: number;
  wipLimit: number | null;
}

/** A {id,name} option for select dropdowns (e.g. picking an account). */
export interface Option {
  id: string;
  name: string;
}

/** A task within a delivery-template-creation payload (ADR-0081). */
export interface DeliveryTemplateTaskInput {
  title: string;
  offsetDays: number;
  durationDays: number;
  dispatchesTicket: boolean;
  ticketQueueId: number | null;
  ticketTitle: string | null;
  ticketLeadDays: number;
}

/** A phase within a delivery-template-creation payload. */
export interface DeliveryTemplatePhaseInput {
  name: string;
  offsetDays: number;
  durationDays: number;
  tasks: DeliveryTemplateTaskInput[];
}

/** Fields for creating a delivery template + its full phase/task tree (ADR-0081 §1). */
export interface DeliveryTemplateInput {
  key: string; // stable machine key, slugified from the name
  name: string;
  description: string | null;
  version: number;
  projectTypeId: string | null; // optional binding; null = any type
  isActive: boolean;
  phases: DeliveryTemplatePhaseInput[];
}

/**
 * Instantiate a delivery template into the native intent plane (ADR-0080 §4,
 * ADR-0081 §3, #566). In one transaction this creates the native project (+ a
 * milestone per phase, a task per template task), a `project_provisioning` row
 * (pending, contract gate 'none'), and a `task_ticket_fire` row for each
 * dispatching task — the work the backend executor then picks up.
 */
export interface DeliveryInstantiationInput {
  accountId: string;
  /** New project name. */
  name: string;
  /** FK into project_type (table, not enum — ADR-0052). */
  projectTypeId: string;
  /** The delivery template whose phase/task tree is instantiated. */
  deliveryTemplateId: string;
  /** Project start date (yyyy-mm-dd) — the anchor for all phase/task date math. */
  startDate: string;
  /** The won opportunity that triggered this, or null. Seeds the won→Autotask seam. */
  opportunityId: string | null;
}

/** A step/task beneath a project-template milestone (ADR-0070 E1). */
export interface ProjectTemplateChildInput {
  kind: "step" | "task";
  title: string;
  offsetDays: number;
  durationDays: number;
}

/** A milestone within a project-template payload — becomes a project_milestone. */
export interface ProjectTemplateMilestoneInput {
  name: string;
  offsetDays: number;
  durationDays: number;
  items: ProjectTemplateChildInput[];
}

/** Fields for creating a project template + its full milestone/item tree (ADR-0070 E1, #352). */
export interface ProjectTemplateInput {
  key: string; // stable machine key, slugified from the name
  name: string;
  description: string | null;
  projectTypeId: string | null; // optional binding; null = any type
  milestones: ProjectTemplateMilestoneInput[];
}

/**
 * Instantiate a project template (ADR-0070 E1, #352): in one transaction create the
 * native project + a milestone per template milestone + a task per step/task,
 * SNAPSHOTTING the template (later template edits never retro-mutate this project).
 * The seeded protected onboarding template delegates to applyOnboardingTemplate.
 * Returns the new project id.
 */
export interface ProjectTemplateInstantiationInput {
  accountId: string;
  /** New project name. */
  name: string;
  /** FK into project_type (table, not enum — ADR-0052). */
  projectTypeId: string;
  /** The project template whose milestone/item tree is snapshotted. */
  projectTemplateId: string;
  /** Project start date (yyyy-mm-dd) — the anchor for all milestone/task date math. */
  startDate: string;
}

// ── Task checklist templates (ADR-0070 E1-F3, #633) ─────────────────────────────
/**
 * Key prefix that marks a project_template row as a CHECKLIST template (a reusable
 * named subtask set), rather than a project playbook. Reusing the project_template /
 * template_item tables avoids a migration (ADR-0070 E1-F3: payload jsonb already
 * accommodates this). The list/get accessors filter on this prefix so checklist
 * templates never appear in the project-template picker and vice-versa.
 */
export const CHECKLIST_TEMPLATE_KEY_PREFIX = "checklist:";

/** Fields for creating a checklist template + its flat item list (ADR-0070 E1-F3, #633). */
export interface ChecklistTemplateInput {
  name: string;
  description: string | null;
  /** Ordered checklist item titles; each becomes a template_item (kind='task'). */
  items: string[];
}

/** Apply a checklist template's items as subtasks under a target task (ADR-0070 E1-F3, #633). */
export interface ApplyChecklistTemplateInput {
  /** The checklist template to instantiate. */
  checklistTemplateId: string;
  /** The task the items become subtasks of (parent_task_id). */
  taskId: string;
}

// ── Intake forms (ADR-0070 E3, migration 0111, #354) ────────────────────────────
/** A field's input type on an intake form (reuses the registration_page pattern). */
export type IntakeFieldType = "text" | "textarea" | "date" | "select";
/**
 * Where a field's answer lands on the created task (ADR-0070 E3).
 *  - the base task fields: `title` | `detail` | `due_at` | `note`
 *  - `assignee` (#638): the answer is an app_user id → the created task's primary
 *    owner (`task.owner_user_id`), overriding the form's `defaultOwnerUserId`.
 *  - `custom:<cf_key>` (#638): the answer is written as a `custom_field_value`
 *    (migration 0103) onto the new task, keyed by the `custom_field_def` whose
 *    `key` is `<cf_key>` for `parent_type='task'`. Rides the same `fields` jsonb —
 *    no migration. Unknown/unmatched custom keys are ignored on submit.
 */
export type IntakeFieldMap =
  | "title"
  | "detail"
  | "due_at"
  | "note"
  | "assignee"
  | `custom:${string}`;

/** The jsonb-stored prefix marking a field that maps to a task custom field (#638). */
export const INTAKE_CUSTOM_MAP_PREFIX = "custom:";

/** One field descriptor stored in intake_form.fields jsonb. */
export interface IntakeFormField {
  key: string; // stable machine key (slug); the form posts under `f_<key>`
  label: string;
  type: IntakeFieldType;
  required: boolean;
  options: string[]; // choices for `select`; empty otherwise
  mapsTo: IntakeFieldMap;
}

/** Fields for creating/editing an intake form (the whole definition). */
export interface IntakeFormInput {
  key: string; // slugified from the name
  name: string;
  description: string | null;
  fields: IntakeFormField[];
  defaultProjectId: string | null; // routes submissions to this project
  defaultAccountId: string | null;
  defaultOwnerUserId: string | null; // primary owner of the created task
  defaultCategory: string; // sales|project|onboarding|general = the queue
  isActive: boolean;
}

/** Manager/picker list row. */
export interface IntakeFormRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  defaultProjectName: string | null;
  defaultCategory: string;
  isActive: boolean;
  fieldCount: number;
  submissionCount: number;
}

/** Full intake form for rendering / submitting. */
export interface IntakeFormDetail extends IntakeFormInput {
  id: string;
  defaultProjectName: string | null;
  defaultAccountName: string | null;
  defaultOwnerName: string | null;
}

/** One submission audit row (the form detail page list). */
export interface IntakeSubmissionRow {
  id: string;
  createdAt: string | null;
  createdTaskId: string | null;
  taskTitle: string | null;
  submittedBy: string | null; // app_user display name, or null
}

/** Result of a successful submit: the task it created + the audit row. */
export interface IntakeSubmitResult {
  taskId: string;
  submissionId: string;
}

/** A new/edited attendance Time Entry (ADR-0082). Duration is derived from start/end. */
export interface TimeEntryInput {
  timesheetId: string;
  employeeId: string; // the owning app_user (denormalized for query)
  workDate: string; // yyyy-mm-dd
  startedAt: string; // ISO timestamp
  endedAt: string; // ISO timestamp; CHECK ended_at > started_at
  category: TimeEntryCategory;
  ancillaryTicketRef: string | null;
  notes: string | null;
}

/** The editable fields of one attendance block (ADR-0082 #477). The owning sheet/employee
 *  is never trusted from the caller on a correction — it's taken from the locked timesheet. */
export interface TimeEntryFields {
  workDate: string; // yyyy-mm-dd
  startedAt: string; // ISO timestamp
  endedAt: string; // ISO timestamp; CHECK ended_at > started_at
  category: TimeEntryCategory;
  ancillaryTicketRef: string | null;
  notes: string | null;
}

/** One admin correction to a Submitted sheet's entries, audited vs the attested original
 *  (ADR-0082 #477): add a block, edit one in place, or remove one. */
export type TimesheetCorrection =
  | { kind: "add"; entry: TimeEntryFields }
  | { kind: "update"; entryId: string; entry: TimeEntryFields }
  | { kind: "delete"; entryId: string };

/**
 * A new/edited out-of-pocket expense item (ADR-0083, #486). Written to the
 * `website_expense_item` bronze (the only item kind the employee hand-enters; mileage
 * comes from MileIQ). `employeeId` is the OWNER taken from the session — never trusted
 * from the form. The owning report's Open lock is re-checked server-side on every write.
 * Mileage items are NOT created here (their $ is backend-derived from MileIQ miles).
 */
export interface ExpenseItemInput {
  expenseReportId: string;
  employeeId: string; // the owning app_user (from session; re-verified server-side)
  itemDate: string; // yyyy-mm-dd
  categoryId: string | null; // null = uncategorized (soft policy nudge)
  amount: number; // USD, > 0 (entered out-of-pocket amount)
  merchant: string | null;
  description: string | null;
  reimbursable: boolean; // owed back to the employee (default true)
  billable: boolean; // independent leg — also invoiced to the client
  autotaskCompanyId: number | null; // the client leg (companyID) when billable
  receiptId: string | null; // a receipt_attachment id, when uploaded
}

/**
 * The editable fields of one out-of-pocket expense item under an admin correction
 * (ADR-0083 #488). The owning report/employee is NEVER trusted from the caller — it's
 * taken from the locked Submitted report. Mirrors `TimeEntryFields` (#477). Mileage items
 * are not correctable here (their $ is backend-derived from MileIQ miles).
 */
export interface ExpenseItemFields {
  itemDate: string; // yyyy-mm-dd
  categoryId: string | null; // null = uncategorized
  amount: number; // USD, > 0 (entered out-of-pocket amount)
  merchant: string | null;
  description: string | null;
  reimbursable: boolean; // owed back to the employee
  billable: boolean; // independent leg — also invoiced to the client
  autotaskCompanyId: number | null; // the client leg (companyID) when billable
}

/** One admin correction to a Submitted report's out-of-pocket items, audited vs the
 *  attested original (ADR-0083 #488): add a line, edit one in place, or remove one. */
export type ExpenseCorrection =
  | { kind: "add"; item: ExpenseItemFields }
  | { kind: "update"; itemId: string; item: ExpenseItemFields }
  | { kind: "delete"; itemId: string };

/** Admin mapping confirm payload (ADR-0082/0083, #468/#490). A blank id clears that mapping. */
export interface EmployeeMappingInput {
  appUserId: string;
  autotaskResourceId: number | null; // Autotask Resource id (numeric); null clears it
  quickbooksVendorId: string | null; // QuickBooks vendor/employee id; null clears it
  mileiqUserId: string | null; // MileIQ user id; null clears it (ADR-0083, #490)
}

/**
 * One synced QuickBooks chart-of-accounts row (ADR-0083, `qbo_expense_account`) — the
 * category system of record, read-only. The local-pipeline QuickBooks bulk pull (LP #168)
 * populates it; the app NEVER writes QuickBooks. The admin maps each to a clean
 * website-facing `expense_category`. `mappedToKey` is the category key already linked to
 * this account (null = unmapped), so the console can show what is/isn't yet mapped.
 */
export interface QboExpenseAccountRow {
  qboAccountId: string; // QuickBooks Account.Id — the stable natural key + FK target
  name: string;
  fullyQualifiedName: string | null; // QBO "Parent:Child" display path
  accountType: string | null;
  active: boolean; // QBO Active flag
  mappedToKey: string | null; // expense_category.key already hard-linked here, or null
}

/**
 * One website-facing Expense Category as the mapping admin sees it (ADR-0083, #489) — the
 * FULL config row, unlike the comp-free `ExpenseCategoryRow` the entry GUI consumes. Carries
 * the QuickBooks hard link, caps/threshold, billable default, the Autotask category id,
 * visibility, system/active flags, and the audit of who last mapped it. Comp-free.
 */
export interface ExpenseCategoryAdminRow {
  id: string;
  key: string;
  displayName: string;
  qboAccountId: string | null; // hard link to qbo_expense_account; null = until-mapped placeholder
  qboAccountName: string | null; // resolved QBO account display name (read convenience)
  hardCap: number | null;
  softThreshold: number | null;
  billableDefault: boolean;
  autotaskExpenseCategoryId: number | null;
  isSystem: boolean; // Mileage — rate-driven, receipt-exempt, mapping-exempt
  isUserVisible: boolean;
  isActive: boolean; // inactive-until-mapped (CHECK); active requires a QBO link (or system)
  mappedByName: string | null; // who last mapped/configured it (audit)
}

/**
 * Admin category-mapping write payload (ADR-0083, #489). The admin maps a clean category
 * onto a QuickBooks account and sets its config. A non-system category goes active only
 * when `qboAccountId` is set (the DB CHECK also enforces the hard link). The app NEVER
 * writes QuickBooks — `qboAccountId` must reference an already-synced account.
 */
export interface ExpenseCategoryMappingInput {
  id: string;
  displayName: string;
  qboAccountId: string | null; // null clears the link (forces inactive on a non-system row)
  hardCap: number | null;
  softThreshold: number | null;
  billableDefault: boolean;
  autotaskExpenseCategoryId: number | null;
  isUserVisible: boolean;
  isActive: boolean; // requested active state; ignored (forced false) when unmapped & non-system
}

export interface DashboardRepository {
  getKpis(): Promise<Kpi[]>;
  getPipeline(): Promise<PipelineColumn[]>;
  getAccountsNeedingAttention(): Promise<Account[]>;
  /** Cross-domain intelligence strip — one glance over the BI-hub domains (ADR-0062). */
  getIntelStrip(): Promise<IntelStrip>;
}

export interface CrmRepository {
  // Accounts (full CRUD)
  listAccounts(): Promise<Account[]>;
  getAccount(id: string): Promise<AccountDetail | null>;

  /** Read-only device & cloud-asset inventory (ADR-0047, view migration 0053). */
  listDeviceInventory(): Promise<DeviceInventoryRow[]>;

  /**
   * The CMDB Configuration Item (CI) union read-model (#645, epic #372, ADR-0078) —
   * a READ-ONLY projection over EXISTING silver inventory, NO new ingest/schema. One
   * row per CI across the v1 types (`account` silver `account`, `user` silver `contact`,
   * `device` silver `device`), each tagged with `ciType` + owning `accountId`. Imperion
   * staff/admin identities (modelled as `app_user`, not `contact`) are EXCLUDED, and any
   * account-less row is dropped (`account_id IS NOT NULL`). Sorted account → type → name.
   * Mock / schema-lag fallback = `[]` (the register renders empty, never crashes).
   */
  listConfigurationItems(): Promise<ConfigurationItem[]>;

  // ── CMDB relationship layer (#647, epic #372, ADR-0078) ─────────────────────
  /**
   * Every CI relationship edge touching a CI (the `ci_relationship` table, migration
   * 0131) in BOTH directions — `from_ci = (type,id) OR to_ci = (type,id)`. Backs the
   * CI-detail "Relationships" panel and the neighbourhood dependency-graph view. Edges
   * are derived (recomputed from silver FKs) or manual (human-authored, cmdb:write).
   * Mock / schema-lag fallback = `[]`.
   */
  listCiRelationships(ciType: CiType, ciId: string): Promise<CiRelationship[]>;

  /**
   * Insert a MANUAL CI relationship edge (cmdb:write, ADR-0045). Idempotent on the
   * `(from, to, relation_type, source='manual')` unique key — re-adding the same edge
   * is a no-op (ON CONFLICT DO NOTHING). Validates both endpoints exist in the CI union
   * before insert (CIs are projections, not rows). Mock fallback throws (no DB).
   */
  createCiRelationship(input: CiRelationshipInput): Promise<void>;

  /**
   * Edit a MANUAL CI relationship edge by id — relation type + note (the endpoints are
   * fixed; re-point = delete + re-create). Only `source='manual'` rows are editable;
   * a derived row is recomputable and the UPDATE no-ops on it. cmdb:write. Mock throws.
   */
  updateCiRelationship(
    id: string,
    patch: { relationType: string; note: string | null },
  ): Promise<void>;

  /**
   * Remove a MANUAL CI relationship edge by id. Only `source='manual'` rows are
   * deletable — derived edges are managed by the derivation (deleting one would just
   * reappear on re-derivation), so the DELETE is scoped to manual. cmdb:write. Mock throws.
   */
  deleteCiRelationship(id: string): Promise<void>;

  /**
   * Recompute the DERIVED CI relationship edges from current silver FKs (the same seed
   * the migration runs): delete ONLY `source='derived'` rows, reinsert from silver.
   * MANUAL edges survive untouched. Idempotent / re-runnable. Returns the derived-edge
   * count after the recompute. cmdb:write. Mock fallback = 0 (no DB, nothing to derive).
   */
  deriveCiRelationships(): Promise<number>;

  /**
   * Read-only AR/invoice MIRROR over bronze `qbo_invoices` (the `invoice_mirror` view,
   * migration 0121, #668; ADR-0085 QBO read-only /
   * ADR-0044 external-SoR mirror). QuickBooks is the invoice SoR and read-only on our side — there
   * is NO write path to QBO. Aging (days_overdue, aging_bucket, is_open) is recomputed by
   * the view on every read; the silver account is resolved best-effort by name. Drives the
   * AR observability surface and the Collections + Controller agents (#667). Sorted oldest-
   * overdue first. Mock fallback = `[]`.
   */
  listInvoices(): Promise<InvoiceMirrorRow[]>;

  /**
   * Read the app-native collections/dunning overlay for one invoice
   * (`collections_activity` table, migration 0122, #677). Keyed by the QBO invoice id
   * (the invoice mirror is a VIEW — no FK). Returns null when no overlay row exists
   * yet (the invoice has never been worked). Holds workflow state ONLY — amounts and
   * balances are read from `listInvoices()` (the read-only mirror). Mock fallback = null.
   */
  getCollectionsActivity(qboInvoiceId: string): Promise<CollectionsActivity | null>;

  // ── Collections worklist batched read (#678) ──────────────────────────────
  /**
   * Batched read of the dunning overlay for MANY invoices at once — the bulk form of
   * `getCollectionsActivity`, backing the `/collections` aging worklist (#678). Keyed by
   * the QBO invoice id; only invoices that have been worked appear (a missing key ⟺ the
   * implicit not-yet-worked overlay, which the pure `buildWorklist` helper fills in). One
   * CURRENT-state row per invoice, most-recent first. Holds workflow state ONLY — amounts
   * are read from `listInvoices()`. Mirrors `listAssigneesForMany`. Mock/schema-lag = `{}`.
   */
  getCollectionsActivityForMany(
    qboInvoiceIds: string[],
  ): Promise<Record<string, CollectionsActivity>>;

  /**
   * Upsert the collections/dunning overlay state for an invoice (migration 0122, #677).
   * One CURRENT-state row per (tenant, invoice); `appendReminder` is appended to the
   * reminder log (prior entries are never rewritten). App-native — NEVER writes QBO.
   * Gated by `collections:write` (admin/finance, ADR-0030) at the server-action layer.
   * Mock fallback throws (no DB).
   */
  upsertCollectionsActivity(input: CollectionsActivityInput): Promise<void>;

  createAccount(input: AccountInput): Promise<void>;
  updateAccount(id: string, input: AccountInput): Promise<void>;
  deleteAccount(id: string): Promise<void>;

  // Contacts (CRUD list). Optional client filter backs the Contacts view
  // (client:true) vs all people.
  listContacts(opts?: { client?: boolean }): Promise<ContactRow[]>;

  /**
   * Contacts as lifecycle rows (ADR-0031). `client:false` backs the Leads view
   * (audience|lead|prospect — not yet signed); `client:true` backs the Contacts
   * view (signed clients); omitting the filter returns all stages for the
   * Pipeline board. One table, opposite filters.
   */
  listContactsByStage(opts?: { client?: boolean }): Promise<ContactPipelineRow[]>;
  /** Move a contact along the lifecycle (Pipeline board). */
  setContactStage(id: string, stage: ContactCrmStage): Promise<void>;

  // Opportunities (Pipeline board)
  listOpportunities(): Promise<OpportunityRow[]>;
  /**
   * One opportunity resolved for the deal/opportunity 360 (ADR-0068, #681) —
   * the board row plus `accountId` for keying the conversation read. Null when
   * the id is absent.
   */
  getOpportunity(id: string): Promise<OpportunityDetailRow | null>;
  /** Move an opportunity to a different sales stage (pipeline board). */
  setOpportunityStage(id: string, stage: string): Promise<void>;

  // Forecasting (ADR-0072, #381) — read model over the 0114 forecast fields.
  /** Opportunities with forecast fields resolved (effective probability + weighted). */
  listOpportunityForecast(): Promise<OpportunityForecastRow[]>;
  /** Revenue quotas per owner / team / period. */
  listQuotas(): Promise<QuotaRow[]>;
  /**
   * Nightly forecast snapshots (ADR-0072 decision 5, #384) — point-in-time
   * forecast calls per owner/team/period. Powers the forecast-accuracy trend.
   * WRITTEN by the backend/pipeline snapshot job (#382); read-only here.
   */
  listForecastSnapshots(): Promise<ForecastSnapshotRow[]>;

  // Lead scoring (ADR-0073 decision 5, #401) — read model over the 0116 lead_score table.
  /** Stored lead scores joined to their contact, ranked high→low (rule kind by default). */
  listLeadScores(kind?: LeadScoreKind): Promise<LeadScoreRow[]>;
  /** A single contact's scores (rule + any predicted), highest first. */
  listLeadScoresForContact(contactId: string): Promise<LeadScoreRow[]>;

  // Chat sessions (ADR-0074 §5, #403) — read model over the 0117 chat_session table.
  // Imperion-native pre-ticket / bot conversations + deflection telemetry. WRITTEN by
  // the backend chat process (ADR-0042); the front end only reads.
  /** Recent chat sessions (most-recent first), capped; for routing / BI-hub reads. */
  listChatSessions(limit?: number): Promise<ChatSessionRow[]>;
  /** A single contact's chat-session history, most-recent first. */
  listChatSessionsForContact(contactId: string): Promise<ChatSessionRow[]>;

  // Tasks (full CRUD)
  listTasks(): Promise<TaskRow[]>;
  /** A project's slice of the one task model, by task.project_id (ADR-0052 §2). */
  listProjectTasks(projectId: string): Promise<TaskRow[]>;
  getTask(id: string): Promise<TaskEditable | null>;
  createTask(input: TaskInput): Promise<void>;
  updateTask(id: string, input: TaskInput): Promise<void>;
  deleteTask(id: string): Promise<void>;

  // Time tracking (ADR-0069 D1, #346)
  /** Time logged against one task, newest-first, with logger display name. */
  listTaskTimeEntries(taskId: string): Promise<TaskTimeEntryRow[]>;
  /** Log a block of time against a task; the caller resolves & supplies the user. */
  logTime(input: TaskTimeLogInput): Promise<void>;
  /**
   * Project time rollup (#346 acceptance): summed logged minutes across the
   * project's tasks + summed hours-unit estimate (as minutes), so the project view
   * can show logged-vs-estimate remaining.
   */
  getProjectTimeRollup(projectId: string): Promise<ProjectTimeRollup>;

  // Sprints / backlog (ADR-0069 D4, #349)
  /** All sprints, newest-first, each with its committed-task rollup. */
  listSprints(): Promise<SprintRow[]>;
  /** One sprint with its rollup, or null if absent. */
  getSprint(id: string): Promise<SprintRow | null>;
  /** Create a sprint; returns nothing (the list reloads). */
  createSprint(input: SprintInput): Promise<void>;
  /** Update a sprint's fields (name/scope/window/status). */
  updateSprint(id: string, input: SprintInput): Promise<void>;
  /**
   * Close a sprint (#349 acceptance: "closing it moves open items forward").
   * Sets status='completed' and carries its still-open (not-done) tasks forward —
   * to the next planned sprint in the same scope if one exists, else to the
   * backlog (sprint_id = NULL). Returns the number of tasks carried over.
   */
  closeSprint(id: string): Promise<number>;
  /** A sprint's committed tasks (top-level), for its board (#349). */
  listSprintTasks(sprintId: string): Promise<TaskRow[]>;
  /**
   * Backlog tasks (sprint_id IS NULL) available to add to a sprint — open,
   * top-level, title-sorted. Backs the "add to sprint" picker (#349).
   */
  listBacklogTasks(): Promise<TaskRow[]>;
  /** Commit a task to a sprint, or null to return it to the backlog (#349). */
  setTaskSprint(taskId: string, sprintId: string | null): Promise<void>;

  // Agile reporting — burndown / velocity (C5, ADR-0066, #345)
  /**
   * Burndown input for one sprint (#345): the sprint meta + its committed,
   * ESTIMATED tasks (each with done-flag + best-available completion date) +
   * dominant estimate unit + the un-estimated count. The day-by-day series is
   * computed in `src/lib/agile-reporting.ts`. Null when the sprint is absent.
   *
   * Honest-degradation: no status-history table exists, so a done task's
   * completion date is `task.updated_at` (the only timestamp that moves on close).
   */
  getSprintBurndownData(sprintId: string): Promise<SprintBurndownData | null>;
  /**
   * Per-sprint velocity (#345): committed vs completed effort for every sprint,
   * completed-sprints first (for the velocity bar chart + rolling average).
   */
  listSprintVelocity(): Promise<SprintVelocityRow[]>;

  // Baselines / planned-vs-actual (ADR-0069 D6, #351)
  /** A project's baselines, newest-first (the first is the one slippage uses). */
  listProjectBaselines(projectId: string): Promise<ProjectBaselineRow[]>;
  /**
   * Capture a baseline: freeze the project's current target go-live + its tasks'
   * due dates into an immutable `planned_dates` snapshot. Re-baselining after a
   * scope change is allowed (the latest wins for slippage).
   */
  captureProjectBaseline(projectId: string): Promise<void>;
  /**
   * Planned-vs-actual slippage vs the LATEST baseline (#351 acceptance). Null when
   * the project has no baseline yet. When the project is complete, `slippageDays`
   * is actual-completion − planned go-live in whole days; otherwise null.
   */
  getProjectSlippage(projectId: string): Promise<ProjectSlippage | null>;

  // Recurring tasks (ADR-0070 E2, #353)
  /** The recurrence series owned by a task, or null if it doesn't recur. */
  getTaskRecurrence(taskId: string): Promise<TaskRecurrenceRow | null>;
  /**
   * Create or replace a task's recurrence series (the GUI defines it). `task_id` is
   * UNIQUE, so this upserts — re-saving edits the series in place.
   */
  upsertTaskRecurrence(input: TaskRecurrenceInput): Promise<void>;
  /** Stop a task recurring (delete its series row). Idempotent. */
  clearTaskRecurrence(taskId: string): Promise<void>;
  /**
   * Spawn the next occurrence when a recurring task is completed (#353 acceptance:
   * "a weekly recurring task spawns the next instance on completion with the right
   * due date; ending the series stops generation"). Transactional + idempotent:
   *
   *  - No series owned by `taskId` → no-op, returns null (so re-completing the same
   *    task never double-spawns — the series row moved to the freshly-spawned task).
   *  - Series exhausted (count_remaining hit 0, or next_run_at past ends_at) →
   *    deletes the series, returns null (no further generation).
   *  - Otherwise inserts a new task cloned from the source with due = next_run_at
   *    (preserving any start→due span), RE-POINTS the series row at the new task,
   *    advances next_run_at by one rule period, decrements count_remaining, and
   *    deletes the series if that spawn was the last one. Returns the new task id.
   */
  advanceTaskRecurrence(taskId: string): Promise<string | null>;

  // Conversational intelligence (ADR-0068, #375) — read-only on the front end; the
  // capture/transcribe/analyze write path is a backend process (ADR-0042), dormant
  // until ACS/Speech creds land (#66/#21). The 360 panel (#379) consumes these.
  /** An account's conversations, newest-started first (the 360 panel list). */
  listConversationsForAccount(accountId: string): Promise<ConversationRow[]>;
  /**
   * One conversation with its diarized turns + AI insights, or null if absent.
   * Turns come back in time order; insights grouped by kind.
   */
  getConversation(id: string): Promise<ConversationDetail | null>;

  // E-signature envelopes (ADR-0071, #391) — read-only on the front end; the send +
  // DocuSign Connect webhook status upsert are backend/pipeline processes (ADR-0042),
  // dormant until DocuSign JWT consent lands (#318/#392). The status surface (#395)
  // consumes these.
  /** A proposal's e-sign envelopes, newest-created first. */
  listEsignEnvelopesForProposal(proposalId: string): Promise<EsignEnvelopeRow[]>;

  // Subtasks / task hierarchy (ADR-0065 B1, #335)
  /** A task's child tasks, ordered by ordinal then title, with the n/m rollup. */
  getTaskChildren(parentId: string): Promise<TaskHierarchy>;
  /**
   * Re-parent a task (promote/demote). `newParentId` = null promotes to
   * top-level. Rejects self/descendant cycles server-side and returns false; on
   * success returns true.
   */
  reparentTask(id: string, newParentId: string | null): Promise<boolean>;
  /** Set a child task's sibling ordinal (reorder within a parent). */
  setTaskOrdinal(id: string, ordinal: number): Promise<void>;

  // Task dependencies — blocks / blocked-by (ADR-0065 B2, #336)
  /**
   * A task's full dependency picture: its predecessors (what blocks it), its
   * successors (what it blocks), and the derived `blocked` flag (any predecessor
   * not yet done). Soft in v1 — surfaced as a warning, never a hard block.
   */
  getTaskDependencies(taskId: string): Promise<TaskDependencies>;
  /**
   * Link `predecessorId` BLOCKS `successorId`. Rejects self-links and any link
   * that would close a dependency cycle (recursive predecessor walk), returning
   * false; a successful (idempotent) link returns true.
   */
  addTaskDependency(predecessorId: string, successorId: string): Promise<boolean>;
  /** Remove a dependency edge. Returns true if a link was removed. */
  removeTaskDependency(predecessorId: string, successorId: string): Promise<boolean>;
  /**
   * Open (not-done) tasks in a project that have at least one unmet blocker — a
   * predecessor that isn't done yet (ADR-0065 B2, #336). Backs the "closing a
   * project surfaces unmet blockers" acceptance: the project view warns before
   * close. {id, name=title} per blocked task, title-sorted.
   */
  listBlockedProjectTasks(projectId: string): Promise<Option[]>;
  /**
   * Every `blocks` dependency edge BETWEEN two tasks of the given project
   * (ADR-0066 C3, #343) — the connectors the timeline/Gantt view draws. Both
   * endpoints are project tasks; an edge crossing the project boundary is not
   * returned (it has nothing to connect on this surface). Pure read; no writes.
   */
  listProjectTaskDependencies(projectId: string): Promise<ProjectTaskDependencyEdge[]>;

  // Assignees & watchers — people on a work object (ADR-0065 B3, #337)
  /**
   * Everyone attached to a work object plus the viewer's own watch state
   * (ADR-0065 B3, #337). `viewerEmail` resolves the signed-in user so the watch
   * toggle renders without a second query; null = no viewer (treated as not
   * watching). Primary is the single owner; assignees are additional workers;
   * watchers are followers.
   */
  getWorkAssignments(
    parentType: string,
    parentId: string,
    viewerEmail: string | null,
  ): Promise<WorkAssignments>;
  /**
   * Set the full assignee set for a work object (the multi-select save). Replaces
   * every `assignee` row with `userIds`, never touching the `primary` row or any
   * `watcher` rows. Idempotent. A user already the primary is skipped (they are
   * already on the object as its owner). `actingUserId` (the employee making the
   * change, #601) is stamped as the actor on the `assigned` notification so the
   * bell reads "X assigned you" rather than a system event; omit/null = system.
   */
  setTaskAssignees(taskId: string, userIds: string[], actingUserId?: string | null): Promise<void>;
  /**
   * Add or remove the viewer as a `watcher` (the watch/unwatch toggle, ADR-0065
   * B3). `watch=true` upserts a watcher row (no-op if the user already holds any
   * role); `watch=false` removes ONLY a watcher row (never the primary/assignee).
   * Idempotent. `userId` is the resolved app_user id.
   */
  setTaskWatch(taskId: string, userId: string, watch: boolean): Promise<void>;
  /**
   * Promote a user to `primary` on a task — the single owner that drives rollups
   * and RBAC (ADR-0065 B3). Mirrors the change onto `task.owner_user_id` so the
   * legacy reads (Sales Queue, owner FK) stay in lockstep. The previous primary is
   * demoted to `assignee` (kept on the object), and the new primary is upserted.
   * `role` is fixed to 'primary' — the param documents intent at the call site.
   */
  setTaskPrimary(taskId: string, userId: string, role: Extract<WorkRole, "primary">): Promise<void>;
  /**
   * People attached across MANY work objects of one kind, as a map of parentId →
   * their assignment rows (#608, ADR-0066 C1-F4). The bulk counterpart to
   * {@link getWorkAssignments} for the kanban board: one read for every visible
   * card so the board never N+1s the per-object read. Each row is the primary +
   * assignees + watchers (primary first, then by name) — the card renderer caps
   * the avatars it shows and rolls the rest into a "+N" overflow. Empty map entry
   * (or absent key) = nobody attached. Read-only over `work_assignment`.
   */
  listAssigneesForMany(
    parentType: WorkParentType,
    parentIds: string[],
  ): Promise<Record<string, WorkAssignmentRow[]>>;
  /**
   * Live comment + attachment counts across MANY work objects of one kind, as a
   * map of parentId → `{ comments, attachments }` (#608, ADR-0066 C1-F4). One read
   * for the whole board's visible cards (the bulk counterpart to the per-object
   * `listComments` / `listAttachments`), counting only non-deleted rows
   * (`deleted_at IS NULL`, ADR-0064 A1/A4). A parent with neither is absent from
   * the map; the card renderer treats absence as 0/0 (honest degradation — never
   * fabricates a count). Read-only over `work_comment` + `work_attachment`.
   */
  listEngagementCountsForMany(
    parentType: WorkParentType,
    parentIds: string[],
  ): Promise<Record<string, EngagementCounts>>;
  /**
   * Per-user load for the workload / capacity view (ADR-0069 D1/D2, #591). One row
   * per app_user attached to at least one not-done task (primary OR assignee, via
   * `work_assignment`), carrying that user's SUMMED estimated hours (`task.estimate`
   * where `estimate_unit = 'hours'`), their `user_capacity.weekly_hours`, and the
   * open / due-soon / overdue counts. `range` scopes load by task due date (D2-F1
   * "over a date range") — omit for all open work. Read over `work_assignment` +
   * `task` + `user_capacity`; no writes.
   */
  listWorkload(range?: { from: string; to: string }): Promise<WorkloadRow[]>;

  // #591 user_capacity — per-user weekly-hours capacity (the workload threshold)
  /**
   * Every app_user with their `user_capacity.weekly_hours` (null when unset). Drives
   * the weekly-hours admin surface (`/projects/capacity`). Read over `app_user` LEFT
   * JOIN `user_capacity`. ADR-0069 D2, #591.
   */
  listUserCapacity(): Promise<UserCapacity[]>;
  /**
   * Upsert a user's weekly capacity hours (`user_capacity.weekly_hours`). `null`
   * clears it. Gated by `delivery:capacity` (admin∨project_manager) at the action.
   * ADR-0069 D2, #591.
   */
  setUserCapacity(userId: string, weeklyHours: number | null): Promise<void>;

  // Sales Activity (ADR-0052 §6) — the Sales Queue read model + its two writes
  /** Open `category='sales'` tasks with owner + deal context (the Sales Queue). */
  listSalesTasks(): Promise<SalesTaskRow[]>;
  /** Create a sales task (category fixed to 'sales', owned by the creating rep). */
  createSalesTask(input: SalesTaskInput): Promise<void>;
  /**
   * Set a task's status (Sales Queue complete button / kanban drag; idempotent).
   * Returns the PREVIOUS status (null if the task was absent) so the caller can
   * emit an `task.status_changed` activity event only on a real X→Y move (#438).
   */
  setTaskStatus(id: string, status: string): Promise<string | null>;
  /**
   * Stamp a task's status from a configurable-status board drop (ADR-0065 B5, #613).
   * Given the target `status_def.id`, writes BOTH the new `status_def_id` FK AND the
   * legacy `status` text column (back-compat during the compatibility window) — the
   * latter set to the status_def's `key` (task.status is free text, so any key fits).
   * Returns the PREVIOUS legacy status (null if the task was absent) so the caller can
   * emit a `task.status_changed` activity event on a real X→Y move, mirroring
   * `setTaskStatus`. A status_def id of another context/missing row is a no-op (null).
   */
  setTaskStatusDef(id: string, statusDefId: string): Promise<string | null>;
  /** Set a task's category (kanban group-by=category drop; idempotent). */
  setTaskCategory(id: string, category: string): Promise<void>;
  /**
   * Set a task's due date (calendar drag-to-reschedule, ADR-0066 C2). `dueAt` is
   * an ISO `yyyy-mm-dd` string, or null to clear. Idempotent; no migration —
   * writes the existing `task.due_at` column (0007).
   */
  setTaskDue(id: string, dueAt: string | null): Promise<void>;

  // Proposals (full CRUD) — attach to an opportunity (ADR-0019)
  listProposals(): Promise<ProposalRow[]>;
  getProposal(id: string): Promise<ProposalEditable | null>;
  createProposal(input: ProposalInput): Promise<void>;
  updateProposal(id: string, input: ProposalInput): Promise<void>;
  deleteProposal(id: string): Promise<void>;

  // Delivery projects (full CRUD) — typed via the project_type table (ADR-0020/0052)
  listProjects(): Promise<ProjectRow[]>;
  /**
   * Cross-project portfolio rollup (ADR-0069 D5, #350): every project with its
   * milestone health rollup + next milestone. Pure read model over `project` +
   * `project_milestone` — no new table.
   */
  listPortfolio(): Promise<PortfolioRow[]>;
  /**
   * Goals / OKRs above projects with their rolled-up progress (ADR-0069 D3, #348).
   * Each goal carries its linked contributing projects (`goal_link` ⋈ `project` ⋈
   * its `project_milestone` completion) and the weighted-average rollup percent
   * derived from them (`lib/goals.ts`). Pure read model — the rollup is computed,
   * never stored. Backs the read-only goals list.
   */
  listGoals(): Promise<GoalRow[]>;
  /** A single goal loaded for editing (authoring form), or null (issue #621). */
  getGoal(id: string): Promise<GoalEditable | null>;
  /** Create a goal (issue #621). The rollup is always derived, never stored. */
  createGoal(input: GoalInput): Promise<void>;
  /** Update a goal's authored fields (issue #621). */
  updateGoal(id: string, input: GoalInput): Promise<void>;
  /** Delete a goal; its `goal_link` rows CASCADE (issue #621). */
  deleteGoal(id: string): Promise<void>;
  /**
   * Add (or idempotently re-weight) a goal_link — a polymorphic project|task link
   * with a rollup weight (issue #621). ON CONFLICT updates the weight.
   */
  addGoalLink(input: GoalLinkInput): Promise<void>;
  /** Remove a goal_link by its (goal, parent_type, parent_id) identity (issue #621). */
  removeGoalLink(goalId: string, parentType: string, parentId: string): Promise<void>;
  /** Projects + tasks available to link to a goal (the link picker, issue #621). */
  goalLinkCandidates(): Promise<{ projects: Option[]; tasks: Option[] }>;
  getProject(id: string): Promise<ProjectEditable | null>;
  createProject(input: ProjectInput): Promise<void>;
  updateProject(id: string, input: ProjectInput): Promise<void>;
  /** Set a project's status (kanban board drop; idempotent). */
  setProjectStatus(id: string, status: string): Promise<void>;
  /**
   * Stamp a project's status from a configurable-status board drop (ADR-0065 B5, #613).
   * Given the target `status_def.id`, writes BOTH the new `status_def_id` FK AND the
   * legacy `status` enum (back-compat). `project.status` is the `project_status` ENUM,
   * which cannot hold a custom key, so the legacy column is set to the enum value the
   * status_def's `category` maps to (todo→not_started, in_progress→in_progress,
   * done→complete) — the FK carries the precise (possibly custom) column, the enum
   * keeps the legacy rollup honest. started_at/completed_at are stamped exactly as
   * `setProjectStatus`/`updateProject` do. A missing/other-context id is a no-op.
   */
  setProjectStatusDef(id: string, statusDefId: string): Promise<void>;
  /** Set a project's type (kanban group-by=type drop; idempotent). */
  setProjectType(id: string, projectTypeId: string): Promise<void>;
  deleteProject(id: string): Promise<void>;

  // Delivery templates — reusable provisioning playbooks (ADR-0081, migration 0084)
  /** Authoring/picker list. `activeOnly` hides retired templates; `projectTypeId`
   *  filters to templates bound to that type (or unbound). */
  listDeliveryTemplates(opts?: {
    activeOnly?: boolean;
    projectTypeId?: string;
  }): Promise<DeliveryTemplateRow[]>;
  /** The full template tree (phases + tasks), or null if not found. */
  getDeliveryTemplate(id: string): Promise<DeliveryTemplateDetail | null>;
  /** Create a template + its whole phase/task tree in one transaction; returns the id. */
  createDeliveryTemplate(input: DeliveryTemplateInput): Promise<string>;
  /** Delete a template (CASCADE drops its phases/tasks); provisioning refs SET NULL. */
  deleteDeliveryTemplate(id: string): Promise<void>;
  /**
   * Instantiate a delivery template into the native intent plane (ADR-0080 §4,
   * #566): create the project + milestones + tasks, the `project_provisioning`
   * row (pending, contract gate 'none'), and a `task_ticket_fire` row per
   * dispatching task — all in one transaction. Returns the new project id.
   */
  instantiateDeliveryTemplate(input: DeliveryInstantiationInput): Promise<string>;

  // Project templates — admin-editable project playbooks (ADR-0070 E1, migration 0109)
  /** Authoring/picker list. `projectTypeId` filters to templates bound to that type (or unbound). */
  listProjectTemplates(opts?: { projectTypeId?: string }): Promise<ProjectTemplateRow[]>;
  /** The full template tree (milestones + steps/tasks), or null if not found. */
  getProjectTemplate(id: string): Promise<ProjectTemplateDetail | null>;
  /** Create a template + its whole milestone/item tree in one transaction; returns the id. */
  createProjectTemplate(input: ProjectTemplateInput): Promise<string>;
  /**
   * In-place edit of an existing template (ADR-0070 E1, #634): patch the header and
   * RE-SNAPSHOT its milestone/item tree (drop all `template_item` rows, re-insert from
   * `input`) in one transaction. Refuses a protected (seeded) template. Because apply is
   * a snapshot (ADR-0070), editing a template never retro-mutates already-instantiated
   * projects.
   */
  updateProjectTemplate(id: string, input: ProjectTemplateInput): Promise<void>;
  /** Delete a template (CASCADE drops its items). Refuses a protected (seeded) template. */
  deleteProjectTemplate(id: string): Promise<void>;
  /**
   * Instantiate a project template (ADR-0070 E1, #352): create the project + a
   * milestone per template milestone + a task per step/task, snapshotting the
   * template, in one transaction. The protected onboarding template delegates to
   * applyOnboardingTemplate (no behaviour change). Returns the new project id.
   */
  instantiateProjectTemplate(input: ProjectTemplateInstantiationInput): Promise<string>;

  // Task checklist templates — reusable named subtask sets (ADR-0070 E1-F3, #633).
  // These REUSE the project_template / template_item tables (no migration): a checklist
  // template is a project_template row whose key carries the CHECKLIST_TEMPLATE_KEY_PREFIX,
  // and its items are flat template_item rows (kind='task', parent_id NULL, payload={title}).
  // Apply = instantiate those items as subtasks under a target task.
  /** Authoring/picker list of checklist templates (project_template rows with the checklist key prefix). */
  listChecklistTemplates(): Promise<ChecklistTemplateRow[]>;
  /** A checklist template's ordered items, or null if not found / not a checklist template. */
  getChecklistTemplate(id: string): Promise<ChecklistTemplateDetail | null>;
  /** Create a checklist template + its items in one transaction; returns the id. */
  createChecklistTemplate(input: ChecklistTemplateInput): Promise<string>;
  /** Delete a checklist template (CASCADE drops its items). Refuses anything that isn't a checklist template. */
  deleteChecklistTemplate(id: string): Promise<void>;
  /**
   * Apply a checklist template to a task (ADR-0070 E1-F3, #633): instantiate each of the
   * template's items as a subtask under `taskId` (parent_task_id = taskId), snapshotting
   * the titles. Each subtask inherits the parent's account/project/category. Returns the
   * number of subtasks created (0 if the task or template is missing/empty).
   */
  applyChecklistTemplateToTask(input: ApplyChecklistTemplateInput): Promise<number>;

  // Intake forms — staff-authored forms that create a task on submit (ADR-0070 E3, migration 0111, #354)
  /** Manager/picker list with field + submission counts. */
  listIntakeForms(): Promise<IntakeFormRow[]>;
  /** The full form definition (fields + routing defaults), or null if not found. */
  getIntakeForm(id: string): Promise<IntakeFormDetail | null>;
  /** Create a form; returns the id. */
  createIntakeForm(input: IntakeFormInput): Promise<string>;
  /**
   * In-place edit of a form (ADR-0070 E3, #639): patch the existing row's
   * definition (fields + routing defaults + `is_active`) WITHOUT changing its id
   * or `key`, so the stable key and submission history (`intake_submission.form_id`)
   * survive an edit. The `key` is column-immutable here — it is derived from the
   * name at create and edits never re-slug it.
   */
  updateIntakeForm(id: string, input: IntakeFormInput): Promise<void>;
  /** Delete a form (CASCADE drops its submissions). */
  deleteIntakeForm(id: string): Promise<void>;
  /**
   * Submit a form (ADR-0070 E3, #354): map the answers onto a new task (title/
   * detail/due_at/note per each field's mapsTo) routed to the form's default
   * account/project/owner/queue, and record the submission — in one transaction.
   * `submittedBy` is the resolved app_user id (null when unresolved). Returns the
   * created task + submission ids.
   *
   * Extended fields (#638): a field's mapsTo may also be `assignee` (the answer is
   * an app_user id → the task's primary owner, overriding the form default) or
   * `custom:<cf_key>` (the answer is written as a `custom_field_value` keyed by the
   * task-scoped `custom_field_def` of that key). Both are written inside the same
   * transaction; an unmatched custom key is ignored.
   */
  submitIntakeForm(
    formId: string,
    payload: Record<string, string>,
    submittedBy: string | null,
  ): Promise<IntakeSubmitResult>;
  /** A form's submissions, newest first (the detail page audit list). */
  listIntakeSubmissions(formId: string): Promise<IntakeSubmissionRow[]>;
  /**
   * The delivery board read model (ADR-0080 §4/§7, #568): every provisioned
   * project (`project_provisioning ⋈ project ⋈ account`) with its dispatching
   * tasks' `task_ticket_fire` state. Read-only; the board steers firing by
   * writing intent (see `scheduleTaskFire`). Newest provisioning first.
   */
  listProvisionedProjects(): Promise<DeliveryBoardProject[]>;
  /**
   * Write a task's fire INTENT (ADR-0042 boundary, #568): move its
   * `task_ticket_fire` row to fire_state='scheduled' with `scheduled_for`. The
   * backend executor — never the web — creates the Autotask Ticket. "Fire now"
   * is this with `scheduledFor = now`. No-op-safe: only a non-fired dispatching
   * row is touched. Gated `delivery:write` at the action layer.
   */
  scheduleTaskFire(taskId: string, scheduledFor: string): Promise<void>;

  // Time tracking — employee weekly timesheets (ADR-0082, migrations 0085–0087)
  /** An employee's timesheets, most-recent week first (history/list). */
  listTimesheets(opts: { employeeId: string }): Promise<TimesheetRow[]>;
  /** The employee's timesheet for a Mon-start week — entries + per-day reconciliation
   *  (the memory-jogger) — or null if none has been opened yet. */
  getTimesheetForWeek(employeeId: string, weekStart: string): Promise<TimesheetDetail | null>;
  /** Get-or-create the employee's Open timesheet for a Mon-start week; returns its id
   *  (idempotent on the UNIQUE (app_user_id, week_start)). */
  ensureTimesheetForWeek(employeeId: string, weekStart: string): Promise<string>;
  /** Add an attendance Time Entry to a timesheet; returns the new entry id. */
  addTimeEntry(input: TimeEntryInput): Promise<string>;
  /** Edit a Time Entry (caller gates: own + Open, or admin on Submitted). */
  updateTimeEntry(id: string, input: TimeEntryInput): Promise<void>;
  /** Remove a Time Entry. */
  deleteTimeEntry(id: string): Promise<void>;
  /** Attest (submit) a timesheet: state→submitted, stamp attested_by/at, snapshot the
   *  attested entries for audit. Caller enforces the Hard-deviation gate first. */
  submitTimesheet(id: string, attestedBy: string): Promise<void>;
  /** The admin review queue: all Submitted timesheets across employees, oldest-attested
   *  first (with the employee's display name). */
  listSubmittedTimesheets(): Promise<TimesheetReviewRow[]>;
  /** The unified admin lifecycle feed: EVERY timesheet across EVERY state + employee,
   *  newest week first (with employee name, attendance, approved minutes, and the
   *  payroll/payment fields). Comp-free. The admin surface (#539) filters + sorts this
   *  in memory; the two split queues read narrower projections of the same data. */
  listAllTimesheets(): Promise<AdminTimesheetRow[]>;
  /** Approve a Submitted timesheet (admin): state→approved, stamp approver, and create the
   *  pending Time Ticket tracking row (idempotent) for the backend writer to pick up. */
  approveTimesheet(id: string, approvedBy: string): Promise<void>;
  /** Send an approved/submitted timesheet back to the employee: state→open, clear the
   *  attest/approve stamps (re-attest required). Keeps the snapshot + Time Ticket row. */
  reopenTimesheet(id: string): Promise<void>;
  /** Admin read of any timesheet by id (NOT employee-scoped) — the live detail plus the
   *  immutable attested original, for the #477 inline-correction surface. */
  getTimesheetById(id: string): Promise<AdminTimesheetReview | null>;
  /** Admin in-place correction of a Submitted sheet's entries (ADR-0082 #477), audited
   *  vs the attested original: verifies state=submitted under a row lock, applies the
   *  add/edit/delete (owner taken from the sheet, never the caller), and writes an
   *  `audit_log` row (who/when/before→after). Returns false (no-op) if not Submitted or
   *  the target entry doesn't belong to the sheet. Caller gates `time:approve`. */
  correctSubmittedTimesheet(
    timesheetId: string,
    op: TimesheetCorrection,
    correctedBy: string,
  ): Promise<boolean>;

  // Payroll approval — the CFO gate + Paid surface (ADR-0082, #466)
  /** The payroll queue: every Approved sheet + the later payroll states (payroll_approved,
   *  paid) across employees, from the comp-free `timesheet_payroll_status` view. NO Pay Rate. */
  listPayrollTimesheets(): Promise<PayrollTimesheetRow[]>;
  /** Payroll-approve an Approved sheet (CFO): state→payroll_approved, stamp the approver.
   *  Authorizes payment; the app never pays. Idempotent (only an Approved sheet moves). */
  payrollApproveTimesheet(id: string, approvedBy: string): Promise<void>;
  /** Revert a payroll-approved sheet back to Approved (CFO undo before payment): clear the
   *  payroll-approval stamps. Only a payroll_approved (not Paid) sheet moves. */
  unapprovePayrollTimesheet(id: string): Promise<void>;
  /** Confirm the QuickBooks-matched payment (CFO): state→paid, stamp paid_at + qb_payment_ref.
   *  Only a payroll_approved sheet moves; idempotent. The match itself comes from the backend
   *  Payroll Reconciliation (BE #105) — this records the CFO's confirmation of it. NO comp data. */
  markTimesheetPaid(id: string, qbPaymentRef: string): Promise<void>;

  // Employee external-id mapping — admin one-time setup (ADR-0082, #468)
  /** Every active employee with its Autotask Resource / QuickBooks vendor mapping
   *  (left-joined `employee_profile`); email is the join key. Mapping cols only —
   *  no comp data. */
  listEmployeeMappings(): Promise<EmployeeMappingRow[]>;
  /** Confirm an employee's mapping (admin): upsert the resolved Autotask Resource /
   *  QuickBooks vendor / MileIQ user ids onto `employee_profile` and stamp who/when.
   *  Idempotent. Mapping cols + audit only — never comp data. */
  confirmEmployeeMapping(input: EmployeeMappingInput, confirmedBy: string): Promise<void>;

  // Mileage rate — the effective-dated SYSTEM-wide comp figure (ADR-0083, #490).
  // COMP DATA: gated exactly like pay_rate — these methods run ONLY behind the
  // finance∨admin gate (`expense:finance-approve`); the per-employee mileage $ is
  // derived by the backend (the sole comp reader), never on a broadly-granted surface.
  /** Every system mileage rate, newest effective date first, with who set it; the row in
   *  force as of today is flagged `isCurrent`. COMP DATA — caller gates finance∨admin. */
  listMileageRates(): Promise<MileageRateRow[]>;
  /** Append a system-override mileage rate effective on a date (ADR-0083, #490): insert a
   *  `mileage_rate` row (source='system_override') stamped with who set it, upserting on the
   *  UNIQUE effective_from so re-setting the same date overwrites. COMP DATA — caller gates
   *  finance∨admin. The app never derives the per-employee amount here. */
  setMileageRate(input: MileageRateInput, createdBy: string): Promise<void>;

  // Expense tracking — employee monthly expense reports (ADR-0083, migrations 0088–0090)
  /** An employee's expense reports, most-recent month first (history/list). */
  listExpenseReports(opts: { employeeId: string }): Promise<ExpenseReportRow[]>;
  /** The employee's report for a calendar month — items + totals — or null if none
   *  has been opened yet. */
  getExpenseReportForPeriod(
    employeeId: string,
    year: number,
    month: number,
  ): Promise<ExpenseReportDetail | null>;
  /** Get-or-create the employee's Open report for a calendar month; returns its id
   *  (idempotent on the UNIQUE (app_user_id, period_year, period_month)). */
  ensureExpenseReportForPeriod(employeeId: string, year: number, month: number): Promise<string>;
  /** Attest (submit) a report: state→submitted, stamp attested_by/at, snapshot the
   *  attested items for audit. Caller enforces the hard-policy gate first. */
  submitExpenseReport(id: string, attestedBy: string): Promise<void>;
  /** Send a submitted/approved/rejected report back to Open: clear the attest/approve/
   *  reject stamps (re-attest required). Keeps the snapshot + Autotask tracking row. */
  reopenExpenseReport(id: string): Promise<void>;
  /** The unified admin lifecycle feed: EVERY report across EVERY state + employee,
   *  newest month first (employee name, item count, totals, and the finance/payment
   *  fields). Comp-free. The admin surface (#548) filters + sorts this in memory. */
  listAllExpenseReports(): Promise<AdminExpenseRow[]>;
  /** Admin read of any report by id (NOT employee-scoped) — the live detail plus the
   *  immutable attested original, for the inline-review surface. */
  getExpenseReportById(id: string): Promise<AdminExpenseReview | null>;
  /** The QuickBooks reimbursement match the backend recon suggests for a report
   *  (from the comp-free `expense_reconciliation`); null if no recon row exists. */
  getExpenseReimbursementMatch(expenseReportId: string): Promise<ExpenseReimbursementMatch | null>;
  /** Approve a Submitted report (admin): state→approved, stamp approver, and create the
   *  pending Autotask ExpenseReport tracking row (idempotent) for the backend writer. */
  approveExpenseReport(id: string, approvedBy: string): Promise<void>;
  /** Finance-approve an Approved report (CFO/finance): state→finance_approved, stamp the
   *  approver. Authorizes reimbursement; the app never pays. Idempotent. */
  financeApproveExpenseReport(id: string, approvedBy: string): Promise<void>;
  /** Confirm the QuickBooks-matched reimbursement (finance): state→reimbursed, stamp
   *  reimbursed_at + qb_bill_payment_ref. Only a finance_approved report moves; idempotent.
   *  The match comes from the backend recon (BE #111) — this records its confirmation. */
  markExpenseReportReimbursed(id: string, qbPaymentRef: string): Promise<void>;
  /** Reject a submitted/approved report (admin/finance): state→rejected, stamp the
   *  rejecter + note. The employee reopens to correct and re-attest. */
  rejectExpenseReport(id: string, rejectedBy: string, note: string): Promise<void>;

  // Expense ITEM CRUD — out-of-pocket entries (ADR-0083, #486). Self-scoped: the
  // employee id is the session owner, never the form; every write re-checks that the
  // owning report is Open AND owned by that employee server-side. Writes target the
  // website_expense_item bronze (the only hand-entered kind; mileage is MileIQ-sourced).
  /** Add an out-of-pocket item to the employee's OWN Open report; returns the new id,
   *  or null if the report isn't Open or isn't owned by `employeeId` (lock re-check). */
  addExpenseItem(input: ExpenseItemInput): Promise<string | null>;
  /** Edit an out-of-pocket item on the employee's OWN Open report. Returns false if the
   *  item isn't on an Open report owned by `employeeId` (lock + ownership re-check). */
  updateExpenseItem(id: string, input: ExpenseItemInput): Promise<boolean>;
  /** Delete an out-of-pocket item from the employee's OWN Open report. Returns false if
   *  the item isn't on an Open report owned by `employeeId` (lock + ownership re-check). */
  deleteExpenseItem(id: string, employeeId: string): Promise<boolean>;

  /** ADMIN inline correction of a SUBMITTED report's out-of-pocket items (ADR-0083 #488),
   *  gated by `expense:approve`. Add / edit-in-place / delete a `website_expense_item`; the
   *  owning report/employee is taken from the locked report (never the caller). Every op is
   *  audited vs the employee's immutable attested original (`audit_log`, action
   *  `expense.corrected`); the report stays Submitted. Returns false if the report isn't
   *  Submitted or the target item isn't on it (lock re-check). Mileage is not correctable. */
  correctSubmittedExpenseReport(
    reportId: string,
    op: ExpenseCorrection,
    correctedBy: string,
  ): Promise<boolean>;

  // Expense reference + read models (ADR-0083, #486) — all comp-free (no mileage rate).
  /** The visible, mapped (active) out-of-pocket categories the entry GUI offers, by
   *  display name. Excludes the rate-driven system Mileage category. */
  listExpenseCategories(): Promise<ExpenseCategoryRow[]>;
  /** ADMIN view: EVERY expense category (incl. until-mapped placeholders, hidden, inactive,
   *  and the system Mileage row) with its full config + QuickBooks link, for the mapping
   *  console (#489). Comp-free. Distinct from `listExpenseCategories` (entry-GUI subset). */
  listExpenseCategoriesAdmin(): Promise<ExpenseCategoryAdminRow[]>;
  /** ADMIN view: the synced QuickBooks chart-of-accounts (read-only `qbo_expense_account`)
   *  the mapping console offers as link targets, each annotated with the category key
   *  already mapped to it (#489). Empty until the local-pipeline QuickBooks pull runs (LP #168). */
  listQboExpenseAccounts(): Promise<QboExpenseAccountRow[]>;
  /** ADMIN write: map/configure one expense category (#489) — set its QuickBooks link,
   *  caps/threshold, billable default, Autotask category id, visibility, active state, and
   *  stamp who mapped it. Forces inactive when a non-system category is left unmapped (the
   *  DB CHECK also enforces it). NEVER writes QuickBooks. Refuses to edit the system row's link. */
  updateExpenseCategoryMapping(input: ExpenseCategoryMappingInput, mappedBy: string): Promise<void>;
  /** The employee's business-classified MileIQ drives for a calendar month (read-only
   *  mileage feed). Comp-free — miles + MileIQ's own suggested $, never the rate. */
  listMileiqDrives(employeeId: string, year: number, month: number): Promise<MileiqDriveRow[]>;
  /** The derived per-item policy violations for one report (the `expense_policy_violation`
   *  view) — the pre-attest memory-jogger. Hard rows block attest. */
  listExpensePolicyViolations(expenseReportId: string): Promise<ExpensePolicyViolationRow[]>;
  /** The unified monthly-close rows for an employee, newest month first (the comp-free
   *  `monthly_close` view: time minutes + reimbursable totals + match statuses). */
  listMonthlyClose(employeeId: string): Promise<MonthlyCloseRow[]>;
  /** The unified Monthly Close feed across ALL employees (ADR-0083 #491) — the
   *  `monthly_close` view joined to the employee display name, newest month first. The
   *  single finance surface rolling up both legs (time + reimbursable expense) per
   *  employee per month. Comp-free — minutes + dollar amounts only, never a rate. */
  listAllMonthlyClose(): Promise<AdminMonthlyCloseRow[]>;

  // Project types — user-creatable from the project board (ADR-0052 §1)
  listProjectTypes(): Promise<ProjectTypeRow[]>;
  createProjectType(input: ProjectTypeInput): Promise<void>;
  /** Refuses protected types; deleting a type in use fails on the RESTRICT FK. */
  deleteProjectType(id: string): Promise<void>;

  /**
   * Configurable status sets (ADR-0065 B5, #339) from `status_def`. Returns the
   * resolved set for a context ('task' | 'project'): the project-type-scoped
   * statuses when `projectTypeId` is given and that type defines its own set,
   * otherwise the seeded global defaults — ordered by `ordinal`. This is the
   * core read the board-column and reporting follow-ups build on; the legacy
   * string status path is unaffected until those land.
   */
  listStatusDefs(
    context: string,
    projectTypeId?: string | null,
  ): Promise<StatusDefRow[]>;

  /**
   * The full status set for one (context, scope, projectTypeId) — admin CRUD read
   * (ADR-0065 B5, #616). Unlike `listStatusDefs` (which resolves typed-over-global
   * for consumers), this returns EXACTLY the rows of the named scope so the admin
   * surface edits one set at a time. Ordered by `ordinal`.
   */
  listStatusDefsForScope(
    context: string,
    scope: string,
    projectTypeId: string | null,
  ): Promise<StatusDefRow[]>;
  /** Create a status definition; returns the created row (ADR-0065 B5, #616). */
  createStatusDef(input: StatusDefInput): Promise<StatusDefRow>;
  /** Update a status definition in place; returns the updated row, or null if gone. */
  updateStatusDef(id: string, input: StatusDefInput): Promise<StatusDefRow | null>;
  /** Delete a status definition (the FK is ON DELETE SET NULL). True if removed. */
  deleteStatusDef(id: string): Promise<boolean>;
  /** Persist a new column order: each {id, ordinal} pair is stamped onto its row. */
  reorderStatusDefs(order: { id: string; ordinal: number }[]): Promise<void>;

  // Onboarding dashboard — projects with their R/Y/G milestones + checklist (ADR-0034/0037)
  listOnboarding(): Promise<OnboardingProject[]>;
  /** Set a milestone's R/Y/G health from the dashboard (manual; auto-derived when it has steps). */
  setMilestoneHealth(id: string, health: string): Promise<void>;
  /** Instantiate the standard onboarding playbook for a project (phases + checklist). */
  applyOnboardingTemplate(projectId: string, startAt: string): Promise<void>;
  /** Check/uncheck a playbook checklist step. Completing a step also closes its
   * linked project task (#101, ADR-0052 §4) — idempotent; a deploy-flagged step
   * with no linked task records an audit note instead. */
  setOnboardingStepStatus(id: string, done: boolean): Promise<void>;
  /** Stamp an easy-mode step's deploy request (ADR-0052 §3; backend dispatch is
   * the integration phase — this records the request + audit honestly). */
  requestOnboardingDeploy(id: string): Promise<void>;

  // AI Security Readiness Assessments (full CRUD) — gates managed services (ADR-0022)
  listAssessments(): Promise<AssessmentRow[]>;
  getAssessment(id: string): Promise<AssessmentEditable | null>;
  createAssessment(input: AssessmentInput): Promise<void>;
  updateAssessment(id: string, input: AssessmentInput): Promise<void>;
  deleteAssessment(id: string): Promise<void>;

  /** Account options for select dropdowns. */
  accountOptions(): Promise<Option[]>;

  /**
   * Task options ({id, title}) for the dependency picker (ADR-0065 B2, #336),
   * title-sorted. `excludeId` drops that task from the list so a task can't be
   * offered to depend on itself.
   */
  taskOptions(excludeId?: string): Promise<Option[]>;

  /** Opportunity options ("Account — Opportunity") for select dropdowns. */
  opportunityOptions(): Promise<Option[]>;

  /** Contact options ("Full name (Account)") for select dropdowns. */
  contactOptions(): Promise<Option[]>;

  /** Assessment options ("Account — Assessment") for select dropdowns. */
  assessmentOptions(): Promise<Option[]>;

  /** App-user options (display name) for owner select dropdowns. */
  userOptions(): Promise<Option[]>;

  /** Per-source bronze rows that fed this company's unified record (ADR-0032). */
  listAccountSources(accountId: string): Promise<AccountSourceRow[]>;

  /**
   * Related local-pipeline bronze for this account (Autotask contracts/tickets, IT Glue
   * documentation) — citations for drill-down troubleshooting (migration 0038).
   */
  listAccountRelatedBronze(accountId: string): Promise<AccountSourceRow[]>;
}

export interface AgentRepository {
  /** The orchestrator conversation feed shown in the agent panel. */
  getConversation(): Promise<AgentMessage[]>;

  /**
   * Read the autonomy rung for an orchestration agent from the data-driven dial
   * (`agent_autopilot_policy` table, migration 0123, #721; ADR-0087's "one dial,
   * stored as data"). Keyed per (agent · workflow · plane); resolves the
   * most-specific matching row — an exact `workflowKey` beats the `'*'` agent
   * default. Returns the policy row, or **null** when the dial has no row for that
   * (agent, plane) yet (the caller then assumes `DEFAULT_AUTONOMY_RUNG` = the safe
   * draft posture — gating is data, so "no data" means "stay conservative"). This
   * is the read backend orchestration agents will consume to make their autonomy a
   * data change, not a hardcoded cap (e.g. BE #156's collections agent). Pure read;
   * the agents:operate-gated write lives behind a server action, not here. Mock
   * fallback = null (no DB → safe default).
   */
  getAutonomyPolicy(query: AutonomyDialQuery): Promise<AgentAutopilotPolicy | null>;
}

/** Editable question fields (catalog admin). */
export interface QuestionInput {
  key: string;
  prompt: string;
  helpText: string | null;
  responseType: string;
  options: string[] | null;
  dimension: string | null;
  ordinal: number;
  required: boolean;
  active: boolean;
}
export interface QuestionEditable extends QuestionInput {
  id: string;
}

/** One answer to persist (typed columns; only the relevant one is set). */
export interface AnswerInput {
  questionId: string;
  valueText: string | null;
  valueNumber: string | null; // numeric as string from the form, or null
  valueBool: boolean | null;
  valueJson: unknown | null;
  valueDate: string | null;
  answeredByContactId: string | null;
  /** Provenance (ADR-0027). Defaults to human/confirmed when omitted. */
  source?: string; // human|agent|automation
  confidence?: string | null; // numeric as string, agent/automation only
  status?: string; // draft|confirmed|rejected
}

/** Editable discovery-call fields (answers saved separately via saveAnswers). */
export interface DiscoveryCallInput {
  accountId: string;
  opportunityId: string | null;
  contactId: string | null;
  templateId: string | null;
  status: string; // scheduled|completed|cancelled
  heldAt: string | null;
  verdict: string | null; // fit|not_fit|nurture
  verdictReason: string | null;
  nextStep: string | null;
  sbrCadence: string | null;
}

/** One re-benchmarked dimension score at an SBR. */
export interface SbrScoreInput {
  dimension: string;
  rating: string | null;
  note: string | null;
}

/** Editable Strategic Business Review fields. */
export interface SbrInput {
  accountId: string;
  contactId: string | null;
  benchmarkAssessmentId: string | null;
  reviewDate: string; // yyyy-mm-dd
  periodLabel: string | null;
  status: string; // scheduled|completed
  concerns: string | null;
  summary: string | null;
  nextActions: string | null;
}

/** Spawn a downstream opportunity from an engagement (provenance set). */
export interface SpawnOpportunityInput {
  accountId: string;
  name: string;
  salesStage: string;
  amountMrr: string | null;
  sourceDiscoveryId: string | null;
  sourceAssessmentId: string | null;
  sourceSbrId: string | null;
}

/** Spawn a downstream delivery project from an engagement (provenance set). */
export interface SpawnProjectInput {
  accountId: string;
  name: string;
  type: string;
  sourceAssessmentId: string | null;
  sourceSbrId: string | null;
}

/** Spawn a downstream ticket from an engagement (provenance set). */
export interface SpawnTicketInput {
  accountId: string;
  title: string;
  sourceAssessmentId: string | null;
  sourceSbrId: string | null;
}

/**
 * Engagement layer (ADR-0023): editable questionnaires, account-scoped discovery
 * calls and Strategic Business Reviews, and read access to assessment artifacts and
 * tickets. Answers are stored once (engagement_answer) and never duplicated.
 */
export interface EngagementsRepository {
  /** Active question set (active questions only) for an engagement kind. */
  getQuestions(kind: string): Promise<QuestionRow[]>;

  // Question catalog admin (editable questionnaires)
  /** The active template for a kind, or null if none exists yet. */
  getActiveTemplate(kind: string): Promise<QuestionTemplateRow | null>;
  /** All questions (active + inactive) of the active template, for editing. */
  listQuestionsForEditor(kind: string): Promise<QuestionRow[]>;
  getQuestion(id: string): Promise<QuestionEditable | null>;
  /** Add a question to the active template for a kind (creating v1 if needed). */
  createQuestion(kind: string, input: QuestionInput): Promise<void>;
  updateQuestion(id: string, input: QuestionInput): Promise<void>;

  // Assessment templates (migration 0040 — a question can belong to many templates)
  /** All question/assessment templates. */
  listTemplates(): Promise<QuestionTemplateRow[]>;
  /** Create a new assessment template for a kind (next version); returns its id. */
  createTemplate(kind: string, title: string): Promise<string>;
  /** Template ids a question currently belongs to (the many-to-many). */
  getQuestionTemplateIds(questionId: string): Promise<string[]>;
  /** Replace the set of templates a question belongs to. */
  setQuestionTemplates(questionId: string, templateIds: string[]): Promise<void>;

  // Discovery calls
  listDiscoveryCalls(): Promise<DiscoveryCallRow[]>;
  getDiscoveryCall(id: string): Promise<DiscoveryCallDetail | null>;
  createDiscoveryCall(input: DiscoveryCallInput): Promise<string>;
  updateDiscoveryCall(id: string, input: DiscoveryCallInput): Promise<void>;
  deleteDiscoveryCall(id: string): Promise<void>;

  // Strategic Business Reviews
  listSbrs(): Promise<SbrRow[]>;
  getSbr(id: string): Promise<SbrDetail | null>;
  createSbr(input: SbrInput): Promise<string>;
  updateSbr(id: string, input: SbrInput): Promise<void>;
  deleteSbr(id: string): Promise<void>;

  /** Upsert answers for an engagement ('discovery' | 'assessment'). */
  saveAnswers(engagementType: string, engagementId: string, answers: AnswerInput[]): Promise<void>;

  /** Answers with provenance for the pre-discovery review (agent drafts, ADR-0027). */
  listAnswersForReview(engagementType: string, engagementId: string): Promise<AnswerReviewRow[]>;
  /** Confirm an agent/automation-drafted answer (human stamp of approval, ADR-0027). */
  confirmAnswer(answerId: string, userId: string | null): Promise<void>;
  /** Reject an agent/automation-drafted answer. */
  rejectAnswer(answerId: string, userId: string | null): Promise<void>;

  /** Upsert the six re-benchmarked dimension scores for an SBR. */
  saveSbrScores(sbrId: string, scores: SbrScoreInput[]): Promise<void>;

  /** Replace the set of tickets referenced by an SBR. */
  setSbrTickets(sbrId: string, ticketIds: string[]): Promise<void>;

  // Read-only feeds
  listAssessmentArtifacts(assessmentId: string): Promise<ArtifactRow[]>;
  listTickets(filter?: TicketFilter): Promise<TicketRow[]>;
  /** One synced ticket by its Autotask ref — the task's ticket history (#98). */
  getTicketByRef(externalRef: string): Promise<TicketRow | null>;
  /** Distinct status/priority values present in the data, for the filter selects. */
  ticketFilterOptions(): Promise<TicketFilterOptions>;
  /**
   * SLA-breach projection rows over silver `ticket` (the `ticket_sla_breach` view,
   * migration 0118, ADR-0074 §2). Read-only; drives omnichannel-queue priority (§6,
   * #671) and the SLA worklist. Mock fallback = `[]`.
   */
  listTicketSlaBreaches(): Promise<TicketSlaBreachRow[]>;

  // Saved list views (ADR-0046) — personal + company-shared filter sets.
  listSavedViews(entityType: string, viewerEmail: string | null): Promise<SavedViewRow[]>;
  /** Upserts by (owner, entity, name); making it default clears the previous default. */
  createSavedView(input: SavedViewInput, ownerEmail: string): Promise<void>;
  /**
   * Rename and/or (un)set-default an EXISTING view (#92). Owner-only — enforced in
   * the write itself, never by trusting the caller. Setting default clears the
   * owner's previous default for the entity type first.
   */
  updateSavedView(
    id: string,
    patch: { name?: string; isDefault?: boolean },
    ownerEmail: string,
  ): Promise<void>;
  /** Owners delete their own views; admins may delete any (shared cleanup). */
  deleteSavedView(id: string, ownerEmail: string | null, asAdmin: boolean): Promise<void>;

  /** Contracts from Autotask bronze, joined to their account (migrations 0038/0040). */
  listContracts(): Promise<ContractRow[]>;

  // Provenance: spawn downstream records that point back to the engagement
  spawnOpportunity(input: SpawnOpportunityInput): Promise<void>;
  spawnProject(input: SpawnProjectInput): Promise<void>;
  spawnTicket(input: SpawnTicketInput): Promise<void>;
}

// ── Ticket board filters + saved views (ADR-0046) ───────────────────────────

/** Filters for the Tickets board. All optional; combined with AND. */
export interface TicketFilter {
  status?: string;
  priority?: string;
  accountId?: string;
  /**
   * Autotask queue (#219, migration 0074) — the raw queue_id picklist value as
   * text; label lookup is deferred polish (see the migration header).
   */
  queue?: string;
  /** Only tickets opened within the last N days. */
  openedWithinDays?: number;
}

/** Distinct values present in the data, to populate the filter selects. */
export interface TicketFilterOptions {
  statuses: string[];
  priorities: string[];
  /** Distinct `ticket.queue` values (raw Autotask queue ids — #219). */
  queues: string[];
}

/** A saved list view: a named filter set, personal or company-shared. */
export interface SavedViewRow {
  id: string;
  entityType: string; // 'ticket' first; tasks/devices later
  name: string;
  owner: string | null; // creator display name
  isMine: boolean;
  isShared: boolean;
  isDefault: boolean;
  filters: Record<string, string>;
}

export interface SavedViewInput {
  entityType: string;
  name: string;
  isShared: boolean;
  isDefault: boolean;
  filters: Record<string, string>;
}

/** Read-only analytics for the Reporting page (aggregates over the spine). */
export interface ReportsRepository {
  /** Headline figures (active MRR, open pipeline, win rate, avg time-to-live). */
  getSummary(): Promise<ReportSummary>;
  /** Open opportunities by sales stage, with count and total MRR. */
  pipelineByStage(): Promise<StageValueDatum[]>;
  /** Proposals grouped by status. */
  proposalsByStatus(): Promise<CountDatum[]>;
  /** Delivery projects grouped by status. */
  projectsByStatus(): Promise<CountDatum[]>;
  /** One-time assessment fees vs recurring managed-services MRR. */
  revenueSplit(): Promise<RevenueSplit>;
  /** Assessment → managed-services conversion. */
  assessmentConversion(): Promise<AssessmentConversion>;
  /** Average SBR re-benchmark score (1–4) per dimension. */
  sbrDimensionAverages(): Promise<CountDatum[]>;
  /** Marketing & Social BI-hub section: leads by source, organic social, campaign rollup (ADR-0062). */
  marketingSocial(): Promise<MarketingSocialReport>;
  /** Service Desk BI-hub section: ticket distributions, opened trend, Defender links (ADR-0062). */
  serviceDesk(): Promise<ServiceDeskReport>;
  /** Security Fleet BI-hub section: cross-tenant posture/MFA/Defender/Intune rollup (ADR-0062). */
  securityFleet(): Promise<SecurityFleetReport>;
  /**
   * Time Efficiency BI-hub section (ADR-0082, #467): utilization (comp-free) plus
   * aggregate labor cost. Pass `includeLaborCost=true` ONLY for finance|admin
   * callers — when false the comp query never runs and `laborCost` is `null`.
   */
  timeEfficiency(includeLaborCost: boolean): Promise<TimeEfficiencyReport>;
}

// ── Communications (ADR-0011) ────────────────────────────────────────────────

/** Filter for the cross-contact communications feed. */
export interface InteractionFilter {
  contactId?: string;
  accountId?: string;
  source?: string;
  kind?: string;
  /** Interactions attached to one project via interaction.project_id (ADR-0052 §5). */
  projectId?: string;
  /** Only interactions with NO project linkage — sales meetings (ADR-0052 §6). */
  noProject?: boolean;
  limit?: number;
}

/** A new timeline entry (e.g. logging a stubbed outbound send). */
export interface InteractionInput {
  accountId: string | null;
  contactId: string | null;
  source: string;
  kind: string;
  direction: string; // inbound|outbound|internal
  subject: string | null;
  body: string | null; // stored as summary_gold for the scaffold
}

/**
 * A manually logged meeting (ADR-0052 §5, #97): writes `interaction`
 * (source 'meeting', kind 'meeting') + its 1:1 `meeting` silver row
 * (platform 'other') in one transaction. Attach to a project via projectId
 * (project meetings) or to opportunity/account/contact (sales meetings) —
 * never both shapes at once by convention, not constraint.
 */
export interface MeetingCreateInput {
  accountId: string | null;
  contactId: string | null;
  opportunityId: string | null;
  projectId: string | null;
  title: string;
  occurredAt: string | null; // yyyy-mm-dd or null (defaults to now)
  notes: string | null; // stored as summary_gold
}

/**
 * Communications repository (ADR-0011): the universal multi-channel timeline plus
 * meeting action items. Reads are "gold" (agent-ready); createInteraction logs an
 * entry to the timeline (the actual provider send is stubbed in this phase).
 */
export interface CommsRepository {
  listInteractions(filter: InteractionFilter): Promise<InteractionRow[]>;
  listInteractionsByContact(contactId: string): Promise<InteractionRow[]>;
  listInteractionsByAccount(accountId: string): Promise<InteractionRow[]>;
  /** One communication with its meeting detail + action items (drill-down). */
  getInteraction(id: string): Promise<CommunicationDetail | null>;
  createInteraction(input: InteractionInput): Promise<void>;
  /** Manually log a meeting: interaction + meeting silver row (ADR-0052 §5). */
  createMeeting(input: MeetingCreateInput): Promise<void>;
  listActionItems(contactId?: string): Promise<ActionItemRow[]>;
  completeActionItem(id: string): Promise<void>;
}

// ── Contacts 360 & enrichment (ADR-0025) ─────────────────────────────────────

/** Editable contact fields (create/update forms). */
export interface ContactInput {
  accountId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  headline: string | null;
  location: string | null;
  lifecycleStatus: string; // stranger|known|engaged|customer
}
export interface ContactEditable extends ContactInput {
  id: string;
}

/** A new enrichment fact (lawful basis required, ADR-0025). */
export interface EnrichmentInput {
  contactId: string;
  attributeKey: string;
  value: string | null;
  confidence: string | null; // numeric as string, or null
  source: string | null;
  lawfulBasis: string; // consent|legitimate_interest|contract|public_data
}

/** Contacts repository: profile, CRUD, social identities, enrichment dossier. */
export interface ContactsRepository {
  getProfile(id: string): Promise<ContactProfile | null>;
  getContact(id: string): Promise<ContactEditable | null>;
  createContact(input: ContactInput): Promise<string>;
  updateContact(id: string, input: ContactInput): Promise<void>;
  deleteContact(id: string): Promise<void>;
  listSocialIdentities(contactId: string): Promise<SocialIdentityRow[]>;
  listEnrichment(contactId: string): Promise<EnrichmentFactRow[]>;
  addEnrichment(input: EnrichmentInput): Promise<void>;
  /** Per-source bronze rows that fed this contact's unified record (ADR-0032). */
  listContactSources(contactId: string): Promise<ContactSourceRow[]>;

  /**
   * Related local-pipeline bronze for this contact (Autotask tickets, IT Glue contact doc) —
   * citations for drill-down troubleshooting (migration 0039).
   */
  listContactRelatedBronze(contactId: string): Promise<ContactSourceRow[]>;

  /**
   * Directory groups this contact belongs to — bronze `m365_groups` joined
   * through `m365_group_members` on the contact's Entra user object id
   * (migration 0079, #257). Empty until the local-pipeline collector runs.
   */
  listDirectoryGroups(contactId: string): Promise<DirectoryGroupRow[]>;
}

// ── Consent (ADR-0014) ───────────────────────────────────────────────────────

/** A new consent event (append-only). */
export interface ConsentEventInput {
  contactId: string;
  channel: string;
  state: string; // opt_in|opt_out
  lawfulBasis: string;
  source: string | null;
}

/** Consent repository: the append-only ledger + derived current state + gates. */
export interface ConsentRepository {
  listConsent(contactId: string): Promise<ConsentEventRow[]>;
  currentConsent(contactId: string): Promise<CurrentConsentRow[]>;
  recordConsentEvent(input: ConsentEventInput): Promise<void>;
  /** True when the latest event for (contact, channel) is opt_in. */
  canSend(contactId: string, channel: string): Promise<boolean>;
  /** True when ad_targeting consent is current. */
  canUseForAds(contactId: string): Promise<boolean>;
}

// ── Connections (ADR-0012/0024) ──────────────────────────────────────────────

/** Connect an external account. OAuth is stubbed in this phase (creates a row). */
export interface ConnectionInput {
  scope: string; // user|company
  ownerEmail: string | null; // signed-in employee's email (resolved to app_user)
  provider: string;
  displayName: string | null;
  scopes: string[];
}

/**
 * Upsert a company-wide credential (ADR-0036). The secret itself is written to
 * Key Vault by the backend — this records only the reference + metadata. Keyed by
 * provider for company scope, so re-saving rotates rather than duplicates.
 */
export interface CompanyCredentialInput {
  provider: string;
  displayName: string | null;
  scopes: string[];
  keyvaultSecretRef: string | null; // reference only — never the secret
  status: string; // active|pending|error|expired|revoked
}

/** Connections repository: per-user personal + company-wide, and the identity map. */
export interface ConnectionsRepository {
  /** Personal connections for the signed-in employee, resolved by email (ADR-0024). */
  listUserConnections(userEmail: string): Promise<ConnectionRow[]>;
  listCompanyConnections(): Promise<ConnectionRow[]>;
  connect(input: ConnectionInput): Promise<void>;
  /** Upsert a company-wide credential by provider (ADR-0036). */
  saveCompanyCredential(input: CompanyCredentialInput): Promise<void>;
  /** Set how often (minutes) the pipeline polls a connection; 0 = manual/paused (ADR-0038). */
  setPollInterval(id: string, minutes: number): Promise<void>;
  disconnect(id: string): Promise<void>;
  listExternalIdentities(accountId: string): Promise<ExternalIdentityRow[]>;
}

// ── Events (ADR-0053): first-class objects campaigns promote ─────────────────

/** Editable event fields (the webinar/live-event builders). */
export interface EventInput {
  kind: string; // webinar|live_event
  name: string;
  description: string | null;
  status: string; // draft|scheduled|live|completed|canceled
  startsAt: string | null; // datetime-local string
  endsAt: string | null;
  timezone: string | null;
  capacity: number | null;
  joinUrl: string | null; // Teams link (webinar)
  location: string | null; // venue (live_event)
  registrationHeadline: string | null; // → registration_page jsonb
  registrationBlurb: string | null;
  /** Workflow registrants auto-enroll into on resolution (ADR-0053 §4, #112). */
  workflowId: string | null;
}

/** Events repository: list/detail with derived funnel counts, builder writes. */
export interface EventsRepository {
  listEvents(): Promise<EventRow[]>;
  getEvent(id: string): Promise<EventDetail | null>;
  createEvent(input: EventInput): Promise<string>;
  updateEvent(id: string, input: EventInput): Promise<void>;
  /** Signups for the record page (derived funnel comes from these rows). */
  listRegistrations(eventId: string): Promise<EventRegistrationRow[]>;
  /** Record attendance post-event (attended | no_show) or check a walk-in in. */
  setRegistrationStatus(registrationId: string, status: string, checkIn: boolean): Promise<void>;
}

// ── Demand generation (ADR-0012/0026) ────────────────────────────────────────

/** Editable campaign fields. */
export interface CampaignInput {
  name: string;
  platform: string;
  objective: string | null;
  status: string;
  budget: string | null; // numeric as string or null
  startAt: string | null;
  endAt: string | null;
  /** Event this campaign promotes (ADR-0053 §1; enables event-relative sends). */
  eventId: string | null;
  /** Workflow campaign-attributed responders auto-enroll into (ADR-0053 §4, #112). */
  workflowId: string | null;
}

/** One schedulable blast (ADR-0053 §4): draft, or exactly one schedule grain. */
export interface CampaignSendInput {
  channel: string; // email|sms
  recipientScope: string; // audience|event_registrants
  audienceId: string | null; // required when scope=audience
  /** Typed template: email {subject, bodyMarkdown, mergeFields[]} / sms {text}. */
  subject: string | null;
  bodyMarkdown: string | null;
  smsText: string | null;
  sendAt: string | null; // absolute schedule (datetime-local)
  eventOffsetMinutes: number | null; // relative to the linked event's start
  /** false = save as draft; true = scheduled (needs exactly one schedule field). */
  schedule: boolean;
}

/** One enrichment-attribute criterion for an audience (contains-match on value). */
export interface AudienceCriterion {
  key: string; // contact_enrichment.attribute_key
  value: string; // matched with ILIKE %value%
}

/** Editable audience fields. `criteria` builds the definition and the member set. */
export interface AudienceInput {
  name: string;
  description: string | null;
  kind: string; // static|dynamic
  criteria: AudienceCriterion[];
}

/** Typed ad creative (ADR-0053 §3): the structured shape persisted in `ad.creative`. */
export interface AdCreativeInput {
  headline: string;
  body: string | null;
  imageRef: string | null; // asset reference (URL/path); upload pipeline is backend work
  cta: string | null; // e.g. "Learn more"
  landingUrl: string | null;
  utm: string | null; // e.g. utm_campaign=q3-webinar
  /** Audience the ad targets (consent-eligible members only, ADR-0026). */
  audienceId: string | null;
}

/** Editable ad fields (an ad belongs to a campaign). */
export interface AdInput {
  name: string;
  status: string; // draft|active|paused|completed
  creative: AdCreativeInput | null; // typed shape (legacy rows carry {copy})
}

/** Demand-gen repository: campaigns/ads/metrics and audiences over profiles. */
export interface CampaignsRepository {
  listCampaigns(): Promise<CampaignRow[]>;
  getCampaign(id: string): Promise<CampaignDetail | null>;
  createCampaign(input: CampaignInput): Promise<void>;
  createAd(campaignId: string, input: AdInput): Promise<void>;
  listAudiences(): Promise<AudienceRow[]>;
  getAudienceMembers(id: string): Promise<AudienceMemberRow[]>;
  /** Create an audience and materialize its members from the criteria. */
  createAudience(input: AudienceInput): Promise<void>;
  /** Preview who a set of criteria would include (ad eligibility flagged). */
  previewAudienceMembers(criteria: AudienceCriterion[]): Promise<AudienceMemberRow[]>;
  /** Launch ads against an audience — consent-gated stub; returns # eligible. */
  launchAudience(id: string): Promise<number>;

  // ── Campaign Sends (ADR-0053 §4 — schedule only; the backend executor fires) ──
  listSends(campaignId: string): Promise<CampaignSendRow[]>;
  createSend(campaignId: string, input: CampaignSendInput): Promise<void>;
  /** Cancel a draft/scheduled send (sent/sending are immutable history). */
  cancelSend(sendId: string): Promise<void>;
}

// ── Lead-capture hooks (ADR-0024) ────────────────────────────────────────────

/** Editable lead-hook fields. */
export interface LeadHookInput {
  name: string;
  kind: string;
  active: boolean;
  config: unknown | null;
}

/** Leads repository: capture hooks and the inbound capture inbox. */
export interface LeadsRepository {
  listHooks(): Promise<LeadHookRow[]>;
  createHook(input: LeadHookInput): Promise<void>;
  listCaptureEvents(): Promise<LeadCaptureEventRow[]>;
  /** Resolve a capture into a contact (starts a profile); returns the contact id. */
  resolveEvent(eventId: string): Promise<string>;
}

// ── Automation workflows (ADR-0014/0027) ─────────────────────────────────────

/** Editable workflow fields. */
export interface WorkflowInput {
  name: string;
  kind: string; // nurture|pre_discovery|re_engagement
  status: string; // active|paused|archived
  trigger: string | null; // free-text description for the scaffold
}

/** One step to append to a workflow. */
export interface WorkflowStepInput {
  kind: string; // send_email|send_sms|chat_prompt|agent_enrich|wait|branch
  config: string | null; // free-text config for the scaffold
}

/** Workflows repository: nurture + pre-discovery sequences and enrollments. */
export interface WorkflowsRepository {
  listWorkflows(): Promise<WorkflowRow[]>;
  getWorkflow(id: string): Promise<WorkflowDetail | null>;
  createWorkflow(input: WorkflowInput): Promise<string>;
  /** Append a step at the next ordinal. */
  addStep(workflowId: string, input: WorkflowStepInput): Promise<void>;
  deleteStep(stepId: string): Promise<void>;
  listEnrollments(): Promise<EnrollmentRow[]>;
  /** Enroll a contact in a workflow (e.g. a not-fit discovery → nurture). */
  enroll(workflowId: string, contactId: string, accountId: string | null): Promise<void>;
  exitEnrollment(enrollmentId: string): Promise<void>;
  // ── Marketing journeys (ADR-0073, #397) — read-only over the same substrate ──
  /** Journeys = workflow rows with kind='journey'; steps live in workflow.definition. */
  listJourneys(): Promise<JourneyRow[]>;
  /** One journey with its parsed definition (lib/journey.ts). null if not a journey. */
  getJourney(id: string): Promise<JourneyDetail | null>;
  // ── Marketing journey BUILDER (ADR-0073, #399) — authors the SINGLE object ──
  /** Create an empty journey (workflow kind='journey'); returns its id. */
  createJourney(name: string): Promise<string>;
  /** Persist a journey's whole definition + name/status onto the workflow row. */
  saveJourney(id: string, input: JourneyInput): Promise<void>;
}

// ── Knowledge search & security posture ──────────────────────────────────────

/** Knowledge repository: search over the gold layer (summaries, dossier, contacts). */
export interface KnowledgeRepository {
  search(query: string): Promise<KnowledgeHit[]>;
}

/** Security repository: the read-only compliance/posture dashboard + Tenant Mapping (ADR-0051). */
export interface SecurityRepository {
  getPosture(): Promise<SecurityPosture>;

  /** Tenant Mappings (tenant GUID → account), joined to the account name. */
  listTenantMappings(): Promise<TenantMapping[]>;
  /** The Tenant Mappings owned by one account — drives the account page's posture surfaces. */
  listTenantMappingsForAccount(accountId: string): Promise<TenantMapping[]>;
  /** Create or repoint a Tenant Mapping (tenant_id is the PK — one account per tenant). */
  upsertTenantMapping(input: { tenantId: string; accountId: string; displayName: string | null }): Promise<void>;
  deleteTenantMapping(tenantId: string): Promise<void>;
  /** Tenant GUIDs present in posture bronze with no mapping — surfaced, never hidden (ADR-0051). */
  listUnmappedTenants(): Promise<UnmappedTenant[]>;

  // ── Account-scoped posture reads (#93 — all keyed through account_tenant) ──
  /** Every mapped Customer Tenant with its tenant_posture rollup (LEFT JOIN — unrefreshed tenants still surface). */
  listTenantPostureForAccount(accountId: string): Promise<TenantPostureRollup[]>;
  /** posture_policy classification rows for the account's mapped tenants (ADR-0051 §3). */
  listPosturePoliciesForAccount(accountId: string): Promise<PosturePolicyRow[]>;
  /** Bronze secure-score control profiles for the drill-down (deprecated controls filtered). */
  listSecureScoreControlsForAccount(accountId: string): Promise<SecureScoreControl[]>;
  /** Silver credential_exposure rows owned by the account (ADR-0040 domain match). */
  listCredentialExposuresForAccount(accountId: string): Promise<CredentialExposureRow[]>;
  /** Open/total Defender incidents over the account's mapped tenants (#256, ADR-0059 badge). */
  countDefenderIncidentsForAccount(accountId: string): Promise<DefenderIncidentCounts>;
  /** MFA-registered/total users over the account's mapped tenants (#258 badge). */
  countMfaRegistrationForAccount(accountId: string): Promise<MfaRegistrationCounts>;
  /** SharePoint site inventory over the account's mapped tenants (#255 — site metadata only, never file content). */
  listSharePointSitesForAccount(accountId: string): Promise<SharePointSiteRow[]>;
  /** Per-domain DNS posture rollup over the account's mapped tenants (#308, ADR-0063 — verdict + drift counts). */
  listDnsDomainsForAccount(accountId: string): Promise<DnsDomainRollup[]>;
  /** Record-level DNS drift detail for the account's tracked domains (#576, ADR-0063 §3 — observed vs golden, classified). */
  listDnsRecordDriftForAccount(accountId: string): Promise<DnsRecordDrift[]>;
}

/** A new comment on a work object (task/project/milestone). */
export interface WorkCommentInput {
  parentType: WorkParentType;
  parentId: string;
  authorUserId: string | null;
  body: string;
}

/**
 * Work collaboration repository (ADR-0064 A1): polymorphic comments + the
 * unified activity feed (comments interleaved with audit_log events) over any
 * work object. Authorization is enforced in the calling server action
 * (`delivery:write`); the repo trusts the resolved author id it is handed.
 */
export interface WorkRepository {
  /** Live (non-deleted) comments on one work object, oldest-first for thread display. */
  listComments(parentType: WorkParentType, parentId: string): Promise<WorkComment[]>;
  /**
   * The activity feed for one work object — comments + audit events interleaved,
   * newest-first, paginated. `commentsOnly` filters out system events (A1 filter).
   */
  listActivity(
    parentType: WorkParentType,
    parentId: string,
    opts?: { commentsOnly?: boolean; limit?: number; offset?: number },
  ): Promise<WorkActivityEntry[]>;
  /** Users that can be @mentioned (ADR-0064 A2): the typeahead candidate set. */
  listMentionableUsers(): Promise<MentionableUser[]>;
  /**
   * Post a comment; returns the created row. @mentions in the body (ADR-0064 A2,
   * #331) are parsed, persisted to comment_mention, and a `comment.mentioned`
   * audit event is emitted per mention (the notification surface) — all inside
   * the insert's transaction. The returned row carries the resolved `mentions`.
   */
  addComment(input: WorkCommentInput): Promise<WorkComment>;
  /**
   * Edit a comment's body in place (sets edited_at). Scoped to the author unless
   * `asAdmin` (ADR-0064: edit own, admins any). Re-parses @mentions and reconciles
   * comment_mention (adds new, drops removed; idempotent on the unique constraint).
   * Returns the updated row with its resolved `mentions`, or null if not found /
   * not permitted.
   */
  editComment(
    id: string,
    body: string,
    editorUserId: string | null,
    asAdmin: boolean,
  ): Promise<WorkComment | null>;
  /**
   * Soft-delete a comment (sets deleted_at) and write an audit_log record so the
   * feed retains the deletion (ADR-0064 NFR-2 / acceptance). Scoped to the author
   * unless `asAdmin`. Returns true if a row was deleted.
   */
  deleteComment(id: string, actorUserId: string | null, asAdmin: boolean): Promise<boolean>;
  /**
   * Emit a system activity event onto a work object's feed (ADR-0064 A1, #438).
   * Writes an `audit_log` row whose (entity_type, entity_id) map onto
   * (parent_type, parent_id) in the `work_activity_feed` view, so the event
   * surfaces in the object's Activity tab alongside comments. No new schema — it
   * reuses the merged A1 mechanism. `detail` is an opaque jsonb payload (e.g.
   * `{ from, to }` for a status move). The caller resolves and supplies the actor.
   */
  emitWorkEvent(input: WorkEventInput): Promise<void>;
}

/** A system activity event to record on a work object's feed (ADR-0064 A1, #438). */
export interface WorkEventInput {
  parentType: WorkParentType;
  parentId: string;
  actorUserId: string | null;
  /** Dotted event name, e.g. `task.status_changed` — rendered in the feed. */
  action: string;
  /** Opaque jsonb payload describing the change (e.g. `{ from, to }`). */
  detail?: Record<string, unknown>;
}

/**
 * Metadata for a file the backend has already placed in Azure Blob (ADR-0064 A4).
 * The GUI never touches blob storage (ADR-0042): the upload-to-blob + the type
 * allowlist / size cap / AV-scan hook are backend processes. This is what the GUI
 * records once the backend hands back the opaque `storageRef`.
 */
export interface WorkAttachmentInput {
  parentType: WorkParentType;
  parentId: string;
  storageRef: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedByUserId: string | null;
}

/**
 * Work attachments repository (ADR-0064 A4, #333): polymorphic file-attachment
 * metadata over any work object. File bytes live in Azure Blob — this stores only
 * metadata + the opaque `storage_ref` the backend mints short-lived per-request
 * SAS against (no public URL, no SAS at rest). Authorization is enforced in the
 * calling server action (`delivery:write`); removal is author/admin-scoped in SQL
 * and writes an `attachment.removed` audit event so the activity feed retains it.
 */
export interface AttachmentRepository {
  /** Live (non-deleted) attachments on one work object, newest-first for the list. */
  listAttachments(parentType: WorkParentType, parentId: string): Promise<WorkAttachment[]>;
  /** Record an attachment the backend has placed in blob; returns the created row. */
  addAttachment(input: WorkAttachmentInput): Promise<WorkAttachment>;
  /**
   * Soft-delete an attachment (sets deleted_at) and write an `attachment.removed`
   * audit_log record so the feed retains the removal (acceptance: removal audited +
   * emits an activity event). Scoped to the uploader unless `asAdmin`. Returns true
   * if a row was removed.
   */
  removeAttachment(id: string, actorUserId: string | null, asAdmin: boolean): Promise<boolean>;
}

/**
 * A work event to fan out as notifications (ADR-0064 A3, #332). The recipients are
 * passed separately to {@link NotificationRepository.dispatch}; this carries the
 * shared event context written onto every recipient's row.
 */
export interface NotificationInput {
  kind: NotificationKind;
  parentType: WorkParentType;
  parentId: string;
  /** Who triggered it (app_user.id), or null for a system event (e.g. due_soon). */
  actorUserId: string | null;
  /** Pre-rendered render context (title + actor name) — no client PII. */
  payload: Record<string, unknown>;
}

/**
 * Notifications repository (ADR-0064 A3, #332): the in-app notification centre
 * (the bell) over the `notification` table. The bell reads here directly
 * (ADR-0042 — DB reads for rendering are fine); the OUTBOUND fan-out to
 * email/Teams via Power Automate and the scheduled due-soon/overdue evaluation
 * are BACKEND processes (the FE holds no provider key). `dispatch` is called from
 * the existing in-transaction work-event paths (assignment / mention / comment) to
 * fan a notification out to the recipients (watchers/assignees), honouring an
 * explicit in-app mute in `notification_pref`.
 */
export interface NotificationRepository {
  /**
   * A user's notifications, newest-first, paginated (the bell list). `unreadOnly`
   * trims to the unread set. `recipientUserId` is the resolved app_user id.
   */
  listForUser(
    recipientUserId: string,
    opts?: { unreadOnly?: boolean; limit?: number },
  ): Promise<Notification[]>;
  /** Unread count for the bell badge. */
  unreadCount(recipientUserId: string): Promise<number>;
  /** Mark one notification read (scoped to the recipient). Returns true if updated. */
  markRead(id: string, recipientUserId: string): Promise<boolean>;
  /** Mark every unread notification read for a user (the "mark all read" action). */
  markAllRead(recipientUserId: string): Promise<void>;
  /**
   * Fan a work event out to its recipients. `recipientUserIds` are the people on
   * the object (watchers/assignees/mentioned); the actor is skipped (never notify
   * yourself) and an in-app-muted kind (notification_pref enabled=false) is
   * suppressed. Idempotency is the caller's concern (one call per event). Safe to
   * call inside a transaction via the optional `client`.
   */
  dispatch(
    input: NotificationInput,
    recipientUserIds: string[],
    client?: Queryable,
  ): Promise<void>;
  /**
   * A user's EXPLICIT notification preferences (ADR-0064 A3, #601) — the rows
   * that override a default. Absence of a (kind × channel) row means "use the
   * default" (in-app ON), so the prefs surface overlays these on the default
   * grid. Scoped to the user's own id (the calling action resolves it).
   */
  listPrefs(userId: string): Promise<NotificationPref[]>;
  /**
   * Set one (kind × channel) preference for a user (ADR-0064 A3, #601). Upsert
   * on the (user_id, kind, channel) PK — `enabled=false` mutes that trigger on
   * that channel; `enabled=true` records an explicit opt-in. The caller gates
   * this to the user's own prefs.
   */
  setPref(
    userId: string,
    kind: NotificationKind,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<void>;
}

/**
 * A minimal query surface so {@link NotificationRepository.dispatch} can run on
 * either the pool or a pooled client inside a transaction (the assignment /
 * comment paths dispatch inside their own BEGIN/COMMIT).
 */
export type Queryable = {
  query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
};

/** A tag to apply to (or remove from) a work object. */
export interface TagApplicationInput {
  tagId: string;
  parentType: TagParentType;
  parentId: string;
}

/**
 * Tags / labels repository (ADR-0065 B6, #340): a global colour-coded tag
 * vocabulary + polymorphic application to work objects (task / project), distinct
 * from `task.category`. Authorization is enforced in the calling server action
 * (`delivery:write`); the repo trusts the resolved ids it is handed.
 */
export interface TagsRepository {
  /** The whole tag vocabulary with usage counts, label-sorted (for management + pickers). */
  listTags(): Promise<Tag[]>;
  /**
   * Find an existing tag by label (case-insensitive) or create it; returns the
   * row. `color` is only used on create. Keeps the vocabulary global (no dupes).
   */
  upsertTag(label: string, color: string, createdBy: string | null): Promise<Tag>;
  /** Rename a tag in place (UPDATE label). Returns the updated row, or null if gone / label collides. */
  renameTag(id: string, label: string): Promise<Tag | null>;
  /**
   * Merge tag `sourceId` into `targetId`: repoint applications (skipping ones that
   * would collide) then delete the source. Returns true if the source existed.
   */
  mergeTags(sourceId: string, targetId: string): Promise<boolean>;
  /** Delete a tag and all its applications (ON DELETE CASCADE). Returns true if a row was removed. */
  deleteTag(id: string): Promise<boolean>;
  /** Tags applied to one work object, label-sorted (for its chips). */
  listTagsFor(parentType: TagParentType, parentId: string): Promise<AppliedTag[]>;
  /**
   * Tags applied across many work objects of one kind, as a map of parentId →
   * applied tags — one read for a whole list view (chips + tag filter).
   */
  listTagsForMany(
    parentType: TagParentType,
    parentIds: string[],
  ): Promise<Record<string, AppliedTag[]>>;
  /** Apply a tag to a work object (idempotent — PK collision is a no-op). */
  applyTag(input: TagApplicationInput): Promise<void>;
  /** Remove a tag from a work object. Returns true if an application was removed. */
  removeTag(input: TagApplicationInput): Promise<boolean>;
}

/** Admin input to create/update a custom-field definition (ADR-0065 B4, #338). */
export interface CustomFieldDefInput {
  scope: CustomFieldParentType;
  /** Narrow a project-scoped field to one project_type; null = every project/task of the scope. */
  projectTypeId: string | null;
  key: string;
  label: string;
  fieldType: CustomFieldType;
  /** Choice list for the select types; ignored (stored []) for the others. */
  options: string[];
  required: boolean;
  ordinal: number;
}

/** Write one custom field's value onto a work object (ADR-0065 B4, #338). */
export interface CustomFieldValueInput {
  fieldId: string;
  parentType: CustomFieldParentType;
  parentId: string;
  /** Decoded value; null clears it. Stored as jsonb keyed by the field's type. */
  value: string | number | boolean | string[] | null;
}

/**
 * Custom fields repository (ADR-0065 B4, #338): admin-definable custom fields on
 * work objects (task / project), optionally scoped to one project_type, plus the
 * polymorphic per-object values. Defining fields is an admin action
 * (`catalog:write`); writing a value is `delivery:write` — both enforced in the
 * calling server action. The repo trusts the resolved ids it is handed.
 */
export interface CustomFieldsRepository {
  /** Every field definition, scope→type→ordinal sorted (the admin management list). */
  listFieldDefs(): Promise<CustomFieldDef[]>;
  /**
   * The field definitions that apply to a (scope, projectTypeId) form — both the
   * type-scoped fields and the global (project_type_id IS NULL) ones — in display
   * order. `projectTypeId` is null for a task form (or a project of unknown type).
   */
  listFieldDefsFor(
    scope: CustomFieldParentType,
    projectTypeId: string | null,
  ): Promise<CustomFieldDef[]>;
  /** Create a field definition; returns the created row (resolved project-type name). */
  createFieldDef(input: CustomFieldDefInput): Promise<CustomFieldDef>;
  /** Update a field definition in place; returns the updated row, or null if gone. */
  updateFieldDef(id: string, input: CustomFieldDefInput): Promise<CustomFieldDef | null>;
  /** Delete a field definition and all its values (ON DELETE CASCADE). True if removed. */
  deleteFieldDef(id: string): Promise<boolean>;
  /**
   * The custom-field values on one work object, with each value's definition
   * denormalised on so the renderer needs one read. Includes fields with no value
   * yet (value null) so the form shows every applicable field.
   */
  listValuesFor(
    parentType: CustomFieldParentType,
    parentId: string,
    projectTypeId: string | null,
  ): Promise<CustomFieldValue[]>;
  /**
   * Upsert one field's value on a work object (idempotent via the PK). A null value
   * deletes the row (clears the field). Returns nothing.
   */
  setValue(input: CustomFieldValueInput): Promise<void>;
  /**
   * Batched read of custom-field values for MANY work objects of one kind at once,
   * as a map parentId → its answered values (ADR-0065 B4-F2, #714). One read for a
   * whole list/board column — `listValuesFor` is per-object and would N+1. Only
   * fields that actually have a value are returned (the column shows what's set, not
   * every definition); honest degradation means an absent parent simply has no entry.
   * `fieldKeys` (optional) narrows to specific field keys so a column read fetches
   * only the displayed fields.
   */
  listValuesForMany(
    parentType: CustomFieldParentType,
    parentIds: string[],
    fieldKeys?: string[],
  ): Promise<Record<string, CustomFieldValueEntry[]>>;
  /**
   * The work objects whose custom field `fieldKey` matches `value`, over the GIN
   * index on `custom_field_value.value` (ADR-0065 B4 acceptance / #714 — "Risk level
   * = High on Implementation projects"). Returns the matching parent ids for the
   * caller to intersect with its already-loaded rows. `op` is `eq` for a scalar
   * match or `contains` for a multi-select array membership test. Scoped to one
   * (scope, projectTypeId) field group so a global and a type-scoped field of the
   * same key don't bleed together; `projectTypeId` null = the global field.
   */
  filterByCustomField(input: CustomFieldFilterInput): Promise<string[]>;
}

/** One answered custom-field value in a batched column read (ADR-0065 B4-F2, #714). */
export interface CustomFieldValueEntry {
  fieldId: string;
  key: string;
  label: string;
  fieldType: CustomFieldType;
  value: string | number | boolean | string[];
}

/** A reporting/list filter over one custom field's value (ADR-0065 B4, #714). */
export interface CustomFieldFilterInput {
  scope: CustomFieldParentType;
  /** Narrow to a project-type-scoped field; null = the global field of this key. */
  projectTypeId: string | null;
  /** The field's stable machine key (e.g. 'risk_level'). */
  fieldKey: string;
  /** `eq` for scalar equality; `contains` for multi-select array membership. */
  op: "eq" | "contains";
  /** The value to match (the decoded scalar a select/text/etc. stores). */
  value: string | number | boolean;
}

// ── Self-serve report builder (ADR-0075, #410) ───────────────────────────────

/**
 * Persistence for the governed self-serve report builder (ADR-0075 §3). Report
 * definitions are generalised saved views (ADR-0046): owner-scoped, private or
 * company-shared, jsonb query shape. Ownership + visibility are enforced exactly
 * like `saved_view` — reads return the viewer's own rows plus shared ones, and
 * mutations are owner-only (the WHERE clause is the enforcement, never trusting
 * the caller). The semantic registry that validates `rootObject`/`fields` lives
 * in code (#409); this layer only stores/serves the saved config. Mock returns
 * sensible empties / an in-memory store.
 */
export interface ReportBuilderRepository {
  /** The viewer's own report definitions plus any shared ones (own first). */
  listReportDefinitions(viewerEmail: string | null): Promise<ReportDefinition[]>;
  /** One report definition by id, visible only if owned or shared. Null otherwise. */
  getReportDefinition(id: string, viewerEmail: string | null): Promise<ReportDefinition | null>;
  /** Create a report definition owned by `ownerEmail`; returns the new id. */
  createReportDefinition(input: ReportDefinitionInput, ownerEmail: string): Promise<string>;
  /** Owner-only update (enforced in the write). No-op for a non-owner id. */
  updateReportDefinition(id: string, input: ReportDefinitionInput, ownerEmail: string): Promise<void>;
  /** Owners delete their own; admins may delete any (shared cleanup). Cascades dashboard tiles. */
  deleteReportDefinition(id: string, ownerEmail: string | null, asAdmin: boolean): Promise<void>;

  /** The viewer's own dashboards plus any shared ones (own first). */
  listDashboards(viewerEmail: string | null): Promise<Dashboard[]>;
  /** One dashboard by id, visible only if owned or shared. Null otherwise. */
  getDashboard(id: string, viewerEmail: string | null): Promise<Dashboard | null>;
  /** Create a dashboard owned by `ownerEmail`; returns the new id. */
  createDashboard(input: DashboardInput, ownerEmail: string): Promise<string>;
  /** Owner-only update (enforced in the write). No-op for a non-owner id. */
  updateDashboard(id: string, input: DashboardInput, ownerEmail: string): Promise<void>;
  /** Owners delete their own; admins may delete any. Cascades its items. */
  deleteDashboard(id: string, ownerEmail: string | null, asAdmin: boolean): Promise<void>;

  /** The tiles on one dashboard, in placement order. */
  listDashboardItems(dashboardId: string): Promise<DashboardItem[]>;
  /** Add a report tile to a dashboard; returns the new item id. */
  addDashboardItem(input: DashboardItemInput): Promise<string>;
  /** Remove a tile by id. */
  removeDashboardItem(id: string): Promise<void>;
  /** Persist a new placement for a tile (reorder/move). */
  reorderDashboardItem(id: string, position: Record<string, unknown>): Promise<void>;
}

/**
 * Connector instances for the integration marketplace (ADR-0076 §2, #414). The connector
 * MANIFEST is in code (`connector-manifest.ts`); this layer stores/serves the per-scope
 * INSTANCE (status, granted scopes, cadence override, health). `connectorKey` is validated
 * against the in-code registry at the app layer (callers use `isKnownConnector`), not by a
 * DB FK. NO secret material — credentials live in backend Key Vault (ADR-0034/0036). Mock
 * returns an in-memory store.
 */
export interface ConnectorRepository {
  /** All connector instances (catalog "connected" view), newest activity first. */
  listConnectorInstances(): Promise<ConnectorInstance[]>;
  /** One instance by id, or null. */
  getConnectorInstance(id: string): Promise<ConnectorInstance | null>;
  /** The instance for a connector in a scope, or null (the "is it enabled here?" lookup). */
  getConnectorInstanceByKey(
    connectorKey: string,
    accountScope: string,
  ): Promise<ConnectorInstance | null>;
  /**
   * Enable a connector: upsert the instance for (connectorKey, accountScope) and set it to
   * 'connecting'. Returns the instance id. Re-enabling updates the existing row (ADR-0076 §3).
   */
  enableConnector(input: ConnectorInstanceInput): Promise<string>;
  /** Advance the lifecycle status (+ optional health blob). Backend-orchestrated (ADR-0042). */
  setConnectorStatus(
    id: string,
    status: ConnectorStatus,
    health?: Record<string, unknown>,
  ): Promise<void>;
  /** Set/clear the per-instance poll-cadence override in minutes (ADR-0038; null = manifest default). */
  setConnectorCadence(id: string, cadenceOverrideMinutes: number | null): Promise<void>;
  /** Disable (remove) a connector instance. */
  disableConnector(id: string): Promise<void>;
}

/**
 * CRM contact segments (ADR-0073 decision 2, migration 0126, #420/#421). A `segment` is
 * a general-purpose contact set — `manual` (static, explicit members) or `rule` (dynamic,
 * a `rule_json` predicate over contact fields). Membership lives in `segment_member`, with
 * `source` (manual | bulk | rule) so a rule recompute can replace only its own rows. Born
 * silver, app system of record (ADR-0042) — the front end authors; processes enroll /
 * recompute. DISTINCT from an ad audience (ADR-0026). Reads degrade to empty/null on
 * schema lag (the migration is dormant until applied). The rule EVALUATOR is a backend /
 * pipeline process; this layer stores the rule and the materialized membership.
 */
export interface SegmentsRepository {
  /** All segments, newest first, each with its live member count. */
  listSegments(): Promise<SegmentSummary[]>;
  /** One segment with its rule definition, or null if missing. */
  getSegment(id: string): Promise<SegmentDetail | null>;
  /** Create a segment owned by `ownerEmail`; returns the new id. */
  createSegment(input: SegmentInput, ownerEmail: string): Promise<string>;
  /** Update a segment's name/description/type/rule. */
  updateSegment(id: string, input: SegmentInput): Promise<void>;
  /** Delete a segment (cascades its membership). */
  deleteSegment(id: string): Promise<void>;

  /** The members of a segment (joined to contact), newest first. */
  listSegmentMembers(segmentId: string): Promise<SegmentMemberRow[]>;
  /**
   * Add contacts to a segment idempotently (UNIQUE(segment_id, contact_id) — re-adding is
   * a no-op). `source` records how they were added (manual | bulk | rule). Returns the
   * number of NEW members added. `addedByEmail` resolves to app_user (null = system).
   */
  addSegmentMembers(
    segmentId: string,
    contactIds: readonly string[],
    source: SegmentMemberSource,
    addedByEmail: string | null,
  ): Promise<number>;
  /** Remove a single member by member-row id. */
  removeSegmentMember(memberId: string): Promise<void>;
}

/** The full set of repositories a request can resolve. */
export interface Repositories {
  dashboard: DashboardRepository;
  crm: CrmRepository;
  agent: AgentRepository;
  reports: ReportsRepository;
  engagements: EngagementsRepository;
  comms: CommsRepository;
  contacts: ContactsRepository;
  consent: ConsentRepository;
  connections: ConnectionsRepository;
  campaigns: CampaignsRepository;
  events: EventsRepository;
  leads: LeadsRepository;
  workflows: WorkflowsRepository;
  knowledge: KnowledgeRepository;
  security: SecurityRepository;
  work: WorkRepository;
  attachments: AttachmentRepository;
  notifications: NotificationRepository;
  tags: TagsRepository;
  customFields: CustomFieldsRepository;
  reportBuilder: ReportBuilderRepository;
  connectors: ConnectorRepository;
  segments: SegmentsRepository;
}
