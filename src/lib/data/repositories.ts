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
  AgentMessage,
  ArtifactRow,
  AssessmentRow,
  ContactRow,
  CountDatum,
  DiscoveryCallDetail,
  DiscoveryCallRow,
  Kpi,
  OpportunityRow,
  PipelineColumn,
  ProjectRow,
  ProposalRow,
  QuestionRow,
  QuestionTemplateRow,
  ReportSummary,
  SbrDetail,
  SbrRow,
  StageValueDatum,
  TaskRow,
  TicketRow,
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
}

/** The full set of repositories a request can resolve. */
export interface Repositories {
  dashboard: DashboardRepository;
  crm: CrmRepository;
  agent: AgentRepository;
  reports: ReportsRepository;
  engagements: EngagementsRepository;
}
