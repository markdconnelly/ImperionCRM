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
  AgentMessage,
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
  IntelStrip,
  InteractionRow,
  KnowledgeHit,
  Kpi,
  LeadCaptureEventRow,
  DeliveryTemplateRow,
  DeliveryTemplateDetail,
  TimesheetRow,
  TimesheetDetail,
  TimeEntryCategory,
  LeadHookRow,
  MarketingSocialReport,
  OnboardingProject,
  SecurityFleetReport,
  ServiceDeskReport,
  SecurityPosture,
  OpportunityRow,
  PipelineColumn,
  ProjectRow,
  ProjectTypeRow,
  ProposalRow,
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
  TenantMapping,
  TenantPostureRollup,
  PosturePolicyRow,
  DnsDomainRollup,
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
}
export interface TaskEditable extends TaskInput {
  id: string;
  /** Autotask ticket ref set by the on-demand push (backend #19, ADR-0052 §7).
   * Read-only here — the backend writes it server-side, never the form. */
  autotaskTicketRef: string | null;
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
  /** Move an opportunity to a different sales stage (pipeline board). */
  setOpportunityStage(id: string, stage: string): Promise<void>;

  // Tasks (full CRUD)
  listTasks(): Promise<TaskRow[]>;
  /** A project's slice of the one task model, by task.project_id (ADR-0052 §2). */
  listProjectTasks(projectId: string): Promise<TaskRow[]>;
  getTask(id: string): Promise<TaskEditable | null>;
  createTask(input: TaskInput): Promise<void>;
  updateTask(id: string, input: TaskInput): Promise<void>;
  deleteTask(id: string): Promise<void>;

  // Sales Activity (ADR-0052 §6) — the Sales Queue read model + its two writes
  /** Open `category='sales'` tasks with owner + deal context (the Sales Queue). */
  listSalesTasks(): Promise<SalesTaskRow[]>;
  /** Create a sales task (category fixed to 'sales', owned by the creating rep). */
  createSalesTask(input: SalesTaskInput): Promise<void>;
  /** Set a task's status (Sales Queue complete button; idempotent). */
  setTaskStatus(id: string, status: string): Promise<void>;
  /** Set a task's category (kanban group-by=category drop; idempotent). */
  setTaskCategory(id: string, category: string): Promise<void>;

  // Proposals (full CRUD) — attach to an opportunity (ADR-0019)
  listProposals(): Promise<ProposalRow[]>;
  getProposal(id: string): Promise<ProposalEditable | null>;
  createProposal(input: ProposalInput): Promise<void>;
  updateProposal(id: string, input: ProposalInput): Promise<void>;
  deleteProposal(id: string): Promise<void>;

  // Delivery projects (full CRUD) — typed via the project_type table (ADR-0020/0052)
  listProjects(): Promise<ProjectRow[]>;
  getProject(id: string): Promise<ProjectEditable | null>;
  createProject(input: ProjectInput): Promise<void>;
  updateProject(id: string, input: ProjectInput): Promise<void>;
  /** Set a project's status (kanban board drop; idempotent). */
  setProjectStatus(id: string, status: string): Promise<void>;
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

  // Project types — user-creatable from the project board (ADR-0052 §1)
  listProjectTypes(): Promise<ProjectTypeRow[]>;
  createProjectType(input: ProjectTypeInput): Promise<void>;
  /** Refuses protected types; deleting a type in use fails on the RESTRICT FK. */
  deleteProjectType(id: string): Promise<void>;

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
}
