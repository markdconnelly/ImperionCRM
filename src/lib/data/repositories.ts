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
  ContactRow,
  Kpi,
  OpportunityRow,
  PipelineColumn,
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

  /** Account options for select dropdowns. */
  accountOptions(): Promise<Option[]>;
}

export interface AgentRepository {
  /** The orchestrator conversation feed shown in the agent panel. */
  getConversation(): Promise<AgentMessage[]>;
}

/** The full set of repositories a request can resolve. */
export interface Repositories {
  dashboard: DashboardRepository;
  crm: CrmRepository;
  agent: AgentRepository;
}
