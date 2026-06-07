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

/** Minimal signed-in user shape surfaced in the UI (from the Entra session). */
export interface SessionUser {
  name: string;
  email: string;
}
