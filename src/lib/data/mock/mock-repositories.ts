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
    async listAssessments() {
      return [];
    },
    async getAssessment() {
      return null;
    },
    async createAssessment() {
      throw new Error(NO_DB);
    },
    async updateAssessment() {
      throw new Error(NO_DB);
    },
    async deleteAssessment() {
      throw new Error(NO_DB);
    },
    async accountOptions() {
      return accounts.map((a) => ({ id: a.id, name: a.name }));
    },
    async opportunityOptions() {
      return opportunities.map((o) => ({ id: o.id, name: `${o.account} — ${o.name}` }));
    },
    async contactOptions() {
      return [];
    },
    async assessmentOptions() {
      return [];
    },
  },
  agent: {
    async getConversation() {
      return agentMessages;
    },
  },
  engagements: {
    // No DB configured: questionnaires/engagements are empty and edits are disabled.
    async getQuestions() {
      return [];
    },
    async listDiscoveryCalls() {
      return [];
    },
    async getDiscoveryCall() {
      return null;
    },
    async createDiscoveryCall() {
      throw new Error(NO_DB);
    },
    async updateDiscoveryCall() {
      throw new Error(NO_DB);
    },
    async deleteDiscoveryCall() {
      throw new Error(NO_DB);
    },
    async listSbrs() {
      return [];
    },
    async getSbr() {
      return null;
    },
    async createSbr() {
      throw new Error(NO_DB);
    },
    async updateSbr() {
      throw new Error(NO_DB);
    },
    async deleteSbr() {
      throw new Error(NO_DB);
    },
    async saveAnswers() {
      throw new Error(NO_DB);
    },
    async saveSbrScores() {
      throw new Error(NO_DB);
    },
    async setSbrTickets() {
      throw new Error(NO_DB);
    },
    async listAssessmentArtifacts() {
      return [];
    },
    async listTickets() {
      return [];
    },
  },
  reports: {
    async getSummary() {
      return {
        activeMrr: "$326K/mo",
        openPipeline: "$1.84M",
        winRate: "62%",
        avgTimeToLive: "31d",
      };
    },
    async pipelineByStage() {
      return [
        { stage: "lead", count: 18, mrr: 640000 },
        { stage: "qualified", count: 11, mrr: 520000 },
        { stage: "proposal", count: 6, mrr: 410000 },
        { stage: "won", count: 42, mrr: 326000 },
        { stage: "lost", count: 9, mrr: 0 },
      ];
    },
    async proposalsByStatus() {
      return [
        { label: "draft", count: 4 },
        { label: "sent", count: 7 },
        { label: "accepted", count: 5 },
        { label: "declined", count: 2 },
      ];
    },
    async projectsByStatus() {
      return [
        { label: "not_started", count: 2 },
        { label: "in_progress", count: 5 },
        { label: "blocked", count: 1 },
        { label: "complete", count: 9 },
      ];
    },
  },
};
