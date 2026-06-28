# CS-09 — Vendor & Third-Party Security Risk

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program](CS-00-information-security-program.md). Rewritten from the
> legacy `IM013 Vendor & Third-Party Risk Management Policy` to the dual-audience canon. Governance
> terms (autonomy ladder, dial, `always_gate`, easy-button) are defined once in the top umbrella
> and localized here, never redefined.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-09` |
| **Title** | Vendor & Third-Party Security Risk |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly); reviewed by Legal / Executive Leadership |
| **Governing for (agents)** | Grace (GRC), Roman (Deputy CISO) — and all agents that read or act on vendor relationships |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00 Information Security Program](CS-00-information-security-program.md) + [CS-06 Cloud Security](CS-06-cloud-security.md) + [CS-08 Data Classification & Handling](CS-08-data-classification-and-handling.md) + [CS-10 Logging, Monitoring & SIEM](CS-10-logging-monitoring-and-siem.md) |

**Framework Alignment:** NIST CSF 2.0 (GV.SC, ID.RA-10) · SOC 2 (CC9.2).

---

## 1. Purpose

To manage the security risk introduced by vendors, suppliers, sub-processors, and other third
parties — including the cloud and AI providers in Imperion's own supply chain — across the
relationship lifecycle. It binds every actor, human and agent, identically.

## 2. Scope

**Who:** all Imperion employees, contractors, and AI agents that engage, assess, connect, or
offboard a third party. **What:** all third parties that access, store, process, or transmit
Imperion or client data or connect to managed networks (including the pinned cloud and AI
providers), and every Operating Procedure with a vendor-touching step (due diligence, onboarding,
access grant, reassessment, offboarding). The policy binds humans and agents identically except
where §5 narrows or gates an agent's authority.

## 3. Definitions

- **Third Party / Vendor** — any external entity providing products or services that involve access
  to, or processing of, Imperion or client data, or connectivity to managed environments.
- **Sub-processor** — a third party engaged by a vendor that also processes data.
- **Due Diligence** — the pre-engagement assessment of a vendor's security posture.
- **Supply-Chain Risk** — risk arising from dependencies on third-party products, services, and
  their own suppliers.

## 4. Policy Statements

1. **Pre-engagement due diligence.** Before any third party is granted access to data or networks:
   a security risk assessment proportional to the data sensitivity and access level is completed;
   evidence of the vendor's posture is reviewed (**SOC 2 Type II report**, ISO 27001 certification,
   security questionnaire, penetration-test summaries, documented policies); for vendors processing
   Restricted/Confidential data (CS-08), data residency, sub-processor disclosure, breach-
   notification commitments, and — for AI vendors — model-training and data-use terms are confirmed;
   no cloud or AI service is initiated without Legal notification and contract review (CS-06, CS-07).
2. **Contractual requirements.** Agreements with third parties must address: defined scope of
   services and the vendor's security control obligations; liability, confidentiality, and
   data-ownership terms (data owned by Imperion/client; maintained and securely returned or
   destroyed at termination); **breach notification without unreasonable delay and no later than
   30 days** (shorter where law/contract requires); right to audit or to receive periodic assurance
   (e.g., annual SOC 2); sub-processor controls and flow-down of security obligations; US data
   processing/storage unless otherwise contractually approved.
3. **Connectivity & access controls.** Third-party access requires VPN/ZTNA plus MFA and is
   time-limited to the engagement (CS-03); vendor systems connecting to managed networks must meet
   Imperion's minimum endpoint security baseline; generic/shared accounts for third parties are
   prohibited; access is least-privilege and logged to Sentinel (CS-10).
4. **Ongoing monitoring & reassessment.** Critical vendors are reassessed at least annually and
   their assurance artifacts (SOC 2, certifications) refreshed; vendor security incidents affecting
   Imperion or clients are handled under the Technical Incident Response Program (CS-IR); the
   approved-vendor list (CS-06 Exhibit A) is maintained and reviewed.
5. **Offboarding.** At engagement end, access is revoked, data is returned or securely destroyed per
   contract, and removal is documented.

## 5. Application to Autonomous Agents

- **Autonomy ceiling.** Vendor due-diligence and monitoring work — gathering assurance artifacts,
  scoring posture, flagging expiring SOC 2 reports, detecting unapproved vendors — sits at L0–L2
  (observe / propose / internal reversible) for Grace and Roman. No agent engages, contracts, or
  grants access to a vendor on its own authority.
- **`always_gate` actions (dial-proof floor).** A human decides, at every dial level, before an
  agent: engages or contracts a new third party; grants, changes, or revokes third-party access to
  data or networks; or approves a vendor processing Restricted/Confidential data. These are
  surfaced as a one-click easy-button (top-umbrella P3) — the agent assembles the assessment and
  the human approves.
- **Human-in-loop & easy-button.** As the dial climbs, routine assurance-gathering and
  reassessment-scheduling recede; the `always_gate` floor keeps a human on every engage/grant
  decision at any level. Agents are **audit-and-recommend** for vendor risk: they detect, evidence,
  and propose; corrective action is human.
- **Escalation & refusal.** An agent escalates an unapproved vendor in use, an expired or missing
  SOC 2 / assurance artifact, a sub-processor change, and any vendor incident signal. An agent
  **refuses** to grant a third party access without a completed assessment and human approval.
- **Evidence.** Every agent vendor-risk action writes the 3-level `agent_run` / `agent_message`
  audit record (CS-10): the artifacts reviewed, the score, the recommendation, and the human
  decision at any gate.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| CISO (human owner) | Owns the program and the approved-vendor list; approves vendors processing Sensitive Information. |
| Legal (human) | Reviews vendor contracts; confirms breach-notification, residency, and data-use terms. |
| Cybersecurity (human) | Runs due diligence; manages third-party access and offboarding. |
| Grace (GRC agent) | Audits vendor posture and assurance currency; recommends; engage/grant `always_gate` (L2). |
| Roman (Deputy CISO agent) | Reviews supply-chain risk; recommends; corrective changes `always_gate`. |
| All agents | Apply CS-08 handling and CS-10 logging to vendor data; never grant third-party access without approval. |

## 7. Enforcement & Audit

The gauntlet and least-privilege access enforce structurally; the GRC and audit functions (Grace,
Roman, Vera) verify continuously against eval goldens and the conformance sweep; the
[coverage-matrix](../coverage-matrix.md) proves every vendor-touching procedure is bound. A
violation parks the work and escalates; repeated or high-severity violations lower the agent's dial
or trip the kill-switch. For humans, violations may result in disciplinary action up to and
including termination.

## 8. Related

**Procedures governed:** vendor due diligence, vendor onboarding, third-party access grant, vendor
reassessment, and vendor offboarding (see the
[operating-procedure catalog](../../../docs/workflows/operating-procedure-catalog.md)).
**Related policies:** [CS-00](CS-00-information-security-program.md) ·
[CS-06 Cloud Security](CS-06-cloud-security.md) ·
[CS-07 AI Governance & Secure Deployment](CS-07-ai-governance-and-secure-deployment.md) ·
[CS-08 Data Classification & Handling](CS-08-data-classification-and-handling.md) ·
[CS-10 Logging, Monitoring & SIEM](CS-10-logging-monitoring-and-siem.md) · CS-IR (Technical
Incident Response). **ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard ceilings) ·
ADR-0058 (gauntlet) · ADR-0129 (platform credentials) · ADR-0134 (policy-canon architecture).
