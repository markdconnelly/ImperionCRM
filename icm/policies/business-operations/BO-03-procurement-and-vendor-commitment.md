# BO-03 — Procurement & Vendor Commitment

> Distinct Business Operations policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Business Operations Program](BO-00-business-operations-program.md). Governs how
> Imperion spends money on vendors — purchases, renewals, cancellations, license right-sizing,
> and the watch on auto-renew deadlines so the company is never surprised into a charge or
> stranded without a tool. Read the same way by procurement staff and by Vance.

| Field | Value |
| --- | --- |
| **Policy ID** | `BO-03` |
| **Title** | Procurement & Vendor Commitment |
| **Category** | Business Operations |
| **Tier** | distinct |
| **Human owner** | Deputy CFO (Nick) |
| **Governing for (agents)** | Vance (Procurement) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [BO-00](BO-00-business-operations-program.md) + AI Acceptable Use · Data Classification & Handling |

**Framework Alignment:** SOC 2 (CC1 Control Environment · CC9 vendor/third-party risk) · GAAP /
segregation-of-duties (request vs approve vs receive) · ADR-0130 (renewals & auto-renew watch).

---

## 1. Purpose

Every purchase, renewal, and cancellation moves company money and changes what the company can
do. Uncontrolled procurement produces overspend, shelfware (paid-for licenses nobody uses), and
silent auto-renewals that lock in cost before anyone decided to keep the tool. This policy puts a
money gate on every vendor commitment, requires license right-sizing against actual usage, and
sets a deadline sentinel on renewals — so spend is deliberate, defensible, and never a surprise,
whether procurement staff or Vance is running the motion.

## 2. Scope

**Who:** procurement staff; the Deputy CFO and any human spend approver; the Vance agent; anyone
(human or agent) who requests, approves, renews, right-sizes, or cancels a vendor purchase or
subscription. **What:** new purchases, subscription renewals, cancellations, seat/license
right-sizing, vendor onboarding for commercial terms, and the auto-renew deadline watch. Governs
the procurement Operating Procedures in Stream 10 (Run the Company) and the cost basis behind
Stream 02 sales. Vendor *security* risk is governed by the Cybersecurity third-party policy; this
policy governs the *commercial* commitment. The policy binds humans and agents identically except
where §5 narrows or gates Vance's authority.

## 3. Definitions

- **Vendor commitment** — any act that obligates the company to pay or to continue paying: a
  purchase, a renewal, an upgrade/seat-add, or the *non-cancellation* of an auto-renewing
  subscription past its decision deadline.
- **Right-sizing** — matching purchased quantity/tier to actual, measured need (seats in use,
  capacity consumed) — buying neither short nor (the more common failure) long.
- **Shelfware** — paid licenses, seats, or capacity with no corresponding usage; a right-sizing
  failure and the primary target of this policy.
- **Auto-renew deadline** — the last date a subscription can be cancelled or renegotiated before
  it silently renews at its current (often uplifted) terms.
- **Deadline sentinel** — the standing watch that surfaces every approaching auto-renew deadline
  early enough to decide deliberately.
- **Money gate** — the human approval required at the point of any vendor commitment (BO-00 §4).

## 4. Policy Statements

1. **No commitment without approval (the money gate).** No purchase, renewal, upgrade, or
   cancellation that changes spend occurs without the authorized human's approval at the point of
   commitment. Authority is bounded by spend threshold; above it, it escalates.
2. **Approve once, then execute.** Once the human approves a commitment at the money gate, the
   downstream operational steps to fulfill it (place the order, record the asset/license,
   schedule the start, update the registry) may complete without re-gating each step — the
   decision was the spend, not the paperwork.
3. **Right-size against usage.** Every purchase and renewal is sized to measured need. Seat-adds
   and tier upgrades cite actual utilization; renewals are an opportunity to true-down unused
   capacity, not a rubber stamp.
4. **Anti-shelfware.** Standing subscriptions are reviewed for utilization; persistently unused
   licenses are flagged for cancellation or downgrade rather than carried.
5. **Watch every renewal deadline (ADR-0130).** Every auto-renewing agreement is tracked with
   its decision deadline; the deadline sentinel surfaces it early enough to renew, renegotiate,
   right-size, or cancel deliberately. A renewal must never happen by default because nobody was
   warned.
6. **Honest sourcing.** Vendor terms, prices, and renewal dates entered into the system are taken
   from the actual agreement — never estimated, rounded, or fabricated (top-umbrella §5.1).
7. **Segregation of duties.** The party that requests a purchase is not the sole party that
   approves it; receipt/asset-recording is reconcilable against the approved order (GAAP).

## 5. Application to Autonomous Agents

For the actions this policy governs (research vendors, build purchase/renewal requests, watch
deadlines, propose right-sizing and cancellations), Vance operates as follows.

- **Autonomy ceiling — L0–L3.** Vance observes utilization and renewal calendars (L0), proposes
  purchases/renewals/cancellations and right-sizing recommendations (L1), prepares the
  commitment in draft (L2), and — once a commitment is approved — performs the routine
  operational follow-through (L3). Vance is **capped below the level** that would let it commit
  spend on its own.
- **`always_gate` actions (dial-proof floor — money).** **Any purchase, renewal, upgrade, or
  cancellation that changes spend requires a human decision at every dial level.** This is the
  money gate; the dial can never auto-approve it. Vance assembles the complete commitment
  (vendor, terms, price, quantity sized to usage, the deadline, the alternatives) and the human
  commits.
- **Approve-once-at-the-money-gate, then auto-complete.** After the human approves at the gate,
  Vance's downstream operational steps (placing the order, recording the asset/license, updating
  the registry, scheduling the start) complete automatically — the single human decision was the
  spend itself (P3 easy-button generalized to the whole motion).
- **Deadline-sentinel (standing duty).** Vance continuously watches auto-renew deadlines and
  raises each one early — far enough ahead to decide, not after the silent renewal. A missed
  deadline that causes an undecided renewal is a policy failure Vance exists to prevent.
- **No fabrication.** Vance enters vendor terms, prices, and dates only from the actual
  agreement; on missing data it surfaces the gap rather than estimating (top-umbrella §5.1).
- **Human-in-loop & easy-button (P3).** As the dial climbs, Vance's research, sizing, and
  deadline-watch run with less oversight, but the money gate stays absolute. At the gate Vance
  presents the full commitment packet and a one-click approve — never "park and wait."
- **Escalation.** Any commitment above spend threshold, any non-standard term, any renewal where
  right-sizing materially changes cost, and any vendor-risk concern escalate to the Deputy CFO
  (and to Cybersecurity for security risk).
- **Evidence.** Vance logs a tracer for every commitment proposal and execution: the
  usage/right-sizing basis, the terms and deadline, the human approver at the money gate, and the
  downstream steps auto-completed, into the `agent_run`/`agent_message` ledger.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| Deputy CFO (Nick, human) | Owns spend thresholds and the procurement budget; approves commitments at the money gate; final authority on renewals and cancellations above threshold. |
| Procurement staff (human) | Request and right-size purchases; reconcile receipts to approvals; act on deadline-sentinel alerts. |
| Vance (agent) | Researches, sizes, and proposes purchases/renewals/cancellations within L0–L3; gates all spend to the human money gate; auto-completes operational steps after approval; runs the deadline sentinel; logs tracer evidence. |
| Cybersecurity / Cyrus | Owns vendor security risk on referral (distinct from this commercial policy). |

## 7. Enforcement & Audit

The money gate enforces structurally — every spend-changing commitment routes through the
gauntlet (ADR-0058) to an authorized human, and request-vs-approve-vs-receive segregation of
duties (GAAP) is preserved. The deadline sentinel is verified by reconciling tracked deadlines
against actual renewals (no silent default renewals). Audit (Grace/Vera) reviews spend against
approvals and runs the anti-shelfware utilization sweep; QA (Tess) eval goldens cover the
money-gate and approve-once-then-execute behavior. The
[coverage-matrix](../coverage-matrix.md) proves the procurement procedures bind here. A violation
parks the work and escalates; any unapproved commitment lowers Vance's dial or trips the
kill-switch.

## 8. Related

**Procedures governed:** procurement Operating Procedures in Stream 10 (Run the Company);
renewal entries shared with BO-02. **Related policies:**
[BO-00](BO-00-business-operations-program.md) ·
[BO-02](BO-02-sales-pricing-and-commitment-authority.md) (cost basis for quotes; shared renewal
discipline) · [BO-05](BO-05-billing-ar-and-collections.md) (vendor-cost vs customer-billing) ·
Cybersecurity third-party/vendor-risk policy · AI Acceptable Use. **ADRs:** ADR-0130 (renewals &
auto-renew watch) · ADR-0128 (autonomy ladder) · ADR-0109 (dial + ceilings) · ADR-0058
(gauntlet) · ADR-0134 (policy-canon architecture).
