# Imperion Policy Canon

**One policy set, read the same way by a human and by an AI agent.** Imperion runs on a single
workforce of humans and named AI agents (ADR-0131); both are governed by these policies. Every
policy is a single document — plain-language rules plus an explicit *Application to autonomous
agents* section — so a human employee and an agent read the **same obligation**. Architecture:
ADR-NNNN (policy canon) + the [top umbrella](00-imperion-operating-policy-and-code-of-conduct.md).

> Supersedes the legacy "Information Security Policy Set (IM001–026)" framing: those policies are
> re-sorted into the **Cybersecurity** and **Information Technology** categories and rewritten
> dual-audience. `"Policy"` is a canonical term in CONTEXT.md.

## Structure

- **Top umbrella** — [`00-imperion-operating-policy-and-code-of-conduct.md`](00-imperion-operating-policy-and-code-of-conduct.md): the dual-actor model + the cross-cutting autonomy/oversight framework (ladder/dial/gauntlet/`always_gate`/human-in-loop/easy-button/pool/no-fabrication/P1–P4) + the D4 binding model. Every policy inherits it.
- **Three categories** (subfolders), each with an **umbrella** + **distinct** policies + a `procedures/` folder for **procedure-specific** policies:
  - [`cybersecurity/`](cybersecurity/) — `CS-NN`
  - [`information-technology/`](information-technology/) — `IT-NN`
  - [`business-operations/`](business-operations/) — `BO-NN`
- **Authoring template** — [`_TEMPLATE.md`](_TEMPLATE.md) (dual-audience; copy for every new policy).
- **Coverage proof** — [`coverage-matrix.md`](coverage-matrix.md): every Operating Procedure → its driving policy(ies); every policy → procedures governed.

## Binding model (D4 — two layers)

1. **Universal baseline** (inherited by every Operating Procedure, never restated per entry): the
   top umbrella + the cross-cutting policies — **CS-19** Acceptable Use, **CS-07** AI Governance,
   **CS-08** Data Classification & Handling, **CS-10** Logging & SIEM, **CS-14** Privacy, and
   each category umbrella.
2. **Per-procedure drivers**: each procedure names its **1–3 specific** distinct/procedure-specific
   policies in its catalog `Driving policy` field.

## The set (all ✅ authored; "From" = provenance of the re-sorted source)

### Cybersecurity (CS)
| ID | Title | Status | From |
|---|---|---|---|
| CS-00 | Information Security Program (umbrella) | ✅ | Enterprise Program |
| CS-01 | Information Security Strategy | ✅ | IM001 |
| CS-02 | Identity & Access Management | ✅ | IM003 |
| CS-03 | Remote Access & MFA | ✅ | IM004 |
| CS-04 | Encryption | ✅ | IM005 |
| CS-05 | Risk Management & Analysis | ✅ | IM006 |
| CS-06 | Cloud Security | ✅ | IM009 |
| CS-07 | AI Governance & Secure Deployment | ✅ | IM011 |
| CS-08 | Data Classification & Handling | ✅ | IM012 |
| CS-09 | Vendor & Third-Party Security Risk | ✅ | IM013 |
| CS-10 | Logging, Monitoring & SIEM | ✅ | IM014 |
| CS-11 | Email Security & Anti-Phishing | ✅ | IM021 |
| CS-12 | Security Awareness & Training | ✅ | IM022 |
| CS-13 | Network Security | ✅ | IM023 |
| CS-14 | Privacy & Data Protection | ✅ | IM019 |
| CS-15 | Physical & Environmental Security | ✅ | IM018 |
| CS-16 | Data Retention & Disposal | ✅ | IM024 |
| CS-17 | Audit & Compliance Management | ✅ | IM025 |
| CS-18 | Client Shared Responsibility | ✅ | IM026 |
| CS-19 | Acceptable Use | ✅ | IM010 |
| CS-20 | Personnel Security | ✅ | IM017 |
| CS-IR | Technical Incident Response Program | ✅ | IR Program |

### Information Technology (IT)
| ID | Title | Status | From |
|---|---|---|---|
| IT-00 | IT Operations Program (umbrella) | ✅ | new |
| IT-01 | Service Delivery & SLA Management | ✅ | new |
| IT-02 | Change & Configuration Management | ✅ | IM016 |
| IT-03 | Patch & Vulnerability Management | ✅ | IM002 |
| IT-04 | Monitoring & Event Management (NOC) | ✅ | new |
| IT-05 | Incident & Problem Management | ✅ | new |
| IT-06 | Backup, Recovery & Business Continuity | ✅ | IM015 |
| IT-07 | Endpoint & Device Baseline (BYOD/Intune) | ✅ | IM020 |
| IT-08 | Account & Access Lifecycle (JML) | ✅ | IM008 |
| IT-09 | Network Operations & Access Termination | ✅ | IM007 |
| IT-10 | Provisioning, Asset & CMDB Management | ✅ | new |
| IT-11 | Documentation & Knowledge Management (IT Glue) | ✅ | new |

### Business Operations (BO)
| ID | Title | Status | From |
|---|---|---|---|
| BO-00 | Business Operations Program (umbrella) | ✅ | new |
| BO-01 | Marketing & Communications | ✅ | new |
| BO-02 | Sales, Pricing & Commitment Authority | ✅ | new |
| BO-03 | Procurement & Vendor Commitment | ✅ | new |
| BO-04 | Client Success & Advisory | ✅ | new |
| BO-05 | Billing, AR & Collections | ✅ | new |
| BO-06 | Financial Management & Controls | ✅ | new |
| BO-07 | Expense & Reimbursement | ✅ | docs/policies/expense-policy.md (#493) |
| BO-08 | Time, Attendance & Payroll | ✅ | new |
| BO-09 | Legal & Contract Lifecycle | ✅ | new |
| BO-10 | Human Resources & People | ✅ | new |

## Authoring rules
- One canon, zero drift (OKF §11 / skills §9 doctrine). No policies outside this tree.
- Every policy uses [`_TEMPLATE.md`](_TEMPLATE.md) and includes the *Application to autonomous
  agents* section. Governance terms are defined once in the top umbrella; policies localize them.
- A new Operating Procedure or a changed agent capability updates the governing policy + the
  [coverage-matrix](coverage-matrix.md) in the same change set.
- No secrets, no PII, no client identifiers in a policy (reference data classes, never restate).
- Per-client policy versions are derived from these masters (start from **CS-18**).
