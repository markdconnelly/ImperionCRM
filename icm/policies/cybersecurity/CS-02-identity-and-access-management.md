# CS-02 — Identity & Access Management

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program umbrella](CS-00-information-security-program.md).
> Rewrite-from-source of the legacy `IM003 — Information System Ownership & Access Management`;
> the security substance, MSP cross-tenant controls, and framework mappings are preserved,
> restructured to the dual-audience canon template. Governance terms are defined ONCE in the top
> umbrella; this policy localizes them.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-02` |
| **Title** | Identity & Access Management |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly); operated by the Director of Cybersecurity |
| **Governing for (agents)** | Osiris (IAM) — and all agents for least-privilege and the access rules |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00 Information Security Program](CS-00-information-security-program.md) + [CS-03 Remote Access & MFA](CS-03-remote-access-and-mfa.md) |

**Framework Alignment:** NIST CSF 2.0 (ID.AM; PR.AA-01/05; PR.IR) · AICPA SOC 2 (CC6.1, CC6.2,
CC6.3) · NIST AI RMF (Manage — agent access governance).

---

## 1. Purpose

To provide requirements for System Owners, System Administrators, and agent actors that ensure
appropriate controls govern access to — and protect the confidentiality, integrity, and
availability of — sensitive information maintained by Imperion and its clients. The policy
anchors Imperion's Zero Trust model in identity as the control plane and binds every actor, human
or agent, to least privilege.

## 2. Scope

**Who:** all Imperion and Imperion-managed information systems, every human role that owns,
administers, or accesses a system, and every agent that reads or acts on a system — Osiris (IAM)
as the primary governed agent, and every agent for least-privilege and the access rules.
**What:** ownership assignment, identity governance, privileged access (including MSP delegated
cross-tenant access), access reviews, and the access-relevant Operating Procedures across Stream
07 and the security baseline of all streams. The policy binds humans and agents identically
except where §5 narrows or gates an agent's authority. No business unit is excluded; mission-
critical systems are explicitly in scope.

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **Application System** — A departmental or client system providing data created within its
  structure and/or integrated from other systems.
- **Technical Distribution System** — Systems serving as a communication or delivery mechanism
  (network, identity, messaging).
- **Mission-Critical Application System** — A system essential to business survival; its failure
  significantly impacts operations.
- **System Owner** — An individual accountable for the development, integration, operation, and
  security of an information system. Must hold the position of Director or higher and may not also
  serve as the System Administrator for the same system.
- **System Administrator** — An individual who supports the System Owner with administrative and
  technical access control for an assigned system.
- **Room budget** — The least-privilege scope an agent is granted for a task
  (`workflow ⊆ domain ⊆ Constitution`, ADR-0088); the agent-side expression of least privilege.

## 4. Policy Statements

1. **Ownership is assigned.** Each application and technical distribution system — including
   mission-critical systems — is assigned one System Owner and one or more System Administrators.
   Ownership may only be assigned by an individual at Vice President level or higher. "System
   Owner" implies accountability, not proprietary interest. Mission-critical systems are
   identified, documented, and reviewed at least annually.
2. **Identity is the control plane (Zero Trust).** All access is authenticated through Microsoft
   Entra ID with always-on MFA and, where supported, phishing-resistant authentication
   (FIDO2 security keys, Windows Hello for Business, or certificate-based authentication, per
   CS-03). Conditional Access enforces device compliance, risk-based sign-in evaluation, and
   location/session controls before access is granted.
3. **Privileged access is just-in-time and least-privilege.** Privileged access is governed
   through Entra Privileged Identity Management (PIM) with just-in-time elevation, approval
   workflows, and time-bound roles. Standing administrative access is minimized; least privilege
   is the default for all roles and for all agent room budgets.
4. **System Owner responsibilities.** The Owner approves and documents activities involving the
   system; develops and approves role-based access definitions incorporating segregation of
   duties; permits or denies access requests; periodically reviews access lists; maintains
   access-management event records (grants, terminations, permission levels) for audit; approves
   what information may be transferred between systems; and meets all applicable laws, regulations,
   and policies at the direction of Information Security.
5. **System Administrator responsibilities.** The Administrator changes all vendor defaults and
   applies minimum security baselines at the direction of Cybersecurity; implements technical
   access controls per Owner-approved procedures; provides the technical function of enabling and
   disabling access; and provides access-management analysis to the Owner on request.
6. **Privileged access for MSP operations.** Client administration uses dedicated, named
   privileged identities — never shared or generic accounts. Delegated access (e.g., GDAP /
   granular delegated admin privileges) is scoped to least privilege and time-bound. All
   privileged actions in client tenants are logged and forwarded to Microsoft Sentinel (CS-10).
7. **Access reviews and audit.** Access to systems handling sensitive information — and all
   privileged access — is reviewed at least quarterly by the System Owner. Systems should support
   activity review (who **may access**, **has accessed**, and where practical **create/edit/delete**
   information, by user ID, date, and time). Audit logs include access to sensitive data,
   privileged-account use, system start/stop, failed authentication, and approved emergency
   access. Mission-critical security logs are forwarded to Microsoft Sentinel where possible, and
   system clocks are synchronized to an authoritative time source so events correlate accurately.
8. **Third-party access.** Third-party access to Imperion systems requires an encrypted VPN
   combined with MFA, governed by CS-03 and the vendor-risk policy.
9. **Procurement and legacy systems.** Procured systems must be able to comply with this policy
   unless a signed CISO exception is obtained. Existing non-compliant systems are identified,
   risk-assessed (CS-05), and remediated under a VP-approved plan.

## 5. Application to Autonomous Agents

For identity and access actions (provisioning, de-provisioning, role/permission changes,
privilege elevation, access reviews, and reads of access-controlled data):

- **Autonomy ceiling.** Osiris (IAM) operates at an **L3** ceiling (ADR-0128) for routine
  identity work, but **all identity changes are gated** — see below. Every other agent is bound by
  least privilege and the access rules: agents receive least-privilege **room budgets**
  (`workflow ⊆ domain ⊆ Constitution`) and may read only the data class their task requires under
  RLS + `data_class`.
- **`always_gate` actions.** Any change to a privilege, role, or identity — provisioning,
  de-provisioning, permission grants, PIM elevation, group membership, or delegated/cross-tenant
  admin scope — is `always_gate` at every dial level. **No agent self-elevates**: an agent may
  never widen its own room budget or grant itself access. The System Owner (or, for client
  tenants, the responsible privileged human) approves via the easy-button.
- **Human-in-loop & easy-button.** As the dial climbs, Osiris may auto-assemble the change set,
  the least-privilege scope, the segregation-of-duties check, and the time-bound expiry, and hand
  the approver a one-click resolution (top-umbrella P3). The decision stays human at every level.
- **Escalation & refusal.** Osiris escalates any access anomaly, standing-privilege drift, or
  failed segregation-of-duties check; he **refuses** to enact an identity/privilege change without
  recorded human approval, and **refuses** any request to self-elevate or to grant shared/generic
  accounts (a refusal-class action stronger than a gate).
- **Evidence.** Every identity/access action writes an access-management event record (grant,
  termination, permission level, scope, expiry) and an `agent_run` / `agent_message` audit entry
  attributed to the accountable human; client-tenant privileged actions are forwarded to Sentinel.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| CISO (human) | Owns this policy; final authority on access exceptions; approves signed procurement exceptions |
| System Owner (human, Director+) | Approves role-based access and SoD; permits/denies access; runs quarterly access reviews; maintains event records |
| System Administrator (human) | Changes vendor defaults; applies baselines; implements grants/terminations per Owner procedures |
| Cybersecurity / SecOps (human function) | Sets minimum baselines; operates PIM and Conditional Access; forwards logs to Sentinel |
| Osiris — IAM (agent, L3, all identity changes gated) | Detects access drift; assembles least-privilege change sets with SoD checks and time-bound expiry; escalates anomalies; never enacts an identity change autonomously and never self-elevates |
| All agents | Operate within least-privilege room budgets; read only the required data class under RLS; never self-elevate or use shared accounts |

## 7. Enforcement & Audit

Adherence is enforced structurally (the gauntlet, the least-privilege room budget, RLS/data-class,
PIM just-in-time elevation) and verified continuously (quarterly access reviews, the agent eval
goldens, the conformance/audit sweep, Sentinel correlation). The
[coverage-matrix](../coverage-matrix.md) proves every access-relevant procedure is bound. A
violation parks the work and escalates; repeated or high-severity violations lower the agent's
dial or trip the kill-switch. Human violations may result in disciplinary action up to and
including termination, and where applicable civil or criminal referral.

## 8. Related

**Procedures governed:** access provisioning/de-provisioning, quarterly access reviews, privileged
access, and MSP delegated-admin steps in Stream 07 and the security baseline. **Related policies:**
[CS-00 Information Security Program](CS-00-information-security-program.md) ·
[CS-03 Remote Access & MFA](CS-03-remote-access-and-mfa.md) ·
[CS-04 Encryption](CS-04-encryption.md) ·
[CS-05 Risk Management & Analysis](CS-05-risk-management-and-analysis.md) ·
[CS-08 Data Classification & Handling] · [CS-09 Vendor & Third-Party Security Risk] ·
[CS-10 Logging, Monitoring & SIEM]. **ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard
ceilings) · ADR-0058 (gauntlet) · ADR-0088 (room budget) · ADR-0118 (data-class action ceiling) ·
ADR-0134 (policy-canon architecture).
