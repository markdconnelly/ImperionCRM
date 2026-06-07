/**
 * Mock implementation of the data-access contracts (CLAUDE.md §7.4).
 *
 * Wraps the static fixtures in lib/mock-data so the rest of the app depends only
 * on the repository interfaces. Replaced by a Postgres-backed implementation
 * (ADR-0003) once DATABASE_URL is configured — see lib/data/index.ts.
 */
import {
  accounts,
  agentMessages,
  kpis,
  opportunities,
  pipeline,
} from "@/lib/mock-data";
import type { Repositories } from "@/lib/data/repositories";

export const mockRepositories: Repositories = {
  dashboard: {
    async getKpis() {
      return kpis;
    },
    async getPipeline() {
      return pipeline;
    },
    async getAccountsNeedingAttention() {
      return accounts;
    },
  },
  crm: {
    async listAccounts() {
      return accounts;
    },
    async listOpportunities() {
      return opportunities;
    },
  },
  agent: {
    async getConversation() {
      return agentMessages;
    },
  },
};
