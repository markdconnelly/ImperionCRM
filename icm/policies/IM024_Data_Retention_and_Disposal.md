# IM024 — Data Retention & Disposal Policy

| Field | Value |
| --- | --- |
| **Subject** | IM024 — Data Retention & Disposal Policy |
| **Category** | Information Security / Legal |
| **Owner** | Director of Cybersecurity |
| **Reviewer** | CISO / Legal |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL Imperion and Imperion-managed data and media |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (PR.DS, ID.AM) · NIST SP 800-88 · SOC 2 (C1.2, CC6.5)

---

## 1. Purpose

To define how long data is retained and how it is securely disposed of when no longer required, balancing business need, legal/regulatory obligation, and the risk of retaining data unnecessarily.

## 2. Definitions

- **Retention Period** — The defined duration data is kept before disposal.
- **Legal Hold** — A suspension of normal disposal when data is relevant to litigation, investigation, or regulatory inquiry.
- **Sanitization** — Rendering data unrecoverable (per NIST SP 800-88).

## 3. Statement of Policy

### 3.1 Retention Principles

- Data is retained only as long as necessary for its business purpose or as required by law, regulation, or contract; unnecessary retention is avoided (data minimization, IM019).
- Retention periods are defined by data type and documented in a retention schedule maintained by Information Security with Legal input.
- Client data retention follows the applicable client agreement and is never shorter than contractually required.

### 3.2 Retention Schedule (Illustrative)

| Data Category | Typical Retention | Basis |
| --- | --- | --- |
| Security/audit logs | ≥ 1 year (90 days hot) | IM014, contract/regulation |
| Backups | Per system RPO/retention design | IM015 |
| Client data | Per client contract; returned/destroyed at termination + agreed period | IM009/IM013 |
| Personal data | Purpose-limited; per law | IM019 |
| Contracts/legal records | Per legal requirement | Legal |
| Email | Per Purview retention policy | Business/legal |

*Specific periods are finalized in the retention schedule.*

### 3.3 Legal Holds

- Upon notice of litigation, investigation, or regulatory inquiry, affected data is placed on legal hold and exempt from disposal until released by Legal.

### 3.4 Secure Disposal

- Electronic media is sanitized to **NIST SP 800-88** standards or physically destroyed.
- Paper containing sensitive information is shredded (IM018).
- Cloud data deletion relies on provider attestations and contractual exit provisions (IM009).
- Disposal of media containing Restricted/Confidential data is documented.

### 3.5 Client Offboarding

- At the end of a client engagement, client data is returned or securely destroyed per contract, and destruction is documented (IM007/IM013).

### 3.6 Enforcement and Automation

- Retention and disposal are enforced through Microsoft Purview retention/labeling and backup-platform policies where feasible.

## 4. NIST / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF PR.DS, ID.AM; SP 800-88 | Data lifecycle and secure disposal |
| SOC 2 C1.2 / CC6.5 | Confidential data disposal |

---

*Electronic approval on file.*
