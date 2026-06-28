# Imperion — Information Security Policy Set (2026)

**Internal master set.** Modernized from the legacy client policies, rebuilt for Imperion as a managed service provider. Aligned to **NIST CSF 2.0**, **AICPA SOC 2** Trust Services Criteria, and the **NIST AI Risk Management Framework**.

> These are internal master policies. Adapt per-client versions from these as needed. Placeholders (owner names, dates, contact details) are marked `_________` for you to complete.

## Technology Stack Represented

- Microsoft 365 Business Premium · Entra ID · Intune
- Microsoft Azure (DNS, Entra, Sentinel logs; Key Vault)
- Microsoft Sentinel (SIEM) integrated with Defender XDR
- Always-on MFA; phishing-resistant authentication
- Kaseya (RMM/patching, backup & recovery, documentation, QBR, phishing simulation)
- 1Password (credential & secrets management)
- AI: Microsoft 365 Copilot and client AI deployments
- Environment: hybrid — small office with limited on-prem, mostly cloud

## Document Index

### Program-Level
| File | Purpose |
| --- | --- |
| `Enterprise_Information_Security_Program.md` | Umbrella program tying all policies together |
| `Technical_Incident_Response_Program.md` | Full IR lifecycle (scrubbed and modernized) |

### Core Policies (original set, modernized)
| # | Title |
| --- | --- |
| IM001 | Information Security Strategy |
| IM002 | Patch & Vulnerability Management |
| IM003 | Information System Ownership & Access Management |
| IM004 | Remote Access & MFA |
| IM005 | Encryption |
| IM006 | Risk Management & Analysis |
| IM007 | Network Access Termination |
| IM008 | User Account Management |
| IM009 | Cloud Security |

### New Policies (gaps closed)
| # | Title | Why added |
| --- | --- | --- |
| IM010 | Acceptable Use & AI Acceptable Use | Workforce + AI use |
| IM011 | AI Governance & Secure Deployment | AI systems/deployment (centerpiece) |
| IM012 | Data Classification & Handling | SOC 2 foundation |
| IM013 | Vendor & Third-Party Risk Management | Supply chain |
| IM014 | Logging, Monitoring & SIEM | Sentinel/Defender XDR |
| IM015 | Backup, Data Recovery & Business Continuity | Kaseya BCDR |
| IM016 | Change & Configuration Management | SOC 2 CC8.1 |
| IM017 | Human Resources & Personnel Security | Screening, onboarding, sanctions |
| IM018 | Physical & Environmental Security | Hybrid office/on-prem |
| IM019 | Privacy & Data Protection | Personal data, processor role |
| IM020 | Mobile Device, BYOD & Endpoint Baseline | Intune/device posture |
| IM021 | Email Security & Anti-Phishing | Defender O365, DMARC, simulation |
| IM022 | Security Awareness & Training | Standalone awareness program |
| IM023 | Network Security | Firewall, segmentation, wireless |
| IM024 | Data Retention & Disposal | Retention schedule, SP 800-88 |
| IM025 | Audit & Compliance Management | SOC 2 audit cycle, evidence |
| IM026 | Client Shared Responsibility Policy & Matrix | MSP CUECs — critical for client versions |

**Total: 26 IM-series policies + Enterprise Program + Technical Incident Response Program = 28 documents.**

## What Changed From the Legacy Set

- **Re-platformed** from Fortinet/Carbon Black/Proofpoint to the current Microsoft + Kaseya + 1Password stack.
- **Removed cross-contamination** — the legacy Incident Response Program still referenced "Imperion Technology Solutions" mixed with "Pavlov Media"; the new version is cleanly Imperion's.
- **Added 17 new policies** the original set lacked (IM010–IM026).
- **Modernized controls**: Zero Trust, phishing-resistant MFA, Entra PIM, tightened inactivity thresholds (120→90 days), modern password guidance, immutable backups.
- **Framework mapping** added to every policy (NIST CSF 2.0 / SOC 2 / AI RMF).

## Suggested Next Steps

1. Fill placeholders (owners, dates, CERT contacts).
2. Have Legal review contract-provision and privacy/processor language (IM009, IM013, IM019, IM026).
3. Run the IM011 permissions/oversharing remediation before enabling Copilot broadly.
4. Finalize the IM024 retention schedule with specific periods.
5. Build per-client deployable versions from these masters — IM026 is your starting point for client-vs-Imperion boundaries.
