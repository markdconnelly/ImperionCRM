# CS-03 — Remote Access & MFA

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program umbrella](CS-00-information-security-program.md).
> Rewrite-from-source of the legacy `IM004 — Remote Access & MFA`; the authentication
> requirements, vendor/site-to-site controls, and framework mappings are preserved, restructured
> to the dual-audience canon template. Governance terms are defined ONCE in the top umbrella; this
> policy localizes them.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-03` |
| **Title** | Remote Access & Multi-Factor Authentication |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly) |
| **Governing for (agents)** | Osiris (IAM), Cyrus (SOC) — and all agents for the authentication and least-privilege rules |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00 Information Security Program](CS-00-information-security-program.md) + [CS-02 Identity & Access Management](CS-02-identity-and-access-management.md) |

**Framework Alignment:** NIST CSF 2.0 (PR.AA-01/03/05; PR.IR-01) · AICPA SOC 2 (CC6.1, CC6.6,
CC6.7) · NIST AI RMF (Manage — agent connectivity governance).

---

## 1. Purpose

To provide a secure framework for remote access to Imperion's and clients' network resources, and
to establish authentication requirements consistent with a Zero Trust security model. Strong,
phishing-resistant identity is the gate to every remote session for every actor — human or agent.

## 2. Scope

**Who:** all Imperion workforce members, contractors, approved consultants, vendors, and AI
agents — Osiris (IAM) and Cyrus (SOC) as primary governed agents, and every agent for the
authentication and least-privilege rules. **What:** all remote access to Imperion and Imperion-
managed network resources, authentication requirements, secure connectivity, vendor/third-party
remote access, site-to-site VPN, and monitoring, across the access-relevant Operating Procedures
in Stream 07 and the security baseline. The policy binds humans and agents identically except
where §5 narrows or gates an agent's authority. No business unit is excluded.

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **Multi-Factor Authentication (MFA)** — Authentication requiring two or more independent
  factors: something you know, something you have, and/or something you are.
- **Phishing-Resistant Authentication** — Methods resistant to interception and replay —
  FIDO2/WebAuthn security keys, passkeys, Windows Hello for Business, certificate-based
  authentication — that do not rely on phishable shared secrets such as OTP codes.
- **Conditional Access** — The Entra ID policy engine that evaluates signals (user, device,
  location, risk) to grant, limit, or block access.
- **VPN** — A secure, encrypted tunnel through an untrusted network protecting data in transit.

## 4. Policy Statements

1. **Always-on MFA is mandatory** for all workforce members, contractors, and any access to
   Imperion or client resources. There are no exemptions for convenience.
2. **Phishing-resistant authentication is required** for all privileged and administrative access,
   and is strongly recommended and progressively enforced for all users. OTP via SMS is deprecated
   and permitted only as a temporary fallback where no stronger method is technically available,
   subject to documented exception.
3. **Authentication is centralized in Microsoft Entra ID.** Conditional Access policies enforce
   device compliance, sign-in risk evaluation, and session controls. Generic or shared accounts
   for remote access are prohibited.
4. **Eligibility requires documented justification.** Only individuals with documented business
   justification (employment duties, or an approved contracted/vendor engagement) are granted
   remote access, limited to the minimum necessary for assigned duties, and restricted to
   employees, contracted individuals, and approved consultants.
5. **Connectivity is encrypted.** Remote access to network resources is encrypted via secure VPN
   or an equivalent Zero Trust Network Access (ZTNA) broker. All remote sessions are subject to
   the access-management and acceptable-use policies. Where MFA cannot be technically applied,
   source-IP allow-listing constrains connections pending remediation.
6. **Vendor and third-party remote access is constrained.** It is time-limited to the expected
   engagement completion date; not permitted until vendor due diligence is complete, controls are
   implemented, and an executed agreement reflects the vendor's security obligations. Vendor
   systems connecting to managed networks must meet Imperion's minimum endpoint baseline
   (EDR/antivirus, email and web protection, host firewall, intrusion prevention). Third parties
   terminate sessions when complete and guard against unauthorized viewing via session lock.
7. **Site-to-site (LAN-to-LAN) VPN is sponsored and reviewed.** Every request is sponsored by an
   Imperion manager or above via service request; Security Operations reviews and approves before
   implementation, confirming an executed agreement and a policy-compliant configuration.
   Connections are re-reviewed on significant configuration change (ports, source, destination)
   and disabled when no longer needed or on contract expiry.
8. **Remote-access activity is monitored.** All remote-access authentication and session activity
   is logged through Entra ID sign-in logs and forwarded to Microsoft Sentinel for correlation,
   anomaly detection, and alerting (CS-10).

## 5. Application to Autonomous Agents

For remote-access and authentication actions (initiating remote/automated connections to Imperion
or client resources, requesting or approving remote-access eligibility, MFA/Conditional Access
policy changes, and VPN approvals):

- **Autonomy ceiling.** Cyrus (SOC) operates at **L4 reversible-under-runbook** for monitoring
  and reversible response, but containment, destructive, identity, and client-facing actions are
  `always_gate`. Osiris (IAM) operates at **L3** with all identity changes gated. Every agent is
  bound by least privilege and the authentication rules: agents receive least-privilege **room
  budgets** and authenticate as named, non-shared service identities — never generic accounts.
- **`always_gate` actions.** Any change to an MFA, Conditional Access, or authentication policy;
  any grant of remote-access eligibility; any VPN (including site-to-site) approval; and any
  privilege or identity change tied to remote access is `always_gate` at every dial level.
  **No agent self-elevates** its own access or relaxes its own authentication. Client-facing
  remote actions are `always_gate`.
- **Human-in-loop & easy-button.** As the dial climbs, an agent may auto-assemble the eligibility
  justification, the least-privilege scope, the time-bound expiry, and the Conditional Access
  evaluation, and hand the approver a one-click resolution (top-umbrella P3). The decision stays
  human at every level.
- **Escalation & refusal.** Cyrus escalates anomalous sign-ins, impossible-travel, and failed
  phishing-resistant-auth events per the risk policy and notification routing (top-umbrella P4).
  Any agent **refuses** to act over an unencrypted channel, to use a generic/shared account, to
  relax MFA, or to self-elevate (refusal-class, stronger than a gate).
- **Evidence.** Every remote-access and authentication-policy action writes an `agent_run` /
  `agent_message` audit record attributed to the accountable human; sign-in and session events
  are forwarded to Sentinel.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| CISO (human) | Owns this policy; approves authentication-method exceptions |
| Security Operations (human function) | Reviews/approves site-to-site VPN; operates Conditional Access and Sentinel correlation |
| System Owner / sponsoring manager (human) | Sponsors remote-access and LAN-to-LAN requests; confirms business justification |
| Osiris — IAM (agent, L3, identity changes gated) | Assembles least-privilege, time-bound remote-access change sets; never grants eligibility or relaxes auth autonomously |
| Cyrus — SOC (agent, L4 reversible-under-runbook; containment/destructive/identity/client-facing = always_gate) | Monitors remote-access activity; detects and escalates sign-in anomalies; takes only reversible, runbook-bound response autonomously |
| All agents | Authenticate as named non-shared identities within least-privilege room budgets; never self-elevate, relax MFA, or use unencrypted channels |

## 7. Enforcement & Audit

Adherence is enforced structurally (the gauntlet, the least-privilege room budget, Conditional
Access, encrypted-transport requirement) and verified continuously (Sentinel sign-in correlation,
the agent eval goldens, the conformance/audit sweep, the site-to-site review cadence). The
[coverage-matrix](../coverage-matrix.md) proves every remote-access procedure is bound. A
violation parks the work and escalates; repeated or high-severity violations lower the agent's
dial or trip the kill-switch. Human violations may result in disciplinary action up to and
including termination, and where applicable civil or criminal referral.

## 8. Related

**Procedures governed:** remote-access grant, vendor/third-party remote access, site-to-site VPN
review, and remote-session monitoring steps in Stream 07. **Related policies:**
[CS-00 Information Security Program](CS-00-information-security-program.md) ·
[CS-02 Identity & Access Management](CS-02-identity-and-access-management.md) ·
[CS-04 Encryption](CS-04-encryption.md) · [CS-09 Vendor & Third-Party Security Risk] ·
[CS-10 Logging, Monitoring & SIEM] · [CS-13 Network Security] · [CS-19 Acceptable Use].
**ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard ceilings) · ADR-0058 (gauntlet) ·
ADR-0088 (room budget) · ADR-NNNN (policy-canon architecture).
