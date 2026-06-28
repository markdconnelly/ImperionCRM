# CS-IR — Technical Incident Response Program

> **A program, not a single policy.** The operational incident-response program for the
> Cybersecurity category. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program](CS-00-information-security-program.md). Rewritten from
> the legacy `Technical Incident Response Program (v2.0)`; the full IR lifecycle, the CERT/CMT
> structure, and framework mappings are preserved, restructured to the dual-audience template
> with an added agent section. It is longer than a distinct policy by design.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-IR` |
| **Title** | Technical Incident Response Program |
| **Category** | Cybersecurity |
| **Tier** | program |
| **Human owner** | Chief Information Security Officer (Mark Connelly); reviewed by Executive Leadership |
| **Governing for (agents)** | Cyrus (SOC — detection/containment) · Roman (Deputy CISO — escalation/PIR) — and all agents for incident reporting |
| **Version** | 2.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual (and after major incidents) |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00](CS-00-information-security-program.md) + CS-10 (Logging, Monitoring & SIEM) · CS-IR-adjacent BCDR (Backup, Recovery & Business Continuity) · [CS-18](CS-18-client-shared-responsibility.md) (client boundary) · [CS-19](CS-19-acceptable-use.md) |

**Framework Alignment:** NIST CSF 2.0 (DE, RS, RC) · NIST SP 800-61r2 · AICPA SOC 2 (CC7.3, CC7.4, CC7.5).

---

## 1. Purpose

This program defines how Imperion prepares for, detects, contains, eradicates, recovers from,
and learns from security incidents affecting Imperion or its managed clients. It is built to meet
NIST CSF 2.0 and SOC 2 incident-response requirements and to give every actor — human responder
and agent alike — one repeatable, documented process applied uniformly to every incident.

**Objectives.** Respond quickly and effectively; minimize risk to Imperion, its clients, and its
reputation; apply a repeatable, documented process to every incident.

## 2. Scope

**Who:** the Imperion Security Operations team led by the CISO, with Cybersecurity, IT/MIS, and
the Service Desk as key stakeholders — and the security agents (Cyrus, Roman) that participate in
detection, containment, and review. **What:** the incident lifecycle (Prepare → Identify →
Analyze → Contain → Eradicate → Recover → Review) for incidents affecting Imperion or any managed
client. This program operates under the Information Security Strategy and CS-00, alongside CS-10
(Logging, Monitoring & SIEM) and BCDR (Backup, Recovery & Business Continuity). The client
boundary for who-decides and who-notifies is governed by [CS-18](CS-18-client-shared-responsibility.md).
Binds humans and agents identically except where §6 narrows or gates an agent's authority.

## 3. Definitions & incident triggers

An **incident** is any act that violates Imperion's or a client's information-security policies.
Reportable activities include:

- Unauthorized attempts (failed or successful) to access systems or data, especially sensitive
  information.
- Disruption or denial of service to systems.
- Unauthorized use of a system for processing or storing data.
- Inappropriate usage under acceptable use ([CS-19](CS-19-acceptable-use.md)).
- Theft or loss of computing equipment.
- Suspected compromise of credentials or identities.
- Ransomware or destructive malware.
- **AI-specific incidents** — sensitive-data leakage via an AI tool, harmful or unauthorized AI
  output, or **AI agent misbehavior** (CS-07).
- Any event that could impact confidential records.

All suspected incidents are reported to the Security Officer / Cybersecurity **without delay** —
by any actor, human or agent.

## 4. Resources

### 4.1 Computer Emergency Response Team (CERT)

| Name | Role | Direct Line | Cell | Email |
| --- | --- | --- | --- | --- |
| _________ | CISO | | | |
| _________ | CEO | | | |
| _________ | Director of Cybersecurity | | | |
| _________ | Service Desk Lead | | | |

**Responsibilities:** coordinate response, survey the situation, lead containment and recovery
(remotely or on-site).

**Pre-incident procedures.** Maintain current network diagrams, firewall rule sets, and asset
inventories; keep credentials and encryption keys current and securely accessible (1Password /
Azure Key Vault); patch known vulnerabilities; operate automated detection via Defender XDR and
Sentinel and monitor logs continuously (CS-10); maintain immutable backups and tested restore
points (BCDR).

**Incident procedures.** Identify the nature and scope; determine quickly whether data
loss/leakage has occurred or operations are impacted; determine whether operations will be
impacted for more than 24 hours; recover and restore as required; refer to the ERBC plan if
relocation to an alternate site is needed.

**Post-incident procedures.** Complete incident forms and worksheets; assess response
effectiveness and modify procedures; conduct a post-incident review to capture lessons learned
and prevent recurrence.

### 4.2 Crisis Management Team (CMT)

Convened only when the Emergency Response and Business Continuity plans must be initiated or when
an incident materially affects operations. The CMT tests its plans at least annually and reviews
incident reports supplied by the Security Officer.

## 5. Incident Response Lifecycle

### 5.1 Identification

The CERT gathers enough information to determine the nature and scope:

- Assign CERT members aligned to the affected business/system function.
- Begin an incident log using the Incident Summary forms.
- Where forensic preservation is warranted, capture a forensic image of affected systems before
  making changes — preserving evidence for analysis and possible referral to authorities.
- Enable full logging on affected systems; engage third-party forensic teams when required.

### 5.2 Analysis

- Affected systems are **not** returned to the production network; they remain isolated.
- Review for modifications to system software, configuration files, and data; look for attacker
  tools, network sniffers, and signs of lateral movement.
- Review Defender XDR, Sentinel, firewall, IDS, and local logs for anomalies and logon events.
- Check other systems on the network and at remote/client locations for involvement.

### 5.3 Containment

Containment prevents spread; steps are a flexible guide and the CERT lead exercises best judgment:

- Survey the situation and review the Identification-phase summary.
- For networked threats, isolate or disable affected connectivity where possible (Defender device
  isolation).
- Assess the risk of continued operation by reviewing logs and attack vectors.
- Review same-subnet and client systems for impact.
- Determine whether the threat originates from a third-party connection and consult business/
  system owners.
- Change credentials on affected and interfacing systems as needed; revoke sessions and tokens
  (Entra ID).
- Keep relevant owners updated throughout.

### 5.4 Eradication

- Identify and mitigate all exploited vulnerabilities; run vulnerability scans for open exposures.
- Remove malware, unauthorized accounts, and other malicious components.
- Close open attack vectors (disable unnecessary accounts and ports, remediate unpatched
  software).
- If additional affected hosts are discovered, repeat identification and contain/eradicate them.

### 5.5 Recovery

- Restore systems to a known-good state, rebuilding from clean media wherever residual compromise
  is in doubt — a compromised machine is assumed fully untrustworthy; reinstall and fully patch
  before reconnection.
- Restore data only from verified-clean, uncompromised backups (BCDR), without reintroducing the
  original vulnerability.
- Confirm normal function; disable unnecessary services; install all vendor security patches.
- Apply elevated monitoring for related activity.
- Re-run vulnerability scans; for external services, confirm with the vendor before
  re-establishing connectivity.

### 5.6 Post-Incident Review

- Document the timeline, root cause, impact, and response effectiveness.
- Record a documented risk assessment (CS-05) and update detections, controls, and playbooks.
- Notify clients, regulators, and authorities as required by contract and law, within required
  timeframes (vendor breach notification no later than 30 days where applicable — see CS-09 /
  CS-18). **Client notification authority sits with the client per [CS-18](CS-18-client-shared-responsibility.md);
  Imperion notifies as contracted.**

## 6. Application to Autonomous Agents

The security agents are first-class incident responders, but their authority is bounded by the
autonomy framework defined once in the top umbrella (§4):

- **Autonomy ceiling.**
  - **Cyrus (SOC)** runs detection and analysis and may **auto-execute reversible containment
    under an approved runbook with an undo window — ceiling L4 (reversible-under-runbook).**
    Containment actions are nonetheless `always_gate` (below): the L4 capability is dialed and
    gauntlet-checked, not a license to act unsupervised.
  - **Roman (Deputy CISO)** handles **escalation and the post-incident review at L2** —
    internal, reversible: assembling the incident log, the timeline, and the PIR draft, and
    routing escalation. Roman does not execute containment or declare incidents.
- **`always_gate` actions (dial-proof floor).** A human decides, at every dial level: **declaring
  or escalating an incident**, **client notification / breach disclosure**, and any
  **destructive, identity, domain-controller, or backup action** taken during response
  (credential resets at scale, device wipes, rebuilds-from-media, token revocation campaigns).
  **Containment is `always_gate`** even though Cyrus is built to L4 — the agent prepares and
  proposes; a human approves before it fires.
- **Human-in-loop & easy-button.** As the dial climbs, detection, analysis, and evidence
  assembly run with less human attention; the declare / contain / notify floor never recedes. At
  each gate the agent hands the human a one-click resolution — the proposed containment action,
  its blast radius and undo window, the affected scope, and the approve action (Easy Mode applied
  to incident response: "clicking is containing").
- **Escalation & refusal.** Cyrus escalates any incident touching a client boundary, money, or
  identity infrastructure to Roman and the human CERT; an agent **refuses** to notify a client
  directly, to declare an incident on its own authority, or to take a destructive response action
  without the human gate — refusal classes stronger than a gate.
- **Evidence.** Every agent detection, analysis step, and proposed action writes the `agent_run`
  / `agent_message` ledger and feeds the incident log, so the IR timeline is reconstructable and
  every action is attributable to the accountable human.

## 7. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| CISO (human owner) | Owns the program and the CERT; declares incidents; approves containment, destructive response, and client notification. |
| CERT (human) | Coordinates response across the lifecycle; exercises judgment on containment. |
| CMT (human) | Convened for material/business-continuity incidents; tests plans annually. |
| Cyrus — SOC (agent) | Detects, analyzes, and proposes reversible containment under runbook; never declares or notifies. |
| Roman — Deputy CISO (agent) | Assembles the incident log and PIR; routes escalation; supports the human gate. |
| All actors | Report suspected incidents to Cybersecurity without delay. |

## 8. Enforcement & Audit

IR adherence is enforced structurally (the gauntlet gating declare/contain/notify and destructive
actions, the runbook/undo-window discipline, RLS/data-class on incident data) and verified
through the post-incident review, the audit and GRC functions (CS-17), and the eval goldens that
exercise the agents' containment proposals. The incident log and the `agent_run` ledger are the
evidence. The [coverage-matrix](../coverage-matrix.md) binds every IR-relevant procedure to this
program. Acting outside the gate — an agent declaring, notifying a client, or executing
destructive response without approval — is a high-severity violation that trips the agent's
kill-switch and is reviewed in the PIR.

## 9. Appendix — Signs of a Potential Security Incident

**Denial of Service.** Unusually slow or unavailable network; inability to reach public
resources; mailbox flooded so legitimate mail cannot be delivered; storage suddenly full.

**Malicious Code.** Abnormally slow performance or unexplained crashes; files deleted or
corrupted; altered browser/homepage or added components; persistent pop-ups; random error
messages; cursor moving without input.

**Unauthorized Access.** Equipment not in the condition it was left; files/folders added,
deleted, or changed; someone using a system or credentials that are not theirs; unexpected
privileged-account activity in Sentinel/Entra logs.

## 10. Related

**Procedures governed:** Stream 07 incident-response steps — detect, triage, contain, eradicate,
recover, review (catalog links). **Related policies:** [CS-00](CS-00-information-security-program.md) ·
CS-05 (Risk Management) · CS-07 (AI Governance) · CS-09 (Vendor & Third-Party Security Risk) ·
CS-10 (Logging, Monitoring & SIEM) · [CS-17](CS-17-audit-and-compliance-management.md) ·
[CS-18](CS-18-client-shared-responsibility.md) · [CS-19](CS-19-acceptable-use.md) · BCDR (Backup,
Recovery & Business Continuity). **ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial +
ceilings) · ADR-0058 (gauntlet / send-path) · ADR-0118 (data-class action ceiling) · ADR-NNNN
(policy-canon architecture).
