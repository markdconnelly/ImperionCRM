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
import type { Health, OnboardingMilestone, OnboardingStep } from "@/types";
import { ONBOARDING_TEMPLATE } from "@/lib/onboarding-template";

const NO_DB =
  "Editing requires a configured database. Set the database connection to enable manual changes.";

/** Lifecycle stages mock contacts are spread across (ADR-0031). */
const MOCK_STAGES = ["audience", "lead", "prospect", "client"] as const;

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
    async listAccountSources() {
      return [];
    },
    async listAccountRelatedBronze() {
      return [];
    },
    async listAccounts() {
      return accounts;
    },
    async getAccount() {
      return null;
    },
    async listDeviceInventory() {
      return [];
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
    async listContacts(opts?: { client?: boolean }) {
      if (opts?.client === undefined) return contacts;
      // Mock contacts carry no stage; the same deterministic spread used by
      // listContactsByStage decides who is a client (every 4th, index % 4 === 3).
      return contacts.filter((_, i) => (i % MOCK_STAGES.length === 3) === opts.client);
    },
    async listContactsByStage(opts?: { client?: boolean }) {
      // Spread mock contacts across the lifecycle so Leads/Contacts/Pipeline
      // render meaningfully without a DB.
      return contacts
        .map((c, i) => ({
          id: c.id,
          fullName: c.fullName,
          email: c.email,
          account: c.account,
          crmStage: MOCK_STAGES[i % MOCK_STAGES.length],
        }))
        .filter(
          (c) => opts?.client === undefined || (c.crmStage === "client") === opts.client,
        );
    },
    async setContactStage() {
      throw new Error(NO_DB);
    },
    async listOpportunities() {
      return opportunities;
    },
    async setOpportunityStage() {
      throw new Error(NO_DB);
    },
    async listTasks() {
      return [];
    },
    async listProjectTasks() {
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
    async listSalesTasks() {
      return [];
    },
    async createSalesTask() {
      throw new Error(NO_DB);
    },
    async setTaskStatus() {
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
    async listProjectTypes() {
      // The two seeded types (migration 0058) so the board renders in mock mode.
      return [
        {
          id: "pt-onboarding",
          key: "onboarding",
          name: "Onboarding",
          description: null,
          isProtected: true,
          projectCount: 0,
        },
        {
          id: "pt-implementation",
          key: "implementation",
          name: "Implementation",
          description: null,
          isProtected: false,
          projectCount: 0,
        },
      ];
    },
    async createProjectType() {
      throw new Error(NO_DB);
    },
    async deleteProjectType() {
      throw new Error(NO_DB);
    },
    async listOnboarding() {
      // Acme is instantiated from the standard playbook (ADR-0037): earlier
      // phases mostly checked off so the derived R/Y/G + checklist render.
      const acme: OnboardingMilestone[] = ONBOARDING_TEMPLATE.phases.map((ph, pi) => {
        const steps: OnboardingStep[] = ph.steps.map((st, si) => {
          const done = pi < 2 || (pi === 2 && si < Math.ceil(ph.steps.length / 2));
          return {
            id: `acme-${ph.ordinal}-${si}`,
            code: st.code,
            title: st.title,
            isComm: Boolean(st.send),
            status: done ? "done" : "open",
            due: null,
            deployKey: st.deployKey ?? null,
            deployRequestedAt: null,
            taskId: null,
          };
        });
        const total = steps.length;
        const doneN = steps.filter((s) => s.status === "done").length;
        return {
          id: `acme-m${ph.ordinal}`,
          name: ph.name,
          status: doneN === total ? "complete" : doneN > 0 ? "in_progress" : "not_started",
          health: (doneN === total ? "green" : "amber") as Health,
          start: null,
          due: null,
          stepsTotal: total,
          stepsDone: doneN,
          steps,
        };
      });
      // A simple R/Y/G project with no playbook applied yet (shows the Apply button).
      const simple = (id: string, names: string[], healths: Health[]): OnboardingMilestone[] =>
        healths.map((health, i) => ({
          id: `${id}-m${i}`,
          name: names[i] ?? `Phase ${i + 1}`,
          status: health === "green" ? "complete" : health === "red" ? "blocked" : "in_progress",
          health,
          start: null,
          due: null,
          stepsTotal: 0,
          stepsDone: 0,
          steps: [],
        }));
      return [
        { id: "pj_01", name: "Acme Onboarding", account: "Acme Co", type: "onboarding", status: "in_progress", targetLive: "2026-07-15", hasTemplate: true, milestones: acme },
        { id: "pj_02", name: "Northwind Onboarding", account: "Northwind", type: "onboarding", status: "not_started", targetLive: "2026-08-01", hasTemplate: false, milestones: simple("pj_02", ["Discovery", "Provisioning"], ["amber", "amber"]) },
      ];
    },
    async setMilestoneHealth() {
      throw new Error(NO_DB);
    },
    async applyOnboardingTemplate() {
      throw new Error(NO_DB);
    },
    async setOnboardingStepStatus() {
      throw new Error(NO_DB);
    },
    async requestOnboardingDeploy() {
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
    async userOptions() {
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
    async getTicketByRef() {
      return null;
    },
    async ticketFilterOptions() {
      return { statuses: [], priorities: [], queues: [] };
    },
    async listSavedViews() {
      return [];
    },
    async createSavedView() {
      throw new Error(NO_DB);
    },
    async updateSavedView() {
      throw new Error(NO_DB);
    },
    async deleteSavedView() {
      throw new Error(NO_DB);
    },
    async listContracts() {
      return [];
    },
    async listTemplates() {
      return [];
    },
    async createTemplate() {
      throw new Error(NO_DB);
    },
    async getQuestionTemplateIds() {
      return [];
    },
    async setQuestionTemplates() {
      throw new Error(NO_DB);
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
    async getInteraction(id) {
      const it = interactions.find((i) => i.id === id);
      if (!it) return null;
      const isMeeting = it.kind === "meeting" || it.source === "plaud" || it.source === "m365_teams";
      return {
        id: it.id,
        source: it.source,
        kind: it.kind,
        channel: it.channel,
        direction: it.direction,
        subject: it.subject,
        summary: it.summary,
        body: it.summary,
        owner: it.owner,
        contact: it.contact,
        contactId: null,
        account: it.account,
        accountId: null,
        occurredAt: it.occurredAt,
        meeting: isMeeting
          ? {
              platform: it.source === "plaud" ? "plaud" : it.source === "m365_teams" ? "teams" : "other",
              title: it.subject,
              copilotRecap: it.source === "m365_teams" ? it.summary : null,
              plaudSummary: it.source === "plaud" ? it.summary : null,
              transcriptRef: null,
            }
          : null,
        actionItems: actionItems,
      };
    },
    async createInteraction() {
      throw new Error(NO_DB);
    },
    async createMeeting() {
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
    async listContactSources() {
      return [];
    },
    async listContactRelatedBronze() {
      return [];
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
    async saveCompanyCredential(input) {
      // In-memory upsert by provider so the UI reflects saves without a DB (ADR-0036).
      const existing = companyConnections.find((c) => c.provider === input.provider);
      if (existing) {
        existing.displayName = input.displayName;
        existing.scopes = input.scopes;
        existing.keyvaultSecretRef = input.keyvaultSecretRef;
        existing.status = input.status;
      } else {
        companyConnections.push({
          id: `cn_${input.provider}`,
          scope: "company",
          provider: input.provider,
          displayName: input.displayName,
          status: input.status,
          scopes: input.scopes,
          owner: null,
          keyvaultSecretRef: input.keyvaultSecretRef,
          lastSync: null,
          connectedAt: null,
          pollIntervalMinutes: 60,
        });
      }
    },
    async setPollInterval(id, minutes) {
      // In-memory update so the cadence selector reflects without a DB (ADR-0038).
      const safe = Math.max(0, Math.floor(minutes));
      const row =
        userConnections.find((c) => c.id === id) ??
        companyConnections.find((c) => c.id === id);
      if (row) row.pollIntervalMinutes = safe;
    },
    async disconnect() {
      throw new Error(NO_DB);
    },
    async listExternalIdentities() {
      return [];
    },
  },
  events: {
    async listEvents() {
      return [];
    },
    async getEvent() {
      return null;
    },
    async createEvent(): Promise<string> {
      throw new Error(NO_DB);
    },
    async updateEvent() {
      throw new Error(NO_DB);
    },
    async listRegistrations() {
      return [];
    },
    async setRegistrationStatus() {
      throw new Error(NO_DB);
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
    async listSends() {
      return [];
    },
    async createSend() {
      throw new Error(NO_DB);
    },
    async cancelSend() {
      throw new Error(NO_DB);
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
  knowledge: {
    async search(query) {
      const q = query.trim().toLowerCase();
      if (q === "") return [];
      const hits = interactions
        .filter(
          (i) =>
            (i.summary ?? "").toLowerCase().includes(q) ||
            (i.subject ?? "").toLowerCase().includes(q),
        )
        .map((i) => ({
          id: i.id,
          kind: "interaction",
          title: i.subject ?? i.source,
          snippet: i.summary,
          href: "/communications",
          when: i.occurredAt,
        }));
      const contactHits = contacts
        .filter((c) => c.fullName.toLowerCase().includes(q))
        .map((c) => ({
          id: c.id,
          kind: "contact",
          title: c.fullName,
          snippet: c.account,
          href: `/contacts/${c.id}`,
          when: null,
        }));
      return [...contactHits, ...hits];
    },
  },
  security: {
    async getPosture() {
      return {
        totalContacts: contacts.length,
        contactsWithConsent: 1,
        adEligible: 1,
        connectionsActive: userConnections.filter((c) => c.status === "active").length,
        connectionsTotal: userConnections.length + companyConnections.length,
        consentByChannel: [
          { label: "email", count: 1 },
          { label: "sms", count: 1 },
          { label: "ad_targeting", count: 1 },
          { label: "data_enrichment", count: 1 },
        ],
      };
    },
    async listTenantMappings() {
      return [];
    },
    async listTenantMappingsForAccount() {
      return [];
    },
    async upsertTenantMapping() {
      throw new Error(NO_DB);
    },
    async deleteTenantMapping() {
      throw new Error(NO_DB);
    },
    async listUnmappedTenants() {
      return [];
    },
    async listTenantPostureForAccount() {
      return [];
    },
    async listPosturePoliciesForAccount() {
      return [];
    },
    async listSecureScoreControlsForAccount() {
      return [];
    },
    async listCredentialExposuresForAccount() {
      return [];
    },
    async countDefenderIncidentsForAccount() {
      // No DB → no Defender data; the badge renders nothing (total 0).
      return { open: 0, total: 0 };
    },
    async countMfaRegistrationForAccount() {
      // No DB → no auth-methods data; the badge renders nothing (total 0).
      return { registered: 0, total: 0 };
    },
    async listSharePointSitesForAccount() {
      // No DB → no site inventory; the section renders nothing (empty list).
      return [];
    },
  },
};
