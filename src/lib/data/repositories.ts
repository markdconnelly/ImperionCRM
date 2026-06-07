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
  AssessmentRow,
  ContactRow,
  CountDatum,
  Kpi,
  OpportunityRow,
  PipelineColumn,
  ProjectRow,
  ProposalRow,
  ReportSummary,
  StageValueDatum,
  TaskRow,
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
}

export interface AgentRepository {
  /** The orchestrator conversation feed shown in the agent panel. */
  getConversation(): Promise<AgentMessage[]>;
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
}
