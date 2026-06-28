# Imperion — Enterprise Information Security Program

| Field | Value |
| --- | --- |
| **Document** | Enterprise Information Security Program |
| **Category** | Information Security — Governance (Umbrella) |
| **Owner** | CISO |
| **Reviewer** | Executive Leadership |
| **Version** | 2.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

**Framework Alignment:** NIST Cybersecurity Framework 2.0 · AICPA SOC 2 Trust Services Criteria · NIST AI RMF

---

## 1. Program Overview

### 1.1 Scope

The Enterprise Information Security Program defines the control objectives, policies, and processes that manage the people, processes, and technologies needed to protect the confidentiality, integrity, and availability of sensitive information. It applies to all Imperion employees, contractors, systems, and property, and extends to the client environments Imperion manages.

### 1.2 Objectives

Information exists in many forms — electronic, printed, transmitted, and spoken. Whatever its form, Imperion protects it through due care:

- **Confidentiality** — Restrict disclosure to those with a need and right to access.
- **Integrity** — Prevent unauthorized or improper modification of systems and information.
- **Availability** — Avoid disruption to services and productivity.

The program provides reasonable, appropriate safeguards to protect information assets from unauthorized access, modification, destruction, or disclosure, and to maintain continuous compliance with contractual and regulatory requirements. Each control objective has a defined requirement and a corresponding statement of how Imperion satisfies it through the IM-series policies.

### 1.3 Ownership

The program is owned by the **CISO** and reviewed and revised at least annually. Senior management and stakeholders own business initiatives requiring security controls. Each department is responsible for compliance with the standards in this program and its supporting policies.

| Business Unit | Responsibilities |
| --- | --- |
| Legal | Enforcement of applicable laws; contract and regulatory review |
| Information Security | Defines security strategy; creates and maintains policies; maintains the documented program; audit and monitoring |
| Cybersecurity | Architects and operates technical solutions meeting requirements; first responder |
| Executive Leadership | Owns business initiatives; risk-treatment decisions; program approval |

## 2. Governing Policies (IM Series)

The program is implemented through the following 26 policies plus the Technical Incident Response Program, each reviewed at least annually (IM011 semi-annually):

| Policy | Title |
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
| IM010 | Acceptable Use & AI Acceptable Use |
| IM011 | AI Governance & Secure Deployment |
| IM012 | Data Classification & Handling |
| IM013 | Vendor & Third-Party Risk Management |
| IM014 | Logging, Monitoring & SIEM |
| IM015 | Backup, Data Recovery & Business Continuity |
| IM016 | Change & Configuration Management |
| IM017 | Human Resources & Personnel Security |
| IM018 | Physical & Environmental Security |
| IM019 | Privacy & Data Protection |
| IM020 | Mobile Device, BYOD & Endpoint Baseline |
| IM021 | Email Security & Anti-Phishing |
| IM022 | Security Awareness & Training |
| IM023 | Network Security |
| IM024 | Data Retention & Disposal |
| IM025 | Audit & Compliance Management |
| IM026 | Client Shared Responsibility Policy & Matrix |
| — | Technical Incident Response Program |

Policies are stored in Imperion's documentation system and reviewed by the CISO. Material changes route to the CISO for review.

## 3. Technology Stack Reference

The program is implemented on Imperion's standardized stack:

- **Microsoft 365 Business Premium** — productivity, identity (Entra ID), device management (Intune).
- **Microsoft Azure** — workloads; DNS, Entra, and Sentinel logging; Key Vault.
- **Microsoft Sentinel** — SIEM/SOAR, **integrated with Microsoft Defender XDR**.
- **Always-on MFA** with **phishing-resistant authentication** strongly recommended and enforced for privileged access.
- **Kaseya** — remote endpoint patching/management, backup and data recovery, documentation, quarterly business reviews, and phishing-simulation testing.
- **1Password** — credential and secrets management across all clients.
- **AI** — Microsoft 365 Copilot and client AI deployments governed under IM010/IM011.

## 4. Risk Management

Imperion operates a proactive risk-management program (IM006). The CISO reports identified risks and recommended controls to senior management at least annually, with High or greater risks escalated immediately. The lifecycle: assess (at least annually enterprise-wide, plus project/incident-driven) → communicate to owners → record in the risk profile → assign owner and treatment → implement and monitor controls → identify emerging risk.

An annual risk assessment using **NIST CSF 2.0** addresses, at minimum: information protection, endpoint protection, portable media, mobile devices, wireless, configuration management, vulnerability management, network and transmission protection, authentication, access control, audit logging and monitoring, training and awareness, business continuity and disaster recovery, risk management, physical and environmental security, data protection and privacy, and AI governance.

## 5. Employee Awareness

- **New-employee orientation** includes security and privacy training.
- **Quarterly security reminders** are issued by the CISO, themed to current threats.
- **Annual testing** validates workforce understanding via web-based training and assessment.
- **Phishing-simulation testing** is conducted via Kaseya, with targeted follow-up training.

## 6. Personnel and Physical Security

Facility access uses least-privilege badge controls; invalid-access and inactive-badge reports are reviewed; investigations may use camera recordings available to Information Security.

## 7. IT System Security

- **Data classification** (IM012) assigns the highest sensitivity to Restricted/Confidential data; Purview labels enforce it.
- **Logical access** profiles grant least privilege by role (IM003/IM008).
- **Systems access** requires unique IDs, strong credentials, and MFA, with phishing-resistant MFA for privileged and remote access.
- **Systems maintenance** enforces scheduled patching; end-of-life systems are decommissioned promptly (IM002).
- **Transmission and storage** require approved encryption (IM005); email DLP scans outbound sensitive data.

## 8. Vulnerability Assessment

External scans at least monthly; internal scans at least monthly; annual penetration testing of external applications; annual wireless and firewall-rule reviews. Perimeter firewalls default-DENY. Results reported to the CISO (IM002/IM014).

## 9. Business Continuity

A maintained, annually reviewed and tested Emergency Response and Business Continuity (ERBC) plan covers disaster declaration, off-site restoration, continuity for the workforce, and return to normal operations, built on BC, DR, and CM components (IM015).

## 10. Incident Response

Imperion maintains the **Technical Incident Response Program** to prepare, identify, contain, eradicate, recover, and follow up on incidents. It initiates the ERBC process where required and is integrated with SIEM monitoring (IM014). All incidents are documented and reported to the CISO.

## 11. Ongoing Auditing and Monitoring

Information Security follows a documented monitoring schedule covering perimeter/firewall activity, IDS alerts, user and identity activity, identity-risk events, account-termination timeliness, application/database account activity, building-access anomalies, outbound DLP, inbound spam thresholds, AI system activity, DR test review, and vulnerability scanning. Exceptions are recorded as incidents with a documented risk assessment. Results are reported to the CISO at least annually.

## 12. Program Adjustment

This program is a living framework, reviewed by the CISO as needed and at least annually to adapt to organizational, regulatory, and threat-landscape changes — including the rapid evolution of AI.

## Appendix A — Qualitative Risk Determination Framework

### Table 1 — Likelihood

| Level | Definition |
| --- | --- |
| Almost Certain | Threat source highly motivated and capable, AND controls ineffective or absent |
| Likely | Highly motivated and capable, OR controls present but with gaps |
| Possible | Motivated and capable, but controls may impede success |
| Unlikely | Lacks motivation or capability, OR controls significantly impede |
| Rare | Lacks motivation or capability, AND controls significantly impede |

### Table 2 — Magnitude of Impact

| Level | Definition (summary) |
| --- | --- |
| Severe | Major loss of sensitive information imminent; on-site recovery impossible, disaster must be declared; national reputational damage |
| Major | Loss of sensitive information expected; multiple critical systems affected, disaster may be declared; local reputational damage |
| Moderate | Loss of sensitive information not expected; multiple systems affected but repairable without disaster; possible local reputational impact |
| Minor | Loss of sensitive information not expected; limited impact, repairable without disaster |
| Insignificant | Loss of sensitive information not possible; single-network reconnaissance only; no expected reputational damage |

### Table 3 — Risk Determination and Authority

| Risk Level | Action / Authorized Decision Maker |
| --- | --- |
| Critical | Immediate countermeasures; do not operate/implement until mitigation in place; notify leadership and Information Security immediately; **Decision: VP/CEO**; initiate IR for active exploits |
| High | Strong need; may operate with mitigation plan in 10 days; notify immediately; **Decision: CISO**; document for leadership |
| Elevated | Mitigation plan within 15 days; notify SecOps; **Decision: CISO**; IR team on standby |
| Medium | Mitigation via support request, standard workflow |
| Low | May be acceptable; mitigate via support request if pursued |

## Appendix B — Associated Policies

All IM-series policies (IM001–IM015) and the Technical Incident Response Program, as listed in §2.

## Document History

| Version | Change | Date | Detail |
| --- | --- | --- | --- |
| V2.0 | Modernized | _________ | Rebuilt for Imperion MSP; aligned to NIST CSF 2.0, SOC 2, and NIST AI RMF; added AI governance, data classification, vendor risk, SIEM, and BCDR policies |

### Approved By

| Version | Approved By | Date |
| --- | --- | --- |
| V2.0 | _________ (CISO) | _________ |

---

*Electronic approval on file.*
