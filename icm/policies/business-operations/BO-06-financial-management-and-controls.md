# BO-06 — Financial Management & Controls

> Distinct Business Operations policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Business Operations Program](BO-00-business-operations-program.md). Governs how
> Imperion records, controls, and reports money — binding **humans and agents alike**. The one
> rule that anchors everything below: **QuickBooks Online is the system of record for money, and
> no agent ever moves it.**

| Field | Value |
| --- | --- |
| **Policy ID** | `BO-06` |
| **Title** | Financial Management & Controls |
| **Category** | Business Operations |
| **Tier** | distinct |
| **Human owner** | Deputy CFO (Nick) |
| **Governing for (agents)** | Audrey (Finance); Sterling (CFO) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [BO-00](BO-00-business-operations-program.md) + Data Classification & Handling (Cybersecurity) |

**Framework Alignment:** GAAP (accrual, revenue recognition, period close) · segregation-of-duties
(no single actor initiates + approves + records a transaction) · AICPA SOC 2 (CC1 Control
Environment) · NIST AI RMF (Manage).

---

## 1. Purpose
This policy establishes how Imperion keeps its books accurate, controlled, and auditable: where
the financial truth lives, who may authorize money to move, how duties are separated so no one
actor can both create and approve a transaction, and how margin and financial performance are
governed. It exists so that every dollar recorded is traceable, no dollar moves without a human
decision, and the financial picture an executive (or an agent) relies on is grounded in the
system of record rather than invented.

## 2. Scope
**Who:** all employees and contractors involved in finance, plus the Finance agent (Audrey) and
the CFO agent (Sterling). **What:** the general ledger, accounts payable and receivable, bank and
card accounts, period close, margin and financial reporting, and the Operating Procedures in
Stream 09 (Record → Report) and the finance-facing steps of Streams 02, 05, 07, and 08. The
policy binds humans and agents identically except where §5 narrows or gates an agent's authority.
Finance is **read-only / advisory** in Imperion OS wherever QuickBooks Online (QBO) is the system
of record.

## 3. Definitions
- **System of record (SoR) for money:** QuickBooks Online. The Imperion OS finance surfaces are
  **mirrors** of QBO for reading, aging, and analysis — never an authoritative second ledger.
- **Money movement:** any act that pays, transfers, posts, voids, refunds, or otherwise changes a
  financial transaction in QBO or a bank/card account — including bill-pay runs, journal entries,
  invoice posting/voiding, and credits.
- **Segregation of duties (SoD):** the requirement that the actor who *initiates* a transaction is
  not the same actor who *approves* it and not the same actor who *records/reconciles* it.

## 4. Policy Statements
1. **QBO is the single financial system of record.** All authoritative balances, postings, and
   payments live in QBO. Imperion OS finance views are read-only reflections; a discrepancy is
   reconciled toward QBO, never away from it.
2. **No money moves without a human decision.** Every money-movement act is authorized by a named
   human with the standing authority to approve it. The act is recorded with who authorized it,
   when, and why.
3. **Segregation of duties is mandatory.** The responsible party who initiates a payment, journal,
   or invoice change is never the same party who approves it and never the same party who reconciles
   it. Where headcount makes full three-way separation impractical, a documented compensating
   control (independent review, dual sign-off) applies.
4. **Approval thresholds govern who may authorize.** Money-movement authority is tiered by amount
   (the threshold schedule is maintained by the Deputy CFO; placeholder amounts: ___________ up to
   ___________ → ___________; above ___________ → ___________). No actor approves an amount above
   their tier; splitting a transaction to stay under a threshold is prohibited.
5. **Margin governance.** Quotes, contracts, and renewals carry a margin floor (set by Finance,
   placeholder: ___________). A deal below the floor is escalated for explicit approval before
   commitment; margin erosion is reported at close.
6. **Period close is disciplined and dated.** Each period closes on a published cadence
   (placeholder: by the _____ of the following month); a closed period is not reopened — late
   items roll to the next period.
7. **No fabrication of financial fact.** No actor invents balances, margins, projections, or
   figures. Reported numbers cite their source in QBO/the mirror; on empty or unreconciled data,
   the actor says so rather than estimating silently.

## 5. Application to Autonomous Agents
**The dual-audience core.** For finance actions this policy governs:

- **Autonomy ceiling.** **Audrey (Finance) tops at L2** — internal, reversible analysis only:
  detect, draft, age, reconcile-propose, and **advise**. **Sterling (CFO) tops at L2 as a
  delegate-only synthesizer** — it composes financial narrative and recommendations from Audrey's
  outputs and the QBO mirror; it commits nothing. Neither agent ever reaches an external-acting
  level for money.
- **`always_gate` actions (dial-proof floor).** **Any money movement is `always_gate` at every
  dial level, forever** — posting/voiding/changing an invoice, a journal entry, a bill-pay run, a
  refund or credit, any transfer. No dial setting can auto-approve these. The approver is the
  human with the matching threshold tier (§4.4). **QBO is the SoR and the agent never writes to
  it.**
- **Human-in-loop & easy-button.** As an agent earns trust, its *analysis* recedes from review —
  but the money step never does. At each gate Audrey/Sterling prepares the complete package (the
  reconciled figures, the variance, the recommended action, the draft posting/payment as it would
  appear in QBO) and hands the human a **one-click** approve-and-execute easy-button; the human
  commits, the backend actuates through the gauntlet.
- **Escalation & refusal.** Audrey **advises, never gates** the business — it escalates below-floor
  margin, unreconciled variances, and threshold breaches rather than blocking work. **Salary and
  individual compensation disclosure is refusal-class** (stronger than a gate): the agent refuses
  to surface, infer, or compute another person's pay, regardless of who asks or the dial level.
- **Evidence.** Every governed agent action writes the 3-level `agent_run`/`agent_message` tracer:
  the figures read (with QBO references), the recommendation, the gate presented, and the human
  decision. The audit record ties the financial action to an accountable human (top-umbrella P2).

## 6. Roles & Responsibilities
| Actor | Responsibility |
| --- | --- |
| Deputy CFO (Nick) | Owns this policy, the threshold schedule, the margin floor, and the close cadence; approves money movement within authority; final SoD arbiter. |
| Finance staff (human) | Initiate / approve / reconcile under SoD; perform period close; commit the easy-buttons the agent prepares. |
| Audrey (Finance agent) | Detect, draft, age, reconcile-propose, advise (L2); prepare easy-buttons; never moves money; refuses salary disclosure. |
| Sterling (CFO agent) | Synthesize financial narrative and recommendations (L2 delegate-only); commits nothing. |
| Audit (Grace/Vera) | Verify SoD, threshold adherence, and ledger integrity in the conformance sweep. |

## 7. Enforcement & Audit
Money-movement gates and the QBO-write prohibition enforce structurally (the gauntlet rejects any
agent money-movement ProposedAction; the agent holds no QBO write path). SoD and thresholds are
verified in the Audit & Compliance sweep and the eval goldens (Tess/Grace). The
[coverage-matrix](../coverage-matrix.md) proves every Stream-09 procedure has this policy as a
driver. A violation parks the work and escalates; a repeated or high-severity breach lowers the
agent's dial or trips the kill-switch, and — for humans — invokes the Code of Conduct (§5,
top umbrella) up to disciplinary action.

## 8. Related
**Procedures governed:** Stream 09 (Record → Report); finance steps of Streams 02/05/07/08.
**Related policies:** [BO-05 Billing, AR & Collections](BO-05-billing-ar-and-collections.md) ·
[BO-07 Expense & Reimbursement](BO-07-expense-and-reimbursement.md) ·
[BO-08 Time, Attendance & Payroll](BO-08-time-attendance-and-payroll.md).
**ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + hard ceilings) · ADR-0058 (gauntlet) ·
ADR-0134 (policy-canon architecture).
