# CS-00 — Information Security Program (Cybersecurity umbrella)

> Category umbrella for **Cybersecurity**. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md).
> Supersedes the legacy `Enterprise_Information_Security_Program.md` (folded here during the
> CS re-sort). Establishes how Imperion protects its own and its clients' information —
> binding **humans and agents alike** — and lists the distinct Cybersecurity policies.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-00` (category umbrella) |
| **Title** | Information Security Program |
| **Category** | Cybersecurity |
| **Tier** | umbrella |
| **Human owner** | Chief Information Security Officer (Mark Connelly) |
| **Governing for (agents)** | Roman (Deputy CISO), Cyrus (SOC), Grace (GRC), Osiris (IAM), Phoenix (BCDR) — and all agents for the baseline controls |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |

**Framework Alignment:** NIST CSF 2.0 · AICPA SOC 2 (Security, Availability, Confidentiality) ·
NIST AI RMF.

---

## 1. Purpose
Imperion is entrusted with the confidentiality, integrity, and availability of its own and its
clients' information. This program is the governance model under which all Cybersecurity
policies operate, committing every actor — human and agent — to Zero Trust, least privilege,
phishing-resistant identity, and continuous monitoring across people, process, and technology.

## 2. Scope
All Imperion entities, employees, contractors, agents, and systems, and every Operating
Procedure with a security-relevant step. Stream 07 (Protect → Assure) is the security spine;
security baseline controls (identity, data classification, logging) bind **all** streams.

## 3. Distinct policies in this category
| ID | Title |
| --- | --- |
| CS-01 | Information Security Strategy |
| CS-02 | Identity & Access Management |
| CS-03 | Remote Access & Multi-Factor Authentication |
| CS-04 | Encryption |
| CS-05 | Risk Management & Analysis |
| CS-06 | Cloud Security |
| CS-07 | AI Governance & Secure Deployment |
| CS-08 | Data Classification & Handling |
| CS-09 | Vendor & Third-Party Security Risk |
| CS-10 | Logging, Monitoring & SIEM |
| CS-11 | Email Security & Anti-Phishing |
| CS-12 | Security Awareness & Training |
| CS-13 | Network Security |
| CS-14 | Privacy & Data Protection |
| CS-15 | Physical & Environmental Security |
| CS-16 | Data Retention & Disposal |
| CS-17 | Audit & Compliance Management |
| CS-18 | Client Shared Responsibility |
| CS-19 | Acceptable Use |
| CS-20 | Personnel Security |
| CS-IR | Technical Incident Response Program |

## 4. Application to autonomous agents (category-wide)
- **Security agents** (Cyrus L4, Phoenix L3, Osiris L3) may auto-execute **reversible** actions
  under a runbook with an undo window; **destructive, identity, domain-controller, backup, and
  client-facing** actions are `always_gate` at every dial level.
- **Audit/governance agents** (Grace, Roman, Vera) are **audit-and-recommend**: they detect,
  evidence, and propose; corrective config/standard changes are `always_gate`.
- **Posture is measure-only.** Security Posture Management (Cyrus) measures and reports; Vera
  owns the Client Security Standard; Celeste presents; humans + Datto remediate.
- All agents apply the baseline controls (identity, data classification, logging, the pool
  principle) to every action regardless of category.

## 5. Enforcement & audit
The gauntlet + RLS/data-class enforce structurally; the SOC, GRC, and audit functions verify;
the [coverage-matrix](../coverage-matrix.md) proves every security-relevant procedure is bound.

## 6. Related
**Top umbrella:** [Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md).
**Procedures:** Stream 07 (Protect → Assure) + security baseline across all streams.
**ADRs:** ADR-0128/0109/0058/0118/0129.
