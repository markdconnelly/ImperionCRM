# CS-19 — Acceptable Use

> Distinct Cybersecurity policy — the **universal acceptable-use baseline** for the canon.
> Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program](CS-00-information-security-program.md). Rewritten from
> the legacy `IM010 — Acceptable Use & AI Acceptable Use Policy`; substance and framework
> mappings preserved, restructured to the dual-audience template. This policy states **how every
> actor — human and agent — may use Imperion systems, data, and AI**; it operationalizes the
> top umbrella's code of conduct (§5) into concrete use rules.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-19` |
| **Title** | Acceptable Use |
| **Category** | Cybersecurity |
| **Tier** | distinct (universal baseline) |
| **Human owner** | Chief Information Security Officer (Mark Connelly); HR and Legal reviewed |
| **Governing for (agents)** | ALL agents — Nova, the 5 C-suite, and the 20 sub-agents (and all human workforce members) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00](CS-00-information-security-program.md) + CS-07 (AI Governance & Secure Deployment) · CS-08 (Data Classification & Handling) · CS-10 (Logging, Monitoring & SIEM) |

**Framework Alignment:** NIST CSF 2.0 (GV.PO, PR.AT) · NIST AI RMF (Govern, Manage) · AICPA SOC 2 (CC1.1, CC2.2, CC5.3).

---

## 1. Purpose

To define acceptable and prohibited use of Imperion's information systems, networks, data, and —
critically — AI, so that productivity-enhancing technology is used securely, ethically, and in
compliance with client obligations. This is the universal baseline every actor inherits: a human
employee, a contractor, and an AI agent all read these same use rules. It is the concrete
expression of the code of conduct in the top umbrella (§5) — honesty, least privilege,
confidentiality, verification, surfacing the irreversible.

## 2. Scope

**Who:** all Imperion workforce members, contractors, and consultants, **and all AI agents**,
using Imperion or client systems, data, and AI tools. **What:** general system/account use,
prohibited use, monitoring, and AI acceptable use (the rules covering generative assistants,
embedded AI such as Microsoft 365 Copilot, AI coding assistants, AI in the Kaseya platform, and
any third-party or browser-based AI service). As a universal baseline this policy is inherited by
**every** Operating Procedure and is not restated per entry (top umbrella §6). Binds humans and
agents identically except where §5 narrows or gates an agent's authority.

## 3. Definitions

- **AI tools.** All forms of AI/ML tools — generative assistants (chat, code, image), AI features
  embedded in productivity suites (e.g., M365 Copilot), AI coding assistants, AI features in the
  Kaseya platform, and any third-party or browser-based AI service.
- **Shadow AI.** Use of an unapproved AI service for company or client work — prohibited.
- **Assistive output.** AI output treated as a draft to be verified, never as authoritative.

## 4. Policy Statements

### 4.1 General use

1. **Legitimate business purpose.** Imperion systems and accounts are for legitimate business
   purposes. Incidental personal use is permitted only where it does not interfere with duties,
   consume material resources, or introduce risk.
2. **Least privilege.** Every actor accesses only the data and systems it is authorized for,
   under least privilege (agents are bounded by their room budget, `workflow ⊆ domain ⊆
   Constitution`).
3. **Prohibited use — every actor may never:** share, weaken, or circumvent authentication or
   security controls; upload sensitive information to unapproved services or send it to personal
   accounts; install unauthorized software or connect unauthorized devices to managed networks;
   use Imperion or client systems for unlawful, harassing, discriminatory, or fraudulent
   activity; or attempt to access, copy, or exfiltrate client data beyond an authorized
   engagement's scope.
4. **Monitoring.** All activity on Imperion and managed networks is subject to logging,
   monitoring, and audit (CS-10). There is no expectation of privacy in the use of company
   systems. (Agent activity is additionally captured in the `agent_run` ledger.)

### 4.2 AI acceptable use

5. **Approved tools only.** Only AI tools reviewed and approved by Information Security (and,
   where they process client data, accepted under CS-07 and the client agreement) may be used for
   business work. Shadow AI is prohibited; a current approved-tool list is maintained by
   Information Security. (Imperion's own settled stack — Claude + Voyage — is the approved AI for
   the platform's own agents.)
6. **What may never be entered.** No actor inputs the following into any AI tool unless that
   specific tool is explicitly approved for that data class with appropriate contractual and
   technical protections (no-training guarantees, tenant isolation): client sensitive
   information, credentials, secrets, or compromise-enabling configuration; PII, protected health
   information, or financial data; Imperion trade secrets, security-architecture details,
   incident details, or source code containing secrets; any Confidential/Restricted data into a
   consumer/public AI service. *When in doubt, do not enter it — ask Information Security.*
7. **Human oversight and accountability.** AI output is **assistive, not authoritative.** The
   responsible actor remains fully accountable for any work product, decision, code, or client
   deliverable derived from AI. Output is reviewed for accuracy, security, licensing, and
   appropriateness before use; unverified output is not delivered to clients or acted on in
   production. AI must not be the sole basis for decisions that materially affect a person's
   rights, employment, security posture, or access.
8. **Security and code.** AI-generated code is reviewed and tested before deployment and must not
   introduce secrets, vulnerable dependencies, or license violations. AI must not be used to
   generate or assist malicious code, to circumvent security controls, or to process another
   party's data without authorization.
9. **Transparency and ethics.** Where client contracts or law require disclosure of AI use, that
   disclosure is made. AI is used consistently with fairness, non-discrimination, and Imperion's
   professional obligations.
10. **Systems vs. use.** This policy governs individual *use* of AI; the deployment,
    configuration, and security of AI systems (including M365 Copilot and any AI Imperion
    delivers to clients) is governed by **CS-07 (AI Governance & Secure Deployment)**.

## 5. Application to Autonomous Agents

Agents are not exempt from acceptable use — they are its primary subject. For their own
operation, agents apply this baseline under the autonomy framework defined once in the top
umbrella (§4):

- **Autonomy ceiling.** Acceptable-use compliance is a **floor on every action at every level** —
  it does not raise or lower with the dial. The ceiling that applies is whatever the action's
  own policy sets; this policy constrains *how* every action is performed (least privilege,
  approved tools, no-fabrication, verification).
- **`always_gate` actions (dial-proof floor).** The general-conduct floors are absolute: an agent
  **never** fabricates (honesty), **never** exceeds least privilege, **never** enters prohibited
  data into a non-approved tool, and **never** uses an unapproved (shadow) AI service. These are
  not gated-then-allowed; they are prohibited. Anything irreversible or touching
  permissions/billing/deploys/production data is surfaced to a human before acting.
- **Grounding obligation.** Agents ground reads in OKF/retrieval, cite sources, and on empty data
  say so — they never answer on empty (top umbrella §5.1). This is the agent form of "AI output
  is assistive, not authoritative."
- **Human-in-loop & easy-button.** Where a use decision needs a human (a new tool, a borderline
  data class), the agent prepares a one-click resolution — the request, the data class, the
  approved-tool check — for Information Security to approve, rather than self-authorizing.
- **Escalation & refusal.** An agent must escalate any request to use an unapproved tool or enter
  prohibited data and must **refuse** to fabricate, to circumvent a control, or to assist
  malicious code — refusal classes stronger than a gate.
- **Evidence.** Every agent action is logged in the `agent_run` / `agent_message` ledger,
  attributable to the human it works for, satisfying the monitoring statement (§4.1).

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| CISO (human owner) | Owns the policy and the approved-AI-tool list; adjudicates borderline use. |
| HR / Legal (human) | Owns the disciplinary and disclosure consequences of misuse. |
| Workforce members & contractors (human) | Use systems, data, and AI within these rules; verify AI output; report misuse. |
| Nova + all agents | Operate within the baseline on every action; ground and cite; refuse fabrication and prohibited use. |
| Information Security (human) | Reviews and approves AI tools; maintains the approved list. |

## 7. Enforcement & Audit

Adherence is enforced structurally (least-privilege budgets, the gauntlet, approved-tool
allowlisting, RLS/data-class) and verified continuously (logging/monitoring CS-10, agent eval
goldens, the audit sweep CS-17). For humans, violations may result in disciplinary action up to
and including termination and may be reported to clients or authorities where contractual or
legal obligations require. For agents, a violation parks the work and escalates; repeated or
high-severity misuse lowers the dial or trips the kill-switch. The
[coverage-matrix](../coverage-matrix.md) treats this policy as a universal driver of every
procedure.

## 8. Related

**Procedures governed:** universal baseline — inherited by every Operating Procedure (top
umbrella §6). **Related policies:** [CS-00](CS-00-information-security-program.md) · CS-07 (AI
Governance & Secure Deployment) · CS-08 (Data Classification & Handling) · CS-10 (Logging,
Monitoring & SIEM) · [CS-18](CS-18-client-shared-responsibility.md) · top-umbrella Code of
Conduct (§5). **ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + ceilings) · ADR-0058
(gauntlet) · ADR-0043 (settled AI stack) · ADR-0129 (platform credentials) · ADR-0134
(policy-canon architecture).
