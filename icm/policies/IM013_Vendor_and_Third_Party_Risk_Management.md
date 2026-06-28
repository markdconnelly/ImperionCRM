# IM013 — Vendor & Third-Party Risk Management Policy

| Field | Value |
| --- | --- |
| **Subject** | IM013 — Vendor & Third-Party Risk Management Policy |
| **Category** | Information Security |
| **Owner** | CISO |
| **Reviewer** | Legal / Executive Leadership |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL third parties that access, store, process, or transmit Imperion or client data or connect to managed networks |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (GV.SC, ID.RA-10) · SOC 2 (CC9.2)

---

## 1. Purpose

To manage the security risk introduced by vendors, suppliers, sub-processors, and other third parties — including the cloud and AI providers in Imperion's own supply chain — across the relationship lifecycle.

## 2. Definitions

- **Third Party / Vendor** — Any external entity providing products or services that involve access to, or processing of, Imperion or client data, or connectivity to managed environments.
- **Sub-processor** — A third party engaged by a vendor that also processes data.
- **Due Diligence** — The pre-engagement assessment of a vendor's security posture.
- **Supply-Chain Risk** — Risk arising from dependencies on third-party products, services, and their own suppliers.

## 3. Statement of Policy

### 3.1 Pre-Engagement Due Diligence

Before any third party is granted access to data or networks:

- A security risk assessment is completed proportional to the data sensitivity and access level.
- Evidence of the vendor's security posture is reviewed — e.g., **SOC 2 Type II report**, ISO 27001 certification, security questionnaire responses, penetration-test summaries, and documented policies.
- For vendors processing Restricted/Confidential data (IM012), data residency, sub-processor disclosure, breach-notification commitments, and (for AI vendors) model-training and data-use terms are confirmed.
- No cloud or AI service is initiated without Legal notification and contract review (IM009, IM011).

### 3.2 Contractual Requirements

Agreements with third parties must address:

- Defined scope of services and the security control obligations of the vendor.
- Liability, confidentiality, and data-ownership terms (data owned by Imperion/client; maintained and securely returned or destroyed at termination).
- **Breach notification without unreasonable delay, and no later than 30 days** (shorter where law/contract requires).
- Right to audit or to receive periodic assurance (e.g., annual SOC 2).
- Sub-processor controls and flow-down of security obligations.
- US data processing/storage unless otherwise contractually approved.

### 3.3 Connectivity and Access Controls

- Third-party access requires VPN/ZTNA plus MFA and is time-limited to the engagement (IM004).
- Vendor systems connecting to managed networks must meet Imperion's minimum endpoint security baseline.
- Generic/shared accounts for third parties are prohibited; access is least-privilege and logged to Sentinel (IM014).

### 3.4 Ongoing Monitoring and Reassessment

- Critical vendors are reassessed at least annually; assurance artifacts (SOC 2, certifications) are refreshed and reviewed.
- Vendor security incidents affecting Imperion or clients are handled under the Technical Incident Response Program.
- The approved-vendor list (IM009 Exhibit A) is maintained and reviewed.

### 3.5 Offboarding

At engagement end, access is revoked, data is returned or securely destroyed per contract, and removal is documented (IM007).

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF GV.SC-01–10, ID.RA-10 | Supply-chain risk governance and assessment |
| SOC 2 CC9.2 | Vendor and business-partner risk management |

---

*Electronic approval on file.*
