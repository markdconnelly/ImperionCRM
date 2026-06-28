# CS-11 — Email Security & Anti-Phishing

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program](CS-00-information-security-program.md). Rewritten from
> the legacy `IM021` during the CS re-sort: same controls and framework mappings, restructured to
> the canon template and extended with explicit agent obligations for any agent that **sends** mail.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-11` |
| **Title** | Email Security & Anti-Phishing |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly); operated by the Deputy CISO |
| **Governing for (agents)** | Cyrus (SOC) for detection/response; **Belle and Felix for any agent-originated send**; all agents for reporting suspicious mail |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00](CS-00-information-security-program.md) + CS-08 (Data Classification) · CS-10 (Logging & SIEM) · CS-14 (Privacy) · CS-IR (Incident Response) |

**Framework Alignment:** NIST CSF 2.0 (PR.DS, DE.CM, PR.AT) · SOC 2 (CC6.7, CC6.8, CC7.2).

---

## 1. Purpose

Protect Imperion and its clients from email-borne threats — phishing, business email compromise
(BEC), malware, and data leakage — and define acceptable email use and the controls protecting
Imperion and client mail. Email is the most common attack entry point and, for a hybrid workforce,
the channel where a human and an agent can each be tricked or impersonated; this policy binds both.

## 2. Scope

**Who:** all Imperion workforce members and contractors, and every agent that reads, sends, or acts
on email — primarily **Belle** and **Felix** (the agents authorized to draft and dispatch external
communications) and **Cyrus** (detection and response). **What:** all Imperion and Imperion-managed
email systems, the authentication and filtering controls on Imperion and managed-client domains, and
every Operating Procedure with an email-send or email-triage step. The policy binds humans and agents
identically except where §5 narrows or gates an agent's authority. No business units are excluded.

## 3. Definitions

- **Phishing** — fraudulent messages designed to steal credentials, deliver malware, or induce
  harmful action.
- **Business Email Compromise (BEC)** — targeted fraud impersonating a trusted party to induce
  payment or data disclosure.
- **Email authentication** — SPF, DKIM, and DMARC mechanisms that validate sender legitimacy.

Governance terms (autonomy ladder, dial, gauntlet, `always_gate`, easy-button) are defined in the
top umbrella and only localized below.

## 4. Policy Statements

### 4.1 Technical controls
1. Email is protected by **Microsoft Defender for Office 365** — anti-phishing, Safe Links, Safe
   Attachments, and anti-malware.
2. **SPF, DKIM, and DMARC** are configured and enforced on Imperion and managed-client domains, with
   DMARC moving toward an enforcement (reject/quarantine) policy.
3. Inbound mail is filtered for spam, malware, and impersonation; outbound mail is subject to DLP for
   sensitive information (CS-08).
4. External-sender warnings and impersonation protection are enabled.

### 4.2 Email encryption & sensitive data
5. Email containing Restricted or Confidential information uses message encryption; sending sensitive
   information to personal accounts is prohibited (CS-08, CS-14).

### 4.3 Acceptable use
6. Email is for legitimate business purposes; misuse (harassment, unlawful content, unauthorized data
   disclosure) is prohibited (CS-19).
7. Auto-forwarding of company mail to external addresses is disabled by default and permitted only by
   approved exception.

### 4.4 Phishing simulation & awareness
8. Imperion conducts recurring **phishing-simulation testing (Kaseya)** for itself and managed
   clients; results drive targeted training and repeat susceptibility triggers additional coaching
   (CS-12).
9. Workforce members are trained to recognize and report suspicious messages.

### 4.5 Reporting & response
10. Users and agents report suspected phishing through the designated mechanism (e.g., the
    report-message button / equivalent agent action).
11. Reported and detected threats are investigated; confirmed malicious mail is remediated tenant-wide
    (automated investigation and response), and significant events escalate to incident response
    (CS-IR).

### 4.6 Monitoring
12. Email threat detections and DLP events are forwarded to **Microsoft Sentinel** for correlation and
    alerting (CS-10).

## 5. Application to Autonomous Agents

Agents both **send** mail (Belle, Felix) and **defend** it (Cyrus). Both roles are bounded.

- **Autonomy ceiling.**
  - *Sending (Belle, Felix):* drafting and internal review are reversible internal acts (≤ L2);
    composing an outbound message is L1–L2. **Dispatching to any external recipient is a routine
    external act that never auto-fires** — see `always_gate`.
  - *Defending (Cyrus):* may auto-execute **reversible** containment under a runbook with an undo
    window (e.g., quarantine a reported message, soft-block a sender) up to its L4 ceiling.
- **`always_gate` actions (dial-proof floor).** Independent of dial level:
  - **Any external email send** — sending to a client, customer, or external party is a top-umbrella
    `always_gate` ("sending to a client/customer"). The agent prepares the message; a human approves
    the send.
  - **Sending Restricted/Confidential content or any content to a personal account** — gated and, for
    personal-account targets, refused (4.3, 4.5, CS-14).
  - **Tenant-wide remediation, mailbox-rule or transport-rule changes, and DMARC/authentication
    policy changes** — identity/mail-flow changes are gated.
- **Human-in-loop & easy-button (P3).** As a send-agent's dial climbs, *drafting and routing* recede
  to background, but the external-send gate stays. At each gate the agent hands the human a
  **one-click** approve-and-send (or approve-and-remediate) with the draft, recipients, and rationale
  already assembled — never "park and wait."
- **Escalation & refusal.** A send-agent **refuses** (stronger than a gate) to: dispatch without a
  verified recipient/consent basis (CS-19, Business Operations consent rules), spoof or impersonate any
  party, or relay content that fails DLP. Cyrus escalates any confirmed BEC/credential-theft event to
  CS-IR.
- **Evidence.** Every agent send and every containment action writes the 3-level `agent_run` tracer
  (proposed → gated/approved → executed), with the recipient class, the gate decision, and the human
  approver recorded.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| CISO / Deputy CISO | Own the policy; set DMARC/authentication posture; approve forwarding/send exceptions. |
| Cyrus (SOC agent) | Detect, investigate, and reversibly contain email threats; escalate confirmed incidents to CS-IR. |
| Belle, Felix (send agents) | Draft compliant outbound mail; respect DLP, consent, and the external-send gate; never spoof or send to personal accounts. |
| All workforce + agents | Report suspicious mail; do not auto-forward externally; handle Restricted/Confidential mail per CS-08/CS-14. |

## 7. Enforcement & Audit

DLP, Defender, and the external-send gate enforce structurally; the gauntlet blocks any ungated
external send. Adherence is verified by SOC monitoring in Sentinel, phishing-simulation metrics, agent
eval goldens that test refusal of un-consented/spoofed sends, and the conformance sweep. A violation
parks the work and escalates; repeated or high-severity violations lower the agent's dial or trip the
kill-switch.

## 8. Related

**Procedures governed:** Operating Procedures with an email-send or email-triage step (Stream 07 +
client-comms procedures). **Related policies:** [CS-08](CS-08-data-classification-and-handling.md) ·
[CS-10](CS-10-logging-monitoring-and-siem.md) · [CS-12](CS-12-security-awareness-and-training.md) ·
[CS-14](CS-14-privacy-and-data-protection.md) · [CS-19](CS-19-acceptable-use.md) ·
[CS-IR](CS-IR-technical-incident-response-program.md). **ADRs:** ADR-0128 (autonomy ladder) ·
ADR-0109 (dial + ceilings) · ADR-0058 (gauntlet / send path) · ADR-NNNN (policy-canon architecture).
