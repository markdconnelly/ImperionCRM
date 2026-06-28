# IM007 — Network Access Termination Policy

| Field | Value |
| --- | --- |
| **Subject** | IM007 — Network Access Termination Policy |
| **Category** | Information Security |
| **Owner** | Director of Cybersecurity |
| **Reviewer** | CISO |
| **Version** | 2.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL Imperion and Imperion-managed entities and identities |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (PR.AA-04) · SOC 2 (CC6.2, CC6.3)

---

## 1. Purpose

To establish requirements for the prompt and complete removal of user access to facilities and information systems upon termination of employment, contract, or engagement.

## 2. Definitions

- **Termination** — The end of an employment, contractor, vendor, or consultant relationship, whether voluntary or involuntary.
- **Joiner-Mover-Leaver (JML)** — The identity lifecycle process governing onboarding, role change, and offboarding.

## 3. Statement of Policy

### 3.1 Timeliness of Revocation

- Access to facilities and information systems is revoked upon termination as soon as practicably possible.
- For **involuntary terminations** and any termination involving privileged access, revocation is performed **immediately** and, wherever feasible, coordinated to coincide with or precede notification.
- The terminating individual's immediate supervisor must submit the termination request promptly for both voluntary and involuntary terminations, including the actual termination date.

### 3.2 Offboarding Actions

Upon termination, the following are performed in a coordinated, documented workflow:

- Disable the Entra ID account and **revoke all active sessions and refresh tokens** to force immediate sign-out across all applications.
- Reset credentials and remove the identity from privileged roles (including Entra PIM eligibility).
- Reclaim and remove MFA methods and registered devices.
- Remove the user from security groups, distribution lists, licenses, and application access.
- Revoke VPN, ZTNA, and remote-access entitlements.
- Retrieve or remotely wipe company devices; revoke certificates and security keys.
- Disable or transfer access to the **1Password** account and remove shared vault access.
- Revoke physical/badge access.
- Preserve mailbox and data per retention requirements before deletion.

### 3.3 Privileged and Administrative Workforce

For IT, Cybersecurity, and MSP technicians with administrative access to Imperion or client systems, the responsible manager must verify that **all** methods of access — including access to client tenants via delegated administration (GDAP) and any standing privileged credentials — have been removed and documented.

### 3.4 Verification and Audit

- Completion of each offboarding step is recorded and auditable.
- Account-termination timeliness is monitored continuously and reported through Sentinel (IM014).
- Inactive accounts are governed by IM008.

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF PR.AA-04 | Timely de-provisioning of identities and credentials |
| SOC 2 CC6.2 / CC6.3 | Removal of access on termination |

---

*Electronic approval on file.*
