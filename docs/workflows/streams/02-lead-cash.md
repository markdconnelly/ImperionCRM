# Stream 02 — Lead → Cash

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-NNNN](../../decision-records/ADR-NNNN-operating-procedure-catalog.md). Terms in
> [`CONTEXT.md`](../../../CONTEXT.md).
>
> **D9 global principles apply to every procedure** (encoded in Human-in-loop, not restated):
> **P1** Nova-native co-working · **P2** reasoning ascribed to the paired human, up-chain · **P3**
> easy-button at every gate · **P4** urgent → dedicated chat / else → Teams tag. Driving policy =
> `TBD (mark-blocker: company-policy-collection)` (D4, #1586) unless named.

**Owners:** Chase (Sales) · Vance (Procurement). Audrey (Finance) appears ONLY as
margin-grounding hand-off STEPS (her owned procedures live in Stream 09).
**subject:** every procedure runs `subject=client` by default; the full Vance set also runs
`subject=imperion` (Imperion procures for itself); Chase's customer procedures do not.

**Standing facts shaping the stream**
- Canonical L0–L5 ladder (ADR-0128) + dial-proof `always_gate`. Chase default L1; Vance
  L0–L3 with an **architectural money ceiling** (migration 0184).
- Chase **has no send path** — drafts and parks; every customer-facing commitment
  (quote/renewal send, pricing/discount/term) is `always_gate`.
- **Belle→Chase seam = the `lead_score` MQL crossing** (no action). Chase→Pierce seam =
  opportunity `won` (ADR-0096) → Stream 03.
- **KQM is quote SoR, READ-ONLY** (ADR-0080); native CPQ gutted. Chase reads quotes, never builds them.
- **Vance = sentinel, not buyer.** Deadline Sentinel = alert + drafted rec; the
  renew/cancel/buy actuation is `always_gate`. **Approve-once-at-the-money-gate** (0184).
- Procurement is **catalog-anchored** (#1306) — off-catalog routes to a human.
- **Dormancy flags:** #389 worker-recall · #991 handoff bus · #119 trigger-sync · #668
  AR/invoice entity (#1580) · DocuSign-consent · 0184 (postured withheld) · Pax8-bronze ·
  KQM-bronze.

---

## A. CHASE (Sales)

### 02-A1 — Qualify routed lead (MQL → SQL)
- **Trigger:** Nova summons Chase post-score — a lead whose `lead_score` crossed the threshold.
- **Terminal outcome:** lead dispositioned — **SQL**, **disqualified** (logged), or **nurture-return**.
- **Steps:** 1. `[automation]` confirm the score crossing (L0 read). 2. `[automation]` build the
  qualification dossier. 3. `[hybrid]` write the MQL→SQL fit decision logic (Chase drafts; human
  co-shapes at low dial). 4. `[gui-step]` disposition (accept→SQL / disqualify / return-to-nurture).
- **Realization:** ICM `icm/domains/sales/lead-response/` (qualification rides stages 01–02).
- **Autonomy ceiling:** L2 (auto-document opportunity = internal-reversible). No `always_gate`.
- **Human-in-loop:** Sales role (Mark proxy / Nick oversight v1); L1 co-shape+confirm → L2 auto-document.
- **Substrate deps:** #389, #991, #119. **subject:** client.

### 02-A2 — Open & document the opportunity
- **Trigger:** a lead qualified to SQL (02-A1 accept).
- **Terminal outcome:** an `opportunity` exists, documented with stage/attribution/next action.
- **Steps:** 1. `[automation]` create the silver `opportunity` (merged; `website_opportunities`
  highest precedence). 2. `[hybrid]` attach sales notes + knowledge upload (#1429). 3. `[automation]`
  set stage/attribution/owner; emit into the sales queue.
- **Realization:** ICM (sales) — leaf #1416. **Autonomy ceiling:** L2 auto-internal. No `always_gate`.
- **Human-in-loop:** Sales role; L2 auto-document with audit. **Substrate deps:** KQM-bronze, #119. **subject:** client.

### 02-A3 — Pursue the opportunity (pipeline management)
- **Trigger:** an open `opportunity` with a due next action, or a new inbound signal.
- **Terminal outcome:** opportunity advanced a stage, or held with a logged next touch.
- **Steps:** 1. `[automation]` surface the next-best action. 2. `[hybrid]` draft the touch,
  respecting opt-outs/frequency caps (hard stop); park. 3. `[gui-step]` human approves/sends. 4.
  `[automation]` log + re-stage + re-queue.
- **Autonomy ceiling:** L1 → L3 (auto low-risk acknowledgement). **`always_gate`:** any pricing/
  discount/term assertion or send-for-signature.
- **Human-in-loop:** Sales role; commitment-class touch always human. **subject:** client.

### 02-A4 — Respond to inbound social/DM lead touch
- **Trigger:** an intent-routed inbound social inquiry on an open/net-new deal (from Belle).
- **Terminal outcome:** a drafted, consent-clean reply parked for send.
- **Steps:** 1. `[automation]` receive routed inbound. 2. `[hybrid]` draft channel-aware reply
  (no fabricated capability/timeline/price). 3. `[gui-step]` human approves/sends.
- **Autonomy ceiling:** L1 → L3 routine; commitment edge `always_gate`. **Realization:** leaf #1414. **subject:** client.

### 02-A5 — Quote hand-off (KQM read-only seam)
- **Trigger:** a qualified opportunity reaching proposal that needs a priced quote.
- **Terminal outcome:** quoting routed to KQM (the quote SoR); the quote ingested + reflected on
  the opportunity — **reflected, not built.**
- **Steps:** 1. `[gui-step]` Chase/seller produces the quote **in KQM** (Imperion builds none;
  ADR-0080). 2. `[automation]` KQM quote ingested → bronze (LP) → merged to silver `opportunity`.
  3. `[hybrid]` Chase reviews the reflected quote; flags discrepancy.
- **Autonomy ceiling:** L0/L1 — Chase reads/flags; pricing is never Chase's call. **Realization:**
  procedure-only (KQM external SoR). **OWNERSHIP NOTE:** the quote-build act lives in KQM, not an
  Imperion agent — Imperion owns only the reflection (flagged for Mark). **subject:** client.

### 02-A6 — Close / won hand-off to delivery
- **Trigger:** opportunity reaches **`won`** (KQM `status==3` ⇔ `salesOrderId>0`).
- **Terminal outcome:** closed-won and **handed to Pierce** for provisioning (exit to Stream 03);
  relationship Handoff to Celeste.
- **Steps:** 1. `[automation]` detect `won`; stamp closed-won + close date + attribution. 2.
  `[automation]` emit the **sale→delivery handoff** (ADR-0096) — catalog-anchored line-items select
  the template (#1306). [→ Pierce, Stream 03]. 3. `[automation]` emit the relationship **Handoff →
  Celeste** [→ Stream 08].
- **Autonomy ceiling:** L2 (state stamp + emit handoff). DocuSign contract gate is a HARD
  precondition on Pierce's *provisioning* side, not Chase's close. **subject:** client.

### 02-A7 — Draft contract renewal & repricing
- **Trigger:** a `contract_renewal` enters the pipeline — an expiring `contract` surfaced by the
  expiry radar (handed FROM Vance's Deadline Sentinel for cost-pass-through inputs; the renewal
  record is Sales-owned).
- **Terminal outcome:** a renewal quote drafted with proposed-vs-current pricing + margin, parked
  for the customer-facing send — `identified → priced → quoted`.
- **Steps:** 1. `[automation]` expiry radar surfaces the agreement → `identified` [← Vance #1481].
  2. `[automation]` derive repricing (CPI/escalation %, cost-pass-through, #1041) → `priced`. 3.
  `[hybrid]` **margin grounding** — Audrey supplies proposed-vs-historical margin (advise-only,
  #1415; she does not gate) [↔ Audrey, Stream 09]. 4. `[hybrid]` Chase drafts the renewal quote →
  `quoted`. 5. `[gui-step]` human reviews pricing + margin (revenue RBAC-gated, ADR-0030).
- **Autonomy ceiling:** L1 propose. **`always_gate`:** the pricing commitment + send-for-signature (02-A8).
- **Substrate deps:** `contract_renewal` (#1324), #1041 true-up, ADR-0030. **subject:** client.

### 02-A8 — Send renewal for signature & update agreement ⛔
- **Trigger:** a `contract_renewal` in `quoted` with human approval of pricing.
- **Terminal outcome:** renewal e-signed + agreement updated — terminal **`renewed | repriced |
  churned`** (feeds churn scoring #1046).
- **Steps:** 1. `[gui-step]` **`always_gate`** — human authorizes the customer-facing send. 2.
  `[automation]` `send-for-esignature` (DocuSign/`esign`, ADR-0071) → `sent`. 3. `[automation]` on
  signature → update agreement; `autotask-writeback` (Autotask = contract SoR) → `renewed`/`repriced`.
  4. `[automation]` if declined/lapsed → `churned` + Handoff to Celeste [→ Stream 08].
- **Autonomy ceiling:** **`always_gate`** on the send — dial-proof. Post-signature update L2/L3.
- **Substrate deps:** DocuSign-consent, Autotask write-back (#422/#425), #1046. **subject:** client.

---

## B. VANCE (Procurement)

### 02-B1 — Renewal/cancellation Deadline Sentinel  *(highest-value Vance procedure)*
- **Trigger:** schedule — a vendor subscription/agreement approaching auto-renew or its
  cancellation-window close (watched over Pax8 bronze + `license_assignment` + contracts).
- **Terminal outcome:** a **timely alert + drafted renew/cancel recommendation** before the
  deadline — **no deadline passes unseen.** Actuation is NOT here.
- **Steps:** 1. `[automation]` watch every deadline (L2 auto-watch, #1481). 2. `[automation]` raise
  a timely alert (deadline + dollars). 3. `[hybrid]` draft a renew/cancel recommendation. 4.
  `[automation]` route — client-contract renewals → Chase (02-A7) [→ Chase].
- **Autonomy ceiling:** L2 (watch + alert + draft). **The actuation is `always_gate`** (0184) —
  handled in 02-B2. **subject:** **both** (client vendor agreements AND Imperion's own subscriptions).

### 02-B2 — Governed procurement sequence (Pax8 procure → provision → bill) ⛔
- **Trigger:** an approved sourcing need — a catalog-anchored SKU to be ordered. Off-catalog →
  routes to a human (refuse to auto-procure).
- **Terminal outcome:** order placed, license provisioned, agreement attached, bill attached —
  **procurement fulfilled** (one approval, run-all).
- **Steps:** 1. `[hybrid]` Vance drafts the order/PO (catalog-anchored, #1306). 2. `[gui-step]`
  **`always_gate` MONEY GATE** — ONE human approval at `pax8_place_order` authorizes the whole
  sequence (approve-once, 0184). 3–5. `[automation]` `m365_provision_license`, `agreement_attach`,
  `bill_attach` auto-complete post-approval (L3); the bill is the **billing consequence** of the
  approved purchase [→ Audrey, Stream 09].
- **Autonomy ceiling:** money step **`always_gate`** (permanent); operational + billing-consequence
  steps L3 auto post-approval. **Realization:** leaf #1487; seeded by migration **0184** (withheld v1).
- **Substrate deps:** 0184, Pax8-bronze, Autotask write-back, #119. **subject:** **both.**

### 02-B3 — Shelfware detection & reclaim recommendation
- **Trigger:** schedule — a sweep for paid-for-but-unassigned/unused licenses.
- **Terminal outcome:** a **reclaim recommendation with dollars**, parked — **wasted spend surfaced.**
- **Steps:** 1. `[automation]` detect shelfware (#1482). 2. `[automation]` quantify reclaimable $.
  3. `[hybrid]` draft a reclaim rec (cancel/downgrade). 4. `[automation]` the commit → 02-B2 money gate.
- **Autonomy ceiling:** L1/L2 (detect + flag + draft); cancel/downgrade commit `always_gate` (02-B2). **subject:** both.

### 02-B4 — Under-licensing / compliance flag
- **Trigger:** schedule — under-licensing / license-compliance exposure vs the service catalog (#1306).
- **Terminal outcome:** a **compliance-exposure flag** — **risk surfaced** (Vance errs to risk-over-cost).
- **Steps:** 1. `[automation]` cross-ref entitlements vs catalog (#1483). 2. `[automation]` classify
  exposure. 3. `[automation]` flag.
- **Autonomy ceiling:** L2 (detect + flag); any remediation buy → 02-B2. **subject:** both.

### 02-B5 — License right-sizing / optimization
- **Trigger:** schedule — utilization analysis showing over-provisioning / consolidatable SKUs.
- **Terminal outcome:** a **right-sizing recommendation** (consolidate/downgrade), parked.
- **Steps:** 1. `[automation]` match SKU/quantity to utilization (#1488). 2. `[hybrid]` draft rec.
  3. `[automation]` surface; commit → 02-B2.
- **Autonomy ceiling:** L1/L2; commit `always_gate` (02-B2). (Vendor-record model stub, #1311.) **subject:** both.

### 02-B6 — Pax8 order-status watchdog
- **Trigger:** an in-flight Pax8 order (placed → provisioned → billed).
- **Terminal outcome:** a **stall/failure alert** — **order health assured.**
- **Steps:** 1. `[automation]` watch transitions (#1485). 2. `[automation]` detect stall/failure vs
  SLA. 3. `[automation]` alert (→ human / 02-B2).
- **Autonomy ceiling:** L2 (watch + alert). **subject:** both.

### 02-B7 — Vendor cost monitoring & variance
- **Trigger:** schedule — vendor cost refresh; variance vs expected.
- **Terminal outcome:** a **cost-variance flag fed to Audrey** for reconciliation/true-up.
- **Steps:** 1. `[automation]` monitor cost; compute variance (#1484). 2. `[automation]` flag. 3.
  `[automation]` **hand to Audrey** (read-only money, #1041/#1394) [→ Stream 09].
- **Autonomy ceiling:** L2 (monitor + flag → Audrey); money commitment gated. **subject:** both.

### 02-B8 — Vendor risk / EOL advisory
- **Trigger:** a vendor risk/EOL signal (price hike, EOL, instability).
- **Terminal outcome:** a **vendor-risk advisory handed to Celeste** as a vCIO/relationship signal.
- **Steps:** 1. `[automation]` detect risk/EOL (#1486). 2. `[automation]` flag + characterize. 3.
  `[automation]` **hand to Celeste** [→ Stream 08].
- **Autonomy ceiling:** L2 (flag → Celeste). **subject:** both.

### 02-B9 — Vendor consolidation / spend-optimization advisory
- **Trigger:** schedule — duplicate tools / overlapping vendors across the stack.
- **Terminal outcome:** a **consolidation + savings advisory** routed to Audrey (spend) + Celeste (vCIO).
- **Steps:** 1. `[automation]` detect overlap (#1489). 2. `[hybrid]` draft advisory + savings. 3.
  `[automation]` route → Audrey (#1041) + Celeste (#1396).
- **Autonomy ceiling:** L1/L2; any consolidation buy/cancel → 02-B2. (Vendor map gated on #1311.) **subject:** both.

### 02-B10 — Source a won deal's procurement (deal → sourcing draft)
- **Trigger:** a won opportunity whose sold line-items require licenses/SKUs (Chase→Vance seam off
  the ADR-0096 spine).
- **Terminal outcome:** a **sourcing draft** ready for the money gate — **procurement prepared.**
- **Steps:** 1. `[automation]` receive the won deal's catalog-anchored line-items [← Chase 02-A6].
  2. `[hybrid]` Vance drafts the sourcing plan (catalog-anchored; off-catalog → human). 3.
  `[automation]` stage the order for 02-B2 [→ 02-B2; and → Pierce delivery-procurement, Stream 03].
- **Autonomy ceiling:** L1/L2 (draft + stage); the buy is `always_gate` (02-B2). Candidate new leaf
  under #1398. **subject:** client (Imperion-self when Imperion "wins" an internal need).

---

## Coverage notes

**Count: 18 Operating Procedures** — Chase 8 (02-A1…A8) · Vance 10 (02-B1…B10).

**Seams:** Stream 03 (Pierce) = 02-A6 boundary; Stream 08 (Celeste) = 02-A6/A8/B8/B9 emit Handoffs
(she owns relationship, assigns back to Chase — the pinned seam); Stream 09 (Audrey) =
margin-grounding (A7) + bill_attach (B2) + cost-variance/consolidation (B7/B9). **AR/cash collection
is OUT** — "→ Cash" terminates at e-signed agreement / procurement-fulfilled + billing-consequence;
AR/invoice/collections belongs to Stream 09 (blocked on #1580). Nearly every procedure is
deploy-dormant pending creds + collectors.
