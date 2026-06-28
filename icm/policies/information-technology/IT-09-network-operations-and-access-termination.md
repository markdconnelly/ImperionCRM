# IT-09 — Network Operations & Access Termination

> Distinct Information Technology policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [IT Operations Program umbrella](IT-00-it-operations-program.md). Rewrite-from-source
> of the legacy `IM007 — Network Access Termination Policy`; the termination timeliness,
> offboarding-action, and privileged-workforce substance and framework mappings are preserved,
> restructured to the dual-audience canon template. This policy owns the **mechanics** of
> revoking network and system access; the lifecycle that triggers it is IT-08. Governance terms
> are defined ONCE in the top umbrella; this policy localizes them.

| Field | Value |
| --- | --- |
| **Policy ID** | `IT-09` |
| **Title** | Network Operations & Access Termination |
| **Category** | Information Technology |
| **Tier** | distinct |
| **Human owner** | Chief Technology Officer (Derek / Mark) |
| **Governing for (agents)** | Osiris (Account/Identity lifecycle — termination execution) · Ozzie (NOC — network operations) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [IT-00 IT Operations Program](IT-00-it-operations-program.md) + [IT-08 Account & Access Lifecycle](IT-08-account-and-access-lifecycle.md) + [CS-02 Identity & Access Management] |

**Framework Alignment:** NIST CSF 2.0 (PR.AA-04) · AICPA SOC 2 (CC6.2, CC6.3).

---

## 1. Purpose

This policy establishes requirements for the prompt and complete removal of user access to
facilities and information systems upon termination of employment, contract, or engagement, and
governs the network operations that surround it. It is the execution arm of the leaver event in
IT-08. A technician (or the IAM agent) reads this and knows exactly which access must be revoked,
in what order, how fast, and how completion is proven.

## 2. Scope

**Who:** all IT delivery actors — human technicians and the agents that execute termination
(Osiris) and operate the network (Ozzie). **What:** ALL Imperion and Imperion-managed entities and
identities; the offboarding/termination Operating Procedures and the network-operations steps in
Streams 04–06. This policy binds humans and agents identically except where §5 narrows or gates an
agent's authority. No business unit is excluded.

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **Termination** — The end of an employment, contractor, vendor, or consultant relationship,
  whether voluntary or involuntary.
- **Joiner-Mover-Leaver (JML)** — The identity lifecycle process governing onboarding, role
  change, and offboarding (owned by IT-08).
- **GDAP** — Granular Delegated Admin Privileges: delegated administrative access into a client
  tenant.

## 4. Policy Statements

1. **Timeliness of revocation.** Access to facilities and information systems is revoked upon
   termination as soon as practicably possible. For **involuntary terminations** and any
   termination involving privileged access, revocation is performed **immediately** and, wherever
   feasible, coordinated to coincide with or precede notification. The terminating individual's
   immediate supervisor must submit the termination request promptly for both voluntary and
   involuntary terminations, including the actual termination date.
2. **Offboarding actions (coordinated, documented workflow).** Upon termination: disable the Entra
   ID account and **revoke all active sessions and refresh tokens** to force immediate sign-out
   across all applications; reset credentials and remove the identity from privileged roles
   (including Entra PIM eligibility); reclaim and remove MFA methods and registered devices;
   remove the user from security groups, distribution lists, licenses, and application access;
   revoke VPN, ZTNA, and remote-access entitlements; retrieve or remotely wipe company devices and
   revoke certificates and security keys; disable or transfer the **1Password** account and remove
   shared vault access; revoke physical/badge access; and preserve mailbox and data per retention
   requirements before deletion.
3. **Privileged and administrative workforce.** For IT, Cybersecurity, and MSP technicians with
   administrative access to Imperion or client systems, the responsible manager must verify that
   **all** methods of access — including access to client tenants via delegated administration
   (GDAP) and any standing privileged credentials — have been removed and documented.
4. **Verification and audit.** Completion of each offboarding step is recorded and auditable.
   Account-termination timeliness is monitored continuously and reported through Sentinel (CS-13).
   Inactive accounts are governed by IT-08.

## 5. Application to Autonomous Agents

For termination execution and the surrounding network operations:

- **Autonomy ceiling.** Osiris (Account/Identity lifecycle) executes terminations at an **L3**
  ceiling (ADR-0128): on a leaver signal it assembles the complete, ordered revocation set,
  pre-stages every offboarding action, and verifies completion. Ozzie (NOC) operates network and
  remote-access entitlements at its ceiling under runbook. **Identity and access changes are
  gated** — no agent autonomously removes (or grants) access.
- **`always_gate` actions.** Account disable, session/token revocation, privileged-role and GDAP
  removal, device wipe, and credential/vault revocation are **`always_gate` at every dial level**
  — they are identity/permissions-affecting and dial-proof (top-umbrella §4). The responsible
  manager (and IT/Security for privileged/GDAP) approves via the easy-button. **Deprovisioning is
  time-bound:** the agent must drive the revocation to a one-click execute within the
  termination SLA and escalate if it goes unactioned — a leaver's access must not linger.
- **Human-in-loop & easy-button.** As the dial climbs, Osiris auto-prepares the full revocation
  checklist (every system, every entitlement, in order) and hands the human a **single execute**
  (top-umbrella P3); for an involuntary/privileged termination it pre-stages the immediate cut.
  The decision to execute stays human at every level.
- **Escalation & refusal.** Osiris escalates immediately (top-umbrella P4) on any
  involuntary/privileged termination, any incomplete revocation step, or any access that remains
  live past the SLA. Agents **refuse** to alter identity/access without recorded human approval,
  even if a dial setting would technically allow it (top-umbrella §5.5).
- **Evidence.** Every revocation step writes an audit record to the `agent_run` / `agent_message`
  ledger — the identity, each entitlement removed, the timestamp vs SLA, GDAP/privileged-access
  verification, and the approve/decline attributed to the accountable human.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| CTO (human) | Owns network operations and the termination process and this policy |
| Immediate supervisor (human) | Submits the termination request promptly with the actual date; verifies privileged/GDAP access removal for admin staff |
| IT / Security (human) | Executes immediate involuntary/privileged revocation; approves the offboarding completion |
| Osiris — Account/Identity lifecycle (agent, L3) | Assembles and pre-stages the ordered revocation set; verifies each step; time-bounds deprovisioning; escalates lingering access; never alters identity autonomously |
| Ozzie — NOC (agent) | Operates network/remote-access entitlements under runbook; raises events |

## 7. Enforcement & Audit

Adherence is enforced structurally (the gauntlet's identity/permissions floor, least-privilege
budget, Entra PIM/Conditional Access) and verified continuously (termination-timeliness monitoring
via Sentinel, completion-record audit of every offboarding step, the agent eval goldens, and the
conformance/audit sweep run by Grace/Vera). The [coverage-matrix](../coverage-matrix.md) proves
the termination procedure is bound to this policy. Access remaining live past the SLA, or an
incomplete privileged/GDAP revocation, is a high-severity finding; for an agent, an unauthorized
identity/access change attempt parks the work, escalates, and lowers the dial or trips the
kill-switch.

## 8. Related

**Procedures governed:** the offboarding/termination procedure + network-operations steps in
Streams 04–06. **Related policies:**
[IT-00 IT Operations Program](IT-00-it-operations-program.md) ·
[IT-08 Account & Access Lifecycle](IT-08-account-and-access-lifecycle.md) ·
[IT-07 Endpoint & Device Baseline](IT-07-endpoint-and-device-baseline.md) ·
[CS-02 Identity & Access Management] · [CS-04 Remote Access & MFA] · [CS-13 Logging, Monitoring &
SIEM]. **ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard ceilings) · ADR-0058
(gauntlet) · ADR-0134 (policy-canon architecture).
