# Stream 02 — Lead → Cash

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-0133](../../decision-records/ADR-0133-operating-procedure-catalog.md). Terms in
> [`CONTEXT.md`](../../../CONTEXT.md).
>
> **Workflow Doctrine (ADR-0136) is inherited by every procedure below — not restated per entry.**
> The eleven cross-cutting rules (A1–A11) and the nine archetype step-templates (B1–B9) are the
> floor. Each procedure names its **archetype** and declares only its *deltas*. The doctrine carries:
> the universal `always_gate` set (A2) · L0 ship-dial (A3) · the 4-part easy-button bar at every gate
> (A4) · the evidence floor — cite + as-of, empty→park/delegate (A5) · computed-urgency notification
> + `reports_to` fallback (A6) · pool-never-bleed (A7) · idempotent actuation + read-back (A9) ·
> reversibility→derived-ceiling + halt-no-rollback (A10) · obligation/action separation (A11).

**Owners:** Chase (Sales) · Vance (Procurement). Audrey (Finance) appears ONLY as
margin-grounding hand-off STEPS (her owned procedures live in Stream 09).
**subject:** every procedure runs `subject=client` by default; the full Vance set also runs
`subject=imperion` (Imperion procures for itself); Chase's customer procedures do not.

**Standing facts shaping the stream**
- Canonical L0–L5 ladder (ADR-0128) + dial-proof `always_gate`. Chase default L1; Vance
  L0–L3 with an **architectural money ceiling** (migration 0184). All procedures **ship at L0**
  (A3 ship-dial); the ceilings below are the earned cap, not the day-one floor.
- Chase **has no send path** — drafts and parks; every customer-facing commitment
  (quote/renewal send, pricing/discount/term) is `always_gate` (A2 class-2). This no-send rule
  *is* Chase's A11 obligation/action separation: he owns the transaction/close, never the act of
  speaking to the customer.
- **Belle→Chase seam = the `lead_score` MQL crossing** (no action; A11 seam). Chase→Pierce seam =
  opportunity `won` (ADR-0096) → Stream 03 (A11 seam).
- **KQM is quote SoR, READ-ONLY** (ADR-0080); native CPQ gutted. Chase reads quotes, never builds
  them — KQM is external SoR, the agent mirrors (A9a).
- **Vance = sentinel, not buyer** (A11). Deadline Sentinel = alert + drafted rec; the
  renew/cancel/buy actuation is `always_gate`. **Approve-once-at-the-money-gate** (0184, A2 class-1 —
  money out has no clean undo ⇒ gated forever, A10 row 4).
- Procurement is **catalog-anchored** (#1306) — off-catalog routes to a human (refuse-precondition).
- **Dormancy flags (A5c — deepened steps depending on these ship propose-only):** #389 worker-recall ·
  #991 handoff bus · #119 trigger-sync · #668 AR/invoice entity (#1580) · DocuSign-consent ·
  0184 (postured withheld) · Pax8-bronze · KQM-bronze.

**Archetype map (B-templates this stream instantiates).**

| Procedure | Archetype |
|---|---|
| 02-A1 qualify MQL→SQL | **B1 triage/route** |
| 02-A2 open & document opportunity | **B1** (disposition/log) |
| 02-A3 pursue the opportunity | **B7 client-facing-send** (the touch) |
| 02-A4 inbound social/DM touch | **B7 client-facing-send** |
| 02-A5 quote hand-off (KQM) | **A11 seam** → external-SoR mirror (A9) |
| 02-A6 close/won hand-off | **A11 seam** (state-stamp + emit to Pierce/Celeste) |
| 02-A7 draft renewal & repricing | **B7** prep + **A11 seam** (Audrey margin) |
| 02-A8 send renewal for signature ⛔ | **B7 client-facing-send** (the SEND GATE) |
| 02-B1 Deadline Sentinel | **B9 deadline-sentinel** |
| 02-B2 governed procurement ⛔ | **B6 money-gate** |
| 02-B3 shelfware detect & reclaim | **B4 audit-attest** (commit → B6) |
| 02-B4 under-licensing flag | **B4 audit-attest** |
| 02-B5 right-sizing / optimization | **B4 audit-attest** (commit → B6) |
| 02-B6 Pax8 order-status watchdog | **B9 deadline-sentinel** (order health) |
| 02-B7 vendor cost variance | **B4 audit-attest** → Audrey seam |
| 02-B8 vendor risk / EOL advisory | **B9 deadline-sentinel** → Celeste seam |
| 02-B9 consolidation advisory | **B4 audit-attest** (commit → B6) |
| 02-B10 source a won deal | **A11 seam** → B6 staging |

**Driving policy (every procedure):** inherits the doctrine universal baseline (ADR-0136 A2/A4/A5)
+ `TBD (mark-blocker: company-policy-collection)` (D4, #1586) for the procedure-specific drivers.

---

## A. CHASE (Sales)

### 02-A1 — Qualify routed lead (MQL → SQL)
- **Archetype:** B1 triage/route. **Trigger:** Nova summons Chase post-score — a lead whose
  `lead_score` crossed the threshold. **SEAM: accepts the Belle→Chase MQL crossing** (A11; no action,
  the crossing carries the rationale up-chain).
- **Terminal outcome:** lead dispositioned — **SQL**, **disqualified** (logged), or **nurture-return**.
- **Steps** (B1: ground → classify → resolve-owner → disposition → log): 1. `[automation]` **Ground** —
  confirm the score crossing, **citing `lead_score` + as-of** (A5; empty/unparseable → park) (L0 read).
  2. `[automation]` **Resolve owner** — build the qualification dossier (resolve Client Mapping for the
  owning `okf:account`); pool-correlate similar prior leads internally only (A7). 3. `[hybrid]`
  **Classify** the MQL→SQL fit decision logic (Chase drafts; human co-shapes at low dial). 4.
  `[gui-step]` **Disposition + log** (accept→SQL / disqualify / return-to-nurture).
- **Realization:** ICM `icm/domains/sales/lead-response/` (qualification rides stages 01–02).
- **Autonomy ceiling:** L2 (disposition/document = internally reversible, A10 row 1). No `always_gate`
  (routing auto-executes at L2 per B1; no high-risk-symptom carve-out applies here).
- **Human-in-loop:** Sales role (Mark proxy / Nick oversight v1); L1 co-shape+confirm → L2 auto-document.
- **Substrate deps:** #389, #991, #119. **subject:** client.

### 02-A2 — Open & document the opportunity
- **Archetype:** B1 (disposition/log tail of qualification). **Trigger:** a lead qualified to SQL
  (02-A1 accept).
- **Terminal outcome:** an `opportunity` exists, documented with stage/attribution/next action.
- **Steps** (B1: ground → resolve → disposition → log): 1. `[automation]` **Ground + create** the
  silver `opportunity` (merged; `website_opportunities` highest precedence), **citing the source merge
  + as-of** (A5). 2. `[hybrid]` attach sales notes + knowledge upload (#1429). 3. `[automation]`
  **Disposition + log** — set stage/attribution/owner; emit into the sales queue (attributed up-chain, P2).
- **Realization:** ICM (sales) — leaf #1416. **Autonomy ceiling:** L2 (create/document = internally
  reversible, A10 row 1). No `always_gate`.
- **Human-in-loop:** Sales role; L2 auto-document with audit. **Substrate deps:** KQM-bronze, #119. **subject:** client.

### 02-A3 — Pursue the opportunity (pipeline management)
- **Archetype:** B7 client-facing-send (the pursuit touch). **Trigger:** an open `opportunity` with a
  due next action, or a new inbound signal.
- **Terminal outcome:** opportunity advanced a stage, or held with a logged next touch.
- **Steps** (B7: ground → compose → SEND GATE → send → log): 1. `[automation]` **Ground** — surface
  the next-best action, **citing the opportunity state + as-of** (A5). 2. `[hybrid]` **Compose** the
  touch — no fabricated capability/timeline/price; opt-out + frequency caps are hard stops (B7); park.
  3. `[gui-step]` **SEND GATE** — human approves/sends. 4. `[automation]` log + re-stage + re-queue
  (idempotent, A9).
- **Autonomy ceiling:** L1 → **L3 only** for the B7 transactional-ack carve-out (templated,
  non-committal, deterministic trigger — e.g. a "received" acknowledgement); every communicative/
  committal touch stays `always_gate` (A2 class-2). **`always_gate`:** any pricing/discount/term
  assertion or send-for-signature (Chase has no send path).
- **Human-in-loop:** Sales role; commitment-class touch always human. **subject:** client.

### 02-A4 — Respond to inbound social/DM lead touch
- **Archetype:** B7 client-facing-send. **Trigger:** an intent-routed inbound social inquiry on an
  open/net-new deal (from Belle). **SEAM: accepts the Belle inbound-routing hand-off** (A11).
- **Terminal outcome:** a drafted, consent-clean reply parked for send.
- **Steps** (B7: ground → compose → SEND GATE → send → log): 1. `[automation]` **Ground** — receive
  the routed inbound, **citing the source thread + as-of** (A5). 2. `[hybrid]` **Compose** a
  channel-aware reply (no fabricated capability/timeline/price; opt-out/frequency hard stops). 3.
  `[gui-step]` **SEND GATE** — human approves/sends (idempotent, A9).
- **Autonomy ceiling:** L1 → **L3** only for the B7 transactional-ack carve-out; a 1:1 customer DM or
  any committal reply stays `always_gate` (A2 class-2). **Realization:** leaf #1414. **subject:** client.

### 02-A5 — Quote hand-off (KQM read-only seam)
- **Archetype:** A11 seam → external-SoR mirror (A9a — KQM is the quote SoR, the agent mirrors).
  **Trigger:** a qualified opportunity reaching proposal that needs a priced quote.
- **Terminal outcome:** quoting routed to KQM (the quote SoR); the quote ingested + reflected on
  the opportunity — **reflected, not built.**
- **Steps:** 1. `[gui-step]` **SEAM — Chase/seller produces the quote in KQM** (Imperion builds none;
  ADR-0080; the quote-build obligation lives outside Imperion, A11). 2. `[automation]` KQM quote
  ingested → bronze (LP) → merged to silver `opportunity`; **read-back-reflect** confirms the mirror
  matches KQM (A9c). 3. `[hybrid]` Chase reviews the reflected quote, **citing the KQM quote id +
  as-of** (A5); flags discrepancy.
- **Autonomy ceiling:** L0/L1 — Chase reads/flags; pricing is never Chase's call (no actuation on an
  external SoR, A9a). **Realization:** procedure-only (KQM external SoR). **OWNERSHIP NOTE:** the
  quote-build act lives in KQM, not an Imperion agent — Imperion owns only the reflection (A11 seam,
  flagged for Mark). **subject:** client.

### 02-A6 — Close / won hand-off to delivery
- **Archetype:** A11 seam (state-stamp + emit to Pierce/Celeste; Chase closes, others actuate).
  **Trigger:** opportunity reaches **`won`** (KQM `status==3` ⇔ `salesOrderId>0`).
- **Terminal outcome:** closed-won and **handed to Pierce** for provisioning (exit to Stream 03);
  relationship Handoff to Celeste.
- **Steps:** 1. `[automation]` detect `won` (**citing the KQM status + as-of**, A5); stamp closed-won
  + close date + attribution. 2. `[automation]` **SEAM →** emit the **sale→delivery handoff** (ADR-0096)
  — catalog-anchored line-items select the template (#1306) [→ Pierce, Stream 03]. 3. `[automation]`
  **SEAM →** emit the relationship **Handoff → Celeste** [→ Stream 08].
- **Autonomy ceiling:** L2 (state stamp + emit handoff = internally reversible, A10 row 1). DocuSign
  contract gate is a HARD precondition on Pierce's *provisioning* side (A11 — the gate is on the
  actuator, not on Chase's close). **subject:** client.

### 02-A7 — Draft contract renewal & repricing
- **Archetype:** B7 client-facing-send prep + A11 seam (Audrey margin grounding). **Trigger:** a
  `contract_renewal` enters the pipeline — an expiring `contract` surfaced by the expiry radar (handed
  **FROM Vance's Deadline Sentinel** for cost-pass-through inputs; the renewal record is Sales-owned —
  A11: Vance owns the clock, Chase owns the renewal quote).
- **Terminal outcome:** a renewal quote drafted with proposed-vs-current pricing + margin, parked
  for the customer-facing send — `identified → priced → quoted`.
- **Steps** (B7: ground → compose → [SEND GATE lives in 02-A8]): 1. `[automation]` **Ground** —
  expiry radar surfaces the agreement → `identified` (**citing the contract + expiry as-of**, A5)
  [← **SEAM** Vance #1481]. 2. `[automation]` derive repricing (CPI/escalation %, cost-pass-through,
  #1041) → `priced`. 3. `[hybrid]` **margin grounding SEAM ↔ Audrey** — proposed-vs-historical margin,
  advise-only (#1415; she holds no clock here, A11) [↔ Audrey, Stream 09]. 4. `[hybrid]` Chase
  **composes** the renewal quote → `quoted` (no fabricated capability/price). 5. `[gui-step]` human
  reviews pricing + margin (revenue RBAC-gated, ADR-0030).
- **Autonomy ceiling:** L1 propose (draft only; the send is 02-A8). **`always_gate`:** the pricing
  commitment + send-for-signature (A2 class-2, deferred to 02-A8).
- **Substrate deps:** `contract_renewal` (#1324), #1041 true-up, ADR-0030. **subject:** client.

### 02-A8 — Send renewal for signature & update agreement ⛔
- **Archetype:** B7 client-facing-send (the SEND GATE). **Trigger:** a `contract_renewal` in `quoted`
  with human approval of pricing.
- **Terminal outcome:** renewal e-signed + agreement updated — terminal **`renewed | repriced |
  churned`** (feeds churn scoring #1046).
- **Steps** (B7: ground → compose [02-A7] → SEND GATE → send → log+back-sync): 1. `[gui-step]`
  **SEND GATE — `always_gate`** (A2 class-2): the 4-part easy-button (A4) presents the **complete
  drafted renewal**, the **grounded why** (proposed-vs-current pricing + margin, cited + as-of),
  **one-click Send + one-click Cancel-before-send** (the reversible inverse), and the **consequence
  preview** ($ amount + binding-signature irreversibility flag); human authorizes the customer-facing
  send. 2. `[automation]` `send-for-esignature` (DocuSign/`esign`, ADR-0071), **idempotency-keyed**
  (renewal + period) so a replay is a no-op (A9b) → `sent`. 3. `[automation]` on signature → update
  agreement; `autotask-writeback` (Autotask = contract SoR, the agent mirrors — A9a), **read back** the
  Autotask record before stamping `renewed`/`repriced` (close-on-verification, A9c). 4. `[automation]`
  if declined/lapsed → `churned` + **SEAM →** Handoff to Celeste [→ Stream 08].
- **Autonomy ceiling:** **`always_gate`** on the send — dial-proof (A10 row 4: a bound signature has no
  clean undo). Post-signature mirror-update L2/L3 (Autotask write is idempotent + read-back, A9).
- **Substrate deps:** DocuSign-consent, Autotask write-back (#422/#425), #1046. **subject:** client.

---

## B. VANCE (Procurement)

### 02-B1 — Renewal/cancellation Deadline Sentinel  *(highest-value Vance procedure)*
- **Archetype:** B9 deadline-sentinel (watches a clock; **never actuates**, A11). **Trigger:**
  schedule — a vendor subscription/agreement approaching auto-renew or its cancellation-window close
  (watched over Pax8 bronze + `license_assignment` + contracts).
- **Terminal outcome:** a **timely alert + drafted renew/cancel recommendation** before the
  deadline — **no deadline passes unseen.** Actuation is NOT here.
- **Steps** (B9: watch → detect → quantify → draft-rec → route + notify): 1. `[automation]` **Watch**
  every deadline at policy lead times (T-30/T-7/T-1), **citing each renewal/cancel date + as-of** (A5)
  (L2 auto-watch, #1481). 2. `[automation]` **Detect + quantify** — raise a timely alert with the
  deadline + dollars + inaction consequence (urgency computed per A6 — a closing cancellation window is
  urgent). 3. `[hybrid]` **Draft** a renew/cancel recommendation (easy-button pre-staged). 4.
  `[automation]` **Route + notify** — client-contract renewals → Chase (02-A7) [→ **SEAM** Chase];
  escalate up `reports_to` if unanswered, a passed deadline = a **logged escalation failure** surfaced
  in Vance's owning C-suite synthesis-brief.
- **Autonomy ceiling:** L2 (watch + alert + draft). **NEVER auto-actuate the renew/cancel/buy** even
  under deadline pressure (B9 — a missed deadline does not license an autonomous commitment); the
  actuation is **`always_gate`** (0184), handled in 02-B2. **subject:** **both** (client vendor
  agreements AND Imperion's own subscriptions).

### 02-B2 — Governed procurement sequence (Pax8 procure → provision → bill) ⛔
- **Archetype:** B6 money-gate (money out is `always_gate` class-1 forever). **Trigger:** an approved
  sourcing need — a catalog-anchored SKU to be ordered. Off-catalog → routes to a human (refuse-
  precondition, never auto-procure).
- **Terminal outcome:** order placed, license provisioned, agreement attached, bill attached —
  **procurement fulfilled** (one approval, run-all).
- **Steps** (B6: ground → compute → draft → MONEY GATE → actuate → log+mirror): 1. `[hybrid]`
  **Ground + draft** the order/PO (catalog-anchored, #1306; **citing the catalog SKU + price as-of**,
  A5). 2. `[gui-step]` **MONEY GATE — `always_gate`** (A2 class-1): the 4-part easy-button (A4)
  presents the exact $, the SoR (Pax8), and the **no-clean-undo irreversibility flag** (A10 row 4);
  ONE human approval at `pax8_place_order` authorizes the whole sequence (approve-once, 0184).
  3–5. `[automation]` `m365_provision_license`, `agreement_attach`, `bill_attach` auto-complete
  post-approval (L3), each **idempotency-keyed** (replay = no-op + audit note, A9b) and **read back**
  from Pax8/M365 before close (A9c); on partial failure **halt, no auto-rollback**, surface
  completed-vs-pending (A10/B6) — re-run is idempotent from the top. The bill is the **billing
  consequence** of the approved purchase [→ **SEAM** Audrey, Stream 09].
- **Autonomy ceiling:** money step **`always_gate`** (permanent — A10 row 4); operational + billing-
  consequence steps L3 auto post-approval. **Realization:** leaf #1487; seeded by migration **0184**
  (withheld v1).
- **Substrate deps:** 0184, Pax8-bronze, Autotask write-back, #119. **subject:** **both.**

### 02-B3 — Shelfware detection & reclaim recommendation
- **Archetype:** B4 audit-attest (detect + flag; commit routes to B6). **Trigger:** schedule — a sweep
  for paid-for-but-unassigned/unused licenses.
- **Terminal outcome:** a **reclaim recommendation with dollars**, parked — **wasted spend surfaced.**
- **Steps** (B4: scope → collect-evidence → evaluate → compose → route): 1. `[automation]`
  **Scope + collect** — detect shelfware (#1482), **citing each unassigned entitlement + as-of** (A5).
  2. `[automation]` **Evaluate** — quantify reclaimable $. 3. `[hybrid]` **Compose** a reclaim rec
  (cancel/downgrade). 4. `[automation]` **Route** — internal finding auto-runs at L2; the cancel/
  downgrade **commit splits out → 02-B2 money gate** (B4: assertion-with-spend ≠ measurement).
- **Autonomy ceiling:** L1/L2 (detect + flag + draft = internally reversible, A10 row 1); cancel/
  downgrade commit `always_gate` (02-B2). **subject:** both.

### 02-B4 — Under-licensing / compliance flag
- **Archetype:** B4 audit-attest (internal — measure + flag, no external attestation). **Trigger:**
  schedule — under-licensing / license-compliance exposure vs the service catalog (#1306).
- **Terminal outcome:** a **compliance-exposure flag** — **risk surfaced** (Vance errs to risk-over-cost).
- **Steps** (B4: scope → collect → evaluate → route): 1. `[automation]` **Scope + collect** — cross-ref
  entitlements vs catalog (#1483), **citing the catalog version + as-of** (A5). 2. `[automation]`
  **Evaluate** — classify exposure. 3. `[automation]` **Route** — flag (internal finding auto-runs at L2).
- **Autonomy ceiling:** L2 (detect + flag = internally reversible, A10 row 1); any remediation buy
  splits out → 02-B2 money gate. **subject:** both.

### 02-B5 — License right-sizing / optimization
- **Archetype:** B4 audit-attest (detect + draft; commit routes to B6). **Trigger:** schedule —
  utilization analysis showing over-provisioning / consolidatable SKUs.
- **Terminal outcome:** a **right-sizing recommendation** (consolidate/downgrade), parked.
- **Steps** (B4: scope → collect → evaluate → compose → route): 1. `[automation]` **Scope + collect** —
  match SKU/quantity to utilization (#1488), **citing utilization data + as-of** (A5). 2. `[hybrid]`
  **Compose** the right-sizing rec. 3. `[automation]` **Route** — surface; the **commit splits out →
  02-B2 money gate**.
- **Autonomy ceiling:** L1/L2 (detect + draft, reversible); commit `always_gate` (02-B2). (Vendor-record
  model stub, #1311.) **subject:** both.

### 02-B6 — Pax8 order-status watchdog
- **Archetype:** B9 deadline-sentinel (watches an order clock; alerts, never actuates). **Trigger:** an
  in-flight Pax8 order (placed → provisioned → billed).
- **Terminal outcome:** a **stall/failure alert** — **order health assured.**
- **Steps** (B9: watch → detect → route + notify): 1. `[automation]` **Watch** transitions (#1485),
  **citing the Pax8 order state + as-of** (A5). 2. `[automation]` **Detect** stall/failure vs SLA.
  3. `[automation]` **Route + notify** — alert (urgency computed per A6 — an SLA-breaching stall is
  urgent) → human / 02-B2.
- **Autonomy ceiling:** L2 (watch + alert; never auto-actuates the order, B9). **subject:** both.

### 02-B7 — Vendor cost monitoring & variance
- **Archetype:** B4 audit-attest → Audrey seam (measure + flag, money commit belongs to Audrey/B6).
  **Trigger:** schedule — vendor cost refresh; variance vs expected.
- **Terminal outcome:** a **cost-variance flag fed to Audrey** for reconciliation/true-up.
- **Steps** (B4: scope → evaluate → route): 1. `[automation]` **Scope + evaluate** — monitor cost;
  compute variance (#1484), **citing the cost source + as-of** (A5). 2. `[automation]` flag. 3.
  `[automation]` **SEAM → hand to Audrey** (read-only money — Vance measures, Audrey owns the money
  clock, A11; #1041/#1394) [→ Stream 09].
- **Autonomy ceiling:** L2 (monitor + flag → Audrey); the money commitment is gated on Audrey's side
  (A11/B6). **subject:** both.

### 02-B8 — Vendor risk / EOL advisory
- **Archetype:** B9 deadline-sentinel → Celeste seam (watches an EOL/risk clock; advises, never
  actuates). **Trigger:** a vendor risk/EOL signal (price hike, EOL, instability).
- **Terminal outcome:** a **vendor-risk advisory handed to Celeste** as a vCIO/relationship signal.
- **Steps** (B9: watch/detect → quantify → route + notify): 1. `[automation]` **Detect** risk/EOL
  (#1486), **citing the EOL/risk signal + as-of** (A5). 2. `[automation]` flag + characterize (pool-
  correlate the EOL across the client base internally only, A7). 3. `[automation]` **SEAM → hand to
  Celeste** [→ Stream 08].
- **Autonomy ceiling:** L2 (flag → Celeste; never auto-actuates a vendor switch, B9). **subject:** both.

### 02-B9 — Vendor consolidation / spend-optimization advisory
- **Archetype:** B4 audit-attest (detect + draft; consolidation buy routes to B6). **Trigger:**
  schedule — duplicate tools / overlapping vendors across the stack.
- **Terminal outcome:** a **consolidation + savings advisory** routed to Audrey (spend) + Celeste (vCIO).
- **Steps** (B4: scope → evaluate → compose → route): 1. `[automation]` **Scope + evaluate** — detect
  overlap (#1489), **citing the vendor stack + as-of** (A5); pool-correlate across clients internally
  only (A7). 2. `[hybrid]` **Compose** advisory + savings. 3. `[automation]` **SEAM → route** → Audrey
  (#1041) + Celeste (#1396).
- **Autonomy ceiling:** L1/L2 (detect + draft, reversible); any consolidation buy/cancel splits out →
  02-B2 money gate. (Vendor map gated on #1311.) **subject:** both.

### 02-B10 — Source a won deal's procurement (deal → sourcing draft)
- **Archetype:** A11 seam → B6 staging (Chase wins, Vance drafts the sourcing, the buy gates in 02-B2).
  **Trigger:** a won opportunity whose sold line-items require licenses/SKUs (Chase→Vance seam off
  the ADR-0096 spine).
- **Terminal outcome:** a **sourcing draft** ready for the money gate — **procurement prepared.**
- **Steps:** 1. `[automation]` **SEAM** — receive the won deal's catalog-anchored line-items
  (**citing the won opportunity + as-of**, A5) [← Chase 02-A6]. 2. `[hybrid]` Vance drafts the sourcing
  plan (catalog-anchored; off-catalog → human, refuse-precondition). 3. `[automation]` **stage the
  order for 02-B2** [→ **SEAM** 02-B2; and → Pierce delivery-procurement, Stream 03].
- **Autonomy ceiling:** L1/L2 (draft + stage, reversible); the buy is `always_gate` (02-B2 money gate).
  Candidate new leaf under #1398. **subject:** client (Imperion-self when Imperion "wins" an internal
  need).

---

## Coverage notes

**Count: 18 Operating Procedures** — Chase 8 (02-A1…A8) · Vance 10 (02-B1…B10).

**Doctrine inheritance (ADR-0136):** every procedure names its archetype (B1–B9) and inherits A1–A11.
The stream showcases two anchoring rules: **A11 obligation/action separation** — Chase owns the
transaction/close but **has no send path** (every customer-facing send is `always_gate`, the act
gates), and Vance is a **sentinel, not a buyer** (02-B1/B6/B8 watch clocks and NEVER auto-actuate the
renew/cancel/buy, B9); and **the A10 money ceiling** — 02-B2's MONEY GATE is `always_gate` forever
(money out has no clean undo, A10 row 4 / 0184), with every B4 audit (B3/B5/B9) routing its commit
through it. Per A5c, deepened steps depending on dormant substrate (#389/#991/#119/0184/Pax8-bronze/
KQM-bronze/DocuSign-consent) ship **propose-only** until built.

**Seams (every cross-agent hand-off is an explicit Procedure Step, A11):** Belle→Chase = the
`lead_score` MQL crossing (02-A1/A4); Stream 03 (Pierce) = 02-A6 boundary; Stream 08 (Celeste) =
02-A6/A8/B8/B9 emit Handoffs (she owns relationship, assigns back to Chase — the pinned seam);
Stream 09 (Audrey) = margin-grounding (A7) + bill_attach (B2) + cost-variance/consolidation (B7/B9).
**AR/cash collection is OUT** — "→ Cash" terminates at e-signed agreement / procurement-fulfilled +
billing-consequence; AR/invoice/collections belongs to Stream 09 (blocked on #1580). Nearly every
procedure is deploy-dormant pending creds + collectors.
