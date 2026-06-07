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
  Kpi,
  OpportunityRow,
  PipelineColumn,
} from "@/types";

export interface DashboardRepository {
  getKpis(): Promise<Kpi[]>;
  getPipeline(): Promise<PipelineColumn[]>;
  getAccountsNeedingAttention(): Promise<Account[]>;
}

export interface CrmRepository {
  /** All accounts, for the Accounts list. */
  listAccounts(): Promise<Account[]>;
  /** All opportunities, for the Pipeline board. */
  listOpportunities(): Promise<OpportunityRow[]>;
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
