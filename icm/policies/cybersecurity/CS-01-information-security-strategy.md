# CS-01 — Information Security Strategy

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program umbrella](CS-00-information-security-program.md).
> Rewrite-from-source of the legacy `IM001 — Information Security Strategy`; the security
> substance and framework mappings are preserved, restructured to the dual-audience canon
> template. Governance terms (autonomy ladder, dial, gauntlet, `always_gate`, easy-button,
> pool principle) are defined ONCE in the top umbrella; this policy localizes them.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-01` |
| **Title** | Information Security Strategy |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly); reviewed by the Executive Suite |
| **Governing for (agents)** | Roman (Deputy CISO) — and all agents for the baseline strategic principles |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00 Information Security Program](CS-00-information-security-program.md) |

**Framework Alignment:** NIST CSF 2.0 (Govern — GV.OC, GV.RM, GV.RR, GV.PO, GV.OV) · AICPA
SOC 2 (CC1 Control Environment; Security, Availability, Confidentiality) · NIST AI RMF (Govern).

---

## 1. Purpose

This policy documents the overarching strategy for information security at Imperion. As a
managed service provider entrusted with the confidentiality, integrity, and availability of
its own and its clients' information, security is the foundation of Imperion's reputation and
its business. This strategy establishes the governance model under which all subordinate
Cybersecurity policies, standards, and procedures operate, and commits every actor — human and
agent — to compliance with all applicable laws, regulations, and contractual obligations across
people, process, and technology. Subordinate policies localize this strategy to their domain;
none of them restate it.

## 2. Scope

**Who:** all Imperion entities, employees, contractors, and AI agents — Roman (Deputy CISO) as
the primary governed agent, and every agent for the baseline strategic principles. **What:** the
governance model, decision authority, and strategic principles that bind every security-relevant
Operating Procedure and Procedure Step in the catalog (Stream 07 Protect → Assure is the spine;
the strategy binds all streams). This policy binds humans and agents identically except where
§5 narrows or gates an agent's authority. No business unit is excluded.

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **Information Security** — The governance discipline of securing sensitive information in all
  forms (electronic, print, spoken) through physical, technical, and administrative controls,
  including the audit and monitoring activities that ensure ongoing compliance. Reports to the
  CISO.
- **Cybersecurity** — The technical discipline of securing electronic information and information
  assets (servers, workstations, mobile, cloud workloads, network), owning the architecture,
  deployment, and maintenance of the technical security stack and acting as first responder
  during incidents. Reports to the CISO.
- **Security Operations (SecOps)** — The combined Information Security and Cybersecurity function
  responsible for day-to-day monitoring, detection, response, and control operation across
  Imperion and client environments. The SOC agent (Cyrus) and Deputy CISO agent (Roman) operate
  within SecOps.
- **Enterprise Information Security Program** — The documented program (the CS-00 umbrella and
  its distinct policies) that defines the control objectives, policies, and processes
  implementing this strategy.

## 4. Policy Statements

1. **The Enterprise Information Security Program is maintained continuously.** It comprises, but
   is not limited to: policies/standards/procedures; personnel and physical security; information
   systems management and access control; asset classification and data handling; secure system
   development, deployment, and maintenance; risk analysis and risk management; third-party and
   supply-chain risk; AI governance and secure AI deployment; administrative/technical/physical
   safeguards; vulnerability assessment and remediation; logging, monitoring, detection, and
   response; backup, disaster recovery, and business continuity; and security awareness, training,
   and phishing simulation.
2. **Security is non-negotiable.** No business objective, delivery deadline, or cost consideration
   overrides the commitment to protecting information assets — Imperion's own or its clients'.
3. **Secure by design and by default.** Security controls are built into systems, services, and
   client engagements from inception, never added retroactively.
4. **Zero Trust is the operating model.** No user, device, agent, or network is trusted by
   default. Every access request is explicitly verified, granted with least privilege, and
   assumes breach.
5. **Defense in depth.** Layered administrative, technical, and physical controls ensure the
   failure of any single control does not result in compromise.
6. **Continuous improvement.** The program is measured, audited, and adapted to changes in the
   threat landscape, technology, regulation, and business objectives.
7. **Responsible innovation.** Emerging technology — including artificial intelligence — is
   adopted deliberately, with security and governance controls applied **before** deployment,
   never after. The autonomy framework (top umbrella §4) is the embodiment of this principle for
   agent actors.
8. **Security decisions follow a defined chain.** (a) Cybersecurity assesses technical
   feasibility; (b) Information Security assesses policy and compliance implications; (c) Legal
   assesses contractual, regulatory, and liability considerations; (d) Executive leadership
   provides sign-off proportional to the risk. The responsible party records the decision and its
   rationale.
9. **Ownership and maintenance.** The program is owned by the CISO and reviewed at least
   annually, and as needed, to remain compliant and aligned with business goals. Each department
   — and each agent's human pairing — is responsible for compliance with this strategy and its
   subordinate policies.

## 5. Application to Autonomous Agents

For strategy-governance actions (proposing security standards, policy changes, program updates,
and risk-treatment recommendations):

- **Autonomy ceiling.** Roman (Deputy CISO) operates as an **L2 delegate-only** agent
  (ADR-0128): he may observe, analyze, and propose, and may take internal reversible actions, but
  he does not autonomously change the security program, standards, or policy. Strategy and policy
  changes are **audit-and-recommend** (CS-00 §4): detect, evidence, propose.
- **`always_gate` actions.** Any change to a security standard, policy, control objective, or the
  Enterprise Information Security Program is `always_gate` at every dial level — the CISO (the
  final authority on security policy) approves via the easy-button. The dial can never
  auto-approve a program or policy change.
- **Human-in-loop & easy-button.** As trust rises the dial may let Roman auto-assemble the
  evidence pack and draft the proposed change, but the decision stays human. Each gate is a
  one-click resolution (top-umbrella P3): Roman drives the analysis to a complete, signable
  recommendation and hands the CISO the approve/decline.
- **Escalation & refusal.** Roman escalates any finding rated High or above (per CS-05) to the
  CISO as soon as possible and routes urgent items per the notification rules (top-umbrella P4).
  Roman **refuses** to enact a program/policy change without a recorded human approval, even if a
  dial setting would technically allow it (top-umbrella §5.5 — surface the irreversible).
- **Evidence.** Every strategy-governance action writes an audit record to the `agent_run` /
  `agent_message` ledger, with the analysis, the cited framework controls, and the
  approve/decline outcome attributed to the accountable human.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| Executive Leadership (human) | Owns business initiatives requiring security controls; approves strategy; makes risk-treatment decisions above defined thresholds |
| CISO (human) | Owns the security program and this strategy; reports risk to leadership; final authority on security policy; approves all `always_gate` program/policy changes |
| Cybersecurity (human function) | Architects and operates technical security solutions; assesses technical feasibility; first responder for incidents |
| Information Security (human function) | Defines strategy and policy; maintains the documented program; performs audit and monitoring |
| Legal (human function) | Enforces applicable law; reviews contracts and regulatory obligations |
| Roman — Deputy CISO (agent, L2 delegate-only) | Detects, evidences, and proposes strategy/policy improvements; assembles evidence packs; escalates High+ findings; never enacts a program/policy change autonomously |
| All workforce members and all agents | Comply with all security policies; complete required training; report suspected incidents; apply the baseline strategic principles to every action |

## 7. Enforcement & Audit

Compliance with this policy and all subordinate policies is mandatory. Adherence is enforced
structurally (the gauntlet, the least-privilege room budget, RLS/data-class) and verified
continuously (the agent eval goldens, the conformance/audit sweep run by the audit function —
Grace/Vera, and the SOC). All Imperion and client network activity is subject to audit. The
[coverage-matrix](../coverage-matrix.md) proves every security-relevant procedure is bound to an
authorizing policy. Violations may result in disciplinary action up to and including termination
of employment or contract and, where applicable, civil or criminal referral; for an agent, a
violation parks the work and escalates, and repeated or high-severity violations lower the
agent's dial or trip the kill-switch.

## 8. Related

**Procedures governed:** Stream 07 (Protect → Assure) + the strategic baseline across all
streams. **Related policies:** [CS-00 Information Security Program](CS-00-information-security-program.md) ·
[CS-02 Identity & Access Management](CS-02-identity-and-access-management.md) ·
[CS-05 Risk Management & Analysis](CS-05-risk-management-and-analysis.md) ·
[CS-17 Audit & Compliance Management] · the Technical Incident Response Program (CS-IR).
**ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard ceilings) · ADR-0058 (gauntlet) ·
ADR-0131 (executive suite) · ADR-0134 (policy-canon architecture).
