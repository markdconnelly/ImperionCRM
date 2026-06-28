# IM026 — Client Shared Responsibility Policy & Matrix

| Field | Value |
| --- | --- |
| **Subject** | IM026 — Client Shared Responsibility Policy & Matrix |
| **Category** | Information Security / Service Delivery |
| **Owner** | CISO |
| **Reviewer** | Legal / Executive Leadership |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL Imperion managed-services engagements |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (GV.SC, GV.RR) · SOC 2 (Complementary User Entity Controls / CUECs)

---

## 1. Purpose

To define, for each security control area, the division of responsibility between Imperion (the service provider) and the client (the user entity). As a service organization, Imperion's SOC 2 report relies on **Complementary User Entity Controls (CUECs)** — controls the client must operate for the overall system to be effective. This policy makes those boundaries explicit, preventing gaps where each party assumes the other is responsible.

## 2. Definitions

- **Shared Responsibility** — The allocation of security obligations between Imperion and the client.
- **Complementary User Entity Control (CUEC)** — A control the client is responsible for operating, assumed by Imperion's control design.
- **RACI** — Responsible, Accountable, Consulted, Informed.

## 3. Statement of Policy

### 3.1 Responsibility Definition

- Every managed-services engagement includes a documented shared-responsibility matrix, derived from this policy and tailored to the services contracted.
- The matrix is reviewed with the client at onboarding and at least annually (e.g., during QBRs).
- Where responsibility shifts (e.g., client retains certain administrative functions), the matrix is updated and agreed in writing.

### 3.2 General Principles

- Imperion is responsible for the security of the services it operates and the controls it contractually commits to.
- The client remains responsible for decisions and controls within its own purview — including approving access, classifying its data, enforcing internal policy on its workforce, and acting on Imperion's recommendations.
- Neither party's responsibility relieves the other of acting in good faith and communicating promptly on security matters.

### 3.3 Responsibility Matrix (Baseline)

| Control Area | Imperion | Client |
| --- | --- | --- |
| Identity & MFA (Entra) | Configure, enforce MFA/Conditional Access, monitor | Approve users/roles, enforce internal use, protect own credentials |
| Privileged access (PIM/GDAP) | Operate least-privilege admin, log actions | Approve Imperion's delegated access scope |
| Patch & vulnerability mgmt | Deploy patches (Kaseya), scan, report | Approve maintenance windows, fund EOL replacement |
| Endpoint & EDR | Deploy/manage Defender, baseline, monitor | Ensure devices enrolled, follow device policy |
| Email security | Configure Defender for O365, SPF/DKIM/DMARC, filter | Train users, report phishing, approve mail-flow changes |
| Data classification | Provide labeling tooling (Purview), advise | Classify own data, define sensitivity requirements |
| Backup & recovery | Operate backups (Kaseya), test restores | Define RPO/RTO needs, validate critical-system list |
| Logging & monitoring (SIEM) | Operate Sentinel/Defender XDR, alert, respond | Provide context, act on notifications requiring client action |
| Incident response | Detect, contain, eradicate, recover; notify | Decision authority on business impact, regulatory/breach notification to subjects |
| Access reviews | Provide reports, facilitate reviews | Approve/attest to access appropriateness |
| AI deployment (IM011) | Assess, configure securely, monitor | Approve use cases, data scope, accept residual risk |
| User onboarding/offboarding | Execute provisioning/de-provisioning | Submit timely joiner/leaver requests with accurate dates |
| Physical security | Secure Imperion-operated infrastructure | Secure client premises and on-site equipment |
| Compliance/regulatory | Operate and evidence contracted controls | Own client's regulatory obligations and notifications |

*This baseline is tailored per engagement; the contracted Statement of Work and service descriptions govern in case of conflict.*

### 3.4 Complementary User Entity Controls

The engagement-specific matrix explicitly lists the CUECs the client must operate for Imperion's controls to be effective (e.g., timely termination requests, protecting client-held credentials, acting on security recommendations, approving access). These are communicated and acknowledged at onboarding.

### 3.5 Communication and Escalation

- Responsibilities for incident notification, escalation paths, and decision authority are defined per engagement and tested through tabletop exercises where appropriate.

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF GV.SC, GV.RR | Supply-chain roles, responsibility allocation |
| SOC 2 CUECs | Complementary user entity controls disclosure |

---

*Electronic approval on file.*
