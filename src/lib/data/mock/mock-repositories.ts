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
  journeys,
} from "@/lib/mock-data";
import { summariseJourney } from "@/lib/journey";
import type {
  Repositories,
  WorkCommentInput,
  WorkEventInput,
  WorkAttachmentInput,
  NotificationInput,
  TagApplicationInput,
  CustomFieldDefInput,
  CustomFieldValueInput,
  CustomFieldValueEntry,
  CustomFieldFilterInput,
  StatusDefRow,
  StatusDefInput,
} from "@/lib/data/repositories";
import type {
  Health,
  OnboardingMilestone,
  OnboardingStep,
  WorkComment,
  WorkAttachment,
  WorkActivityEntry,
  WorkParentType,
  WorkAssignmentRow,
  EngagementCounts,
  MentionableUser,
  Notification,
  NotificationKind,
  NotificationChannel,
  NotificationPref,
  Tag,
  AppliedTag,
  TagParentType,
  CustomFieldDef,
  CustomFieldValue,
  CustomFieldParentType,
  ReportDefinition,
  ReportDefinitionInput,
  Dashboard,
  DashboardInput,
  DashboardItem,
  DashboardItemInput,
  ConnectorInstance,
  ConnectorInstanceInput,
  ConnectorStatus,
  SegmentSummary,
  SegmentDetail,
  SegmentMemberRow,
  SegmentMemberSource,
  MessageTemplateRow,
  MessageTemplateOption,
  MessageTemplateInput,
  SegmentInput,
} from "@/types";
import { ONBOARDING_TEMPLATE } from "@/lib/onboarding-template";
import { resolveMentions } from "@/lib/mentions";

const NO_DB =
  "Editing requires a configured database. Set the database connection to enable manual changes.";

/** In-memory comment store so the comment/feed UI works in mock mode (ADR-0064 A1). */
const mockComments: WorkComment[] = [];
let mockCommentSeq = 0;

/** In-memory attachment store so the attachment UI works in mock mode (ADR-0064 A4). */
const mockAttachments: WorkAttachment[] = [];
let mockAttachmentSeq = 0;

/** In-memory notification store so the bell works in mock mode (ADR-0064 A3, #332). */
const mockNotifications: Notification[] = [];
let mockNotificationSeq = 0;

/**
 * In-memory notification-preference store so the prefs UI works in mock mode
 * (ADR-0064 A3, #601). Keyed `${userId}|${kind}|${channel}` → enabled; absence
 * of a key = the default (in-app ON). Single-viewer mock, so userId is honoured
 * but rarely varies.
 */
const mockNotificationPrefs = new Map<string, boolean>();
const prefKey = (userId: string, kind: NotificationKind, channel: NotificationChannel) =>
  `${userId}|${kind}|${channel}`;

/** A fixed mentionable roster so the @mention typeahead works in mock mode (A2, #331). */
const mockMentionableUsers: MentionableUser[] = [
  { id: "mock-user-ada", displayName: "Ada Lovelace", handle: "ada" },
  { id: "mock-user-grace", displayName: "Grace Hopper", handle: "grace" },
  { id: "mock-user-alan", displayName: "Alan Turing", handle: "alan" },
];

/** In-memory tag vocabulary + applications so the tags UI works in mock mode (ADR-0065 B6). */
interface MockTag {
  id: string;
  label: string;
  color: string;
}
interface MockApplication {
  tagId: string;
  parentType: TagParentType;
  parentId: string;
}
const mockTags: MockTag[] = [];
const mockTagApplications: MockApplication[] = [];
let mockTagSeq = 0;

/** Count work objects carrying a tag (mock usage rollup). */
function mockTagUsage(tagId: string): number {
  return mockTagApplications.filter((a) => a.tagId === tagId).length;
}

/** In-memory custom-field defs + values so the custom-fields UI works in mock mode (ADR-0065 B4, #338). */
interface MockFieldDef {
  id: string;
  scope: CustomFieldParentType;
  projectTypeId: string | null;
  projectTypeName: string | null;
  key: string;
  label: string;
  fieldType: CustomFieldDef["fieldType"];
  options: string[];
  required: boolean;
  ordinal: number;
}
interface MockFieldValue {
  fieldId: string;
  parentType: CustomFieldParentType;
  parentId: string;
  value: CustomFieldValue["value"];
}
const mockFieldDefs: MockFieldDef[] = [];
const mockFieldValues: MockFieldValue[] = [];
let mockFieldSeq = 0;

/**
 * In-memory report-builder store (ADR-0075, #410) so the builder accessors
 * round-trip without a DB. Rows carry the owner's email directly (mock has no
 * app_user catalog); reads resolve `isMine`/visibility against the viewer email
 * exactly like the Postgres impl. Tile deletes cascade in JS to mirror the
 * dashboard_id / report_definition_id ON DELETE CASCADE.
 */
interface MockReportDef extends ReportDefinitionInput {
  id: string;
  ownerEmail: string;
}
interface MockDashboard extends DashboardInput {
  id: string;
  ownerEmail: string;
}
interface MockDashboardItem {
  id: string;
  dashboardId: string;
  reportDefinitionId: string;
  position: Record<string, unknown>;
}
const mockReportDefs: MockReportDef[] = [];
const mockDashboards: MockDashboard[] = [];
const mockDashboardItems: MockDashboardItem[] = [];
let mockReportSeq = 0;

// ── CRM contact segments (ADR-0073 decision 2, #420/#421) — in-memory store + seq ──
interface MockSegment {
  id: string;
  name: string;
  description: string | null;
  type: "manual" | "rule";
  ownerEmail: string;
  ruleJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
const mockSegments: MockSegment[] = [];
const mockSegmentMembers: SegmentMemberRow[] = [];
let mockSegmentSeq = 0;

// Message templates (#731) — a couple of seeds so the no-DB dev surface + picker show data.
const mockMessageTemplates: MessageTemplateRow[] = [
  {
    id: "tpl_welcome",
    name: "Welcome email",
    channel: "email",
    subject: "Welcome to {{company}}",
    html: "<p>Hi {{firstName}}, thanks for connecting with us.</p>",
    body: null,
    mergeFields: ["company", "firstName"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_reminder_sms",
    name: "Reminder SMS",
    channel: "sms",
    subject: null,
    html: null,
    body: "Hi {{firstName}}, just a reminder about your upcoming review.",
    mergeFields: ["firstName"],
    updatedAt: new Date().toISOString(),
  },
];
let mockTemplateSeq = 0;

function toSegmentSummary(s: MockSegment): SegmentSummary {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    type: s.type,
    owner: s.ownerEmail,
    memberCount: mockSegmentMembers.filter((m) => m.segmentId === s.id).length,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}
function toSegmentDetail(s: MockSegment): SegmentDetail {
  return { ...toSegmentSummary(s), ruleJson: s.ruleJson };
}

// ── Connector instances (ADR-0076, #414) — in-memory store + seq ───────────────
interface MockConnectorInstance extends ConnectorInstanceInput {
  id: string;
  status: ConnectorStatus;
  lastSyncAt: string | null;
  health: Record<string, unknown>;
}
const mockConnectorInstances: MockConnectorInstance[] = [];
let mockConnectorSeq = 0;
const toConnectorInstance = (c: MockConnectorInstance): ConnectorInstance => ({
  id: c.id,
  connectorKey: c.connectorKey,
  accountScope: c.accountScope,
  status: c.status,
  grantedScopes: c.grantedScopes,
  cadenceOverrideMinutes: c.cadenceOverrideMinutes,
  lastSyncAt: c.lastSyncAt,
  health: c.health,
});

const toReportDef = (r: MockReportDef, viewerEmail: string | null): ReportDefinition => ({
  id: r.id,
  owner: r.ownerEmail,
  isMine: viewerEmail !== null && r.ownerEmail === viewerEmail,
  name: r.name,
  rootObject: r.rootObject,
  fields: r.fields,
  filters: r.filters,
  groupBy: r.groupBy,
  viz: r.viz,
  visibility: r.visibility,
});
const toDashboard = (d: MockDashboard, viewerEmail: string | null): Dashboard => ({
  id: d.id,
  owner: d.ownerEmail,
  isMine: viewerEmail !== null && d.ownerEmail === viewerEmail,
  name: d.name,
  layout: d.layout,
  visibility: d.visibility,
});
const toDashboardItem = (i: MockDashboardItem): DashboardItem => ({
  id: i.id,
  dashboardId: i.dashboardId,
  reportDefinitionId: i.reportDefinitionId,
  position: i.position,
});
/** Remove every dashboard_item pointing at a deleted dashboard or report (cascade). */
function cascadeDashboardItems(pred: (i: MockDashboardItem) => boolean): void {
  for (let j = mockDashboardItems.length - 1; j >= 0; j--) {
    if (pred(mockDashboardItems[j])) mockDashboardItems.splice(j, 1);
  }
}

/**
 * Mock status_def store (ADR-0065 B5, #616) — seeded with the global default sets
 * (migration 0104) so the admin CRUD surface round-trips without a DB. Mock has no
 * project_type catalog, so admin edits exercise the global scope.
 */
type MockStatusDef = StatusDefRow;
const mockStatusDefs: MockStatusDef[] = [
  { id: "sd-task-open", scope: "global", projectTypeId: null, context: "task", key: "open", label: "Open", color: "#8A93A6", category: "todo", ordinal: 0, wipLimit: null },
  { id: "sd-task-in_progress", scope: "global", projectTypeId: null, context: "task", key: "in_progress", label: "In Progress", color: "#5B8DEF", category: "in_progress", ordinal: 1, wipLimit: 3 },
  { id: "sd-task-done", scope: "global", projectTypeId: null, context: "task", key: "done", label: "Done", color: "#3FBF8F", category: "done", ordinal: 2, wipLimit: null },
  { id: "sd-project-not_started", scope: "global", projectTypeId: null, context: "project", key: "not_started", label: "Not Started", color: "#8A93A6", category: "todo", ordinal: 0, wipLimit: null },
  { id: "sd-project-in_progress", scope: "global", projectTypeId: null, context: "project", key: "in_progress", label: "In Progress", color: "#5B8DEF", category: "in_progress", ordinal: 1, wipLimit: null },
  { id: "sd-project-blocked", scope: "global", projectTypeId: null, context: "project", key: "blocked", label: "Blocked", color: "#E2615A", category: "in_progress", ordinal: 2, wipLimit: null },
  { id: "sd-project-complete", scope: "global", projectTypeId: null, context: "project", key: "complete", label: "Complete", color: "#3FBF8F", category: "done", ordinal: 3, wipLimit: null },
];
let mockStatusDefSeq = 0;

/** Sort field defs the way both the admin list and the per-form read present them. */
function sortFieldDefs(a: MockFieldDef, b: MockFieldDef): number {
  return a.scope.localeCompare(b.scope) || a.ordinal - b.ordinal || a.label.localeCompare(b.label);
}

/** Project a mock def onto the {@link CustomFieldDef} shape. */
function toFieldDef(d: MockFieldDef): CustomFieldDef {
  return {
    id: d.id,
    scope: d.scope,
    projectTypeId: d.projectTypeId,
    projectTypeName: d.projectTypeName,
    key: d.key,
    label: d.label,
    fieldType: d.fieldType,
    options: [...d.options],
    required: d.required,
    ordinal: d.ordinal,
  };
}

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
    async getIntelStrip() {
      return {
        newLeads7d: 6,
        ticketsOpened30d: 93,
        defenderOpen: 4,
        mfaPct: 81,
        socialEngagement30d: 357,
      };
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
    // CMDB CI register (#645) — no silver to project in mock mode, so the register
    // renders empty rather than crashing (acceptance: mock fallback returns []).
    async listConfigurationItems() {
      return [];
    },
    // CMDB relationship layer (#647) — no edges in mock mode; the panel + graph render
    // empty (never crash), and the writes throw (no DB) like the other overlay writes.
    async listCiRelationships() {
      return [];
    },
    async createCiRelationship() {
      throw new Error("createCiRelationship requires a database connection.");
    },
    async updateCiRelationship() {
      throw new Error("updateCiRelationship requires a database connection.");
    },
    async deleteCiRelationship() {
      throw new Error("deleteCiRelationship requires a database connection.");
    },
    async deriveCiRelationships() {
      return 0;
    },
    // CMDB criticality overlay (#648) — no overlay in mock mode; the write throws (no
    // DB) like the other overlay writes, and the derivation is a 0-row no-op.
    async setCiCriticalityOverride() {
      throw new Error("setCiCriticalityOverride requires a database connection.");
    },
    async deriveCiCriticality() {
      return 0;
    },
    async listInvoices() {
      return [];
    },
    async getCollectionsActivity() {
      return null;
    },
    // Collections worklist batched read (#678) — no overlays in mock mode.
    async getCollectionsActivityForMany() {
      return {};
    },
    async upsertCollectionsActivity() {
      throw new Error(NO_DB);
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
    // Deal/opportunity 360 (ADR-0068, #681) — synthesize accountId from the id
    // for no-DB dev; conversations return [] without a DB so the filter is moot.
    async getOpportunity(id: string) {
      const o = opportunities.find((x) => x.id === id);
      return o ? { ...o, accountId: `acc_${o.id}` } : null;
    },
    async setOpportunityStage() {
      throw new Error(NO_DB);
    },
    // Forecasting (ADR-0072, #381) — read model. No-DB / schema-lag fallback is
    // empty (the forecast fields + quota/snapshot tables are 0114; the forecast
    // surface is #383). Honest empty, like listTasks.
    async listOpportunityForecast() {
      return [];
    },
    async listQuotas() {
      return [];
    },
    // Forecast snapshots (ADR-0072 decision 5, #384) — read model over the 0114
    // forecast_snapshot table. Honest empty with no DB (snapshots are written by the
    // backend/pipeline nightly job, #382); the accuracy-trend reader supplies an
    // illustrative sample when this returns nothing.
    async listForecastSnapshots() {
      return [];
    },
    // Lead scoring (ADR-0073 decision 5, #401) — read model over 0116 lead_score.
    // Honest empty when there is no DB (scores are written by the backend/LP pass).
    async listLeadScores() {
      return [];
    },
    async listLeadScoresForContact() {
      return [];
    },
    // Chat sessions (ADR-0074 §5, #403) — read model over 0117 chat_session.
    // Honest empty with no DB (sessions are written by the backend chat process).
    async listChatSessions() {
      return [];
    },
    async listChatSessionsForContact() {
      return [];
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
    async listTaskTimeEntries() {
      // No DB: no logged time (ADR-0069 D1, #346). Read returns empty, never throws.
      return [];
    },
    async logTime() {
      throw new Error(NO_DB);
    },
    async getProjectTimeRollup() {
      // No DB: nothing logged, nothing estimated (#346 rollup).
      return { loggedMinutes: 0, estimateMinutes: null };
    },
    // Sprints / backlog (ADR-0069 D4, #349) — reads empty, writes throw NO_DB.
    async listSprints() {
      return [];
    },
    async getSprint() {
      return null;
    },
    async createSprint() {
      throw new Error(NO_DB);
    },
    async updateSprint() {
      throw new Error(NO_DB);
    },
    async closeSprint() {
      throw new Error(NO_DB);
    },
    async listSprintTasks() {
      return [];
    },
    async listBacklogTasks() {
      return [];
    },
    async setTaskSprint() {
      throw new Error(NO_DB);
    },
    // Agile reporting — burndown / velocity (C5, ADR-0066, #345) — reads empty/null.
    async getSprintBurndownData() {
      return null;
    },
    async listSprintVelocity() {
      return [];
    },
    // Baselines / planned-vs-actual (ADR-0069 D6, #351) — reads empty, capture throws.
    async listProjectBaselines() {
      return [];
    },
    async captureProjectBaseline() {
      throw new Error(NO_DB);
    },
    async getProjectSlippage() {
      return null;
    },
    // Recurring tasks (ADR-0070 E2, #353) — no series without a DB; writes throw,
    // completion-spawn is a silent no-op.
    async getTaskRecurrence() {
      return null;
    },
    async upsertTaskRecurrence() {
      throw new Error(NO_DB);
    },
    async clearTaskRecurrence() {
      throw new Error(NO_DB);
    },
    async advanceTaskRecurrence() {
      return null;
    },
    // Conversational intelligence (ADR-0068, #375) — read-only, no rows without a DB.
    async listConversationsForAccount() {
      return [];
    },
    async getConversation() {
      return null;
    },
    // E-signature envelopes (ADR-0071, #391) — read-only, no rows without a DB.
    async listEsignEnvelopesForProposal() {
      return [];
    },
    async getTaskChildren(parentId: string) {
      return { parentId, children: [], total: 0, done: 0 };
    },
    async reparentTask() {
      throw new Error(NO_DB);
    },
    async setTaskOrdinal() {
      throw new Error(NO_DB);
    },
    async getTaskDependencies(taskId: string) {
      return { taskId, blockedBy: [], blocks: [], blocked: false };
    },
    async addTaskDependency() {
      throw new Error(NO_DB);
    },
    async removeTaskDependency() {
      throw new Error(NO_DB);
    },
    async listBlockedProjectTasks() {
      return [];
    },
    async getWorkAssignments(parentType: string, parentId: string) {
      return {
        parentType,
        parentId,
        primary: null,
        assignees: [],
        watchers: [],
        viewerWatching: false,
      };
    },
    async listAssigneesForMany(): Promise<Record<string, WorkAssignmentRow[]>> {
      // No mock seed for work_assignment (the per-object getWorkAssignments mock
      // is empty too); the board renders no avatars without a DB. #608.
      return {};
    },
    async listEngagementCountsForMany(): Promise<Record<string, EngagementCounts>> {
      // No mock comment/attachment seed; absence = 0/0 on the card. #608.
      return {};
    },
    async setTaskAssignees() {
      throw new Error(NO_DB);
    },
    async setTaskWatch() {
      throw new Error(NO_DB);
    },
    async setTaskPrimary() {
      throw new Error(NO_DB);
    },
    async listProjectTaskDependencies() {
      return [];
    },
    async listWorkload() {
      // Mock load (ADR-0069 D1/D2, #591) so the workload view renders without a DB.
      // HOURS vs each user's weekly capacity (the #346/#580 heavy lane authors the
      // table this wave). Ada is over (44h vs 40 cap), Grace near (34h vs 40), Alan
      // idle, Edsger has no capacity set yet (weeklyHours null → ok).
      return [
        { userId: "mock-user-ada", name: "Ada Lovelace", estimatedHours: 44, weeklyHours: 40, openTasks: 9, dueSoon: 4, overdue: 2 },
        { userId: "mock-user-grace", name: "Grace Hopper", estimatedHours: 34, weeklyHours: 40, openTasks: 5, dueSoon: 2, overdue: 0 },
        { userId: "mock-user-alan", name: "Alan Turing", estimatedHours: 6, weeklyHours: 40, openTasks: 1, dueSoon: 0, overdue: 0 },
        { userId: "mock-user-edsger", name: "Edsger Dijkstra", estimatedHours: 12, weeklyHours: null, openTasks: 2, dueSoon: 1, overdue: 0 },
      ];
    },
    // #591 user_capacity — per-user weekly-hours capacity (ADR-0069 D2). Read returns
    // a demo roster so the admin surface renders without a DB; write fails honestly.
    async listUserCapacity() {
      return [
        { userId: "mock-user-ada", name: "Ada Lovelace", weeklyHours: 40 },
        { userId: "mock-user-grace", name: "Grace Hopper", weeklyHours: 40 },
        { userId: "mock-user-alan", name: "Alan Turing", weeklyHours: 40 },
        { userId: "mock-user-edsger", name: "Edsger Dijkstra", weeklyHours: null },
      ];
    },
    async setUserCapacity() {
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
    async setTaskStatusDef() {
      throw new Error(NO_DB);
    },
    async setTaskCategory() {
      throw new Error(NO_DB);
    },
    async setTaskDue() {
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
    async listPortfolio() {
      return [];
    },
    async listGoals() {
      // Demo goals (ADR-0069 D3, #348) so the goals view renders without a DB. One
      // rollup goal with two linked projects (one done, one quarter-done → weighted
      // rollup), one manual goal. Percents mirror lib/goals.ts.
      return [
        {
          id: "mock-goal-onboard",
          name: "Onboard 8 new clients this quarter",
          owner: "Grace Hopper",
          period: "Q3 2026",
          target: 8,
          current: 3,
          progressMode: "rollup" as const,
          notes: null,
          manualPercent: 38,
          rolledUpPercent: 63,
          displayPercent: 63,
          links: [
            {
              projectId: "mock-proj-acme",
              name: "Acme onboarding",
              account: "Acme Corp",
              status: "complete",
              weight: 1,
              percentComplete: 100,
            },
            {
              projectId: "mock-proj-globex",
              name: "Globex onboarding",
              account: "Globex",
              status: "in_progress",
              weight: 1,
              percentComplete: 25,
            },
          ],
          taskLinks: [],
        },
        {
          id: "mock-goal-csat",
          name: "Lift CSAT to 95%",
          owner: "Ada Lovelace",
          period: "FY26 H2",
          target: 95,
          current: 88,
          progressMode: "manual" as const,
          notes: "Tracked manually off the survey dashboard.",
          manualPercent: 93,
          rolledUpPercent: null,
          displayPercent: 93,
          links: [],
          taskLinks: [],
        },
      ];
    },
    async getGoal() {
      return null;
    },
    async createGoal() {
      throw new Error(NO_DB);
    },
    async updateGoal() {
      throw new Error(NO_DB);
    },
    async deleteGoal() {
      throw new Error(NO_DB);
    },
    async addGoalLink() {
      throw new Error(NO_DB);
    },
    async removeGoalLink() {
      throw new Error(NO_DB);
    },
    async goalLinkCandidates() {
      return { projects: [], tasks: [] };
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
    async setProjectStatus() {
      throw new Error(NO_DB);
    },
    async setProjectStatusDef() {
      throw new Error(NO_DB);
    },
    async setProjectType() {
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
    // Configurable statuses (ADR-0065 B5, #339/#616) — backed by the seeded mock
    // store so the board renders AND the admin CRUD surface round-trips in mock
    // mode. Mock has no per-type sets, so projectTypeId is ignored and the global
    // defaults are returned, ordered by ordinal.
    async listStatusDefs(context: string): Promise<StatusDefRow[]> {
      return mockStatusDefs
        .filter((s) => s.context === context && s.scope === "global")
        .sort((a, b) => a.ordinal - b.ordinal || a.label.localeCompare(b.label))
        .map((s) => ({ ...s }));
    },
    async listStatusDefsForScope(
      context: string,
      scope: string,
      projectTypeId: string | null,
    ): Promise<StatusDefRow[]> {
      return mockStatusDefs
        .filter(
          (s) =>
            s.context === context &&
            s.scope === scope &&
            (s.projectTypeId ?? null) === (projectTypeId ?? null),
        )
        .sort((a, b) => a.ordinal - b.ordinal || a.label.localeCompare(b.label))
        .map((s) => ({ ...s }));
    },
    async createStatusDef(input: StatusDefInput): Promise<StatusDefRow> {
      const row: MockStatusDef = {
        id: `mock-status-${++mockStatusDefSeq}`,
        scope: input.scope,
        projectTypeId: input.scope === "project_type" ? input.projectTypeId : null,
        context: input.context,
        key: input.key.trim(),
        label: input.label.trim(),
        color: input.color,
        category: input.category,
        ordinal: input.ordinal,
        wipLimit: input.wipLimit,
      };
      mockStatusDefs.push(row);
      return { ...row };
    },
    async updateStatusDef(
      id: string,
      input: StatusDefInput,
    ): Promise<StatusDefRow | null> {
      const row = mockStatusDefs.find((s) => s.id === id);
      if (!row) return null;
      row.scope = input.scope;
      row.projectTypeId = input.scope === "project_type" ? input.projectTypeId : null;
      row.context = input.context;
      row.key = input.key.trim();
      row.label = input.label.trim();
      row.color = input.color;
      row.category = input.category;
      row.ordinal = input.ordinal;
      row.wipLimit = input.wipLimit;
      return { ...row };
    },
    async deleteStatusDef(id: string): Promise<boolean> {
      const i = mockStatusDefs.findIndex((s) => s.id === id);
      if (i === -1) return false;
      mockStatusDefs.splice(i, 1);
      return true;
    },
    async reorderStatusDefs(order: { id: string; ordinal: number }[]): Promise<void> {
      for (const o of order) {
        const row = mockStatusDefs.find((s) => s.id === o.id);
        if (row) row.ordinal = o.ordinal;
      }
    },
    // Delivery templates (ADR-0081) — one seed so the manager/picker render in mock mode.
    async listDeliveryTemplates(opts?: { activeOnly?: boolean; projectTypeId?: string }) {
      const all = [
        {
          id: "dt-network-refresh",
          key: "network_refresh",
          name: "Standard Network Refresh",
          description: "Switch/firewall/AP replacement delivery playbook.",
          version: 1,
          projectTypeId: null,
          projectTypeName: null,
          isActive: true,
          phaseCount: 2,
          taskCount: 3,
        },
      ];
      return all.filter((t) => (opts?.activeOnly ? t.isActive : true));
    },
    async getDeliveryTemplate(id: string) {
      if (id !== "dt-network-refresh") return null;
      return {
        id: "dt-network-refresh",
        key: "network_refresh",
        name: "Standard Network Refresh",
        description: "Switch/firewall/AP replacement delivery playbook.",
        version: 1,
        projectTypeId: null,
        projectTypeName: null,
        isActive: true,
        phases: [
          {
            id: "dt-nr-p1",
            ordinal: 0,
            name: "Procurement & Staging",
            offsetDays: 0,
            durationDays: 10,
            tasks: [
              { id: "dt-nr-t1", ordinal: 0, title: "Order hardware", offsetDays: 0, durationDays: 5, dispatchesTicket: false, ticketQueueId: null, ticketTitle: null, ticketLeadDays: 0 },
              { id: "dt-nr-t2", ordinal: 1, title: "Stage & configure", offsetDays: 5, durationDays: 5, dispatchesTicket: false, ticketQueueId: null, ticketTitle: null, ticketLeadDays: 0 },
            ],
          },
          {
            id: "dt-nr-p2",
            ordinal: 1,
            name: "Cutover",
            offsetDays: 10,
            durationDays: 2,
            tasks: [
              { id: "dt-nr-t3", ordinal: 0, title: "On-site cutover", offsetDays: 10, durationDays: 1, dispatchesTicket: true, ticketQueueId: 29683483, ticketTitle: "Network cutover — on-site", ticketLeadDays: 2 },
            ],
          },
        ],
      };
    },
    async createDeliveryTemplate() {
      throw new Error(NO_DB);
    },
    async deleteDeliveryTemplate() {
      throw new Error(NO_DB);
    },
    async instantiateDeliveryTemplate() {
      // Instantiation writes a project + milestones/tasks + provisioning/fire rows
      // in one transaction — it needs a database, so it fails honestly rather than
      // pretend to persist (mirrors createProject / createDeliveryTemplate).
      throw new Error(NO_DB);
    },
    // Project templates (ADR-0070 E1, #352) — one seed so the manager/picker render.
    async listProjectTemplates() {
      return [
        {
          id: "ptpl-implementation",
          key: "implementation",
          name: "Implementation",
          description: "Standard 4-milestone implementation playbook.",
          projectTypeId: null,
          projectTypeName: null,
          isProtected: false,
          milestoneCount: 4,
          itemCount: 0,
        },
        {
          id: "ptpl-standard_msp",
          key: "standard_msp",
          name: "Standard MSP Onboarding",
          description: "Seeded protected default — delegates to the onboarding playbook.",
          projectTypeId: null,
          projectTypeName: null,
          isProtected: true,
          milestoneCount: 9,
          itemCount: 0,
        },
      ];
    },
    async getProjectTemplate(id: string) {
      if (id !== "ptpl-implementation") return null;
      const ms = ["Discovery", "Build", "Validate", "Go-live"];
      return {
        id: "ptpl-implementation",
        key: "implementation",
        name: "Implementation",
        description: "Standard 4-milestone implementation playbook.",
        projectTypeId: null,
        projectTypeName: null,
        isProtected: false,
        items: ms.map((name, i) => ({
          id: `ptpl-impl-m${i}`,
          parentId: null,
          kind: "milestone" as const,
          ordinal: i,
          title: name,
          offsetDays: i * 7,
          durationDays: 7,
        })),
      };
    },
    async createProjectTemplate() {
      throw new Error(NO_DB);
    },
    async updateProjectTemplate() {
      // Re-snapshots the template_item tree in one transaction — needs a database.
      throw new Error(NO_DB);
    },
    async deleteProjectTemplate() {
      throw new Error(NO_DB);
    },
    async instantiateProjectTemplate() {
      // Writes a project + milestones/tasks in one transaction — needs a database.
      throw new Error(NO_DB);
    },
    // Task checklist templates (ADR-0070 E1-F3, #633) — one seed so the manager/picker render.
    async listChecklistTemplates() {
      return [
        {
          id: "cltpl-onboarding-checks",
          name: "New-hire onboarding checks",
          description: "Standard subtasks to run on a new-hire onboarding task.",
          itemCount: 3,
        },
      ];
    },
    async getChecklistTemplate(id: string) {
      if (id !== "cltpl-onboarding-checks") return null;
      return {
        id: "cltpl-onboarding-checks",
        name: "New-hire onboarding checks",
        description: "Standard subtasks to run on a new-hire onboarding task.",
        items: ["Create accounts", "Assign hardware", "Schedule orientation"],
      };
    },
    async createChecklistTemplate() {
      throw new Error(NO_DB);
    },
    async deleteChecklistTemplate() {
      throw new Error(NO_DB);
    },
    async applyChecklistTemplateToTask() {
      // Writes subtasks under the target task in one transaction — needs a database.
      throw new Error(NO_DB);
    },
    // Intake forms (ADR-0070 E3, #354) — one seed so the manager + renderer render.
    async listIntakeForms() {
      return [
        {
          id: "intake-new-client-request",
          key: "new_client_request",
          name: "New client request",
          description: "Capture an internal request and file it as a task.",
          defaultProjectName: null,
          defaultCategory: "general",
          isActive: true,
          fieldCount: 2,
          submissionCount: 0,
        },
      ];
    },
    async getIntakeForm(id: string) {
      if (id !== "intake-new-client-request") return null;
      return {
        id: "intake-new-client-request",
        key: "new_client_request",
        name: "New client request",
        description: "Capture an internal request and file it as a task.",
        fields: [
          { key: "summary", label: "Summary", type: "text" as const, required: true, options: [], mapsTo: "title" as const },
          { key: "details", label: "Details", type: "textarea" as const, required: false, options: [], mapsTo: "detail" as const },
        ],
        defaultProjectId: null,
        defaultAccountId: null,
        defaultOwnerUserId: null,
        defaultCategory: "general",
        isActive: true,
        defaultProjectName: null,
        defaultAccountName: null,
        defaultOwnerName: null,
      };
    },
    async createIntakeForm() {
      throw new Error(NO_DB);
    },
    async updateIntakeForm() {
      // Patches an existing form's definition in place — needs a database.
      throw new Error(NO_DB);
    },
    async deleteIntakeForm() {
      throw new Error(NO_DB);
    },
    async submitIntakeForm() {
      // Writes a task + submission in one transaction — needs a database.
      throw new Error(NO_DB);
    },
    async listIntakeSubmissions() {
      return [];
    },
    // Delivery board (#568) — no demo provisioned projects, so the read returns
    // empty (the board renders its empty state); the fire-intent write needs a
    // database, so it fails honestly rather than pretend to persist.
    async listProvisionedProjects() {
      return [];
    },
    async scheduleTaskFire() {
      throw new Error(NO_DB);
    },
    // Time tracking (ADR-0082) — reads return empty (no demo timesheets); writes
    // need a database, so they fail honestly rather than pretend to persist.
    async listTimesheets() {
      return [];
    },
    async getTimesheetForWeek() {
      return null;
    },
    async ensureTimesheetForWeek() {
      throw new Error(NO_DB);
    },
    async addTimeEntry() {
      throw new Error(NO_DB);
    },
    async updateTimeEntry() {
      throw new Error(NO_DB);
    },
    async deleteTimeEntry() {
      throw new Error(NO_DB);
    },
    async submitTimesheet() {
      throw new Error(NO_DB);
    },
    async listSubmittedTimesheets() {
      return [];
    },
    async listAllTimesheets() {
      return [];
    },
    async approveTimesheet() {
      throw new Error(NO_DB);
    },
    async reopenTimesheet() {
      throw new Error(NO_DB);
    },
    async listPayrollTimesheets() {
      return [];
    },
    async payrollApproveTimesheet() {
      throw new Error(NO_DB);
    },
    async unapprovePayrollTimesheet() {
      throw new Error(NO_DB);
    },
    async markTimesheetPaid() {
      throw new Error(NO_DB);
    },
    async getTimesheetById() {
      return null;
    },
    async correctSubmittedTimesheet() {
      throw new Error(NO_DB);
    },
    async listEmployeeMappings() {
      return [];
    },
    async confirmEmployeeMapping() {
      throw new Error(NO_DB);
    },
    // Mileage rate (ADR-0083, #490) — comp data: the read returns empty (no demo rate);
    // the write needs a database, so it fails honestly rather than pretend to persist.
    async listMileageRates() {
      return [];
    },
    async setMileageRate() {
      throw new Error(NO_DB);
    },
    // Expense tracking (ADR-0083) — reads return empty (no demo reports); writes
    // need a database, so they fail honestly rather than pretend to persist.
    async listExpenseReports() {
      return [];
    },
    async getExpenseReportForPeriod() {
      return null;
    },
    async ensureExpenseReportForPeriod() {
      throw new Error(NO_DB);
    },
    async submitExpenseReport() {
      throw new Error(NO_DB);
    },
    async reopenExpenseReport() {
      throw new Error(NO_DB);
    },
    async listAllExpenseReports() {
      return [];
    },
    async getExpenseReportById() {
      return null;
    },
    async getExpenseReimbursementMatch() {
      return null;
    },
    async approveExpenseReport() {
      throw new Error(NO_DB);
    },
    async financeApproveExpenseReport() {
      throw new Error(NO_DB);
    },
    async markExpenseReportReimbursed() {
      throw new Error(NO_DB);
    },
    async rejectExpenseReport() {
      throw new Error(NO_DB);
    },
    // Expense item CRUD + reference/read models (ADR-0083, #486): reads return empty
    // (no demo data); writes need a database, so they fail honestly rather than pretend.
    async addExpenseItem() {
      throw new Error(NO_DB);
    },
    async updateExpenseItem() {
      throw new Error(NO_DB);
    },
    async deleteExpenseItem() {
      throw new Error(NO_DB);
    },
    async correctSubmittedExpenseReport() {
      throw new Error(NO_DB);
    },
    async listExpenseCategories() {
      return [];
    },
    async listExpenseCategoriesAdmin() {
      return [];
    },
    async listQboExpenseAccounts() {
      return [];
    },
    async updateExpenseCategoryMapping() {
      throw new Error(NO_DB);
    },
    async listMileiqDrives() {
      return [];
    },
    async listExpensePolicyViolations() {
      return [];
    },
    async listMonthlyClose() {
      return [];
    },
    async listAllMonthlyClose() {
      return [];
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
    async taskOptions() {
      return [];
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
    // No DB configured: the autonomy dial has no rows, so return null. The caller
    // assumes DEFAULT_AUTONOMY_RUNG (the safe draft posture) — "no data" ⇒ stay
    // conservative (ADR-0087, #721).
    async getAutonomyPolicy() {
      return null;
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
    async listTicketSlaBreaches() {
      return [];
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
    async listDirectoryGroups() {
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
    async listJourneys() {
      return journeys.map((j) => {
        const s = summariseJourney(j.definition);
        return {
          id: j.id,
          name: j.name,
          status: j.status,
          stepCount: s.stepCount,
          sendCount: s.sendCount,
          hasAbTest: s.hasAbTest,
          activeEnrollments: j.activeEnrollments,
        };
      });
    },
    async getJourney(id: string) {
      const j = journeys.find((x) => x.id === id);
      if (!j) return null;
      return {
        id: j.id,
        name: j.name,
        status: j.status,
        definition: j.definition,
        summary: summariseJourney(j.definition),
        activeEnrollments: j.activeEnrollments,
      };
    },
    // Builder writes (ADR-0073, #399) mutate the in-memory array so the no-DB dev
    // surface persists a created/edited journey within the session.
    async createJourney(name: string) {
      const id = `jny_${Date.now().toString(36)}`;
      journeys.push({
        id,
        name,
        status: "paused",
        activeEnrollments: 0,
        definition: { steps: [], entryStepKey: null, sourceSegmentIds: [] },
      });
      return id;
    },
    async saveJourney(id, input) {
      const j = journeys.find((x) => x.id === id);
      if (!j) return;
      j.name = input.name;
      j.status = input.status;
      j.definition = input.definition;
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
      // Category rollup (ADR-0065 B5, #615): buckets key off status_def.category,
      // not the raw label, so blocked (in_progress) and complete (done) roll up.
      // Seeded mapping: not_started→To Do, in_progress+blocked→In Progress (5+1),
      // complete→Done. Ordered by the canonical category lifecycle.
      return [
        { label: "To Do", count: 2 },
        { label: "In Progress", count: 6 },
        { label: "Done", count: 9 },
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
    async marketingSocial() {
      return {
        leadsBySource30d: [
          { label: "facebook_dm", count: 14 },
          { label: "web_form", count: 6 },
          { label: "event_registration", count: 4 },
          { label: "inbound_email", count: 2 },
        ],
        socialStats: [
          { platform: "instagram", metric: "followers_count", value: 412, window: "lifetime" as const },
          { platform: "facebook", metric: "page_impressions_unique", value: 1840, window: "28d" as const },
          { platform: "facebook", metric: "page_post_engagements", value: 263, window: "28d" as const },
          { platform: "facebook", metric: "page_views_total", value: 97, window: "28d" as const },
        ],
        engagement30d: {
          fbPosts: 9,
          fbReactions: 122,
          fbComments: 18,
          fbShares: 11,
          igMedia: 6,
          igLikes: 204,
          igComments: 13,
        },
        topCampaigns: [
          { name: "Spring security webinar", platform: "facebook", spend: 1200, clicks: 340, leads: 22 },
          { name: "Managed IT awareness", platform: "linkedin", spend: 800, clicks: 150, leads: 9 },
        ],
      };
    },
    async serviceDesk() {
      return {
        byStatus: [
          { label: "New", count: 69 },
          { label: "Complete", count: 29 },
          { label: "Status 8", count: 3 },
          { label: "Status 7", count: 1 },
        ],
        byQueue: [
          { label: "unassigned", count: 80 },
          { label: "Queue 6", count: 12 },
          { label: "Queue 8", count: 10 },
        ],
        openedByWeek: [
          { label: "2026-05-04", count: 9 },
          { label: "2026-05-11", count: 14 },
          { label: "2026-05-18", count: 11 },
          { label: "2026-05-25", count: 17 },
          { label: "2026-06-01", count: 22 },
          { label: "2026-06-08", count: 19 },
        ],
        total: 102,
        opened30d: 93,
        defenderLinked: 2,
      };
    },
    async securityFleet() {
      return {
        tenants: 4,
        secureScorePct: 72,
        policyMix: [
          { label: "compliant", count: 38 },
          { label: "drift", count: 7 },
          { label: "ungoverned", count: 4 },
          { label: "missing", count: 9 },
        ],
        mfa: { registered: 118, total: 146 },
        defenderOpenBySeverity: [
          { label: "high", count: 1 },
          { label: "medium", count: 3 },
          { label: "low", count: 5 },
        ],
        intune: { compliant: 92, total: 104 },
        exposuresOpen: 6,
      };
    },
    async timeEfficiency(includeLaborCost: boolean) {
      // Utilization is comp-free; labor cost is aggregate-only and withheld unless
      // the caller is gated in (finance|admin) — mirrors the postgres comp gate.
      return {
        utilization: {
          billableMinutes: 18_240, // 304h
          internalMinutes: 6_360, // 106h
          adminMinutes: 3_000, // 50h
        },
        laborCost: includeLaborCost
          ? { approvedHours: 460, totalCost: 27_600, blendedHourlyRate: 60 }
          : null,
      };
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
    async listDnsDomainsForAccount() {
      return [];
    },
    async listDnsRecordDriftForAccount() {
      // No DB → no DNS captures; the record-level drift list renders nothing.
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

  // ── Work collaboration: comments + activity feed (ADR-0064 A1) ──────────────
  work: {
    async listMentionableUsers(): Promise<MentionableUser[]> {
      return [...mockMentionableUsers];
    },
    async listComments(parentType: WorkParentType, parentId: string) {
      return mockComments
        .filter((c) => c.parentType === parentType && c.parentId === parentId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async listActivity(
      parentType: WorkParentType,
      parentId: string,
      opts?: { commentsOnly?: boolean; limit?: number; offset?: number },
    ): Promise<WorkActivityEntry[]> {
      // Mock has no audit_log fixture → the feed is comments-only here.
      const offset = opts?.offset ?? 0;
      const limit = opts?.limit ?? 50;
      return mockComments
        .filter((c) => c.parentType === parentType && c.parentId === parentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(offset, offset + limit)
        .map((c) => ({
          id: c.id,
          kind: "comment" as const,
          parentType: c.parentType,
          parentId: c.parentId,
          actorUserId: c.authorUserId,
          actor: c.author,
          body: c.body,
          action: null,
          detail: null,
          editedAt: c.editedAt,
          occurredAt: c.createdAt,
          mentions: c.mentions,
        }));
    },
    async addComment(input: WorkCommentInput): Promise<WorkComment> {
      const row: WorkComment = {
        id: `mock-comment-${++mockCommentSeq}`,
        parentType: input.parentType,
        parentId: input.parentId,
        authorUserId: input.authorUserId,
        author: "You",
        body: input.body,
        editedAt: null,
        createdAt: new Date().toISOString(),
        mentions: resolveMentions(input.body, mockMentionableUsers).map((u) => ({
          userId: u.id, handle: u.handle, displayName: u.displayName,
        })),
      };
      mockComments.push(row);
      return row;
    },
    async editComment(id: string, body: string): Promise<WorkComment | null> {
      const row = mockComments.find((c) => c.id === id);
      if (!row) return null;
      row.body = body;
      row.editedAt = new Date().toISOString();
      row.mentions = resolveMentions(body, mockMentionableUsers).map((u) => ({
        userId: u.id, handle: u.handle, displayName: u.displayName,
      }));
      return row;
    },
    async deleteComment(id: string): Promise<boolean> {
      const i = mockComments.findIndex((c) => c.id === id);
      if (i === -1) return false;
      mockComments.splice(i, 1);
      return true;
    },
    async emitWorkEvent(input: WorkEventInput): Promise<void> {
      // Mock has no audit_log fixture (listActivity is comments-only here), so a
      // system event is a no-op — the postgres repo records it for real (#438).
      void input;
    },
  },

  // ── Attachments (ADR-0064 A4, #333) ────────────────────────────────────────
  attachments: {
    async listAttachments(parentType: WorkParentType, parentId: string): Promise<WorkAttachment[]> {
      return mockAttachments
        .filter((a) => a.parentType === parentType && a.parentId === parentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async addAttachment(input: WorkAttachmentInput): Promise<WorkAttachment> {
      const row: WorkAttachment = {
        id: `mock-attachment-${++mockAttachmentSeq}`,
        parentType: input.parentType,
        parentId: input.parentId,
        storageRef: input.storageRef,
        filename: input.filename,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        uploadedByUserId: input.uploadedByUserId,
        uploadedBy: "You",
        createdAt: new Date().toISOString(),
      };
      mockAttachments.push(row);
      return row;
    },
    async removeAttachment(id: string): Promise<boolean> {
      const i = mockAttachments.findIndex((a) => a.id === id);
      if (i === -1) return false;
      mockAttachments.splice(i, 1);
      return true;
    },
  },

  // ── Notifications — the in-app bell (ADR-0064 A3, #332) ─────────────────────
  notifications: {
    async listForUser(
      recipientUserId: string,
      opts?: { unreadOnly?: boolean; limit?: number },
    ): Promise<Notification[]> {
      const limit = opts?.limit ?? 30;
      // The mock store has no recipient column (single-viewer mock) — return the
      // seeded/dispatched rows so the bell renders. unreadOnly trims to unread.
      void recipientUserId;
      return mockNotifications
        .filter((n) => (opts?.unreadOnly ? !n.read : true))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
    async unreadCount(): Promise<number> {
      return mockNotifications.filter((n) => !n.read).length;
    },
    async markRead(id: string): Promise<boolean> {
      const row = mockNotifications.find((n) => n.id === id);
      if (!row || row.read) return false;
      row.read = true;
      return true;
    },
    async markAllRead(): Promise<void> {
      for (const n of mockNotifications) n.read = true;
    },
    async dispatch(input: NotificationInput, recipientUserIds: string[]): Promise<void> {
      // Never notify the actor; dedupe the recipient set. The mock store has no
      // recipient column (single-viewer), so it pushes one row per recipient.
      const recipients = Array.from(new Set(recipientUserIds)).filter(
        (uid) => uid && uid !== input.actorUserId,
      );
      for (let i = 0; i < recipients.length; i++) {
        mockNotifications.push({
          id: `mock-notification-${++mockNotificationSeq}`,
          kind: input.kind,
          parentType: input.parentType,
          parentId: input.parentId,
          actor: (input.payload.actor as string | undefined) ?? null,
          title: (input.payload.title as string | undefined) ?? input.kind,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    },
    async listPrefs(userId: string): Promise<NotificationPref[]> {
      const out: NotificationPref[] = [];
      for (const [key, enabled] of mockNotificationPrefs) {
        const [uid, kind, channel] = key.split("|");
        if (uid !== userId) continue;
        out.push({
          kind: kind as NotificationKind,
          channel: channel as NotificationChannel,
          enabled,
        });
      }
      return out;
    },
    async setPref(
      userId: string,
      kind: NotificationKind,
      channel: NotificationChannel,
      enabled: boolean,
    ): Promise<void> {
      mockNotificationPrefs.set(prefKey(userId, kind, channel), enabled);
    },
  },

  // ── Tags / labels (ADR-0065 B6, #340) ──────────────────────────────────────
  tags: {
    async listTags(): Promise<Tag[]> {
      return mockTags
        .map((t) => ({ ...t, usageCount: mockTagUsage(t.id) }))
        .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
    },
    async upsertTag(label: string, color: string): Promise<Tag> {
      const trimmed = label.trim();
      const existing = mockTags.find((t) => t.label.toLowerCase() === trimmed.toLowerCase());
      if (existing) return { ...existing, usageCount: mockTagUsage(existing.id) };
      const row: MockTag = { id: `mock-tag-${++mockTagSeq}`, label: trimmed, color };
      mockTags.push(row);
      return { ...row, usageCount: 0 };
    },
    async renameTag(id: string, label: string): Promise<Tag | null> {
      const trimmed = label.trim();
      const row = mockTags.find((t) => t.id === id);
      if (!row) return null;
      // Reject a rename that collides with another tag (mirrors the unique index).
      if (mockTags.some((t) => t.id !== id && t.label.toLowerCase() === trimmed.toLowerCase())) {
        return null;
      }
      row.label = trimmed;
      return { ...row, usageCount: mockTagUsage(row.id) };
    },
    async mergeTags(sourceId: string, targetId: string): Promise<boolean> {
      if (sourceId === targetId) return false;
      const i = mockTags.findIndex((t) => t.id === sourceId);
      if (i === -1) return false;
      for (const a of mockTagApplications) {
        if (a.tagId !== sourceId) continue;
        const collides = mockTagApplications.some(
          (e) => e.tagId === targetId && e.parentType === a.parentType && e.parentId === a.parentId,
        );
        if (!collides) a.tagId = targetId;
      }
      // Drop applications that still point at the source (the collided ones) + the tag.
      for (let j = mockTagApplications.length - 1; j >= 0; j--) {
        if (mockTagApplications[j].tagId === sourceId) mockTagApplications.splice(j, 1);
      }
      mockTags.splice(i, 1);
      return true;
    },
    async deleteTag(id: string): Promise<boolean> {
      const i = mockTags.findIndex((t) => t.id === id);
      if (i === -1) return false;
      for (let j = mockTagApplications.length - 1; j >= 0; j--) {
        if (mockTagApplications[j].tagId === id) mockTagApplications.splice(j, 1);
      }
      mockTags.splice(i, 1);
      return true;
    },
    async listTagsFor(parentType: TagParentType, parentId: string): Promise<AppliedTag[]> {
      return mockTagApplications
        .filter((a) => a.parentType === parentType && a.parentId === parentId)
        .map((a) => mockTags.find((t) => t.id === a.tagId))
        .filter((t): t is MockTag => Boolean(t))
        .map((t) => ({ id: t.id, label: t.label, color: t.color }))
        .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
    },
    async listTagsForMany(
      parentType: TagParentType,
      parentIds: string[],
    ): Promise<Record<string, AppliedTag[]>> {
      const out: Record<string, AppliedTag[]> = {};
      for (const a of mockTagApplications) {
        if (a.parentType !== parentType || !parentIds.includes(a.parentId)) continue;
        const t = mockTags.find((x) => x.id === a.tagId);
        if (!t) continue;
        (out[a.parentId] ??= []).push({ id: t.id, label: t.label, color: t.color });
      }
      for (const id of Object.keys(out)) {
        out[id].sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
      }
      return out;
    },
    async applyTag(input: TagApplicationInput): Promise<void> {
      const exists = mockTagApplications.some(
        (a) => a.tagId === input.tagId && a.parentType === input.parentType && a.parentId === input.parentId,
      );
      if (!exists) {
        mockTagApplications.push({
          tagId: input.tagId, parentType: input.parentType, parentId: input.parentId,
        });
      }
    },
    async removeTag(input: TagApplicationInput): Promise<boolean> {
      const i = mockTagApplications.findIndex(
        (a) => a.tagId === input.tagId && a.parentType === input.parentType && a.parentId === input.parentId,
      );
      if (i === -1) return false;
      mockTagApplications.splice(i, 1);
      return true;
    },
  },

  // ── Custom fields (ADR-0065 B4, #338) ──────────────────────────────────────
  customFields: {
    async listFieldDefs(): Promise<CustomFieldDef[]> {
      return [...mockFieldDefs].sort(sortFieldDefs).map(toFieldDef);
    },
    async listFieldDefsFor(
      scope: CustomFieldParentType,
      projectTypeId: string | null,
    ): Promise<CustomFieldDef[]> {
      // A form sees the scope's global fields (projectTypeId null) plus, for a
      // project of a known type, that type's fields.
      return mockFieldDefs
        .filter(
          (d) =>
            d.scope === scope &&
            (d.projectTypeId === null ||
              (projectTypeId !== null && d.projectTypeId === projectTypeId)),
        )
        .sort(sortFieldDefs)
        .map(toFieldDef);
    },
    async createFieldDef(input: CustomFieldDefInput): Promise<CustomFieldDef> {
      const row: MockFieldDef = {
        id: `mock-field-${++mockFieldSeq}`,
        scope: input.scope,
        projectTypeId: input.scope === "project" ? input.projectTypeId : null,
        projectTypeName: null, // mock has no project_type catalog to resolve against
        key: input.key.trim(),
        label: input.label.trim(),
        fieldType: input.fieldType,
        options: isSelect(input.fieldType) ? [...input.options] : [],
        required: input.required,
        ordinal: input.ordinal,
      };
      mockFieldDefs.push(row);
      return toFieldDef(row);
    },
    async updateFieldDef(
      id: string,
      input: CustomFieldDefInput,
    ): Promise<CustomFieldDef | null> {
      const row = mockFieldDefs.find((d) => d.id === id);
      if (!row) return null;
      row.scope = input.scope;
      row.projectTypeId = input.scope === "project" ? input.projectTypeId : null;
      row.key = input.key.trim();
      row.label = input.label.trim();
      row.fieldType = input.fieldType;
      row.options = isSelect(input.fieldType) ? [...input.options] : [];
      row.required = input.required;
      row.ordinal = input.ordinal;
      return toFieldDef(row);
    },
    async deleteFieldDef(id: string): Promise<boolean> {
      const i = mockFieldDefs.findIndex((d) => d.id === id);
      if (i === -1) return false;
      for (let j = mockFieldValues.length - 1; j >= 0; j--) {
        if (mockFieldValues[j].fieldId === id) mockFieldValues.splice(j, 1);
      }
      mockFieldDefs.splice(i, 1);
      return true;
    },
    async listValuesFor(
      parentType: CustomFieldParentType,
      parentId: string,
      projectTypeId: string | null,
    ): Promise<CustomFieldValue[]> {
      const defs = await this.listFieldDefsFor(parentType, projectTypeId);
      return defs.map((d) => {
        const v = mockFieldValues.find(
          (x) => x.fieldId === d.id && x.parentType === parentType && x.parentId === parentId,
        );
        return {
          fieldId: d.id,
          key: d.key,
          label: d.label,
          fieldType: d.fieldType,
          options: d.options,
          required: d.required,
          value: v ? v.value : null,
        };
      });
    },
    async setValue(input: CustomFieldValueInput): Promise<void> {
      const i = mockFieldValues.findIndex(
        (x) =>
          x.fieldId === input.fieldId &&
          x.parentType === input.parentType &&
          x.parentId === input.parentId,
      );
      // A null/empty value clears the field (mirrors the DELETE in postgres).
      if (input.value === null || (Array.isArray(input.value) && input.value.length === 0)) {
        if (i !== -1) mockFieldValues.splice(i, 1);
        return;
      }
      if (i === -1) {
        mockFieldValues.push({
          fieldId: input.fieldId,
          parentType: input.parentType,
          parentId: input.parentId,
          value: input.value,
        });
      } else {
        mockFieldValues[i].value = input.value;
      }
    },
    async listValuesForMany(
      parentType: CustomFieldParentType,
      parentIds: string[],
      fieldKeys?: string[],
    ): Promise<Record<string, CustomFieldValueEntry[]>> {
      if (parentIds.length === 0) return {};
      const ids = new Set(parentIds);
      const keys = fieldKeys && fieldKeys.length > 0 ? new Set(fieldKeys) : null;
      const out: Record<string, CustomFieldValueEntry[]> = {};
      for (const v of mockFieldValues) {
        if (v.parentType !== parentType || !ids.has(v.parentId)) continue;
        if (v.value === null) continue; // only answered values appear in a column
        const def = mockFieldDefs.find((d) => d.id === v.fieldId);
        if (!def) continue;
        if (keys && !keys.has(def.key)) continue;
        (out[v.parentId] ??= []).push({
          fieldId: def.id,
          key: def.key,
          label: def.label,
          fieldType: def.fieldType,
          value: v.value as CustomFieldValueEntry["value"],
        });
      }
      // Stable ordinal ordering, mirroring the postgres ORDER BY.
      for (const id of Object.keys(out)) {
        out[id].sort((a, b) => {
          const da = mockFieldDefs.find((d) => d.id === a.fieldId);
          const db = mockFieldDefs.find((d) => d.id === b.fieldId);
          return (da?.ordinal ?? 0) - (db?.ordinal ?? 0) || a.label.localeCompare(b.label);
        });
      }
      return out;
    },
    async filterByCustomField(input: CustomFieldFilterInput): Promise<string[]> {
      // Resolve the (scope, projectTypeId, key) field group, then match its values.
      const defs = mockFieldDefs.filter(
        (d) =>
          d.scope === input.scope &&
          d.key === input.fieldKey &&
          (input.projectTypeId === null
            ? d.projectTypeId === null
            : d.projectTypeId === input.projectTypeId),
      );
      const defIds = new Set(defs.map((d) => d.id));
      const out: string[] = [];
      for (const v of mockFieldValues) {
        if (v.parentType !== input.scope || !defIds.has(v.fieldId)) continue;
        const matches =
          input.op === "contains"
            ? Array.isArray(v.value) && v.value.includes(input.value as string)
            : v.value === input.value;
        if (matches) out.push(v.parentId);
      }
      return out;
    },
  },

  // ── Self-serve report builder (ADR-0075, #410) ─────────────────────────────
  // In-memory store: reads return the viewer's own rows plus shared ones (own
  // first); mutations are owner-scoped by email. Tile deletes cascade in JS to
  // mirror the dashboard_id / report_definition_id ON DELETE CASCADE.
  reportBuilder: {
    async listReportDefinitions(viewerEmail: string | null): Promise<ReportDefinition[]> {
      return mockReportDefs
        .filter((r) => r.visibility === "shared" || r.ownerEmail === viewerEmail)
        .map((r) => toReportDef(r, viewerEmail))
        .sort((a, b) => Number(b.isMine) - Number(a.isMine) || a.name.localeCompare(b.name));
    },
    async getReportDefinition(
      id: string,
      viewerEmail: string | null,
    ): Promise<ReportDefinition | null> {
      const r = mockReportDefs.find((x) => x.id === id);
      if (!r || (r.visibility !== "shared" && r.ownerEmail !== viewerEmail)) return null;
      return toReportDef(r, viewerEmail);
    },
    async createReportDefinition(
      input: ReportDefinitionInput,
      ownerEmail: string,
    ): Promise<string> {
      const id = `mock-report-${++mockReportSeq}`;
      mockReportDefs.push({ ...input, id, ownerEmail });
      return id;
    },
    async updateReportDefinition(
      id: string,
      input: ReportDefinitionInput,
      ownerEmail: string,
    ): Promise<void> {
      const r = mockReportDefs.find((x) => x.id === id && x.ownerEmail === ownerEmail);
      if (!r) return; // owner-only, like the SQL WHERE
      Object.assign(r, input);
    },
    async deleteReportDefinition(
      id: string,
      ownerEmail: string | null,
      asAdmin: boolean,
    ): Promise<void> {
      const i = mockReportDefs.findIndex(
        (x) => x.id === id && (asAdmin || x.ownerEmail === ownerEmail),
      );
      if (i === -1) return;
      mockReportDefs.splice(i, 1);
      cascadeDashboardItems((it) => it.reportDefinitionId === id);
    },

    async listDashboards(viewerEmail: string | null): Promise<Dashboard[]> {
      return mockDashboards
        .filter((d) => d.visibility === "shared" || d.ownerEmail === viewerEmail)
        .map((d) => toDashboard(d, viewerEmail))
        .sort((a, b) => Number(b.isMine) - Number(a.isMine) || a.name.localeCompare(b.name));
    },
    async getDashboard(id: string, viewerEmail: string | null): Promise<Dashboard | null> {
      const d = mockDashboards.find((x) => x.id === id);
      if (!d || (d.visibility !== "shared" && d.ownerEmail !== viewerEmail)) return null;
      return toDashboard(d, viewerEmail);
    },
    async createDashboard(input: DashboardInput, ownerEmail: string): Promise<string> {
      const id = `mock-dashboard-${++mockReportSeq}`;
      mockDashboards.push({ ...input, id, ownerEmail });
      return id;
    },
    async updateDashboard(
      id: string,
      input: DashboardInput,
      ownerEmail: string,
    ): Promise<void> {
      const d = mockDashboards.find((x) => x.id === id && x.ownerEmail === ownerEmail);
      if (!d) return;
      Object.assign(d, input);
    },
    async deleteDashboard(
      id: string,
      ownerEmail: string | null,
      asAdmin: boolean,
    ): Promise<void> {
      const i = mockDashboards.findIndex(
        (x) => x.id === id && (asAdmin || x.ownerEmail === ownerEmail),
      );
      if (i === -1) return;
      mockDashboards.splice(i, 1);
      cascadeDashboardItems((it) => it.dashboardId === id);
    },

    async listDashboardItems(dashboardId: string): Promise<DashboardItem[]> {
      return mockDashboardItems
        .filter((i) => i.dashboardId === dashboardId)
        .sort((a, b) => Number(a.position.ordinal ?? 0) - Number(b.position.ordinal ?? 0))
        .map(toDashboardItem);
    },
    async addDashboardItem(input: DashboardItemInput): Promise<string> {
      const id = `mock-dashitem-${++mockReportSeq}`;
      mockDashboardItems.push({
        id,
        dashboardId: input.dashboardId,
        reportDefinitionId: input.reportDefinitionId,
        position: input.position,
      });
      return id;
    },
    async removeDashboardItem(id: string): Promise<void> {
      const i = mockDashboardItems.findIndex((x) => x.id === id);
      if (i !== -1) mockDashboardItems.splice(i, 1);
    },
    async reorderDashboardItem(id: string, position: Record<string, unknown>): Promise<void> {
      const it = mockDashboardItems.find((x) => x.id === id);
      if (it) it.position = position;
    },
  },

  // ── Integration marketplace — connector instances (ADR-0076, #414) ───────────
  // In-memory store: enabling upserts by (connectorKey, accountScope); status +
  // health are advanced by the backend (mock just mutates the row). No secrets.
  connectors: {
    async listConnectorInstances(): Promise<ConnectorInstance[]> {
      return mockConnectorInstances.map(toConnectorInstance);
    },
    async getConnectorInstance(id: string): Promise<ConnectorInstance | null> {
      const c = mockConnectorInstances.find((x) => x.id === id);
      return c ? toConnectorInstance(c) : null;
    },
    async getConnectorInstanceByKey(
      connectorKey: string,
      accountScope: string,
    ): Promise<ConnectorInstance | null> {
      const c = mockConnectorInstances.find(
        (x) => x.connectorKey === connectorKey && x.accountScope === accountScope,
      );
      return c ? toConnectorInstance(c) : null;
    },
    async enableConnector(input: ConnectorInstanceInput): Promise<string> {
      // Upsert on (connectorKey, accountScope), mirroring the UNIQUE constraint.
      const existing = mockConnectorInstances.find(
        (x) => x.connectorKey === input.connectorKey && x.accountScope === input.accountScope,
      );
      if (existing) {
        existing.grantedScopes = input.grantedScopes;
        existing.cadenceOverrideMinutes = input.cadenceOverrideMinutes;
        existing.status = "connecting";
        return existing.id;
      }
      const id = `mock-connector-${++mockConnectorSeq}`;
      mockConnectorInstances.push({
        ...input,
        id,
        status: "connecting",
        lastSyncAt: null,
        health: {},
      });
      return id;
    },
    async setConnectorStatus(
      id: string,
      status: ConnectorStatus,
      health?: Record<string, unknown>,
    ): Promise<void> {
      const c = mockConnectorInstances.find((x) => x.id === id);
      if (!c) return;
      c.status = status;
      if (health !== undefined) c.health = health;
    },
    async setConnectorCadence(id: string, cadenceOverrideMinutes: number | null): Promise<void> {
      const c = mockConnectorInstances.find((x) => x.id === id);
      if (c) c.cadenceOverrideMinutes = cadenceOverrideMinutes;
    },
    async disableConnector(id: string): Promise<void> {
      const i = mockConnectorInstances.findIndex((x) => x.id === id);
      if (i !== -1) mockConnectorInstances.splice(i, 1);
    },
  },

  // CRM contact segments (ADR-0073 decision 2, #420/#421) — in-memory store mirroring the
  // Postgres semantics: newest-first list with a live member count, idempotent member add
  // (no duplicate (segment_id, contact_id)), member-row delete, and segment delete cascading
  // its membership.
  segments: {
    async listSegments(): Promise<SegmentSummary[]> {
      return mockSegments
        .map(toSegmentSummary)
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    },
    async getSegment(id: string): Promise<SegmentDetail | null> {
      const s = mockSegments.find((x) => x.id === id);
      return s ? toSegmentDetail(s) : null;
    },
    async createSegment(input: SegmentInput, ownerEmail: string): Promise<string> {
      const id = `mock-segment-${++mockSegmentSeq}`;
      const now = new Date().toISOString();
      mockSegments.push({
        id,
        name: input.name,
        description: input.description,
        type: input.type,
        ownerEmail,
        ruleJson: input.type === "rule" ? input.ruleJson : null,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    },
    async updateSegment(id: string, input: SegmentInput): Promise<void> {
      const s = mockSegments.find((x) => x.id === id);
      if (!s) return;
      s.name = input.name;
      s.description = input.description;
      s.type = input.type;
      s.ruleJson = input.type === "rule" ? input.ruleJson : null;
      s.updatedAt = new Date().toISOString();
    },
    async deleteSegment(id: string): Promise<void> {
      const i = mockSegments.findIndex((x) => x.id === id);
      if (i === -1) return;
      mockSegments.splice(i, 1);
      for (let j = mockSegmentMembers.length - 1; j >= 0; j--) {
        if (mockSegmentMembers[j].segmentId === id) mockSegmentMembers.splice(j, 1);
      }
    },
    async listSegmentMembers(segmentId: string): Promise<SegmentMemberRow[]> {
      return mockSegmentMembers
        .filter((m) => m.segmentId === segmentId)
        .sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""));
    },
    async addSegmentMembers(
      segmentId: string,
      contactIds: readonly string[],
      source: SegmentMemberSource,
      addedByEmail: string | null,
    ): Promise<number> {
      let added = 0;
      for (const contactId of contactIds) {
        const exists = mockSegmentMembers.some(
          (m) => m.segmentId === segmentId && m.contactId === contactId,
        );
        if (exists) continue; // UNIQUE(segment_id, contact_id) — idempotent
        added++;
        mockSegmentMembers.push({
          id: `mock-segment-member-${++mockSegmentSeq}`,
          segmentId,
          contactId,
          contactName: contactId,
          contactEmail: null,
          account: null,
          source,
          addedBy: addedByEmail,
          addedAt: new Date().toISOString(),
        });
      }
      return added;
    },
    async removeSegmentMember(memberId: string): Promise<void> {
      const i = mockSegmentMembers.findIndex((m) => m.id === memberId);
      if (i !== -1) mockSegmentMembers.splice(i, 1);
    },
  },

  messageTemplates: {
    async listTemplates(): Promise<MessageTemplateRow[]> {
      return [...mockMessageTemplates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async listTemplateOptions(): Promise<MessageTemplateOption[]> {
      return mockMessageTemplates
        .map((t) => ({ id: t.id, name: t.name, channel: t.channel }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    async getTemplate(id: string): Promise<MessageTemplateRow | null> {
      return mockMessageTemplates.find((t) => t.id === id) ?? null;
    },
    async createTemplate(input: MessageTemplateInput): Promise<string> {
      const id = `mock-template-${++mockTemplateSeq}`;
      mockMessageTemplates.push({ id, updatedAt: new Date().toISOString(), ...input });
      return id;
    },
    async updateTemplate(id: string, input: MessageTemplateInput): Promise<void> {
      const t = mockMessageTemplates.find((x) => x.id === id);
      if (!t) return;
      Object.assign(t, input, { updatedAt: new Date().toISOString() });
    },
    async deleteTemplate(id: string): Promise<void> {
      const i = mockMessageTemplates.findIndex((x) => x.id === id);
      if (i !== -1) mockMessageTemplates.splice(i, 1);
    },
  },
};

/** A select-type field carries an options list; the others store []. */
function isSelect(t: CustomFieldDef["fieldType"]): boolean {
  return t === "single_select" || t === "multi_select";
}
