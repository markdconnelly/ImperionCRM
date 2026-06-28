# BO-02 — Sales, Pricing & Commitment Authority

> Distinct Business Operations policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Business Operations Program](BO-00-business-operations-program.md). Governs how
> Imperion sells — who may quote, who may discount, who may commit the company to a price,
> term, scope, or timeline, and the hard rule that nothing binding is ever fabricated or
> promised without authority. Read the same way by sales staff and by Chase.

| Field | Value |
| --- | --- |
| **Policy ID** | `BO-02` |
| **Title** | Sales, Pricing & Commitment Authority |
| **Category** | Business Operations |
| **Tier** | distinct |
| **Human owner** | Deputy CFO (Nick) |
| **Governing for (agents)** | Chase (Sales) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [BO-00](BO-00-business-operations-program.md) + AI Acceptable Use · Data Classification & Handling |

**Framework Alignment:** SOC 2 (CC1 Control Environment — authority & accountability) · GAAP /
segregation-of-duties (quote vs approve) · FTC truth-in-advertising (no false urgency) · ADR-0130
(renewals & commitment authority).

---

## 1. Purpose

A quote, a discount, a stated term, a delivery date — each is a commitment that binds Imperion
and sets the customer's expectation. Commitments must come from someone with the authority to
make them and must always be true. This policy fixes who may quote and discount, how proposals
are approved, and the absolute prohibition on fabricating pricing, terms, timelines, or
capabilities — so a customer can trust every number we put in front of them, whether a human
salesperson or Chase produced it.

## 2. Scope

**Who:** sales staff; the Deputy CFO and any human pricing approver; the Chase agent; anyone
(human or agent) who builds a quote, applies a discount, drafts a proposal, or makes a
forward-looking statement to a prospect. **What:** quoting, discounting, proposal/SOW
construction and approval, stated terms and timelines, and the qualification-to-close motion.
Governs the Operating Procedures in Stream 02 (Lead → Cash). Where a quote derives from a system
of record (the KQM quote SoR, read-only), that source wins; nothing is invented around it. The
policy binds humans and agents identically except where §5 narrows or gates Chase's authority.

## 3. Definitions

- **Quote** — a priced offer for defined scope; a commitment the moment it reaches the customer.
- **Discount authority** — the bounded right to reduce list/standard price; defined per role and
  per threshold (a discount above the threshold escalates to the next authority).
- **Commitment** — any binding statement of price, term, scope, deliverable, SLA, or timeline
  that the customer may reasonably rely on.
- **Proposal / SOW** — the document that packages scope, price, and terms; binding on execution.
- **Fabrication** — stating any price, term, timeline, capability, or availability that is not
  true and on file; prohibited absolutely (top-umbrella §5.1).

## 4. Policy Statements

1. **Authority is required to commit.** No quote, discount, term, or timeline is presented to a
   customer except by, or with the explicit approval of, the role authorized for that
   commitment. Authority is bounded by threshold; exceeding it escalates upward.
2. **Pricing follows the rate card.** Quotes derive from the approved rate card / quote source of
   record. Off-card pricing requires the authorized human's approval and is documented.
3. **Discounts within authority only.** A discount within a role's threshold may be applied by
   that role; above it, it escalates. Discounts are never granted to manufacture urgency.
4. **Nothing fabricated.** No fabricated pricing, discounts, terms, scope, capabilities,
   availability, references, or timelines. If a number or date is unknown, the responsible party
   says so and obtains it — never invents it (top-umbrella §5.1, §5.4).
5. **No false urgency.** Deadlines, expiring prices, and scarcity are stated only when literally
   true. Pressure tactics are prohibited.
6. **Proposals are approved before they go out.** Every proposal/SOW is reviewed and approved by
   the authorized human (pricing/legal exposure checked) before it reaches the customer.
7. **Honest forecasting.** Internal pipeline, probability, and close-date entries are honest;
   no inflating a stage or fabricating activity to dress a forecast.
8. **Renewals are commitments too (ADR-0130).** A renewal quote, uplift, or term change follows
   the same authority and approval rules as a new sale.

## 5. Application to Autonomous Agents

For the actions this policy governs (qualify, build quotes, draft proposals, communicate terms),
Chase operates as follows.

- **Autonomy ceiling — L1 propose-default.** Chase's working level is **propose**: it qualifies
  leads, assembles draft quotes from the rate card, drafts proposals/SOWs, and prepares
  customer-facing language — all as proposals for a human to commit. Chase does not self-promote
  to externally committing levels for priced or binding actions.
- **`always_gate` actions (dial-proof floor).** **Pricing, discounting, and any commitment**
  (quote release, discount application, term/timeline/scope statement, proposal send, renewal
  terms) require a human decision at **every** dial level. Chase builds the complete artifact;
  the authorized human commits it.
- **Never fabricate (hard floor).** Chase never states a price, discount, term, timeline,
  capability, availability, or reference that is not on file and true. On missing data it
  surfaces the gap and stops — it does not fill it with an invented value. This holds at every
  dial level and is not waivable.
- **No false urgency.** Chase never authors expiring-offer, countdown, or scarcity language
  unless it is literally true and substantiated.
- **Human-in-loop & easy-button (P3).** Even as the dial climbs and routine qualification work
  recedes from review, the pricing/discount/commitment gate remains absolute. At the gate Chase
  presents the full quote/proposal — scope, rate-card derivation, any discount and its
  justification, terms, timeline basis — and hands the human a single approve/adjust/deny. It is
  never "park and wait"; the work is staged to one click.
- **Escalation.** Any discount above threshold, any off-card price, any non-standard term, any
  customer request Chase cannot meet truthfully, and any commitment with legal exposure escalate
  to the Deputy CFO / authorized approver.
- **Evidence.** Chase logs a tracer for every quote/proposal: the rate-card derivation, any
  discount and its approval, the stated terms/timeline and their basis, and the human approver,
  into the `agent_run`/`agent_message` ledger.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| Deputy CFO (Nick, human) | Owns the rate card and discount thresholds; approves off-card pricing, non-standard terms, and proposals above authority; final commitment authority. |
| Sales staff (human) | Qualify, quote within authority, draft proposals, commit within their threshold; escalate above it. |
| Chase (agent) | Qualifies and drafts quotes/proposals at L1 propose; gates all pricing/discount/commitment to a human; never fabricates; never uses false urgency; logs tracer evidence. |
| Legal / Laurel | Reviews non-standard terms and contractual exposure on referral. |

## 7. Enforcement & Audit

Commitment control enforces structurally — the pricing/discount/commitment gate routes every
binding action through the gauntlet (ADR-0058) to an authorized human, and discount thresholds
are checked before application. Quote-vs-approve segregation of duties (GAAP) is preserved: the
party that builds a quote is not the party that commits an above-threshold one. Audit
(Grace/Vera) reconciles released quotes against rate card and approvals; QA (Tess) eval goldens
cover the no-fabrication and no-false-urgency cases. The
[coverage-matrix](../coverage-matrix.md) proves Stream 02 procedures bind here. A violation parks
the work and escalates; fabrication or unauthorized commitment lowers Chase's dial or trips the
kill-switch.

## 8. Related

**Procedures governed:** Operating Procedures in Stream 02 (Lead → Cash) — quote, proposal, and
close entries; renewal entries shared with BO-03. **Related policies:**
[BO-00](BO-00-business-operations-program.md) · [BO-01](BO-01-marketing-and-communications.md)
(lead hand-off) · [BO-03](BO-03-procurement-and-vendor-commitment.md) (cost basis / renewals) ·
[BO-04](BO-04-client-success-and-advisory.md) (no-commits boundary) ·
[BO-05](BO-05-billing-ar-and-collections.md) (quote → invoice accuracy). **ADRs:** ADR-0130
(renewals & commitment authority) · ADR-0128 (autonomy ladder) · ADR-0109 (dial + ceilings) ·
ADR-0058 (gauntlet) · ADR-NNNN (policy-canon architecture).
