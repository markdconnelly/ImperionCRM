# IM015 — Backup, Data Recovery & Business Continuity Policy

| Field | Value |
| --- | --- |
| **Subject** | IM015 — Backup, Data Recovery & Business Continuity Policy |
| **Category** | Information Security / Operations |
| **Owner** | Director of Cybersecurity |
| **Reviewer** | CISO / Executive Leadership |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL Imperion and Imperion-managed systems and data |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (PR.DS, RC.RP, RC.CO) · SOC 2 (A1.2, A1.3)

---

## 1. Purpose

To ensure that data and systems can be recovered following loss, corruption, ransomware, or disaster, and that business operations can continue or be restored within defined objectives — for both Imperion and its managed clients.

## 2. Definitions

- **RPO (Recovery Point Objective)** — The maximum acceptable data loss measured in time.
- **RTO (Recovery Time Objective)** — The maximum acceptable time to restore a system or service.
- **BCDR** — Business Continuity and Disaster Recovery.
- **Immutable Backup** — A backup that cannot be altered or deleted for a defined retention period, protecting against ransomware and tampering.
- **3-2-1-1-0 Rule** — Three copies of data, on two media types, one off-site, one immutable/offline, with zero recovery errors verified by testing.

## 3. Statement of Policy

### 3.1 Backup Platform and Architecture

- Backup and data recovery are delivered through the **Kaseya** platform across Imperion and managed client estates.
- Backups follow the **3-2-1-1-0** model, including an off-site copy and an **immutable/air-gapped** copy resistant to ransomware.
- Microsoft 365 data (Exchange, SharePoint, OneDrive, Teams) is backed up independently of Microsoft's native retention.

### 3.2 Backup Scope and Frequency

- All systems and data classified Internal or higher (IM012) are backed up.
- Backup frequency is set to meet each system's RPO; mission-critical systems receive more frequent protection.
- RPO and RTO targets are defined per system and, for clients, per contract/SLA, and documented in the BCDR plan.

### 3.3 Encryption and Access

- Backups are encrypted at rest and in transit (IM005).
- Access to backup systems and restore functions is least-privilege, MFA-protected, and logged to Sentinel (IM014).

### 3.4 Restoration Testing

- Restores are tested on a regular, scheduled basis to validate recoverability and verify zero recovery errors.
- Test results are documented; failures are remediated and re-tested.
- Disaster-recovery exercises for mission-critical systems are performed at least annually.

### 3.5 Business Continuity Management

Imperion maintains a Business Continuity Management (BCM) program comprising:

- **Business Continuity (BC)** — Maintaining or resuming operations during an unplanned disruption.
- **Disaster Recovery (DR)** — Recovering IT systems after disruption.
- **Crisis Management (CM)** — Managing response to events threatening the organization, its brand, or stakeholders.

The BCM program is built on a Business Impact Analysis (BIA), Threat and Risk Assessment, and Current State Assessment, and is reviewed and tested at least annually by the CISO or delegate.

### 3.6 Emergency Response and Declaration

- Disaster-declaration criteria are documented. Single or even multiple system failures do not necessarily constitute a disaster.
- When criteria are met, the Crisis Management Team is convened and the Emergency Response and Business Continuity (ERBC) plan is enacted, coordinated with the Technical Incident Response Program.

### 3.7 Ransomware Resilience

- The immutable/air-gapped backup copy is the primary defense enabling recovery without paying ransom.
- Recovery procedures assume potential compromise of production and primary backups and rely on verified-clean restore points.

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF PR.DS-11, RC.RP, RC.CO | Backup, recovery planning, and recovery communications |
| SOC 2 A1.2 / A1.3 | Availability — backup and recovery testing |

---

*Electronic approval on file.*
