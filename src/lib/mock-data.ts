import type {
  Account,
  AgentMessage,
  Kpi,
  NavItem,
  PipelineColumn,
} from "@/types";

// NOTE: Mock data only. Per CLAUDE.md §7.4 this is to be replaced by real
// queries behind a repository abstraction once PostgreSQL + pgvector is wired.

export const navPrimary: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { key: "accounts", label: "Accounts", icon: "Building2" },
  { key: "pipeline", label: "Pipeline", icon: "GitBranch" },
  { key: "proposals", label: "Proposals", icon: "FileText" },
  { key: "onboarding", label: "Onboarding", icon: "Rocket" },
  { key: "reporting", label: "Reporting", icon: "BarChart3" },
];

export const navSecondary: NavItem[] = [
  { key: "integrations", label: "Integrations", icon: "Plug" },
  { key: "knowledge", label: "Knowledge", icon: "BrainCircuit" },
  { key: "security", label: "Security", icon: "ShieldCheck" },
  { key: "settings", label: "Settings", icon: "Settings" },
];

export const kpis: Kpi[] = [
  { label: "Open Pipeline", value: "$1.84M", delta: "+12%", deltaTone: "up" },
  { label: "Active MRR", value: "$326K", delta: "+4.1%", deltaTone: "up" },
  { label: "Onboarding", value: "7", delta: "2 at risk", deltaTone: "down" },
  { label: "Avg. Time to Live", value: "31d", delta: "-3d", deltaTone: "up" },
];

export const pipeline: PipelineColumn[] = [
  { stage: "Lead", count: 18, value: "$640K" },
  { stage: "Qualified", count: 11, value: "$520K" },
  { stage: "Proposal", count: 6, value: "$410K" },
  { stage: "Onboarding", count: 7, value: "$270K" },
  { stage: "Active", count: 42, value: "$326K MRR" },
];

export const accounts: Account[] = [
  {
    id: "acc_01",
    name: "Northwind Logistics",
    stage: "Onboarding",
    owner: "A. Reyes",
    mrr: "$8.2K",
    health: "red",
    note: "Implementation behind on M365 tenant cutover",
  },
  {
    id: "acc_02",
    name: "Cascade Health Partners",
    stage: "Active",
    owner: "J. Okafor",
    mrr: "$14.6K",
    health: "amber",
    note: "Two open Autotask escalations past SLA",
  },
  {
    id: "acc_03",
    name: "Brightline Manufacturing",
    stage: "Proposal",
    owner: "A. Reyes",
    mrr: "—",
    health: "amber",
    note: "Proposal awaiting security questionnaire response",
  },
  {
    id: "acc_04",
    name: "Harbor Point Financial",
    stage: "Active",
    owner: "M. Lindqvist",
    mrr: "$22.1K",
    health: "green",
    note: "QBR scheduled; expansion opportunity flagged",
  },
  {
    id: "acc_05",
    name: "Sierra Vista Schools",
    stage: "Onboarding",
    owner: "J. Okafor",
    mrr: "$6.0K",
    health: "amber",
    note: "IT Glue documentation import incomplete",
  },
];

export const agentMessages: AgentMessage[] = [
  {
    id: "m1",
    role: "agent",
    text: "I'm scoped to your Entra permissions. Ask about pipeline, an account, onboarding status, or operational readiness.",
  },
  {
    id: "m2",
    role: "user",
    text: "Which onboarding accounts are at risk?",
  },
  {
    id: "m3",
    role: "agent",
    text: "Two: Northwind Logistics (M365 tenant cutover slipping) and Sierra Vista Schools (IT Glue import incomplete). Want me to draft a status note for each owner?",
  },
];
