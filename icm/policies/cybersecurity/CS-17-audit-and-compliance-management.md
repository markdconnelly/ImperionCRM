# CS-17 — Audit & Compliance Management

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program](CS-00-information-security-program.md). Rewritten from
> the legacy `IM025 — Audit & Compliance Management Policy`; substance and framework mappings
> preserved, restructured to the dual-audience template.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-17` |
| **Title** | Audit & Compliance Management |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly); reviewed by Executive Leadership |
| **Governing for (agents)** | Grace (GRC), Roman (Deputy CISO), Vera (audit/conformance) — and all agents as control operators producing evidence |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00](CS-00-information-security-program.md) + CS-10 (Logging, Monitoring & SIEM) · CS-05 (Risk Management) |

**Framework Alignment:** NIST CSF 2.0 (GV.OC, GV.OV, ID.IM) · AICPA SOC 2 (CC4.1, CC4.2, CC2.2).

---

## 1. Purpose

To define how Imperion maintains, evidences, and demonstrates compliance with its security
program, the frameworks it aligns to (NIST CSF 2.0, SOC 2), and its contractual/regulatory
obligations — through structured audit, control ownership, and corrective action. It is how a
human or an agent can prove a control actually operated, not just that it was written down.

## 2. Scope

**Who:** all Imperion employees, contractors, and AI agents that own, operate, or evidence a
control — and the audit and governance agents that assess them. **What:** framework alignment,
the control matrix, control ownership and evidence, internal self-assessment, external (SOC 2)
audit support, findings and corrective action, continuous-monitoring linkage, regulatory/
contractual tracking, and oversight reporting. Every security-relevant Operating Procedure
produces evidence under this policy. Binds humans and agents identically except where §5
narrows or gates an agent's authority.

## 3. Definitions

- **Control Owner** — the actor accountable for a control's operation and for retaining its
  evidence (a human, or an agent under its human pairing).
- **Evidence** — records demonstrating that a control operated as intended.
- **Audit** — an independent assessment of control design and operating effectiveness.
- **Finding** — a deficiency or gap identified through audit or monitoring.

## 4. Policy Statements

1. **Framework alignment.** The security program is mapped to NIST CSF 2.0 and the SOC 2 Trust
   Services Criteria; each control objective is owned and evidenced.
2. **Control matrix.** A control matrix maps policies (the CS/IT/BO canon) to framework
   requirements and control owners, maintained by Information Security. This is the
   policy-canon analogue of the [coverage-matrix](../coverage-matrix.md).
3. **Ownership and evidence.** Each control has an assigned owner responsible for its operation
   and for retaining evidence. Evidence is collected on a defined cadence and stored
   tamper-resistant and access-controlled.
4. **Internal self-assessment.** Control self-assessments run on a defined schedule to verify
   controls operate effectively; results are documented and deficiencies become tracked findings.
5. **External audit (SOC 2).** Imperion supports independent SOC 2 examination — coordinating
   evidence, auditor access, and remediation. Scope, period, and Trust Services Criteria are
   agreed with the auditor.
6. **Findings and corrective action.** Findings are risk-rated (CS-05), assigned an owner, and
   tracked to closure with target dates; material findings are reported to executive leadership.
7. **Continuous-monitoring linkage.** Compliance status draws on continuous monitoring (CS-10);
   exceptions detected through monitoring are recorded as incidents (CS-IR) with a documented
   risk assessment.
8. **Regulatory and contractual tracking.** Applicable laws, regulations, and client
   contractual obligations are tracked; changes are assessed for program impact with Legal.
9. **Reporting and oversight.** Compliance posture, audit results, and remediation status are
   reported to executive leadership at least annually, and more frequently for material matters.

## 5. Application to Autonomous Agents

For audit and compliance actions, agents operate under the autonomy framework defined once in
the top umbrella (§4):

- **Autonomy ceiling.** The audit/governance agents (Grace, Roman, Vera) are
  **audit-and-recommend** — capped at **L0–L1**: they observe controls, collect and evidence
  control operation, run conformance sweeps, detect findings, and **propose** corrective action.
  They do not change controls, standards, or configurations themselves.
- **`always_gate` actions (dial-proof floor).** Any **corrective config or standard change**, any
  **change to the control matrix or a control's design**, any **representation to an external
  auditor**, and any **report to a regulator or client** require a human decision at every dial
  level. Anything touching the compliance posture surfaced externally is human-gated, forever.
- **Human-in-loop & easy-button.** As the dial climbs, routine evidence collection and finding
  detection run with less human attention, but every corrective and external-facing step stays
  gated. At each gate the agent hands the human a one-click resolution — the finding, its
  risk rating, the proposed remediation, and the evidence package — ready to approve.
- **Escalation & refusal.** An agent must escalate material findings to the human owner and must
  **refuse** to alter, backdate, or fabricate evidence — a refusal class stronger than a gate
  (honesty / no-fabrication, top umbrella §5). An agent never asserts a control passed without
  the evidence behind it.
- **Evidence.** Audit actions are themselves evidenced: every assessment, finding, and proposal
  writes the `agent_run` / `agent_message` ledger, so the audit trail is itself auditable.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| CISO (human owner) | Owns the program; approves control changes, auditor representations, and external reports. |
| Executive Leadership (human) | Receives oversight reporting; accepts residual risk on material findings. |
| Grace — GRC (agent) | Maintains the control matrix; collects evidence; detects findings; proposes remediation. |
| Roman — Deputy CISO (agent) | Reviews findings and risk ratings; routes corrective changes to the human gate. |
| Vera — audit/conformance (agent) | Runs conformance sweeps and self-assessments; evidences control operation. |
| Control owners (human + agent) | Operate assigned controls and retain their evidence on cadence. |

## 7. Enforcement & Audit

This policy is the enforcement-and-audit backbone for the whole canon: adherence is verified by
the GRC and conformance functions, the eval goldens, and the audit sweep, with the control
matrix and the [coverage-matrix](../coverage-matrix.md) proving every control and procedure is
owned and bound. Fabricating or withholding evidence, or shipping a corrective change without the
human gate, is a high-severity violation that parks the work, escalates to the CISO, and lowers
the responsible agent's dial or trips the kill-switch.

## 8. Related

**Procedures governed:** evidence-collection, self-assessment, audit-support, and
finding-remediation steps (catalog links). **Related policies:**
[CS-00](CS-00-information-security-program.md) · CS-05 (Risk Management) · CS-10 (Logging,
Monitoring & SIEM) · [CS-16](CS-16-data-retention-and-disposal.md) · CS-IR (Incident Response) ·
[CS-18](CS-18-client-shared-responsibility.md). **ADRs:** ADR-0128 (autonomy ladder) ·
ADR-0109 (dial + ceilings) · ADR-0058 (gauntlet) · ADR-0087 (orchestration/observability ledger) ·
ADR-0134 (policy-canon architecture).
