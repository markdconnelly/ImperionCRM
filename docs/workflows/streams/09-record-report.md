# Stream 09 — Record → Report

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-NNNN](../../decision-records/ADR-NNNN-operating-procedure-catalog.md). Terms
> **Operating Procedure** / **Procedure Step** are defined in [`CONTEXT.md`](../../../CONTEXT.md).
>
> **D9 global principles apply to every procedure below** (encoded in each Human-in-loop field,
> not restated per entry): **P1** Nova-native human co-working (every flow co-works with a human
> through Nova) · **P2** each sub-agent's reasoning is ascribed back to the paired human, up the
> chain · **P3** an "easy button" at every human gate (prep to the goal, hand the human a one-click
> resolution) · **P4** urgent → dedicated chat, else → tag the team member in the shared Teams chat.

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

---

# A. TIME leg

## 09-01 · Surface timesheet attestation context + flag hard deviations
- **Owner / Stream:** Audrey / 09.
- **Trigger:** Employee opens a weekly Timesheet for attestation (Open→Submitted boundary), or Reconciliation recomputes a day verdict.
- **Terminal outcome:** Reconciliation memory-jogger + per-day verdict (Balanced/Under-/Over-logged) +
  the 6-deviation list rendered pre-attest; **Hard** deviations (over-logged, same-day overlap) flagged block-attest.
- **Procedure Steps:**
  1. `[automation]` Read silver `time_record` (website attendance authoritative + Autotask allocation
     corroborating) for employee+week + Ancillary Tickets (`runTimeReconciliation`, BE #112). **L0.**
  2. `[automation]` Derive daily verdict + the 6 typed deviations; tag Hard vs Soft. **L1.**
  3. `[gui-step]` Employee reviews the memory-jogger on `/timesheets`; resolves/explains Soft with a note.
     **Hand-off IN:** employee owns the attest act.
  4. `[hybrid]` Attest gate: any unresolved **Hard** deviation → block submit (refusal-class, not a dial
     setting). Else employee submits → Submitted + self-lock.
- **Driving policy:** TBD (#1586) — time-attestation.
- **Realization:** `icm/domains/finance/attestation-context/` (procedure-only until built; read loop FE→BE-live today).
- **Autonomy ceiling:** L0–L1 (Audrey surfaces/flags, never edits the sheet). Hard-deviation block = **structural attest gate**, not Audrey-gated.
- **Human-in-loop:** Employee (Mark proxy v1) attests; recedes only to the always-on Hard-deviation block.
  always_gate floor: the attest itself is always human (refusal-class self-lock).
- **Substrate deps:** [DORM-CRED] Autotask allocation half empty until `conn-company-autotask`; degrades to attendance-only verdict.
- **subject:** both. **Maps to:** wired READ end-to-end today (#464/#502/#504); **#1424**.

## 09-02 · Payroll reconciliation assist (expected-pay vs QBO → Paid readiness)
- **Owner / Stream:** Audrey / 09.
- **Trigger:** A Timesheet reaches Approved (admin); or the monthly payroll-recon timer (15-min, BE).
- **Terminal outcome:** Per-employee per-period verdict — **matched / outstanding / mismatch-by-amount** —
  escalated to CFO; sets Timesheet **Paid** when QBO Purchase matches (app verifies, **never pays**).
- **Procedure Steps:**
  1. `[automation]` Read Approved `timesheet` (approved_minutes, comp-free `timesheet_payroll_status` view). **L0.**
  2. `[automation]` Compute expected pay = approved hours × effective Pay Rate. **Audrey is AWARE of Pay
     Rate, uses it in math, NEVER discloses it** (salary non-disclosure refusal-class; payroll-RLS
     defense-in-depth) (`computeExpectedPay`, sole pay_rate reader, BE #115). **L1.**
  3. `[automation]` Read QBO `qbo_purchases` bronze (read-only) for employee+period; exact-cent match (v1 1099 gross=net). **L1.**
  4. `[automation]` On match → guarded idempotent UPDATE payroll_approved→paid (+paid_at, +qb_payment_ref).
     On mismatch/outstanding → **auto-raise an internal flag** to cockpit/CFO (**L2**). Report only the *result*, never the rate.
  5. `[gui-step]` CFO/finance (Nick, Mark proxy) grants Payroll Approval on `/timesheets/payroll`
     (authorizes the manual payment OUTSIDE the app). **always_gate.**
- **Driving policy:** TBD (#1586) — payroll; reimburse-not-payroll separation per Expense Policy.
- **Realization:** `icm/domains/finance/payroll-recon/`.
- **Autonomy ceiling:** **L2** (auto-raise mismatch flags). Setting Paid = verification stamp, not money
  movement. The *payment* + Payroll Approval = human **always_gate** (app never moves money).
- **Human-in-loop:** CFO/finance approves payment monthly; recedes as recon auto-confirms matches, but the
  payment authorization stays human forever (floor).
- **Substrate deps:** [DORM-CRED] QBO connected (DONE 2026-06-19 prod) + Autotask cred; degrades to MANUAL payment-id entry (UAT-acceptable).
- **subject:** both. **Maps to:** **#1425**.

## 09-03 · Write the weekly Time Ticket to Autotask (attestation artifact)
- **Owner / Stream:** Audrey / 09 — **⚠ OWNERSHIP NUANCE:** the write is **BE-owned** (`runTimeTicketExecutor`),
  NOT Audrey's; she is the finance-domain owner of the *documentation procedure* and surfaces it as context,
  but the actuator is the time-ticket executor (read-only Audrey *reads/flags*; she does not own this write). **Flag for Mark.**
- **Trigger:** Admin Approves a Submitted Timesheet → enqueues a pending `time_ticket` row.
- **Terminal outcome:** ONE idempotent weekly Time Ticket on the Autotask house company/Timesheets queue
  documenting the reconciled summary (links Ancillary Tickets + per-day hours; never re-creates Ticket Time
  Entries → no double-count); mirrored back into Imperion.
- **Procedure Steps:**
  1. `[gui-step]` Admin Approves (may inline-correct vs the immutable attested snapshot, audited) on
     `/timesheets/approvals`. **Hand-off IN** from employee attestation.
  2. `[automation]` BE claims the pending row under advisory lock → creates the Time Ticket outside tx →
     writes `external_ref`, state→written (ADR-0044/0045 idempotency). **L2.**
  3. `[automation]` On reopen→re-approve of an already-written sheet: reset write_state→pending + PATCH the
     existing Autotask ticket (recorrection gap, BE #103/PR#113).
- **Driving policy:** TBD (#1586).
- **Realization:** BE executor (live code); finance-domain procedure-only.
- **Autonomy ceiling:** L2 (idempotent internal/Autotask write of an attestation artifact; not money or
  customer-facing). NOTE this is a **WRITE** — sits with BE executor, NOT Audrey's read-only catalog.
- **Human-in-loop:** Admin approval upstream is the gate; the write auto-runs post-approval.
- **Substrate deps:** [DORM-CRED] Autotask house company + Timesheet queue id + KV cred (Mark-gated, LIVE not BUILD); [DORM-TRIG] #119.
- **subject:** both.

---

# B. EXPENSE leg

## 09-04 · Expense policy-check engine (pre-attest memory-jogger)
- **Owner / Stream:** Audrey / 09.
- **Trigger:** Employee adds/edits an Expense Item on an open monthly Expense Report; evaluated continuously pre-attest.
- **Terminal outcome:** Per-item policy verdicts as a memory-jogger; **Hard** violations (missing receipt
  ≥$25, over category hard-cap, dated outside month) block attest; **Soft** (suspected dup, over
  soft-threshold, billable missing client link, uncategorized) nudge and may be attested with a note.
- **Procedure Steps:**
  1. `[automation]` Evaluate `expense_policy_violation` view (7 deterministic rules) over the report's
     items; suspected-duplicate = row-pair check. **L0/L1.**
  2. `[gui-step]` Employee sees flags on `/expenses`; attaches missing receipts (out-of-pocket ≥$25;
     mileage receipt-EXEMPT), clears Hard, notes Soft.
  3. `[hybrid]` Attest gate: every out-of-pocket item has a receipt AND all Hard cleared → submit
     (Open→Submitted, self-lock). Else blocked.
- **Driving policy:** **AUTHORED — `docs/policies/expense-policy.md`** (#493, IT Glue master): attest-by-5th,
  IRS mileage rate, receipt ≥$25, reimburse ~10 biz days post finance-approve via QBO bill-payment (not
  payroll), admin makes final billable call.
- **Realization:** `icm/domains/finance/expense-policy/`.
- **Autonomy ceiling:** L0–L1 (flags only). Hard-violation block = structural attest gate.
- **Human-in-loop:** Employee attests; admin makes final billable call (always human). Recedes to the Hard-block floor.
- **Substrate deps:** none hard (policy engine in-app/silver).
- **subject:** both. **Maps to:** expense epic #482; Audrey face **#1424** (deviation/flag playbook covers time+expense).

## 09-05 · Expense Report lifecycle → Reimbursed (reimbursement reconciliation assist)
- **Owner / Stream:** Audrey / 09 (recon assist) — admin/finance own the state transitions.
- **Trigger:** Employee submits monthly Expense Report (attest); then admin/finance progression; then monthly reimbursement-recon.
- **Terminal outcome:** Report walks Open→Submitted→Approved→Finance-Approved→**Reimbursed**; Reimbursed
  set when QBO bill-payment (Purchase) matches the approved reimbursable total (app verifies, **never
  reimburses**). Independent **billable** leg → Autotask `isBillableToCompany`+`companyID` for client pass-through.
- **Procedure Steps:**
  1. `[gui-step]` Admin Approves on `/expenses/admin` (corrects vs attested snapshot) → triggers idempotent
     Autotask ExpenseReport write; admin sets final billable/companyID.
  2. `[gui-step]` Finance (CFO, `canApprovePayroll`) Finance-Approves → authorizes manual reimbursement OUTSIDE the app. **always_gate.**
  3. `[automation]` Audrey reads approved reimbursable total + QBO Purchase (read-only) →
     **matched/outstanding/mismatch** flag; on match sets Reimbursed (verification stamp). Books as a
     SEPARATE AP bill, distinct from payroll wage. **L2.**
- **Driving policy:** Expense Policy (authored, `docs/policies/expense-policy.md`, #493).
- **Realization:** `icm/domains/finance/reimbursement-recon/` (recon assist); lifecycle FE/BE live (#546–553).
- **Autonomy ceiling:** **L2** for Audrey's recon-mismatch flag; Finance Approval + the reimbursement = human **always_gate**.
- **Human-in-loop:** Admin + finance approvals; recedes as recon auto-confirms; the reimbursement authorization is the permanent floor.
- **Substrate deps:** [DORM-CRED] QBO (live) + receipt storage (live #496); Autotask write [DORM-CRED]+[DORM-TRIG].
- **subject:** both. **Maps to:** **#1425** (recon assist).

## 09-06 · MileIQ mileage ingestion → Expense Item(mileage)
- **Owner / Stream:** Audrey / 09 (finance-domain procedure; ingestion executes in LP/Pipeline).
- **Trigger:** **v1:** employee enters manual mileage on `/expenses/mileage/new`. **v2:** MileIQ auto-capture
  (per-user OAuth `drives:read:all`, paywalled → deferred).
- **Terminal outcome:** A silver `expense_item(kind=mileage)` (miles authoritative; amount = miles ×
  effective Mileage Rate, derived BY BACKEND — the sole comp reader; miles-only shown to employee, $ comp-gated).
- **Procedure Steps:**
  1. `[gui-step]` Employee enters miles + origin/destination (+ ticket if billable) — miles only, no $
     (Mileage Rate is payroll-gated). v1.
  2. `[automation]` Lands in `website_mileage` bronze → Pipeline merges → silver `expense_item` (PL #124).
     v2: MileIQ drive pull (LP #167) → `mileiq_drive` bronze. **L0/L1.**
  3. `[automation]` BE derives $ = miles × effective Mileage Rate on approval (comp-confined). **L1.**
- **Driving policy:** Expense Policy — IRS standard business rate, business miles only, no receipt.
- **Realization:** ingestion in LP/Pipeline; finance procedure-only.
- **Autonomy ceiling:** L0–L1 (ingest + derive; the $ never surfaces to employee/agent un-gated).
- **Human-in-loop:** Employee enters (v1); recedes to auto-capture at v2.
- **Substrate deps:** [DORM-CRED] MileIQ creds = **v2** (#495/#811 moved to v2). v1 manual path LIVE.
- **subject:** both.

---

# C. MONTHLY CLOSE (both legs)

## 09-07 · Run the unified Monthly Close (per employee, time + expense)
- **Owner / Stream:** Audrey / 09 (close-readiness assist) — the **Close TASK** is owned by finance (CFO); Audrey assists read-only.
- **Trigger:** Month-end schedule (the single monthly finance task); validates both QBO payment legs per employee.
- **Terminal outcome:** Per-employee close packet — aggregated time total (weekly Timesheets rolled up) +
  reimbursable expense total + both QBO match statuses (Paid for time / Reimbursed for expense) + open
  obligations (approved-but-not-confirmed-paid) — and the manual payment steps validated complete for the month.
- **Procedure Steps:**
  1. `[automation]` Read across `time_record`/`timesheet`, `expense_item`/`expense_report`, both
     reconciliations (`monthly_close` view, FULL OUTER JOIN, comp-free) → **close-readiness checklist** +
     blocker flags (all timesheets attested? expenses approved? recons matched?). **L2** auto-raise.
  2. `[gui-step]` Finance reviews `/monthly-close`; chases blockers (un-attested sheets, un-matched payments).
  3. `[hybrid]` Finance confirms both payment legs done & matched for the month → manual payment steps validated; close advances.
- **Driving policy:** TBD (#1586) — close cadence/policy (attest-by-5th anchor exists for expense).
- **Realization:** `icm/domains/finance/close-readiness/`; `/monthly-close` GUI live (#491/PR#559).
- **Autonomy ceiling:** **L2** (Audrey's checklist + flags). Closing/confirming payment = human **always_gate**.
- **Human-in-loop:** CFO/finance owns the close; Audrey recedes as recons auto-confirm; the close confirmation is the floor.
- **Substrate deps:** [DORM-CRED] QBO; rolls up 09-02 + 09-05.
- **subject:** both. **Maps to:** **#1427**.

---

# D. AR / AP / BILLING

## 09-08 · Pre-check a generated recurring invoice before the Mark-gated QBO push
- **Owner / Stream:** Audrey / 09.
- **Trigger:** A `generated_invoice` draft is produced (recurring invoice generation, #1095/#1045) and queued for the QBO push.
- **Terminal outcome:** Per-draft anomaly verdict (missing lines, rate-vs-contract mismatch, hours ≠
  attested time) flagged **BEFORE** the push — preventing a money error reaching a client, purely by
  reading. (Highest-leverage Audrey playbook.)
- **Procedure Steps:**
  1. `[automation]` Read the `generated_invoice` draft + contract rate + attested `time_record` for the period. **L1.**
  2. `[automation]` Tie-out: expected vs actual lines/rates/hours; write the arithmetic (inputs, expected,
     actual, delta, as-of date). Flag anomalies → park for human. **L2.**
  3. `[gui-step]` Finance reviews the flag; corrects upstream; **Mark-gated** QBO invoice push
     (customer-facing + money → always_gate). **Hand-off IN/OUT:** the push is owned by the AR/AP billing path, not Audrey.
- **Driving policy:** TBD (#1586) — billing; QBO=SoR (read-only our side per ADR-0085).
- **Realization:** `icm/domains/finance/invoice-precheck/`.
- **Autonomy ceiling:** **L2** (flag only). The QBO push = customer-facing+money **always_gate**, Mark-gated — NOT Audrey's to execute.
- **Human-in-loop:** Finance + Mark gate the push; Audrey recedes to the always-on pre-check flag; push authorization is the permanent floor.
- **Substrate deps:** [DORM-AR] **#1580** AR/invoice silver — needs the `generated_invoice`/AR draft to exist
  (#1095 CLOSED but verify built; own-vs-mirror open); [DORM-CRED] QBO.
- **subject:** both. **Maps to:** **#1428**.

## 09-09 · AR aging + cash-flow visibility summary (read-only, NOT dunning)
- **Owner / Stream:** Audrey / 09 (summary) — Sterling rolls up into the financial-pulse (Stream 11; do NOT duplicate the synthesis brief here).
- **Trigger:** Scheduled (weekly/monthly) or on-demand for CFO/board.
- **Terminal outcome:** A read-only AR aging + cash-position summary for CFO/board. **Explicitly NOT
  dunning** — sending payment reminders is external and belongs to the Collections leg (09-10); Audrey only summarizes.
- **Procedure Steps:**
  1. `[automation]` Read AR aging (Autotask/QBO mirror or AR silver if owned) + cash position. **L0.**
  2. `[automation]` Produce aging buckets + cash-flow visibility summary (signal vs inference labeled, as-of dated). **L1.**
  3. `[automation]` **Hand-off OUT:** emit aging signals to Celeste (client-360 financial-health Handoff) +
     Sterling (financial-pulse). No external send. **L2** auto-raise at-risk-revenue flag.
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/domains/finance/ar-aging-summary/`; BI hub `/reporting#finance`.
- **Autonomy ceiling:** **L0–L2** (read + auto-raise at-risk-revenue flag). **HARD: no external send** —
  dunning is structurally out of Audrey's catalog (refusal-class boundary).
- **Human-in-loop:** CFO consumes; any reminder send routes to the Collections leg (09-10) + human. Floor = Audrey never sends.
- **Substrate deps:** [DORM-AR] **#1580** AR/invoice entity (own-vs-mirror Mark-gated, entity NOT built); [DORM-CRED] QBO.
- **subject:** both. **Maps to:** **#1429**.

## 09-10 · Collections / AR-dunning (overdue invoice → reminder)
- **Owner / Stream:** **Audrey OWNS the procedure** (D8), but she is read-only — so the dunning **SEND is a
  human `[gui-step]`/always_gate in v1** (Mark proxies). Audrey detects/drafts; the send is never hers to
  actuate. (orchestration-matrix names a "Collections / AR-dunning" agent; until a dedicated sender lands, the send stays the human gate.)
- **Trigger:** An invoice crosses overdue (aging threshold).
- **Terminal outcome:** A drafted, consent-clean payment reminder **sent** (gated) → payment chased → aging cleared.
- **Procedure Steps:**
  1. `[automation]` Detect overdue invoice — Audrey/AR-aging (09-09) surfaces it. **L0.**
  2. `[automation]` Draft the reminder. **L1.**
  3. `[gui-step]` **Send (🔒 customer-facing + money) — always_gate, human-approved (v1, Mark proxy).** The dunning SEND is the human gate.
- **Driving policy:** TBD (#1586) — collections policy.
- **Realization:** `icm/domains/finance/collections/` (Audrey-owned procedure; sender unbuilt).
- **Autonomy ceiling:** detect L0 → draft L1 → **send always_gate** (never auto — Audrey tops at L2 read-only and never sends).
- **Human-in-loop:** human approves every send (v1, Mark proxy); the send authorization is the permanent floor.
- **Substrate deps:** [DORM-AR] **#1580** AR/invoice silver + #1096; [DORM-CRED] QBO/send channel.
- **subject:** both. **Maps to:** **#1096** (AR aging/collections), #668.

## 09-11 · AP intake (vendor bill capture for visibility)
- **Owner / Stream:** Audrey / 09 (read/observe) — **⚠ possible OWNERSHIP overlap with Vance
  (procurement/vendor spend): Audrey = books visibility, Vance = vendor lifecycle.** D8 assigns AP intake to **Audrey**; flag to Mark.
- **Trigger:** A vendor bill arrives / a QBO AP entry appears.
- **Terminal outcome:** AP obligations visible in the cash-flow view (read-only); Audrey never pays.
- **Procedure Steps:**
  1. `[automation]` Read AP/vendor bills (QBO read-only / Autotask). **L0.**
  2. `[automation]` Surface upcoming AP obligations into cash-flow visibility + Sterling pulse. **L2.**
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/domains/finance/ap-intake/` (unbuilt).
- **Autonomy ceiling:** L0–L2 (read + flag). No payment (always out of catalog).
- **Human-in-loop:** finance pays outside the app (always).
- **Substrate deps:** [DORM-AR] **#1580** / [DORM-CRED].
- **subject:** both. **Maps to:** **#1097** (AP intake), **#1098** (cash-flow view).

---

# E. PROFITABILITY / MARGIN + hand-off STEPS

## 09-12 · Renewal margin grounding (Audrey → Chase hand-off step)
- **Owner / Stream:** Audrey / 09 (advise-only; the renewal itself is Chase/Stream 02).
- **Trigger:** Chase drafts a renewal reprice/proposal and requests margin grounding (renewal repricing playbook #1415).
- **Terminal outcome:** Proposed-vs-historical margin intel lit up on Chase's proposed renewal — flag if
  proposed margin below floor or well below historical. **Audrey informs; she does not gate.**
- **Procedure Steps:**
  1. `[automation]` Read proposed renewal pricing + historical margin (`invoice` + cost-allocation). **L1.**
  2. `[automation]` Compute proposed-vs-historical margin + floor check; write the tie-out (as-of dated). **L2.**
  3. `[automation]` **Hand-off OUT to Chase (#1415):** supply margin intel onto Chase's proposed action. The
     renewal send-for-signature is already **always_gate** (Chase's ceiling); Audrey's number does not block it.
- **Driving policy:** TBD (#1586) — margin-floor policy.
- **Realization:** `icm/domains/finance/renewal-margin-grounding/`.
- **Autonomy ceiling:** **L1–L2** (flag onto another agent's action). **advise-never-block** is structural —
  Audrey lights the number, the block/approve is human (Chase's always_gate send).
- **Human-in-loop:** human decides the renewal (Chase's gate). Audrey recedes to the always-on margin flag.
- **Substrate deps:** [DORM-ALLOC] cost/revenue-allocation for true margin (#1044); [DORM-AR] **#1580** invoice.
- **subject:** both. **Maps to:** **#1426**.

## 09-13 · Project cost validation (Audrey → Pierce hand-off step)
- **Owner / Stream:** Audrey / 09 (advise-only; project delivery = Pierce/Stream 03).
- **Trigger:** Pierce watches project margin/burn (RAID / project P&L #1308) and needs the cost truth validated.
- **Terminal outcome:** Validated cost-to-deliver (attested labor cost + expense + license/tool allocation)
  supplied onto Pierce's project P&L — over/under-run grounded in real cost. Read-only money; Pierce acts on delivery.
- **Procedure Steps:**
  1. `[automation]` Read attested `time_record` → labor cost (comp-confined), expense allocation, tool/license cost. **L1.**
  2. `[automation]` Validate budget/SOW vs actual; write the tie-out. **L2.**
  3. `[automation]` **Hand-off OUT to Pierce (#1308):** supply the cost truth; Pierce decides the delivery/scope/change action.
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/domains/finance/project-cost-validation/`; ties project-accounting epic #1308.
- **Autonomy ceiling:** **L1–L2** (validate + flag; never gates delivery).
- **Human-in-loop:** Pierce/PM acts; Audrey recedes to the always-on cost flag.
- **Substrate deps:** [DORM-ALLOC] #1308/#1044 cost-allocation views UNBUILT (main blocker — v1/v2 boundary).
- **subject:** both. **Maps to:** **#1426**-adjacent / #1308.

## 09-14 · Per-client / per-project profitability margin-watch 💤 DEFERRED v2
- **Owner / Stream:** Audrey / 09.
- **Trigger:** Scheduled margin sweep per client/project.
- **Terminal outcome:** Margin-watch flags (declining margin, unprofitable client/project) → CFO/board.
- **Procedure Steps:**
  1. `[automation]` Read cost/revenue-allocation → margin trend → flag. **L2.**
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/domains/finance/margin-watch/`.
- **Autonomy ceiling:** L2 (flag).
- **Human-in-loop:** CFO/board consume; Audrey never gates.
- **Substrate deps:** **DEFERRED to v2** — #1044 cost/revenue-allocation views unbuilt (audrey.md explicitly defers).
- **subject:** both.

---

# F. BI HUB REPORTING / DASHBOARDS

## 09-15 · Maintain the BI hub finance / cross-domain reporting surface
- **Owner / Stream:** Audrey (finance sections) + Sterling (cross-division synthesis = Stream 11, not here) / 09.
- **Trigger:** New BI read needed, or dashboard refresh; on-demand for CFO/board.
- **Terminal outcome:** `/reporting` BI hub (anchored finance + cross-domain sections) + dashboard intel
  strip render current aggregates; honest-data constraints respected (never fake zeros — "No coverage" where data absent).
- **Procedure Steps:**
  1. `[automation]` Read silver aggregates via `ReportsRepository`/`DashboardRepository` (one typed method
     per section, guarded mock fallback). **L0.**
  2. `[automation]` Render finance/time-efficiency/expense aggregates (metric-generic for unstable metric
     names #135; no completion-flow analytics until ticket completed-dates land #300). **L0.**
  3. `[gui-step]` CFO/board consume `/reporting#finance`; deep-link from the dashboard intel strip.
- **Driving policy:** TBD (#1586).
- **Realization:** BI hub live (epic #288, ADR-0062); finance/time-efficiency analytics #467/#492.
- **Autonomy ceiling:** L0 (read/render). No actuation.
- **Human-in-loop:** consumers only; no send.
- **Substrate deps:** fleet/security tables empty until collectors hydrate (#102); some sections render "no coverage".
- **subject:** both. **Maps to:** **#467/#492** (analytics), #288 (hub).

---

# G. STERLING (Deputy CFO) — GOVERNANCE procedures

> Sterling's scheduled `financial-pulse` cross-division synthesis brief is **Stream 11** — NOT enumerated
> here. These are the finance/revenue **governance** procedures he owns within Stream 09.

## 09-16 · Finance Defined-Way governance (close cadence, recon discipline, dial posture)
- **Owner / Stream:** Sterling / 09 (exec governance).
- **Trigger:** Standing finance-domain governance review; a divergence Vera surfaces; a new finance policy/cadence.
- **Terminal outcome:** The Finance Defined Way (close cadence, attestation discipline, recon-completeness,
  read-only-money invariant) encoded/maintained; finance workflows' autonomy-dial posture set conservatively; divergences routed.
- **Procedure Steps:**
  1. `[automation]` Read finance run ledger + recon-assurance + Vera conformance findings (delegate-only,
     pg.read + recall — NO direct actuation; L2 ceiling structural). **L2.**
  2. `[hybrid]` Recommend close-cadence / recon-policy / dial-posture changes → **route to Nick/Mark**
     (always_gate; exec tier never actuates).
  3. `[automation]` **Delegate** corrective work to the owning sub-agent (Audrey) via `delegate`/`handoff` cap — the sub-agent's gauntlet applies.
- **Driving policy:** TBD (#1586) — finance governance policy.
- **Realization:** `icm/executive/deputy-cfo/finance-governance/` (exec tier ADR #1535; scaffold #1536).
- **Autonomy ceiling:** **L2 delegate-only** (synthesize/advise/orchestrate; NEVER bypass a sub-agent
  gauntlet; all world-changing acts inherit the executing sub-agent's ceiling). always_gate: every
  governance-config/policy change → Nick/Mark.
- **Human-in-loop:** Nick (Deputy CFO's human) + Mark ratify; recedes as routine pulses auto-run, but every binding finance-governance change is human floor.
- **Substrate deps:** [DORM-EVENT] delegate/handoff cap on relationship bus (BE-W7 #437/#991); exec-tier scaffold #1536; [DORM-EMBED] recall #389.
- **subject:** both. **Maps to:** **#1549**.

## 09-17 · Revenue-governance: recurring-revenue + retention oversight
- **Owner / Stream:** Sterling / 09 (oversees the Chase/Celeste/Vance revenue division).
- **Trigger:** Standing revenue review; renewal pipeline shift; at-risk-revenue flag from Audrey AR-aging (09-09) or Celeste.
- **Terminal outcome:** Recurring-revenue health + retention exposure synthesized for Nick;
  unprofitable-work + at-risk-revenue flags raised; corrective motions delegated to the division agents
  (Chase renewals, Celeste retention, Vance shelfware).
- **Procedure Steps:**
  1. `[automation]` Roll up renewal pipeline + AR-aging + margin flags (read + recall, delegate-only). **L2.**
  2. `[automation]` Flag unprofitable work / at-risk revenue → Nick's brief. **L2.**
  3. `[automation]` **Delegate** to Chase (#1304 renewals) / Celeste (retention) / Vance (shelfware) — their gauntlets apply.
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/deputy-cfo/revenue-governance/`.
- **Autonomy ceiling:** **L2 delegate-only.** No direct actuation; no money.
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
harvested-additional / adjacent-epic. All within the D3 step ceiling (3–8 steps each).

**Count: 17 Operating Procedures** (09-01 … 09-17): Time 3 · Expense 3 · Monthly Close 1 · AR/AP/billing 4 ·
margin hand-offs 3 · BI 1 · Sterling governance 2.
