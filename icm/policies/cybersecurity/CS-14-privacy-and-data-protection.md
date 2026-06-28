# CS-14 — Privacy & Data Protection

> Distinct Cybersecurity policy and part of the **universal baseline** (top umbrella §6): inherited by
> every Operating Procedure, not restated per entry. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program](CS-00-information-security-program.md). Rewritten from the
> legacy `IM019` during the CS re-sort: same privacy principles, controller/processor model, and
> framework mappings, restructured to the canon template and extended with a general agent obligation —
> every agent that touches personal data is bound by privacy rules and the pool principle.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-14` |
| **Title** | Privacy & Data Protection |
| **Category** | Cybersecurity |
| **Tier** | distinct (universal baseline) |
| **Human owner** | Chief Information Security Officer (Mark Connelly); reviewed by Legal / Executive Suite |
| **Governing for (agents)** | **All agents** — any agent that processes personal data is bound; no agent is exempt |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00](CS-00-information-security-program.md) + CS-08 (Data Classification) · CS-16 (Retention & Disposal) · CS-09 (Vendor/Sub-processor) · CS-IR (Incident Response) |

**Framework Alignment:** NIST CSF 2.0 (GV.OC, ID.RA, PR.DS) · NIST Privacy Framework · SOC 2 (P-series / Privacy, C1.1).

---

## 1. Purpose

Govern the responsible collection, use, disclosure, retention, and protection of personal data, and
define how Imperion meets its privacy obligations as both a controller of its own data and a processor
acting on behalf of clients. Because privacy is part of the universal baseline, **every** procedure and
**every** agent inherits these rules; an agent reading this knows it may never repurpose, over-collect,
or cross-boundary-disclose personal data.

## 2. Scope

**Who:** all Imperion workforce members and contractors, and **all agents** without exception — any
actor that processes personal data for Imperion or on behalf of a client. **What:** all personal data
processed by Imperion (its own and client data), the privacy principles and controller/processor
duties, data-subject rights, residency, retention, breach notification, and sub-processor obligations.
The policy binds humans and agents identically except where §5 adds agent-specific guardrails. No
business units are excluded.

## 3. Definitions

- **Personal Data / PII** — information relating to an identified or identifiable individual.
- **Sensitive Personal Data** — categories warranting heightened protection (health, financial,
  biometric, government identifiers).
- **Controller** — the party determining the purposes and means of processing.
- **Processor** — a party processing personal data on behalf of a controller; Imperion typically acts
  as a processor for client data.
- **Data Subject** — the individual to whom personal data relates.

The **pool principle** (correlate internally, never bleed across a client boundary) is defined in the
top umbrella and localized in §5.

## 4. Policy Statements

### 4.1 Privacy principles
1. Personal data is processed per recognized privacy principles: lawfulness and transparency, purpose
   limitation, data minimization, accuracy, storage limitation, integrity and confidentiality, and
   accountability.

### 4.2 Roles — controller vs. processor
2. For Imperion's own data (employees, prospects, vendors), Imperion acts as **controller** and
   processes data for defined business purposes.
3. For client data, Imperion acts as a **processor**, processing personal data only on documented
   client instruction and within the scope of the service agreement and any Data Processing Agreement
   (DPA).

### 4.3 Lawful & limited processing
4. Personal data is collected and used only for legitimate, specified purposes and is not repurposed
   without basis.
5. Data minimization applies — only the personal data necessary for the purpose is processed.
6. Personal data is not entered into AI tools except as permitted by CS-07/CS-19 and the applicable
   classification (CS-08).

### 4.4 Data-subject rights
7. Where applicable law or client agreement grants data-subject rights (access, correction, deletion,
   etc.), Imperion supports the controller in responding within required timeframes.
8. For client data, requests received by Imperion are referred to the client controller unless the
   agreement directs otherwise.

### 4.5 Cross-border & residency
9. Personal data is processed and stored within the United States unless otherwise contractually
   approved, with appropriate safeguards for any cross-border transfer.

### 4.6 Retention & disposal
10. Personal data is retained only as long as necessary for its purpose or as required by law/contract,
    then securely disposed (CS-08, CS-16).

### 4.7 Breach notification
11. Privacy incidents involving personal data are handled under the Technical Incident Response Program
    (CS-IR).
12. Affected controllers (clients), data subjects, and regulators are notified as required by applicable
    law and contract, within mandated timeframes (processor notification no later than 30 days where
    applicable — CS-09).

### 4.8 Vendor & sub-processor privacy
13. Vendors and sub-processors handling personal data are assessed and contractually bound to equivalent
    privacy and security obligations (CS-09), including DPAs where required.

## 5. Application to Autonomous Agents

This section is intentionally **general**: privacy binds every agent, so the obligations below apply to
the whole roster, not a named subset.

- **Agents process personal data under the same privacy rules as humans.** Purpose limitation, data
  minimization, and the lawful-basis requirement bind an agent's reads and writes exactly as they bind
  a human's. An agent does not collect or retain personal data beyond what its task requires.
- **The pool principle is the agent's hard boundary.** An agent may **correlate signals internally
  across the client pool** (security, quality, pattern detection), but client-facing personal data
  **never bleeds across a client boundary**. RLS and `data_class` enforce this structurally; the agent
  must also reason within it. *Correlate, never bleed.*
- **`always_gate` actions (dial-proof floor).** Independent of dial level: **any disclosure of personal
  data across a client/customer/external boundary** is gated (it is both a top-umbrella external send and
  a privacy disclosure), as is processing personal data for any **new purpose** beyond the documented
  instruction, and any **cross-border** transfer.
- **Refusal class.** An agent **refuses** to disclose personal data across a boundary, to enter
  personal data into a disallowed AI service, or to repurpose data without a basis — these are stronger
  than a gate and do not become approvable as the dial climbs.
- **Human-in-loop & easy-button (P3).** Where a personal-data action is gated (e.g., a data-subject
  response or a permitted disclosure), the agent assembles the response and hands the human a
  **one-click** approve, with the lawful basis and recipient already shown.
- **Evidence.** Every personal-data action writes the `agent_run` tracer; no personal data is copied into
  issues, PRs, docs, commits, or eval fixtures (aggregate or redact — the read-only-DB rule).

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| CISO | Own the privacy program; approve cross-border/new-purpose processing; oversee breach notification. |
| Legal / Executive Suite | Maintain DPAs; advise on data-subject rights and regulatory notification. |
| Grace (GRC agent) | Track privacy obligations and DPA coverage; flag gaps; propose changes (no auto-execute). |
| All agents | Process personal data minimally and lawfully; honor the pool boundary; refuse cross-boundary disclosure; log via the tracer. |
| All workforce (human) | Process personal data minimally; never disclose across a boundary; report privacy incidents. |

## 7. Enforcement & Audit

RLS, `data_class`, and the cross-boundary gate enforce structurally; the gauntlet blocks any ungated
disclosure. Adherence is verified by the GRC/audit functions, agent eval goldens that test refusal of
cross-boundary disclosure and repurposing, and the conformance sweep. A violation parks the work and
escalates; repeated or high-severity violations lower the agent's dial or trip the kill-switch.

## 8. Related

**Procedures governed:** universal baseline — every Operating Procedure that touches personal data.
**Related policies:** [CS-08](CS-08-data-classification-and-handling.md) ·
[CS-09](CS-09-vendor-and-third-party-security-risk.md) ·
[CS-16](CS-16-data-retention-and-disposal.md) · [CS-IR](CS-IR-technical-incident-response-program.md).
**ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + ceilings) · ADR-0058 (gauntlet) ·
ADR-0118 (data-class action ceiling) · ADR-NNNN (policy-canon architecture).
