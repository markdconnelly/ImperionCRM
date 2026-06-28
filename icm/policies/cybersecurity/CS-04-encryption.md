# CS-04 — Encryption

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program umbrella](CS-00-information-security-program.md).
> Rewrite-from-source of the legacy `IM005 — Encryption`; the approved algorithms, key-management
> requirements, and framework mappings are preserved, restructured to the dual-audience canon
> template. Governance terms are defined ONCE in the top umbrella; this policy localizes them.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-04` |
| **Title** | Encryption |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly); operated by the Director of Cybersecurity |
| **Governing for (agents)** | Cyrus (SOC), Osiris (IAM) — and all agents for the encrypt-in-transit/at-rest and key-handling rules |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00 Information Security Program](CS-00-information-security-program.md) + [CS-08 Data Classification & Handling] |

**Framework Alignment:** NIST CSF 2.0 (PR.DS-01/02/10) · AICPA SOC 2 (CC6.1, CC6.7, C1.1) ·
NIST AI RMF (Manage — protecting agent-handled data).

---

## 1. Purpose

This policy reflects Imperion's commitment to protect electronic information from unauthorized
access, disclosure, or alteration through the consistent application of strong, industry-accepted
encryption — for data at rest, data in transit, and the keys that protect both. Every actor,
human or agent, handles sensitive information only over encrypted channels and storage.

## 2. Scope

**Who:** all Imperion and Imperion-managed systems and the actors that touch them — Cyrus (SOC)
and Osiris (IAM) as primary governed agents, and every agent for the encrypt-in-transit/at-rest
and key-handling rules. **What:** all Sensitive Information (combined personal and business
information per the data-classification policy), the approved algorithms/standards, data at rest,
data in transit, and key management, across the data-handling Operating Procedures in Stream 07
and the security baseline. The policy binds humans and agents identically except where §5 narrows
or gates an agent's authority. No business unit is excluded.

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **Personal Information (PII)** — Sensitive personally identifiable information traceable to an
  individual that could cause harm if disclosed (biometric, medical, financial, unique
  identifiers). Handled per the data classes; never restated in policy, issues, or logs.
- **Business Information** — Sensitive business data posing risk if exposed (trade secrets,
  acquisition plans, financials, employee data, supplier/customer information).
- **Sensitive Information** — The combined set of personal and business information requiring
  protection (full classification in the data-classification policy).
- **Encryption** — Encoding data using a strong, industry-accepted algorithm so only authorized
  parties can decrypt and read it.

## 4. Policy Statements

Imperion encrypts all Sensitive Information wherever reasonably and technically feasible.

1. **Approved algorithms and standards.** Data at rest uses AES-256 or stronger; full-disk
   encryption (BitLocker for Windows, FileVault for macOS) is enforced and monitored on all
   endpoints via Entra ID / Intune compliance and the RMM platform. Data in transit uses TLS 1.2
   minimum, TLS 1.3 preferred; legacy protocols (SSL, TLS 1.0/1.1, SMBv1) are prohibited;
   acceptable session-layer technologies include TLS/HTTPS, SSH, and SFTP. Insecure protocols may
   not transmit files outside the Imperion or client network boundary. Cryptographic standards are
   reviewed at least annually against NIST guidance, including planning for post-quantum
   cryptography migration as standards mature.
2. **Data at rest.** All Sensitive Information at rest — on Imperion- or client-owned drives,
   removable media, and cloud storage, permanent or temporary — is encrypted. No Sensitive
   Information is created or stored on portable or removable media except for legitimate,
   job-related purposes. Cloud-stored data (Microsoft 365, Azure) uses platform encryption with
   Microsoft-managed or, where required, customer-managed keys.
3. **Data in transit.** Any transmission of Imperion or client data — internal or external, wired
   or wireless — is encrypted. Email containing Sensitive Information is protected via the
   Microsoft Purview / Exchange Online encryption gateway and message encryption.
4. **Key management.** Cybersecurity maintains procedures for changing vendor defaults on all
   devices transmitting Sensitive Information. Keys and credentials are managed centrally in
   1Password (workforce credential management) and Azure Key Vault (platform keys); the front end
   holds no AI provider key, and agents resolve credentials only through the registry/Key Vault,
   never inline. Keys and passwords are rotated on a predetermined basis and, at minimum,
   following any System Administrator personnel change. Recovery keys (e.g., BitLocker) are
   escrowed securely in Entra ID / Intune and protected against unauthorized access.
5. **Exceptions.** Exceptions may be allowed for legacy systems lacking encryption capability;
   each requires a documented risk assessment (CS-05), CISO approval, and a remediation plan to
   replace or upgrade the system where feasible.

## 5. Application to Autonomous Agents

For encryption and key-handling actions (transmitting or storing sensitive data, configuring
encryption, requesting or rotating keys/secrets, and reading credential material):

- **Autonomy ceiling.** Cyrus (SOC) operates at **L4 reversible-under-runbook** for monitoring and
  reversible response; Osiris (IAM) at **L3** with identity/credential changes gated. Every agent
  is bound by the encrypt-in-transit/at-rest rules and by least privilege: an agent transmits and
  stores sensitive data only over approved encrypted channels/storage and resolves secrets only
  via the credential registry / Key Vault within its room budget.
- **`always_gate` actions.** Any key or secret rotation, change to an encryption standard or
  configuration, escrow/recovery-key access, and any change that would weaken transport or
  at-rest encryption is `always_gate` at every dial level. **No agent ever prints, logs, commits,
  or exfiltrates key material, secrets, or plaintext PII** — this is a refusal-class prohibition,
  stronger than a gate.
- **Human-in-loop & easy-button.** As the dial climbs, an agent may auto-detect drift (weak
  protocols, unencrypted stores, stale keys) and assemble the proposed rotation or remediation,
  handing the approver a one-click resolution (top-umbrella P3). The decision stays human at every
  level.
- **Escalation & refusal.** An agent escalates discovered plaintext sensitive data, prohibited
  legacy protocols, or expired/stale keys per the risk policy and notification routing
  (top-umbrella P4). It **refuses** to transmit sensitive data over an insecure protocol, to store
  it unencrypted, or to surface key material in any artifact.
- **Evidence.** Every encryption/key action writes an `agent_run` / `agent_message` audit record
  attributed to the accountable human, referencing the **data class** only — never the sensitive
  content itself.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| CISO (human) | Owns this policy; approves encryption exceptions and standard changes |
| Cybersecurity / MIS (human function) | Maintains key-management procedures; changes vendor defaults; rotates keys; monitors endpoint encryption compliance |
| System Owner (human) | Ensures Sensitive Information in their system is encrypted at rest and in transit |
| Cyrus — SOC (agent, L4 reversible-under-runbook; destructive/identity = always_gate) | Detects encryption drift and prohibited protocols; assembles remediation; never weakens encryption autonomously |
| Osiris — IAM (agent, L3, credential changes gated) | Assembles key/secret rotation change sets; never rotates or accesses escrow keys autonomously |
| All agents | Use only approved encrypted channels/storage; resolve secrets via registry/Key Vault; never print, log, commit, or exfiltrate key material or plaintext PII |

## 7. Enforcement & Audit

Adherence is enforced structurally (the gauntlet, the least-privilege room budget, the
encrypted-transport and at-rest requirements, registry/Key Vault secret custody) and verified
continuously (Intune/RMM encryption-compliance monitoring, the agent eval goldens, the
conformance/audit sweep, the annual cryptographic-standards review). The
[coverage-matrix](../coverage-matrix.md) proves every data-handling procedure is bound. A
violation parks the work and escalates; repeated or high-severity violations lower the agent's
dial or trip the kill-switch. Human violations may result in disciplinary action up to and
including termination, and where applicable civil or criminal referral.

## 8. Related

**Procedures governed:** data-handling, secret-rotation, and endpoint-encryption steps in Stream
07 and the security baseline. **Related policies:**
[CS-00 Information Security Program](CS-00-information-security-program.md) ·
[CS-02 Identity & Access Management](CS-02-identity-and-access-management.md) ·
[CS-03 Remote Access & MFA](CS-03-remote-access-and-mfa.md) ·
[CS-05 Risk Management & Analysis](CS-05-risk-management-and-analysis.md) ·
[CS-08 Data Classification & Handling] · [CS-14 Privacy & Data Protection] ·
[CS-16 Data Retention & Disposal]. **ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard
ceilings) · ADR-0058 (gauntlet) · ADR-0088 (room budget) · ADR-0129 (platform credentials) ·
ADR-NNNN (policy-canon architecture).
