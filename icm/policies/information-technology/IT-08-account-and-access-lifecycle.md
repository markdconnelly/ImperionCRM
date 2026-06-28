# IT-08 — Account & Access Lifecycle (Joiner-Mover-Leaver)

> Distinct Information Technology policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [IT Operations Program umbrella](IT-00-it-operations-program.md). Rewrite-from-source
> of the legacy `IM008 — User Account Management Policy`; the provisioning, authentication, and
> lifecycle substance (least privilege, always-on MFA, PIM, 45/90-day hygiene) and framework
> mappings are preserved, restructured to the dual-audience canon template. This is the
> **operational** lifecycle (joiner-mover-leaver mechanics, owned by IT/Osiris); the access-control
> **model** is the Cybersecurity *Identity & Access Management* policy (CS-02), which this policy
> ties to. Governance terms are defined ONCE in the top umbrella; this policy localizes them.

| Field | Value |
| --- | --- |
| **Policy ID** | `IT-08` |
| **Title** | Account & Access Lifecycle (Joiner-Mover-Leaver) |
| **Category** | Information Technology |
| **Tier** | distinct |
| **Human owner** | Chief Technology Officer (Derek / Mark); access model co-owned with the CISO via CS-02 |
| **Governing for (agents)** | Osiris (Account/Identity lifecycle) — primary |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [IT-00 IT Operations Program](IT-00-it-operations-program.md) + [CS-02 Identity & Access Management] + [CS-04 Remote Access & MFA] |

**Framework Alignment:** NIST CSF 2.0 (PR.AA-01–05) · AICPA SOC 2 (CC6.1, CC6.2, CC6.3).

---

## 1. Purpose

This policy defines how accounts and access are created, authenticated, authorized, and retired
across the identity lifecycle (joiner-mover-leaver) for network and cloud resources, operating
under least privilege and Zero Trust. It is the operational mechanics that implement the
access-control model in CS-02. A new hire (or the IAM agent) reads this and knows how access is
requested and approved, how identities are authenticated, and — critically — how access is removed
the moment someone leaves.

## 2. Scope

**Who:** all IT delivery actors — human technicians and the account-lifecycle agent (Osiris).
**What:** ALL Imperion and Imperion-managed network and application accounts; the Operating
Procedures in Stream 03 (Sold → Live, onboarding/provisioning) and the offboarding/access-review
steps elsewhere. This policy binds humans and agents identically except where §5 narrows or gates
an agent's authority. No business unit is excluded. Network-access termination mechanics are
detailed in IT-09; this policy owns the full lifecycle and the deprovisioning trigger.

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **Authentication** — Verifying a user's identity through a unique identifier combined with
  credentials and a multi-factor element.
- **Authorization** — The level of access a user holds once authenticated.
- **User Account Provisioning** — The creation and ongoing management of accounts across the
  identity lifecycle (joiner-mover-leaver).
- **Joiner-Mover-Leaver (JML)** — The identity lifecycle process governing onboarding, role
  change, and offboarding.
- **Identity Provider (IdP)** — **Microsoft Entra ID**, the authoritative source for identity and
  access at Imperion.

## 4. Policy Statements

1. **Provisioning and authorization (Joiner).** Access is granted only at the request of an
   authorized Imperion employee at manager level or above. The requesting manager identifies the
   appropriate resources based on the user's role, including security group memberships,
   distribution lists, shares, licenses, and applications. Provisioning operates under **least
   privilege** — access is restricted to only what the role requires. Information Security may
   validate that any requested access is appropriate. Requests for additional access after initial
   provisioning follow the same approval process as a new account.
2. **Identity and authentication standards.** Each user receives a **unique** identifier; shared
   or generic interactive accounts are prohibited. **Always-on MFA** is enforced on all accounts
   via Entra ID; **phishing-resistant** methods are required for privileged accounts and
   recommended for all (CS-04). Passwords follow modern guidance: length-prioritized passphrases,
   screening against known-breached credentials, and no forced periodic rotation absent indication
   of compromise. Workforce credentials are stored and managed in **1Password**. Privileged roles
   are governed by **Entra PIM** with just-in-time, time-bound, approval-gated elevation. Service
   accounts and non-human identities are inventoried, least-privileged, and where possible
   replaced with managed/workload identities; their secrets are vaulted and rotated.
3. **Role change (Mover).** On a role change, access is re-evaluated against the new role under
   least privilege; entitlements no longer required are removed in the same change, not
   accumulated. Privilege creep is a finding, not an accepted state.
4. **Account lifecycle and hygiene.** Accounts inactive for **45 days** are reviewed; accounts
   inactive for **90 days** are automatically disabled. Access is reviewed at least quarterly by
   System Owners; privileged access is reviewed at least quarterly. A user's access may be
   temporarily revoked during investigation of suspected compromise or misuse. Guest and external
   collaboration identities are governed by entitlement management with expiration and periodic
   access review.
5. **Deprovisioning (Leaver) is time-critical.** Access removal on separation is the most
   time-sensitive lifecycle event. The mechanics — Entra account disable, session/token
   revocation, credential reset, removal from privileged roles and groups, device reclaim/wipe,
   and 1Password/badge revocation — are executed per IT-09 in a coordinated, documented,
   **time-bound** workflow. Involuntary terminations and any privileged access are revoked
   **immediately**.
6. **Monitoring.** Identity risk events, sign-in anomalies, and privileged-account activity are
   monitored through Entra ID Protection and forwarded to **Microsoft Sentinel** for detection and
   response (CS-13).

## 5. Application to Autonomous Agents

For account creation, modification, access grants, and deprovisioning:

- **Autonomy ceiling.** Osiris (Account/Identity lifecycle) operates at an **L3** ceiling
  (ADR-0128): it intakes JML requests, validates them against role and least-privilege rules,
  prepares the exact provisioning/deprovisioning change set, schedules access reviews, and flags
  inactive accounts and privilege creep. **Identity and account changes are gated** — Osiris does
  not autonomously alter who can access what.
- **`always_gate` actions.** Creating an account, granting or elevating access (especially
  privileged/PIM-eligible roles), and any change to identity are **`always_gate` at every dial
  level** — identity changes touch permissions and are dial-proof (top-umbrella §4). The manager
  (for grants) and IT/Security (for privileged roles) approve via the easy-button. **Leaver
  deprovisioning is time-bound:** Osiris auto-prepares the full revocation set the instant a leave
  is signaled and presents the human a single execute within the deprovisioning SLA — the *trigger*
  to revoke is human-confirmed, but the agent must not let a leaver's access linger past the bound
  while waiting (escalate if unactioned).
- **Human-in-loop & easy-button.** As the dial climbs, Osiris auto-assembles the complete,
  validated change (joiner welcome kit, mover delta, leaver revocation list) and hands the
  approver a **one-click** apply (top-umbrella P3). The grant/elevate/revoke decision stays human
  at every level.
- **Escalation & refusal.** Osiris escalates a stalled leaver-deprovisioning, a privileged-access
  anomaly, or an access-review overdue item via the urgent path (top-umbrella P4). Osiris
  **refuses** to grant, elevate, or change identity without recorded human approval, even if a
  dial setting would technically allow it (top-umbrella §5.5).
- **Evidence.** Every provisioning, modification, and deprovisioning action writes an audit record
  to the `agent_run` / `agent_message` ledger — the identity, the entitlements changed, the
  least-privilege justification, the deprovisioning timing, and the approve/decline attributed to
  the accountable human.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| CTO (human) | Owns the account/access lifecycle and this policy; co-owns the access model with the CISO (CS-02) |
| Requesting manager (human) | Requests and approves role-appropriate access; submits the leaver request promptly with the termination date |
| System Owner (human) | Performs quarterly access reviews; validates least privilege |
| IT / Security (human) | Approves privileged/PIM elevation; executes immediate involuntary-termination revocation |
| Osiris — Account/Identity lifecycle (agent, L3) | Intakes JML; validates against least privilege; prepares provisioning/deprovisioning change sets; auto-prepares time-bound leaver revocation; flags inactivity and creep; never changes identity autonomously |

## 7. Enforcement & Audit

Adherence is enforced structurally (the gauntlet's identity/permissions floor, least-privilege
budget, Entra PIM, RLS/data-class) and verified continuously (quarterly access reviews, 45/90-day
hygiene automation, deprovisioning-timeliness monitoring via Sentinel, the agent eval goldens, and
the conformance/audit sweep run by Grace/Vera). The [coverage-matrix](../coverage-matrix.md)
proves every lifecycle procedure is bound to this policy. A missed deprovisioning SLA or an
unauthorized grant is a reportable finding; for an agent, an unauthorized identity change attempt
parks the work, escalates, and lowers the dial or trips the kill-switch.

## 8. Related

**Procedures governed:** Stream 03 (Sold → Live — onboarding/provisioning) + offboarding and
access-review steps. **Related policies:**
[IT-00 IT Operations Program](IT-00-it-operations-program.md) ·
[IT-09 Network Operations & Access Termination](IT-09-network-operations-and-access-termination.md) ·
[IT-07 Endpoint & Device Baseline](IT-07-endpoint-and-device-baseline.md) ·
[CS-02 Identity & Access Management] · [CS-04 Remote Access & MFA] · [CS-13 Logging, Monitoring &
SIEM]. **ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard ceilings) · ADR-0058
(gauntlet) · ADR-NNNN (policy-canon architecture).
