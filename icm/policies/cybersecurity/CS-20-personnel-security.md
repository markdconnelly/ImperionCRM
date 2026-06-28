# CS-20 — Personnel Security

> Cybersecurity distinct policy. Inherits the
> [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) and the
> [CS-00 Information Security Program](CS-00-information-security-program.md). Personnel-security
> controls across the employment lifecycle for **all workforce members** — and the parallel
> lifecycle controls for the AI agents that act on Imperion and client systems.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-20` |
| **Title** | Personnel Security |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (reviewed by HR / Legal / Executive Leadership) |
| **Governing for (agents)** | Holly (HR), Osiris (IAM/JML), and all agents as a workforce-member analogue |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | top umbrella + CS-00 + CS-02 (IAM) + CS-19 (Acceptable Use) |

**Framework Alignment:** NIST CSF 2.0 (GV.RR, PR.AT-01/02, GV.OC) · AICPA SOC 2 (CC1.1, CC1.4, CC1.5).

---

## 1. Purpose
Establish personnel-security controls across the employment lifecycle — screening, onboarding,
ongoing responsibility, role change, separation, and discipline — so that the people (and the
agents) entrusted with Imperion and client information are suitable, informed, and accountable.

## 2. Scope
All Imperion employees, contractors, and consultants ("workforce members"), and — by analogue —
the AI agents that hold access to Imperion or client systems. Governs the human side of the
Joiner-Mover-Leaver lifecycle; the technical account/access lifecycle is
[IT-08](../information-technology/IT-08-account-and-access-lifecycle.md) and offboarding revocation
is [IT-09](../information-technology/IT-09-network-operations-and-access-termination.md).

## 3. Definitions
- **Workforce Member** — any employee, contractor, or consultant with access to Imperion or
  client systems or data.
- **Screening** — pre-employment verification appropriate to the role and access level.
- **Sanctions** — disciplinary measures for policy violations.

## 4. Policy Statements
1. **Pre-employment screening.** Background screening is performed before access is granted,
   proportional to the role's sensitivity and data access and consistent with law (identity,
   employment/education, criminal checks; additional checks for privileged or financially
   sensitive roles). Contractors/consultants are screened to an equivalent standard or covered by
   contractual assurances ([CS-09](CS-09-vendor-and-third-party-security-risk.md)).
2. **Onboarding (Joiner).** New members complete security & privacy awareness training before or
   upon receiving access ([CS-12](CS-12-security-awareness-and-training.md)) and sign
   acknowledgment of Acceptable Use ([CS-19](CS-19-acceptable-use.md)), confidentiality/NDA, and
   applicable policies. Access is provisioned least-privilege per role
   ([CS-02](CS-02-identity-and-access-management.md) / IT-08).
3. **Confidentiality & roles.** All members are bound by confidentiality obligations covering
   Imperion and client information, persisting beyond employment. Security responsibilities are
   defined in role descriptions (GV.RR).
4. **Ongoing obligations.** Annual awareness training + attestation; prompt reporting of suspected
   incidents ([CS-IR](CS-IR-technical-incident-response-program.md)).
5. **Role change (Mover).** On role change, access is re-evaluated and adjusted to least privilege;
   access no longer required is removed promptly (IT-08).
6. **Separation (Leaver).** Offboarding follows IT-09 — timely access revocation, token/session
   invalidation, device & credential recovery, secrets de-provisioning.
7. **Sanctions.** Security-policy violations are subject to a documented disciplinary process up to
   termination, applied consistently with HR and Legal; violations involving client data or legal
   obligations are reported to clients/authorities as required.

## 5. Application to Autonomous Agents
For the lifecycle actions this policy governs:
- **Autonomy ceiling.** Holly (HR) operates at **L2–L3** for the human lifecycle (drafts screening
  requests, onboarding packets, attestations, role-change and offboarding checklists). Osiris
  (IAM) executes the technical lifecycle at **L3** under IT-08/IT-09 ceilings.
- **`always_gate` actions.** Hiring, role-change approval, and **sanctions/termination** are human
  decisions at every dial level. Granting initial access and any privilege change are
  `always_gate` (CS-02). The agent prepares the full packet and presents a one-click approve.
- **Agent lifecycle analogue.** Onboarding/offboarding an *agent* is itself governed work: an
  agent is provisioned least-privilege (its room budget), "screened" via persona + eval-goldens
  before its dial is raised, re-scoped on role change, and fully de-authorized (kill-switch +
  budget removal) on retirement — the same Joiner-Mover-Leaver discipline applied to agents.
- **Escalation & refusal.** Adverse screening results, suspected insider risk, and any sanction
  escalate to HR/Legal/CISO; the agent never adjudicates discipline.
- **Evidence.** Every lifecycle action writes a tracer (who, what, approver) to the
  `agent_run`/`agent_message` ledger.

## 6. Roles & Responsibilities
| Actor | Responsibility |
| --- | --- |
| CISO (human owner) | Owns the policy; approves screening standards and sanctions. |
| HR / Legal (human) | Run screening, discipline, and termination; co-sign sanctions. |
| Holly (agent) | Drafts and tracks the human lifecycle packets; routes approvals. |
| Osiris (agent) | Executes the technical account/access lifecycle (IT-08/IT-09). |

## 7. Enforcement & Audit
Screening/onboarding completion and access-review records are audited (CS-17). Least-privilege is
enforced structurally (CS-02 / IT-08). The [coverage-matrix](../coverage-matrix.md) binds the
relevant Operating Procedures (Stream 04 JML, Stream 10 HR).

## 8. Related
**Procedures governed:** Stream 04 Joiner-Mover-Leaver (Osiris); Stream 10 HR/onboarding (Holly).
**Related policies:** [CS-02](CS-02-identity-and-access-management.md) ·
[CS-12](CS-12-security-awareness-and-training.md) · [CS-19](CS-19-acceptable-use.md) ·
[IT-08](../information-technology/IT-08-account-and-access-lifecycle.md) ·
[IT-09](../information-technology/IT-09-network-operations-and-access-termination.md) ·
[BO-10](../business-operations/BO-10-human-resources-and-people.md) (HR/people operations).
**ADRs:** ADR-0128/0109/0058; ADR-NNNN (policy canon).
