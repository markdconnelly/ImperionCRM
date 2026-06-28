# CS-08 — Data Classification & Handling

> Distinct Cybersecurity policy and part of the **universal baseline** every Imperion agent
> inherits. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program](CS-00-information-security-program.md). Rewritten from the
> legacy `IM012 Data Classification & Handling Policy` to the dual-audience canon. The
> classification scheme here is the foundation other controls (encryption, access, DLP, AI data
> protection) build on, and it defines the data classes every agent reads and acts on. Governance
> terms (`always_gate`, `data_class`, the dial) are defined once in the top umbrella and localized
> here.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-08` |
| **Title** | Data Classification & Handling |
| **Category** | Cybersecurity |
| **Tier** | distinct (universal baseline) |
| **Human owner** | Chief Information Security Officer (Mark Connelly) |
| **Governing for (agents)** | ALL agents — every agent reads and acts on classified data |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00 Information Security Program](CS-00-information-security-program.md) |

**Framework Alignment:** NIST CSF 2.0 (ID.AM-05, PR.DS) · SOC 2 (CC6.1, C1.1, C1.2).

---

## 1. Purpose

To establish one consistent scheme for classifying data by sensitivity and to define how each
class is handled, stored, transmitted, retained, and disposed. Classification is the foundation for
encryption (CS-04), access control (CS-02), DLP, and AI data protection (CS-07), and it defines the
`data_class` axis the agent access spine and the actuation gauntlet enforce. It binds every actor,
human and agent, identically.

## 2. Scope

**Who:** all Imperion employees, contractors, and AI agents that create, read, store, transmit, or
act on data. **What:** all Imperion and Imperion-managed data in any form, and every Operating
Procedure that handles data. This is a baseline policy inherited by every procedure and every agent.
Humans and agents are bound identically except where §5 gates an agent's authority over the most
sensitive classes.

## 3. Definitions

Only terms unique to this policy. Canonical entity terms defer to CONTEXT.md; governance terms
(`always_gate`, dial, gauntlet, the pool principle) defer to the top umbrella.

- **Sensitive Information** — collectively, **Restricted** and **Confidential** data, as used across
  the Imperion policy canon.
- **`data_class`** — the machine-readable classification carried on data so the access spine (RLS,
  two-axis) and the gauntlet can decide what an agent may read or act on.

## 4. Policy Statements

### 4.1 Classification levels

| Level | Definition | Examples |
| --- | --- | --- |
| **Restricted** | Highest sensitivity; unauthorized disclosure could cause severe harm, legal/regulatory penalty, or major reputational damage | Credentials, secrets, encryption keys, security architecture, incident details, regulated PII/PHI, payment-card data, client Restricted data |
| **Confidential** | Sensitive internal or client data; disclosure could cause harm or competitive disadvantage | Client business data, employee data, contracts, financials, trade secrets, internal documentation |
| **Internal** | Non-public operational data with low harm potential if disclosed | Internal communications, runbooks, non-sensitive project data |
| **Public** | Approved for public release | Marketing materials, published documentation |

### 4.2 Classification & labeling

1. All data is classified; when in doubt the **most sensitive applicable level** is assigned by
   default.
2. Microsoft Purview sensitivity labels are applied across Microsoft 365 to enforce classification
   technically, including for AI grounding so Copilot honors labels (CS-07).
3. Data owners (System Owners under CS-02) are accountable for classifying data in their systems.
4. Client data is classified at least as protectively as the client requires, and never below
   Confidential absent written agreement.

### 4.3 Handling requirements by classification

| Requirement | Restricted | Confidential | Internal | Public |
| --- | --- | --- | --- | --- |
| Encryption at rest | Required | Required | Recommended | Optional |
| Encryption in transit | Required | Required | Required | Optional |
| MFA / least-privilege access | Required (phishing-resistant) | Required | Required | N/A |
| Permitted in approved enterprise AI tools | Only with explicit approval + no-training guarantee | Only with approval | Permitted | Permitted |
| Permitted in consumer/public AI tools | Never | Never | Never | Permitted |
| External sharing | Only via approved, controlled mechanism | Approved mechanisms with DLP | Limited | Unrestricted |
| Removable media | Only encrypted, business-justified | Encrypted | Discouraged | N/A |
| DLP enforcement | Enforced | Enforced | Monitored | N/A |

### 4.4 Storage & transmission

1. Restricted and Confidential data is stored only in approved, encrypted systems (Microsoft 365,
   Azure, 1Password for secrets).
2. Transmission follows CS-04 (TLS 1.2+, SFTP, SSH; legacy protocols prohibited).
3. Email containing Restricted/Confidential data uses message encryption; DLP blocks or protects
   outbound sensitive data.

### 4.5 Retention & disposal

1. Data is retained per contractual, legal, and regulatory requirements, then securely disposed
   (see CS-16).
2. Electronic media is sanitized to NIST SP 800-88; physical media is destroyed.
3. Cloud data deletion follows provider attestations and contractual exit provisions (CS-06).

### 4.6 Data loss prevention

1. Microsoft Purview DLP monitors and controls Restricted and Confidential data across email,
   endpoints, and cloud apps.
2. DLP and AI data-protection policies are aligned so that classification governs what may enter AI
   tools (CS-07).

## 5. Application to Autonomous Agents

This policy defines the data classes every agent reads and acts on, and the classes that are
gated at every dial level. It is part of the baseline every agent inherits.

- **The classes agents read and act on.** Every agent honors the four classes (§4.1) on every
  read and action. The access spine carries `data_class` on data; an agent may read or act on a
  class only when its scoped identity, room budget, and dial permit (`workflow ⊆ domain ⊆
  Constitution`). The pool principle applies: a signal at one client may be correlated
  **internally** across all, but client-facing data **never** bleeds across boundaries — RLS and
  `data_class` enforce it (*correlate, never bleed*).
- **The always-gate classes (`always_gate`, dial-proof floor).** Regardless of dial, a human
  decides before an agent: discloses, exports, or shares **Restricted** data outside its boundary;
  places **Restricted or Confidential** data into any AI tool not approved with a no-training
  guarantee; sends data classified **Confidential or Restricted** to a client or external party;
  or crosses a client boundary with client-confidential data. Secrets, credentials, keys, and
  regulated PII/PHI (Restricted) are never read into prose, issues, PRs, commits, or logs by an
  agent — aggregate or redact.
- **Autonomy ceiling.** Reading and classifying data sits at L0–L2 for most agents; any action
  that *moves* Restricted/Confidential data across a boundary is `always_gate` at every level. No
  agent's dial can auto-approve a cross-boundary disclosure of Sensitive Information.
- **Human-in-loop & easy-button.** Each gated disclosure or AI-ingest decision is presented as a
  one-click easy-button (top-umbrella P3): the agent prepares the classified, DLP-checked artifact
  and the human approves the release.
- **Escalation & refusal.** An agent escalates unclassified or ambiguously classified data
  (defaulting to the most sensitive level) and any Sensitive Information found in an unapproved
  location. An agent **refuses** to place Restricted/Confidential data in a consumer AI tool or to
  emit secrets/PII regardless of dial.
- **Evidence.** Every agent read or action on classified data writes the 3-level `agent_run` /
  `agent_message` audit record (CS-10), capturing the `data_class` touched and any gate decision —
  without copying the sensitive values themselves.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| CISO (human owner) | Owns the scheme; approves enterprise-AI use of Restricted data and cross-boundary disclosures. |
| Data / System Owners (human) | Classify data in their systems; apply Purview labels. |
| Cybersecurity (human) | Maintains DLP and label policy; investigates DLP events. |
| All agents | Honor the four classes on every read/action; never bleed across boundaries; `always_gate` on Sensitive-Information disclosure and AI-ingest; never emit secrets/PII. |
| Grace (GRC agent) | Audits classification and handling conformance; recommends; corrective changes `always_gate` (L2). |

## 7. Enforcement & Audit

Classification is enforced structurally (Purview labels, DLP, two-axis RLS + `data_class`, the
gauntlet's data-class check) and verified continuously (DLP events to Sentinel, eval goldens, the
conformance sweep). The [coverage-matrix](../coverage-matrix.md) proves every data-handling
procedure is bound. A violation parks the work and escalates; for agents, a Sensitive-Information
bleed lowers the dial or trips the kill-switch; for humans, disciplinary action up to and including
termination.

## 8. Related

**Procedures governed:** every data-handling step across all streams (this is a baseline policy).
**Related policies:** [CS-00](CS-00-information-security-program.md) · CS-04 (Encryption) · CS-02
(Identity & Access Management) · [CS-06 Cloud Security](CS-06-cloud-security.md) ·
[CS-07 AI Governance & Secure Deployment](CS-07-ai-governance-and-secure-deployment.md) ·
[CS-10 Logging, Monitoring & SIEM](CS-10-logging-monitoring-and-siem.md) · CS-14 (Privacy & Data
Protection) · CS-16 (Data Retention & Disposal). **ADRs:** ADR-0128 (autonomy ladder) · ADR-0109
(dial + hard ceilings) · ADR-0058 (gauntlet) · ADR-0118 (data-class action ceiling) · ADR-NNNN
(policy-canon architecture).
