# CS-06 — Cloud Security

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program](CS-00-information-security-program.md). Rewritten from
> the legacy `IM009 Cloud Security Policy` to the dual-audience canon: a human and an agent read
> the same obligations, and the *Application to autonomous agents* section makes the agent's
> bounds explicit. Governance terms (autonomy ladder, dial, gauntlet, `always_gate`, easy-button)
> are defined once in the top umbrella; this policy localizes them, never redefines them.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-06` |
| **Title** | Cloud Security |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly) |
| **Governing for (agents)** | Roman (Deputy CISO), Cyrus (SOC), Osiris (IAM) — and all agents that read or act on cloud services |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00 Information Security Program](CS-00-information-security-program.md) + [CS-08 Data Classification & Handling](CS-08-data-classification-and-handling.md) + [CS-09 Vendor & Third-Party Security Risk](CS-09-vendor-and-third-party-security-risk.md) + [CS-10 Logging, Monitoring & SIEM](CS-10-logging-monitoring-and-siem.md) |

**Framework Alignment:** NIST CSF 2.0 (ID.AM, PR.AA, PR.DS, DE.CM) · SOC 2 (CC6.1, CC6.6, CC6.7, CC7.2).

---

## 1. Purpose

Imperion runs its own business and administers its clients' businesses in the cloud. This policy
governs how cloud computing, storage, AI, and network services are selected, onboarded,
configured, and operated so the confidentiality, integrity, and availability of information
created, received, maintained, or transmitted in the cloud is assured — across Imperion's own
tenant and the client tenants it manages. It binds every actor, human and agent, identically.

## 2. Scope

**Who:** all Imperion employees, contractors, and AI agents that select, configure, access, or
act on a cloud service. **What:** every Imperion-owned and Imperion-managed cloud service and the
data it holds (productivity, identity, storage, infrastructure, AI services), and every Operating
Procedure with a cloud-touching step (onboarding a service, granting tenant access, changing a
cloud configuration). The policy binds humans and agents identically **except** where §5 narrows
or gates an agent's authority.

## 3. Definitions

- **Cloud Service Provider (CSP)** — a vendor whose infrastructure stores or processes any
  Imperion or client data.
- **Cloud Service** — software or computing resources hosted via the internet and reached through
  a browser or front-end (email, file sharing, storage, collaboration, infrastructure, AI).
- **Shared Responsibility Model** — the split of security obligations between CSP and
  Imperion/client, varying by service model (IaaS / PaaS / SaaS).

(Canonical entity terms defer to CONTEXT.md; governance terms defer to the top umbrella.)

## 4. Policy Statements

1. **Primary platform.** Imperion's primary cloud platform is Microsoft 365 Business Premium with
   workloads in Microsoft Azure. Identity is centralized in Microsoft Entra ID with always-on MFA,
   phishing-resistant authentication for admins, and Conditional Access (see CS-02/CS-03). Threat
   protection is Microsoft Defender XDR; security telemetry (DNS, Entra, Azure activity logs) is
   centralized in Microsoft Sentinel and integrated with Defender XDR (CS-10).
2. **Configuration baselines.** Configuration follows Microsoft Secure Score and CIS Microsoft
   365 / Azure benchmarks; drift is monitored continuously.
3. **Approved use of cloud data.** Sensitive information (Restricted or Confidential, CS-08) is
   **never** uploaded to a cloud service not owned, controlled, or approved by Imperion — including
   consumer file-sharing, storage, or any unsanctioned upload/manual-entry service — and is
   **never** emailed from an Imperion account to a personal address. All network and email activity
   is subject to audit.
4. **Approved-vendor list.** An authoritative list of approved cloud vendors is maintained by
   Information Security (§9 Exhibit A) and governed under CS-09.
5. **Onboarding a cloud service.** No cloud service is initiated on Imperion's behalf without first
   notifying Legal; contracts and EULAs go to legal review and are retained in the
   contract-management system; a CS-09 vendor risk assessment is completed before approval.
6. **Required contract provisions.** Every cloud contract should address: **custody/ownership**
   (Imperion or its client owns all rights to the data; data maintained, backed up, and secured
   until at least one year after termination; storage/processing within the United States unless
   contractually approved; governing jurisdiction confirmed); **security, privacy, and access**
   (provider warrants the security standard; unauthorized access/use/disclosure by provider or
   sub-processors prohibited; breach notification without unreasonable delay and no later than
   30 days, shorter where law/contract requires); **business continuity and exit** (backup,
   restoration, DR; safe return/transfer/destruction of data at termination or provider takeover).
7. **Account and configuration controls.** Every cloud application integrates with Entra ID; at
   least two named administrators per service (shared admin credentials prohibited); MFA enforced
   on all access and phishing-resistant MFA on administrative access; just-in-time elevation
   (Entra PIM) where supported.
8. **Client tenant management.** Delegated access to client tenants is least-privilege, time-bound
   (GDAP), and fully logged to Sentinel (CS-10). Client data is logically segregated; configuration
   baselines are applied and monitored per client contract.

## 5. Application to Autonomous Agents

- **Autonomy ceiling.** For cloud read/measure work (inventory, posture checks, drift detection,
  configuration review) agents operate at L0–L1 (observe / propose). Cyrus (SOC) may reach **L4 —
  reversible-under-runbook** for cloud containment actions that have an undo window; Osiris (IAM)
  reaches L3 for routine scoped access work. No agent's *built* capability overrides its *dialed*
  level — v1 starts conservative.
- **`always_gate` actions (dial-proof floor).** A human decides, at every dial level, before an
  agent: onboards or contracts a new cloud service; grants, changes, or revokes tenant or client
  delegated access; changes a cloud security configuration, baseline, or Conditional Access policy;
  takes any destructive, identity, domain-controller, or backup action; or touches
  billing/deploys/production cloud resources. These are surfaced as a one-click easy-button
  resolution (top-umbrella P3) — the agent drives the work to the goal and the human approves.
- **Human-in-loop & easy-button.** As the dial climbs, routine measure/report involvement recedes;
  the `always_gate` floor keeps a human on every high-consequence cloud step at any level. Posture
  is **measure-only**: agents measure and report cloud posture; humans (and Datto/Microsoft tooling)
  remediate.
- **Escalation & refusal.** An agent escalates any unapproved cloud service it observes in use, any
  config drift from baseline, and any sensitive data found in an unsanctioned cloud location. An
  agent **refuses** to upload Restricted/Confidential data to a non-approved service regardless of
  dial.
- **Evidence.** Every agent cloud action writes the 3-level `agent_run` / `agent_message` audit
  record (CS-10): what was read or proposed, the gauntlet result, and the human decision at any gate.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| CISO (human owner) | Owns the policy and the approved-vendor list; approves new cloud services and client-tenant baselines. |
| Cybersecurity / MIS (human) | Maintains baselines, Secure Score, PIM, and Sentinel forwarding; remediates drift. |
| Legal (human) | Reviews cloud contracts/EULAs before onboarding. |
| Roman (Deputy CISO agent) | Audits cloud posture and baselines; recommends; `always_gate` on changes. |
| Cyrus (SOC agent) | Detects and reports cloud threats; L4 reversible-under-runbook containment; destructive/identity/backup actions `always_gate`. |
| Osiris (IAM agent) | Proposes and executes scoped least-privilege access (L3); grants/revokes to client tenants `always_gate`. |
| All agents | Apply CS-08 data handling and CS-10 logging to every cloud action; never place sensitive data in an unapproved service. |

## 7. Enforcement & Audit

The gauntlet (scope / data-class / ceiling checks) and RLS/data-class enforce structurally; the
SOC (Cyrus) and GRC/audit functions (Grace, Roman, Vera) verify continuously against eval goldens
and the conformance sweep; the [coverage-matrix](../coverage-matrix.md) proves every cloud-touching
procedure is bound to this policy. A violation parks the work and escalates; repeated or
high-severity violations lower the agent's dial or trip the kill-switch. For humans, violations may
result in disciplinary action up to and including termination.

## 8. Related

**Procedures governed:** cloud-service onboarding, client-tenant access grants, cloud configuration
change, and any Stream 07 step touching a cloud service (see the
[operating-procedure catalog](../../../docs/workflows/operating-procedure-catalog.md)).
**Related policies:** [CS-00](CS-00-information-security-program.md) ·
[CS-08 Data Classification & Handling](CS-08-data-classification-and-handling.md) ·
[CS-09 Vendor & Third-Party Security Risk](CS-09-vendor-and-third-party-security-risk.md) ·
[CS-10 Logging, Monitoring & SIEM](CS-10-logging-monitoring-and-siem.md) ·
[CS-07 AI Governance & Secure Deployment](CS-07-ai-governance-and-secure-deployment.md).
**ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard ceilings) · ADR-0058 (gauntlet) ·
ADR-0129 (platform credentials) · ADR-NNNN (policy-canon architecture).

### Exhibit A — Approved Cloud Service Providers (Imperion core stack)

| Vendor | Product / Service | Service role | Owner |
| --- | --- | --- | --- |
| Microsoft | 365 Business Premium (Exchange, SharePoint, Teams, OneDrive), Entra ID, Intune | Productivity, identity, device management | Cybersecurity / MIS |
| Microsoft | Defender XDR (Endpoint, O365, Identity, Cloud Apps) | Threat protection | Cybersecurity |
| Microsoft | Sentinel (DNS, Entra, Azure logs) | SIEM / SOAR | Cybersecurity |
| Microsoft | Azure (workloads, Key Vault) | Cloud infrastructure | Cybersecurity |
| Kaseya | RMM, patching, backup & recovery, documentation, QBR, phishing simulation | Managed services platform | MIS / SecOps |
| 1Password | Credential & secrets management | Identity / secrets | Cybersecurity |

*Additional approved vendors are maintained in the contract-management system and governed under
CS-09.*
