# CS-12 — Security Awareness & Training

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program](CS-00-information-security-program.md). Rewritten from the
> legacy `IM022` during the CS re-sort: same program and framework mappings, restructured to the canon
> template and extended with how the *agent* members of the workforce are "trained" (persona + eval
> goldens) alongside the human awareness program.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-12` |
| **Title** | Security Awareness & Training |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly); reviewed by HR / Executive Suite |
| **Governing for (agents)** | Grace (GRC) tracks the program; **all agents** are "trained" subjects via persona + eval goldens |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00](CS-00-information-security-program.md) + CS-07 (AI Governance) · CS-11 (Email/Anti-Phishing) · CS-19 (Acceptable Use) |

**Framework Alignment:** NIST CSF 2.0 (PR.AT-01, PR.AT-02) · SOC 2 (CC1.4, CC2.2).

---

## 1. Purpose

Ensure every workforce member understands their security responsibilities and has the knowledge to
protect Imperion and client information, building a security-aware culture consistent with "security is
our reputation." In a hybrid workforce, "the workforce" is humans **and** agents: humans are trained
through the awareness program; agents are "trained" through their personas, their grounding rules, and
the eval goldens that test the same behaviors the program teaches a human.

## 2. Scope

**Who:** all Imperion workforce members and contractors (the human awareness program) and **all agents**
(the persona/eval-golden equivalent). **What:** new-hire and annual training, quarterly reminders,
role-based and AI-use training, phishing simulation, and the effectiveness review — plus the
agent-side equivalents in §5. The policy binds humans and agents identically except where §5 describes
the agent mechanism. No business units are excluded.

## 3. Definitions

Only program-specific terms; canonical and governance terms defer to CONTEXT.md and the top umbrella.

- **Eval golden** — a fixed test case with an expected agent behavior, used to verify an agent acts as
  trained (the agent analogue of a passed awareness assessment).

## 4. Policy Statements

### 4.1 New-hire training
1. All new workforce members complete security and privacy awareness training before or upon receiving
   access, covering acceptable use (CS-19), data handling (CS-08), phishing recognition (CS-11),
   incident reporting, and AI use (CS-07).

### 4.2 Annual training & attestation
2. All workforce members complete annual security awareness training and pass an assessment attesting
   to their understanding of policy.
3. Completion is tracked and recorded as audit evidence.

### 4.3 Quarterly reminders
4. The CISO issues quarterly security reminders themed to current threats and trends drawn from
   incident and phishing-simulation data.

### 4.4 Role-based training
5. Workforce members in privileged, technical, or developer roles receive additional role-specific
   training (secure configuration, secure use of AI tools, privileged-access handling).

### 4.5 Phishing simulation
6. Recurring phishing-simulation testing (Kaseya) measures susceptibility and reinforces training;
   results inform targeted follow-up (CS-11).

### 4.6 AI awareness
7. Training includes responsible and secure use of AI tools, including what data may never be entered
   into AI services (CS-07, CS-19).

### 4.7 Effectiveness & improvement
8. Training content and frequency are reviewed at least annually and adjusted to the threat landscape,
   incident trends, and regulatory change.
9. Awareness metrics (completion rates, phishing-simulation results, and — for agents — eval-golden
   pass rates) are reported to the CISO.

## 5. Application to Autonomous Agents

An agent is a workforce member, so it is "trained." The mechanism differs from human training but the
intent and the audit are the same.

- **How an agent is "trained."** An agent's persona and grounding rules encode the same obligations the
  human program teaches — least privilege, honesty/no-fabrication, the pool principle, phishing/BEC
  refusal, data-class handling. The agent does not "take a course"; its trained behavior is asserted in
  its persona and **verified by eval goldens** before it is dialed up for production.
- **Autonomy ceiling.** This policy is administrative, not actuating — no agent gains world-changing
  authority from it. Grace (GRC) operates **audit-and-recommend** (≤ propose): she tracks completion,
  flags lapses, and proposes program changes.
- **`always_gate` actions.** Changing an agent's persona, its eval-golden set, or its production dial is
  `always_gate` — a human approves any change to what an agent is trained to do or how far it may act
  (this is the training-control equivalent of approving a curriculum change).
- **Human-in-loop & easy-button (P3).** Grace prepares a one-click "approve persona/golden update" or
  "approve remediation training assignment" with the gap and the proposed fix already assembled.
- **Escalation & refusal.** An agent that detects it is being asked to act outside its trained bounds
  refuses and escalates, rather than improvising — the runtime analogue of "stop and report."
- **Evidence.** Human completion records and agent eval-golden results are both retained as audit
  evidence; agent program changes write the `agent_run` tracer.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| CISO | Own the program; issue quarterly reminders; receive awareness + eval metrics. |
| HR / Executive Suite | Assign and track human training; enforce completion. |
| Grace (GRC agent) | Track completion and eval-golden coverage; flag lapses; propose program changes (no auto-execute). |
| All workforce (human) | Complete training; pass attestation; apply it. |
| All agents | Behave as trained (persona/grounding); pass eval goldens before production dial-up. |

## 7. Enforcement & Audit

Human adherence is verified by completion tracking and attestation; agent adherence is verified by
eval goldens and the conformance sweep, with results in the coverage-matrix entry. Missed human training
restricts access; a failed eval golden blocks an agent's dial-up and parks it at a lower ceiling until
remediated.

## 8. Related

**Procedures governed:** onboarding/access-grant procedures and the awareness program steps.
**Related policies:** [CS-07](CS-07-ai-governance-and-secure-deployment.md) ·
[CS-11](CS-11-email-security-and-anti-phishing.md) · [CS-19](CS-19-acceptable-use.md).
**ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + ceilings) · ADR-0058 (gauntlet) ·
ADR-0134 (policy-canon architecture).
