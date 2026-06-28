# IT-02 — Change & Configuration Management

> Distinct Information Technology policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [IT Operations Program umbrella](IT-00-it-operations-program.md). Rewrite-from-source of
> the legacy `IM016 — Change & Configuration Management Policy`; the control substance and the
> NIST/SOC 2 mappings are preserved, restructured to the dual-audience canon template. Governance
> terms (autonomy ladder, dial, gauntlet, `always_gate`, easy-button, pool principle) are defined
> ONCE in the top umbrella; this policy localizes them, never redefines them.

| Field | Value |
| --- | --- |
| **Policy ID** | `IT-02` |
| **Title** | Change & Configuration Management |
| **Category** | Information Technology |
| **Tier** | distinct |
| **Human owner** | Chief Technology Officer (Derek / Mark; chief architect Luke) |
| **Governing for (agents)** | Marshall (Change/Release — the L2 governance gate) · the executing technical agents (Ozzie, Felix, Osiris, Phoenix, Pierce) under their own ceilings |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [IT-00 IT Operations Program](IT-00-it-operations-program.md) + [CS Cybersecurity baseline] for security-control changes |

**Framework Alignment:** NIST CSF 2.0 (PR.PS-01, ID.IM, GV.SC) · AICPA SOC 2 (CC8.1 Change
Management) · ITIL Change Enablement & Service Configuration Management.

| Scope of Policy (applies to entities/locations marked below) | |
| --- | --- |
| **X** | Applies to ALL changes to Imperion and Imperion-managed systems, configurations, applications, and automations |
| | Excluded business units: _none_ |

---

## 1. Purpose

This policy ensures that changes to information systems — Imperion's own and those of managed
clients — are requested, assessed, tested, approved, implemented, and documented in a controlled
manner that preserves security, stability, and availability. It also establishes configuration
management: the secure baselines a system is held to and the monitoring of drift away from them.
A new technician or agent reads this and knows that no production change happens without a
classified, risk-assessed, approved record and a back-out plan — and that the agent who governs
the change is never the agent who executes it.

## 2. Scope

**Who:** all change actors — human technicians and the change agents — bound by this policy.
**What:** every addition, modification, or removal affecting a system, configuration, application,
integration, automation, infrastructure-as-code, or security control, on Imperion's estate or a
managed client's; and the secure configuration baselines those systems are held to. Governs the
Operating Procedures in **Stream 06 (Change → Release)** — intake/classify (OP-06-01), risk
assessment (OP-06-02), the CAB/approval gate (OP-06-03), scheduling & the change calendar
(OP-06-04), rollback drafting (OP-06-05), change comms (OP-06-06), dispatch-to-executor (OP-06-07),
PIR/close (OP-06-08), the freeze calendar (OP-06-09), the standard-change catalog (OP-06-10), and
the Autotask change route (OP-06-11). This policy binds humans and agents identically except where
§5 narrows or gates an agent's authority. Subject = both (`client` and `imperion`).

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **Change** — Any addition, modification, or removal affecting a system, configuration,
  application, integration, automation, or security control.
- **Standard Change** — A pre-approved, low-risk, repeatable change (e.g., routine patch
  deployment) executed under an established procedure from the **standard-change catalog**. Opens
  in an `approved` state; its pre-authorization is a governance act, not a per-change approval.
- **Normal Change** — A change requiring assessment and approval before implementation; opens
  `pending_approval`.
- **Emergency Change** — A change required to restore service or remediate an active threat,
  approved on an expedited basis; may implement before full approval but is retroactively reviewed
  and approved.
- **Configuration Baseline** — The approved, secure configuration state of a system (CIS
  Benchmarks, Microsoft Secure Score, Defender / Intune baselines) against which drift is measured.
- **Configuration Item (CI)** — A managed asset under change control; affected CIs are attached to
  the change and walked for blast radius.
- **Change Freeze / Blackout** — A declared window (peak season, client blackout, audit window) in
  which changes are suspended; scheduling into a freeze is a gated override.
- **CAB (Change Advisory Board)** — The human approval authority for normal/emergency changes;
  realized as the approval gate where Marshall parks the change packet and a human decides.
- **Rollback / Back-out Plan** — The documented steps and verification criteria to reverse a
  change if it fails; required before approval for normal and emergency changes.

## 4. Policy Statements

The binding rules, written actor-neutral so a human and an agent read the same obligation.

### 4.1 Change request and authorization

1. All normal and emergency changes are logged in the change-management system (the app-native
   `change_request`, with Autotask as the eventual record SoR) with a description, justification,
   affected CIs, risk assessment, rollback plan, and requester.
2. Changes are reviewed and approved by an authorized approver appropriate to the risk and the
   affected environment **before** implementation. The approval decision is never automated at any
   dial level.
3. Changes to client environments additionally follow the client's contractual change requirements
   and notification expectations.

### 4.2 Risk assessment and testing

4. Each change is assessed for security, availability, and downstream impact, with a derived risk
   band computed from CI criticality × blast radius × change type (per the risk-management
   discipline, CS risk policy).
5. Where feasible, changes are tested in a non-production or pilot ring before broad deployment
   (consistent with the patch rotation in IT-03).
6. Changes affecting security controls, identity, or data protection receive Cybersecurity review
   (Roman / Mark as CISO on security-affecting or emergency changes).

### 4.3 Segregation of duties

7. Wherever practical, the individual who develops or requests a change is not the sole approver.
   Approval authority is defined by role. **The agent that governs a change does not execute it**
   (§5) — this is the agent-native segregation of duties.

### 4.4 Implementation, rollback, and verification

8. Approved changes are implemented within an agreed maintenance window where applicable, honoring
   the freeze/blackout calendar.
9. A documented rollback plan with defined success/verification criteria exists for normal and
   emergency changes before approval.
10. Successful implementation is verified against the success criteria; the change record is closed
    with outcome notes (PIR), and the change is emitted as control evidence to the audit function.

### 4.5 Emergency changes

11. Emergency changes may be implemented before full approval to restore service or contain a
    threat, but must be documented and retroactively reviewed and approved within a defined period
    (e.g., the next business day).

### 4.6 Configuration management and baselines

12. Secure configuration baselines (CIS Benchmarks, Microsoft Secure Score, Defender / Intune
    baselines) are defined and applied.
13. Configuration drift is monitored continuously; unauthorized changes are investigated as
    potential incidents (IT-05 / the Cybersecurity incident-response program).

### 4.7 Infrastructure-as-code and automation

14. Automations, scripts, and infrastructure-as-code that modify systems are version-controlled,
    reviewed, and treated as changes under this policy.
15. AI-assisted or AI-generated changes are reviewed by a human before deployment (the AI
    governance policies), consistent with §5.

## 5. Application to Autonomous Agents

**The dual-audience core.** For change-and-configuration actions:

- **Autonomy ceiling.** **Marshall (Change/Release)** is an **L2 governance gate, never an
  actuator** (ADR-0128, ADR-0079): he intakes, classifies (`standard | normal | emergency`),
  risk-scores, schedules, drafts the rollback and the comms, assembles the CAB packet, and **parks
  the change at the approval gate**. Risk-score + schedule + draft are auto (L2 reversible-internal).
  **Marshall never touches a CI himself.** The approved change **executes via the owning technical
  agent** (Ozzie / Felix / Osiris / Phoenix / Pierce) under **that agent's** ceiling, with
  production-affecting actuation `always_gate` on the executor.
- **`always_gate` actions** (dial-proof floor, never auto at any level): the **change-approval
  decision** (Marshall parks; a human decides — his defining ceiling); **scheduling into or
  overriding a declared freeze/blackout window**; **adding a new entry to the standard-change
  catalog** (pre-authorizing a class is a governance act); **any production-affecting execution** on
  the executing agent; the **external Autotask change write** (mutating a customer system); and
  **any client-facing change notice** (customer-facing + `client_pii`, owned by Celeste).
- **Human-in-loop & easy-button.** As the dial climbs Marshall produces a *richer* CAB packet, but
  the approve click stays human forever. At each gate the agent drives the work to the goal and
  hands the human a **one-click** resolution (top-umbrella P3) — e.g. a complete, signable packet
  with Approve / Reject / Edit, surfaced in the approvals queue and a Teams Adaptive Card.
- **Escalation & refusal.** Marshall **routes** security-affecting or emergency changes to the CISO
  (Mark) as approver; the executing agent **refuses/escalates** any change that touches identity,
  backups, or domain controllers, and **re-parks** a change whose preconditions have drifted (stale
  approval, closed window, freeze, CI changed). A standard change is never created by Marshall
  auto-promoting a normal one — promotion is the gated catalog act (OP-06-10).
- **Evidence.** Every governed action writes an audit record to the `agent_run` / `agent_message`
  ledger — classification, derived risk, the approval verdict (`change.approved` / `change.rejected`),
  the schedule, the execution result, and the PIR — and every completed change is emitted as control
  evidence to Grace (GRC).

> **Schema gaps proposed to the front end (#1579):** the **rollback artifact** (OP-06-05 has no
> rollback column on `change_request` today), the **`change_freeze` calendar** (OP-06-09; v1
> conflict detection is informational-only — there is no hard freeze enforcement yet), and the
> **standard-change catalog** (OP-06-10; `standard|normal|emergency` is currently a free per-change
> pick). Until these land, the freeze-override and catalog-ratification gates are documented here but
> enforced procedurally, not structurally.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| Chief Technology Officer (human) | Owns this policy and the change process; approves normal changes (Dexter); ratifies the standard-change catalog and freeze windows |
| CISO (human — Mark) | Approves security-affecting and emergency changes; owns the Cybersecurity review of control/identity/data-protection changes |
| Marshall — Change/Release (agent, L2 gate) | Intakes, classifies, risk-scores, schedules, drafts rollback + comms, assembles the CAB packet, **parks at the approval gate, dispatches to the executor — never executes** |
| Executing technical agents (Ozzie / Felix / Osiris / Phoenix / Pierce) | Execute the approved change under their own ceiling; production-affecting actuation is `always_gate` on them; refuse/escalate identity/backup/DC |
| Celeste — Client Success (agent / human) | Owns client-facing change notices |
| Grace — GRC (agent / human) | Receives every change as audit/control evidence |
| System owners (human) | Confirm applicability, approve maintenance windows, accept residual risk |

## 7. Enforcement & Audit

Change/config control plus the gauntlet enforce structurally: the approval decision and every
production-affecting execution cross the gate; the gate-vs-actuator split (Marshall governs, the
technical agent executes) is the segregation-of-duties control. Adherence is verified continuously
(the QA function — Tess; the audit sweep — Grace/Vera; every completed change is control evidence).
Configuration drift is monitored continuously and unauthorized changes are investigated as
incidents. The [coverage-matrix](../coverage-matrix.md) proves every Stream 06 procedure is bound
to this policy. A violation parks the work and escalates; repeated or high-severity violations lower
the agent's dial or trip the kill-switch.

## 8. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF PR.PS-01, ID.IM | Configuration and change management, improvement |
| NIST CSF GV.SC | Supply-chain / third-party change considerations |
| SOC 2 CC8.1 | Change management lifecycle |

## 9. Related

**Procedures governed:** Stream 06 (Change → Release) — OP-06-01 … OP-06-11. **Related policies:**
[IT-00 IT Operations Program](IT-00-it-operations-program.md) ·
[IT-03 Patch & Vulnerability Management](IT-03-patch-and-vulnerability-management.md) ·
[IT-05 Incident & Problem Management](IT-05-incident-and-problem-management.md) ·
[IT-10 Provisioning, Asset & CMDB Management] · the Cybersecurity risk-management and
incident-response policies. **ADRs:** ADR-0079 (problem/change) · ADR-0128 (autonomy ladder) ·
ADR-0109 (dial + hard ceilings) · ADR-0058 (gauntlet) · ADR-0134 (policy-canon architecture).
**Schema:** #1579 (rollback artifact / `change_freeze` / standard-change catalog).
