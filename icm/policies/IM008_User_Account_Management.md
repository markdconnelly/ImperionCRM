# IM008 — User Account Management Policy

| Field | Value |
| --- | --- |
| **Subject** | IM008 — User Account Management Policy |
| **Category** | Information Security |
| **Owner** | Director of Cybersecurity |
| **Reviewer** | CISO |
| **Version** | 2.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL Imperion and Imperion-managed network and application accounts |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (PR.AA-01–05) · SOC 2 (CC6.1, CC6.2, CC6.3)

---

## 1. Purpose

To define requirements for account creation, authentication, and authorization to network and cloud resources that store, process, or transmit sensitive information, operating under least privilege and Zero Trust.

## 2. Definitions

- **Authentication** — Verifying a user's identity through a unique identifier combined with credentials and a multi-factor element.
- **Authorization** — The level of access a user holds once authenticated.
- **User Account Provisioning** — The creation and ongoing management of accounts across the identity lifecycle (joiner-mover-leaver).
- **Identity Provider (IdP)** — **Microsoft Entra ID**, the authoritative source for identity and access at Imperion.

## 3. Statement of Policy

### 3.1 Provisioning and Authorization

- Access is granted only at the request of an authorized Imperion employee at manager level or above.
- The requesting manager identifies the appropriate resources based on the user's role, including security group memberships, distribution lists, shares, licenses, and applications.
- Provisioning operates under **least privilege** — access is restricted to only what is necessary for the role.
- Information Security reserves the right to validate that any requested access is appropriate.
- Requests for additional access after initial provisioning follow the same approval process as a new account.

### 3.2 Identity and Authentication Standards

- Each user receives a **unique** identifier; shared or generic interactive accounts are prohibited.
- **Always-on MFA** is enforced on all accounts via Entra ID; **phishing-resistant** methods are required for privileged accounts and recommended for all (see IM004).
- Passwords follow modern guidance: length-prioritized passphrases, screening against known-breached credentials, and no forced periodic rotation absent indication of compromise. Workforce credentials are stored and managed in **1Password**.
- Privileged roles are governed by **Entra PIM** with just-in-time, time-bound, approval-gated elevation.
- Service accounts and non-human identities are inventoried, least-privileged, and where possible replaced with managed identities or workload identities; their secrets are vaulted and rotated.

### 3.3 Account Lifecycle and Hygiene

- Accounts inactive for **45 days** are reviewed; accounts inactive for **90 days** are automatically disabled (tightened from the legacy 120-day standard to reflect current best practice).
- Access is reviewed at least quarterly by System Owners (IM003); privileged access is reviewed at least quarterly.
- A user's access may be temporarily revoked during investigation of suspected account compromise or misuse.
- Guest and external collaboration identities are governed by entitlement management with expiration and periodic access review.

### 3.4 Monitoring

Identity risk events, sign-in anomalies, and privileged-account activity are monitored through Entra ID Protection and forwarded to **Microsoft Sentinel** for detection and response (IM014).

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF PR.AA-01–05 | Identity management, authentication, authorization, least privilege |
| SOC 2 CC6.1–CC6.3 | Account provisioning, authorization, and de-provisioning |

---

*Electronic approval on file.*
