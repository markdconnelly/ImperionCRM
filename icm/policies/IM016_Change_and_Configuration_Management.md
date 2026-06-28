# IM016 — Change & Configuration Management Policy

| Field | Value |
| --- | --- |
| **Subject** | IM016 — Change & Configuration Management Policy |
| **Category** | Information Security / Information Technology |
| **Owner** | Director of Cybersecurity |
| **Reviewer** | CISO |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL changes to Imperion and Imperion-managed systems, configurations, applications, and automations |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (PR.PS-01, ID.IM, GV.SC) · SOC 2 (CC8.1)

---

## 1. Purpose

To ensure that changes to information systems — Imperion's own and those of managed clients — are requested, assessed, tested, approved, implemented, and documented in a controlled manner that preserves security, stability, and availability.

## 2. Definitions

- **Change** — Any addition, modification, or removal affecting a system, configuration, application, integration, automation, or security control.
- **Standard Change** — A pre-approved, low-risk, repeatable change (e.g., routine patch deployment) executed under an established procedure.
- **Normal Change** — A change requiring assessment and approval before implementation.
- **Emergency Change** — A change required to restore service or remediate an active threat, approved on an expedited basis.
- **Configuration Baseline** — The approved, secure configuration state of a system against which drift is measured.

## 3. Statement of Policy

### 3.1 Change Request and Authorization

- All normal and emergency changes are logged in the change-management system (Kaseya / ticketing) with a description, justification, affected systems, risk assessment, rollback plan, and requester.
- Changes are reviewed and approved by an authorized approver appropriate to the risk and the affected environment before implementation.
- Changes to client environments additionally follow the client's contractual change requirements and notification expectations.

### 3.2 Risk Assessment and Testing

- Each change is assessed for security, availability, and downstream impact (IM006).
- Where feasible, changes are tested in a non-production or pilot ring before broad deployment (consistent with the patch rotation in IM002).
- Changes affecting security controls, identity, or data protection receive Cybersecurity review.

### 3.3 Segregation of Duties

- Wherever practical, the individual who develops or requests a change is not the sole approver. Approval authority is defined by role.

### 3.4 Implementation, Rollback, and Verification

- Approved changes are implemented within an agreed maintenance window where applicable.
- A documented rollback plan exists for normal and emergency changes.
- Successful implementation is verified, and the change record is closed with outcome notes.

### 3.5 Emergency Changes

- Emergency changes may be implemented before full approval to restore service or contain a threat, but must be documented and retroactively reviewed and approved within a defined period (e.g., the next business day).

### 3.6 Configuration Management and Baselines

- Secure configuration baselines (CIS Benchmarks, Microsoft Secure Score, Defender/Intune baselines) are defined and applied.
- Configuration drift is monitored continuously; unauthorized changes are investigated as potential incidents (IM014).

### 3.7 Infrastructure-as-Code and Automation

- Automations, scripts, and infrastructure-as-code that modify systems are version-controlled, reviewed, and treated as changes under this policy.
- AI-assisted or AI-generated changes are reviewed by a human before deployment (IM010/IM011).

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF PR.PS-01, ID.IM | Configuration and change management, improvement |
| SOC 2 CC8.1 | Change management lifecycle |

---

*Electronic approval on file.*
