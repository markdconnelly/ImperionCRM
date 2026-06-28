# CS-18 — Client Shared Responsibility

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program](CS-00-information-security-program.md). Rewritten from
> the legacy `IM026 — Client Shared Responsibility Policy & Matrix`; substance, the baseline
> matrix, and framework mappings preserved, restructured to the dual-audience template. This is
> the policy that defines the **MSP client boundary** for the whole canon.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-18` |
| **Title** | Client Shared Responsibility |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly); Legal and Executive Leadership reviewed |
| **Governing for (agents)** | All client-facing and security agents — Cyrus (SOC), Osiris (IAM), Phoenix (BCDR), Grace (GRC), and the delivery agents — and all agents for the pool-boundary rule |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual (and at each client onboarding / QBR) |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00](CS-00-information-security-program.md) + CS-08 (Data Classification & Handling) · CS-09 (Vendor & Third-Party Security Risk) · CS-IR (Incident Response) |

**Framework Alignment:** NIST CSF 2.0 (GV.SC, GV.RR) · AICPA SOC 2 (Complementary User Entity Controls / CUECs).

---

## 1. Purpose

To define, for each security control area, the division of responsibility between Imperion (the
service provider) and the client (the user entity). As a service organization, Imperion's SOC 2
report relies on **Complementary User Entity Controls (CUECs)** — controls the client must
operate for the overall system to be effective. This policy makes those boundaries explicit so
no gap opens where each party assumes the other is responsible — and it is where the **pool
principle** is made concrete: signals correlate internally across clients, but client-facing
responsibility and data never cross a client boundary.

## 2. Scope

**Who:** all Imperion employees, contractors, and AI agents that act on or about a client's
environment — and every agent that reads, correlates, or surfaces client data. **What:** the
shared-responsibility matrix, its per-engagement tailoring, CUECs, and the communication/
escalation boundary between Imperion and each client. This policy is the **per-client policy
derivation** surface: the baseline below is tailored into each engagement's matrix. Binds humans
and agents identically except where §5 narrows or gates an agent's authority.

## 3. Definitions

- **Shared Responsibility** — the allocation of security obligations between Imperion and the
  client.
- **Complementary User Entity Control (CUEC)** — a control the client is responsible for
  operating, assumed by Imperion's control design.
- **RACI** — Responsible, Accountable, Consulted, Informed.
- **Pool principle (localized).** Clients are a pool: an agent may **correlate a signal
  internally** across clients (security/quality) but **never bleeds client-facing data across a
  boundary** — *correlate, never bleed* (top umbrella §5.3; enforced by RLS + `data_class`).

## 4. Policy Statements

1. **Every engagement has a matrix.** Each managed-services engagement includes a documented
   shared-responsibility matrix, derived from this policy and tailored to the contracted
   services. It is reviewed with the client at onboarding and at least annually (e.g., QBRs).
2. **Shifts are written.** Where responsibility shifts (e.g., the client retains certain
   administrative functions), the matrix is updated and agreed in writing.
3. **General principles.** Imperion is responsible for the security of the services it operates
   and the controls it contractually commits to. The client remains responsible for decisions
   and controls within its own purview — approving access, classifying its data, enforcing
   internal policy on its workforce, and acting on Imperion's recommendations. Neither party's
   responsibility relieves the other of good faith and prompt communication on security matters.
4. **Responsibility matrix (baseline — tailored per engagement; the SOW and service
   descriptions govern in case of conflict).**

   | Control Area | Imperion | Client |
   | --- | --- | --- |
   | Identity & MFA (Entra) | Configure, enforce MFA/Conditional Access, monitor | Approve users/roles, enforce internal use, protect own credentials |
   | Privileged access (PIM/GDAP) | Operate least-privilege admin, log actions | Approve Imperion's delegated access scope |
   | Patch & vulnerability mgmt | Deploy patches (Kaseya), scan, report | Approve maintenance windows, fund EOL replacement |
   | Endpoint & EDR | Deploy/manage Defender, baseline, monitor | Ensure devices enrolled, follow device policy |
   | Email security | Configure Defender for O365, SPF/DKIM/DMARC, filter | Train users, report phishing, approve mail-flow changes |
   | Data classification | Provide labeling tooling (Purview), advise | Classify own data, define sensitivity requirements |
   | Backup & recovery | Operate backups (Kaseya), test restores | Define RPO/RTO needs, validate critical-system list |
   | Logging & monitoring (SIEM) | Operate Sentinel/Defender XDR, alert, respond | Provide context, act on notifications requiring client action |
   | Incident response | Detect, contain, eradicate, recover; notify | Decision authority on business impact, regulatory/breach notification to subjects |
   | Access reviews | Provide reports, facilitate reviews | Approve/attest to access appropriateness |
   | AI deployment (CS-07) | Assess, configure securely, monitor | Approve use cases, data scope, accept residual risk |
   | User onboarding/offboarding | Execute provisioning/de-provisioning | Submit timely joiner/leaver requests with accurate dates |
   | Physical security | Secure Imperion-operated infrastructure | Secure client premises and on-site equipment |
   | Compliance/regulatory | Operate and evidence contracted controls | Own client's regulatory obligations and notifications |

5. **CUECs are explicit.** The engagement-specific matrix lists the CUECs the client must
   operate for Imperion's controls to be effective (timely termination requests, protecting
   client-held credentials, acting on recommendations, approving access). These are communicated
   and acknowledged at onboarding.
6. **Communication and escalation.** Incident-notification responsibilities, escalation paths,
   and decision authority are defined per engagement and tested through tabletop exercises where
   appropriate.

## 5. Application to Autonomous Agents

For actions on or about a client's environment, agents operate under the autonomy framework
defined once in the top umbrella (§4):

- **Autonomy ceiling.** An agent's ceiling on a client environment is the **lower** of its own
  ceiling and what the engagement matrix allocates to Imperion. An agent never acts in a control
  area the matrix assigns to the client. Internal correlation and proposal sit at **L0–L1**;
  reversible-under-runbook client-environment actions follow the per-engagement allocation and
  the acting policy (e.g., CS-IR for incident actions).
- **`always_gate` actions (dial-proof floor).** Anything **sent to or surfaced to a client**,
  any **client notification or breach disclosure**, any action **outside Imperion's allocated
  responsibility**, and any **cross-client data surface** require a human decision at every dial
  level. Client-facing output is always gated.
- **The pool boundary is enforced, not advisory.** An agent **may correlate signals internally**
  across the client pool but the gauntlet's `data_class` + RLS checks **prevent client-facing
  data from bleeding across a boundary**. *Correlate, never bleed* is structural, not a
  guideline.
- **Human-in-loop & easy-button.** As the dial climbs, internal correlation and reporting recede
  from human attention; every client-facing step stays gated. At each gate the agent prepares a
  one-click resolution — the recommendation, the matrix basis (which party owns it), and the
  client-ready artifact — for the human to approve and send.
- **Escalation & refusal.** An agent must escalate any action whose ownership is ambiguous in the
  matrix and must **refuse** to act in a client-owned control area or to bleed one client's data
  to another — a refusal class stronger than a gate.
- **Evidence.** Every client-environment action and every internal correlation writes the
  `agent_run` / `agent_message` ledger with the engagement and the matrix basis, so each action
  is attributable to the accountable human and the right client boundary.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| CISO (human owner) | Owns the policy and the baseline matrix; approves client-facing security communications. |
| Delivery / account lead (human) | Tailors and reviews each engagement's matrix; sends client-facing output. |
| Client (user entity) | Operates its CUECs; owns decisions and controls in its purview. |
| Cyrus — SOC (agent) | Detects and proposes within Imperion's allocated IR responsibility; never notifies clients directly. |
| Osiris — IAM (agent) | Operates allocated identity tasks; routes client-owned access decisions to the client. |
| Grace — GRC (agent) | Maintains CUEC tracking and matrix conformance per engagement. |
| All agents | Honor the matrix ceiling and the pool boundary on every client action. |

## 7. Enforcement & Audit

The matrix boundary is enforced structurally (the gauntlet's scope + `data_class` checks, RLS,
the least-privilege room budget) and verified by GRC (CS-17) per engagement, with CUEC
acknowledgment retained as audit evidence. The [coverage-matrix](../coverage-matrix.md) proves
every client-facing procedure names this policy as a driver. Crossing the client boundary —
acting in a client-owned area, sending unapproved client-facing output, or bleeding data across
clients — is a high-severity violation that parks the work, escalates, and lowers the agent's
dial or trips the kill-switch.

## 8. Related

**Procedures governed:** client-onboarding, QBR, access-review, and client-incident-notification
steps (catalog links). **Related policies:** [CS-00](CS-00-information-security-program.md) ·
CS-08 (Data Classification & Handling) · CS-09 (Vendor & Third-Party Security Risk) ·
[CS-17](CS-17-audit-and-compliance-management.md) · CS-IR (Incident Response) ·
[CS-19](CS-19-acceptable-use.md). **ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial +
ceilings) · ADR-0058 (gauntlet) · ADR-0118 (data-class action ceiling — the pool boundary) ·
ADR-0134 (policy-canon architecture).
