# CS-05 — Risk Management & Analysis

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program umbrella](CS-00-information-security-program.md).
> Rewrite-from-source of the legacy `IM006 — Risk Management & Analysis`; the risk lifecycle,
> rating scale, decision authority, and framework mappings are preserved, restructured to the
> dual-audience canon template. Governance terms are defined ONCE in the top umbrella; this policy
> localizes them.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-05` |
| **Title** | Risk Management & Analysis |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly); reviewed by the Executive Suite |
| **Governing for (agents)** | Roman (Deputy CISO), Grace (GRC), Cyrus (SOC) — and all agents for risk surfacing |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00 Information Security Program](CS-00-information-security-program.md) |

**Framework Alignment:** NIST CSF 2.0 (GV.RM; ID.RA-01–06; ID.IM) · AICPA SOC 2 (CC3.1–CC3.4,
CC4.1) · NIST AI RMF (Map, Measure, Manage — including AI system risk assessment).

---

## 1. Purpose

To establish a continual process for evaluating risks and vulnerabilities to the confidentiality,
integrity, and availability of information systems owned or managed by Imperion, and to define how
those risks are rated, escalated, and treated. The process governs both human-identified and
agent-identified risk, and explicitly includes AI system risk assessment.

## 2. Scope

**Who:** all Imperion and Imperion-managed information systems, the human roles that assess and
treat risk, and every agent that surfaces risk — Roman (Deputy CISO), Grace (GRC), and Cyrus
(SOC) as primary governed agents, and every agent for surfacing risk it observes. **What:** the
risk lifecycle (assessment, response, monitoring), the rating scale and decision authority, and
the risk-relevant Operating Procedures in Stream 07 and the security baseline. The policy binds
humans and agents identically except where §5 narrows or gates an agent's authority. No business
unit is excluded.

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **Authorized Decision Maker** — An individual with the authority appropriate to make a given
  risk-response decision (see the rating scale in §4.5).
- **Risk** — The likelihood of a threat exploiting a vulnerability, and the resulting operational,
  financial, legal, and reputational impact.
- **Threat** — A person, thing, or event likely to cause harm, intentionally or unintentionally.
- **Vulnerability** — A flaw or weakness in logical/physical controls, design, or implementation
  that could result in a breach or policy violation.

## 4. Policy Statements

### 4.1 Framework and approach

Risk management aligns with the NIST Cybersecurity Framework 2.0 and supports the SOC 2 control
environment. Methods may be technical or non-technical and use internal or external resources. The
lifecycle comprises Risk Assessment, Risk Response, and Risk Monitoring.

### 4.2 Risk assessment

An enterprise-wide risk assessment is performed at least annually by the CISO, a delegate, or a
qualified third party, including technical analysis of assets that process, transmit, or store
sensitive information. Project- and incident-driven assessments are performed as needed.
Assessment types include vulnerability scans, access reviews, encryption reviews, physical and
technical control reviews, third-party/vendor reviews, **AI system risk assessments**, and threat
monitoring.

### 4.3 Risk response

For each identified risk, one response is selected: **Avoid** (eliminate the cause), **Mitigate**
(reduce probability or impact via administrative/technical/physical controls), **Accept** (proceed
with little or no mitigation — requires a contingency plan and VP-level signature), or **Transfer**
(shift responsibility to a third party, e.g., cyber insurance — covers monetary exposure, not
reputational damage).

### 4.4 Risk monitoring

Monitoring verifies compliance, measures control effectiveness, and identifies changes affecting
risk. External assessments may be performed by an independent auditor as needed. Internal
assessments produce a formal report with prioritized remediation recommendations, reviewed with
management for corrective action. Deficiencies are prioritized by risk rating and tracked to
closure.

### 4.5 Risk rating scale and decision authority

| Risk Level | Required Action | Mitigation Timeframe | Authorized Decision Maker |
| --- | --- | --- | --- |
| **Critical** | Immediate countermeasures; activity should not continue/be implemented until a mitigation plan is in place; notify Executive Leadership and Information Security immediately; initiate Incident Response for active exploits | Immediate | CEO / Vice President |
| **High** | Strong need for safeguards; activity may continue with a mitigation plan; notify leadership and Information Security immediately; document for leadership | Within 10 days | CISO / Security Officer |
| **Elevated** | Mitigation plan required; notify Security Operations immediately; IR team on standby | Within 15 days | CISO / Security Officer |
| **Medium** | Mitigation plan submitted via standard ticketing; follow standard workflow | Standard SLA | MIS / SecOps |
| **Low** | Risk may be acceptable; mitigate via ticketing if pursued | Standard SLA | MIS |

### 4.6 Qualitative determination

Risk is calculated qualitatively from **Likelihood** (Almost Certain, Likely, Possible, Unlikely,
Rare) and **Magnitude of Impact** (Severe, Major, Moderate, Minor, Insignificant), combined per
the Enterprise Information Security Program's Qualitative Risk Determination Framework.

### 4.7 Reporting

The CISO reports identified risks and recommended controls to senior management at least annually,
with High or greater risks communicated as soon as possible. Risks are recorded in the Enterprise
Risk Management profile and tracked with corrective action plans.

## 5. Application to Autonomous Agents

For risk-management actions (identifying, rating, reporting, responding to, and monitoring risk):

- **Autonomy ceiling.** Roman (Deputy CISO) operates as **L2 delegate-only** and Grace (GRC) is
  **audit-and-recommend** (CS-00 §4): they detect, evidence, rate, and propose risk responses, but
  do not autonomously select or enact a risk treatment. Cyrus (SOC) operates at **L4 reversible-
  under-runbook** — reversible mitigations under a runbook with an undo window may auto-execute,
  but containment, destructive, identity, and client-facing actions are `always_gate`. Every agent
  surfaces risk it observes regardless of ceiling.
- **`always_gate` actions.** Selecting a risk response (Avoid / Mitigate / Accept / Transfer),
  accepting any risk, and enacting any irreversible or destructive mitigation are `always_gate` at
  every dial level. Accept requires the contingency plan plus VP-level signature; the rating scale
  in §4.5 fixes the human Authorized Decision Maker per level — the dial can never substitute for
  that authority.
- **Human-in-loop & easy-button.** As the dial climbs, agents may auto-run assessments (scans,
  access/encryption reviews, AI system risk assessment), compute the qualitative rating, and
  assemble the prioritized remediation pack, handing the Authorized Decision Maker a one-click
  resolution (top-umbrella P3). The treatment decision stays human at every level.
- **Escalation & refusal.** Agents escalate any risk rated **Elevated or above** immediately per
  the table and notification routing (top-umbrella P4); Critical active exploits trigger Incident
  Response (CS-IR). An agent **refuses** to mark a risk Accepted or to enact a treatment without
  the recorded signature of the Authorized Decision Maker for that risk level.
- **Evidence.** Every risk action writes an `agent_run` / `agent_message` audit record and a
  corresponding entry in the Enterprise Risk Management profile / corrective-action tracker,
  attributed to the accountable human, referencing **data classes** rather than sensitive content.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| Executive Leadership / VP (human) | Approves Critical responses and risk Acceptance; signs contingency plans |
| CISO / Security Officer (human) | Owns the risk process; approves High/Elevated responses; reports risk to senior management |
| MIS / SecOps (human function) | Treats Medium/Low risk via ticketing; runs standard remediation workflow |
| Roman — Deputy CISO (agent, L2 delegate-only) | Runs/aggregates assessments; rates and proposes responses; escalates Elevated+; never selects or accepts a treatment autonomously |
| Grace — GRC (agent, audit-and-recommend) | Evidences compliance and control effectiveness; proposes corrective actions; never enacts a standard/config change autonomously |
| Cyrus — SOC (agent, L4 reversible-under-runbook; containment/destructive/identity/client-facing = always_gate) | Executes reversible runbook mitigations; triggers IR on Critical active exploits; never takes destructive action autonomously |
| All agents | Surface and log any risk observed; never accept or treat risk outside their ceiling |

## 7. Enforcement & Audit

Adherence is enforced structurally (the gauntlet, the least-privilege room budget, the rating-
scale decision authority) and verified continuously (the annual enterprise assessment, internal/
external audits, the agent eval goldens, the conformance sweep, deficiency tracking to closure).
The [coverage-matrix](../coverage-matrix.md) proves every risk-relevant procedure is bound. A
violation parks the work and escalates; repeated or high-severity violations lower the agent's
dial or trip the kill-switch. Human violations may result in disciplinary action up to and
including termination, and where applicable civil or criminal referral.

## 8. Related

**Procedures governed:** risk assessment, vulnerability remediation, AI system risk assessment,
vendor review, and risk-reporting steps in Stream 07 and the security baseline. **Related
policies:** [CS-00 Information Security Program](CS-00-information-security-program.md) ·
[CS-01 Information Security Strategy](CS-01-information-security-strategy.md) ·
[CS-02 Identity & Access Management](CS-02-identity-and-access-management.md) ·
[CS-04 Encryption](CS-04-encryption.md) · [CS-07 AI Governance & Secure Deployment] ·
[CS-09 Vendor & Third-Party Security Risk] · [CS-17 Audit & Compliance Management] ·
the Technical Incident Response Program (CS-IR). **ADRs:** ADR-0128 (autonomy ladder) ·
ADR-0109 (dial + hard ceilings) · ADR-0058 (gauntlet) · ADR-0118 (data-class action ceiling) ·
ADR-NNNN (policy-canon architecture).
