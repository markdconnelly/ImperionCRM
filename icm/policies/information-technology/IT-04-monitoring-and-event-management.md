# IT-04 — Monitoring & Event Management (NOC)

> Distinct Information Technology policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [IT Operations Program umbrella](IT-00-it-operations-program.md). NEW policy (no legacy IM
> source) — written to the dual-audience canon template for the NOC over the Microsoft + Kaseya
> stack (Kaseya RMM, Datto, UniFi, M365 service health, Defender/Sentinel telemetry). Governance
> terms (autonomy ladder, dial, gauntlet, `always_gate`, easy-button, pool principle) are defined
> ONCE in the top umbrella; this policy localizes them, never redefines them.

| Field | Value |
| --- | --- |
| **Policy ID** | `IT-04` |
| **Title** | Monitoring & Event Management (NOC) |
| **Category** | Information Technology |
| **Tier** | distinct |
| **Human owner** | Chief Technology Officer (Derek / Mark; chief architect Luke) |
| **Governing for (agents)** | Ozzie (NOC / monitoring, L4) — primary; Sage (L3, on escalation); Cyrus (SOC, on security-routed events) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [IT-00 IT Operations Program](IT-00-it-operations-program.md) + [IT-05 Incident & Problem Management](IT-05-incident-and-problem-management.md) |

**Framework Alignment:** NIST CSF 2.0 (DE.CM Continuous Monitoring; DE.AE Adverse Event Analysis) ·
AICPA SOC 2 (CC7.1 Detect, CC7.2 Respond; A1 Availability) · ITIL Monitoring & Event Management.

---

## 1. Purpose

This policy governs how Imperion's Network Operations Center (NOC) watches managed estates and its
own, turns raw monitoring signals into actionable events, and disposes of each event correctly:
suppress noise, auto-remediate under a vetted runbook, or declare an incident. A new NOC technician
or agent reads this and knows what coverage is expected, how an alert is triaged
(dedupe → correlate → enrich → classify → dispose), and the hard line between a *reversible
auto-remediation under runbook* and an action that must always be parked for a human.

## 2. Scope

**Who:** all NOC actors — human technicians and the NOC agent (Ozzie), with Sage on escalation and
Cyrus on security-routed events. **What:** monitoring coverage of configuration items (CIs) across
managed and Imperion estates; ingestion of monitoring signals (Kaseya RMM, Datto, UniFi, M365
service health, synthetic checks, and the Defender/Sentinel SOC seam) into events; alert triage,
correlation, and enrichment; auto-remediation under runbook; and the declaration hand-off into
incident management. Governs **Stream 05 (Event → Resolution)** monitoring procedures — alert
triage (OP-05-01), coverage sweep (OP-05-02), auto-remediate-under-runbook (OP-05-03), and the
declare-incident hand-off (OP-05-04). This policy binds humans and agents identically except where
§5 narrows or gates an agent's authority. Subject = both (`client` and `imperion`).

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **Signal** — A raw monitoring data point from a source (a metric, a health-check result, an RMM
  alert).
- **Event** — A normalized, deduplicated, correlated occurrence derived from one or more signals; the
  unit the NOC dispositions.
- **Alert** — An event meeting a threshold that warrants triage.
- **Dedupe / Correlate** — Folding duplicate signals on the same CI into one parent, and grouping
  co-firing alerts (via CI relationships) into a single event with an inferred blast radius.
- **Enrich** — Attaching CI criticality, owning account, recent changes, and prior-incident context
  to an event before classification.
- **Disposition** — The terminal verdict on an alert: **suppressed** (noise), **auto-remediated**,
  **incident declared**, or **routed** (security → Cyrus; problem-candidate → Sage).
- **Runbook (vetted, reversible)** — A pre-approved Sequence for a known alert signature whose steps
  are reversible (restart a hung service, clear a queue, recycle an app pool, re-trigger a failed
  backup job).
- **Undo window** — The bounded period after a reversible auto-remediation during which the action
  is auto-reverted if it made the symptom worse (the L4 reversible-auto contract).
- **Coverage gap** — A CI with no monitoring, a silent/stopped agent, or a stale check timestamp.

## 4. Policy Statements

The binding rules, written actor-neutral so a human and an agent read the same obligation.

1. **Coverage is proactively assured.** The monitored-CI set is reconciled against the CMDB CI set
   on a regular sweep; CIs with no telemetry, silent agents, and stale checks are surfaced as
   coverage gaps with a parked "monitor this CI" recommendation. Deploying a monitoring agent or
   changing monitoring config is never automatic.
2. **Every alert reaches a terminal disposition with an audit row.** No alert is left in an
   ambiguous state; each is suppressed (with a reason), auto-remediated, declared as an incident, or
   routed to the correct owner.
3. **Triage is deterministic and recorded.** The responsible party dedupes against open
   alerts/incidents on the same CI, correlates co-firing alerts via CI relationships into one event,
   enriches with criticality/account/recent-change context, and classifies (noise | actionable
   incident | security | problem-candidate) against the severity rubric — recording the signals
   weighed.
4. **Auto-remediation is allowed only under a vetted reversible runbook, with verification and an
   undo window.** An actionable alert that matches a vetted reversible runbook may be remediated; the
   action's effect is verified against fresh telemetry and auto-reverted within the undo window if it
   regressed. No runbook match, or an irreversible step, means the work parks or an incident is
   declared.
5. **Restore service, then eliminate root cause — never conflate them.** The NOC restores service
   (suppress / remediate / declare); a recurring cluster or unknown root cause emits a
   **problem-candidate to Sage** (problem management, IT-05). A quiet symptom is not a confirmed fix.
6. **Security-suspect events route, they do not get remediated by the NOC.** An event with a
   security signature is routed to the SOC (Cyrus); the NOC does not self-remediate a suspected
   security incident.
7. **Client-facing communication about an event is owned by the relationship.** Any client-facing
   status, notice, or advisory is a human-approved act (§5); the NOC's work-notes are internal.
8. **Monitoring records are retained for audit and trend analysis.** Event disposition, remediation
   actions, and coverage history are retained per the logging/retention policy.

## 5. Application to Autonomous Agents

**The dual-audience core.** For monitoring and event actions:

- **Autonomy ceiling.** **Ozzie (NOC)** operates at **L4** (ADR-0128) — triage, dedupe, correlate,
  enrich, classify, and noise-suppression auto from L2/L3; **reversible remediation under a vetted
  runbook auto-executes at L4 behind an undo window**, with the action verified and auto-reverted on
  regression. Below L4 every remediation **parks**. The coverage sweep and health scoring are
  internal-reversible auto. **Sage (L3)** takes escalated incidents; **Cyrus** takes security-routed
  events.
- **`always_gate` actions** (dial-proof floor, never auto at any level): **destructive** ops
  (delete / wipe / reimage); **identity / credential** actions (reset / disable account, MFA, CA);
  **client-facing** notices; **production migrations**; deploying a monitoring agent or **changing
  monitoring configuration** (destructive-config); and an identity/credential enrichment read beyond
  scope. The most-restrictive step sets the bar — an irreversible step parks inside an otherwise-auto
  runbook.
- **Human-in-loop & easy-button.** As the dial climbs, triage and standard reversible restarts
  recede to execute-then-notify, while destructive/identity/client-facing/config actions stay human
  forever. At each gate the agent drives the work to the goal and hands the human a **one-click**
  resolution (top-umbrella P3) — e.g. a parked irreversible remediation, a coverage-gap onboarding
  proposal, or a drafted client notice, each ready to approve.
- **Escalation & refusal.** Ozzie **escalates** a high-severity/no-runbook event by declaring an
  incident (→ IT-05); **routes** security signatures to Cyrus and recurring clusters to Sage;
  **refuses** to remediate without a vetted reversible runbook match and **refuses** any destructive
  or identity action absent a human approval, even where a dial setting would allow it.
- **Evidence.** Every governed action writes an audit record to the `agent_run` / `agent_message`
  ledger — the triage decision and disposition rationale, the runbook bound and executed, the
  post-action verification, and any undo — attributed to the accountable human.

> **Substrate gap:** the **monitoring / NOC bronze feed is missing (#1578)** — today the only live
> event sources are `autotask.ticket.created` and the Defender SOC seam, so OP-05-01/02/03 are
> deploy-dormant until the RMM/Datto/UniFi/M365-health bronze feed lands. The L4 undo endpoint is the
> load-bearing dependency for OP-05-03. These gates are documented here and enforced as the feeds and
> the undo path come online.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| Chief Technology Officer (human) | Owns this policy and the NOC operation; sets coverage expectations and the severity rubric |
| NOC technician (human — Brandon / Derek) | Reviews dispositions at low dial; approves parked remediations and config changes; owns client comms with the relationship owner |
| Ozzie — NOC (agent, L4) | Triages, correlates, enriches, classifies, disposes; auto-remediates reversible runbooks with undo; sweeps coverage; declares incidents; routes security/problem |
| Sage — L3 / Problem (agent, L3) | Receives escalated/high-sev incidents and recurring-cluster problem-candidates |
| Cyrus — SOC (agent) | Receives security-routed events |
| Celeste — Client Success (agent / human) | Owns any client-facing event communication |

## 7. Enforcement & Audit

The gauntlet enforces structurally — destructive/identity/client-facing/config actions cross a gate,
and reversible remediation runs only under a vetted runbook with verification and an undo window.
Adherence is verified continuously (the eval goldens on triage/disposition accuracy and false-suppress
rate, the QA function — Tess, and the audit sweep — Grace/Vera). Coverage is proven by the sweep;
every event disposition is an audit row. The [coverage-matrix](../coverage-matrix.md) proves the
Stream 05 monitoring procedures are bound to this policy. A violation parks the work and escalates;
repeated or high-severity violations lower the agent's dial or trip the kill-switch.

## 8. Related

**Procedures governed:** Stream 05 (Event → Resolution) — OP-05-01 (alert triage), OP-05-02
(coverage sweep), OP-05-03 (auto-remediate under runbook), OP-05-04 (declare incident hand-off).
**Related policies:** [IT-00 IT Operations Program](IT-00-it-operations-program.md) ·
[IT-05 Incident & Problem Management](IT-05-incident-and-problem-management.md) ·
[IT-03 Patch & Vulnerability Management](IT-03-patch-and-vulnerability-management.md) ·
[IT-06 Backup, Recovery & Business Continuity] · the Cybersecurity logging/SIEM and incident-response
policies. **ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard ceilings) · ADR-0058
(gauntlet) · ADR-0134 (policy-canon architecture). **Schema:** #1578 (monitoring/alert bronze feed).
