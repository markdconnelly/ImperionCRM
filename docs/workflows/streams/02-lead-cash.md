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

**Owners:** Chase (Sales) · Vance (Procurement) · **Sterling (Deputy CFO — GTM-governance section,
L2 delegate-only) · Grace (GRC — security-questionnaire) · Bridget (Partnerships, #1624 🔌UNBUILT —
Channel section)**. Audrey (Finance) appears as margin-grounding / commission-issuance hand-off STEPS
(her owned procedures live in Stream 09).
**subject:** every procedure runs `subject=client` by default; the full Vance set also runs
`subject=imperion` (Imperion procures for itself); Chase's customer procedures do not. The
GTM-governance set (02-C*) runs `subject=imperion` (governs Imperion's own GTM machinery); the
RFP/questionnaire pair (02-C5/C6) and the Channel set (02-D*) run `subject=client|partner`.

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
- **Sterling is an exec-tier governance owner, L2 delegate-only, NEVER an actuator** (A11 — mirrors his
  Stream 09/11 stance). For the GTM-governance set he owns the *standard/clock* (the price-book/rate-card
  policy, the deal-desk approval clock, the commission run, the forecast cadence); the binding act —
  publishing a margin floor, approving a non-standard deal, issuing a commission payment — is
  `always_gate` and lands on a human (Nick/Mark) or splits to the actuating agent. He reports to **Nick**.
- **Bridget = Partnerships agent (#1624), under Sterling, 🔌UNBUILT.** The whole Channel section (02-D*) is
  **procedure-only** until #1624 builds the agent; every 02-D procedure ships propose-only/dormant (A5c).
  Bridget is a sentinel-and-money owner (A11): she watches the partner/co-sell clock and drafts, but the
  payout/MDF spend is `always_gate` (B6) and the partner commitment is `always_gate` (A2 class-6).
- **Dormancy flags (A5c — deepened steps depending on these ship propose-only):** #389 worker-recall ·
  #991 handoff bus · #119 trigger-sync · #668 AR/invoice entity (#1580) · DocuSign-consent ·
  0184 (postured withheld) · Pax8-bronze · KQM-bronze · **🔌#1624 Bridget agent UNBUILT (all 02-D*) ·
  🔌#1623 `partner` silver schema not built (02-D*) · schema gap: a comp/commission-plan model has no
  issue yet (02-C3 — flagged inline, not filed) · price-book/rate-card + deal-desk artifacts have no
  silver entity yet (02-C1/C2 — propose-only)**.

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
| 02-C1 govern price book & rate-card ⛔ | **B2 gated-actuation** (publish = money/term commitment) |
| 02-C2 deal desk / non-standard deal ⛔ | **B2 gated-actuation** (the approval gate) |
| 02-C3 calculate commissions & issue statements ⛔ | **B6 money-gate** (batch, B6 variance rule) |
| 02-C4 forecast pipeline & quota attainment | **B3 synthesis-brief** (Sterling exec, L2 delegate-only) |
| 02-C5 assemble RFP / bid response | **B2 gated-actuation** (Chase; Grace supplies security content) |
| 02-C6 client security questionnaire ⛔ | **B4 audit-attest** (external = `always_gate`, Grace) |
| 02-C7 win-loss analysis | **B3 synthesis-brief** (Chase/Belle) |
| 02-D1 manage channel/alliance/co-sell + marketplace ⛔ | **B1 triage/route** + **B2 gated-actuation** (commit) |
| 02-D2 referral-partner program ⛔ | **B6 money-gate** (payout) |

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

## C. GTM-GOVERNANCE (Sterling exec-governance · Chase · Grace)

> **Section doctrine delta.** This section is the **GTM-Governance** extension of the Lead→Cash
> stream (A1 — extend Stream 02, NOT a new stream 12). **Sterling owns the GTM governance clocks and
> standards as an L2 delegate-only exec (A11):** he sets the rate-card/discount policy, runs the
> deal-desk and commission clocks, and synthesizes the forecast — he NEVER actuates a price, a deal,
> or a payout. Every binding GTM act gates to a human (Nick/Mark) or splits to the worker agent
> (Chase). The two client-facing procedures here (02-C5 RFP, 02-C6 questionnaire) inherit the
> B7/B4 send/attest gates. **Substrate:** these procedures have **no dedicated silver entity yet**
> (price-book/rate-card, deal-desk record, comp-plan) — per A5c they ship **propose-only**; the gaps
> are flagged inline (one is an unfiled comp-plan-model gap, 02-C3).

### 02-C1 — Govern the price book & rate-card (margin floors, discount tiers) ⛔
- **Owner / Stream:** Sterling / 02 (GTM governance, L2 delegate-only). **Archetype:** B2
  gated-actuation — Sterling's "actuation" = *assembling + parking the rate-card change*; publishing
  it is the human's (a margin floor / discount tier is a standing money/term commitment, A2 class-1/6).
- **Trigger:** a cost-basis shift (vendor cost-pass-through from Vance 02-B7, CPI), a margin-erosion
  signal from the forecast (02-C4), or a periodic rate-card review cadence.
- **Terminal outcome:** a ratified price book / rate-card with **margin floors + discount tiers**
  that 02-A7 repricing and 02-C2 deal desk read as the standard — published or rejected, audited.
- **Procedure Steps** (B2: ground → assemble ProposedAction → GATE → reconcile → log):
  1. `[automation]` **Ground** — pull current rate-card + realized margins + Vance cost variance
     (02-B7) + Audrey margin history, **citing each source + as-of** (A5); empty/stale → park (A5b/c). **L2.**
  2. `[automation]` **Assemble the change as the 4-part easy-button (A4):** the **drafted new rate-card
     / floor / tier set**; the **grounded why** (cost shift + margin-at-risk, cited); **one-click
     Publish + one-click Reject/Edit**; the **consequence preview** (which active quotes/renewals the
     new floor touches, $ exposure). **SEAM ↔ Audrey** (margin grounding, advise-only — she holds no
     clock here, A11) [↔ Stream 09].
  3. `[gui-step]` **PUBLISH GATE — `always_gate`** (A2 class-1/6: a standing price/margin commitment).
     Human (Nick/Mark) ratifies; Sterling never self-publishes a floor (A11 obligation/action split).
  4. `[automation]` On publish → version + audit the rate-card; **SEAM →** notify Chase (02-A3/A7 read
     the new standard) + Vance (catalog price refs). On reject → log + re-park.
- **Autonomy ceiling:** **L2** (ground + assemble = internally reversible, A10 row 1). **`always_gate`:**
  publishing the rate-card / floor / discount tier (standing money/term commitment, dial-proof — A10 row 4).
- **Human-in-loop:** Nick (CFO) / Mark ratify; never recedes (the publish click is a permanent human hold).
- **Substrate deps:** 🔌#991 (Audrey/Vance seams) · #1041 cost-pass-through · ADR-0030 revenue RBAC ·
  **schema gap: no price-book/rate-card silver entity (propose-only)**. **subject:** imperion.

### 02-C2 — Run the deal desk / approve a non-standard deal ⛔
- **Owner / Stream:** Sterling / 02 (deal-desk clock, L2 delegate-only) **+ Chase** (assembles the deal).
  **Archetype:** B2 gated-actuation — Sterling parks the non-standard-deal decision; the approval is the
  human's. This is the GTM twin of the Marshall CAB gate (06-OP-03): governance prep auto, decision gated.
- **Trigger:** a Chase-owned opportunity/renewal whose pricing, discount, or terms breach the 02-C1
  rate-card floor / standard-terms envelope (the deal-desk threshold).
- **Terminal outcome:** the non-standard deal is **approved (with the exception recorded) or rejected**;
  on approve, Chase's 02-A5/A7 quote proceeds against the granted exception — audited either way.
- **Procedure Steps** (B2: ground → assemble ProposedAction → GATE → log):
  1. `[automation]` **Ground** — detect the breach vs the 02-C1 standard (discount depth, term length,
     non-standard SLA), **citing the rate-card version + the proposed deal + as-of** (A5). **SEAM ←
     Chase** (the deal carries its rationale up-chain, A11). **L2.**
  2. `[automation]` **Assemble the deal-desk packet = the 4-part easy-button (A4):** the **complete
     proposed deal** (price/discount/term delta vs floor); the **grounded why** (margin impact cited +
     as-of, strategic rationale, **SEAM ↔ Audrey** margin grounding advise-only); **one-click Approve +
     one-click Reject/Counter**; the **consequence preview** ($ margin given up, precedent flag).
  3. `[gui-step]` **APPROVAL GATE — `always_gate`** (A2 class-1/2/6: a discount/term commitment).
     Human (Nick for margin, Mark for risk/legal terms) decides; standard-envelope deals never reach the
     desk (they clear under 02-A7 directly — the desk handles only exceptions).
  4. `[automation]` On approve → record the granted exception; **SEAM → Chase 02-A5/A7** (quote against
     the exception). On reject → return to Chase with the counter, logged.
- **Autonomy ceiling:** **L2** (detect + assemble = reversible). **`always_gate`:** the non-standard-deal
  approval (a pricing/term commitment, A10 row 4 — dial-proof).
- **Human-in-loop:** Nick/Mark approver; the approve click stays human forever (A3 floor). **OWNERSHIP:**
  clean — Sterling owns the desk clock, Chase owns the deal, the human decides (A11).
- **Substrate deps:** ties 02-C1 · 🔌#991 (Chase/Audrey seams) · ADR-0030 · **schema gap: deal-desk
  exception record (propose-only)**. **subject:** imperion (governs the deal); client (the deal's subject).

### 02-C3 — Calculate sales commissions & issue statements ⛔
- **Owner / Stream:** Sterling / 02 (commission-run governance) **+ Audrey** (issues the money — Stream 09).
  **Archetype:** B6 money-gate (batch) — commissions are a money-out run; **batch easy-button + per-item
  variance gate** (B6 rule). Sterling computes/assembles; the payment is Audrey's actuation under the gate.
- **Trigger:** schedule — a commission period closes (won deals from 02-A6 + the comp plan), or a
  correction/clawback is raised.
- **Terminal outcome:** a **commission statement per rep** computed against the comp plan, and (gated)
  the period's commission payment issued + statements distributed — **reps paid correctly, audited.**
- **Procedure Steps** (B6: ground → compute → draft → MONEY GATE → actuate → log+mirror):
  1. `[automation]` **Ground** — pull the period's `won` opportunities (02-A6, KQM-mirrored) + each rep's
     comp-plan rate/tier/accelerator, **citing each deal + plan version + as-of** (A5); on empty/unhydrated
     comp data → park, never fabricate a payout (A5b). **L2.**
  2. `[automation]` **Compute** per-rep commission + the period total; build per-rep statements.
  3. `[automation]` **Draft the batch easy-button (B6 batch rule):** total-$ + rep count + a **diff/
     exception view** vs the prior period; items **within variance tolerance** ride the one approval; any
     item tripping a guard (new rep, >X% swing, first-time accelerator, clawback) **splits out and gates
     individually**. The variance threshold is per-procedure policy (`TBD #1586`).
  4. `[gui-step]` **MONEY GATE — `always_gate`** (A2 class-1): exact $, the SoR (QBO/payroll), the
     no-clean-undo flag (A10 row 4). **SEAM → Audrey** issues the payment (she owns the money clock, A11;
     QBO = SoR, the agent mirrors — A9a) [→ Stream 09].
  5. `[automation]` Post-approval → statements distributed (templated, B7 transactional sub-class); the
     payment is **idempotency-keyed** (rep + period) so a replay is a no-op (A9b); **read back** the QBO/
     payroll record before stamping the run paid (A9c). On partial failure → halt, no auto-rollback (A10).
- **Autonomy ceiling:** **L2** (compute + draft); the **commission payment is `always_gate` forever**
  (money out, A10 row 4); statement distribution → L3 (templated transactional, B7).
- **Human-in-loop:** Nick/Mark gates the payment; Audrey actuates under her own pairing (Nick).
- **Substrate deps:** 02-A6 (won feed) · KQM-bronze · QBO/payroll (Stream 09, #1580) · 🔌#991 ·
  **⚠ schema gap (NO issue yet): a comp/commission-plan model** (rep × rate × tier × accelerator) **does
  not exist** — flagged inline per the assignment, NOT filed; until built this procedure is **propose-only**.
  **subject:** imperion (Imperion pays its own reps).

### 02-C4 — Forecast pipeline & track quota attainment
- **Owner / Stream:** Sterling / 02 (GTM forecast — extends his 09-17 revenue-governance oversight).
  **Archetype:** B3 synthesis-brief — exec-tier, **L2 delegate-only, no actuation** (A11 — Sterling
  synthesizes; Chase acts under his ceiling). NOTE: this is the GTM-specific forecast; the cross-division
  revenue roll-up to Nick is 09-17 — this feeds it, does not duplicate it.
- **Trigger:** schedule (weekly/period forecast cadence) or an on-demand pipeline-health pull.
- **Terminal outcome:** a **pipeline forecast + quota-attainment brief** (weighted pipeline, coverage,
  gap-to-quota, at-risk deals) — a **launchpad**, not a readout (B3).
- **Procedure Steps** (B3: gather → synthesize → narrate → deliver → log):
  1. `[automation]` **Gather** — weighted `opportunity` pipeline by stage, rep quota vs attainment, win
     rates (02-C7), **citing each source + as-of** (A5); flag dormant feeds honestly (A5c). **L2.**
  2. `[automation]` **Synthesize** — coverage ratio, gap-to-quota, at-risk/slipping deals; **pool-
     correlate across reps/segments internally only** (A7 — no cross-client identifiable bleed).
  3. `[hybrid]` **Narrate** the forecast (P2 attribution). **B3 launchpad rule:** an at-risk deal
     **auto-spawns the owning worker procedure parked/draft** — a slipping deal pre-stages **Chase 02-A3**
     (pursuit touch), a margin-eroding deal pre-stages **02-C2** (deal desk) — for one-click launch.
  4. `[automation]` **Deliver** (A6 routing) → Nick / the 09-17 roll-up; **log.**
- **Autonomy ceiling:** **L2 delegate-only** — no direct actuation, no money (A11). No `always_gate` of
  its own (the spawned worker procedures carry their gates).
- **Human-in-loop:** Nick consumes/decides; Sterling recedes to scheduled compile; binding pipeline calls
  are the human's. **Substrate deps:** 02-A* pipeline · 🔌#389 (recall) · 🔌#991. **subject:** imperion.

### 02-C5 — Assemble an RFP / bid response
- **Owner / Stream:** Chase / 02 (the bid is a sales deliverable) — **Grace supplies the security/
  compliance content** (A11 seam). **Archetype:** B2 gated-actuation — the *submission* of a bid is a
  binding client-facing commitment (A2 class-2/6); assembly is auto, the send/submit is gated.
- **Trigger:** an inbound RFP/RFQ/bid invitation tied to an open or net-new opportunity.
- **Terminal outcome:** a **complete, grounded RFP response assembled and (gated) submitted** — every
  claim sourced, the security section supplied by Grace, pricing within the 02-C1 envelope (else → 02-C2).
- **Procedure Steps** (B2: ground → assemble ProposedAction → GATE → submit → log):
  1. `[automation]` **Ground** — parse the RFP requirements, recall prior winning responses + capability
     evidence, **citing each source + as-of** (A5); on empty recall → park sections to a human, never
     fabricate a capability/certification claim (A5b — refusal-class). **L2.**
  2. `[hybrid]` **Assemble** the response: capability/approach (Chase), pricing (within 02-C1 floors; a
     breach routes to **02-C2 deal desk** before submit), and the **security/compliance section** —
     **SEAM → Grace (#1557)** supplies the control/attestation content (Chase never authors security
     claims; Grace owns that standard, A11) [→ Stream 07].
  3. `[gui-step]` **SUBMIT GATE — `always_gate`** (A2 class-2/6: a bid is a binding client-facing
     commitment). The 4-part easy-button (A4): complete response · grounded why (each claim cited) ·
     one-click Submit + Cancel-before-submit · consequence preview (commitment scope, $ value).
  4. `[automation]` On submit → log + attach to the opportunity (idempotency-keyed, A9b); a win → 02-A6
     close path; a loss → 02-C7 win-loss.
- **Autonomy ceiling:** **L1/L2** assemble (drafting reversible); **`always_gate`:** the bid submission +
  any pricing/term commitment. Security claims are Grace's to source (refuse-precondition if absent).
- **Human-in-loop:** Sales role (Mark proxy / Nick oversight); Grace's human floor on the security
  section. **Substrate deps:** 🔌#389 (recall) · 🔌#991 (Grace seam) · ties 02-C1/C2/C7. **subject:**
  client (the bidding client/prospect).

### 02-C6 — Respond to a client security questionnaire / due-diligence ⛔
- **Owner / Stream:** Grace / 02 (security-attestation content) — **`always_gate`, human-signed**.
  **Archetype:** B4 audit-attest (**external** assertion — A11: Grace measures/assembles, the human signs).
  This is the GTM-context twin of Grace's OP-07-06 SOC2 attestation: an external security assertion is
  never self-attested.
- **Trigger:** a prospect/client (or their auditor) sends a security questionnaire / vendor due-diligence
  request during a sales/renewal cycle.
- **Terminal outcome:** a **completed, evidence-backed security questionnaire — human-signed before
  return** to the client; gaps surfaced honestly, never papered over.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → route-gaps → sign-off):
  1. `[automation]` **Scope** — map each questionnaire item to the Imperion control set / posture
     evidence, **citing the control + evidence + as-of** (A5; cite the standard version). **L2.**
  2. `[automation]` **Collect-evidence + evaluate** — pull control evidence; classify each item
     answerable / partial / gap; **never assert a control that has no evidence** (A5b — refusal-class).
  3. `[hybrid]` **Compose** the response package; **SEAM → Cyrus** (live posture detail) if needed
     [→ Stream 07]; flag every gap explicitly for the human.
  4. `[gui-step]` **SIGN-OFF GATE — `always_gate`** (external assertion, A2 class-2/B4 external rule):
     the **human attests/signs** the questionnaire before it returns to the client; Grace never
     self-attests (A11). The full evidence-backed package is pre-staged at the gate (A4).
- **Autonomy ceiling:** **L2** (scope + collect + compose = internal, reversible). **`always_gate`:** the
  external sign-off/return (an external security assertion — dial-proof, B4 external split).
- **Human-in-loop:** Mark (CISO) signs the external attestation; never recedes. **Substrate deps:**
  posture evidence (Stream 07) · 🔌#991 (Cyrus seam) · 🔌#389. **subject:** client.

### 02-C7 — Run win-loss analysis
- **Owner / Stream:** Chase / 02 (sales lens) **+ Belle** (marketing/demand lens) — joint synthesis.
  **Archetype:** B3 synthesis-brief — **L2 delegate-only, no actuation** (a learning brief; the actions
  it surfaces spawn the owning worker procedures parked).
- **Trigger:** schedule (post-period) or a closed cohort of `won`/`lost` opportunities reaching a sample.
- **Terminal outcome:** a **win-loss brief** (why deals close/slip, by segment/competitor/source) — a
  **launchpad** feeding pricing (02-C1), forecast (02-C4), and demand (Stream 01/Belle).
- **Procedure Steps** (B3: gather → synthesize → narrate → deliver → log):
  1. `[automation]` **Gather** — closed-won/lost outcomes + reasons + competitor/source attribution,
     **citing each opportunity + as-of** (A5). **L2.**
  2. `[automation]` **Synthesize** patterns; **pool-correlate across the deal base internally only**
     (A7 — anonymized/aggregated, no single client's specifics bleeding into another's view).
  3. `[hybrid]` **Narrate** (P2). **B3 launchpad rule:** a recurring loss-on-price pattern pre-stages
     **02-C1** (rate-card review) parked; a loss-on-demand pattern pre-stages a Belle Stream-01 procedure.
  4. `[automation]` **Deliver** (A6) → Sterling (02-C4 forecast) + Belle (demand) + the 09-17 roll-up; log.
- **Autonomy ceiling:** **L2 delegate-only** (synthesis; no actuation, A11). No `always_gate` of its own.
- **Human-in-loop:** Sales/Marketing roles consume; binding changes carry their own gates. **Substrate
  deps:** 02-A* outcomes · 🔌#389 (recall) · 🔌#991. **subject:** client (analyzed anonymized/aggregated, A7).

---

## D. CHANNEL (Bridget — Partnerships, #1624 🔌UNBUILT)

> **Section doctrine delta.** This is the **Channel** extension of Lead→Cash (A1 — extend Stream 02,
> NOT a new stream 12). **The entire section is procedure-only and ships propose-only/dormant (A5c):**
> the **Bridget agent is unbuilt (🔌#1624)** and the **`partner` silver schema does not exist
> (🔌#1623)**. Bridget reports to **Sterling** (Partnerships, under the Deputy CFO). She is a
> **sentinel-and-money owner** (A11): she watches the partner/co-sell/marketplace clock and drafts the
> recommendation, but the **partner/co-sell commitment is `always_gate`** (A2 class-6) and the
> **referral payout / MDF spend is `always_gate`** (B6, money out). The issue notes the Bridget set
> continues in #1624 (tier-tracking, MDF, channel-conflict, attribution) — those are authored against
> #1624 when the agent lands; the two foundational channel procedures are deepened here.

### 02-D1 — Manage channel / alliance / co-sell + marketplace listing ⛔ — 🔌DORMANT
- **Owner / Stream:** Bridget / 02 (Partnerships, #1624 🔌UNBUILT). **Archetype:** B1 triage/route
  (intake + route partner/co-sell signals) **+ B2 gated-actuation** for any binding partner/marketplace
  commitment. Sentinel-and-route at L2; the commitment gates (A11 — Bridget routes/drafts, the human binds).
- **Trigger:** a partner/alliance signal — a co-sell lead from a partner, a marketplace listing/renewal
  due, an alliance-program tier action, or a partner-sourced opportunity (the partner axis of Belle→Chase).
- **Terminal outcome:** the partner signal is **dispositioned** — co-sell lead routed to Chase (02-A1/A2),
  marketplace listing drafted-and-(gated)-published, or alliance action drafted-and-(gated)-committed.
- **Procedure Steps** (B1 intake → B2 commit where binding):
  1. `[automation]` **Ground** — ingest the partner signal, **citing the source + `partner` record +
     as-of** (A5); on empty/unparseable or **dormant `partner` schema → park** (A5c — propose-only). **L2.**
  2. `[automation]` **Classify + resolve owner** — co-sell lead vs marketplace action vs alliance-tier
     action; resolve the owning `partner`. **Pool-correlate on the partner axis internally only** (A7 —
     one partner's data NEVER crosses into another's, the partner-axis pool-never-bleed).
  3. `[automation]` **Route (B1, L2):** a co-sell/partner-sourced lead → **SEAM → Chase 02-A1/A2**
     (the partner-axis twin of the Belle→Chase MQL crossing, A11) [→ Chase].
  4. `[gui-step]` **COMMIT GATE — `always_gate`** (A2 class-6: a partner deal / co-sell agreement /
     marketplace listing is a binding commitment): the 4-part easy-button (A4) — drafted commitment ·
     grounded why (cited) · one-click Commit + inverse where reversible (listing unpublish is reversible;
     a signed alliance term is not) · consequence preview. Human binds; Bridget never self-commits (A11).
- **Autonomy ceiling:** **L2** (intake + route + draft = reversible). **`always_gate`:** any binding
  partner/co-sell/alliance commitment + a contractual marketplace listing (A2 class-6). **Reversibility
  (A10):** a marketplace listing publish/unpublish is externally-reversible (L4 cap once built); a bound
  partner agreement is no-clean-undo (`always_gate` forever).
- **Human-in-loop:** Sterling pairing → Nick; binding partner commitments are a human floor. Recede L0→L2
  per A3 once #1624 builds the agent.
- **Substrate deps:** 🔌**#1624** (Bridget agent UNBUILT — whole procedure dormant) · 🔌**#1623**
  (`partner` silver schema not built) · 🔌#991 (Chase seam) · 🔌#119. Ships **propose-only** until both
  land (A5c). **subject:** partner | client.

### 02-D2 — Run the referral-partner program ⛔ — 🔌DORMANT
- **Owner / Stream:** Bridget / 02 (Partnerships, #1624 🔌UNBUILT). **Archetype:** B6 money-gate — a
  referral payout is money out, `always_gate` class-1 forever (A10 row 4). Bridget computes/attributes
  and drafts the payout; the payment is gated to a human / Audrey (A11 — Bridget owns the program clock,
  Audrey owns the money clock).
- **Trigger:** schedule — a referral-attribution period closes (referred deals reaching `won`, 02-A6),
  or a referral-partner statement/payout run is due.
- **Terminal outcome:** referred deals **attributed to the referring partner**, a **payout statement per
  partner** computed, and (gated) the **referral payout issued** — partners paid correctly, audited.
- **Procedure Steps** (B6: ground → compute → draft → MONEY GATE → actuate → log+mirror):
  1. `[automation]` **Ground** — match `won` deals (02-A6) to their referring `partner` + the program
     terms (rate/cap/window), **citing each deal + partner + program version + as-of** (A5); on **dormant
     `partner` schema → park** (A5c), never fabricate an attribution/payout (A5b). **L2.**
  2. `[automation]` **Compute** per-partner referral owed + the period total; build per-partner statements.
  3. `[automation]` **Draft the batch easy-button (B6 batch rule):** total-$ + partner count + a diff/
     exception view vs the prior period; items within variance tolerance ride one approval; any guard
     trip (new partner, >X% swing, first-time payout, disputed attribution) **splits out and gates
     individually** (variance threshold per-procedure policy, `TBD #1586`). **Partner-axis A7** — no
     partner's referral data bleeds into another's statement.
  4. `[gui-step]` **MONEY GATE — `always_gate`** (A2 class-1): exact $, SoR (QBO), no-clean-undo flag
     (A10 row 4). **SEAM → Audrey** issues the payment (money clock, A9a — QBO SoR, mirror) [→ Stream 09].
  5. `[automation]` Post-approval → statements distributed (templated, B7 transactional sub-class);
     payment **idempotency-keyed** (partner + period), replay = no-op (A9b); **read back** QBO before
     stamping paid (A9c); on partial failure → halt, no auto-rollback (A10).
- **Autonomy ceiling:** **L2** (compute + draft); the **referral payout is `always_gate` forever** (money
  out, A10 row 4); statement distribution → L3 (templated, B7).
- **Human-in-loop:** Sterling pairing → Nick gates the payout; Audrey actuates under her own pairing.
  Recede per A3 once #1624 builds the agent; the payout gate stays the floor forever.
- **Substrate deps:** 🔌**#1624** (Bridget UNBUILT) · 🔌**#1623** (`partner` schema not built — referral
  attribution has nowhere to land) · 02-A6 (won feed) · QBO (Stream 09, #1580) · 🔌#991 · 🔌#119. Ships
  **propose-only** until #1624 + #1623 land (A5c). **subject:** partner.

---

## Coverage notes

**Count: 27 Operating Procedures** — Chase 8 (02-A1…A8) · Vance 10 (02-B1…B10) · **GTM-governance 7
(02-C1…C7: Sterling 4 [C1-C4] + Chase 2 [C5/C7, C7 w/ Belle] + Grace 1 [C6]) · Channel 2 (02-D1/D2,
Bridget, #1624 🔌UNBUILT)**.

**Doctrine inheritance (ADR-0136):** every procedure names its archetype (B1–B9) and inherits A1–A11.
The stream showcases two anchoring rules: **A11 obligation/action separation** — Chase owns the
transaction/close but **has no send path** (every customer-facing send is `always_gate`, the act
gates), and Vance is a **sentinel, not a buyer** (02-B1/B6/B8 watch clocks and NEVER auto-actuate the
renew/cancel/buy, B9); and **the A10 money ceiling** — 02-B2's MONEY GATE is `always_gate` forever
(money out has no clean undo, A10 row 4 / 0184), with every B4 audit (B3/B5/B9) routing its commit
through it. Per A5c, deepened steps depending on dormant substrate (#389/#991/#119/0184/Pax8-bronze/
KQM-bronze/DocuSign-consent) ship **propose-only** until built.

**GTM-governance + Channel additions (#1625, cluster 1):** the stream now also carries the GTM-
governance machinery above the deal — **Sterling's** rate-card/discount governance (02-C1), deal desk
(02-C2), commission run (02-C3), and GTM forecast (02-C4); **Chase's** RFP/bid assembly (02-C5) and the
win-loss brief (02-C7, w/ Belle); **Grace's** external security-questionnaire attestation (02-C6) — and
the **Channel** section (02-D1 channel/alliance/co-sell + marketplace · 02-D2 referral-partner program),
owned by **Bridget (Partnerships, #1624)**. This is the canonical proof of three doctrine rules in the
GTM layer: **A11 obligation/action separation** (Sterling owns the GTM clocks/standards but NEVER
actuates — every price/deal/payout gates to a human or splits to the worker; the deal desk 02-C2 is the
GTM twin of the Marshall CAB gate); **B6 money-gate forever** (commissions 02-C3 and referral payouts
02-D2 are money out — `always_gate` with the batch easy-button + per-item variance split); and **B4's
external split** (the security questionnaire 02-C6 is an external assertion — human-signed, never
self-attested, exactly like Grace's SOC2 attestation OP-07-06). **Seams (every cross-agent hand-off is
an explicit Procedure Step, A11):** Belle→Chase = the `lead_score` MQL crossing (02-A1/A4) **+ the
partner-axis co-sell crossing Bridget→Chase (02-D1)**; Stream 03 (Pierce) = 02-A6 boundary; Stream 08
(Celeste) = 02-A6/A8/B8/B9 emit Handoffs (she owns relationship, assigns back to Chase — the pinned
seam); Stream 09 (Audrey) = margin-grounding (A7) + bill_attach (B2) + cost-variance/consolidation
(B7/B9) **+ commission/referral payout issuance (02-C3/D2 — Audrey owns the money clock)**; Stream 07
(Grace/Cyrus) = the RFP security content (02-C5) + the questionnaire attestation (02-C6).

**Schema gaps (per A5c, the dependent procedures ship propose-only until built):** 🔌**#1623** the
`partner` silver schema (all of 02-D*) · 🔌**#1624** the Bridget agent (all of 02-D*) · **no
price-book/rate-card silver entity** (02-C1) · **no deal-desk exception record** (02-C2) · **⚠ no
comp/commission-plan model and NO issue yet** (02-C3 — flagged inline here, deliberately not filed per
the assignment). **AR/cash collection is OUT** — "→ Cash" terminates at e-signed agreement /
procurement-fulfilled + billing-consequence; AR/invoice/collections belongs to Stream 09 (blocked on
#1580). Nearly every procedure is deploy-dormant pending creds + collectors; the whole Channel section
(02-D*) is additionally dormant on #1624 + #1623.
