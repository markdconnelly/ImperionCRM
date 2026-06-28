# IT-01 — Service Delivery & SLA Management

> Distinct Information Technology policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [IT Operations Program umbrella](IT-00-it-operations-program.md). NEW policy (no legacy
> IM source) — written to the dual-audience canon template for the Microsoft + Kaseya (Autotask /
> IT Glue / Kaseya RMM) delivery stack. Governance terms (autonomy ladder, dial, gauntlet,
> `always_gate`, easy-button, pool principle) are defined ONCE in the top umbrella; this policy
> localizes them, never redefines them.

| Field | Value |
| --- | --- |
| **Policy ID** | `IT-01` |
| **Title** | Service Delivery & SLA Management |
| **Category** | Information Technology |
| **Tier** | distinct |
| **Human owner** | Chief Technology Officer (Derek / Mark; chief architect Luke) |
| **Governing for (agents)** | Felix (Service desk, L1 default) · Scout (Dispatch, L3) · Celeste (Client Success — SLA ownership) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [IT-00 IT Operations Program](IT-00-it-operations-program.md) + [IT-05 Incident & Problem Management](IT-05-incident-and-problem-management.md) |

**Framework Alignment:** NIST CSF 2.0 (Respond — RS.MA; Recover — RC.RP) · AICPA SOC 2 (A1
Availability; CC7 Operations) · ITIL service-management practices (Service Level Management,
Request Fulfilment).

---

## 1. Purpose

This policy governs how Imperion commits to, measures, and meets the service levels owed to its
clients and to itself. Every managed-services contract carries service-level agreements (SLAs) —
response and resolution targets, availability commitments, and maintenance expectations. This
policy makes those commitments operational: it defines the SLA tiers, the priority/severity
matrix that drives them, how the SLA clock is started, paused, and met, and who owns the
relationship when a target is at risk. A new technician (human or agent) reads this and knows
what "on time" means and who decides when it is not.

## 2. Scope

**Who:** all IT delivery actors — human technicians and the IT delivery agents (Felix, Scout) —
and Celeste (Client Success) as SLA owner. **What:** every service request and incident handled
for a managed client or for Imperion itself (dogfood), the response/resolution clock on each, the
priority/severity classification that sets the target, ticket assignment, and the reporting of SLA
attainment. Governs the Operating Procedures in **Stream 04 (Request → Fulfil)** — intake/route
(OP-04-01), triage (OP-04-02), assignment (OP-04-08), onsite dispatch (OP-04-09) — and the
service-restoration timing of **Stream 05 (Event → Resolution)**. This policy binds humans and
agents identically except where §5 narrows or gates an agent's authority. Subject = both (`client`
and `imperion`).

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **SLA (Service-Level Agreement)** — A contractual commitment to a client expressed as response,
  resolution, and availability targets per priority. The contract is the system of record for the
  client's specific SLA; this policy is the default where the contract is silent.
- **Priority / Severity** — The classification (P1–P4) assigned at triage from **impact** (how
  many users / how critical the affected service) × **urgency** (how time-sensitive). Priority
  drives the SLA target.
- **Response target** — Elapsed time from ticket creation to first meaningful human/agent action
  (acknowledgement + triage), per priority.
- **Resolution target** — Elapsed time from ticket creation to service restored, per priority.
- **SLA clock** — The running timer against a target; it may be **paused** ("stop-clock") while
  waiting on the client or a third party, per the contract's pause rules.
- **Availability target** — The contracted uptime for a managed service (e.g., 99.9%), measured
  over the reporting period.
- **Service catalog & entitlement** — The defined services a client is entitled to and whether a
  request is covered or billable (grounds the covered-vs-billable decision, #1306).

### Default SLA tier matrix (where the contract is silent)

| Priority | Definition | Response target | Resolution target |
| --- | --- | --- | --- |
| **P1 — Critical** | Business-down: critical service unavailable, multiple users / a whole site, or active security impact | 15 minutes | 4 business hours |
| **P2 — High** | Major degradation: a key service impaired or a single critical user blocked | 1 business hour | 8 business hours |
| **P3 — Moderate** | Standard issue: limited impact, a workaround exists | 4 business hours | 2 business days |
| **P4 — Low / Request** | Service request, low-impact question, scheduled work | 8 business hours | 5 business days |

> A client's signed contract overrides this default. Targets are measured in the client's
> contracted service-hours window (business hours unless 24×7 is contracted).

## 4. Policy Statements

The binding rules, written actor-neutral so a human and an agent read the same obligation.

1. **Every ticket carries a priority and an SLA target.** At triage the responsible party assigns
   exactly one priority from §3 (impact × urgency); the corresponding response and resolution
   targets attach to the ticket. An untriaged ticket has no defined target and is itself an SLA
   risk.
2. **The contract wins.** Where a client's contract specifies different targets, hours, or
   stop-clock rules, the contract governs and the default matrix does not apply. Client-specific
   SLA terms are resolved through Client Mapping before the clock is interpreted.
3. **The SLA clock is honest.** It starts at ticket creation, pauses only under the contract's
   defined pause conditions (awaiting client, awaiting an approved third party), and is never
   paused or reset to mask a missed target. Stop-clock reasons are recorded.
4. **Assignment is skill- and load-aware.** A triaged ticket is routed to the best-matched
   available technician (human or agent) within skill, current load, and the SLA target; an
   unassigned ticket approaching its response target is escalated to a dispatcher.
5. **SLA risk is surfaced early.** When a ticket is trending toward a response- or
   resolution-target breach, the responsible party surfaces the risk to the SLA owner (Celeste)
   **before** the breach, with the one-click options to reassign, escalate, or notify the client.
6. **SLA ownership is a relationship function.** Celeste (Client Success) owns the SLA commitment
   and any client-facing conversation about attainment or a miss; Felix/Scout perform mechanical
   triage, assignment, and dispatch but do not own the relationship.
7. **No close without verification.** A ticket is resolved only on a present verification signal
   that the service is actually restored (per IT-05); a symptom gone quiet is not a confirmed fix
   and does not stop the resolution clock.
8. **Attainment is measured and reported.** Response/resolution attainment and availability are
   measured per client per reporting period and reviewed in the QBR cycle. A breach is recorded
   with its cause and any contractual remedy.
9. **Customer-facing commitments are gated.** Any commitment made to a client — a scheduled time,
   a resolution promise, an SLA-miss notice — is a human-approved act (see §5); no agent commits
   to a client autonomously.

## 5. Application to Autonomous Agents

**The dual-audience core.** For service-delivery actions (triage, assignment, dispatch, SLA-risk
handling):

- **Autonomy ceiling.** **Felix (Service)** operates at **L1 by default** (ADR-0128): he triages,
  performs read-only diagnosis, drafts, and proposes; he does not remediate or commit to a client
  on his own. Mechanical **internal assignment / self-assignment within limits** may reach L2/L3
  (reversible internal scheduling) as the skill/load model earns trust. **Scout (Dispatch)**
  operates at **L3** — internal scheduling and technician-match auto; the customer-facing schedule
  commitment is gated.
- **`always_gate` actions** (dial-proof floor, never auto at any level): any **customer-facing
  commitment or send** — confirming an onsite time, promising a resolution, posting a client-facing
  SLA notice (customer-facing + `client_pii`); and the categorical **identity / backup /
  domain-controller** symptoms, which Felix may never troubleshoot blind and must escalate (no grant
  at any dial — see IT-05).
- **Human-in-loop & easy-button.** As the dial climbs, internal triage and assignment recede to
  auto, but every client-facing commitment stays human. At each gate the agent drives the work to
  the goal and hands the human a **one-click** resolution (top-umbrella P3) — e.g. a fully drafted
  reassign/escalate/notify action the SLA owner approves with one click.
- **Escalation & refusal.** Felix **escalates** SLA-breach risk to Celeste before the breach; he
  **escalates (not troubleshoots)** any identity/backup/DC symptom; he **refuses** to commit to a
  client without a recorded human approval even if a dial setting would allow it.
- **Evidence.** Every governed action writes an audit record to the `agent_run` / `agent_message`
  ledger — the triage decision and priority rationale, the assignment, the SLA-clock state, and the
  approve/decline on any client commitment — attributed to the accountable human.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| Chief Technology Officer (human) | Owns this policy and the service-delivery operation; sets the default SLA tiers; approves exceptions |
| Celeste — Client Success (agent / human pairing) | **Owns the SLA commitment**; owns all client-facing SLA conversations; approves SLA-miss notices |
| Service technician (human — Derek / Brandon / Luke) | Triages, assigns priority, remediates, verifies, and closes within SLA; approves agent proposals at low dial |
| Felix — Service desk (agent, L1 default) | Triages, read-only diagnosis, mechanical assignment, surfaces SLA risk; drafts client communications but never sends; escalates identity/backup/DC |
| Scout — Dispatch (agent, L3) | Skill/location/availability match for onsite work; proposes schedule; the customer-facing confirm is gated |
| Dispatcher (human) | Owns out-of-limit assignment and breach-risk reassignment decisions |

## 7. Enforcement & Audit

Adherence is enforced structurally (the gauntlet gates every client-facing commitment; the
least-privilege room budget; the verification precondition on close) and verified continuously
(the agent eval goldens on triage/priority accuracy, the QA function — Tess, and the audit sweep —
Grace/Vera). SLA attainment is reported per client per period; a breach is recorded with cause and
remedy. The [coverage-matrix](../coverage-matrix.md) proves every Stream 04 procedure is bound to
this policy. A violation parks the work and escalates; repeated or high-severity violations lower
the agent's dial or trip the kill-switch.

## 8. Related

**Procedures governed:** Stream 04 (Request → Fulfil) — OP-04-01 (intake/route), OP-04-02 (triage),
OP-04-08 (SLA-aware assignment), OP-04-09 (onsite dispatch); plus the restoration timing of Stream
05. **Related policies:** [IT-00 IT Operations Program](IT-00-it-operations-program.md) ·
[IT-05 Incident & Problem Management](IT-05-incident-and-problem-management.md) ·
[IT-04 Monitoring & Event Management](IT-04-monitoring-and-event-management.md) ·
[IT-02 Change & Configuration Management](IT-02-change-and-configuration-management.md). **ADRs:**
ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard ceilings) · ADR-0058 (gauntlet) · ADR-0134
(policy-canon architecture).
