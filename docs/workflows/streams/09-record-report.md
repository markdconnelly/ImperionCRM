# Stream 09 — Record → Report

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-0133](../../decision-records/ADR-0133-operating-procedure-catalog.md). Terms
> **Operating Procedure** / **Procedure Step** are defined in [`CONTEXT.md`](../../../CONTEXT.md).
>
> **Workflow Doctrine (ADR-0136) is inherited by every procedure below — not restated per entry.**
> The eleven cross-cutting rules (A1–A11) and the nine archetype step-templates (B1–B9) are the
> floor. Each procedure names its **archetype** and declares only its *deltas*. The doctrine carries:
> the universal `always_gate` set (A2) · L0 ship-dial (A3) · the 4-part easy-button bar at every gate
> (A4) · the evidence floor — cite + as-of, empty→park/delegate (A5) · computed-urgency notification
> + `reports_to` fallback (A6) · pool-never-bleed (A7) · idempotent actuation + read-back (A9) ·
> reversibility→derived-ceiling + halt-no-rollback (A10) · obligation/action separation (A11).
> **Stream 09 is the canonical showcase of A9 (idempotent actuation, external-SoR write):** QBO is
> the external money SoR — **Audrey mirrors, never owns; no money movement ever** (A9a); every recon
> stamp is a guarded, idempotency-keyed, **read-back-confirmed** verification (A9b/c), never a payment.

**Owner agents:** **Audrey** (Finance) — **READ-ONLY**, ladder ceiling **L2** by structure,
**advises-never-gates**; QBO = SoR, **no money movement ever**; **salary non-disclosure =
refusal-class** HARD rule (aware of Pay/Mileage Rate for math, never discloses). **Sterling**
(Deputy CFO, `icm/executive/deputy-cfo/`) — revenue/finance **governance + synthesis** layer,
**L2 delegate-only** (never bypasses a sub-agent gauntlet).
**Owning ICM domains:** `icm/domains/finance/<wf>/` (Audrey) · `icm/executive/deputy-cfo/<wf>/`
(Sterling, exec tier ADR #1535/PR#1563, scaffold #1536). All flagged DORMANT where substrate unhydrated.

**Seam (Stream 09 is the terminal reporting sink):** almost every procedure here is **read-only
over silver another stream produced**. Hand-off STEPS that cross OUT (margin grounding → Chase
#1415 / Pierce #1308) are enumerated as explicit `[automation]` steps INSIDE the owning Audrey
procedure — never duplicated in Streams 02/03. Hand-offs IN (every agent → Celeste client-360;
time/expense attestation produced by employees) are referenced, not re-owned. **Audrey advises,
never gates** — a margin hand-off lights a number on someone else's action; their gauntlet/always_gate decides.

**subject:** `both` — these run on Imperion's OWN books (Imperion-as-client dogfold tagged per-procedure).
v1 TESTING routes every human role to **Mark (proxy)**.

**Driving policy (every procedure):** `TBD (mark-blocker: company-policy-collection)` (D4, #1586) —
**except** the Expense procedures, which cite the AUTHORED **Expense Policy** (`docs/policies/expense-policy.md`,
#493, IT Glue master). QBO=SoR is ADR-0123/0085.

**Substrate/dormancy legend:** [DORM-CRED]=live credential (QBO/Autotask) · [DORM-AR]=**AR/invoice silver
entity (#1580** — own-vs-mirror open, relates #668 decision CLOSED but entity NOT built) · [DORM-ALLOC]=cost/revenue-allocation
views (#1044/#1308, v2-ish) · [DORM-EVENT]=event/handoff bus #991 · [DORM-EMBED]=Voyage seed #389 (Audrey
reads OKF-grounded silver by declaration → mostly NOT blocked) · [DORM-TRIG]=trigger-sync #119.

**Archetype map (B-templates this stream instantiates).**

| Procedure | Archetype |
|---|---|
| 09-01 timesheet attestation context | **B4 audit-attest** (attestation, internal) |
| 09-02 payroll reconciliation assist | **B6 money-gate** (recon → human pays; A9 read-back) |
| 09-03 weekly Time Ticket → Autotask | **B6/B2** external-SoR write (idempotent, A9) — BE-owned |
| 09-04 expense policy-check engine | **B4 audit-attest** (pre-attest measure, internal) |
| 09-05 Expense Report → Reimbursed | **B6 money-gate** (recon → human reimburses; A9) |
| 09-06 MileIQ mileage ingestion | **B6** ingest-leg (derive $ comp-confined; ingestion in LP/PL) |
| 09-07 unified Monthly Close | **B4 audit-attest** (close-readiness attest, internal) |
| 09-08 recurring-invoice pre-check | **B6 money-gate** (flag → Mark-gated QBO push) |
| 09-09 AR aging + cash-flow summary | **B3 synthesis-brief** (read-only, no send) |
| 09-10 collections / AR-dunning | **B7 client-facing-send** (the SEND is human always_gate) |
| 09-11 AP intake | **B3 synthesis-brief** (read/observe into cash-flow) |
| 09-12 renewal margin grounding | **B3 synthesis-brief** → Chase seam (A11; advise-never-gate) |
| 09-13 project cost validation | **B3 synthesis-brief** → Pierce seam (A11; advise-never-gate) |
| 09-14 per-client/project margin-watch | **B3 synthesis-brief** (read-only flag, 💤v2) |
| 09-15 BI hub finance reporting | **B3 synthesis-brief** (read/render, no actuation) |
| 09-16 Finance Defined-Way governance | **B3 synthesis-brief** (Sterling exec, L2 delegate-only) |
| 09-17 revenue-governance oversight | **B3 synthesis-brief** (Sterling exec, L2 delegate-only) |

---

# A. TIME leg

## 09-01 · Surface timesheet attestation context + flag hard deviations
- **Owner / Stream:** Audrey / 09. **Archetype:** B4 audit-attest (internal — measure + surface, the
  assertion is the employee's attestation, never Audrey's).
- **Trigger:** Employee opens a weekly Timesheet for attestation (Open→Submitted boundary), or Reconciliation recomputes a day verdict.
- **Terminal outcome:** Reconciliation memory-jogger + per-day verdict (Balanced/Under-/Over-logged) +
  the 6-deviation list rendered pre-attest; **Hard** deviations (over-logged, same-day overlap) flagged block-attest.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → sign-off):
  1. `[automation]` **Scope + collect evidence** — read silver `time_record` (website attendance
     authoritative + Autotask allocation corroborating) for employee+week + Ancillary Tickets, **citing
     each source row + as-of** (A5; empty allocation → degrade to attendance-only, say so per A5c)
     (`runTimeReconciliation`, BE #112). **L0.**
  2. `[automation]` **Evaluate** — derive daily verdict + the 6 typed deviations; tag Hard vs Soft. **L1.**
  3. `[gui-step]` **Compose + sign-off** — employee reviews the memory-jogger on `/timesheets`;
     resolves/explains Soft with a note. **Hand-off IN:** employee owns the attest act (B4: the
     external/binding assertion is human, not the agent's measurement).
  4. `[hybrid]` Attest gate: any unresolved **Hard** deviation → block submit (refusal-class, not a dial
     setting). Else employee submits → Submitted + self-lock.
- **Driving policy:** inherits ADR-0136 A2/A4/A5 baseline + TBD (#1586) — time-attestation.
- **Realization:** `icm/domains/finance/attestation-context/` (procedure-only until built; read loop FE→BE-live today).
- **Autonomy ceiling:** L0–L1 — derived from the most-irreversible step: Audrey only surfaces/flags
  (reversible internal, A10 row 1), never edits the sheet. Hard-deviation block = **structural attest
  gate** (B4 internal assertion floor), not Audrey-gated.
- **Human-in-loop:** Employee (Mark proxy v1) attests; recedes only to the always-on Hard-deviation block.
  always_gate floor: the attest itself is always human (refusal-class self-lock).
- **Substrate deps:** [DORM-CRED] Autotask allocation half empty until `conn-company-autotask`; degrades to attendance-only verdict.
- **subject:** both. **Maps to:** wired READ end-to-end today (#464/#502/#504); **#1424**.

## 09-02 · Payroll reconciliation assist (expected-pay vs QBO → Paid readiness)
- **Owner / Stream:** Audrey / 09. **Archetype:** B6 money-gate — but **inverted**: Audrey never moves
  money (A9a, QBO=SoR); she reconciles, the **payment authorization is the human's `always_gate`** (A2 class-1).
- **Trigger:** A Timesheet reaches Approved (admin); or the monthly payroll-recon timer (15-min, BE).
- **Terminal outcome:** Per-employee per-period verdict — **matched / outstanding / mismatch-by-amount** —
  escalated to CFO; sets Timesheet **Paid** when QBO Purchase matches (app verifies, **never pays**).
- **Procedure Steps** (B6: ground → compute → draft → MONEY GATE → actuate(recon, idempotent) → log):
  1. `[automation]` **Ground** — read Approved `timesheet` (approved_minutes, comp-free
     `timesheet_payroll_status` view), **citing the approval + as-of** (A5). **L0.**
  2. `[automation]` **Compute** expected pay = approved hours × effective Pay Rate. **Audrey is AWARE of Pay
     Rate, uses it in math, NEVER discloses it** (salary non-disclosure refusal-class; payroll-RLS
     defense-in-depth) (`computeExpectedPay`, sole pay_rate reader, BE #115). **L1.**
  3. `[automation]` **Read back the SoR** — QBO `qbo_purchases` bronze (read-only, A9a) for employee+period;
     exact-cent match (v1 1099 gross=net) (A9c reconcile-don't-assume). **L1.**
  4. `[automation]` On match → **guarded idempotent UPDATE** payroll_approved→paid (+paid_at,
     +qb_payment_ref), idempotency-keyed on the QBO payment ref so a replay is a no-op + audit note (A9b);
     this is a **verification stamp, not a money write**. On mismatch/outstanding → **auto-raise an internal
     flag** to cockpit/CFO (urgency computed per A6) (**L2**). Report only the *result*, never the rate.
  5. `[gui-step]` **MONEY GATE** — CFO/finance (Nick, Mark proxy) grants Payroll Approval on
     `/timesheets/payroll` (authorizes the manual payment OUTSIDE the app), presented as the 4-part
     easy-button (A4: drafted recon + cited why + one-click approve + exact-$ consequence). **always_gate (A2 class-1).**
- **Driving policy:** inherits A2/A9 baseline + TBD (#1586) — payroll; reimburse-not-payroll separation per Expense Policy.
- **Realization:** `icm/domains/finance/payroll-recon/`.
- **Autonomy ceiling:** **L2** (auto-raise mismatch flags; the recon stamp is reversible-internal, A10 row 1).
  Setting Paid = verification stamp, not money movement. The *payment* + Payroll Approval = human
  **always_gate** (A2 class-1; money settled = no clean undo, A10 — gated forever).
- **Human-in-loop:** CFO/finance approves payment monthly; recedes as recon auto-confirms matches, but the
  payment authorization stays human forever (floor).
- **Substrate deps:** [DORM-CRED] QBO connected (DONE 2026-06-19 prod) + Autotask cred; degrades to MANUAL payment-id entry (UAT-acceptable).
- **subject:** both. **Maps to:** **#1425**.

## 09-03 · Write the weekly Time Ticket to Autotask (attestation artifact)
- **Owner / Stream:** Audrey / 09 — **⚠ OWNERSHIP NUANCE (A11 seam):** the write is **BE-owned**
  (`runTimeTicketExecutor`), NOT Audrey's; she is the finance-domain owner of the *documentation procedure*
  and surfaces it as context, but the actuator is the time-ticket executor (read-only Audrey *reads/flags*;
  she does not own this write). **Flag for Mark.** **Archetype:** external-SoR write — A9 idempotent
  actuation (B6/B2 shape; Autotask=SoR, the agent mirrors).
- **Trigger:** Admin Approves a Submitted Timesheet → enqueues a pending `time_ticket` row.
- **Terminal outcome:** ONE idempotent weekly Time Ticket on the Autotask house company/Timesheets queue
  documenting the reconciled summary (links Ancillary Tickets + per-day hours; never re-creates Ticket Time
  Entries → no double-count); mirrored back into Imperion.
- **Procedure Steps** (A9 external-SoR: map → write(idempotent) → read-back/reconcile):
  1. `[gui-step]` Admin Approves (may inline-correct vs the immutable attested snapshot, audited) on
     `/timesheets/approvals`. **Hand-off IN** from employee attestation (the gate is upstream).
  2. `[automation]` BE claims the pending row under advisory lock → creates the Time Ticket outside tx →
     writes `external_ref`, state→written, **idempotency-keyed on `external_ref` so a replay is a no-op +
     audit note, never a double-ticket** (A9b; ADR-0044/0045 idempotency). **L2.**
  3. `[automation]` On reopen→re-approve of an already-written sheet: reset write_state→pending + PATCH the
     existing Autotask ticket (read-back-and-reconcile, A9c — never create a second; recorrection gap, BE #103/PR#113).
- **Driving policy:** inherits A9 baseline + TBD (#1586).
- **Realization:** BE executor (live code); finance-domain procedure-only.
- **Autonomy ceiling:** L2 (idempotent internal/Autotask write of an attestation artifact; reversible via
  PATCH, A10 row 2; **not money or customer-facing** so no `always_gate` — the human gate is the upstream
  admin approval). NOTE this is a **WRITE** — sits with BE executor, NOT Audrey's read-only catalog (A11 seam).
- **Human-in-loop:** Admin approval upstream is the gate; the write auto-runs post-approval.
- **Substrate deps:** [DORM-CRED] Autotask house company + Timesheet queue id + KV cred (Mark-gated, LIVE not BUILD); [DORM-TRIG] #119.
- **subject:** both.

---

# B. EXPENSE leg

## 09-04 · Expense policy-check engine (pre-attest memory-jogger)
- **Owner / Stream:** Audrey / 09. **Archetype:** B4 audit-attest (internal — measure policy conformance;
  the attestation assertion is the employee's, not Audrey's).
- **Trigger:** Employee adds/edits an Expense Item on an open monthly Expense Report; evaluated continuously pre-attest.
- **Terminal outcome:** Per-item policy verdicts as a memory-jogger; **Hard** violations (missing receipt
  ≥$25, over category hard-cap, dated outside month) block attest; **Soft** (suspected dup, over
  soft-threshold, billable missing client link, uncategorized) nudge and may be attested with a note.
- **Procedure Steps** (B4: scope(cite policy) → collect-evidence → evaluate → compose → sign-off):
  1. `[automation]` **Scope + evaluate** — run `expense_policy_violation` view (7 deterministic rules)
     over the report's items, **citing the Expense Policy version + each item as-of** (A5); suspected-duplicate
     = row-pair check. **L0/L1.**
  2. `[gui-step]` **Compose** — employee sees flags on `/expenses`; attaches missing receipts (out-of-pocket
     ≥$25; mileage receipt-EXEMPT), clears Hard, notes Soft.
  3. `[hybrid]` **Sign-off** — attest gate: every out-of-pocket item has a receipt AND all Hard cleared →
     submit (Open→Submitted, self-lock; B4 internal-assertion floor — the attest is human). Else blocked.
- **Driving policy:** inherits A4/A5 baseline + **AUTHORED — `docs/policies/expense-policy.md`** (#493, IT
  Glue master): attest-by-5th, IRS mileage rate, receipt ≥$25, reimburse ~10 biz days post finance-approve
  via QBO bill-payment (not payroll), admin makes final billable call.
- **Realization:** `icm/domains/finance/expense-policy/`.
- **Autonomy ceiling:** L0–L1 (flags only; reversible internal, A10 row 1). Hard-violation block = structural attest gate.
- **Human-in-loop:** Employee attests; admin makes final billable call (always human). Recedes to the Hard-block floor.
- **Substrate deps:** none hard (policy engine in-app/silver).
- **subject:** both. **Maps to:** expense epic #482; Audrey face **#1424** (deviation/flag playbook covers time+expense).

## 09-05 · Expense Report lifecycle → Reimbursed (reimbursement reconciliation assist)
- **Owner / Stream:** Audrey / 09 (recon assist) — admin/finance own the state transitions. **Archetype:**
  B6 money-gate (inverted — Audrey reconciles; the reimbursement is the human's `always_gate`, QBO=SoR A9a).
- **Trigger:** Employee submits monthly Expense Report (attest); then admin/finance progression; then monthly reimbursement-recon.
- **Terminal outcome:** Report walks Open→Submitted→Approved→Finance-Approved→**Reimbursed**; Reimbursed
  set when QBO bill-payment (Purchase) matches the approved reimbursable total (app verifies, **never
  reimburses**). Independent **billable** leg → Autotask `isBillableToCompany`+`companyID` for client pass-through.
- **Procedure Steps** (B6: ground/approve → MONEY GATE → actuate(recon, idempotent + read-back)):
  1. `[gui-step]` Admin Approves on `/expenses/admin` (corrects vs attested snapshot) → triggers idempotent
     Autotask ExpenseReport write (idempotency-keyed, A9b); admin sets final billable/companyID.
  2. `[gui-step]` **MONEY GATE** — Finance (CFO, `canApprovePayroll`) Finance-Approves → authorizes manual
     reimbursement OUTSIDE the app, presented as the 4-part easy-button (A4, exact-$ + irreversibility).
     **always_gate (A2 class-1).**
  3. `[automation]` **Reconcile (A9c read-back)** — Audrey reads approved reimbursable total + QBO Purchase
     (read-only, A9a) → **matched/outstanding/mismatch** flag, cited + as-of (A5); on match sets Reimbursed
     (verification stamp, idempotency-keyed). Books as a SEPARATE AP bill, distinct from payroll wage. **L2.**
- **Driving policy:** inherits A2/A9 baseline + Expense Policy (authored, `docs/policies/expense-policy.md`, #493).
- **Realization:** `icm/domains/finance/reimbursement-recon/` (recon assist); lifecycle FE/BE live (#546–553).
- **Autonomy ceiling:** **L2** for Audrey's recon-mismatch flag (reversible-internal stamp, A10 row 1);
  Finance Approval + the reimbursement = human **always_gate** (money settled = no clean undo, A10).
- **Human-in-loop:** Admin + finance approvals; recedes as recon auto-confirms; the reimbursement authorization is the permanent floor.
- **Substrate deps:** [DORM-CRED] QBO (live) + receipt storage (live #496); Autotask write [DORM-CRED]+[DORM-TRIG].
- **subject:** both. **Maps to:** **#1425** (recon assist).

## 09-06 · MileIQ mileage ingestion → Expense Item(mileage)
- **Owner / Stream:** Audrey / 09 (finance-domain procedure; ingestion executes in LP/Pipeline). **Archetype:**
  B6 ingest-leg — feeds the 09-05 money-gate; the $ derivation is comp-confined, never an un-gated surface.
- **Trigger:** **v1:** employee enters manual mileage on `/expenses/mileage/new`. **v2:** MileIQ auto-capture
  (per-user OAuth `drives:read:all`, paywalled → deferred).
- **Terminal outcome:** A silver `expense_item(kind=mileage)` (miles authoritative; amount = miles ×
  effective Mileage Rate, derived BY BACKEND — the sole comp reader; miles-only shown to employee, $ comp-gated).
- **Procedure Steps:**
  1. `[gui-step]` Employee enters miles + origin/destination (+ ticket if billable) — miles only, no $
     (Mileage Rate is payroll-gated; salary/rate non-disclosure refusal-class). v1.
  2. `[automation]` Lands in `website_mileage` bronze → Pipeline merges → silver `expense_item` (PL #124),
     citing the source bronze row + as-of (A5). v2: MileIQ drive pull (LP #167) → `mileiq_drive` bronze. **L0/L1.**
  3. `[automation]` BE derives $ = miles × effective Mileage Rate on approval (comp-confined; the $ never
     surfaces to employee/agent un-gated). **L1.**
- **Driving policy:** inherits A5 baseline + Expense Policy — IRS standard business rate, business miles only, no receipt.
- **Realization:** ingestion in LP/Pipeline; finance procedure-only.
- **Autonomy ceiling:** L0–L1 (ingest + derive = reversible internal, A10 row 1; the $ never surfaces un-gated).
- **Human-in-loop:** Employee enters (v1); recedes to auto-capture at v2.
- **Substrate deps:** [DORM-CRED] MileIQ creds = **v2** (#495/#811 moved to v2). v1 manual path LIVE.
- **subject:** both.

---

# C. MONTHLY CLOSE (both legs)

## 09-07 · Run the unified Monthly Close (per employee, time + expense)
- **Owner / Stream:** Audrey / 09 (close-readiness assist) — the **Close TASK** is owned by finance (CFO);
  Audrey assists read-only. **Archetype:** B4 audit-attest (internal — measure readiness + route blockers;
  the close assertion is the CFO's, A11 obligation/action seam).
- **Trigger:** Month-end schedule (the single monthly finance task); validates both QBO payment legs per employee.
- **Terminal outcome:** Per-employee close packet — aggregated time total (weekly Timesheets rolled up) +
  reimbursable expense total + both QBO match statuses (Paid for time / Reimbursed for expense) + open
  obligations (approved-but-not-confirmed-paid) — and the manual payment steps validated complete for the month.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → route-gaps → sign-off):
  1. `[automation]` **Collect + evaluate** — read across `time_record`/`timesheet`,
     `expense_item`/`expense_report`, both reconciliations (`monthly_close` view, FULL OUTER JOIN, comp-free),
     **citing each leg + as-of** (A5; read-back of both QBO legs, A9c) → **close-readiness checklist** +
     blocker flags (all timesheets attested? expenses approved? recons matched?). **L2** auto-raise.
  2. `[gui-step]` **Route-gaps** — finance reviews `/monthly-close`; chases blockers (un-attested sheets, un-matched payments).
  3. `[hybrid]` **Sign-off** — finance confirms both payment legs done & matched for the month → manual
     payment steps validated; close advances (the close confirmation is the human's, A11).
- **Driving policy:** inherits A4/A5/A9 baseline + TBD (#1586) — close cadence/policy (attest-by-5th anchor exists for expense).
- **Realization:** `icm/domains/finance/close-readiness/`; `/monthly-close` GUI live (#491/PR#559).
- **Autonomy ceiling:** **L2** (Audrey's checklist + flags = reversible internal, A10 row 1).
  Closing/confirming payment = human **always_gate** (the payment legs are settled money, A2 class-1).
- **Human-in-loop:** CFO/finance owns the close; Audrey recedes as recons auto-confirm; the close confirmation is the floor.
- **Substrate deps:** [DORM-CRED] QBO; rolls up 09-02 + 09-05.
- **subject:** both. **Maps to:** **#1427**.

---

# D. AR / AP / BILLING

## 09-08 · Pre-check a generated recurring invoice before the Mark-gated QBO push
- **Owner / Stream:** Audrey / 09. **Archetype:** B6 money-gate (Audrey grounds + flags; the **QBO push is
  the human's `always_gate`** — customer-facing + money, A2 class-1/2; QBO=SoR A9a, the agent never pushes).
- **Trigger:** A `generated_invoice` draft is produced (recurring invoice generation, #1095/#1045) and queued for the QBO push.
- **Terminal outcome:** Per-draft anomaly verdict (missing lines, rate-vs-contract mismatch, hours ≠
  attested time) flagged **BEFORE** the push — preventing a money error reaching a client, purely by
  reading. (Highest-leverage Audrey playbook.)
- **Procedure Steps** (B6: ground → compute → draft-flag → MONEY GATE → actuate(human, external SoR)):
  1. `[automation]` **Ground** — read the `generated_invoice` draft + contract rate + attested `time_record`
     for the period, **citing each + as-of** (A5; empty AR draft → park, never fabricate, A5b). **L1.**
  2. `[automation]` **Compute** — tie-out: expected vs actual lines/rates/hours; write the arithmetic
     (inputs, expected, actual, delta, as-of date). Flag anomalies → park for human (A4 easy-button). **L2.**
  3. `[gui-step]` **MONEY GATE** — finance reviews the flag; corrects upstream; **Mark-gated** QBO invoice push
     (customer-facing + money → **always_gate**, A2 class-1/2). **Hand-off IN/OUT:** the push is owned by the
     AR/AP billing path, not Audrey (A11 — she lights the number, never moves money).
- **Driving policy:** inherits A2/A9 baseline + TBD (#1586) — billing; QBO=SoR (read-only our side per ADR-0085).
- **Realization:** `icm/domains/finance/invoice-precheck/`.
- **Autonomy ceiling:** **L2** (flag only = reversible internal, A10 row 1). The QBO push =
  customer-facing+money **always_gate**, Mark-gated (no clean undo once a client is billed, A10) — NOT Audrey's to execute.
- **Human-in-loop:** Finance + Mark gate the push; Audrey recedes to the always-on pre-check flag; push authorization is the permanent floor.
- **Substrate deps:** [DORM-AR] **#1580** AR/invoice silver — needs the `generated_invoice`/AR draft to exist
  (#1095 CLOSED but verify built; own-vs-mirror open); [DORM-CRED] QBO. Per A5c, ships propose-only until the AR entity lands.
- **subject:** both. **Maps to:** **#1428**.

## 09-09 · AR aging + cash-flow visibility summary (read-only, NOT dunning)
- **Owner / Stream:** Audrey / 09 (summary) — Sterling rolls up into the financial-pulse (Stream 11; do NOT
  duplicate the synthesis brief here). **Archetype:** B3 synthesis-brief — delegate-only, read-only, **no actuation**.
- **Trigger:** Scheduled (weekly/monthly) or on-demand for CFO/board.
- **Terminal outcome:** A read-only AR aging + cash-position summary for CFO/board. **Explicitly NOT
  dunning** — sending payment reminders is external and belongs to the Collections leg (09-10); Audrey only summarizes.
- **Procedure Steps** (B3: gather(cite) → synthesize → narrate → deliver → log):
  1. `[automation]` **Gather** — read AR aging (Autotask/QBO mirror or AR silver if owned) + cash position,
     **citing each + as-of** (A5). **L0.**
  2. `[automation]` **Synthesize + narrate** — aging buckets + cash-flow visibility summary (signal vs
     inference labeled, as-of dated; flag dormancy honestly per A5c). **L1.**
  3. `[automation]` **Deliver (B3 launchpad)** — **Hand-off OUT:** emit aging signals to Celeste (client-360
     financial-health Handoff) + Sterling (financial-pulse); an at-risk item pre-stages the owning **09-10
     collections** procedure in a parked/draft state (B3 — never actuates; the send stays a human gate). **L2** auto-raise.
- **Driving policy:** inherits A5/A7 baseline + TBD (#1586).
- **Realization:** `icm/domains/finance/ar-aging-summary/`; BI hub `/reporting#finance`.
- **Autonomy ceiling:** **L0–L2** (read + auto-raise at-risk-revenue flag = reversible internal, A10 row 1).
  **HARD: no external send** — dunning is structurally out of Audrey's catalog (refusal-class boundary).
  Cross-client correlation stays internal/anonymized (A7 pool-never-bleed).
- **Human-in-loop:** CFO consumes; any reminder send routes to the Collections leg (09-10) + human. Floor = Audrey never sends.
- **Substrate deps:** [DORM-AR] **#1580** AR/invoice entity (own-vs-mirror Mark-gated, entity NOT built); [DORM-CRED] QBO.
- **subject:** both. **Maps to:** **#1429**.

## 09-10 · Collections / AR-dunning (overdue invoice → reminder)
- **Owner / Stream:** **Audrey OWNS the procedure** (D8), but she is read-only — so the dunning **SEND is a
  human `[gui-step]`/always_gate in v1** (Mark proxies). Audrey detects/drafts; the send is never hers to
  actuate. (orchestration-matrix names a "Collections / AR-dunning" agent; until a dedicated sender lands,
  the send stays the human gate.) **Archetype:** B7 client-facing-send — the **SEND is `always_gate`
  class-2** (no transactional-ack carve-out applies: a dunning notice is committal/money-bearing).
- **Trigger:** An invoice crosses overdue (aging threshold).
- **Terminal outcome:** A drafted, consent-clean payment reminder **sent** (gated) → payment chased → aging cleared.
- **Procedure Steps** (B7: ground → compose → SEND GATE → send → log):
  1. `[automation]` **Ground** — detect overdue invoice; Audrey/AR-aging (09-09) surfaces it, cited + as-of (A5). **L0.**
  2. `[automation]` **Compose** — draft the reminder (no fabricated balance/timeline; opt-out + frequency
     hard stops, B7). **L1.**
  3. `[gui-step]` **SEND GATE (🔒 customer-facing + money) — always_gate, human-approved (v1, Mark proxy)**
     (A2 class-2; B7 — communicative/committal, stays gated; Audrey is read-only so a human always sends).
- **Driving policy:** inherits A2 baseline + TBD (#1586) — collections policy.
- **Realization:** `icm/domains/finance/collections/` (Audrey-owned procedure; sender unbuilt).
- **Autonomy ceiling:** detect L0 → draft L1 → **send always_gate** (never auto — Audrey tops at L2
  read-only and never sends; A11 — she owns the obligation, a human performs the send).
- **Human-in-loop:** human approves every send (v1, Mark proxy); the send authorization is the permanent floor.
- **Substrate deps:** [DORM-AR] **#1580** AR/invoice silver + #1096; [DORM-CRED] QBO/send channel. Ships propose-only per A5c until built.
- **subject:** both. **Maps to:** **#1096** (AR aging/collections), #668.

## 09-11 · AP intake (vendor bill capture for visibility)
- **Owner / Stream:** Audrey / 09 (read/observe) — **⚠ possible OWNERSHIP overlap with Vance
  (procurement/vendor spend): Audrey = books visibility, Vance = vendor lifecycle.** D8 assigns AP intake to
  **Audrey**; flag to Mark. **Archetype:** B3 synthesis-brief — read/observe into the cash-flow view; **no
  actuation, no payment** (A9a — QBO=SoR; Audrey mirrors AP, never pays).
- **Trigger:** A vendor bill arrives / a QBO AP entry appears.
- **Terminal outcome:** AP obligations visible in the cash-flow view (read-only); Audrey never pays.
- **Procedure Steps** (B3: gather(cite) → synthesize → deliver):
  1. `[automation]` **Gather** — read AP/vendor bills (QBO read-only / Autotask), cited + as-of (A5). **L0.**
  2. `[automation]` **Synthesize + deliver** — surface upcoming AP obligations into cash-flow visibility +
     Sterling pulse (B3 — feeds the brief, never actuates). **L2.**
- **Driving policy:** inherits A5/A9 baseline + TBD (#1586).
- **Realization:** `icm/domains/finance/ap-intake/` (unbuilt).
- **Autonomy ceiling:** L0–L2 (read + flag = reversible internal, A10 row 1). No payment (money out =
  always_gate class-1, structurally out of Audrey's catalog).
- **Human-in-loop:** finance pays outside the app (always).
- **Substrate deps:** [DORM-AR] **#1580** / [DORM-CRED].
- **subject:** both. **Maps to:** **#1097** (AP intake), **#1098** (cash-flow view).

---

# E. PROFITABILITY / MARGIN + hand-off STEPS

## 09-12 · Renewal margin grounding (Audrey → Chase hand-off step)
- **Owner / Stream:** Audrey / 09 (advise-only; the renewal itself is Chase/Stream 02). **Archetype:** B3
  synthesis-brief → **A11 obligation/action seam** to Chase (Audrey owns the margin standard; Chase performs
  the renewal act — they meet at an explicit step, never co-own).
- **Trigger:** Chase drafts a renewal reprice/proposal and requests margin grounding (renewal repricing playbook #1415).
- **Terminal outcome:** Proposed-vs-historical margin intel lit up on Chase's proposed renewal — flag if
  proposed margin below floor or well below historical. **Audrey informs; she does not gate.**
- **Procedure Steps** (B3: gather(cite) → synthesize → deliver onto the owning worker's action):
  1. `[automation]` **Gather** — read proposed renewal pricing + historical margin (`invoice` +
     cost-allocation), cited + as-of (A5; empty allocation → say so, A5c). **L1.**
  2. `[automation]` **Synthesize** — compute proposed-vs-historical margin + floor check; write the tie-out
     (inputs/expected/actual/delta, as-of dated). **L2.**
  3. `[automation]` **Deliver — Hand-off OUT to Chase (#1415):** supply margin intel onto Chase's proposed
     action (the B3 launchpad — lights a number on Chase's gated send). The renewal send-for-signature is
     already **always_gate** (Chase's ceiling, A2 class-2); Audrey's number does not block it (A11 —
     she advises, never gates).
- **Driving policy:** inherits A5 baseline + TBD (#1586) — margin-floor policy.
- **Realization:** `icm/domains/finance/renewal-margin-grounding/`.
- **Autonomy ceiling:** **L1–L2** (flag onto another agent's action = reversible internal, A10 row 1).
  **advise-never-block** is structural — Audrey lights the number, the block/approve is human (Chase's always_gate send).
- **Human-in-loop:** human decides the renewal (Chase's gate). Audrey recedes to the always-on margin flag.
- **Substrate deps:** [DORM-ALLOC] cost/revenue-allocation for true margin (#1044); [DORM-AR] **#1580** invoice.
- **subject:** both. **Maps to:** **#1426**.

## 09-13 · Project cost validation (Audrey → Pierce hand-off step)
- **Owner / Stream:** Audrey / 09 (advise-only; project delivery = Pierce/Stream 03). **Archetype:** B3
  synthesis-brief → **A11 obligation/action seam** to Pierce (Audrey owns the cost truth; Pierce performs
  the delivery/scope act).
- **Trigger:** Pierce watches project margin/burn (RAID / project P&L #1308) and needs the cost truth validated.
- **Terminal outcome:** Validated cost-to-deliver (attested labor cost + expense + license/tool allocation)
  supplied onto Pierce's project P&L — over/under-run grounded in real cost. Read-only money; Pierce acts on delivery.
- **Procedure Steps** (B3: gather(cite) → synthesize → deliver onto the owning worker's action):
  1. `[automation]` **Gather** — read attested `time_record` → labor cost (comp-confined; rate
     non-disclosure refusal-class), expense allocation, tool/license cost, cited + as-of (A5). **L1.**
  2. `[automation]` **Synthesize** — validate budget/SOW vs actual; write the tie-out. **L2.**
  3. `[automation]` **Deliver — Hand-off OUT to Pierce (#1308):** supply the cost truth (B3 launchpad);
     Pierce decides the delivery/scope/change action (A11 — Audrey never gates delivery).
- **Driving policy:** inherits A5 baseline + TBD (#1586).
- **Realization:** `icm/domains/finance/project-cost-validation/`; ties project-accounting epic #1308.
- **Autonomy ceiling:** **L1–L2** (validate + flag = reversible internal, A10 row 1; never gates delivery).
- **Human-in-loop:** Pierce/PM acts; Audrey recedes to the always-on cost flag.
- **Substrate deps:** [DORM-ALLOC] #1308/#1044 cost-allocation views UNBUILT (main blocker — v1/v2 boundary; per A5c ships propose-only until built).
- **subject:** both. **Maps to:** **#1426**-adjacent / #1308.

## 09-14 · Per-client / per-project profitability margin-watch 💤 DEFERRED v2
- **Owner / Stream:** Audrey / 09. **Archetype:** B3 synthesis-brief — read-only flag, no actuation;
  cross-client margin patterns stay internal/anonymized (A7 pool-never-bleed).
- **Trigger:** Scheduled margin sweep per client/project.
- **Terminal outcome:** Margin-watch flags (declining margin, unprofitable client/project) → CFO/board.
- **Procedure Steps** (B3: gather(cite) → synthesize → deliver):
  1. `[automation]` **Gather + synthesize + deliver** — read cost/revenue-allocation → margin trend → flag
     to CFO/board, cited + as-of (A5; A7 — no client's specifics surface in another's context). **L2.**
- **Driving policy:** inherits A5/A7 baseline + TBD (#1586).
- **Realization:** `icm/domains/finance/margin-watch/`.
- **Autonomy ceiling:** L2 (flag = reversible internal, A10 row 1; never gates).
- **Human-in-loop:** CFO/board consume; Audrey never gates.
- **Substrate deps:** **DEFERRED to v2** — #1044 cost/revenue-allocation views unbuilt (audrey.md explicitly defers; A5c).
- **subject:** both.

---

# F. BI HUB REPORTING / DASHBOARDS

## 09-15 · Maintain the BI hub finance / cross-domain reporting surface
- **Owner / Stream:** Audrey (finance sections) + Sterling (cross-division synthesis = Stream 11, not here)
  / 09. **Archetype:** B3 synthesis-brief — read/render, **no actuation**; honest-data floor = A5c
  (never fake zeros — "No coverage" where the source is absent/dormant).
- **Trigger:** New BI read needed, or dashboard refresh; on-demand for CFO/board.
- **Terminal outcome:** `/reporting` BI hub (anchored finance + cross-domain sections) + dashboard intel
  strip render current aggregates; honest-data constraints respected (never fake zeros — "No coverage" where data absent).
- **Procedure Steps** (B3: gather(cite) → synthesize/render → deliver):
  1. `[automation]` **Gather** — read silver aggregates via `ReportsRepository`/`DashboardRepository` (one
     typed method per section, guarded mock fallback), each as-of dated (A5). **L0.**
  2. `[automation]` **Render** — finance/time-efficiency/expense aggregates (metric-generic for unstable
     metric names #135; no completion-flow analytics until ticket completed-dates land #300; "No coverage"
     where dormant, A5c — never a fabricated zero). **L0.**
  3. `[gui-step]` **Deliver** — CFO/board consume `/reporting#finance`; deep-link from the dashboard intel strip.
- **Driving policy:** inherits A5 baseline + TBD (#1586).
- **Realization:** BI hub live (epic #288, ADR-0062); finance/time-efficiency analytics #467/#492.
- **Autonomy ceiling:** L0 (read/render). No actuation.
- **Human-in-loop:** consumers only; no send.
- **Substrate deps:** fleet/security tables empty until collectors hydrate (#102); some sections render "no coverage" (A5c).
- **subject:** both. **Maps to:** **#467/#492** (analytics), #288 (hub).

---

# G. STERLING (Deputy CFO) — GOVERNANCE procedures

> Sterling's scheduled `financial-pulse` cross-division synthesis brief is **Stream 11** — NOT enumerated
> here. These are the finance/revenue **governance** procedures he owns within Stream 09.

## 09-16 · Finance Defined-Way governance (close cadence, recon discipline, dial posture)
- **Owner / Stream:** Sterling / 09 (exec governance). **Archetype:** B3 synthesis-brief — exec-tier,
  **L2 delegate-only, no actuation**; the governance standard (obligation) is Sterling's, the corrective
  act is the owning sub-agent's (A11 seam).
- **Trigger:** Standing finance-domain governance review; a divergence Vera surfaces; a new finance policy/cadence.
- **Terminal outcome:** The Finance Defined Way (close cadence, attestation discipline, recon-completeness,
  read-only-money invariant) encoded/maintained; finance workflows' autonomy-dial posture set conservatively; divergences routed.
- **Procedure Steps** (B3: gather(cite) → synthesize → deliver/route → delegate):
  1. `[automation]` **Gather** — read finance run ledger + recon-assurance + Vera conformance findings
     (delegate-only, pg.read + recall — NO direct actuation; L2 ceiling structural), cited + as-of (A5). **L2.**
  2. `[hybrid]` **Deliver/route** — recommend close-cadence / recon-policy / dial-posture changes → **route
     to Nick/Mark** (every governance-config/policy change is `always_gate`; exec tier never actuates, A3 floor).
  3. `[automation]` **Delegate** corrective work to the owning sub-agent (Audrey) via `delegate`/`handoff`
     cap — the sub-agent's gauntlet applies (B3 — pre-stages the worker's gated procedure, never bypasses it).
- **Driving policy:** inherits A3/A5 baseline + TBD (#1586) — finance governance policy.
- **Realization:** `icm/executive/deputy-cfo/finance-governance/` (exec tier ADR #1535; scaffold #1536).
- **Autonomy ceiling:** **L2 delegate-only** (synthesize/advise/orchestrate; NEVER bypass a sub-agent
  gauntlet; all world-changing acts inherit the executing sub-agent's ceiling, A11). always_gate: every
  governance-config/policy change → Nick/Mark.
- **Human-in-loop:** Nick (Deputy CFO's human) + Mark ratify; recedes as routine pulses auto-run, but every binding finance-governance change is human floor.
- **Substrate deps:** [DORM-EVENT] delegate/handoff cap on relationship bus (BE-W7 #437/#991); exec-tier scaffold #1536; [DORM-EMBED] recall #389.
- **subject:** both. **Maps to:** **#1549**.

## 09-17 · Revenue-governance: recurring-revenue + retention oversight
- **Owner / Stream:** Sterling / 09 (oversees the Chase/Celeste/Vance revenue division). **Archetype:** B3
  synthesis-brief — exec-tier, **L2 delegate-only, no actuation, no money**; cross-client revenue patterns
  stay internal/anonymized (A7).
- **Trigger:** Standing revenue review; renewal pipeline shift; at-risk-revenue flag from Audrey AR-aging (09-09) or Celeste.
- **Terminal outcome:** Recurring-revenue health + retention exposure synthesized for Nick;
  unprofitable-work + at-risk-revenue flags raised; corrective motions delegated to the division agents
  (Chase renewals, Celeste retention, Vance shelfware).
- **Procedure Steps** (B3: gather(cite) → synthesize → deliver → delegate):
  1. `[automation]` **Gather** — roll up renewal pipeline + AR-aging + margin flags (read + recall,
     delegate-only), cited + as-of (A5; A7 internal-only correlation). **L2.**
  2. `[automation]` **Deliver** — flag unprofitable work / at-risk revenue → Nick's brief (B3 launchpad). **L2.**
  3. `[automation]` **Delegate** to Chase (#1304 renewals) / Celeste (retention) / Vance (shelfware) — their
     gauntlets apply (pre-stages the gated worker procedure, never bypasses, A11).
- **Driving policy:** inherits A5/A7 baseline + TBD (#1586).
- **Realization:** `icm/executive/deputy-cfo/revenue-governance/`.
- **Autonomy ceiling:** **L2 delegate-only.** No direct actuation; no money (A11 — Sterling synthesizes, the division agents act under their ceilings).
- **Human-in-loop:** Nick consumes/decides; Sterling recedes to scheduled roll-up; binding revenue decisions = human floor.
- **Substrate deps:** [DORM-AR] **#1580** / [DORM-ALLOC] / [DORM-EVENT]; overlaps #1304 (renewals epic), #1045 (AR/AP).
- **subject:** both. **Maps to:** **#1549**.

---

## Provable-coverage note

Record→Report surface fully covered across Audrey (read-only, L2 ceiling, advises-never-gates; QBO=SoR no
money movement; salary non-disclosure refusal-class) + Sterling (exec governance, L2 delegate-only): Time
leg (09-01/02/03) · Expense leg (09-04/05/06) · Monthly Close (09-07) · AR/AP/billing (09-08/09/10/11) ·
profitability+margin hand-offs (09-12/13/14) · BI hub (09-15) · Sterling governance (09-16/17). The
hand-off STEPS out (margin → Chase #1415 / Pierce #1308) live inside the owning Audrey procedure, never
duplicated in Streams 02/03. Audrey's 6 authored v1 playbooks (audrey.md) map onto 09-01/02 (+03 context),
04/05, 07, 08, 09, 12 → leaf issues #1424–1429; 06 mileage, 11 AP, 14 v2-margin, 15 BI are
harvested-additional / adjacent-epic. All within the D3 step ceiling (3–8 steps each). **Doctrine
inheritance (ADR-0136):** every procedure names its archetype (B1–B9) and inherits A1–A11; the stream is
the canonical showcase of **A9 (idempotent actuation / external-SoR write)** — QBO is the external money
SoR, **Audrey mirrors and never owns; no money movement ever**, every recon stamp is idempotency-keyed +
read-back-confirmed, and every actual money/send act (payroll/reimbursement/QBO-invoice-push/dunning-send)
is a human `always_gate` (A2 class-1/2). Audrey **advises, never gates** (A11 — she lights the number on
another agent's gated action); salary/rate non-disclosure stays refusal-class. Per A5c, AR/invoice
procedures (08/09/10) ship propose-only until the **#1580** entity lands.

**Count: 17 Operating Procedures** (09-01 … 09-17): Time 3 · Expense 3 · Monthly Close 1 · AR/AP/billing 4 ·
margin hand-offs 3 · BI 1 · Sterling governance 2.
