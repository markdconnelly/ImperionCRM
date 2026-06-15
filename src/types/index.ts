import type { AppRole } from "@/lib/auth/roles";

export type Health = "green" | "amber" | "red";

export type PipelineStage =
  | "Lead"
  | "Qualified"
  | "Proposal"
  | "Onboarding"
  | "Active";

export interface Kpi {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
}

export interface PipelineColumn {
  stage: PipelineStage;
  count: number;
  value: string;
}

export interface Account {
  id: string;
  name: string;
  stage: PipelineStage;
  owner: string;
  mrr: string;
  health: Health;
  note: string;
}

export interface AgentMessage {
  id: string;
  role: "agent" | "user";
  text: string;
}

export interface NavItem {
  key: string;
  label: string;
  icon: string; // lucide-react icon name
  href: string;
}

/** A row in the Pipeline board (an opportunity). */
export interface OpportunityRow {
  id: string;
  name: string;
  account: string;
  stage: string; // sales_stage label
  mrr: string;
}

/** A row in the Contacts list. */
export interface ContactRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  account: string | null; // account name
}

/**
 * The CRM lifecycle axis a contact moves along (ADR-0031). One normalized
 * contact object; Leads = not-yet-client (audience|lead|prospect), Contacts =
 * client. Distinct from the enrichment lifecycle_status.
 */
export type ContactCrmStage = "audience" | "lead" | "prospect" | "client";

/** A contact as shown on the lifecycle Pipeline board and Leads/Contacts lists. */
export interface ContactPipelineRow {
  id: string;
  fullName: string;
  email: string | null;
  account: string | null; // account name
  crmStage: ContactCrmStage;
}

/** A row in the Proposals list. */
export interface ProposalRow {
  id: string;
  title: string;
  opportunity: string; // opportunity name
  account: string; // account name
  status: string; // proposal_status label
  amount: string; // formatted MRR or "—"
  sent: string | null; // formatted sent date
}

/** One scored dimension of an assessment, for the scorecard view. */
export interface AssessmentScore {
  key: string;
  label: string;
  rating: string | null; // assessment_rating or null (not yet scored)
}

/** A row in the Assessments list (AI Security Readiness Assessment). */
export interface AssessmentRow {
  id: string;
  name: string;
  account: string; // account name
  status: string; // assessment_status label
  fee: string; // formatted one-time fee or "—"
  kickoff: string | null; // formatted kickoff date
  scores: AssessmentScore[]; // the six dimensions
}

/** A row in the project board / onboarding project lists. */
export interface ProjectRow {
  id: string;
  name: string;
  account: string; // account name
  opportunity: string | null; // opportunity name
  type: string; // project_type display name
  typeKey: string; // project_type stable key, e.g. 'onboarding'
  owner: string | null; // owning app_user display name
  status: string; // project_status label
  targetLive: string | null; // formatted target go-live date
}

/** A project type — a row in the project_type table, not an enum (ADR-0052). */
export interface ProjectTypeRow {
  id: string;
  key: string; // stable machine key, e.g. 'onboarding'
  name: string;
  description: string | null;
  isProtected: boolean; // protected types (Onboarding) are never deletable
  projectCount: number; // projects of this type (delete is RESTRICTed while > 0)
}

/**
 * A delivery template — a reusable, data-driven provisioning playbook (ADR-0081,
 * migration 0084). Generalizes the onboarding playbook so the board can
 * instantiate ANY won opportunity into a native project + tasks. This is the
 * list/picker summary; the full tree is `DeliveryTemplateDetail`.
 */
export interface DeliveryTemplateRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  version: number;
  projectTypeId: string | null; // optional binding (picker filter); null = any type
  projectTypeName: string | null; // resolved display name, or null
  isActive: boolean;
  phaseCount: number;
  taskCount: number;
}

/** A task within a delivery-template phase, incl. its optional JIT dispatch-ticket spec. */
export interface DeliveryTemplateTask {
  id: string;
  ordinal: number;
  title: string;
  offsetDays: number;
  durationDays: number;
  dispatchesTicket: boolean; // fires an Autotask project-queue ticket (→ task_ticket_fire)
  ticketQueueId: number | null; // Autotask queue (Project Mgmt = 29683483; env config)
  ticketTitle: string | null; // defaults to the task title when null
  ticketLeadDays: number; // JIT window: fire this many days before task start
}

/** A phase of a delivery template — becomes a project_milestone at instantiation. */
export interface DeliveryTemplatePhase {
  id: string;
  ordinal: number;
  name: string;
  offsetDays: number;
  durationDays: number;
  tasks: DeliveryTemplateTask[];
}

/** The full delivery-template tree (template → phases → tasks). */
export interface DeliveryTemplateDetail {
  id: string;
  key: string;
  name: string;
  description: string | null;
  version: number;
  projectTypeId: string | null;
  projectTypeName: string | null;
  isActive: boolean;
  phases: DeliveryTemplatePhase[];
}

/**
 * A project_provisioning row (ADR-0080 §4, migration 0082 + 0084 gate) — the 1:1
 * binding of a native delivery project to its Autotask Project, owning the
 * provisioning idempotency + the hard contract gate. Read-shape; the executor
 * advances provision_state and stamps the Autotask ids.
 */
export interface ProjectProvisioningRow {
  projectId: string;
  sourceKqmQuoteId: string | null; // the won KQM quote that triggered provisioning
  autotaskOpportunityId: number | null; // the won→Autotask seam the quote carried
  autotaskProjectId: number | null; // the Autotask Project once created (else null)
  provisionState: string; // pending|creating|created|failed
  contractState: string; // none|sent|signed — executor refuses until 'signed'
  idempotencyKey: string; // 'imperioncrm-project-{projectId}'
  deliveryTemplateId: string | null; // the template this was instantiated from
}

/**
 * A task_ticket_fire row (ADR-0080 §4/§7, migration 0082) — per-task JIT
 * project-queue ticket fire-state, 1:1 with a dispatching task. Read-shape; the
 * board schedules (none→scheduled) and the executor fires (→fired).
 */
export interface TaskTicketFireRow {
  taskId: string;
  fireState: string; // none|scheduled|fired|failed
  scheduledFor: string | null; // JIT fire date (task start − lead days); null = manual-only
  autotaskQueueId: number | null; // the queue the ticket lands on (env config)
  autotaskTicketId: number | null; // the Autotask Ticket once fired (else null)
  idempotencyKey: string; // 'imperioncrm-taskticket-{taskId}'
}

/** A task's ticket fire lifecycle (ADR-0080 §4/§7): none→scheduled→fired; failed on executor error. */
export type TaskFireState = "none" | "scheduled" | "fired" | "failed";

/**
 * The delivery board's per-task read shape (ADR-0080 §4/§7, #568) — a native
 * task plus its `task_ticket_fire` sidecar (null when the task doesn't dispatch
 * a ticket). The board reads it, schedules a fire (none→scheduled), and surfaces
 * the typed ticket id + last_error the executor stamps.
 */
export interface DeliveryBoardTask {
  taskId: string;
  title: string;
  dueAt: string | null; // task due date (yyyy-mm-dd)
  /** The fire sidecar, or null for a non-dispatching task. */
  fire: {
    fireState: TaskFireState;
    scheduledFor: string | null; // JIT fire datetime; null = manual-only
    autotaskQueueId: number | null; // queue the ticket lands on (env config)
    autotaskTicketId: number | null; // the Autotask Ticket once fired (else null)
    lastError: string | null; // executor error when fireState='failed'
  } | null;
}

/**
 * The delivery board's per-project read shape (ADR-0080 §4/§7, #568) — a
 * provisioned project (its `project_provisioning` state + contract gate) with
 * its dispatching tasks' fire-state. Read-only over the intent plane #566 wrote;
 * the board steers firing by writing intent only (ADR-0042).
 */
export interface DeliveryBoardProject {
  projectId: string;
  name: string;
  account: string;
  provisionState: string; // pending|creating|created|failed
  contractState: string; // none|sent|signed — executor refuses until 'signed'
  autotaskProjectId: number | null; // the Autotask Project once created (else null)
  deliveryTemplateName: string | null; // the template this was instantiated from
  lastError: string | null; // executor provisioning error (when provision_state='failed')
  tasks: DeliveryBoardTask[];
}

// ── Time tracking (ADR-0082, migrations 0085–0087) ──────────────────────────

/** Timesheet lifecycle (ADR-0082): open→submitted(attest)→approved→payroll_approved→paid. */
export type TimesheetState =
  | "open"
  | "submitted"
  | "approved"
  | "payroll_approved"
  | "paid";

/** Time Entry category (ADR-0082): billable→Ancillary Ticket · internal · admin. */
export type TimeEntryCategory = "billable" | "internal" | "admin";

/** Daily Reconciliation verdict (ADR-0082, `time_reconciliation_day`). */
export type ReconciliationVerdict = "balanced" | "under_logged" | "over_logged";

/** A weekly timesheet, list/summary shape. The full week is `TimesheetDetail`. */
export interface TimesheetRow {
  id: string;
  employeeId: string;
  weekStart: string; // yyyy-mm-dd (Monday)
  weekEnd: string; // yyyy-mm-dd (Sunday)
  state: TimesheetState;
  entryCount: number;
  totalMinutes: number; // sum of attendance-block minutes (duration derived)
  attestedAt: string | null; // ISO; set when submitted
}

/** One attendance Time Entry — a start/end block; duration is DERIVED, never typed. */
export interface TimeEntryRow {
  id: string;
  workDate: string; // yyyy-mm-dd
  startedAt: string; // ISO timestamp
  endedAt: string; // ISO timestamp
  minutes: number; // derived duration (ended_at - started_at)
  category: TimeEntryCategory;
  ancillaryTicketRef: string | null; // noted Autotask ticket id (billable)
  notes: string | null;
}

/** Per-day Reconciliation: attended (envelope) vs logged (allocation) + verdict. */
export interface ReconciliationDay {
  workDate: string; // yyyy-mm-dd
  attendedMinutes: number;
  loggedMinutes: number;
  deltaMinutes: number; // logged − attended
  verdict: ReconciliationVerdict;
}

/** The full week: the timesheet + its entries + the memory-jogger reconciliation. */
export interface TimesheetDetail extends TimesheetRow {
  entries: TimeEntryRow[];
  reconciliation: ReconciliationDay[]; // per-day, over the week (seeds the memory-jogger)
  /** Any over-logged day or same-day overlap — Hard deviations that block attestation. */
  hasHardDeviation: boolean;
}

/** A Submitted timesheet in the admin review queue (ADR-0082) — adds the employee name. */
export interface TimesheetReviewRow extends TimesheetRow {
  employeeName: string; // app_user display name (falls back to email)
}

/**
 * A timesheet on the payroll-approval queue (ADR-0082, #466) — every sheet that
 * has cleared admin correctness (Approved) plus the later payroll states, so the
 * CFO sees the whole tail. Read from the comp-free `timesheet_payroll_status`
 * view: approved attendance minutes, lifecycle state, and the matched QuickBooks
 * payment fact (set by backend Payroll Reconciliation, BE #105). NEVER carries
 * Pay Rate or expected pay — the comp math lives in the backend alone.
 */
export interface PayrollTimesheetRow {
  id: string;
  employeeId: string;
  employeeName: string; // app_user display name (falls back to email)
  weekStart: string; // yyyy-mm-dd (Monday)
  weekEnd: string; // yyyy-mm-dd (Sunday)
  state: TimesheetState;
  approvedMinutes: number; // attendance minutes on the sheet (no rate applied)
  payrollApprovedAt: string | null; // ISO; set when the CFO payroll-approves
  paidAt: string | null; // ISO; set when matched to the QuickBooks payment
  qbPaymentRef: string | null; // matched QuickBooks payment id (read-only SoR)
}

/**
 * One timesheet on the unified admin lifecycle surface (ADR-0082, #539) — EVERY
 * sheet across EVERY state and employee, so admins/finance follow the whole
 * lifecycle (open → submitted → approved → payroll_approved → paid) in one
 * filterable, sortable table. Combines the review-queue shape (employee name +
 * attendance) with the payroll-queue shape (approved minutes + the matched payment
 * fact). Comp-free: NEVER carries Pay Rate or expected pay (that math is backend-only).
 */
export interface AdminTimesheetRow {
  id: string;
  employeeId: string;
  employeeName: string; // app_user display name (falls back to email)
  weekStart: string; // yyyy-mm-dd (Monday)
  weekEnd: string; // yyyy-mm-dd (Sunday)
  state: TimesheetState;
  entryCount: number;
  attendedMinutes: number; // sum of attendance-block minutes (duration derived)
  approvedMinutes: number; // approved attendance minutes (0 until Approved)
  attestedAt: string | null; // ISO; set when submitted
  payrollApprovedAt: string | null; // ISO; set when the CFO payroll-approves
  paidAt: string | null; // ISO; set when matched to the QuickBooks payment
  qbPaymentRef: string | null; // matched QuickBooks payment id (read-only SoR)
}

/**
 * The QuickBooks payment match the backend Payroll Reconciliation (BE #105)
 * suggests for one timesheet (ADR-0082 §Reconciliation #2). The backend is the
 * sole reader of Pay Rate; this suggestion crosses the boundary comp-free — only
 * the matched payment fact (employee + period + amount within tolerance). The CFO
 * confirms the suggestion to set the sheet Paid. `matched` is false (and the refs
 * null) when no QuickBooks payment lines up or QBO isn't live in this environment.
 */
export interface PayrollMatchSuggestion {
  timesheetId: string;
  matched: boolean;
  qbPaymentRef: string | null;
  /** ISO date of the matched payment, when one was found. */
  paidAt: string | null;
  /** Human-readable explanation of the match (or why none was found). */
  detail: string;
}

/**
 * Admin review of one Submitted sheet (ADR-0082 #477): the live detail plus the
 * employee's immutable **attested original** (`timesheet.attested_snapshot`), so the
 * approvals surface can diff admin corrections against what was attested. `null` for
 * sheets attested before snapshots existed / never attested.
 */
export interface AdminTimesheetReview extends TimesheetDetail {
  attestedSnapshot: TimeEntryRow[] | null;
}

/**
 * The six time-reconciliation Deviations (ADR-0082; backend ADR-0046). The day-level four
 * are derivable from `time_reconciliation_day`; `overlap` + `temporal_orphan` need row-pair
 * logic, so the full set comes from the backend `POST /orchestration/time-reconciliation`.
 */
export type TimeDeviationType =
  | "over_logged"
  | "overlap"
  | "temporal_orphan"
  | "under_logged_gap"
  | "attended_nothing_logged"
  | "logged_never_attended";

/** Hard deviations block attestation; soft ones are attestable with a note (ADR-0082). */
export type TimeDeviationSeverity = "hard" | "soft";

export interface TimeDeviation {
  workDate: string; // yyyy-mm-dd
  type: TimeDeviationType;
  severity: TimeDeviationSeverity;
  attendedMinutes: number;
  loggedMinutes: number;
  detail: string; // human-readable explanation
}

/** Backend reconciliation result (backend ADR-0046 wire shape). */
export interface TimeReconciliationResult {
  timesheetId: string;
  appUserId: string;
  weekStart: string;
  weekEnd: string;
  toleranceMinutes: number;
  deviations: TimeDeviation[];
  hardCount: number;
  softCount: number;
}

/**
 * An employee's external-id mapping row for the admin mapping confirm UI
 * (ADR-0082, #468). One row per active `app_user` (left-joined to its
 * `employee_profile` sidecar): email is the join key across all three systems,
 * `autotaskResourceId` attributes Autotask Ticket Time Entries, and
 * `quickbooksVendorId` matches the QuickBooks payment. `confirmed` is true once
 * an admin has stamped the mapping (mappings_resolved_at set). NEVER carries the
 * comp classification or pay rate — mapping cols only.
 */
export interface EmployeeMappingRow {
  appUserId: string;
  displayName: string; // falls back to email
  email: string; // the consistent join key across app_user / Autotask / QuickBooks / MileIQ
  autotaskResourceId: number | null; // Autotask Resource id (numeric)
  quickbooksVendorId: string | null; // QuickBooks Online vendor/employee id (opaque)
  mileiqUserId: string | null; // MileIQ user id (opaque); attributes a MileIQ drive (ADR-0083, #490)
  confirmed: boolean; // mappings_resolved_at is set (an admin has confirmed once)
  resolvedAt: string | null; // ISO; when the mapping was last confirmed
  confirmedByName: string | null; // who confirmed it (display name / email)
}

/**
 * One effective-dated SYSTEM-wide mileage rate (ADR-0083, `mileage_rate`, #490) as the
 * payroll-gated admin sees it. COMP DATA — gated exactly like pay_rate (#466): this row
 * surfaces ONLY behind the finance∨admin gate (`expense:finance-approve` /
 * `canFinanceApproveExpenses`) and is NEVER shown to employee/agent/client roles. A drive
 * reconciles against the rate in force on its date (greatest effective_from ≤ drive date);
 * the per-employee mileage $ is DERIVED BY THE BACKEND (the sole comp reader). The entry
 * GUI never reads this — it shows only miles + MileIQ's own suggested $.
 */
export interface MileageRateRow {
  id: string;
  effectiveFrom: string; // yyyy-mm-dd; inclusive, one system rate per date (UNIQUE)
  rate: number; // USD per mile (e.g. 0.7000)
  source: "mileiq_suggested" | "system_override";
  note: string | null;
  createdAt: string; // ISO; when the rate row was written
  createdByName: string | null; // who set the rate (audit)
  isCurrent: boolean; // true for the rate in force as of today (the latest effective_from ≤ today)
}

/**
 * Admin write payload for a system mileage-rate override (ADR-0083, #490). Appends a new
 * effective-dated row to the comp-gated `mileage_rate` table (source always
 * `system_override`); history is preserved for back-period reconciliation. The caller gates
 * `expense:finance-approve`. The MileIQ-suggested rate is written by the pipeline/backend,
 * never here.
 */
export interface MileageRateInput {
  effectiveFrom: string; // yyyy-mm-dd
  rate: number; // USD per mile; must be > 0
  note: string | null;
}

// ── Expense tracking (ADR-0083, migrations 0088–0090) ───────────────────────

/**
 * Expense Report lifecycle (ADR-0083): open→submitted(attest)→approved(admin →
 * Autotask ExpenseReport)→finance_approved(CFO)→reimbursed(matched vs QuickBooks
 * Purchase). `rejected` is the admin/finance bounce-back. Monthly cadence (one
 * report per employee per calendar month), unlike the weekly timesheet.
 */
export type ExpenseReportState =
  | "open"
  | "submitted"
  | "approved"
  | "finance_approved"
  | "reimbursed"
  | "rejected";

/** Expense item kind (ADR-0083): out-of-pocket (website) · mileage (MileIQ). */
export type ExpenseItemKind = "out_of_pocket" | "mileage";

/** Expense item bronze source (ADR-0083): manual website entry · MileIQ drive. */
export type ExpenseItemSource = "website" | "mileiq";

/** A monthly expense report, list/summary shape. The full month is `ExpenseReportDetail`. */
export interface ExpenseReportRow {
  id: string;
  employeeId: string;
  periodYear: number;
  periodMonth: number; // 1–12
  state: ExpenseReportState;
  itemCount: number;
  totalAmount: number; // sum of all item amounts (USD)
  reimbursableAmount: number; // sum of reimbursable item amounts (USD)
  attestedAt: string | null; // ISO; set when submitted
}

/** One expense item — out-of-pocket (amount) or mileage (miles × rate, $ derived by backend). */
export interface ExpenseItemRow {
  id: string;
  source: ExpenseItemSource;
  kind: ExpenseItemKind;
  itemDate: string; // yyyy-mm-dd
  categoryName: string | null; // resolved clean category (null for unmapped / mileage system cat)
  amount: number; // USD (mileage $ is backend-derived; 0 until derived)
  miles: number | null; // set for mileage, null otherwise
  reimbursable: boolean;
  billable: boolean; // independent leg — billable out-of-pocket is also invoiced to the client
  merchant: string | null;
  hasReceipt: boolean; // a receipt_attachment is linked
  notes: string | null;
}

/** The full month: the report + its items. Mirrors `TimesheetDetail`. */
export interface ExpenseReportDetail extends ExpenseReportRow {
  items: ExpenseItemRow[];
}

/** Reimbursement reconciliation verdict (ADR-0083, `expense_reconciliation`). */
export type ExpenseReconciliationVerdict = "pending" | "matched" | "mismatch";

/**
 * One report on the unified admin lifecycle surface (ADR-0083, mirrors #539) —
 * EVERY report across EVERY state and employee, so admins/finance follow the whole
 * lifecycle (open → submitted → approved → finance_approved → reimbursed) in one
 * filterable, sortable table. Comp-free: NEVER carries pay/comp data — the mileage
 * rate and reimbursement math live in the backend alone (the sole comp reader).
 */
export interface AdminExpenseRow {
  id: string;
  employeeId: string;
  employeeName: string; // app_user display name (falls back to email)
  periodYear: number;
  periodMonth: number; // 1–12
  state: ExpenseReportState;
  itemCount: number;
  totalAmount: number; // sum of all item amounts (USD)
  reimbursableAmount: number; // sum of reimbursable item amounts (USD)
  attestedAt: string | null; // ISO; set when submitted
  financeApprovedAt: string | null; // ISO; set when finance-approved
  reimbursedAt: string | null; // ISO; set when matched to the QuickBooks payment
  qbPaymentRef: string | null; // matched QuickBooks Purchase id (read-only SoR)
}

/**
 * The QuickBooks payment match the backend Reimbursement Reconciliation (BE #111)
 * suggests for one report (ADR-0083). Comp-free — only the matched payment fact
 * (employee + month + amount within tolerance), read from `expense_reconciliation`.
 * `matched` is false (refs null) when no QuickBooks Purchase lines up, the recon
 * hasn't run, or QBO isn't live in this environment.
 */
export interface ExpenseReimbursementMatch {
  expenseReportId: string;
  matched: boolean;
  qbPaymentRef: string | null;
  reimbursedAt: string | null; // ISO date of the matched payment, when found
  expectedReimbursableTotal: number | null; // recon's expected total (USD)
  qbPaymentAmount: number | null; // matched QuickBooks payment amount (USD)
  verdict: ExpenseReconciliationVerdict;
  detail: string; // human-readable explanation of the match (or why none)
}

/**
 * Admin review of one report (ADR-0083, mirrors #477): the live detail plus the
 * employee's immutable **attested original** (`expense_report.attested_snapshot`),
 * so the admin surface can diff corrections against what was attested. `null` for
 * reports attested before snapshots existed / never attested.
 */
export interface AdminExpenseReview extends ExpenseReportDetail {
  attestedSnapshot: ExpenseItemRow[] | null;
}

/**
 * A visible, mapped expense category the entry GUI offers (ADR-0083, `expense_category`).
 * Reads only the website-facing fields + the per-category caps the policy engine uses;
 * NEVER the QuickBooks/Autotask ids (those are mapping/admin concerns, #489). The
 * system Mileage category is excluded — it is rate-driven and not hand-entered.
 */
export interface ExpenseCategoryRow {
  id: string;
  key: string; // stable code (e.g. 'meals')
  displayName: string;
  billableDefault: boolean; // pre-checks the billable leg in the entry GUI
  hardCap: number | null; // per-item hard cap (over → hard violation); null = none
  softThreshold: number | null; // per-item nudge; null = none
}

/**
 * One business-classified MileIQ drive for an employee's month (ADR-0083,
 * `mileiq_drive`) — the read-only mileage feed the report shows alongside its silver
 * items. Comp-free: carries the MILES fact + MileIQ's own suggested $ snapshot, NOT
 * the Imperion mileage rate (that is backend-derived; the FE never reads the rate).
 */
export interface MileiqDriveRow {
  id: string;
  driveDate: string; // yyyy-mm-dd
  miles: number;
  origin: string | null;
  destination: string | null;
  suggestedAmount: number | null; // MileIQ's own suggested $ (non-comp snapshot); null until known
  matched: boolean; // resolved to this employee (app_user) yet
}

/**
 * One derived policy violation on an expense item (ADR-0083, `expense_policy_violation`
 * view), surfaced pre-attest as the memory-jogger. `hard` rows block attest; `soft`
 * rows nudge. The row-pair `suspected_duplicate` rule is layered on top by the app —
 * the view only carries the deterministic per-item rules.
 */
export interface ExpensePolicyViolationRow {
  expenseItemId: string;
  expenseReportId: string;
  ruleKey: string; // e.g. 'missing_receipt'
  severity: "hard" | "soft";
  detail: string; // human-readable explanation
}

/**
 * One employee-month row of the unified monthly close (ADR-0083, `monthly_close` view,
 * amends ADR-0082): rolled-up approved time minutes + reimbursable expense total, both
 * QuickBooks match statuses, and the open-obligation flags. Comp-FREE — expected pay
 * (hours × rate) stays in the backend (the sole comp reader); this carries minutes +
 * dollar amounts only, never a rate.
 */
export interface MonthlyCloseRow {
  appUserId: string;
  periodYear: number;
  periodMonth: number; // 1–12
  // expense side
  expenseReportId: string | null;
  expenseState: ExpenseReportState | null;
  reimbursableTotal: number; // USD
  reimbursementVerdict: ExpenseReconciliationVerdict;
  qbPaymentRef: string | null; // matched QuickBooks Purchase id (read-only SoR)
  // time side
  approvedTimeMinutes: number;
  timesheetCount: number;
  paidCount: number;
  // open obligations (approved/finance-approved but not yet confirmed paid)
  expenseObligationOpen: boolean;
  timeObligationOpen: boolean;
}

/**
 * One employee-month row of the unified Monthly Close finance surface (ADR-0083, #491,
 * amends ADR-0082) — `MonthlyCloseRow` joined to the employee's display name for the
 * all-employees finance table. The single monthly finance task: roll up both legs (time
 * minutes + reimbursable expense total), surface both QuickBooks match statuses, and flag
 * the open obligations (approved/finance-approved but not yet confirmed paid). Comp-FREE —
 * expected pay (hours × rate) stays in the backend (the sole comp reader); this carries
 * minutes + dollar amounts only, never a rate.
 */
export interface AdminMonthlyCloseRow extends MonthlyCloseRow {
  employeeName: string; // app_user display name (falls back to email)
}

/** Task category — the one task object serves sales + project/onboarding (ADR-0034). */
export type TaskCategory = "sales" | "project" | "onboarding" | "general";

/** A row in the Tasks list. */
export interface TaskRow {
  id: string;
  title: string;
  status: string;
  category: TaskCategory;
  due: string | null; // formatted due date
  account: string | null; // account name
  projectId: string | null; // owning project (one task model, ADR-0052)
  /** Subtasks (ADR-0065 B1, #335): how many direct children, and how many done.
   * 0/0 = a leaf task. Present on the list read so a row can show its rollup. */
  childCount: number;
  childDoneCount: number;
}

/** A single child task under a parent (ADR-0065 B1, #335). */
export interface TaskSubtaskRow {
  id: string;
  title: string;
  status: string; // open|in_progress|done
  due: string | null; // formatted due date
  ordinal: number; // sibling order within the parent
  childCount: number; // its own children (depth allowed) — 0 = leaf
  childDoneCount: number;
}

/** A parent task's children plus the n/m completion rollup (ADR-0065 B1, #335). */
export interface TaskHierarchy {
  parentId: string;
  children: TaskSubtaskRow[];
  total: number; // = children.length
  done: number; // children with status='done'
}

/**
 * The kind of a task dependency link (ADR-0065 B2, #336). v1 ships only `blocks`
 * (finish-to-start): the predecessor must finish before the successor. The type is
 * an enum-style string so later kinds widen additively, never a new shape.
 */
export type TaskDependencyType = "blocks";

/**
 * One end of a dependency link as shown on a task (ADR-0065 B2, #336) — the OTHER
 * task in the edge plus enough of its state to flag an unmet blocker. On the
 * "blocked by" list this is the predecessor; on the "blocks" list, the successor.
 */
export interface TaskDependencyRow {
  /** The id of the task at the other end of the edge. */
  taskId: string;
  title: string;
  status: string; // open|in_progress|done — drives the unmet-blocker flag
  type: TaskDependencyType;
}

/**
 * A task's full dependency picture (ADR-0065 B2, #336): what blocks it
 * (predecessors) and what it blocks (successors), plus the derived flag the UI and
 * the close-project surface use. `blocked` is true when ANY predecessor is not yet
 * done — the soft v1 signal (warned, never hard-blocked).
 */
export interface TaskDependencies {
  taskId: string;
  blockedBy: TaskDependencyRow[]; // predecessors — what must finish first
  blocks: TaskDependencyRow[]; // successors — what waits on this task
  /** True when at least one predecessor has status !== 'done' (unmet blocker). */
  blocked: boolean;
}

/**
 * The role a person holds on a work object (ADR-0065 B3, #337). `primary` is the
 * single owner that still drives rollups, the Sales Queue, and RBAC; `assignee`
 * is an additional worker; `watcher` is a follower. Widens additively if new
 * roles are ever needed — never a new shape.
 */
export type WorkRole = "primary" | "assignee" | "watcher";

/** One person attached to a work object, with their role (ADR-0065 B3, #337). */
export interface WorkAssignmentRow {
  userId: string;
  name: string; // display name (or email fallback)
  role: WorkRole;
}

/**
 * Everyone attached to a single work object plus the viewer's own watch state
 * (ADR-0065 B3, #337). `primary` is the single owner (may be null if unassigned);
 * `assignees` are additional workers; `watchers` are followers. `viewerWatching`
 * lets the UI render the watch/unwatch toggle without a second query.
 */
export interface WorkAssignments {
  parentType: string; // 'task' | 'project'
  parentId: string;
  primary: WorkAssignmentRow | null;
  assignees: WorkAssignmentRow[];
  watchers: WorkAssignmentRow[];
  /** True when the signed-in user holds any row on this object (watcher or worker). */
  viewerWatching: boolean;
}

/**
 * A single predecessor → successor dependency edge between two tasks of one
 * project (ADR-0066 C3, #343). The timeline view reads these to draw connectors;
 * both ends are tasks of the same project (edges touching tasks outside the
 * project are not returned). Pure read model over `task_dependency` — no new
 * table.
 */
export interface ProjectTaskDependencyEdge {
  predecessorId: string;
  successorId: string;
}

/**
 * A row in the Sales Queue (ADR-0052 §6) — an open `category='sales'` task with
 * its owner and deal context. Pure read model; no new tables.
 */
export interface SalesTaskRow {
  id: string;
  title: string;
  status: string;
  due: string | null; // formatted due date
  dueAt: string | null; // ISO yyyy-mm-dd for due-bucket grouping
  account: string | null; // account name
  opportunity: string | null; // deal name
  ownerUserId: string | null;
  owner: string | null; // owner display name
}

// ── Onboarding project management (ADR-0034 / template ADR-0037) ─────────────

/** A single checklist step under a phase (instantiated from the playbook). */
export interface OnboardingStep {
  id: string;
  code: string; // "1.1"
  title: string;
  isComm: boolean; // a "Send - …" client communication step
  status: string; // open|done
  due: string | null;
  /** Easy mode (ADR-0052 §3, #101): backend config function key; null = ordinary step. */
  deployKey: string | null;
  /** When the Deploy button last fired (verify-to-close pends on the backend check). */
  deployRequestedAt: string | null;
  /** The linked project task auto-created at template apply; closed on verification. */
  taskId: string | null;
}

/** A red/yellow/green onboarding milestone (major step / phase) under a project. */
export interface OnboardingMilestone {
  id: string;
  name: string;
  status: string; // not_started|in_progress|blocked|complete
  health: Health; // green|amber|red — derived from step completion when steps exist
  start: string | null;
  due: string | null;
  stepsTotal: number;
  stepsDone: number;
  steps: OnboardingStep[];
}

/** A project with its milestone R/Y/G rollup, for the onboarding dashboard. */
export interface OnboardingProject {
  id: string;
  name: string;
  account: string | null;
  type: string;
  status: string;
  targetLive: string | null;
  /** True once the standard onboarding playbook has been instantiated. */
  hasTemplate: boolean;
  milestones: OnboardingMilestone[];
}

/** A categorical count datum for charts (e.g. proposals by status). */
export interface CountDatum {
  label: string;
  count: number;
}

/** Open-pipeline by sales stage: deal count and total MRR per stage. */
export interface StageValueDatum {
  stage: string;
  count: number;
  mrr: number; // numeric (dollars/mo) for chart axes
}

/** One-time assessment revenue vs recurring managed-services MRR (kept separate). */
export interface RevenueSplit {
  oneTime: string; // formatted one-time assessment fees
  recurring: string; // formatted recurring MRR "$X/mo"
}

/** Assessment → managed-services conversion. */
export interface AssessmentConversion {
  delivered: number;
  converted: number;
  rate: string; // formatted "NN%"
}

/** Headline figures for the Reporting page. */
export interface ReportSummary {
  activeMrr: string; // formatted "$X/mo"
  openPipeline: string; // formatted
  winRate: string; // formatted "NN%"
  avgTimeToLive: string; // formatted "NNd" or "—"
}

// ── Reporting BI hub — Marketing & Social section (ADR-0062, #289) ───────────

/**
 * One organic-social stat (social_metric, 0075). Metric names are source-truthful
 * and metric-generic by design (ADR-0062): lifetime metrics carry the latest
 * value, daily metrics a 28-day sum.
 */
export interface SocialStatDatum {
  platform: string; // facebook|instagram
  metric: string; // raw social_metric.metric, humanized in the UI
  value: number;
  window: "lifetime" | "28d";
}

/** Organic engagement totals over the last 30 days (Meta bronze, 0075). */
export interface SocialEngagement {
  fbPosts: number;
  fbReactions: number;
  fbComments: number;
  fbShares: number;
  igMedia: number;
  igLikes: number;
  igComments: number;
}

/** Paid-campaign rollup row (campaign_metric stays paid-only, ADR-0012). */
export interface CampaignPerfRow {
  name: string;
  platform: string;
  spend: number; // dollars — redacted by the revenue gate (ADR-0030) before render
  clicks: number;
  leads: number;
}

/** The Marketing & Social reporting section payload (ADR-0062). */
export interface MarketingSocialReport {
  leadsBySource30d: CountDatum[];
  socialStats: SocialStatDatum[];
  engagement30d: SocialEngagement;
  topCampaigns: CampaignPerfRow[];
}

// ── Reporting BI hub — Service Desk section (ADR-0062, #290) ─────────────────

/**
 * Service-desk section payload. ticket.status/queue hold raw Autotask picklist
 * ids (label lookup deferred at 0074); only the fixed Autotask system statuses
 * are named, the rest render as "Status N"/"Queue N". No open/closed flow yet —
 * no ticket carries completion dates (ADR-0062).
 */
export interface ServiceDeskReport {
  byStatus: CountDatum[];
  byQueue: CountDatum[];
  openedByWeek: CountDatum[]; // label = ISO week start (yyyy-mm-dd), last 8 weeks
  total: number;
  opened30d: number;
  defenderLinked: number; // defender_incident_ticket_link rows (ADR-0059)
}

// ── Reporting BI hub — Security Fleet section (ADR-0062, #291) ───────────────

/**
 * Fleet-wide security rollup across ALL mapped tenants (per-account detail
 * stays on /security and the posture pages, ADR-0051). Sources are empty until
 * server bringup registers the collectors (local #102) — nulls mean "no
 * coverage yet", never zero.
 */
export interface SecurityFleetReport {
  tenants: number; // tenant_posture rows (refreshed tenants)
  secureScorePct: number | null; // sum(current)/sum(max) × 100, null = no coverage
  policyMix: CountDatum[]; // fleet totals: compliant|drift|ungoverned|missing
  mfa: { registered: number; total: number }; // entra_auth_methods fleet-wide
  defenderOpenBySeverity: CountDatum[]; // open = status not resolved/redirected (#256)
  intune: { compliant: number; total: number }; // intune_managed_devices
  exposuresOpen: number; // credential_exposure not resolved
}

// ── Reporting BI hub — Time Efficiency section (ADR-0082 / ADR-0062, #467) ───

/**
 * Time-efficiency rollup for the BI hub. **Utilization is comp-free** — it is
 * the split of authoritative attendance minutes (silver `time_record`,
 * kind='attendance') across the billable / internal / admin categories.
 * **Labor cost is comp-derived and AGGREGATE-ONLY** — Σ(approved hours ×
 * effective hourly rate) over approved timesheets, never a per-person rate — and
 * is `null` unless the caller is finance | admin (the cost query does not run
 * otherwise, so `pay_rate` is never read for other roles). All zero/`null` until
 * `time_record`, approved timesheets, and `pay_rate` carry rows (build-ahead, #467).
 */
export interface TimeEfficiencyReport {
  utilization: {
    billableMinutes: number;
    internalMinutes: number;
    adminMinutes: number;
  };
  laborCost: {
    approvedHours: number; // costed approved hours (rounded)
    totalCost: number; // Σ hours × effective hourly rate — aggregate dollars
    blendedHourlyRate: number | null; // totalCost ÷ approvedHours, null when no hours
  } | null;
}

// ── Dashboard cross-domain intelligence strip (ADR-0062, #292) ───────────────

/**
 * One glance across the BI-hub domains, each card deep-linking to its
 * /reporting anchor (or /security). Nulls mean "no coverage yet", never zero.
 */
export interface IntelStrip {
  newLeads7d: number;
  ticketsOpened30d: number;
  defenderOpen: number | null; // null until Defender rows exist at all
  mfaPct: number | null; // null until auth-method rows exist
  /** Organic engagement count 30d (Meta bronze counters — schema-stable, unlike
   * insight metric names which local #135 is still tuning). Null until posts exist. */
  socialEngagement30d: number | null;
}

// ── Engagements: editable questionnaires, discovery, SBR, artifacts, tickets ──
// (ADR-0023). All engagement records are account-scoped; the contact is only the
// employee who performed a given instance.

/** A question from an editable template (discovery or assessment). */
export interface QuestionRow {
  id: string;
  key: string;
  prompt: string;
  helpText: string | null;
  responseType: string; // question_response_type
  options: string[] | null; // for select/rating
  dimension: string | null; // assessment scorecard dimension key
  ordinal: number;
  required: boolean;
  active: boolean;
}

/** The active question template for a kind (discovery|assessment). */
export interface QuestionTemplateRow {
  id: string;
  kind: string;
  version: number;
  title: string;
}

/** A stored answer joined to its question, for display. */
export interface AnswerRow {
  questionId: string;
  key: string;
  prompt: string;
  responseType: string;
  value: string | null; // display value (coalesced across typed columns)
}

/**
 * An answer with its provenance, for the pre-discovery review (ADR-0027). Agent- and
 * automation-sourced answers start as draft and need a human stamp before the verdict.
 */
export interface AnswerReviewRow {
  id: string; // engagement_answer id
  prompt: string;
  value: string | null;
  source: string; // human|agent|automation
  confidence: number | null; // 0..1
  status: string; // draft|confirmed|rejected
}

/** A row in the Discovery-call list. */
export interface DiscoveryCallRow {
  id: string;
  account: string;
  status: string;
  verdict: string | null;
  held: string | null; // formatted date
  nextStep: string | null;
}

/** Full discovery call with its captured answers. */
export interface DiscoveryCallDetail {
  id: string;
  accountId: string;
  opportunityId: string | null;
  contactId: string | null;
  templateId: string | null;
  status: string;
  heldAt: string | null;
  verdict: string | null;
  verdictReason: string | null;
  nextStep: string | null;
  sbrCadence: string | null;
  answers: AnswerRow[];
}

/** A re-scored dimension at an SBR (trend vs the benchmark assessment). */
export interface SbrDimensionScore {
  dimension: string;
  rating: string | null;
  note: string | null;
}

/** A row in the SBR list. */
export interface SbrRow {
  id: string;
  account: string;
  reviewDate: string;
  periodLabel: string | null;
  status: string;
}

/** Full SBR with re-scored dimensions and referenced ticket history. */
export interface SbrDetail {
  id: string;
  accountId: string;
  contactId: string | null;
  benchmarkAssessmentId: string | null;
  reviewDate: string;
  periodLabel: string | null;
  status: string;
  concerns: string | null;
  summary: string | null;
  nextActions: string | null;
  dimensionScores: SbrDimensionScore[];
  tickets: TicketRow[];
}

/** An assessment evidence artifact (Televy / M365 / Google / scan). */
export interface ArtifactRow {
  id: string;
  source: string;
  kind: string;
  title: string | null;
  dimension: string | null;
  collectedAt: string | null;
  summary: string | null;
}

/** A row in the Tickets list (synced from Autotask). */
export interface TicketRow {
  id: string;
  account: string;
  number: string | null;
  title: string;
  status: string | null;
  priority: string | null;
  opened: string | null;
}

/**
 * One row of the read-only device & cloud-asset inventory (ADR-0047) — silver
 * `device` rows merged with not-yet-merged IT Glue configurations.
 */
export interface DeviceInventoryRow {
  id: string;
  name: string | null;
  deviceType: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  os: string | null;
  status: string | null;
  account: string | null;
  origin: string; // silver | itglue
  lastSeen: string | null;
  /**
   * Per-device policy-applied indicator (#162, ADR-0051 §6), sourced ONLY from
   * Intune Device Compliance (`intune_managed_devices` bronze, migration 0069).
   * null = absent: device not Intune-managed, not reporting, or feed not run.
   */
  policyCompliance: "compliant" | "drift" | "ungoverned" | null;
}

/** A silver `contract` row joined to its account (Autotask or DocuSign — pipeline merge). */
export interface ContractRow {
  id: string;
  account: string | null;
  name: string | null;
  number: string | null;
  status: string | null;
  contractType: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Originating system (`autotask` | `docusign`) — pipeline merge stamps it. */
  source: string;
}

/** An admin-managed Tenant Mapping row (ADR-0051): Microsoft tenant GUID → account. */
export interface TenantMapping {
  tenantId: string;
  accountId: string;
  accountName: string | null;
  displayName: string | null;
  updatedAt: string | null;
}

/** A tenant GUID present in posture bronze with no Tenant Mapping (ADR-0051). */
export interface UnmappedTenant {
  tenantId: string;
}

/**
 * One mapped Customer Tenant's posture rollup (silver `tenant_posture`, ADR-0051).
 * A mapped tenant with no rollup yet still surfaces — every numeric field is then
 * null/zero and `refreshedAt` is null ("not refreshed" is a state, not an absence).
 */
export interface TenantPostureRollup {
  tenantId: string;
  displayName: string | null;
  secureScoreCurrent: number | null;
  secureScoreMax: number | null;
  licensedUserCount: number | null;
  activeUserCount: number | null;
  policiesCompliant: number;
  policiesDrift: number;
  policiesUngoverned: number;
  policiesMissing: number;
  exposuresOpen: number;
  refreshedAt: string | null;
}

/** One classified policy row (silver `posture_policy`, ADR-0051 §3). */
export interface PosturePolicyRow {
  tenantId: string;
  policyFamily: string; // conditional_access|intune_security|device_configuration|autopilot|defender_xdr
  policyId: string;
  policyName: string | null;
  classification: string; // compliant|drift|ungoverned|missing
  observedModifiedAt: string | null;
  goldenApprovedAt: string | null;
}

/**
 * Per-domain DNS posture rollup (ADR-0063, account-keyed per the 2026-06-12 amendment).
 * One row per domain in the account's GUI-managed `account_domain` list, LEFT JOINed to its
 * `dns_domain` rollup — so a tracked-but-not-yet-captured domain still surfaces (verdict null).
 */
export interface DnsDomainRollup {
  domain: string;
  note: string | null;
  /** Governance verdict — only 'managed' = hosted in Azure AND write proven AND NS delegated. null = tracked, not yet captured. */
  verdict: "not-in-azure" | "in-azure-readonly" | "managed" | null;
  recordsCompliant: number;
  recordsDrift: number;
  recordsUngoverned: number;
  recordsMissing: number;
  /** 0–100 DNS posture score, or null when no golden baseline is approved yet. */
  score: number | null;
  lastCapturedAt: string | null;
}

/** One Microsoft secure-score control profile (bronze, for the #93 drill-down). */
export interface SecureScoreControl {
  tenantId: string;
  controlName: string | null;
  controlCategory: string | null;
  title: string | null;
  maxScore: string | null;
  service: string | null;
  userImpact: string | null;
  tier: string | null;
}

/** One compromised-credential record for an account (silver `credential_exposure`, ADR-0040). */
export interface CredentialExposureRow {
  id: string;
  email: string | null;
  breachSource: string | null;
  breachDate: string | null;
  exposedData: string[];
  passwordStatus: string | null;
  severity: string | null;
  status: string; // new|acknowledged|resolved
  lastSeenAt: string | null;
}

/**
 * Defender-incident counts for an account's mapped tenants (bronze
 * `defender_incidents` joined through `account_tenant`, #256/ADR-0059).
 * `total` distinguishes "no data collected" (0) from "all incidents closed".
 */
export interface DefenderIncidentCounts {
  /** Incidents whose status is not resolved/redirected. */
  open: number;
  /** All collected incidents for the mapped tenants. */
  total: number;
}

/**
 * Per-user MFA registration coverage for an account's mapped tenants (bronze
 * `entra_auth_methods` joined through `account_tenant`, #258/ADR-0051).
 * `total` distinguishes "no data collected" (0) from "nobody registered".
 */
export interface MfaRegistrationCounts {
  /** Users whose is_mfa_registered is true. */
  registered: number;
  /** All collected users for the mapped tenants. */
  total: number;
}

/**
 * One SharePoint site from bronze `sharepoint_sites` (migration 0078, #255),
 * scoped to an account through `account_tenant` (ADR-0051). Site METADATA only
 * (Sites.Read.All) — no file/drive/item fields exist anywhere in this shape
 * (Files.Read.All was pruned). Bronze is all-text: values arrive verbatim and
 * the UI parses only what it renders.
 */
export interface SharePointSiteRow {
  tenantId: string;
  /** Graph composite site id (bronze external_id). */
  externalId: string;
  displayName: string | null;
  webUrl: string | null;
  description: string | null;
  createdAt: string | null;
  lastModifiedAt: string | null;
  /** Web template name (e.g. SITEPAGEPUBLISHING, GROUP, SPSPERS). */
  template: string | null;
  /** Stringified Graph boolean — personal (OneDrive-style) site flag. */
  isPersonalSite: string | null;
  storageUsedBytes: string | null;
  storageQuotaBytes: string | null;
  collectedAt: string;
}

/**
 * One directory group a contact belongs to, from bronze `m365_groups` joined
 * through `m365_group_members` on the contact's Entra user object id
 * (`m365_contacts.external_ref`) — migration 0079, #257. Bronze is all-text:
 * values arrive verbatim and the UI parses only what it renders.
 */
export interface DirectoryGroupRow {
  tenantId: string;
  /** Entra group object id (bronze external_id). */
  externalId: string;
  displayName: string | null;
  description: string | null;
  /** Stringified Graph array — contains "Unified" for Microsoft 365 groups. */
  groupTypes: string | null;
  mail: string | null;
  /** Stringified Graph booleans. */
  securityEnabled: string | null;
  mailEnabled: string | null;
  visibility: string | null;
  /** "On" when the group is dynamic (rule-driven membership). */
  membershipRuleProcessingState: string | null;
  collectedAt: string;
}

/** Minimal signed-in user shape surfaced in the UI (from the Entra session). */
export interface SessionUser {
  name: string;
  email: string;
  /** Normalized application roles derived from Entra group/app-role claims. */
  roles: AppRole[];
}

/** A single result from the Knowledge search over the gold layer. */
export interface KnowledgeHit {
  id: string;
  kind: string; // contact | interaction
  title: string;
  snippet: string | null;
  href: string | null;
  when: string | null;
}

/** Headline security/compliance posture (read model over the spine). */
export interface SecurityPosture {
  totalContacts: number;
  contactsWithConsent: number; // any current opt-in
  adEligible: number; // current ad_targeting opt-in
  connectionsActive: number;
  connectionsTotal: number;
  consentByChannel: CountDatum[]; // current opt-in count per channel
}

// ── Communications timeline (ADR-0011) ───────────────────────────────────────
// The unified, multi-channel lifetime history. Every row is one `interaction`.

/** One item in a communications timeline (email, message, call, meeting, social…). */
export interface InteractionRow {
  id: string;
  source: string; // interaction_source (m365_email, linkedin, plaud, …)
  kind: string | null; // email|message|call|meeting|social_comment|…
  channel: string | null;
  direction: string | null; // inbound|outbound|internal
  subject: string | null;
  summary: string | null; // summary_gold (agent-ready)
  owner: string | null; // employee whose connection produced it
  contact: string | null; // contact full name
  account: string | null; // account name
  occurredAt: string | null; // formatted date-time
}

/** Structured Teams/Plaud meeting detail attached to an interaction (ADR-0011). */
export interface MeetingDetail {
  platform: string | null; // teams|plaud|other
  title: string | null;
  copilotRecap: string | null; // Teams Copilot recap
  plaudSummary: string | null; // Plaud meeting summary
  transcriptRef: string | null; // pointer to the full transcript
}

/** A single communication, for the drill-down view. */
export interface CommunicationDetail {
  id: string;
  source: string;
  kind: string | null;
  channel: string | null;
  direction: string | null;
  subject: string | null;
  summary: string | null; // summary_gold
  body: string | null; // normalized narrative / payload text
  owner: string | null;
  contact: string | null;
  contactId: string | null;
  account: string | null;
  accountId: string | null;
  occurredAt: string | null;
  meeting: MeetingDetail | null;
  actionItems: ActionItemRow[];
}

/** A meeting follow-up action item. */
export interface ActionItemRow {
  id: string;
  description: string;
  status: string; // open|done
  due: string | null;
  contact: string | null;
  owner: string | null;
  promotedToTask: boolean;
}

// ── Contact 360 / enrichment dossier (ADR-0025) ──────────────────────────────

/** A linked social profile for a contact. */
export interface SocialIdentityRow {
  id: string;
  platform: string;
  handle: string | null;
  profileUrl: string | null;
  followerCount: number | null;
  verified: boolean;
}

/** One enriched fact in the dossier, with provenance and lawful basis. */
export interface EnrichmentFactRow {
  id: string;
  attributeKey: string;
  value: string | null;
  confidence: number | null; // 0..1
  source: string | null;
  /** The connection that produced it (e.g. "LinkedIn · A. Reyes"), if any. */
  sourceConnection: string | null;
  lawfulBasis: string; // consent|legitimate_interest|contract|public_data
  observedAt: string | null;
}

/** The full contact profile (header) for the detail page. */
export interface ContactProfile {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  headline: string | null;
  location: string | null;
  avatarUrl: string | null;
  lifecycleStatus: string; // stranger|known|engaged|customer
  /** CRM lifecycle stage (ADR-0031): audience|lead|prospect|client. Optional so mock literals stay valid. */
  crmStage?: string | null;
  account: string | null;
  accountId: string | null;
  lastEnrichedAt: string | null;
}

// ── Per-source bronze rows (ADR-0032) ────────────────────────────────────────

/**
 * One per-source bronze row backing a unified silver record. The pipeline lands raw
 * source payloads here; the merge job (pipeline ADR-0006) links each to its silver
 * `contact`/`account`. Surfaced read-only so a user can see every source that fed a
 * record and inspect the raw payload.
 */
export interface SourceRecordRow {
  id: string;
  source: string; // imperion_crm_entered | apollo | m365_synced | autotask | itglue | autotask_contract | autotask_ticket | itglue_doc
  externalRef: string | null;
  payloadBronze: unknown | null; // raw source JSON (the "view raw" popup)
  normalizedSilver: unknown | null; // per-source normalized shape
  matchConfidence: number | null; // 0..1, set by the merge job
  matchedAt: string | null;
  lastSeenAt: string | null;
  title?: string | null; // optional human label (contract name / ticket title) for related-bronze citations
}

/**
 * A related bronze record from the local pipeline that fed a merged object's wider picture
 * (Autotask contracts/tickets, IT Glue documentation) — surfaced as drill-down citations
 * (local-pipeline ADR-0008 / front-end migration 0038). Same shape as a source record.
 */
export type RelatedBronzeRow = SourceRecordRow;

/** A per-source bronze row for a contact (`contact_source`). */
export type ContactSourceRow = SourceRecordRow;

/** A per-source bronze row for a company (`account_source`). */
export type AccountSourceRow = SourceRecordRow;

// ── Consent ledger (ADR-0014) ────────────────────────────────────────────────

/** One immutable consent event from the ledger. */
export interface ConsentEventRow {
  id: string;
  channel: string;
  state: string; // opt_in|opt_out
  lawfulBasis: string;
  source: string | null;
  occurredAt: string | null;
}

/** Derived current consent for one channel. */
export interface CurrentConsentRow {
  channel: string;
  state: string; // opt_in|opt_out (no row ⇒ unknown)
  lawfulBasis: string;
}

// ── Connections & identity map (ADR-0012/0024) ───────────────────────────────

/** A connected external account (personal or company-wide). */
export interface ConnectionRow {
  id: string;
  scope: string; // user|company
  provider: string;
  displayName: string | null;
  status: string; // active|expired|revoked|error
  scopes: string[];
  owner: string | null; // employee, for user-scope
  keyvaultSecretRef: string | null; // reference string only — never a secret
  lastSync: string | null;
  connectedAt: string | null;
  pollIntervalMinutes: number; // how often the pipeline polls; 0 = manual/paused (ADR-0038)
}

/** A row in an account's external identity map. */
export interface ExternalIdentityRow {
  id: string;
  provider: string;
  externalId: string;
  contact: string | null;
}

// ── Events: first-class objects campaigns promote (ADR-0053) ─────────────────

/** A row in the Events list. Funnel counts are derived, never stored. */
export interface EventRow {
  id: string;
  kind: string; // webinar|live_event
  name: string;
  status: string; // draft|scheduled|live|completed|canceled
  startsAt: string | null; // formatted
  registered: number;
  attended: number;
}

/** Full event detail for the record page. */
export interface EventDetail {
  id: string;
  kind: string;
  name: string;
  description: string | null;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string | null;
  capacity: number | null;
  joinUrl: string | null; // Teams link (webinar)
  location: string | null; // venue (live_event)
  registrationHeadline: string | null; // typed registration_page jsonb
  registrationBlurb: string | null;
  /** Workflow registrants auto-enroll into on resolution (ADR-0053 §4, #112). */
  workflowId: string | null;
  workflowName: string | null;
  registered: number;
  attended: number;
  noShow: number;
}

/** One signup on an event (attendance recorded post-event, ADR-0053 §2). */
export interface EventRegistrationRow {
  id: string;
  contact: string | null; // resolved contact name
  contactId: string | null;
  status: string; // registered|attended|no_show|canceled
  source: string | null;
  registeredAt: string | null;
  checkedInAt: string | null;
}

// ── Demand generation: campaigns, ads, audiences (ADR-0012/0026) ─────────────

/** A row in the Campaigns list. */
export interface CampaignRow {
  id: string;
  name: string;
  platform: string;
  status: string;
  budget: string; // formatted or "—"
  spend: string; // formatted polled spend or "—"
  leads: number;
}

/** An ad belonging to a campaign. */
export interface AdRow {
  id: string;
  name: string;
  status: string;
  /** Creative summary: the typed headline (ADR-0053 §3), or legacy free-text copy. */
  creative: string | null;
  /** Audience the ad targets (from the typed creative), when set. */
  audienceName: string | null;
  spend: string;
  impressions: number;
  clicks: number;
  leads: number;
}

/** A campaign with its ads and rolled-up metrics. */
export interface CampaignDetail {
  id: string;
  name: string;
  platform: string;
  objective: string | null;
  status: string;
  budget: string;
  startAt: string | null;
  endAt: string | null;
  /** Linked event the campaign promotes (ADR-0053 §1) — enables event-relative sends. */
  eventId: string | null;
  eventName: string | null;
  /** Workflow campaign-attributed responders auto-enroll into (ADR-0053 §4, #112). */
  workflowName: string | null;
  ads: AdRow[];
}

/** One schedulable blast on a campaign (ADR-0053 §4, migration 0071). */
export interface CampaignSendRow {
  id: string;
  channel: string; // email|sms
  recipientScope: string; // audience|event_registrants
  audienceName: string | null;
  summary: string | null; // email subject / sms text excerpt
  status: string; // draft|scheduled|sending|sent|canceled
  schedule: string; // human label: absolute time or event offset
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
}

/** A row in the Audiences list. */
export interface AudienceRow {
  id: string;
  name: string;
  description: string | null;
  kind: string; // static|dynamic
  memberCount: number;
  adReadyCount: number; // members with ad_targeting consent
}

/** A previewed/realized audience member, with ad eligibility. */
export interface AudienceMemberRow {
  contactId: string;
  fullName: string;
  account: string | null;
  adConsent: boolean; // ad_targeting consent current?
}

// ── Lead-capture hooks (ADR-0024) ────────────────────────────────────────────

/** A configured lead-capture hook. */
export interface LeadHookRow {
  id: string;
  name: string;
  kind: string;
  active: boolean;
  captureCount: number;
}

/** A raw inbound lead capture awaiting resolution. */
export interface LeadCaptureEventRow {
  id: string;
  hook: string | null;
  status: string; // new|resolved|ignored
  contact: string | null;
  summary: string | null; // derived from payload
  receivedAt: string | null;
}

// ── Automation workflows (ADR-0014/0027) ─────────────────────────────────────

/** A row in the Workflows list. */
export interface WorkflowRow {
  id: string;
  name: string;
  kind: string; // nurture|pre_discovery|re_engagement
  status: string;
  stepCount: number;
  activeEnrollments: number;
}

/** A step within a workflow. */
export interface WorkflowStepRow {
  id: string;
  ordinal: number;
  kind: string; // send_email|send_sms|chat_prompt|agent_enrich|wait|branch
  summary: string | null; // derived from config
}

/** A workflow with its ordered steps. */
export interface WorkflowDetail {
  id: string;
  name: string;
  kind: string;
  status: string;
  trigger: string | null;
  steps: WorkflowStepRow[];
}

/** A contact's enrollment in a workflow. */
export interface EnrollmentRow {
  id: string;
  contact: string | null;
  workflow: string;
  status: string; // active|completed|exited
  currentStep: number;
  enrolledAt: string | null;
}

// ── PM collaboration — comments & activity feed (ADR-0064 A1) ─────────────────

/** The work objects a comment / activity feed can hang off (polymorphic, ADR-0064). */
export type WorkParentType = "task" | "project" | "milestone";

/** A resolved @mention on a comment (ADR-0064 A2, #331). */
export interface CommentMention {
  userId: string | null; // app_user.id, null if the user was later removed
  handle: string; // the @handle as resolved (email local-part)
  displayName: string | null; // resolved display name for rendering the link
}

/** A single markdown comment on a work object. */
export interface WorkComment {
  id: string;
  parentType: WorkParentType;
  parentId: string;
  authorUserId: string | null;
  author: string | null; // resolved display name (app_user), null if the user was removed
  body: string; // markdown
  editedAt: string | null;
  createdAt: string;
  /** Resolved @mentions on this comment (ADR-0064 A2, #331); [] when none. */
  mentions: CommentMention[];
}

/**
 * One entry in a work object's activity feed (ADR-0064 A1) — either a live
 * comment or an audit_log system event, discriminated by `kind`. Read
 * newest-first; `comment` rows carry `body`/`actor`, `event` rows carry
 * `action`/`detail`.
 */
export interface WorkActivityEntry {
  id: string;
  kind: "comment" | "event";
  parentType: WorkParentType;
  parentId: string;
  actorUserId: string | null;
  actor: string | null; // resolved display name, null when unknown/removed
  body: string | null; // comment markdown (kind === "comment")
  action: string | null; // audit action, e.g. "project.updated" (kind === "event")
  detail: Record<string, unknown> | null; // audit detail jsonb (kind === "event")
  editedAt: string | null;
  occurredAt: string;
  /** Resolved @mentions (kind === "comment"; ADR-0064 A2, #331); [] otherwise. */
  mentions: CommentMention[];
}

/** A user that can be @mentioned in a comment — the typeahead row (ADR-0064 A2, #331). */
export interface MentionableUser {
  id: string;
  displayName: string;
  /** Lowercased email local-part, the text after `@` in a mention. */
  handle: string;
}

// ── PM collaboration — file attachments (ADR-0064 A4, #333) ──────────────────

/**
 * A file attached to a work object (task/project/milestone), ADR-0064 A4.
 *
 * The file BYTES live in Azure Blob; this is metadata only. `storageRef` is the
 * opaque blob key the backend mints a short-lived per-request SAS against — never
 * a public URL and never a SAS token at rest (ADR-0064 security impact). The GUI
 * never holds storage credentials (ADR-0042); download/upload route through the
 * backend.
 */
export interface WorkAttachment {
  id: string;
  parentType: WorkParentType;
  parentId: string;
  /** Opaque Azure Blob key; the backend resolves it to a short-lived SAS on download. */
  storageRef: string;
  filename: string;
  contentType: string; // MIME type — drives inline image preview + the server-side allowlist
  sizeBytes: number;
  uploadedByUserId: string | null;
  uploadedBy: string | null; // resolved display name (app_user), null if the user was removed
  createdAt: string;
}

// ── PM task structure — tags / labels (ADR-0065 B6, #340) ────────────────────

/** Work objects a tag can be applied to (polymorphic, ADR-0065 B6). */
export type TagParentType = "task" | "project";

/**
 * A tag in the global vocabulary (ADR-0065 B6). `color` is a design-token name
 * (accent | green | amber | red | slate | …) the UI resolves against the palette,
 * never a raw hex. `usageCount` is the number of work objects carrying it
 * (present on the vocabulary read; 0 = unused).
 */
export interface Tag {
  id: string;
  label: string;
  color: string;
  usageCount: number;
}

/** A tag applied to a work object, as shown on its chips (ADR-0065 B6, #340). */
export interface AppliedTag {
  id: string;
  label: string;
  color: string;
}
