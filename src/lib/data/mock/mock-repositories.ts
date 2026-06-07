/**
 * Mock implementation of the data-access contracts (CLAUDE.md §7.4).
 *
 * Wraps the static fixtures in lib/mock-data so the rest of the app depends only
 * on the repository interfaces. Replaced by a Postgres-backed implementation
 * (ADR-0003) once DATABASE_URL is configured — see lib/data/index.ts.
 */
import {
  accounts,
  actionItems,
  agentMessages,
  audiences,
  campaigns,
  captureEvents,
  companyConnections,
  contacts,
  enrollments,
  interactions,
  kpis,
  leadHooks,
  mockAudienceMembers,
  mockConsentEvents,
  mockContactProfile,
  mockCurrentConsent,
  mockEnrichment,
  mockSocialIdentities,
  opportunities,
  pipeline,
  userConnections,
  workflows,
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
      return contacts;
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
      return contacts.map((c) => ({ id: c.id, name: `${c.fullName}${c.account ? ` (${c.account})` : ""}` }));
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
    async getActiveTemplate() {
      return null;
    },
    async listQuestionsForEditor() {
      return [];
    },
    async getQuestion() {
      return null;
    },
    async createQuestion() {
      throw new Error(NO_DB);
    },
    async updateQuestion() {
      throw new Error(NO_DB);
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
    async listAnswersForReview() {
      return [];
    },
    async confirmAnswer() {
      throw new Error(NO_DB);
    },
    async rejectAnswer() {
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
    async spawnOpportunity() {
      throw new Error(NO_DB);
    },
    async spawnProject() {
      throw new Error(NO_DB);
    },
    async spawnTicket() {
      throw new Error(NO_DB);
    },
  },
  comms: {
    async listInteractions(filter) {
      let rows = interactions;
      if (filter.source) rows = rows.filter((i) => i.source === filter.source);
      if (filter.kind) rows = rows.filter((i) => i.kind === filter.kind);
      return filter.limit ? rows.slice(0, filter.limit) : rows;
    },
    async listInteractionsByContact(contactId) {
      // Mock fixtures key the timeline to the first contact for illustration.
      return contactId === "ct_01"
        ? interactions.filter((i) => i.contact === "Dana Whitfield")
        : [];
    },
    async listInteractionsByAccount() {
      return interactions;
    },
    async createInteraction() {
      throw new Error(NO_DB);
    },
    async listActionItems() {
      return actionItems;
    },
    async completeActionItem() {
      throw new Error(NO_DB);
    },
  },
  contacts: {
    async getProfile(id) {
      return mockContactProfile(id);
    },
    async getContact() {
      return null;
    },
    async createContact() {
      throw new Error(NO_DB);
    },
    async updateContact() {
      throw new Error(NO_DB);
    },
    async deleteContact() {
      throw new Error(NO_DB);
    },
    async listSocialIdentities(id) {
      return mockSocialIdentities(id);
    },
    async listEnrichment(id) {
      return mockEnrichment(id);
    },
    async addEnrichment() {
      throw new Error(NO_DB);
    },
  },
  consent: {
    async listConsent(id) {
      return mockConsentEvents(id);
    },
    async currentConsent(id) {
      return mockCurrentConsent(id);
    },
    async recordConsentEvent() {
      throw new Error(NO_DB);
    },
    async canSend(id, channel) {
      return mockCurrentConsent(id).some((c) => c.channel === channel && c.state === "opt_in");
    },
    async canUseForAds(id) {
      return mockCurrentConsent(id).some((c) => c.channel === "ad_targeting" && c.state === "opt_in");
    },
  },
  connections: {
    async listUserConnections() {
      return userConnections;
    },
    async listCompanyConnections() {
      return companyConnections;
    },
    async connect() {
      throw new Error(NO_DB);
    },
    async disconnect() {
      throw new Error(NO_DB);
    },
    async listExternalIdentities() {
      return [];
    },
  },
  campaigns: {
    async listCampaigns() {
      return campaigns;
    },
    async getCampaign() {
      return null;
    },
    async createCampaign() {
      throw new Error(NO_DB);
    },
    async createAd() {
      throw new Error(NO_DB);
    },
    async listAudiences() {
      return audiences;
    },
    async getAudienceMembers(id) {
      return mockAudienceMembers(id);
    },
    async createAudience() {
      throw new Error(NO_DB);
    },
    async previewAudienceMembers() {
      return mockAudienceMembers("aud_01");
    },
    async launchAudience(id) {
      return mockAudienceMembers(id).filter((m) => m.adConsent).length;
    },
  },
  leads: {
    async listHooks() {
      return leadHooks;
    },
    async createHook() {
      throw new Error(NO_DB);
    },
    async listCaptureEvents() {
      return captureEvents;
    },
    async resolveEvent() {
      throw new Error(NO_DB);
    },
  },
  workflows: {
    async listWorkflows() {
      return workflows;
    },
    async getWorkflow() {
      return null;
    },
    async createWorkflow() {
      throw new Error(NO_DB);
    },
    async addStep() {
      throw new Error(NO_DB);
    },
    async deleteStep() {
      throw new Error(NO_DB);
    },
    async listEnrollments() {
      return enrollments;
    },
    async enroll() {
      throw new Error(NO_DB);
    },
    async exitEnrollment() {
      throw new Error(NO_DB);
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
    async revenueSplit() {
      return { oneTime: "$48K", recurring: "$326K/mo" };
    },
    async assessmentConversion() {
      return { delivered: 14, converted: 9, rate: "64%" };
    },
    async sbrDimensionAverages() {
      return [
        { label: "Identity Security", count: 2.4 },
        { label: "Endpoint Security", count: 2.8 },
        { label: "Network Segmentation", count: 2.1 },
        { label: "Email & Collaboration", count: 3.0 },
        { label: "Backup & Recovery", count: 3.3 },
        { label: "Incident Readiness", count: 2.2 },
      ];
    },
  },
};
