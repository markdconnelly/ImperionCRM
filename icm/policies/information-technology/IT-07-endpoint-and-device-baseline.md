# IT-07 — Endpoint & Device Baseline (BYOD / Intune)

> Distinct Information Technology policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [IT Operations Program umbrella](IT-00-it-operations-program.md). Rewrite-from-source
> of the legacy `IM020 — Mobile Device, BYOD & Endpoint Baseline Policy`; the baseline substance
> (Conditional Access, full-disk encryption, EDR, MAM, remote wipe) and framework mappings are
> preserved, restructured to the dual-audience canon template. Governance terms (autonomy ladder,
> dial, gauntlet, `always_gate`, easy-button, pool principle) are defined ONCE in the top
> umbrella; this policy localizes them.

| Field | Value |
| --- | --- |
| **Policy ID** | `IT-07` |
| **Title** | Endpoint & Device Baseline (BYOD / Intune) |
| **Category** | Information Technology |
| **Tier** | distinct |
| **Human owner** | Chief Technology Officer (Derek / Mark; chief architect Luke) |
| **Governing for (agents)** | Marshall (Change/Release — baseline config) · Ozzie (NOC — compliance posture) · Osiris (provisioning/deprovisioning of device enrollment) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [IT-00 IT Operations Program](IT-00-it-operations-program.md) + [CS-04 Remote Access & MFA] + [CS-03 Patch & Vulnerability Management] + [CS-12 Data Classification & Handling] |

**Framework Alignment:** NIST CSF 2.0 (PR.PS, PR.AA, ID.AM) · AICPA SOC 2 (CC6.1, CC6.7, CC6.8).

---

## 1. Purpose

This policy defines the minimum security baseline for endpoints and mobile devices and the
conditions under which personal (BYOD) devices may access Imperion or client data, enforced
through Microsoft Entra ID and Intune. A new hire (or an IT agent) reads this and knows what a
device must satisfy before it touches company or client resources, and what happens when a device
is lost, separated, or non-compliant.

## 2. Scope

**Who:** all IT delivery actors — human technicians and the agents that configure and monitor
endpoints (Marshall for baseline config/change, Ozzie for compliance posture, Osiris for
enrollment provisioning/deprovisioning). **What:** ALL devices accessing Imperion or client data,
whether company-owned or personal (BYOD); the Operating Procedures in Stream 03 (Sold → Live,
device provisioning) and Stream 06 (Change → Release, baseline changes), plus the endpoint
hygiene steps elsewhere. This policy binds humans and agents identically except where §5 narrows
or gates an agent's authority. No business unit is excluded.

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **Managed Device** — A device enrolled in Imperion's management (Intune) and subject to
  compliance policy.
- **BYOD** — Personally owned device used to access company or client resources.
- **Endpoint Baseline** — The minimum required security configuration for any device accessing
  resources.
- **Compliance Policy** — Entra/Intune policy that evaluates device posture before granting
  access.
- **MAM (App-Protection Policy)** — Mobile Application Management that isolates and protects
  company data on a device without taking full control of it.

## 4. Policy Statements

1. **Conditional Access gate.** Access to Imperion and client resources requires the device to
   meet Conditional Access requirements in Entra ID (CS-04), including compliance status and,
   where required, management enrollment. Non-compliant devices are blocked or granted limited
   access until remediated.
2. **Endpoint baseline (all devices).** Every device accessing resources must have: full-disk
   encryption (BitLocker / FileVault), enforced and monitored (CS-09); EDR / antimalware
   (Microsoft Defender for Endpoint) active and reporting; current OS and applications within
   patch SLAs (CS-03); screen lock with timeout and strong authentication; host firewall enabled;
   and attack-surface-reduction and security baselines applied to managed devices.
3. **Company-owned devices.** Enrolled in Intune, configured to the secure baseline, and
   inventoried as assets (IT-10). Remote lock and wipe capability is maintained.
4. **BYOD.** Permitted only where enrolled in management or constrained by app-protection
   policies (MAM) that isolate and protect company data without taking full control of the
   personal device. Company data on BYOD can be **selectively wiped** on separation or compromise
   without affecting personal data, where technically supported. BYOD devices must still meet the
   endpoint baseline (§4.2) applicable to the access granted. Restricted data (CS-12) handling on
   BYOD is limited per classification controls.
5. **Mobile devices.** Mobile devices accessing email or company apps use app-protection policies
   (encryption, PIN, copy/paste and save restrictions for company data). Jailbroken/rooted
   devices are blocked.
6. **Lost, stolen, or compromised devices.** Loss, theft, or suspected compromise is reported
   immediately and handled as a potential incident (Technical Incident Response Program); affected
   devices are remotely locked or wiped and sessions/tokens revoked.
7. **Decommissioning.** Devices are securely sanitized before reuse or disposal (CS-12; physical
   and environmental controls).

## 5. Application to Autonomous Agents

For endpoint baseline, compliance, and device-lifecycle actions:

- **Autonomy ceiling.** Marshall (Change/Release) governs baseline-config changes at **L2**
  (intake, risk-classify, park at the approval gate; the owning agent executes the approved change
  under its own ceiling); Ozzie (NOC) monitors compliance posture and raises drift events; Osiris
  handles enrollment provisioning/deprovisioning at **L3** under identity gating (IT-08).
- **`always_gate` actions.** **Remote wipe, selective wipe, remote lock, and token/session
  revocation are `always_gate` at every dial level** — they are destructive/identity-affecting and
  require a human decision, forever. A change to the endpoint baseline itself (the Intune
  compliance/configuration policy that governs the fleet) is a production change and is
  `always_gate` (IT-00 change rule). The CTO or on-call lead approves via the easy-button.
- **Human-in-loop & easy-button.** As the dial climbs, agents may auto-detect non-compliance,
  draft the remediation (re-enroll, push baseline, quarantine), and pre-stage a wipe on a
  confirmed lost/compromised device — then hand the human a **one-click** execute (top-umbrella
  P3). The wipe/lock/revoke decision stays human at every level.
- **Escalation & refusal.** Agents escalate a lost/stolen/compromised device or a fleet-wide
  compliance regression immediately via the urgent path (top-umbrella P4). They **refuse** to wipe
  or lock a device, or to weaken the baseline, without recorded human approval, even if a dial
  setting would technically allow it (top-umbrella §5.5).
- **Evidence.** Every compliance evaluation, baseline change, and wipe/lock/revoke action writes
  an audit record to the `agent_run` / `agent_message` ledger — the device, the posture finding,
  the action, and the approve/decline attributed to the accountable human.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| CTO (human) | Owns the endpoint baseline and this policy; approves baseline changes and fleet-affecting actions |
| IT technician / on-call (human) | Executes approved wipes/locks/re-enrollments; handles lost-device incidents |
| Marshall — Change/Release (agent, L2) | Intakes and risk-classifies baseline/config changes; parks at approval gate |
| Ozzie — NOC (agent) | Monitors device compliance posture; raises drift and non-compliance events |
| Osiris — Account/Device lifecycle (agent, L3) | Provisions/deprovisions device enrollment under identity gating (IT-08) |
| All workforce members | Keep their devices compliant; report lost/stolen/compromised devices immediately |

## 7. Enforcement & Audit

Adherence is enforced structurally (the Conditional Access gate, Intune compliance evaluation, the
gauntlet's destructive-action floor) and verified continuously (compliance reporting, the agent
eval goldens, the conformance/audit sweep run by Grace/Vera). The
[coverage-matrix](../coverage-matrix.md) proves every endpoint procedure is bound to this policy. A
non-compliant device is blocked or quarantined until remediated; for an agent, an unauthorized
wipe/lock attempt parks the work, escalates, and lowers the dial or trips the kill-switch.

## 8. Related

**Procedures governed:** Stream 03 (Sold → Live — device provisioning) · Stream 06 (Change →
Release — baseline changes) + endpoint hygiene steps. **Related policies:**
[IT-00 IT Operations Program](IT-00-it-operations-program.md) ·
[IT-08 Account & Access Lifecycle](IT-08-account-and-access-lifecycle.md) ·
[IT-10 Provisioning, Asset & CMDB Management](IT-10-provisioning-asset-and-cmdb-management.md) ·
[CS-04 Remote Access & MFA] · [CS-03 Patch & Vulnerability Management] ·
[CS-12 Data Classification & Handling]. **ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial +
hard ceilings) · ADR-0058 (gauntlet) · ADR-NNNN (policy-canon architecture).
