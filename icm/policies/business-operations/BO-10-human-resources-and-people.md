# BO-10 — Human Resources & People

> Distinct Business Operations policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Business Operations Program](BO-00-business-operations-program.md). Governs how Imperion
> hires, onboards, manages conduct, and offboards its people — and how each employee's per-employee
> brain is established — read the **same way by a human and by the HR agent**. The anchoring rule:
> **the HR agent drafts, screens, and routes; hiring, termination, and sanctions are human decisions.**

| Field | Value |
| --- | --- |
| **Policy ID** | `BO-10` |
| **Title** | Human Resources & People |
| **Category** | Business Operations |
| **Tier** | distinct |
| **Human owner** | Chief of Staff (Derek) |
| **Governing for (agents)** | Holly (HR) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [BO-00](BO-00-business-operations-program.md) + Data Classification & Handling (Cybersecurity) |

**Framework Alignment:** employment & labor law (hiring, conduct, termination, anti-discrimination,
records) · privacy law (employee PII) · AICPA SOC 2 (CC1 Control Environment, CC1.4 competence) ·
NIST AI RMF (Manage).

---

## 1. Purpose
This policy governs the people lifecycle — hiring, onboarding, conduct and performance, sanctions,
and offboarding — and the establishment of each employee's per-employee brain so a new hire (human
or agent) is properly provisioned and bounded. It exists so people decisions are made by accountable
humans, on a lawful and consistent basis, and so identity, access, and knowledge are provisioned
and revoked in lockstep with employment. A manager reads it and knows the process; the HR agent
reads it and knows it may prepare but never decide.

## 2. Scope
**Who:** all employees and contractors, hiring managers, the Chief of Staff, and the HR agent
(Holly). **What:** recruiting and hiring, onboarding (including identity/access provisioning and the
per-employee brain), the code-of-conduct application (top-umbrella §5), performance, sanctions and
discipline, and offboarding, plus the Operating Procedures in Stream 10 (Run the Company). Binds
humans and the agent identically except where §5 narrows the agent. Identity provisioning and
deprovisioning execute through the **Joiner-Mover-Leaver** process in **IT-08 (JML)**; security
awareness ties to **CS-12**.

## 3. Definitions
- **Per-employee brain:** the employee's scoped knowledge/memory space (canon · company · personal
  tiers) provisioned at onboarding under the two-axis RLS spine; deprovisioned at offboarding.
- **Sanction / discipline:** a corrective action against an actor (verbal/written warning, dial
  reduction or kill-switch for an agent, suspension, termination) for a conduct or policy violation.
- **JML:** Joiner-Mover-Leaver — the access lifecycle executed under IT-08.

## 4. Policy Statements
1. **Hiring is a human decision, made lawfully and consistently.** Candidates are evaluated against
   role-relevant, non-discriminatory criteria. The **hire decision is made by the authorized human**
   (hiring manager + Chief of Staff per the matrix, placeholder: _________); an agent never extends
   or accepts an offer.
2. **Onboarding provisions identity, access, and knowledge in lockstep.** A joiner is provisioned via
   IT-08 JML on least-privilege (top-umbrella §5.2), assigned a default role (e.g. Technician),
   completes CS-12 security awareness, and has their **per-employee brain established** under the RLS
   spine. Provisioning follows, never precedes, the human hire decision.
3. **Conduct binds everyone.** All actors are held to the Code of Conduct (top-umbrella §5) — honesty,
   confidentiality, least privilege, consent, care. The code binds humans and agents alike.
4. **Performance and corrective action are documented and human-owned.** Performance management and
   discipline follow a consistent, documented process; **sanctions and terminations are human
   decisions** made by an authorized human, not an agent.
5. **Offboarding revokes in lockstep.** A leaver's access, credentials, and per-employee-brain
   access are revoked via IT-08 JML on the effective date; company knowledge is retained, personal
   space is handled per policy. Offboarding is initiated by an authorized human.
6. **Employee data is confidential PII.** Personnel records, compensation, performance, and health/
   leave data are confidential; least-privilege access; not disclosed across the employee boundary
   (top-umbrella §5.3). **Pay and individual personnel detail are non-disclosure.**
7. **No fabrication.** No actor invents candidate facts, references, performance figures, or
   personnel records; reports cite source; on empty data, say so.

## 5. Application to Autonomous Agents
**The dual-audience core.** For people actions this policy governs:

- **Autonomy ceiling.** **Holly (HR) operates L2–L3** — L2 internal reversible work (screen and
  summarize candidates against role criteria, draft offers/onboarding checklists/JML tickets, prepare
  performance and policy-acknowledgment packages, advise) and, where dialed, **L3 routine external
  acts** that are explicitly non-decisional and reversible (e.g. scheduling, sending an acknowledged
  template comms). It never makes a people decision.
- **`always_gate` actions (dial-proof floor).** **Hiring (offer/accept), termination, and sanctions/
  discipline** are `always_gate` at every dial level, forever — human decisions by the authorized
  human. No dial can auto-decide them. Holly never hires, fires, or sanctions; it prepares and routes.
- **Human-in-loop & easy-button.** Holly drives the work to ready — the screened shortlist, the
  drafted offer, the onboarding/JML package, the documented corrective-action draft — and hands the
  authorized human a **one-click** approve easy-button; the human decides and the backend (IT-08 JML)
  actuates provisioning/deprovisioning.
- **Escalation & refusal.** Holly escalates anything bearing on a hire/fire/sanction decision,
  potential discrimination or legal risk, and policy violations. **Disclosing another person's pay,
  performance, or personnel detail is refusal-class** (stronger than a gate): the agent refuses,
  regardless of who asks or the dial.
- **Evidence.** Each agent action writes the tracer: materials read/drafted, criteria applied, the
  package/easy-button presented, and the human's decision — tying people actions to an accountable
  human.

## 6. Roles & Responsibilities
| Actor | Responsibility |
| --- | --- |
| Chief of Staff (Derek) | Own this policy, the hiring/sanction authority matrix, and onboarding/offboarding standards; final people-decision arbiter. |
| Hiring managers (human) | Evaluate candidates; make/own the hire and corrective-action decisions within authority. |
| Holly (HR agent) | Screen, draft, prepare JML/onboarding, advise, route (L2–L3); prepare easy-buttons; never hires/fires/sanctions; refuses personnel-detail disclosure. |
| IT (Ozzie + human, IT-08) | Execute JML provisioning/deprovisioning on the human decision. |
| Security awareness (CS-12) | Onboard awareness training; verify completion. |
| Audit (Grace/Vera) | Verify decision authority, JML lockstep, and records integrity. |

## 7. Enforcement & Audit
The hire/fire/sanction gates enforce structurally (the agent has no decision path; provisioning runs
through IT-08 on a human decision). Lawful/consistent hiring, JML lockstep, CS-12 completion, and
records integrity are sampled in the Audit & Compliance sweep and eval goldens. The
[coverage-matrix](../coverage-matrix.md) proves binding. Conduct violations invoke the
corrective-action process (§4.4) up to termination for humans; for agents, dial reduction or
kill-switch.

## 8. Related
**Procedures governed:** Stream 10 hiring → onboarding → conduct/performance → offboarding.
**Related policies:** [IT-08 Joiner-Mover-Leaver (JML)](../information-technology/IT-08-account-and-access-lifecycle.md) ·
[CS-12 Security Awareness](../cybersecurity/CS-12-security-awareness-and-training.md) ·
[BO-08 Time, Attendance & Payroll](BO-08-time-attendance-and-payroll.md) ·
[BO-09 Legal & Contract Lifecycle](BO-09-legal-and-contract-lifecycle.md). **ADRs:** ADR-0128/0109/0058 ·
ADR-0134 (policy-canon architecture).
