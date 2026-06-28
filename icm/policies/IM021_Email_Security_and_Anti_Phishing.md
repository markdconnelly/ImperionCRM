# IM021 — Email Security & Anti-Phishing Policy

| Field | Value |
| --- | --- |
| **Subject** | IM021 — Email Security & Anti-Phishing Policy |
| **Category** | Information Security |
| **Owner** | Director of Cybersecurity |
| **Reviewer** | CISO |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL Imperion and Imperion-managed email systems and users |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (PR.DS, DE.CM, PR.AT) · SOC 2 (CC6.7, CC6.8, CC7.2)

---

## 1. Purpose

To protect against email-borne threats — phishing, business email compromise (BEC), malware, and data leakage — and to define acceptable email use and the controls protecting Imperion and client mail.

## 2. Definitions

- **Phishing** — Fraudulent messages designed to steal credentials, deliver malware, or induce harmful action.
- **Business Email Compromise (BEC)** — Targeted fraud impersonating trusted parties to induce payments or data disclosure.
- **Email Authentication** — SPF, DKIM, and DMARC mechanisms that validate sender legitimacy.

## 3. Statement of Policy

### 3.1 Technical Controls

- Email is protected by **Microsoft Defender for Office 365** (anti-phishing, Safe Links, Safe Attachments, anti-malware).
- **SPF, DKIM, and DMARC** are configured and enforced on Imperion and managed-client domains, with DMARC moving toward an enforcement (reject/quarantine) policy.
- Inbound mail is filtered for spam, malware, and impersonation; outbound mail is subject to DLP for sensitive information (IM012).
- External-sender warnings and impersonation protection are enabled.

### 3.2 Email Encryption and Sensitive Data

- Email containing Restricted or Confidential information uses message encryption; sending sensitive information to personal accounts is prohibited (IM009/IM012).

### 3.3 Acceptable Use

- Email is for legitimate business purposes; misuse (harassment, unlawful content, unauthorized data disclosure) is prohibited (IM010).
- Auto-forwarding of company mail to external addresses is disabled by default and permitted only by exception with approval.

### 3.4 Phishing Simulation and Awareness

- Imperion conducts **phishing-simulation testing via Kaseya** on a recurring basis for itself and managed clients.
- Results drive targeted training; repeat susceptibility triggers additional coaching.
- Workforce members are trained to recognize and report suspicious messages.

### 3.5 Reporting and Response

- Users report suspected phishing using the designated report mechanism (e.g., the report-message button).
- Reported and detected threats are investigated; confirmed malicious mail is remediated tenant-wide (automated investigation and response), and significant events are escalated to incident response (Technical Incident Response Program).

### 3.6 Monitoring

- Email threat detections and DLP events are forwarded to **Microsoft Sentinel** for correlation and alerting (IM014).

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF PR.DS, DE.CM, PR.AT | Email protection, detection, awareness |
| SOC 2 CC6.7 / CC6.8 / CC7.2 | Transmission protection, malware prevention, detection |

---

*Electronic approval on file.*
