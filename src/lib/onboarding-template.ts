/**
 * Standard MSP onboarding playbook (ADR-0037).
 *
 * The reusable template instantiated for each new client onboarding: 9 phases
 * (the R/Y/G major steps shown on the dashboard) and their checklist steps. A
 * phase becomes a `project_milestone`; each step becomes an onboarding `task`
 * linked to that milestone. Dates are computed at instantiation from a project
 * start date using each phase's `offsetDays`/`durationDays` — the dates in the
 * source spreadsheet were placeholders.
 *
 * Safe in client and server (pure data). Edit here to evolve the playbook; the
 * 9.6/9.7 retrospective steps exist precisely so the template keeps improving.
 */

/** A single checklist step within a phase. */
export interface OnboardingStepDef {
  code: string; // e.g. "1.1"
  title: string;
  /** A "Send - …" client communication step (vs hands-on work). */
  send?: boolean;
}

/** A phase — a major step with its own R/Y/G health and a window. */
export interface OnboardingPhaseDef {
  ordinal: number; // 1..9
  name: string;
  /** Days from the project start to this phase's start (phases can overlap). */
  offsetDays: number;
  /** Phase length in days. */
  durationDays: number;
  steps: OnboardingStepDef[];
}

export interface OnboardingTemplateDef {
  key: string;
  name: string;
  version: number;
  phases: OnboardingPhaseDef[];
}

export const ONBOARDING_TEMPLATE: OnboardingTemplateDef = {
  key: "standard_msp",
  name: "Standard MSP Onboarding",
  version: 1,
  phases: [
    {
      ordinal: 1,
      name: "Sales Handoff & Project Initiation",
      offsetDays: 0,
      durationDays: 7,
      steps: [
        { code: "1.1", title: "Sales-to-delivery handoff meeting; review signed SOW, scope, special terms" },
        { code: "1.2", title: "Create company record in Autotask; attach contract; set billing terms" },
        { code: "1.3", title: "Create organization in IT Glue; set type Customer, status Onboarding" },
        { code: "1.4", title: "Set up MyGlue tenant for client; configure branding" },
        { code: "1.5", title: "Create site(s) in Datto RMM" },
        { code: "1.6", title: "Create organization in Datto SaaS Protection" },
        { code: "1.7", title: "Create organization in Datto Endpoint Backup" },
        { code: "1.8", title: "Provision shared client folder structure; link from IT Glue" },
        { code: "1.9", title: "Welcome & Kickoff email", send: true },
        { code: "1.10", title: "Hold kickoff meeting with client sponsor and IT contact" },
      ],
    },
    {
      ordinal: 2,
      name: "Discovery & Information Gathering",
      offsetDays: 7,
      durationDays: 7,
      steps: [
        { code: "2.1", title: "Discovery info request (extended network and vendor questionnaire)", send: true },
        { code: "2.2", title: "Credentials request via secure portal", send: true },
        { code: "2.3", title: "Review discovery questionnaire response; identify gaps" },
        { code: "2.4", title: "Onsite or remote discovery walkthrough; identify rack, IDF, demarc, ISP gear" },
        { code: "2.5", title: "Inventory endpoints: workstations, laptops, servers, kiosks, mobile devices" },
        { code: "2.6", title: "Inventory network: firewall, switches, APs, ISP circuits with make/model/firmware" },
        { code: "2.7", title: "Inventory vendors: LOB apps, copier/MFP, alarm, camera systems" },
        { code: "2.8", title: "Inventory existing security stack to be replaced (AV, EDR, RMM, backup, MFA)" },
        { code: "2.9", title: "Collect credentials: 365 GA, firewall, switches, wireless, ISP, DNS registrar" },
        { code: "2.10", title: "Audit current M365 tenant state (licenses, admins, MFA, legacy auth, forwarding, consents)" },
        { code: "2.11", title: "Baseline Microsoft Secure Score; export snapshot to IT Glue" },
        { code: "2.12", title: "Draft network diagram in Visio; upload to IT Glue" },
        { code: "2.13", title: "Populate IT Glue with passwords, configurations, vendor contacts, asset list" },
        { code: "2.14", title: "Establish GDAP partner relationship; client approves" },
        { code: "2.15", title: "Phase 1 status update", send: true },
      ],
    },
    {
      ordinal: 3,
      name: "Backend Provisioning & Network Takeover",
      offsetDays: 0,
      durationDays: 21,
      steps: [
        { code: "3.1", title: "Configure Datto RMM O365 connection, site policies: monitors, patch, Defender AV integration, alert routing" },
        { code: "3.2", title: "Designate one always-on RMM agent at each site as Network Probe" },
        { code: "3.3", title: "Configure Datto Endpoint Backup retention, schedule, vault destination" },
        { code: "3.4", title: "Configure Datto SaaS Protection: OAuth tenant, retention, Exchange/OneDrive/SharePoint/Teams for all licensed users" },
        { code: "3.5", title: "Run first SaaS Protection backup; verify all mailboxes and sites discovered vs M365 user list" },
        { code: "3.6", title: "Configure Autotask company: contract, SLA, ticket queues, billing codes, contacts" },
        { code: "3.7", title: "Take over firewall: change passwords, document config, export to IT Glue, register vendor support to MSP" },
        { code: "3.8", title: "Take over switching: change passwords, document VLANs, ports, uplinks" },
        { code: "3.9", title: "Take over wireless: change passwords, document SSIDs, PSKs/RADIUS, AP placement" },
        { code: "3.10", title: "Take over DNS: confirm registrar access, export current records to IT Glue, set up monitoring" },
        { code: "3.11", title: "Document ISP relationship: account number, support contacts, circuit IDs, SLAs" },
        { code: "3.12", title: "Network takeover notification", send: true },
        { code: "3.13", title: "Configure monitoring on critical network gear via RMM SNMP or syslog" },
        { code: "3.14", title: "Link tenant to SaaS alerts" },
        { code: "3.15", title: "Configure Inky mail protection" },
        { code: "3.16", title: "Phase 2 status update", send: true },
      ],
    },
    {
      ordinal: 4,
      name: "M365 Tenant Provisioning & Hardening",
      offsetDays: 6,
      durationDays: 22,
      steps: [
        { code: "4.1", title: "Provision new tenant (if needed)" },
        { code: "4.2", title: "Reduce Global Admins to 3 (break-glass + two humans); convert others to least-privileged roles" },
        { code: "4.3", title: "Enable Unified Audit Log; set retention to max" },
        { code: "4.4", title: "Configure authentication methods: Authenticator (passwordless), FIDO2, WHfB" },
        { code: "4.5", title: "Configure FIDO2 AAGUID allowlist for approved YubiKey models" },
        { code: "4.6", title: "Build authentication strengths (01 Authenticator MFA, 02 Passwordless MFA, 03 General FIDO, 04 Device-Bound FIDO)" },
        { code: "4.7", title: "Deploy Conditional Access baseline in report-only mode" },
        { code: "4.8", title: "Configure Defender for Office 365: Safe Links, Safe Attachments, anti-phishing, ZAP" },
        { code: "4.9", title: "Configure DKIM, DMARC, SPF; publish DNS records with Easy DMARC" },
        { code: "4.10", title: "Configure retention policies in Purview" },
        { code: "4.11", title: "Remove suspicious mail forwarding rules; revoke risky app consents" },
        { code: "4.12", title: "Reset passwords for any potentially compromised accounts from previous audit" },
        { code: "4.13", title: "Onboard tenant to Defender for Endpoint: Intune onboarding package, security settings management, EDR block mode" },
        { code: "4.14", title: "Apply Intune security baselines, ASR rules, BitLocker, Defender AV, firewall, LAPS to onboarding and autopilot groups" },
        { code: "4.15", title: "Configure Intune compliance policies; tie to CA require-compliant-device" },
        { code: "4.16", title: "Configure Intune configuration profiles: update rings, Edge, OneDrive KFM, WHfB" },
        { code: "4.17", title: "Review Secure Score recommendations, evaluate client-impact list; document exceptions" },
        { code: "4.18", title: "Evaluate Secure Score after baseline applied; document delta vs takeover baseline" },
        { code: "4.19", title: "Move Conditional Access policies from report-only to enforced after 5-day review" },
      ],
    },
    {
      ordinal: 5,
      name: "Endpoint Deployment Decision & Prep",
      offsetDays: 28,
      durationDays: 7,
      steps: [
        { code: "5.1", title: "Per-device decision: Autopilot reset vs in-place enrollment; flag in inventory" },
        { code: "5.2", title: "For Autopilot devices: collect hardware hashes" },
        { code: "5.3", title: "Create dynamic device group for Autopilot devices" },
        { code: "5.4", title: "Configure Enrollment Status Page (ESP) with required apps and timeouts" },
        { code: "5.5", title: "Build Win32 app packages in Intune: M365 Apps, Edge, RMM agent, Endpoint Backup agent, browser extensions, LOB apps" },
        { code: "5.6", title: "Assign Win32 apps and Defender onboarding to Autopilot device group" },
        { code: "5.7", title: "Test full Autopilot deploy on pilot device; verify apps install, Defender active, compliance green" },
        { code: "5.8", title: "For in-place devices: prep RMM agent deployment method and Defender onboarding script" },
        { code: "5.9", title: "Pre-onsite notice to all users", send: true },
        { code: "5.10", title: "Onsite scheduling confirmation", send: true },
        { code: "5.11", title: "End-user prep instructions and auth enrollment docs from MyGlue", send: true },
        { code: "5.12", title: "Authenticator enrollment pre-brief; confirm YubiKey requests count", send: true },
        { code: "5.13", title: "Order YubiKeys for users who requested them" },
        { code: "5.14", title: "Phase 3 status update", send: true },
      ],
    },
    {
      ordinal: 6,
      name: "Onsite Deployment",
      offsetDays: 35,
      durationDays: 7,
      steps: [
        { code: "6.1", title: "Pre-day check: pilot healthy, backend systems ready, comms sent, YubiKeys onsite" },
        { code: "6.2", title: "Arrive onsite; set up staging area; confirm with client POC" },
        { code: "6.3", title: "Autopilot path per device: reset, monitor enrollment, verify ESP, agents, Defender sensor, compliance" },
        { code: "6.4", title: "In-place path per device: deploy RMM agent, Defender onboarding script, backup agent, Intune enroll, baseline, compliance" },
        { code: "6.5", title: "Verify BitLocker enabled and recovery key escrowed to Entra for each device" },
        { code: "6.6", title: "Verify backup agent has first successful backup before user leaves" },
        { code: "6.7", title: "Per user auth enrollment (standard): WHfB (PIN + biometric), Authenticator passwordless, test sign-in" },
        { code: "6.8", title: "Per user YubiKey enrollment: register, set PIN, test passwordless" },
        { code: "6.9", title: "Hand user the printed auth quick-reference; confirm sign-in to email and one LOB app" },
        { code: "6.10", title: "End-of-day verification: all enrolled in RMM, Intune, Defender, backup. Probe agent reports initial scan" },
        { code: "6.11", title: "Document exceptions and pending devices; schedule remote follow-up for missed users" },
        { code: "6.12", title: "Go-live confirmation", send: true },
      ],
    },
    {
      ordinal: 7,
      name: "Post-Deployment Validation",
      offsetDays: 42,
      durationDays: 7,
      steps: [
        { code: "7.1", title: "RMM check: 100% endpoint coverage, all reporting in last 24h, monitors firing" },
        { code: "7.2", title: "Defender for Endpoint check: 100% coverage, sensor health Active, no Inactive/Misconfigured, EDR block mode" },
        { code: "7.3", title: "Intune check: 100% enrolled, 100% compliant, BitLocker keys escrowed" },
        { code: "7.4", title: "Backup check: 100% endpoints with successful backup in last 24h" },
        { code: "7.5", title: "SaaS Protection check: every licensed user mailbox + OneDrive + SharePoint + Teams successful backup" },
        { code: "7.6", title: "Probe check: designated agent per site has Probe enabled, scan running, results reviewed for unexpected devices" },
        { code: "7.7", title: "Final Secure Score pull; remediate any quick wins; finalize exceptions flex asset" },
        { code: "7.8", title: "Auth enrollment audit: every user has WHfB and Authenticator passwordless; YubiKeys for those who requested" },
        { code: "7.9", title: "ASR rules audit: baseline rules enforced or in audit-with-monitoring; exceptions documented" },
        { code: "7.10", title: "Conditional Access enforcement: confirm all baseline policies out of report-only" },
        { code: "7.11", title: "Auth enrollment follow-up with MyGlue user docs links", send: true },
        { code: "7.12", title: "First backup verification report", send: true },
        { code: "7.13", title: "Post deployment status update", send: true },
      ],
    },
    {
      ordinal: 8,
      name: "Documentation & Handoff",
      offsetDays: 49,
      durationDays: 7,
      steps: [
        { code: "8.1", title: "IT Glue final pass: passwords vault complete, all configurations linked to assets" },
        { code: "8.2", title: "IT Glue: finalize network diagram with post-takeover state" },
        { code: "8.3", title: "IT Glue: populate SOP and runbook flex assets (onboard user, offboard, password reset, common tickets)" },
        { code: "8.4", title: "IT Glue: populate vendor list flex asset with all third-party contacts" },
        { code: "8.5", title: "IT Glue: asset inventory matches RMM device list; reconcile any gaps" },
        { code: "8.6", title: "MyGlue: grant access to designated client admins; verify scoping" },
        { code: "8.7", title: "Autotask client portal: grant access to designated contacts" },
        { code: "8.8", title: "Portal access and documentation email", send: true },
        { code: "8.9", title: "30-minute portal walkthrough call with client admins" },
        { code: "8.10", title: "Move client from Onboarding to Managed Service status in Autotask and IT Glue" },
        { code: "8.11", title: "Internal handoff: project team to support and NOC. Walk IT Glue, quirks, runbooks, exceptions" },
        { code: "8.12", title: "Add client to standard reporting rotations (Secure Score, backup, patch, exceptions review)" },
        { code: "8.13", title: "7-day check-in", send: true },
      ],
    },
    {
      ordinal: 9,
      name: "Closeout",
      offsetDays: 56,
      durationDays: 7,
      steps: [
        { code: "9.1", title: "Pull 30-day metrics: tickets opened, resolution time, SLA, recurring patterns" },
        { code: "9.2", title: "Verify all Success Criteria still hold; remediate any drift" },
        { code: "9.3", title: "30-day closeout email; book review meeting", send: true },
        { code: "9.4", title: "Closeout meeting: review metrics, capture feedback, identify upsell opportunities" },
        { code: "9.5", title: "Final billing reconciliation; close project in Autotask" },
        { code: "9.6", title: "Internal retrospective: what went well, what to improve, template updates" },
        { code: "9.7", title: "Apply improvements identified in retrospective" },
      ],
    },
  ],
};

/** Total step count across all phases (for summaries). */
export function templateStepCount(t: OnboardingTemplateDef = ONBOARDING_TEMPLATE): number {
  return t.phases.reduce((n, p) => n + p.steps.length, 0);
}
