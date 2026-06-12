import type { AppRole } from "@/lib/auth/roles";

export type Health = "green" | "amber" | "red";

export type PipelineStage =
  | "Lead"
  | "Qualified"
  | "Proposal"
  | "Onboarding"
  | "Active";

export interface Kpi {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
}

export interface PipelineColumn {
  stage: PipelineStage;
  count: number;
  value: string;
}

export interface Account {
  id: string;
  name: string;
  stage: PipelineStage;
  owner: string;
  mrr: string;
  health: Health;
  note: string;
}

export interface AgentMessage {
  id: string;
  role: "agent" | "user";
  text: string;
}

export interface NavItem {
  key: string;
  label: string;
  icon: string; // lucide-react icon name
  href: string;
}

/** A row in the Pipeline board (an opportunity). */
export interface OpportunityRow {
  id: string;
  name: string;
  account: string;
  stage: string; // sales_stage label
  mrr: string;
}

/** A row in the Contacts list. */
export interface ContactRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  account: string | null; // account name
}

/**
 * The CRM lifecycle axis a contact moves along (ADR-0031). One normalized
 * contact object; Leads = not-yet-client (audience|lead|prospect), Contacts =
 * client. Distinct from the enrichment lifecycle_status.
 */
export type ContactCrmStage = "audience" | "lead" | "prospect" | "client";

/** A contact as shown on the lifecycle Pipeline board and Leads/Contacts lists. */
export interface ContactPipelineRow {
  id: string;
  fullName: string;
  email: string | null;
  account: string | null; // account name
  crmStage: ContactCrmStage;
}

/** A row in the Proposals list. */
export interface ProposalRow {
  id: string;
  title: string;
  opportunity: string; // opportunity name
  account: string; // account name
  status: string; // proposal_status label
  amount: string; // formatted MRR or "—"
  sent: string | null; // formatted sent date
}

/** One scored dimension of an assessment, for the scorecard view. */
export interface AssessmentScore {
  key: string;
  label: string;
  rating: string | null; // assessment_rating or null (not yet scored)
}

/** A row in the Assessments list (AI Security Readiness Assessment). */
export interface AssessmentRow {
  id: string;
  name: string;
  account: string; // account name
  status: string; // assessment_status label
  fee: string; // formatted one-time fee or "—"
  kickoff: string | null; // formatted kickoff date
  scores: AssessmentScore[]; // the six dimensions
}

/** A row in the project board / onboarding project lists. */
export interface ProjectRow {
  id: string;
  name: string;
  account: string; // account name
  opportunity: string | null; // opportunity name
  type: string; // project_type display name
  typeKey: string; // project_type stable key, e.g. 'onboarding'
  owner: string | null; // owning app_user display name
  status: string; // project_status label
  targetLive: string | null; // formatted target go-live date
}

/** A project type — a row in the project_type table, not an enum (ADR-0052). */
export interface ProjectTypeRow {
  id: string;
  key: string; // stable machine key, e.g. 'onboarding'
  name: string;
  description: string | null;
  isProtected: boolean; // protected types (Onboarding) are never deletable
  projectCount: number; // projects of this type (delete is RESTRICTed while > 0)
}

/** Task category — the one task object serves sales + project/onboarding (ADR-0034). */
export type TaskCategory = "sales" | "project" | "onboarding" | "general";

/** A row in the Tasks list. */
export interface TaskRow {
  id: string;
  title: string;
  status: string;
  category: TaskCategory;
  due: string | null; // formatted due date
  account: string | null; // account name
  projectId: string | null; // owning project (one task model, ADR-0052)
}

/**
 * A row in the Sales Queue (ADR-0052 §6) — an open `category='sales'` task with
 * its owner and deal context. Pure read model; no new tables.
 */
export interface SalesTaskRow {
  id: string;
  title: string;
  status: string;
  due: string | null; // formatted due date
  dueAt: string | null; // ISO yyyy-mm-dd for due-bucket grouping
  account: string | null; // account name
  opportunity: string | null; // deal name
  ownerUserId: string | null;
  owner: string | null; // owner display name
}

// ── Onboarding project management (ADR-0034 / template ADR-0037) ─────────────

/** A single checklist step under a phase (instantiated from the playbook). */
export interface OnboardingStep {
  id: string;
  code: string; // "1.1"
  title: string;
  isComm: boolean; // a "Send - …" client communication step
  status: string; // open|done
  due: string | null;
  /** Easy mode (ADR-0052 §3, #101): backend config function key; null = ordinary step. */
  deployKey: string | null;
  /** When the Deploy button last fired (verify-to-close pends on the backend check). */
  deployRequestedAt: string | null;
  /** The linked project task auto-created at template apply; closed on verification. */
  taskId: string | null;
}

/** A red/yellow/green onboarding milestone (major step / phase) under a project. */
export interface OnboardingMilestone {
  id: string;
  name: string;
  status: string; // not_started|in_progress|blocked|complete
  health: Health; // green|amber|red — derived from step completion when steps exist
  start: string | null;
  due: string | null;
  stepsTotal: number;
  stepsDone: number;
  steps: OnboardingStep[];
}

/** A project with its milestone R/Y/G rollup, for the onboarding dashboard. */
export interface OnboardingProject {
  id: string;
  name: string;
  account: string | null;
  type: string;
  status: string;
  targetLive: string | null;
  /** True once the standard onboarding playbook has been instantiated. */
  hasTemplate: boolean;
  milestones: OnboardingMilestone[];
}

/** A categorical count datum for charts (e.g. proposals by status). */
export interface CountDatum {
  label: string;
  count: number;
}

/** Open-pipeline by sales stage: deal count and total MRR per stage. */
export interface StageValueDatum {
  stage: string;
  count: number;
  mrr: number; // numeric (dollars/mo) for chart axes
}

/** One-time assessment revenue vs recurring managed-services MRR (kept separate). */
export interface RevenueSplit {
  oneTime: string; // formatted one-time assessment fees
  recurring: string; // formatted recurring MRR "$X/mo"
}

/** Assessment → managed-services conversion. */
export interface AssessmentConversion {
  delivered: number;
  converted: number;
  rate: string; // formatted "NN%"
}

/** Headline figures for the Reporting page. */
export interface ReportSummary {
  activeMrr: string; // formatted "$X/mo"
  openPipeline: string; // formatted
  winRate: string; // formatted "NN%"
  avgTimeToLive: string; // formatted "NNd" or "—"
}

// ── Engagements: editable questionnaires, discovery, SBR, artifacts, tickets ──
// (ADR-0023). All engagement records are account-scoped; the contact is only the
// employee who performed a given instance.

/** A question from an editable template (discovery or assessment). */
export interface QuestionRow {
  id: string;
  key: string;
  prompt: string;
  helpText: string | null;
  responseType: string; // question_response_type
  options: string[] | null; // for select/rating
  dimension: string | null; // assessment scorecard dimension key
  ordinal: number;
  required: boolean;
  active: boolean;
}

/** The active question template for a kind (discovery|assessment). */
export interface QuestionTemplateRow {
  id: string;
  kind: string;
  version: number;
  title: string;
}

/** A stored answer joined to its question, for display. */
export interface AnswerRow {
  questionId: string;
  key: string;
  prompt: string;
  responseType: string;
  value: string | null; // display value (coalesced across typed columns)
}

/**
 * An answer with its provenance, for the pre-discovery review (ADR-0027). Agent- and
 * automation-sourced answers start as draft and need a human stamp before the verdict.
 */
export interface AnswerReviewRow {
  id: string; // engagement_answer id
  prompt: string;
  value: string | null;
  source: string; // human|agent|automation
  confidence: number | null; // 0..1
  status: string; // draft|confirmed|rejected
}

/** A row in the Discovery-call list. */
export interface DiscoveryCallRow {
  id: string;
  account: string;
  status: string;
  verdict: string | null;
  held: string | null; // formatted date
  nextStep: string | null;
}

/** Full discovery call with its captured answers. */
export interface DiscoveryCallDetail {
  id: string;
  accountId: string;
  opportunityId: string | null;
  contactId: string | null;
  templateId: string | null;
  status: string;
  heldAt: string | null;
  verdict: string | null;
  verdictReason: string | null;
  nextStep: string | null;
  sbrCadence: string | null;
  answers: AnswerRow[];
}

/** A re-scored dimension at an SBR (trend vs the benchmark assessment). */
export interface SbrDimensionScore {
  dimension: string;
  rating: string | null;
  note: string | null;
}

/** A row in the SBR list. */
export interface SbrRow {
  id: string;
  account: string;
  reviewDate: string;
  periodLabel: string | null;
  status: string;
}

/** Full SBR with re-scored dimensions and referenced ticket history. */
export interface SbrDetail {
  id: string;
  accountId: string;
  contactId: string | null;
  benchmarkAssessmentId: string | null;
  reviewDate: string;
  periodLabel: string | null;
  status: string;
  concerns: string | null;
  summary: string | null;
  nextActions: string | null;
  dimensionScores: SbrDimensionScore[];
  tickets: TicketRow[];
}

/** An assessment evidence artifact (Televy / M365 / Google / scan). */
export interface ArtifactRow {
  id: string;
  source: string;
  kind: string;
  title: string | null;
  dimension: string | null;
  collectedAt: string | null;
  summary: string | null;
}

/** A row in the Tickets list (synced from Autotask). */
export interface TicketRow {
  id: string;
  account: string;
  number: string | null;
  title: string;
  status: string | null;
  priority: string | null;
  opened: string | null;
}

/**
 * One row of the read-only device & cloud-asset inventory (ADR-0047) — silver
 * `device` rows merged with not-yet-merged IT Glue configurations.
 */
export interface DeviceInventoryRow {
  id: string;
  name: string | null;
  deviceType: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  os: string | null;
  status: string | null;
  account: string | null;
  origin: string; // silver | itglue
  lastSeen: string | null;
  /**
   * Per-device policy-applied indicator (#162, ADR-0051 §6), sourced ONLY from
   * Intune Device Compliance (`intune_managed_devices` bronze, migration 0069).
   * null = absent: device not Intune-managed, not reporting, or feed not run.
   */
  policyCompliance: "compliant" | "drift" | "ungoverned" | null;
}

/** A silver `contract` row joined to its account (Autotask or DocuSign — pipeline merge). */
export interface ContractRow {
  id: string;
  account: string | null;
  name: string | null;
  number: string | null;
  status: string | null;
  contractType: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Originating system (`autotask` | `docusign`) — pipeline merge stamps it. */
  source: string;
}

/** An admin-managed Tenant Mapping row (ADR-0051): Microsoft tenant GUID → account. */
export interface TenantMapping {
  tenantId: string;
  accountId: string;
  accountName: string | null;
  displayName: string | null;
  updatedAt: string | null;
}

/** A tenant GUID present in posture bronze with no Tenant Mapping (ADR-0051). */
export interface UnmappedTenant {
  tenantId: string;
}

/**
 * One mapped Customer Tenant's posture rollup (silver `tenant_posture`, ADR-0051).
 * A mapped tenant with no rollup yet still surfaces — every numeric field is then
 * null/zero and `refreshedAt` is null ("not refreshed" is a state, not an absence).
 */
export interface TenantPostureRollup {
  tenantId: string;
  displayName: string | null;
  secureScoreCurrent: number | null;
  secureScoreMax: number | null;
  licensedUserCount: number | null;
  activeUserCount: number | null;
  policiesCompliant: number;
  policiesDrift: number;
  policiesUngoverned: number;
  policiesMissing: number;
  exposuresOpen: number;
  refreshedAt: string | null;
}

/** One classified policy row (silver `posture_policy`, ADR-0051 §3). */
export interface PosturePolicyRow {
  tenantId: string;
  policyFamily: string; // conditional_access|intune_security|device_configuration|autopilot|defender_xdr
  policyId: string;
  policyName: string | null;
  classification: string; // compliant|drift|ungoverned|missing
  observedModifiedAt: string | null;
  goldenApprovedAt: string | null;
}

/** One Microsoft secure-score control profile (bronze, for the #93 drill-down). */
export interface SecureScoreControl {
  tenantId: string;
  controlName: string | null;
  controlCategory: string | null;
  title: string | null;
  maxScore: string | null;
  service: string | null;
  userImpact: string | null;
  tier: string | null;
}

/** One compromised-credential record for an account (silver `credential_exposure`, ADR-0040). */
export interface CredentialExposureRow {
  id: string;
  email: string | null;
  breachSource: string | null;
  breachDate: string | null;
  exposedData: string[];
  passwordStatus: string | null;
  severity: string | null;
  status: string; // new|acknowledged|resolved
  lastSeenAt: string | null;
}

/** Minimal signed-in user shape surfaced in the UI (from the Entra session). */
export interface SessionUser {
  name: string;
  email: string;
  /** Normalized application roles derived from Entra group/app-role claims. */
  roles: AppRole[];
}

/** A single result from the Knowledge search over the gold layer. */
export interface KnowledgeHit {
  id: string;
  kind: string; // contact | interaction
  title: string;
  snippet: string | null;
  href: string | null;
  when: string | null;
}

/** Headline security/compliance posture (read model over the spine). */
export interface SecurityPosture {
  totalContacts: number;
  contactsWithConsent: number; // any current opt-in
  adEligible: number; // current ad_targeting opt-in
  connectionsActive: number;
  connectionsTotal: number;
  consentByChannel: CountDatum[]; // current opt-in count per channel
}

// ── Communications timeline (ADR-0011) ───────────────────────────────────────
// The unified, multi-channel lifetime history. Every row is one `interaction`.

/** One item in a communications timeline (email, message, call, meeting, social…). */
export interface InteractionRow {
  id: string;
  source: string; // interaction_source (m365_email, linkedin, plaud, …)
  kind: string | null; // email|message|call|meeting|social_comment|…
  channel: string | null;
  direction: string | null; // inbound|outbound|internal
  subject: string | null;
  summary: string | null; // summary_gold (agent-ready)
  owner: string | null; // employee whose connection produced it
  contact: string | null; // contact full name
  account: string | null; // account name
  occurredAt: string | null; // formatted date-time
}

/** Structured Teams/Plaud meeting detail attached to an interaction (ADR-0011). */
export interface MeetingDetail {
  platform: string | null; // teams|plaud|other
  title: string | null;
  copilotRecap: string | null; // Teams Copilot recap
  plaudSummary: string | null; // Plaud meeting summary
  transcriptRef: string | null; // pointer to the full transcript
}

/** A single communication, for the drill-down view. */
export interface CommunicationDetail {
  id: string;
  source: string;
  kind: string | null;
  channel: string | null;
  direction: string | null;
  subject: string | null;
  summary: string | null; // summary_gold
  body: string | null; // normalized narrative / payload text
  owner: string | null;
  contact: string | null;
  contactId: string | null;
  account: string | null;
  accountId: string | null;
  occurredAt: string | null;
  meeting: MeetingDetail | null;
  actionItems: ActionItemRow[];
}

/** A meeting follow-up action item. */
export interface ActionItemRow {
  id: string;
  description: string;
  status: string; // open|done
  due: string | null;
  contact: string | null;
  owner: string | null;
  promotedToTask: boolean;
}

// ── Contact 360 / enrichment dossier (ADR-0025) ──────────────────────────────

/** A linked social profile for a contact. */
export interface SocialIdentityRow {
  id: string;
  platform: string;
  handle: string | null;
  profileUrl: string | null;
  followerCount: number | null;
  verified: boolean;
}

/** One enriched fact in the dossier, with provenance and lawful basis. */
export interface EnrichmentFactRow {
  id: string;
  attributeKey: string;
  value: string | null;
  confidence: number | null; // 0..1
  source: string | null;
  /** The connection that produced it (e.g. "LinkedIn · A. Reyes"), if any. */
  sourceConnection: string | null;
  lawfulBasis: string; // consent|legitimate_interest|contract|public_data
  observedAt: string | null;
}

/** The full contact profile (header) for the detail page. */
export interface ContactProfile {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  headline: string | null;
  location: string | null;
  avatarUrl: string | null;
  lifecycleStatus: string; // stranger|known|engaged|customer
  /** CRM lifecycle stage (ADR-0031): audience|lead|prospect|client. Optional so mock literals stay valid. */
  crmStage?: string | null;
  account: string | null;
  accountId: string | null;
  lastEnrichedAt: string | null;
}

// ── Per-source bronze rows (ADR-0032) ────────────────────────────────────────

/**
 * One per-source bronze row backing a unified silver record. The pipeline lands raw
 * source payloads here; the merge job (pipeline ADR-0006) links each to its silver
 * `contact`/`account`. Surfaced read-only so a user can see every source that fed a
 * record and inspect the raw payload.
 */
export interface SourceRecordRow {
  id: string;
  source: string; // imperion_crm_entered | apollo | m365_synced | autotask | itglue | autotask_contract | autotask_ticket | itglue_doc
  externalRef: string | null;
  payloadBronze: unknown | null; // raw source JSON (the "view raw" popup)
  normalizedSilver: unknown | null; // per-source normalized shape
  matchConfidence: number | null; // 0..1, set by the merge job
  matchedAt: string | null;
  lastSeenAt: string | null;
  title?: string | null; // optional human label (contract name / ticket title) for related-bronze citations
}

/**
 * A related bronze record from the local pipeline that fed a merged object's wider picture
 * (Autotask contracts/tickets, IT Glue documentation) — surfaced as drill-down citations
 * (local-pipeline ADR-0008 / front-end migration 0038). Same shape as a source record.
 */
export type RelatedBronzeRow = SourceRecordRow;

/** A per-source bronze row for a contact (`contact_source`). */
export type ContactSourceRow = SourceRecordRow;

/** A per-source bronze row for a company (`account_source`). */
export type AccountSourceRow = SourceRecordRow;

// ── Consent ledger (ADR-0014) ────────────────────────────────────────────────

/** One immutable consent event from the ledger. */
export interface ConsentEventRow {
  id: string;
  channel: string;
  state: string; // opt_in|opt_out
  lawfulBasis: string;
  source: string | null;
  occurredAt: string | null;
}

/** Derived current consent for one channel. */
export interface CurrentConsentRow {
  channel: string;
  state: string; // opt_in|opt_out (no row ⇒ unknown)
  lawfulBasis: string;
}

// ── Connections & identity map (ADR-0012/0024) ───────────────────────────────

/** A connected external account (personal or company-wide). */
export interface ConnectionRow {
  id: string;
  scope: string; // user|company
  provider: string;
  displayName: string | null;
  status: string; // active|expired|revoked|error
  scopes: string[];
  owner: string | null; // employee, for user-scope
  keyvaultSecretRef: string | null; // reference string only — never a secret
  lastSync: string | null;
  connectedAt: string | null;
  pollIntervalMinutes: number; // how often the pipeline polls; 0 = manual/paused (ADR-0038)
}

/** A row in an account's external identity map. */
export interface ExternalIdentityRow {
  id: string;
  provider: string;
  externalId: string;
  contact: string | null;
}

// ── Events: first-class objects campaigns promote (ADR-0053) ─────────────────

/** A row in the Events list. Funnel counts are derived, never stored. */
export interface EventRow {
  id: string;
  kind: string; // webinar|live_event
  name: string;
  status: string; // draft|scheduled|live|completed|canceled
  startsAt: string | null; // formatted
  registered: number;
  attended: number;
}

/** Full event detail for the record page. */
export interface EventDetail {
  id: string;
  kind: string;
  name: string;
  description: string | null;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string | null;
  capacity: number | null;
  joinUrl: string | null; // Teams link (webinar)
  location: string | null; // venue (live_event)
  registrationHeadline: string | null; // typed registration_page jsonb
  registrationBlurb: string | null;
  /** Workflow registrants auto-enroll into on resolution (ADR-0053 §4, #112). */
  workflowId: string | null;
  workflowName: string | null;
  registered: number;
  attended: number;
  noShow: number;
}

/** One signup on an event (attendance recorded post-event, ADR-0053 §2). */
export interface EventRegistrationRow {
  id: string;
  contact: string | null; // resolved contact name
  contactId: string | null;
  status: string; // registered|attended|no_show|canceled
  source: string | null;
  registeredAt: string | null;
  checkedInAt: string | null;
}

// ── Demand generation: campaigns, ads, audiences (ADR-0012/0026) ─────────────

/** A row in the Campaigns list. */
export interface CampaignRow {
  id: string;
  name: string;
  platform: string;
  status: string;
  budget: string; // formatted or "—"
  spend: string; // formatted polled spend or "—"
  leads: number;
}

/** An ad belonging to a campaign. */
export interface AdRow {
  id: string;
  name: string;
  status: string;
  /** Creative summary: the typed headline (ADR-0053 §3), or legacy free-text copy. */
  creative: string | null;
  /** Audience the ad targets (from the typed creative), when set. */
  audienceName: string | null;
  spend: string;
  impressions: number;
  clicks: number;
  leads: number;
}

/** A campaign with its ads and rolled-up metrics. */
export interface CampaignDetail {
  id: string;
  name: string;
  platform: string;
  objective: string | null;
  status: string;
  budget: string;
  startAt: string | null;
  endAt: string | null;
  /** Linked event the campaign promotes (ADR-0053 §1) — enables event-relative sends. */
  eventId: string | null;
  eventName: string | null;
  /** Workflow campaign-attributed responders auto-enroll into (ADR-0053 §4, #112). */
  workflowName: string | null;
  ads: AdRow[];
}

/** One schedulable blast on a campaign (ADR-0053 §4, migration 0071). */
export interface CampaignSendRow {
  id: string;
  channel: string; // email|sms
  recipientScope: string; // audience|event_registrants
  audienceName: string | null;
  summary: string | null; // email subject / sms text excerpt
  status: string; // draft|scheduled|sending|sent|canceled
  schedule: string; // human label: absolute time or event offset
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
}

/** A row in the Audiences list. */
export interface AudienceRow {
  id: string;
  name: string;
  description: string | null;
  kind: string; // static|dynamic
  memberCount: number;
  adReadyCount: number; // members with ad_targeting consent
}

/** A previewed/realized audience member, with ad eligibility. */
export interface AudienceMemberRow {
  contactId: string;
  fullName: string;
  account: string | null;
  adConsent: boolean; // ad_targeting consent current?
}

// ── Lead-capture hooks (ADR-0024) ────────────────────────────────────────────

/** A configured lead-capture hook. */
export interface LeadHookRow {
  id: string;
  name: string;
  kind: string;
  active: boolean;
  captureCount: number;
}

/** A raw inbound lead capture awaiting resolution. */
export interface LeadCaptureEventRow {
  id: string;
  hook: string | null;
  status: string; // new|resolved|ignored
  contact: string | null;
  summary: string | null; // derived from payload
  receivedAt: string | null;
}

// ── Automation workflows (ADR-0014/0027) ─────────────────────────────────────

/** A row in the Workflows list. */
export interface WorkflowRow {
  id: string;
  name: string;
  kind: string; // nurture|pre_discovery|re_engagement
  status: string;
  stepCount: number;
  activeEnrollments: number;
}

/** A step within a workflow. */
export interface WorkflowStepRow {
  id: string;
  ordinal: number;
  kind: string; // send_email|send_sms|chat_prompt|agent_enrich|wait|branch
  summary: string | null; // derived from config
}

/** A workflow with its ordered steps. */
export interface WorkflowDetail {
  id: string;
  name: string;
  kind: string;
  status: string;
  trigger: string | null;
  steps: WorkflowStepRow[];
}

/** A contact's enrollment in a workflow. */
export interface EnrollmentRow {
  id: string;
  contact: string | null;
  workflow: string;
  status: string; // active|completed|exited
  currentStep: number;
  enrolledAt: string | null;
}
