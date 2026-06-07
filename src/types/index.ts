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

/** A row in the Onboarding (delivery projects) list. */
export interface ProjectRow {
  id: string;
  name: string;
  account: string; // account name
  opportunity: string | null; // opportunity name
  type: string; // project_type label
  status: string; // project_status label
  targetLive: string | null; // formatted target go-live date
}

/** A row in the Tasks list. */
export interface TaskRow {
  id: string;
  title: string;
  status: string;
  due: string | null; // formatted due date
  account: string | null; // account name
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
}

/** A stored answer joined to its question, for display. */
export interface AnswerRow {
  questionId: string;
  key: string;
  prompt: string;
  responseType: string;
  value: string | null; // display value (coalesced across typed columns)
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

/** Minimal signed-in user shape surfaced in the UI (from the Entra session). */
export interface SessionUser {
  name: string;
  email: string;
}
