import type {
  Account,
  ActionItemRow,
  AgentMessage,
  AudienceMemberRow,
  AudienceRow,
  CampaignRow,
  ConnectionRow,
  ConsentEventRow,
  ContactProfile,
  ContactRow,
  CurrentConsentRow,
  EnrichmentFactRow,
  EnrollmentRow,
  InteractionRow,
  Kpi,
  LeadCaptureEventRow,
  LeadHookRow,
  OpportunityRow,
  PipelineColumn,
  SocialIdentityRow,
  WorkflowRow,
} from "@/types";

// NOTE: Mock data only. Used as the fallback when no database is configured and
// for modules not yet backed by Postgres (ADR-0007).

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

export const opportunities: OpportunityRow[] = [
  { id: "opp_01", name: "Northwind — Managed Services", account: "Northwind Logistics", stage: "won", mrr: "$8.2K" },
  { id: "opp_02", name: "Brightline — New MSP Agreement", account: "Brightline Manufacturing", stage: "proposal", mrr: "$4.1K" },
  { id: "opp_03", name: "Harbor Point — Expansion", account: "Harbor Point Financial", stage: "qualified", mrr: "$3.0K" },
  { id: "opp_04", name: "Sierra Vista — Managed Services", account: "Sierra Vista Schools", stage: "won", mrr: "$6.0K" },
  { id: "opp_05", name: "Cascade — Renewal", account: "Cascade Health Partners", stage: "lead", mrr: "$14.6K" },
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

// ── Contacts 360 (ADR-0025) ──────────────────────────────────────────────────

export const contacts: ContactRow[] = [
  { id: "ct_01", fullName: "Dana Whitfield", email: "dana@northwind.example", phone: "+1 503 555 0142", account: "Northwind Logistics" },
  { id: "ct_02", fullName: "Marcus Liu", email: "marcus.liu@cascadehp.example", phone: "+1 206 555 0199", account: "Cascade Health Partners" },
  { id: "ct_03", fullName: "Priya Anand", email: "priya@brightline.example", phone: null, account: "Brightline Manufacturing" },
];

const contactProfiles: Record<string, ContactProfile> = {
  ct_01: {
    id: "ct_01",
    fullName: "Dana Whitfield",
    email: "dana@northwind.example",
    phone: "+1 503 555 0142",
    title: "IT Director",
    headline: "Keeping logistics moving, securely",
    location: "Portland, OR",
    avatarUrl: null,
    lifecycleStatus: "engaged",
    account: "Northwind Logistics",
    accountId: "acc_01",
    lastEnrichedAt: "2026-06-02",
  },
};

const enrichmentByContact: Record<string, EnrichmentFactRow[]> = {
  ct_01: [
    { id: "en_1", attributeKey: "employer", value: "Northwind Logistics", confidence: 0.95, source: "linkedin", lawfulBasis: "public_data", observedAt: "2026-05-28" },
    { id: "en_2", attributeKey: "role", value: "IT Director", confidence: 0.9, source: "linkedin", lawfulBasis: "public_data", observedAt: "2026-05-28" },
    { id: "en_3", attributeKey: "interest", value: "Zero-trust networking", confidence: 0.6, source: "youtube", lawfulBasis: "public_data", observedAt: "2026-05-30" },
    { id: "en_4", attributeKey: "tenure_years", value: "4", confidence: 0.7, source: "linkedin", lawfulBasis: "public_data", observedAt: "2026-05-28" },
  ],
};

const socialByContact: Record<string, SocialIdentityRow[]> = {
  ct_01: [
    { id: "si_1", platform: "linkedin", handle: "in/dana-whitfield", profileUrl: "https://www.linkedin.com/in/dana-whitfield", followerCount: 1240, verified: true },
    { id: "si_2", platform: "youtube", handle: "@danaw", profileUrl: "https://youtube.com/@danaw", followerCount: 85, verified: false },
  ],
};

export function mockContactProfile(id: string): ContactProfile | null {
  return contactProfiles[id] ?? null;
}
export function mockEnrichment(id: string): EnrichmentFactRow[] {
  return enrichmentByContact[id] ?? [];
}
export function mockSocialIdentities(id: string): SocialIdentityRow[] {
  return socialByContact[id] ?? [];
}

// ── Communications timeline (ADR-0011) ───────────────────────────────────────

export const interactions: InteractionRow[] = [
  { id: "ix_01", source: "m365_email", kind: "email", channel: "email", direction: "outbound", subject: "Intro to Imperion managed services", summary: "Sent overview deck and assessment one-pager.", owner: "A. Reyes", contact: "Dana Whitfield", account: "Northwind Logistics", occurredAt: "2026-06-01 09:14" },
  { id: "ix_02", source: "linkedin", kind: "social_comment", channel: "linkedin", direction: "inbound", subject: null, summary: "Commented on our post about MSP security posture.", owner: "A. Reyes", contact: "Dana Whitfield", account: "Northwind Logistics", occurredAt: "2026-06-02 16:40" },
  { id: "ix_03", source: "plaud", kind: "meeting", channel: "in_person", direction: "internal", subject: "Coffee chat", summary: "In-person: open to a discovery call; concerned about transport-fleet endpoints.", owner: "A. Reyes", contact: "Dana Whitfield", account: "Northwind Logistics", occurredAt: "2026-06-04 11:00" },
  { id: "ix_04", source: "sms", kind: "message", channel: "sms", direction: "outbound", subject: null, summary: "Confirmed discovery call for next Tuesday.", owner: "A. Reyes", contact: "Dana Whitfield", account: "Northwind Logistics", occurredAt: "2026-06-05 13:22" },
  { id: "ix_05", source: "m365_teams", kind: "message", channel: "teams", direction: "inbound", subject: null, summary: "Asked for SOC 2 report ahead of the call.", owner: "J. Okafor", contact: "Marcus Liu", account: "Cascade Health Partners", occurredAt: "2026-06-03 10:05" },
];

export const actionItems: ActionItemRow[] = [
  { id: "ai_01", description: "Send SOC 2 report to Marcus before the call", status: "open", due: "2026-06-09", contact: "Marcus Liu", owner: "J. Okafor", promotedToTask: false },
  { id: "ai_02", description: "Scope fleet-endpoint count for Dana", status: "open", due: "2026-06-08", contact: "Dana Whitfield", owner: "A. Reyes", promotedToTask: true },
];

// ── Consent ledger (ADR-0014) ────────────────────────────────────────────────

const consentByContact: Record<string, ConsentEventRow[]> = {
  ct_01: [
    { id: "ce_1", channel: "email", state: "opt_in", lawfulBasis: "consent", source: "web_form", occurredAt: "2026-05-20" },
    { id: "ce_2", channel: "sms", state: "opt_in", lawfulBasis: "consent", source: "discovery_booking", occurredAt: "2026-05-22" },
    { id: "ce_3", channel: "ad_targeting", state: "opt_in", lawfulBasis: "consent", source: "web_form", occurredAt: "2026-05-20" },
  ],
};
export function mockConsentEvents(id: string): ConsentEventRow[] {
  return consentByContact[id] ?? [];
}
export function mockCurrentConsent(id: string): CurrentConsentRow[] {
  const events = consentByContact[id] ?? [];
  const latest = new Map<string, CurrentConsentRow>();
  for (const e of events) latest.set(e.channel, { channel: e.channel, state: e.state, lawfulBasis: e.lawfulBasis });
  return [...latest.values()];
}

// ── Connections (ADR-0012/0024) ──────────────────────────────────────────────

export const userConnections: ConnectionRow[] = [
  { id: "cn_01", scope: "user", provider: "m365", displayName: "a.reyes@imperion.example", status: "active", scopes: ["Mail.Read", "Calendars.Read", "Chat.Read"], owner: "A. Reyes", keyvaultSecretRef: "kv://imperion/conn/cn_01", lastSync: "2026-06-06 07:00", connectedAt: "2026-04-12" },
  { id: "cn_02", scope: "user", provider: "linkedin", displayName: "Alex Reyes", status: "active", scopes: ["r_liteprofile", "r_organization_social"], owner: "A. Reyes", keyvaultSecretRef: "kv://imperion/conn/cn_02", lastSync: "2026-06-05 22:00", connectedAt: "2026-04-12" },
  { id: "cn_03", scope: "user", provider: "youtube", displayName: "Reyes MSP", status: "expired", scopes: ["youtube.readonly"], owner: "A. Reyes", keyvaultSecretRef: "kv://imperion/conn/cn_03", lastSync: "2026-05-19 09:00", connectedAt: "2026-04-20" },
];

export const companyConnections: ConnectionRow[] = [
  { id: "cn_10", scope: "company", provider: "autotask", displayName: "Imperion Autotask", status: "active", scopes: ["tickets:read"], owner: null, keyvaultSecretRef: "kv://imperion/conn/autotask", lastSync: "2026-06-06 06:30", connectedAt: "2026-01-05" },
  { id: "cn_11", scope: "company", provider: "itglue", displayName: "Imperion IT Glue", status: "active", scopes: ["assets:read", "docs:read"], owner: null, keyvaultSecretRef: "kv://imperion/conn/itglue", lastSync: "2026-06-06 06:30", connectedAt: "2026-01-05" },
];

// ── Demand generation (ADR-0012/0026) ────────────────────────────────────────

export const campaigns: CampaignRow[] = [
  { id: "cmp_01", name: "MSP Security — PNW SMB", platform: "facebook", status: "active", budget: "$4,000", spend: "$2,180", leads: 37 },
  { id: "cmp_02", name: "Assessment Offer — LinkedIn", platform: "linkedin", status: "active", budget: "$6,000", spend: "$3,410", leads: 22 },
  { id: "cmp_03", name: "Brand — YouTube Pre-roll", platform: "youtube", status: "paused", budget: "$2,500", spend: "$2,500", leads: 9 },
];

export const audiences: AudienceRow[] = [
  { id: "aud_01", name: "IT Directors — PNW", description: "Enriched profiles: role=IT Director, region=PNW", kind: "dynamic", memberCount: 142, adReadyCount: 96 },
  { id: "aud_02", name: "Engaged but not-fit", description: "Discovery not_fit in last 90d", kind: "static", memberCount: 28, adReadyCount: 12 },
];

const audienceMembers: Record<string, AudienceMemberRow[]> = {
  aud_01: [
    { contactId: "ct_01", fullName: "Dana Whitfield", account: "Northwind Logistics", adConsent: true },
    { contactId: "ct_03", fullName: "Priya Anand", account: "Brightline Manufacturing", adConsent: false },
  ],
};
export function mockAudienceMembers(id: string): AudienceMemberRow[] {
  return audienceMembers[id] ?? [];
}

// ── Lead-capture hooks (ADR-0024) ────────────────────────────────────────────

export const leadHooks: LeadHookRow[] = [
  { id: "lh_01", name: "Website Contact Form", kind: "web_form", active: true, captureCount: 54 },
  { id: "lh_02", name: "Facebook Lead Ad — Assessment", kind: "facebook_lead", active: true, captureCount: 31 },
  { id: "lh_03", name: "YouTube Comment Watch", kind: "youtube_comment", active: false, captureCount: 7 },
];

export const captureEvents: LeadCaptureEventRow[] = [
  { id: "lc_01", hook: "Website Contact Form", status: "new", contact: null, summary: "jordan@harborfin.example — 'interested in a security assessment'", receivedAt: "2026-06-06 08:12" },
  { id: "lc_02", hook: "Facebook Lead Ad — Assessment", status: "new", contact: null, summary: "Sam Ortega, Ortega Dental — 12 staff", receivedAt: "2026-06-05 19:44" },
  { id: "lc_03", hook: "Website Contact Form", status: "resolved", contact: "Priya Anand", summary: "Demo request from Brightline", receivedAt: "2026-06-03 14:20" },
];

// ── Automation workflows (ADR-0014/0027) ─────────────────────────────────────

export const workflows: WorkflowRow[] = [
  { id: "wf_01", name: "Default Nurture", kind: "nurture", status: "active", stepCount: 5, activeEnrollments: 64 },
  { id: "wf_02", name: "Pre-Discovery Enrichment", kind: "pre_discovery", status: "active", stepCount: 4, activeEnrollments: 8 },
  { id: "wf_03", name: "Win-back (not-fit 90d)", kind: "re_engagement", status: "paused", stepCount: 3, activeEnrollments: 0 },
];

export const enrollments: EnrollmentRow[] = [
  { id: "wfe_01", contact: "Priya Anand", workflow: "Pre-Discovery Enrichment", status: "active", currentStep: 2, enrolledAt: "2026-06-04" },
  { id: "wfe_02", contact: "Sam Ortega", workflow: "Default Nurture", status: "active", currentStep: 1, enrolledAt: "2026-06-05" },
];
