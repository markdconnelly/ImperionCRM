# BO-05 — Billing, Accounts Receivable & Collections

> Distinct Business Operations policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Business Operations Program](BO-00-business-operations-program.md). Governs how
> Imperion invoices, tracks what it is owed, and pursues overdue balances — with QuickBooks
> Online as the system of record, finance acting read-only/advisory, and every collections
> message gated to a human send. Read the same way by finance staff and by Audrey.

| Field | Value |
| --- | --- |
| **Policy ID** | `BO-05` |
| **Title** | Billing, Accounts Receivable & Collections |
| **Category** | Business Operations |
| **Tier** | distinct |
| **Human owner** | Deputy CFO (Nick) |
| **Governing for (agents)** | Audrey (Finance) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [BO-00](BO-00-business-operations-program.md) + AI Acceptable Use · Data Classification & Handling · Privacy & Data Protection |

**Framework Alignment:** GAAP (revenue recognition · AR · segregation-of-duties) · SOC 2 (CC1
Control Environment) · FDCPA-aligned fair-collections conduct (commercial) · QuickBooks Online as
system of record (no money movement outside it).

---

## 1. Purpose

Billing is where delivered work becomes cash, and accounts receivable is the company's
working-capital lifeline. Errors erode trust and revenue; aggressive or sloppy collections damage
client relationships; and any agent touching money is a control risk. This policy ensures
invoices are accurate, AR is aged and acted on promptly, and collections are firm but fair — with
the actual send to a client always made by a human, and QuickBooks Online held as the
single source of record. It reads the same to finance staff and to Audrey.

## 2. Scope

**Who:** the Deputy CFO and finance staff; the Audrey agent; anyone (human or agent) who creates
or reviews an invoice, manages AR, or prepares/sends a collections communication. **What:**
invoice accuracy and issuance, AR aging and reporting, dunning/collections workflow and
correspondence, and reconciliation against QuickBooks Online (the system of record). Governs the
Operating Procedures in Stream 09 (Record → Report). Finance is **read-only/advisory**: QBO is
SoR and no money movement, posting, or invoice change occurs outside the authorized human path.
The policy binds humans and agents identically except where §5 narrows or gates Audrey's
authority.

## 3. Definitions

- **Invoice accuracy** — the invoice reflects what was actually contracted and delivered: correct
  rate (per BO-02), correct quantity/scope, correct customer, correct period — no fabricated or
  estimated line items.
- **Accounts Receivable (AR)** — amounts owed to Imperion for delivered, invoiced work.
- **AR aging** — the classification of receivables by how overdue they are (e.g. current, 30/60/90+
  days), driving collections priority.
- **Dunning / collections** — the escalating sequence of reminders and demands for overdue
  balances.
- **Collections send** — the act of transmitting a dunning/collections message to a client; a
  client-facing communication and therefore `always_gate`.
- **System of record (SoR)** — QuickBooks Online. The authoritative financial state; Imperion OS
  reads/mirrors it but does not move money or post entries outside the authorized human path.

## 4. Policy Statements

1. **Invoices are accurate before issue.** Every invoice is reconciled to the contract/quote
   (BO-02) and to delivered work before issuance: right customer, rate, quantity, scope, and
   period. No fabricated, estimated, or duplicate line items (top-umbrella §5.1).
2. **AR is aged and acted on.** Receivables are aged on a regular cadence; overdue balances are
   surfaced and worked by priority. AR is not allowed to drift unreviewed.
3. **Collections are firm but fair.** Dunning is professional, accurate as to amount and age, and
   escalates on a defined schedule. No threats, no misrepresentation of amount owed or
   consequence, no harassment (FDCPA-aligned conduct).
4. **The send is human.** Every collections/dunning communication to a client is sent by an
   authorized human. Detection, aging, and drafting may be automated; the transmission is gated.
5. **QBO is the system of record.** Financial truth lives in QuickBooks Online. No money is moved,
   no entry posted, and no invoice altered outside the authorized human path; Imperion OS reads
   and mirrors but does not write financial state.
6. **Segregation of duties (GAAP).** The party that bills is not the sole party that records
   payment or adjusts/writes off a balance; adjustments and write-offs require the authorized
   human and are documented.
7. **Confidentiality.** Customer financial data is PII-class; handled per the Privacy and Data
   Classification policies and never disclosed across a boundary.

## 5. Application to Autonomous Agents

For the actions this policy governs (reconcile invoices, age AR, detect overdue balances, draft
dunning), Audrey operates as follows.

- **Autonomy ceiling — read-only, L2.** Audrey reads QBO and the AR ledger (L0), analyzes and
  ages receivables and flags discrepancies (L1), and drafts dunning correspondence and AR reports
  (L2). Audrey **tops out at L2** — it detects, drafts, and ages; it never executes financial
  state changes or external sends on its own.
- **`always_gate` actions (dial-proof floor).**
  - **The collections send** — transmitting any dunning/collections message to a client is a
    human `[gui-step]` / `always_gate` at every dial level. Audrey drafts the message and stages
    the send; the human clicks send.
  - **Any money movement / posting / invoice change** — moving money, posting an entry, adjusting
    or writing off a balance, or altering an invoice requires the authorized human and occurs in
    QBO (SoR). Audrey never performs these.
- **No money movement, QBO is SoR.** Audrey has no write authority over financial state. It reads
  and mirrors QBO; it never moves money or posts entries. This holds at every dial level and is
  not waivable.
- **No fabrication.** Audrey never invents an amount, an aging, or a line item; reconciliation
  flags discrepancies to a human rather than guessing. On missing data it surfaces the gap
  (top-umbrella §5.1, §5.4).
- **Confidentiality / non-disclosure.** Customer financial data is PII-class; Audrey never
  discloses it across a boundary, and salary/payroll data is refusal-class non-disclosure
  (BO-00 §4).
- **Human-in-loop & easy-button (P3).** As the dial climbs, Audrey's detection, aging, and
  drafting run with less oversight, but the collections send and every financial write stay
  human-gated. At the send gate Audrey presents the full draft (recipient, amount, aging, tone,
  escalation step) and a one-click send — never "park and wait," and never an auto-send path.
- **Escalation.** Any reconciliation discrepancy, any disputed balance, any proposed write-off or
  adjustment, and any aged balance crossing an escalation threshold go to the Deputy CFO /
  finance.
- **Evidence.** Audrey logs a tracer for every aging run and drafted dunning: the AR basis, the
  reconciliation result, the staged send and its human sender, into the
  `agent_run`/`agent_message` ledger.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| Deputy CFO (Nick, human) | Owns AR strategy, the dunning schedule, and write-off authority; performs/authorizes all money movement, postings, and collections sends; owns QBO as SoR. |
| Finance staff (human) | Reconcile and issue invoices; record payments; send the human-gated collections messages; act on aging escalations. |
| Audrey (agent) | Reads QBO, ages AR, reconciles invoices, drafts dunning and reports within read-only L2; gates every send and every financial write to a human; never moves money; logs tracer evidence. |
| Sales / Chase (BO-02) | Source of the contracted rate/terms the invoice must match. |

## 7. Enforcement & Audit

Control enforces structurally — Audrey has no financial write authority, the collections send is
a human `[gui-step]`, and money movement/postings occur only in QBO through the authorized human
path (routed through the gauntlet, ADR-0058). GAAP segregation of duties is preserved between
billing, payment recording, and adjustment/write-off. Audit (Grace/Vera) reconciles issued
invoices to contracts and AR to QBO, and reviews dunning conduct for fairness and accuracy; QA
(Tess) eval goldens cover the human-gated-send and no-money-movement cases. The
[coverage-matrix](../coverage-matrix.md) proves Stream 09 procedures bind here. A violation parks
the work and escalates; any unauthorized financial write or auto-send attempt trips the
kill-switch.

## 8. Related

**Procedures governed:** Operating Procedures in Stream 09 (Record → Report) — invoicing, AR
aging, and dunning entries. **Related policies:**
[BO-00](BO-00-business-operations-program.md) ·
[BO-02](BO-02-sales-pricing-and-commitment-authority.md) (quote → invoice accuracy) ·
[BO-03](BO-03-procurement-and-vendor-commitment.md) (vendor-cost vs customer-billing) · BO-06
(Financial Management & Controls) · Privacy & Data Protection · Data Classification & Handling.
**ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + ceilings) · ADR-0058 (gauntlet) ·
ADR-NNNN (policy-canon architecture).
