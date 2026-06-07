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
  ConnectionRow,
  ConsentEventRow,
  ContactProfile,
  ContactRow,
  CountDatum,
  CurrentConsentRow,
  DiscoveryCallDetail,
  DiscoveryCallRow,
  EnrichmentFactRow,
  EnrollmentRow,
  ExternalIdentityRow,
  InteractionRow,
  Kpi,
  LeadCaptureEventRow,
  LeadHookRow,
  OpportunityRow,
  PipelineColumn,
  ProjectRow,
  ProposalRow,
  QuestionRow,
  QuestionTemplateRow,
  ReportSummary,
  RevenueSplit,
  SbrDetail,
  SbrRow,
  SocialIdentityRow,
  StageValueDatum,
  TaskRow,
  TicketRow,
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

/** Editable task fields. */
export interface TaskInput {
  accountId: string | null;
  title: string;
  detail: string | null;
  status: string;
  dueAt: string | null; // yyyy-mm-dd or null
}
export interface TaskEditable extends TaskInput {
  id: string;
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
  type: string; // onboarding|implementation
  status: string; // not_started|in_progress|blocked|complete
  targetLiveDate: string | null; // yyyy-mm-dd or null
  notes: string | null;
}
export interface ProjectEditable extends ProjectInput {
  id: string;
}

/** A {id,name} option for select dropdowns (e.g. picking an account). */
export interface Option {
  id: string;
  name: string;
}

export interface DashboardRepository {
  getKpis(): Promise<Kpi[]>;
  getPipeline(): Promise<PipelineColumn[]>;
  getAccountsNeedingAttention(): Promise<Account[]>;
}

export interface CrmRepository {
  // Accounts (full CRUD)
  listAccounts(): Promise<Account[]>;
  getAccount(id: string): Promise<AccountEditable | null>;
  createAccount(input: AccountInput): Promise<void>;
  updateAccount(id: string, input: AccountInput): Promise<void>;
  deleteAccount(id: string): Promise<void>;

  // Contacts (list; CRUD to follow the same pattern)
  listContacts(): Promise<ContactRow[]>;

  // Opportunities (Pipeline board)
  listOpportunities(): Promise<OpportunityRow[]>;

  // Tasks (full CRUD)
  listTasks(): Promise<TaskRow[]>;
  getTask(id: string): Promise<TaskEditable | null>;
  createTask(input: TaskInput): Promise<void>;
  updateTask(id: string, input: TaskInput): Promise<void>;
  deleteTask(id: string): Promise<void>;

  // Proposals (full CRUD) — attach to an opportunity (ADR-0019)
  listProposals(): Promise<ProposalRow[]>;
  getProposal(id: string): Promise<ProposalEditable | null>;
  createProposal(input: ProposalInput): Promise<void>;
  updateProposal(id: string, input: ProposalInput): Promise<void>;
  deleteProposal(id: string): Promise<void>;

  // Delivery projects (full CRUD) — onboarding/implementation (ADR-0020)
  listProjects(): Promise<ProjectRow[]>;
  getProject(id: string): Promise<ProjectEditable | null>;
  createProject(input: ProjectInput): Promise<void>;
  updateProject(id: string, input: ProjectInput): Promise<void>;
  deleteProject(id: string): Promise<void>;

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
  listTickets(): Promise<TicketRow[]>;

  // Provenance: spawn downstream records that point back to the engagement
  spawnOpportunity(input: SpawnOpportunityInput): Promise<void>;
  spawnProject(input: SpawnProjectInput): Promise<void>;
  spawnTicket(input: SpawnTicketInput): Promise<void>;
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
}

// ── Communications (ADR-0011) ────────────────────────────────────────────────

/** Filter for the cross-contact communications feed. */
export interface InteractionFilter {
  contactId?: string;
  accountId?: string;
  source?: string;
  kind?: string;
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
 * Communications repository (ADR-0011): the universal multi-channel timeline plus
 * meeting action items. Reads are "gold" (agent-ready); createInteraction logs an
 * entry to the timeline (the actual provider send is stubbed in this phase).
 */
export interface CommsRepository {
  listInteractions(filter: InteractionFilter): Promise<InteractionRow[]>;
  listInteractionsByContact(contactId: string): Promise<InteractionRow[]>;
  listInteractionsByAccount(accountId: string): Promise<InteractionRow[]>;
  createInteraction(input: InteractionInput): Promise<void>;
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

/** Connections repository: per-user personal + company-wide, and the identity map. */
export interface ConnectionsRepository {
  /** Personal connections for the signed-in employee, resolved by email (ADR-0024). */
  listUserConnections(userEmail: string): Promise<ConnectionRow[]>;
  listCompanyConnections(): Promise<ConnectionRow[]>;
  connect(input: ConnectionInput): Promise<void>;
  disconnect(id: string): Promise<void>;
  listExternalIdentities(accountId: string): Promise<ExternalIdentityRow[]>;
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

/** Editable ad fields (an ad belongs to a campaign). */
export interface AdInput {
  name: string;
  status: string; // draft|active|paused|completed
  creative: string | null; // free-text headline/body for the scaffold
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
  leads: LeadsRepository;
  workflows: WorkflowsRepository;
}
