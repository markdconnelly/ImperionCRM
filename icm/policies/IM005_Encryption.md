# IM005 — Encryption Policy

| Field | Value |
| --- | --- |
| **Subject** | IM005 — Encryption Policy |
| **Category** | Information Security |
| **Owner** | Director of Cybersecurity |
| **Reviewer** | CISO |
| **Version** | 2.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL Imperion and Imperion-managed systems and data |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (PR.DS) · SOC 2 (CC6.1, CC6.7, C1.1)

---

## 1. Purpose

This policy reflects Imperion's commitment to protect electronic information from unauthorized access, disclosure, or alteration through the consistent application of strong, industry-accepted encryption.

## 2. Definitions

- **System Owner** — The individual assigned under IM003 as responsible for the content and security of an information system.
- **Personal Information (PII)** — Sensitive personally identifiable information that can be traced to an individual and could cause harm if disclosed (biometric, medical, financial, and unique identifiers).
- **Business Information** — Sensitive business data that would pose risk if exposed to a competitor or the public (trade secrets, acquisition plans, financials, employee data, supplier/customer information).
- **Sensitive Information** — The combined set of personal and business information requiring protection (see IM012 for full classification).
- **Encryption** — Encoding data using a strong, industry-accepted algorithm so only authorized parties can decrypt and read it.

## 3. Statement of Policy

Imperion encrypts all **Sensitive Information** wherever reasonably and technically feasible.

### 3.1 Approved Algorithms and Standards

- **Data at rest:** AES-256 or stronger. Full-disk encryption (BitLocker for Windows, FileVault for macOS) is enforced and monitored on all endpoints via Entra ID / Intune compliance and the RMM platform.
- **Data in transit:** TLS 1.2 minimum, TLS 1.3 preferred. Legacy protocols (SSL, TLS 1.0/1.1, SMBv1) are prohibited. Acceptable session-layer technologies include TLS/HTTPS, SSH, and SFTP.
- Insecure protocols may **not** be used to transmit files outside the Imperion or client network boundary.
- Cryptographic standards are reviewed at least annually against NIST guidance, including planning for post-quantum cryptography migration as standards mature.

### 3.2 Data at Rest

- Data at rest means all electronic information stored on Imperion- or client-owned drives, removable media, and cloud storage.
- No Sensitive Information is created or stored on portable or removable media except for legitimate, job-related purposes.
- All Sensitive Information at rest, whether on permanent or temporary storage, must be encrypted.
- Cloud-stored data (Microsoft 365, Azure) uses platform encryption with Microsoft-managed or, where required, customer-managed keys.

### 3.3 Data in Transit

- Any transmission of Imperion or client data — internal or external, wired or wireless — must be encrypted.
- Email containing Sensitive Information is protected via the Microsoft Purview / Exchange Online encryption gateway and message encryption.

### 3.4 Key Management

- The MIS/Cybersecurity team maintains procedures for changing vendor defaults on all devices transmitting Sensitive Information.
- Keys and credentials are managed centrally in **1Password** (workforce credential management) and Azure Key Vault (platform keys).
- Keys and passwords are rotated on a predetermined basis and, at minimum, following any System Administrator personnel change.
- Recovery keys (e.g., BitLocker) are escrowed securely in Entra ID / Intune and protected against unauthorized access.

### 3.5 Exceptions

Exceptions may be allowed for legacy systems or applications lacking encryption capability. Each exception requires a documented risk assessment (IM006), CISO approval, and a remediation plan to replace or upgrade the system where feasible.

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF PR.DS-01/02/10 | Data-at-rest, data-in-transit, and key protection |
| SOC 2 CC6.1 / CC6.7 / C1.1 | Encryption controls and confidentiality |

---

*Electronic approval on file.*
