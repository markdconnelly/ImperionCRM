# IT-06 — Backup, Recovery & Business Continuity

> Distinct Information Technology policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [IT Operations Program umbrella](IT-00-it-operations-program.md). Rewrite-from-source
> of the legacy `IM015 — Backup, Data Recovery & Business Continuity Policy`; the recovery
> substance (3-2-1-1-0, immutable copies, RPO/RTO, BCM) and framework mappings are preserved,
> restructured to the dual-audience canon template. Governance terms (autonomy ladder, dial,
> gauntlet, `always_gate`, easy-button, pool principle) are defined ONCE in the top umbrella;
> this policy localizes them.

| Field | Value |
| --- | --- |
| **Policy ID** | `IT-06` |
| **Title** | Backup, Recovery & Business Continuity |
| **Category** | Information Technology |
| **Tier** | distinct |
| **Human owner** | Chief Technology Officer (Derek / Mark; chief architect Luke); BCM program reviewed by the CISO |
| **Governing for (agents)** | Phoenix (BCDR) — primary; Ozzie (NOC) and Sage (L3) for detection/escalation |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [IT-00 IT Operations Program](IT-00-it-operations-program.md) + [CS-12 Data Classification & Handling] + [CS-09 Encryption] + [CS-13 Logging, Monitoring & SIEM] |

**Framework Alignment:** NIST CSF 2.0 (PR.DS-11, RC.RP, RC.CO) · AICPA SOC 2 (A1.2, A1.3 —
Availability) · NIST AI RMF (Manage).

---

## 1. Purpose

This policy ensures that Imperion and every managed client can recover data and systems
following loss, corruption, ransomware, or disaster, and that business operations continue or
are restored within defined objectives. It is the operational arm of the broader Business
Continuity Management (BCM) program: backup architecture, restoration testing, continuity
planning, and disaster declaration. A new technician (or the BCDR agent) reads this and knows
how data is protected, how a restore is performed, and who must approve it.

## 2. Scope

**Who:** all IT delivery actors — human technicians and the BCDR agent (Phoenix), with Ozzie and
Sage for detection and escalation. **What:** backup, replication, restoration, and continuity for
ALL Imperion and Imperion-managed systems and data; the Operating Procedures in Stream 05 (Event
→ Resolution, recovery steps) and the BCDR/continuity steps elsewhere. This policy binds humans
and agents identically except where §5 narrows or gates an agent's authority. No business unit is
excluded.

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **RPO (Recovery Point Objective)** — The maximum acceptable data loss measured in time.
- **RTO (Recovery Time Objective)** — The maximum acceptable time to restore a system or service.
- **BCDR** — Business Continuity and Disaster Recovery.
- **Immutable Backup** — A backup that cannot be altered or deleted for a defined retention
  period, protecting against ransomware and tampering.
- **3-2-1-1-0 Rule** — Three copies of data, on two media types, one off-site, one
  immutable/offline, with zero recovery errors verified by testing.
- **ERBC Plan** — The Emergency Response and Business Continuity plan enacted on disaster
  declaration.

## 4. Policy Statements

1. **Backup platform and architecture.** Backup and data recovery are delivered through the
   **Kaseya** platform across Imperion and managed client estates. Backups follow the
   **3-2-1-1-0** model, including an off-site copy and an **immutable/air-gapped** copy resistant
   to ransomware. Microsoft 365 data (Exchange, SharePoint, OneDrive, Teams) is backed up
   independently of Microsoft's native retention.
2. **Backup scope and frequency.** All systems and data classified Internal or higher (CS-12) are
   backed up. Backup frequency is set to meet each system's RPO; mission-critical systems receive
   more frequent protection. RPO and RTO targets are defined per system and, for clients, per
   contract/SLA, and documented in the BCDR plan.
3. **Encryption and access.** Backups are encrypted at rest and in transit (CS-09). Access to
   backup systems and restore functions is least-privilege, MFA-protected, and logged to Sentinel
   (CS-13).
4. **Restoration testing.** Restores are tested on a regular, scheduled basis to validate
   recoverability and verify zero recovery errors. Test results are documented; failures are
   remediated and re-tested. Disaster-recovery exercises for mission-critical systems are
   performed at least annually.
5. **Business Continuity Management.** Imperion maintains a BCM program comprising Business
   Continuity (maintaining/resuming operations during disruption), Disaster Recovery (recovering
   IT systems after disruption), and Crisis Management (managing response to events threatening
   the organization, its brand, or stakeholders). The program is built on a Business Impact
   Analysis (BIA), Threat and Risk Assessment, and Current State Assessment, and is reviewed and
   tested at least annually by the CISO or delegate.
6. **Emergency response and declaration.** Disaster-declaration criteria are documented; single or
   even multiple system failures do not necessarily constitute a disaster. When criteria are met,
   the Crisis Management Team is convened and the ERBC plan is enacted, coordinated with the
   Technical Incident Response Program (CS-IR).
7. **Ransomware resilience.** The immutable/air-gapped backup copy is the primary defense enabling
   recovery without paying ransom. Recovery procedures assume potential compromise of production
   and primary backups and rely on verified-clean restore points.

## 5. Application to Autonomous Agents

For backup, restore, and continuity actions:

- **Autonomy ceiling.** Phoenix (BCDR) operates at an **L3** ceiling (ADR-0128): it monitors
  backup health, verifies job success, detects failed/missed backups, schedules and evaluates
  restoration tests, and assembles recovery runbooks and evidence packs. It does not autonomously
  perform production recovery.
- **`always_gate` actions.** **Recovery and restore actions are `always_gate` at every dial
  level** — restoring data to production, failing over a system, modifying or deleting a backup
  set, changing retention or immutability, and declaring a disaster all require a human decision,
  forever. Backup actions are destructive/availability-critical (top-umbrella §4 backup-action
  floor); the dial can never auto-approve them. The CTO (or the on-call recovery lead, and the
  CISO for disaster declaration) approves via the easy-button.
- **Human-in-loop & easy-button.** As the dial climbs, Phoenix may auto-detect a recovery need,
  select verified-clean restore points, draft the full recovery plan with RPO/RTO impact, and
  pre-stage the restore — then hand the human a **one-click** execute (top-umbrella P3). The
  decision to actually restore or fail over stays human at every level.
- **Escalation & refusal.** Phoenix escalates any failed backup, missed RPO, or suspected
  ransomware indicator immediately via the urgent notification path (top-umbrella P4). Phoenix
  **refuses** to execute a restore, failover, or backup deletion without recorded human approval,
  even if a dial setting would technically allow it (top-umbrella §5.5 — surface the
  irreversible).
- **Evidence.** Every backup-verification, restore-test, and recovery action writes an audit
  record to the `agent_run` / `agent_message` ledger — the restore point selected, the
  clean-verification result, the RPO/RTO outcome, and the approve/decline attributed to the
  accountable human.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| CTO (human) | Owns the backup/recovery architecture and this policy; approves production restores and failovers |
| CISO (human) | Owns the BCM program; approves disaster declaration; reviews/tests the program annually |
| Recovery lead / on-call (human) | Executes approved restores and failovers; runs DR exercises |
| Phoenix — BCDR (agent, L3) | Monitors backup health; verifies jobs; schedules and evaluates restoration tests; assembles recovery runbooks and evidence; pre-stages restores; never executes recovery autonomously |
| Ozzie — NOC (agent) | Detects backup-job and availability failures; raises events |
| Sage — L3 (agent) | Investigates recovery-blocking faults; supports root-cause for failed restores |

## 7. Enforcement & Audit

Adherence is enforced structurally (the gauntlet's backup-action floor, least-privilege restore
access, RLS/data-class) and verified continuously (scheduled restore tests with zero-error
verification, the agent eval goldens, the conformance/audit sweep run by the audit function —
Grace/Vera, and the annual DR exercise). The [coverage-matrix](../coverage-matrix.md) proves
every recovery procedure is bound to this policy. A failed or untested restore parks the affected
system as at-risk and escalates; for an agent, an unauthorized restore/deletion attempt parks the
work, escalates, and lowers the dial or trips the kill-switch.

## 8. Related

**Procedures governed:** Stream 05 (Event → Resolution — recovery steps) + the BCDR/continuity
procedures. **Related policies:** [IT-00 IT Operations Program](IT-00-it-operations-program.md) ·
[IT-05 Incident & Problem Management] · [CS-12 Data Classification & Handling] · [CS-09 Encryption] ·
[CS-13 Logging, Monitoring & SIEM] · the Technical Incident Response Program (CS-IR).
**ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard ceilings) · ADR-0058 (gauntlet) ·
ADR-NNNN (policy-canon architecture).
