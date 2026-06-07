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

/** Minimal signed-in user shape surfaced in the UI (from the Entra session). */
export interface SessionUser {
  name: string;
  email: string;
}
