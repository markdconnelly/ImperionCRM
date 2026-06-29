# IT-00 — IT Operations Program (Information Technology umbrella)

> Category umbrella for **Information Technology**. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md).
> Governs how Imperion delivers and operates IT services for itself and its clients — binding
> **humans and agents alike** — and lists the distinct IT policies.

| Field | Value |
| --- | --- |
| **Policy ID** | `IT-00` (category umbrella) |
| **Title** | IT Operations Program |
| **Category** | Information Technology |
| **Tier** | umbrella |
| **Human owner** | Chief Technology Officer (Derek / Mark; chief architect Luke) |
| **Governing for (agents)** | Felix (Service), Ozzie (NOC), Sage (L3/Problem), Marshall (Change/Release), Scout (Dispatch), Pierce (Projects), Osiris (Account lifecycle), Alivia (Documentation) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |

**Framework Alignment:** NIST CSF 2.0 (Protect, Detect, Respond, Recover) · SOC 2 (CC7
Operations, CC8 Change, A1 Availability) · ITIL service-management practices.

---

## 1. Purpose
This program governs the operational delivery of IT services — support, incidents, problems,
changes, provisioning, monitoring, backup/recovery, endpoints, and documentation — for
Imperion and every managed client. It binds human technicians and IT agents to consistent,
auditable, least-privilege operations that keep services available and changes controlled.

## 2. Scope
All IT delivery actors (human and agent) and the Operating Procedures in Streams 03 (Sold →
Live), 04 (Request → Fulfil), 05 (Event → Resolution), and 06 (Change → Release), plus the IT
operational steps elsewhere. Security controls remain governed by the Cybersecurity category;
this category governs operational delivery.

## 3. Distinct policies in this category
| ID | Title |
| --- | --- |
| IT-01 | Service Delivery & SLA Management |
| IT-02 | Change & Configuration Management |
| IT-03 | Patch & Vulnerability Management |
| IT-04 | Monitoring & Event Management (NOC) |
| IT-05 | Incident & Problem Management |
| IT-06 | Backup, Recovery & Business Continuity |
| IT-07 | Endpoint & Device Baseline (BYOD / Intune) |
| IT-08 | Account & Access Lifecycle (Joiner-Mover-Leaver) |
| IT-09 | Network Operations & Access Termination |
| IT-10 | Provisioning, Asset & CMDB Management |
| IT-11 | Documentation & Knowledge Management (IT Glue) |

## 4. Application to autonomous agents (category-wide)
- **Reversible operations under runbook** auto-execute at the agent's ceiling (Ozzie/Felix L4
  with an undo window); **remediation that changes production, identity, or backups** is
  `always_gate`.
- **Change is governed, not executed by one agent.** Marshall (L2) intakes, risk-classifies,
  and **parks at the approval gate**; the owning technical agent executes the approved change
  under its own ceiling. Production changes in a freeze window are `always_gate`.
- **SLA ownership** sits with Celeste (Client Success); Felix/Scout do mechanical assignment.
- **Provisioning is least-privilege and contract-gated** (Pierce L4 + undo, contract-signed).
- **Documentation SoR is IT Glue**, synced by Alivia; agents author runbooks as projections,
  never competing sources.

## 5. Enforcement & audit
Change/config control + the gauntlet enforce structurally; the QA function (Tess) and audit
(Grace/Vera) verify; the [coverage-matrix](../coverage-matrix.md) proves binding.

## 6. Related
**Top umbrella:** [Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md).
**Procedures:** Streams 03–06. **ADRs:** ADR-0128/0109/0058; ADR-0079 (problem/change); ADR-0078 (CMDB).
