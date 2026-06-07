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

const NO_DB =
  "Editing requires a configured database. Set the database connection to enable manual changes.";

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
    async getAccount() {
      return null;
    },
    async createAccount() {
      throw new Error(NO_DB);
    },
    async updateAccount() {
      throw new Error(NO_DB);
    },
    async deleteAccount() {
      throw new Error(NO_DB);
    },
    async listContacts() {
      return [];
    },
    async listOpportunities() {
      return opportunities;
    },
    async listTasks() {
      return [];
    },
    async getTask() {
      return null;
    },
    async createTask() {
      throw new Error(NO_DB);
    },
    async updateTask() {
      throw new Error(NO_DB);
    },
    async deleteTask() {
      throw new Error(NO_DB);
    },
    async listProposals() {
      return [];
    },
    async getProposal() {
      return null;
    },
    async createProposal() {
      throw new Error(NO_DB);
    },
    async updateProposal() {
      throw new Error(NO_DB);
    },
    async deleteProposal() {
      throw new Error(NO_DB);
    },
    async listProjects() {
      return [];
    },
    async getProject() {
      return null;
    },
    async createProject() {
      throw new Error(NO_DB);
    },
    async updateProject() {
      throw new Error(NO_DB);
    },
    async deleteProject() {
      throw new Error(NO_DB);
    },
    async accountOptions() {
      return accounts.map((a) => ({ id: a.id, name: a.name }));
    },
    async opportunityOptions() {
      return opportunities.map((o) => ({ id: o.id, name: `${o.account} — ${o.name}` }));
    },
  },
  agent: {
    async getConversation() {
      return agentMessages;
    },
  },
};
