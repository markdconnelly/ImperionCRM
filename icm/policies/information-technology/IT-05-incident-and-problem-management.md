# IT-05 — Incident & Problem Management

> Distinct Information Technology policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [IT Operations Program umbrella](IT-00-it-operations-program.md). NEW policy (no legacy IM
> source) — written to the dual-audience canon template on the ITIL discipline that **incident =
> restore service** and **problem = eliminate root cause**, never conflated. Governance terms
> (autonomy ladder, dial, gauntlet, `always_gate`, easy-button, pool principle) are defined ONCE in
> the top umbrella; this policy localizes them, never redefines them.

| Field | Value |
| --- | --- |
| **Policy ID** | `IT-05` |
| **Title** | Incident & Problem Management |
| **Category** | Information Technology |
| **Tier** | distinct |
| **Human owner** | Chief Technology Officer (Derek / Mark; chief architect Luke) |
| **Governing for (agents)** | Ozzie (NOC — incident restore, L4) · Sage (L3 escalation + Problem Management, L3) · Felix (Service — request-driven incidents, L1) · Marshall (Change — permanent fix governed as a change) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [IT-00 IT Operations Program](IT-00-it-operations-program.md) + [IT-04 Monitoring & Event Management](IT-04-monitoring-and-event-management.md) + [IT-02 Change & Configuration Management](IT-02-change-and-configuration-management.md) |

**Framework Alignment:** NIST CSF 2.0 (RS.MA Incident Management; RS.AN Analysis; RC.RP Recovery) ·
AICPA SOC 2 (CC7.3 Incident Evaluation, CC7.4 Incident Response; A1 Availability) · ITIL Incident
Management & Problem Management.

---

## 1. Purpose

This policy governs how Imperion responds to service-affecting events and how it eliminates their
underlying causes — and it enforces the discipline that these are two distinct practices.
**Incident management restores service as quickly as safely possible. Problem management finds and
removes the root cause so the incident does not recur.** A new technician or agent reads this and
knows that closing an incident on a quiet symptom is not allowed, that a recurring incident must
spawn a problem record, and that the permanent fix is governed as a change (IT-02), never improvised.

## 2. Scope

**Who:** all incident and problem actors — human technicians and the IT agents (Ozzie, Sage, Felix),
with Marshall governing the permanent fix as a change. **What:** incident detection,
declaration, ownership, restoration, verification, and closure; major-incident bridge coordination;
and problem investigation — clustering, root-cause analysis, known-error recording, and the
permanent-fix hand-off; plus post-incident review (PIR). Governs the service-restoration and
root-cause procedures in **Stream 05 (Event → Resolution)** — work-escalation (OP-05-06),
major-incident bridge (OP-05-07), declare/resolve incidents (OP-05-04/05), investigate-problem
(OP-05-08), run-PIR (OP-05-09) — and the incident touchpoints of **Stream 04 (Request → Fulfil)**
(Felix triage/escalate/verify-and-close, OP-04-02/03/05). This policy binds humans and agents
identically except where §5 narrows or gates an agent's authority. Subject = both (`client` and
`imperion`).

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **Incident** — An unplanned interruption or degradation of a service. **The goal of incident
  management is to restore service** — fast and safe — *not* to find why it happened.
- **Problem** — The underlying cause of one or more incidents. **The goal of problem management is to
  eliminate the root cause** so the incident does not recur. An incident and a problem are never the
  same record and are never worked as one activity.
- **Known Error** — A problem with a documented root cause and a workaround, pending a permanent fix.
- **Major Incident** — A sev-1 / multi-CI / multi-client incident requiring a coordinated bridge,
  assigned roles (commander, comms, scribe), and a mandatory problem hand-off + PIR.
- **Severity (Sev-1 … Sev-4)** — The incident's business impact rating, driving response and the
  comms cadence (aligns with the IT-01 priority matrix).
- **Verification signal** — Independent evidence that the service is actually restored (clean
  telemetry window / post-restore check) — distinct from a remediation's own success claim.
- **Post-Incident Review (PIR)** — A blameless review after a major or threshold-crossing incident,
  producing a timeline, root cause, what-went-well/-wrong, and routed action items.
- **Incident record SoR** — The Autotask `ticket` (augment-not-replace); the ICM workspace
  orchestrates, the ticket records.

## 4. Policy Statements

The binding rules, written actor-neutral so a human and an agent read the same obligation.

### 4.1 Incident management (restore service)

1. **A service-affecting event is declared as an incident** with a severity, affected CIs/account,
   an owner, and a comms cadence; correlated alerts link to the one incident record (Autotask
   ticket = SoR).
2. **Severity drives response and comms.** The incident's severity sets the restoration urgency and
   the stakeholder/client communication cadence (aligned to the IT-01 SLA matrix).
3. **Restore first, safely.** Restoration uses a vetted reversible runbook where one exists (IT-04
   OP-05-03); high-severity, no-runbook, or hard-symptom incidents are escalated to L3 deep
   diagnosis (Sage). Identity / backup / domain-controller symptoms are escalate-only and never
   troubleshot blind.
4. **No close without a verification signal.** An incident is closed only on independent evidence
   that the service is restored; a symptom gone quiet is not a confirmed fix. Close-without-verification
   is **refused**, not merely gated.
5. **Major incidents run on a coordinated bridge.** Sev-1 / multi-CI / multi-client incidents stand
   up a bridge with assigned roles and a maintained timeline; they **always** emit a problem
   hand-off and trigger a PIR on close.

### 4.2 Problem management (eliminate root cause) — never conflated with incidents

6. **A recurring incident cluster or an unknown root cause opens a problem.** When an incident
   recurs, has no known root cause, or a fix masks a deeper issue, a **problem record** is opened —
   separately from the incident — to find and remove the cause.
7. **Root-cause analysis is evidenced and adversarially verified.** The responsible party clusters
   the incident set, traces CMDB relationships and change history, and forms a root-cause hypothesis
   that is challenged (refute-by-default) before it is accepted.
8. **A problem yields a known error and a permanent-fix recommendation.** The problem record
   documents the root cause, a workaround (the known error), and a recommended permanent fix.
9. **The permanent fix is governed as a change.** The permanent fix is raised as a `change_request`
   and governed through IT-02 (Marshall classifies, parks at the CAB gate, dispatches to the
   executing agent); problem management *proposes* the fix, it does not actuate it.
10. **Recurring problems are relationship and documentation signals.** A recurring problem on an
    account is handed to Client Success (Celeste) as a QBR signal, and the known error / runbook is
    documented in IT Glue (via Lexicon).

### 4.3 Cross-cutting

11. **Post-incident review is blameless and action-oriented.** A PIR after a major or
    threshold-crossing incident produces routed, owned action items (permanent fix → problem/Marshall;
    monitoring gap → NOC/IT-04; documentation → Lexicon).
12. **Client-facing incident/problem communication is owned by the relationship.** Any client-facing
    status, resolution notice, or shared PIR summary is a human-approved act (§5).

## 5. Application to Autonomous Agents

**The dual-audience core.** For incident and problem actions:

- **Autonomy ceiling.** **Ozzie (NOC)** restores service at **L4** — declare/sev/link/internal-note
  and reversible runbook restores auto from L2–L4 (with undo), high-sev/no-runbook escalated.
  **Sage (L3)** runs deep diagnosis and problem management at **L3** — low-risk reversible fixes auto
  (execute-then-notify); prod/irreversible fixes are drafted and parked; cluster/RCA/record auto
  (internal reversible). **Felix (Service)** handles request-driven incidents at **L1** (read-only
  diagnosis, propose-only). The **permanent fix** is governed by **Marshall as a change** (IT-02) —
  Sage proposes, Marshall governs, the executing agent actuates.
- **`always_gate` actions** (dial-proof floor, never auto at any level): **identity / backup /
  domain-controller** actions (escalate-only — Felix holds no grant at any dial); **prod migrations**,
  **destructive** ops; **closing an incident without a verification signal** (refused, a structural
  precondition); **all client-facing / stakeholder communication** including a shared PIR summary; and
  the **permanent-fix actuation**, which lands on the executing agent's `always_gate` for
  production-affecting change.
- **Human-in-loop & easy-button.** As the dial climbs, internal triage, restore-by-runbook, RCA, and
  record-keeping recede to auto, while client comms, irreversible/identity actions, and the
  permanent-fix change stay human forever. At each gate the agent drives the work to the goal and
  hands the human a **one-click** resolution (top-umbrella P3) — e.g. a drafted client status, a
  parked irreversible fix, a complete known-error record, or a PIR ready to review.
- **Escalation & refusal.** Felix **escalates (never troubleshoots)** identity/backup/DC symptoms;
  Ozzie/Sage **escalate** high-severity or irreversible work; the agent **refuses** to close on a
  quiet symptom and **refuses** to actuate a permanent fix outside the change process, even where a
  dial setting would allow it.
- **Evidence.** Every governed action writes an audit record to the `agent_run` / `agent_message`
  ledger — the incident declaration and severity, the restore action and its verification, the
  problem cluster and RCA with the refuted alternatives, the known-error record, and the change
  hand-off — attributed to the accountable human.

> **Substrate gap:** the **`problem` / `known_error` silver does not exist (#1577)** — problem
> management was dropped from #373 / ADR-0079 (Change-only), so today OP-05-08 parks as an internal
> note/work-note and cannot persist a true problem record. Until that silver lands, problem
> management is propose-only / note-only; the incident-vs-problem discipline in §4 is enforced
> procedurally.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| Chief Technology Officer (human) | Owns this policy and the incident/problem operation; sets the severity matrix; owns major-incident command |
| Incident commander (human — Derek; Sage as agent commander on the bridge) | Drives a major incident to restore on a coordinated bridge; assigns roles |
| Ozzie — NOC (agent, L4) | Declares, restores by reversible runbook with undo, resolves on a verification signal; escalates high-sev/no-runbook; emits problem-candidates |
| Sage — L3 / Problem Management (agent, L3) | Deep diagnosis + low-risk reversible restore; clusters, runs RCA, records the known error, proposes the permanent fix; runs PIRs |
| Felix — Service desk (agent, L1) | Request-driven incident triage, read-only diagnosis, verify-and-close; escalate-only on identity/backup/DC |
| Marshall — Change (agent, L2 gate) | Governs the permanent fix as a `change_request`; parks at the CAB gate, dispatches to the executor |
| Celeste — Client Success (agent / human) | Owns client-facing incident/problem communication and recurring-problem QBR signals |
| Lexicon — Documentation (agent) | Documents the known error / runbook in IT Glue (SoT) |

## 7. Enforcement & Audit

The gauntlet enforces structurally — client comms, identity/irreversible actions, and the
permanent-fix change cross a gate; close-without-verification is refused by contract; the
incident-vs-problem split is enforced as separate records and separate activities. Adherence is
verified continuously (the eval goldens on RCA quality and false-close rate, the QA function — Tess,
and the audit sweep — Grace/Vera). Every incident declaration, restore, problem record, and PIR is
an audit row; major incidents always produce a PIR with routed action items. The
[coverage-matrix](../coverage-matrix.md) proves the Stream 05 incident/problem procedures (and the
Stream 04 incident touchpoints) are bound to this policy. A violation parks the work and escalates;
repeated or high-severity violations lower the agent's dial or trip the kill-switch.

## 8. Related

**Procedures governed:** Stream 05 (Event → Resolution) — OP-05-04 (declare incident), OP-05-05
(resolve/close), OP-05-06 (work-escalation), OP-05-07 (major-incident bridge), OP-05-08
(investigate-problem), OP-05-09 (PIR); plus Stream 04 incident touchpoints OP-04-02/03/05.
**Related policies:** [IT-00 IT Operations Program](IT-00-it-operations-program.md) ·
[IT-04 Monitoring & Event Management](IT-04-monitoring-and-event-management.md) ·
[IT-01 Service Delivery & SLA Management](IT-01-service-delivery-and-sla-management.md) ·
[IT-02 Change & Configuration Management](IT-02-change-and-configuration-management.md) · the
Cybersecurity incident-response program (for security incidents). **ADRs:** ADR-0079
(problem/change) · ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard ceilings) · ADR-0058
(gauntlet) · ADR-0134 (policy-canon architecture). **Schema:** #1577 (`problem` / `known_error`
silver).
