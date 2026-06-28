# IM009 — Cloud Security Policy

| Field | Value |
| --- | --- |
| **Subject** | IM009 — Cloud Security Policy |
| **Category** | Information Security |
| **Owner** | Director of Cybersecurity |
| **Reviewer** | CISO |
| **Version** | 2.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL Imperion and Imperion-managed cloud services and data |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (ID.AM, PR.AA, PR.DS, DE.CM) · SOC 2 (CC6.1, CC6.6, CC6.7, CC7.2)

---

## 1. Purpose

To provide a governance framework for the use of cloud computing, storage, and network services that assures the confidentiality, integrity, and availability of information created, received, maintained, or transmitted in the cloud — across Imperion's own tenant and the client tenants it manages.

## 2. Definitions

- **Cloud Service Provider (CSP)** — Any vendor providing products or services to Imperion where any portion of those services stores or processes Imperion or client data on the vendor's infrastructure.
- **Cloud Service** — Software or computing resources hosted via the internet and accessed through a browser or front-end application (email, file sharing, storage, collaboration, infrastructure, AI services).
- **Shared Responsibility Model** — The division of security obligations between the CSP and Imperion/client, varying by service model (IaaS/PaaS/SaaS).

## 3. Statement of Policy

### 3.1 Primary Platform and Architecture

Imperion's primary cloud platform is **Microsoft 365 Business Premium** with workloads in **Microsoft Azure**:

- Identity and access are centralized in **Microsoft Entra ID** with always-on MFA, phishing-resistant authentication for admins, and Conditional Access (IM004, IM008).
- Threat protection is provided by **Microsoft Defender XDR** (Defender for Endpoint, Office 365, Identity, and Cloud Apps).
- Security telemetry — including **DNS, Entra, and Azure activity logs** — is centralized in **Microsoft Sentinel** (SIEM), which is integrated with Defender XDR for unified detection and response (IM014).
- Configuration baselines follow Microsoft Secure Score and CIS Microsoft 365/Azure benchmarks; drift is monitored continuously.

### 3.2 Approved Use and Data Handling

- Workforce members may **never** upload sensitive information to a cloud service not owned, controlled, or approved by Imperion. This includes consumer file-sharing and storage services and any service allowing document upload or manual data entry that is not sanctioned.
- Workforce members may **never** email sensitive information from an Imperion account to a personal email address.
- All network and email activity is subject to audit for compliance. Violations may result in disciplinary action up to and including termination.
- An authoritative list of approved cloud vendors is maintained by Information Security (Exhibit A) and governed under IM013.

### 3.3 Onboarding a Cloud Service

- No cloud service may be initiated on Imperion's behalf without first notifying Legal.
- All cloud vendor contracts and EULAs are submitted for legal review and retained in the contract-management system after negotiation and signature.
- Third-party/vendor risk assessment (IM013) is completed before approval.

### 3.4 Required Contract Provisions

Every cloud contract should address:

- **Custody and ownership** — Imperion (or its client) owns all rights, title, and interest in the data; data is maintained, backed up, and secured until at least one year after termination. Data storage and processing locations are identified, and **data processing/storage occurs within the United States** unless otherwise contractually approved. Governing jurisdiction for privacy and access law is confirmed.
- **Security, privacy, and access** — The provider warrants compliance with specified security standards; unauthorized access, use, disclosure, or alteration by the provider or sub-processors is prohibited; the provider notifies Imperion of data breaches without unreasonable delay and in no event later than 30 days (shorter where required by law or contract).
- **Business continuity and exit** — Backup, restoration, and disaster-recovery provisions; safe return, transfer, or destruction of data at termination or in the event of provider takeover.

### 3.5 Account and Configuration Controls

- All cloud applications must integrate with Imperion's identity provider (Entra ID).
- At least two individuals are designated as administrators of each cloud service; shared admin credentials are prohibited.
- MFA is enforced on all cloud access; phishing-resistant MFA is required for administrative access.
- Administrative access uses just-in-time elevation (Entra PIM) where supported.

### 3.6 Client Tenant Management

Because Imperion administers client cloud tenants, delegated access is least-privilege, time-bound (GDAP), and fully logged to Sentinel. Client data is logically segregated, and configuration baselines are applied and monitored per client contract.

## 4. Exhibit A — Approved Cloud Service Providers (Imperion Core Stack)

| Vendor | Product / Service | Service Role | Owner |
| --- | --- | --- | --- |
| Microsoft | 365 Business Premium (Exchange, SharePoint, Teams, OneDrive), Entra ID, Intune | Productivity, identity, device management | Cybersecurity / MIS |
| Microsoft | Defender XDR (Endpoint, O365, Identity, Cloud Apps) | Threat protection | Cybersecurity |
| Microsoft | Sentinel (DNS, Entra, Azure logs) | SIEM / SOAR | Cybersecurity |
| Microsoft | Azure (workloads, Key Vault) | Cloud infrastructure | Cybersecurity |
| Kaseya | RMM, patching, backup & recovery, documentation, QBR, phishing simulation | Managed services platform | MIS / SecOps |
| 1Password | Credential & secrets management | Identity / secrets | Cybersecurity |

*Additional approved vendors are maintained in the contract-management system and governed under IM013.*

## 5. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF ID.AM, PR.AA, PR.DS, DE.CM | Cloud asset inventory, access, data protection, monitoring |
| SOC 2 CC6.1/6.6/6.7, CC7.2 | Logical access, boundary/transmission protection, detection |

---

*Electronic approval on file.*
