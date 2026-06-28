# IM012 — Data Classification & Handling Policy

| Field | Value |
| --- | --- |
| **Subject** | IM012 — Data Classification & Handling Policy |
| **Category** | Information Security |
| **Owner** | Director of Cybersecurity |
| **Reviewer** | CISO |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL Imperion and Imperion-managed data in any form |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (ID.AM-05, PR.DS) · SOC 2 (CC6.1, C1.1, C1.2)

---

## 1. Purpose

To establish a consistent scheme for classifying data by sensitivity and to define the handling, storage, transmission, retention, and disposal requirements for each classification. Classification is the foundation for encryption (IM005), access control (IM003/IM008), DLP, and AI data protection (IM010/IM011).

## 2. Classification Levels

| Level | Definition | Examples |
| --- | --- | --- |
| **Restricted** | Highest sensitivity; unauthorized disclosure could cause severe harm, legal/regulatory penalty, or major reputational damage | Credentials, secrets, encryption keys, security architecture, incident details, regulated PII/PHI, payment-card data, client Restricted data |
| **Confidential** | Sensitive internal or client data; disclosure could cause harm or competitive disadvantage | Client business data, employee data, contracts, financials, trade secrets, internal documentation |
| **Internal** | Non-public operational data with low harm potential if disclosed | Internal communications, runbooks, non-sensitive project data |
| **Public** | Approved for public release | Marketing materials, published documentation |

"Sensitive Information" in other Imperion policies refers collectively to **Restricted** and **Confidential** data.

## 3. Statement of Policy

### 3.1 Classification and Labeling

- All data is classified, with the most sensitive applicable level assigned by default when in doubt.
- **Microsoft Purview sensitivity labels** are applied across Microsoft 365 to enforce classification technically, including for AI grounding (so Copilot honors labels).
- Data owners (System Owners under IM003) are accountable for classifying data in their systems.
- Client data is classified at least as protectively as the client requires, and never below Confidential absent written agreement.

### 3.2 Handling Requirements by Classification

| Requirement | Restricted | Confidential | Internal | Public |
| --- | --- | --- | --- | --- |
| Encryption at rest | Required | Required | Recommended | Optional |
| Encryption in transit | Required | Required | Required | Optional |
| MFA / least-privilege access | Required (phishing-resistant) | Required | Required | N/A |
| Permitted in approved enterprise AI tools | Only with explicit approval + no-training guarantee | Only with approval | Permitted | Permitted |
| Permitted in consumer/public AI tools | Never | Never | Never | Permitted |
| External sharing | Only via approved, controlled mechanism | Approved mechanisms with DLP | Limited | Unrestricted |
| Removable media | Only encrypted, business-justified | Encrypted | Discouraged | N/A |
| DLP enforcement | Enforced | Enforced | Monitored | N/A |

### 3.3 Storage and Transmission

- Restricted and Confidential data is stored only in approved, encrypted systems (Microsoft 365, Azure, 1Password for secrets).
- Transmission follows IM005 (TLS 1.2+, SFTP, SSH; legacy protocols prohibited).
- Email containing Restricted/Confidential data uses message encryption; DLP policies block or protect outbound sensitive data.

### 3.4 Retention and Disposal

- Data is retained per contractual, legal, and regulatory requirements, then securely disposed.
- Electronic media is sanitized to NIST SP 800-88 standards; physical media is destroyed.
- Cloud data deletion follows provider attestations and contractual exit provisions (IM009).

### 3.5 Data Loss Prevention

- Microsoft Purview DLP monitors and controls Restricted and Confidential data across email, endpoints, and cloud apps.
- DLP and AI data-protection policies are aligned so that classification governs what may enter AI tools (IM010/IM011).

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF ID.AM-05, PR.DS-01/02 | Data classification, protection at rest/in transit |
| SOC 2 C1.1 / C1.2 / CC6.1 | Confidentiality identification, handling, and disposal |

---

*Electronic approval on file.*
