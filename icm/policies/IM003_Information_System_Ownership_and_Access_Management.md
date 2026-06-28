# IM003 — Information System Ownership & Access Management Policy

| Field | Value |
| --- | --- |
| **Subject** | IM003 — Information System Ownership & Access Management Policy |
| **Category** | Information Technology / Information Security |
| **Owner** | Director of Cybersecurity |
| **Reviewer** | CISO |
| **Version** | 2.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL Imperion and Imperion-managed information systems, including mission-critical systems |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (ID.AM, PR.AA, PR.IR) · SOC 2 (CC6.1, CC6.2, CC6.3)

---

## 1. Purpose

To provide requirements for System Owners and Administrators to ensure appropriate controls govern access to, and protect the confidentiality, integrity, and availability of, sensitive information maintained by Imperion and its clients.

## 2. Definitions

- **Application System** — A departmental or client system providing data created within its structure and/or integrated from other systems.
- **Technical Distribution System** — Systems and technologies serving as a communication or delivery mechanism (network, identity, messaging).
- **Mission-Critical Application System** — A system essential to business survival; its failure significantly impacts operations.
- **System Owner** — An individual accountable for the development, integration, operation, and security of an information system. Must hold the position of Director or higher and may not also serve as the System Administrator for the same system.
- **System Administrator** — An individual who supports the System Owner with administrative and technical access control for an assigned system.

## 3. Statement of Policy

### 3.1 Ownership Assignment

- This policy covers all systems, including mission-critical systems, across Imperion and its managed clients.
- Mission-critical systems are identified, documented, and reviewed at least annually by System Owners with their Administrators.
- Each application and technical distribution system is assigned one System Owner and one or more System Administrators.
- System ownership may only be assigned by an individual at Vice President level or higher.
- The term "System Owner" does not imply proprietary or ownership interest in data or systems.

### 3.2 Identity as the Control Plane (Zero Trust)

Imperion operates a Zero Trust model anchored in **Microsoft Entra ID** as the primary identity provider:

- All access is authenticated through Entra ID with **always-on multi-factor authentication (MFA)** and, where supported, **phishing-resistant authentication** (FIDO2 security keys, Windows Hello for Business, or certificate-based authentication).
- Conditional Access policies enforce device compliance, risk-based sign-in evaluation, and location/session controls before access is granted.
- Privileged access is governed through **Entra Privileged Identity Management (PIM)** with just-in-time elevation, approval workflows, and time-bound roles.
- Standing administrative access is minimized; least privilege is the default for all roles.

### 3.3 System Owner Responsibilities

System Owners shall:

- Approve and document activities involving the system (access, upgrades, migration).
- Develop and approve role-based access definitions, incorporating segregation of duties (SoD).
- Permit or deny access requests and maintain procedures ensuring knowledgeable involvement in access decisions.
- Periodically review access lists, verifying that granted access matches actual need and that terminated access has been removed (see §3.6).
- Maintain access-management event records (grants, terminations, permission levels) for audit and investigation.
- Approve what information may be transferred to or received from other systems.
- Meet all laws, regulations, and policies applicable to their system, at the direction of Information Security.

### 3.4 System Administrator Responsibilities

System Administrators shall:

- Change all vendor defaults and apply minimum security baselines at the direction of Cybersecurity.
- Implement technical access controls (grants, terminations, permission levels) per Owner-approved procedures.
- Provide the technical function of enabling and disabling access.
- Provide access-management analysis to the System Owner on request.

### 3.5 Privileged Access for MSP Operations

Because Imperion administers client environments, additional controls apply to delegated and cross-tenant administrative access:

- Client administration uses dedicated, named privileged identities — never shared or generic accounts.
- Delegated access (e.g., GDAP / granular delegated admin privileges) is scoped to least privilege and time-bound.
- All privileged actions in client tenants are logged and forwarded to Sentinel (see IM014).

### 3.6 Access Reviews and Audit

- Access to systems handling sensitive information is reviewed at least quarterly, and privileged access at least quarterly, by the System Owner.
- Systems should support activity review by tracking which users **may access**, **have accessed**, and (where practical) **create, edit, or delete** information, by user ID, date, and time.
- Audit logs include access to sensitive data, use of privileged accounts, system start/stop, failed authentication, and approved emergency access.
- Where technically possible, security logs from mission-critical systems are forwarded to **Microsoft Sentinel** (SIEM).
- System clocks are synchronized to an authoritative network time source so audit events correlate accurately.

### 3.7 Third-Party Access

Third-party access to Imperion systems requires an encrypted VPN connection combined with MFA, governed by IM004 and IM013.

### 3.8 Procurement and Legacy Systems

- Workforce members procuring information systems must ensure those systems can comply with this policy, unless a signed exception is obtained from the CISO.
- Existing non-compliant systems must be identified, risk-assessed (IM006), and remediated under a plan approved by the appropriate VP.

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF ID.AM, PR.AA-01/05, PR.IR | Asset/ownership inventory, identity & access, least privilege |
| SOC 2 CC6.1–CC6.3 | Logical access provisioning, authorization, segregation of duties |

---

*Electronic approval on file.*
