# IM011 — AI Governance & Secure Deployment Policy

| Field | Value |
| --- | --- |
| **Subject** | IM011 — AI Governance & Secure Deployment Policy |
| **Category** | Information Security / Technology Governance |
| **Owner** | CISO |
| **Reviewer** | Executive Leadership / Legal |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Semi-annual (AI evolves rapidly) |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL AI systems built, configured, deployed, or operated by Imperion for itself or its clients |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST AI Risk Management Framework (AI RMF 1.0) · ISO/IEC 42001 (AI Management System) · NIST CSF 2.0 (GV, ID, PR) · SOC 2 (CC3, CC5, CC8) · OWASP Top 10 for LLM Applications

---

## 1. Purpose

Imperion is positioning itself as a premier MSP for incorporating AI into client environments as the technology evolves. This policy establishes the governance and security requirements for **deploying, integrating, and operating AI systems** — both internally (e.g., Microsoft 365 Copilot) and on behalf of clients — so that AI is adopted as a competitive advantage **without compromising security, which is our reputation.**

This policy governs AI *systems and deployment*. Individual workforce *use* of AI tools is governed by IM010.

## 2. Definitions

- **AI System** — Any system that uses machine learning, large language models (LLMs), or other AI techniques to generate output, make or support decisions, or automate tasks.
- **Generative AI / LLM** — Models that generate text, code, images, or other content (e.g., GPT-class models, Microsoft Copilot).
- **AI Agent** — An AI system granted the ability to take actions (call tools, modify systems, send communications) with some degree of autonomy.
- **Grounding Data** — The organizational data an AI system is permitted to access to inform its responses (e.g., the documents Copilot can read).
- **Model Provider** — The vendor supplying the underlying model or AI service.
- **AI Risk Assessment (AIA)** — A structured assessment of an AI system's risk before deployment, modeled on NIST AI RMF.

## 3. Governance Structure

### 3.1 AI Governance Authority

- The **CISO chairs an AI Governance function** (working group) including representatives from Cybersecurity, Information Security, Legal, and service delivery.
- This function approves AI systems for internal use and for client deployment, maintains the AI system inventory, and reviews AI risk on at least a semi-annual basis.
- No AI system may be deployed to production — internally or for a client — without AI Governance approval.

### 3.2 AI System Inventory

Imperion maintains a current inventory of all AI systems in use or deployed, recording: purpose, model provider, data accessed, autonomy level, owner, risk rating, and approval status. The inventory is reviewed semi-annually.

## 4. AI Risk Assessment (Before Deployment)

Every AI system undergoes an AI Risk Assessment before production deployment, aligned to the NIST AI RMF functions (**Govern, Map, Measure, Manage**). The AIA evaluates:

- **Purpose and impact** — What the system does, who it affects, and the consequence of error.
- **Data flows** — What data the model can access (grounding data), what is sent to the provider, data residency, and whether inputs/outputs are used to train the provider's models (**no-training guarantees are required for any system processing Confidential or Restricted data**).
- **Security risks** — Mapped against the **OWASP Top 10 for LLM Applications**, including prompt injection, insecure output handling, sensitive information disclosure, excessive agency, and supply-chain risk.
- **Bias, fairness, and reliability** — Potential for harmful or discriminatory output and hallucination tolerance for the use case.
- **Autonomy and blast radius** — For AI agents, the scope of actions and the controls limiting them.
- **Risk rating** — Per IM006, with required decision-maker authority.

High-risk or client-facing AI deployments require CISO sign-off; Critical-rated deployments require executive approval.

## 5. Secure Deployment Requirements

### 5.1 Data Protection and Tenant Isolation

- AI systems processing Imperion or client data must use enterprise/commercial offerings with contractual data protections — **no consumer-grade AI services for Confidential or Restricted data.**
- For Microsoft 365 Copilot and Azure AI, data must remain within the appropriate tenant boundary; grounding data access must respect existing permissions and least privilege.
- Provider agreements must guarantee that Imperion/client data is **not used to train foundation models** and is handled per data-residency requirements (US processing unless contractually approved — see IM009).

### 5.2 Permissions Hygiene (Critical for Copilot)

- Before enabling Copilot or any AI that surfaces organizational data, **oversharing and permission sprawl must be remediated.** AI that respects existing permissions will expose any pre-existing overexposure. A permissions and sensitivity-label review is mandatory before enablement.
- Microsoft Purview sensitivity labels and DLP are applied so AI honors data classification (IM012).

### 5.3 Identity, Access, and Logging

- AI systems and agents authenticate through Entra ID with least-privilege, scoped identities; agent identities are inventoried as non-human identities (IM008).
- All AI system activity — prompts where feasible, actions taken by agents, data accessed, and administrative changes — is logged and forwarded to **Microsoft Sentinel** (IM014).

### 5.4 Input/Output Controls

- Defenses against prompt injection and insecure output handling are implemented; AI output that drives downstream actions is validated and never implicitly trusted.
- Guardrails (content filtering, grounding, allow-lists of tools/actions) are configured appropriate to the use case.

### 5.5 AI Agents and Autonomy

- AI agents are deployed with the **minimum autonomy necessary.** High-impact or irreversible actions (financial transactions, permission changes, data deletion, external communications, production changes) require human approval — they may not be fully delegated to an AI agent.
- Agent tool access is allow-listed and least-privilege; agent actions are fully logged and reviewable.

### 5.6 Human Oversight

- A human is accountable for every AI system's outputs and actions. AI does not make final decisions that materially affect security posture, access rights, employment, or client systems without human review.

## 6. Client AI Deployments

When Imperion deploys AI for a client:

- The engagement is scoped in a written agreement defining purpose, data access, security controls, monitoring, and the division of responsibility.
- A client-specific AIA is completed and shared as appropriate.
- The client's data classification, regulatory obligations, and contractual constraints are honored.
- The same secure-deployment requirements (§5) apply, configured to the client tenant.
- Decommissioning provisions ensure clean removal of AI access, agents, and data at engagement end.

## 7. Ongoing Monitoring and Lifecycle

- AI systems are monitored for security, accuracy, drift, and misuse; anomalies are handled as incidents (Technical Incident Response Program).
- Model or provider changes that materially affect risk trigger re-assessment.
- The AI inventory and this policy are reviewed at least semi-annually given the pace of AI change.
- AI-specific incidents (e.g., data leakage via AI, harmful output, agent misbehavior) are added to incident-response playbooks.

## 8. Enforcement

Deploying AI outside this policy is a serious violation and may result in disciplinary action up to and including termination, and removal of the offending system from production.

## 9. NIST AI RMF / CSF / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST AI RMF — Govern | AI governance function, inventory, accountability |
| NIST AI RMF — Map / Measure / Manage | AI risk assessment, evaluation, monitoring |
| ISO/IEC 42001 | AI management system structure |
| NIST CSF GV/ID/PR | Governance, asset inventory, protective controls |
| OWASP LLM Top 10 | Application-layer AI security |
| SOC 2 CC3 / CC5 / CC8 | Risk assessment, control activities, change management |

---

*Electronic approval on file.*
