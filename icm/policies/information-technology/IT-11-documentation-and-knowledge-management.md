# IT-11 — Documentation & Knowledge Management (IT Glue)

> Distinct Information Technology policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [IT Operations Program umbrella](IT-00-it-operations-program.md). **New policy** (no
> legacy IM source): it formalizes how Imperion creates, maintains, secures, and governs IT
> operational documentation and knowledge across its own and managed client estates, with **IT
> Glue as the system of record**. Governance terms (autonomy ladder, dial, gauntlet,
> `always_gate`, easy-button, pool principle) are defined ONCE in the top umbrella; this policy
> localizes them.

| Field | Value |
| --- | --- |
| **Policy ID** | `IT-11` |
| **Title** | Documentation & Knowledge Management (IT Glue) |
| **Category** | Information Technology |
| **Tier** | distinct |
| **Human owner** | Chief Technology Officer (Derek / Mark; chief architect Luke) |
| **Governing for (agents)** | Lexicon (Documentation/Doc-Hygiene) — primary; all IT agents as runbook authors |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [IT-00 IT Operations Program](IT-00-it-operations-program.md) + [CS-12 Data Classification & Handling] + [CS-19 Data Retention & Disposal] |

**Framework Alignment:** NIST CSF 2.0 (ID.AM, GV.OC, PR.IP) · AICPA SOC 2 (CC2 Communication &
Information, CC6.1) · ITIL (Knowledge Management).

---

## 1. Purpose

This policy governs how IT operational documentation and knowledge — runbooks, network and
configuration documentation, standard operating procedures, passwords/secrets references, client
environment records, and how-to knowledge — are created, structured, secured, kept current, and
retired, with **IT Glue as the single source of record**. Accurate, accessible, access-controlled
documentation is what makes service delivery repeatable, onboarding fast, and incidents short. A
technician (or the documentation agent) reads this and knows where the truth lives, how to keep it
true, and what may never be written into it.

## 2. Scope

**Who:** all IT delivery actors — human technicians and the documentation agent (Lexicon), plus
every IT agent that authors runbooks. **What:** all IT operational documentation and knowledge for
Imperion and managed clients in IT Glue (and any sanctioned knowledge surface); the documentation
steps across Streams 03–06 and the knowledge-maintenance steps elsewhere. This policy binds humans
and agents identically except where §5 narrows or gates an agent's authority. No business unit is
excluded.

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **IT Glue** — Imperion's IT documentation platform and the **system of record (SoR)** for
  operational documentation and knowledge.
- **Runbook** — A documented, repeatable procedure for an operational task.
- **Projection** — A derived, read-aligned copy of authoritative documentation (e.g. an
  agent-authored runbook draft) that points back to the SoR and never competes with it.
- **Knowledge object** — A unit of curated knowledge (runbook, SOP, environment record) tracked in
  the SoR.

## 4. Policy Statements

1. **IT Glue is the single source of record.** Operational documentation and knowledge live in IT
   Glue. There are no competing, parallel, or hand-maintained authoritative copies; other surfaces
   (the app, agent runbooks, the OKF layer for *meaning*) are **projections** that reference IT
   Glue, never replacements for it. *One canon, zero drift.*
2. **Documentation is a required deliverable.** A service, change, or onboarding is not complete
   until its documentation is created or updated in the same unit of work. Code/config without
   documentation is incomplete (mirrors the repo documentation standard).
3. **Structure and discoverability.** Documentation is structured to a consistent template per
   document type (runbook, network doc, SOP, environment record), tagged to the responsible
   client/tenant, and discoverable. Each document names an owner and a last-reviewed date.
4. **Access control and the pool boundary.** Documentation access is least-privilege and scoped to
   the responsible client/tenant; client documentation **never** bleeds across client boundaries
   (RLS + `data_class`, top-umbrella §5.3 — *correlate, never bleed*). Restricted documentation
   (CS-12) is access-controlled accordingly.
5. **No secrets in prose; no client PII outside the controlled record.** Secrets, key material,
   and connection strings are referenced through the sanctioned secret store / password manager,
   **never** written into documentation prose. Client PII appears only within the access-controlled
   client record, never in shared/cross-tenant knowledge or in agent-authored projections.
6. **Currency and review.** Documentation is reviewed on a defined cadence and updated whenever the
   thing it describes changes (a CI change per IT-10/IT-02 updates the related documentation in the
   same change). Stale or orphaned documentation is a finding; superseded documentation is retired
   per retention/disposal (CS-19).

## 5. Application to Autonomous Agents

For authoring, updating, and curating documentation and knowledge:

- **Autonomy ceiling.** Lexicon (Documentation/Doc-Hygiene) operates at an **L3** ceiling
  (ADR-0128): it drafts and updates runbooks and knowledge objects, detects stale/orphaned/
  duplicate documentation, flags drift between docs and reality, and proposes corrections. All IT
  agents author runbooks **as projections** — a runbook an agent writes points back to IT Glue and
  never becomes a competing source.
- **`always_gate` actions.** **IT Glue is the SoR; agents do not silently overwrite the
  authoritative record.** Publishing or changing an authoritative IT Glue document is gated — a
  human owner approves the change via the easy-button — and any write touching a security-relevant
  or client-confidential document is `always_gate` at every dial level. Deleting/retiring an
  authoritative document is `always_gate` (irreversible-class, top-umbrella §4).
- **Human-in-loop & easy-button.** As the dial climbs, Lexicon may auto-draft the document, run
  the hygiene pass, and stage the diff against the SoR — then hand the owner a **one-click**
  publish (top-umbrella P3). The decision to make a draft authoritative stays human at every level;
  projections (drafts, agent runbooks) may be produced freely because they are non-authoritative.
- **Escalation & refusal.** Lexicon escalates (top-umbrella P4) on documentation drift affecting a
  security-relevant CI, a detected secret/PII written into prose, or a stale runbook on a critical
  service. Agents **refuse** to overwrite the SoR without recorded human approval, and **refuse** to
  write secrets or cross-tenant client PII into documentation, even if a dial setting would
  technically allow it (top-umbrella §5.5 + §5.3).
- **Evidence.** Every authoritative documentation change writes an audit record to the `agent_run`
  / `agent_message` ledger — the document, the diff against the SoR, the projection-vs-authoritative
  status, and the approve/decline attributed to the accountable human.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| CTO (human) | Owns the documentation/knowledge practice and this policy |
| Document owner / technician (human) | Authors and reviews documentation; approves authoritative IT Glue changes; keeps assigned docs current |
| Lexicon — Documentation/Doc-Hygiene (agent, L3) | Drafts/updates docs as projections; runs hygiene passes; detects stale/orphaned/duplicate docs and drift; stages diffs; never overwrites the SoR autonomously; never writes secrets/PII |
| All IT agents | Author runbooks as projections that reference IT Glue, never as competing sources |

## 7. Enforcement & Audit

Adherence is enforced structurally (the SoR/projection model, least-privilege + RLS/data-class on
documentation, the secrets-and-PII prohibition, the gauntlet on authoritative writes) and verified
continuously (doc-currency/orphan sweeps, secret/PII scanning of documentation, the agent eval
goldens, and the conformance/audit sweep run by Grace/Vera). The
[coverage-matrix](../coverage-matrix.md) proves every documentation step is bound to this policy. A
missing required document, a stale critical runbook, or a secret/PII written into prose is a
finding; for an agent, an attempt to overwrite the SoR or write secrets/PII parks the work,
escalates, and lowers the dial or trips the kill-switch.

## 8. Related

**Procedures governed:** the documentation steps across Streams 03–06 + knowledge-maintenance
steps. **Related policies:** [IT-00 IT Operations Program](IT-00-it-operations-program.md) ·
[IT-10 Provisioning, Asset & CMDB Management](IT-10-provisioning-asset-and-cmdb-management.md) ·
[IT-02 Change & Configuration Management] · [CS-12 Data Classification & Handling] ·
[CS-19 Data Retention & Disposal]. **ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard
ceilings) · ADR-0058 (gauntlet) · ADR-0060 (skills/docs change control) · ADR-0086 (OKF semantic
layer — *meaning* projection) · ADR-0134 (policy-canon architecture).
