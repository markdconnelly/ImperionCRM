# CS-16 — Data Retention & Disposal

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program](CS-00-information-security-program.md). Rewritten from
> the legacy `IM024 — Data Retention & Disposal Policy`; substance and framework mappings
> preserved, restructured to the dual-audience template.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-16` |
| **Title** | Data Retention & Disposal |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly); Legal consulted on schedules and holds |
| **Governing for (agents)** | Grace (GRC), Roman (Deputy CISO), Phoenix (BCDR — backup retention) — and all agents for the data-lifecycle baseline |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00](CS-00-information-security-program.md) + CS-08 (Data Classification & Handling) · CS-14 (Privacy & Data Protection) · CS-18 (Client Shared Responsibility) |

**Framework Alignment:** NIST CSF 2.0 (PR.DS, ID.AM) · NIST SP 800-88 · AICPA SOC 2 (C1.2, CC6.5).

---

## 1. Purpose

To define how long Imperion keeps data and how it securely disposes of data when it is no
longer required, balancing business need, legal/regulatory/contractual obligation, and the
risk of holding data longer than necessary. A new hire or a newly onboarded agent reads this
and knows that data has a defined lifespan and a documented end.

## 2. Scope

**Who:** all Imperion employees, contractors, and AI agents that create, store, process, or
dispose of data — and every agent that writes to the medallion tiers, the agent memory layer,
or backups. **What:** all Imperion and Imperion-managed data and media (electronic and
physical), the retention schedule, legal holds, secure disposal, and client offboarding. This
policy binds humans and agents identically except where §5 narrows or gates an agent's
authority. Governs every Operating Procedure with a data-retention or disposal step (see §8).

## 3. Definitions

- **Retention Period** — the defined duration data is kept before disposal.
- **Legal Hold** — a suspension of normal disposal when data is relevant to litigation,
  investigation, or regulatory inquiry; releases only on Legal's instruction.
- **Sanitization** — rendering data unrecoverable to NIST SP 800-88 standards.
- **Disposal** — deletion, destruction, or sanitization of data or media at end of retention.

(Canonical data-class and medallion-tier terms defer to CONTEXT.md; governance terms defer to
the top umbrella.)

## 4. Policy Statements

1. **Retain only as long as needed.** The responsible party retains data only as long as
   necessary for its business purpose or as required by law, regulation, or contract;
   unnecessary retention is avoided (data minimization).
2. **Schedule-driven.** Retention periods are defined by data type in a retention schedule
   maintained by Information Security with Legal input. The schedule is the authority; ad-hoc
   retention decisions are not made outside it.
3. **Client data floor.** Client data retention follows the applicable client agreement and is
   never shorter than contractually required (CS-18 governs the client boundary).
4. **Retention schedule (illustrative — finalized in the schedule).**

   | Data Category | Typical Retention | Basis |
   | --- | --- | --- |
   | Security/audit logs | ≥ 1 year (90 days hot) | CS-10, contract/regulation |
   | Backups | Per system RPO/retention design | CS-IR / BCDR |
   | Client data | Per client contract; returned/destroyed at termination + agreed period | CS-18 |
   | Personal data | Purpose-limited; per law | CS-14 |
   | Contracts/legal records | Per legal requirement | Legal |
   | Email | Per Microsoft Purview retention policy | Business/legal |
   | Agent memory / conversation turns | Per the knowledge-tier lifecycle and applicable data class | CS-08, ADR-0113 |

5. **Legal holds override disposal.** On notice of litigation, investigation, or regulatory
   inquiry, affected data is placed on legal hold and is exempt from disposal until Legal
   releases it. A hold always wins over a scheduled deletion.
6. **Secure disposal.** Electronic media is sanitized to NIST SP 800-88 or physically
   destroyed; paper with sensitive information is shredded; cloud-data deletion relies on
   provider attestations and contractual exit provisions. Disposal of media holding
   Restricted/Confidential data is documented.
7. **Client offboarding.** At the end of an engagement, client data is returned or securely
   destroyed per contract and the destruction is documented.
8. **Automate where feasible.** Retention and disposal are enforced through Microsoft Purview
   retention/labeling and backup-platform policies where feasible, not by manual sweeps alone.

## 5. Application to Autonomous Agents

For retention and disposal actions, agents operate under the autonomy framework defined once in
the top umbrella (§4):

- **Autonomy ceiling.** Agents may operate at **L0–L2** for these actions: observe data ages,
  propose disposal candidates, and perform **reversible, internal** retention tasks (applying a
  retention label, queuing a candidate). Grace and Roman flag schedule drift and over-retention;
  Phoenix surfaces backup-retention exceptions. No agent self-authorizes a deletion beyond a
  reversible internal queue.
- **`always_gate` actions (dial-proof floor).** Any **destructive or irreversible deletion**,
  any **purge of client data**, any **disposal of Restricted/Confidential media**, and **any
  release or override of a legal hold** require a human decision at every dial level. These are
  destructive/data-class actions per the top umbrella and can never be auto-approved.
- **Human-in-loop & easy-button.** As the dial climbs, routine label-application and
  candidate-flagging recede from human attention, but the destructive floor stays. At each gate
  the agent prepares a one-click resolution — the disposal list, the basis (schedule row or
  contract clause), the hold-status check, and the approve action — so the human clicks rather
  than assembles.
- **Escalation & refusal.** An agent must escalate any disposal request that conflicts with an
  active legal hold and must **refuse** to delete data under hold regardless of dial level — a
  refusal class stronger than a gate. Ambiguity over retention basis escalates to the human
  owner.
- **Evidence.** Every agent retention/disposal action writes the audit record (the
  `agent_run` / `agent_message` ledger): what data, the schedule/contract basis, the hold check,
  and — for executed disposal — the sanitization method and approver.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| CISO (human owner) | Owns the policy and the retention schedule; approves destructive disposal and offboarding destruction. |
| Legal (human) | Sets legal-required retention; places and releases legal holds. |
| Grace — GRC (agent) | Detects over-retention and schedule drift; proposes disposal candidates; evidences disposal. |
| Roman — Deputy CISO (agent) | Reviews retention exceptions; routes destructive disposal to the human gate. |
| Phoenix — BCDR (agent) | Maintains backup retention per design; surfaces backup-retention exceptions. |
| All agents | Apply retention labels and the data-lifecycle baseline to data they create; never delete under hold. |

## 7. Enforcement & Audit

Adherence is enforced structurally (Purview/label policies, the gauntlet gating destructive
actions, RLS/data-class) and verified by the audit and GRC functions (CS-17) and the
conformance sweep. Disposal records and hold logs are the evidence. The
[coverage-matrix](../coverage-matrix.md) proves every retention/disposal procedure is bound.
Improper retention or disposal — especially deleting data under hold or over-retaining client
data — is a violation that parks the work, escalates, and may lower the responsible agent's dial.

## 8. Related

**Procedures governed:** data-lifecycle, client-offboarding, and backup-retention steps
(catalog links). **Related policies:** [CS-00](CS-00-information-security-program.md) ·
CS-08 (Data Classification & Handling) · CS-10 (Logging, Monitoring & SIEM) · CS-14 (Privacy &
Data Protection) · CS-17 (Audit & Compliance Management) · [CS-18](CS-18-client-shared-responsibility.md).
**ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + ceilings) · ADR-0058 (gauntlet) ·
ADR-0113 (verbatim-bronze / memory lifecycle) · ADR-NNNN (policy-canon architecture).
