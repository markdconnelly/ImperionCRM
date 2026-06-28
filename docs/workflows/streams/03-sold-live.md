# Stream 03 — Sold → Live

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-0133](../../decision-records/ADR-0133-operating-procedure-catalog.md). Terms in
> [`CONTEXT.md`](../../../CONTEXT.md).
>
> **D9 global principles apply to every procedure** (in Human-in-loop, not restated): **P1**
> Nova-native co-working · **P2** reasoning ascribed to the paired human, up-chain · **P3**
> easy-button at every gate · **P4** urgent → dedicated chat / else → Teams tag. Driving policy =
> `TBD (mark-blocker: company-policy-collection)` (D4, #1586).

**Owner:** **Pierce** (Projects / Delivery / PMO). Epic #1395 (leaves #1431–1440).
**Scope:** opportunity `won` (Chase→Pierce seam, ADR-0096) → auto-provision (catalog-anchored
delivery template #1306, gated `contract_state='signed'`) → Onboarding (seeded protected project
type) → full PM lifecycle (initiate→plan→execute→monitor/control→close) on unified `task` → RAID
register → change-request routing → delivery-complete Handoff to Celeste (Stream 08).
**subject:** both (Imperion onboards itself — dogfood is a parameter, D7).

**Seam rule:** trigger-owner owns the procedure end-to-end; hand-offs (Felix/technicians for
technical fulfilment in Stream 04, Audrey for cost validation, Celeste at delivery-complete) are
*steps*. Felix/technicians work the TECHNICAL layer (most-restrictive PM∪technical combine on shared
`task` rows); those technical procedures live in **Stream 04** — referenced, not duplicated.

**Ladder:** Pierce tops at **L4** (reversible-auto + undo). Dial-proof `always_gate`: client-facing
delivery commitments + ANY scope/timeline/provisioning CHANGE. Refuse-preconditions (structural):
complete-without-verification; provision-before-`contract_state='signed'`.

**Realization flag:** only `icm/domains/projects/pierce.md` is on main; `room.md`/`room.yaml` + all
per-workflow workspaces are the #1431 build leaf, NOT yet landed → the stream is procedure-only in
fact. **Dormancy:** #389 recall · #991 handoff bus · #119 trigger-sync · DocuSign contract gate
(#318) · Autotask-write (first live creates Mark-gated) · #1306 catalog binding (partly placeholder).

---

## OP-03-00 — Triage a won opportunity into a provisioning candidate  *(the Chase→Pierce seam step)*
- **Trigger:** opportunity reaches `sales_stage='won'` — the Chase→Pierce seam (the state crossing IS the seam).
- **Terminal outcome:** a provisioning candidate on the board as **"ready to provision"** (or
  **deferred/blocked** with reason — contract unsigned, no catalog template, account unlinked).
- **Steps:** 1. `[automation]` ground (won `opportunity`, sold line-items, seam keys, contract_state).
  2. `[automation]` resolve catalog-anchored template (#1306). 3. `[automation]` check preconditions
  (contract gate, account linkage, template resolvable). 4. `[hybrid]` surface candidate / mark
  deferred + reason. [← Chase, Stream 02 at `won`].
- **Autonomy ceiling:** L2 (surface = internal); the provision act + gate land on OP-03-01.
- **Realization:** `icm/domains/projects/provisioning-intake/` *(planned)*. **subject:** both.
  *(Reviewer veto candidate: fold into OP-03-01 steps 1–2.)*

## OP-03-01 — Kick off and provision a delivery project from won  *(leaf #1432)*
- **Trigger:** a "ready-to-provision" candidate is actioned (human-trigger low dial; auto at raised
  dial once `contract_state='signed'`).
- **Terminal outcome:** a live delivery **project** (Autotask project + phases/tasks spine +
  `project_provisioning`), charter + resource plan, kickoff coordinated — `execute`-ready.
- **Steps:** 1. `[automation]` select catalog-anchored template (#1306). 2. `[automation]` draft
  charter + resource plan. 3. `[hybrid]` **REFUSE-gate:** verify `contract_state='signed'` (ADR-0096).
  4. `[automation]` instantiate (project + `project_milestone` per phase + `task` per template task +
  `project_provisioning` + `task_ticket_fire` rows). 5. `[hybrid]` **always_gate:** kickoff commitment
  + client-facing go-live date. [→ Felix/technicians, Stream 04 for technical execution].
- **Autonomy ceiling:** L1 human-trigger → **L4 auto-provision-with-undo**. `always_gate`: kickoff
  commitment, client go-live date. Refuse: provision before signed.
- **Substrate deps:** DocuSign (hard gate), Autotask-write, #119, #1306. **subject:** both.

## OP-03-02 — Onboard a new managed client through the Onboarding project type (Easy Mode)
- **Trigger:** a won opportunity whose template resolves to the **Onboarding** project type (the
  seeded, protected type with its own page), OR a new managed-client agreement signed.
- **Terminal outcome:** customer environment configured + verified: each **Easy-Mode Deploy** step's
  config function executed against the authorized API, each linked task **closed-on-verification**.
- **Steps:** 1. `[automation]` instantiate the Onboarding project from the seeded template. 2.
  `[hybrid]` per Easy-Mode step: fire the config function performing the REAL configuration
  ("clicking is deploying"). 3. `[automation]` **Easy-Mode Deploy** (idempotent; no-op + audit note
  when no linked task). 4. `[automation]` verification job confirms config → **closes the linked task
  on verification**. 5. `[hybrid]` always_gate: client-facing onboarding commitment / go-live. [→
  Felix/technicians, Stream 04].
- **Autonomy ceiling:** L2 instantiate → **L4** config deploys behind the contract-gate + undo.
  **OPEN (Mark):** do Easy-Mode customer-env config writes (live client tenant) get their own
  `always_gate` class? **Realization:** `icm/domains/projects/onboarding/` *(planned)*. **subject:** both.
  *(Reviewer veto candidate: keep distinct OR fold into #1432 + Stream-04 technical procs.)*

## OP-03-03 — Define & maintain the project-type ↔ product-catalog binding  *(leaf #1433)*
- **Trigger:** a new/changed catalog product (#1306) lacking a delivery-template binding; periodic
  template review; a template-improvement proposal from closeout (OP-03-10).
- **Terminal outcome:** every sellable product that requires delivery has a bound template, so `won`
  line-items deterministically **select** one (catalog-driven, not hand-picked).
- **Steps:** 1. `[automation]` read catalog + existing `delivery_template` bindings. 2. `[automation]`
  detect unbound/drifted products. 3. `[hybrid]` propose the binding + template shape → park. 4.
  `[automation]` maintain the binding (L2).
- **Autonomy ceiling:** L1 propose → L2 maintain. No always_gate (internal config). **subject:** both.

## OP-03-04 — Track milestones/tasks to verified completion  *(leaf #1434)*
- **Trigger:** an active project; continuous during `execute`/`monitor-control`; or a status change.
- **Terminal outcome:** each deliverable to **complete only on a verification signal**; status kept current.
- **Steps:** 1. `[automation]` L0 read across milestones + tasks. 2. `[automation]` L2 maintain/roll-up.
  3. `[hybrid]` **REFUSE-gate:** no completion without a verification signal. 4. `[automation]`
  most-restrictive autonomy on shared `task` rows (PM∪technical). [→ Felix/technicians, Stream 04].
- **Autonomy ceiling:** L0 read / L2 status. Refuse: complete-without-verification. **subject:** both.

## OP-03-05 — Maintain the RAID Register  *(leaf #1435)*
- **Trigger:** an active project; or a new R/A/I/D signal.
- **Terminal outcome:** an up-to-date RAID Register with dependency/critical-path conflicts flagged +
  escalated; nothing silently re-scoped.
- **Steps:** 1. `[automation]` read plan + task graph + dependencies. 2. `[automation]` L2 maintain
  R/A/I/D. 3. `[automation]` flag dependency/critical-path conflicts. 4. `[hybrid]` escalations
  surface. 5. `[automation]` a scope/timeline change → change request (OP-03-08), never silent.
- **Autonomy ceiling:** L2; the *change* a RAID item triggers is gated (OP-03-08). **subject:** both.

## OP-03-06 — Monitor burn, schedule slippage, and budget overrun  *(leaf #1436)*
- **Trigger:** active project / scheduled cadence; or a threshold crossed.
- **Terminal outcome:** burn/slippage/overrun flagged early; cost validated via the Audrey seam.
- **Steps:** 1. `[automation]` read `time_record` + `project_baseline` + plan. 2. `[automation]` L2
  compute + flag. 3. `[hybrid]` **Pierce↔Audrey seam:** Audrey validates cost (read-only, advise-only)
  [→ Stream 09]. 4. `[hybrid]` surface; a timeline/scope change → OP-03-08.
- **Autonomy ceiling:** L2; no money action (Audrey read-only). **subject:** both.

## OP-03-07 — Schedule and fire JIT delivery-queue tickets  *(leaf #1437)*
- **Trigger:** a provisioned project with `task_ticket_fire` rows due (rolling window per task, ADR-0096 §7).
- **Terminal outcome:** each due delivery task has its Autotask dispatch ticket **fired** (created +
  linked), fire-state `fired`; the technical layer can pick it up.
- **Steps:** 1. `[automation]` L2 schedule the fire. 2. `[automation]` on window: resolve parent
  `autotask_project_id`; **DEFER if not yet provisioned**. 3. `[automation]` **L3 auto-fire**
  (`createProjectTicket`, idempotency-key guarded). [→ Felix/technicians, Stream 04].
- **Autonomy ceiling:** L2 schedule → L3 auto-fire (internal/reversible). **subject:** both.

## OP-03-08 — Route scope/timeline/provisioning drift as a governed change request  *(leaf #1438)*
- **Trigger:** detected scope / timeline / provisioning **drift** (from OP-03-05/06/04).
- **Terminal outcome:** the change is **approved + applied** OR rejected — but NEVER silently.
- **Steps:** 1. `[automation]` L2 auto-flag the drift. 2. `[automation]` draft the change request
  (impact). 3. `[hybrid]` **always_gate:** the change routes for human approval (ADR-0118/0121). 4.
  `[automation]` on approval, apply (re-plan / re-date / re-provision with undo).
- **Autonomy ceiling:** L2 auto-flag; the change is **always_gate**. **Overlap with Marshall
  (Stream 06)** — different change objects (project-scope CR vs infra change_request); seam to pin. **subject:** both.

## OP-03-09 — Run the internal status cadence & stakeholder comms plan  *(leaf #1439)*
- **Trigger:** a scheduled cadence tick; or a status-worthy event.
- **Terminal outcome:** internal cadence maintained; action-items/decisions logged; client-facing
  status drafted (human-sent).
- **Steps:** 1. `[automation]` L2 schedule + assemble internal status. 2. `[automation]` log
  action-items/decisions. 3. `[automation]` maintain the comms plan. 4. `[hybrid]` **always_gate:** any
  client-facing status/commitment — Pierce drafts, a human sends.
- **Autonomy ceiling:** L2 auto-internal; client-facing always_gate. **subject:** both.

## OP-03-10 — Close out a delivery project and hand off to Celeste  *(leaf #1440)*
- **Trigger:** all milestones verified-complete; project ready to close.
- **Terminal outcome:** project `status=complete` + final `project_baseline`; client sign-off
  captured; retro produced; **delivery-complete → Celeste Handoff** (Stream 08). Terminal for Stream 03.
- **Steps:** 1. `[hybrid]` **always_gate:** deliverable acceptance / **client sign-off**. 2.
  `[automation]` capture final `project_baseline`. 3. `[automation]` produce retrospective. 4.
  `[automation]` L1 propose template improvement (→ OP-03-03). 5. `[automation]` emit
  delivery-complete → **Celeste Handoff** (she reads the retro read-only; Pierce does not run the QBR). [→ Stream 08].
- **Autonomy ceiling:** L1/L2; client sign-off always_gate. **Substrate deps:** #991, Celeste #1396. **subject:** both.

## OP-03-11 — Stand up the Projects domain + wire the Pierce persona  *(leaf #1431 — OS-self, D7.1)*
- **Trigger:** activation of the Pierce agent (#1431); or a persona/room change.
- **Terminal outcome:** the projects domain room stands up and `pierce.md` composes into every
  Projects worker's system, so the above procedures' workspaces resolve.
- **Steps:** 1. `[gui-step]` author `room.md`/`room.yaml` (budget ⊆ Constitution). 2. `[gui-step]`
  compose `pierce.md`. 3. `[automation]` icm-conformance gate. 4. `[gui-step]` verify L0–L4 capability-complete.
- **Autonomy ceiling:** N/A (a build/config procedure). always_gate floor: ADR + migration numbers
  claimed at merge; codex + human review. **subject:** imperion (pure OS-self-operation).

---

## Summary

**Count: 12 Operating Procedures** (10 filed leaves #1431–1440 + 2 harvested: OP-03-00 seam, OP-03-02
Onboarding/Easy-Mode). Workspaces unbuilt until #1431; procedure-only in fact.

**Flagged for Mark:** (1) Onboarding (OP-03-02) as its own filed leaf vs "OP-03-01 with the
Onboarding template". (2) Pierce↔Marshall change ownership seam (OP-03-08 vs Stream 06). (3)
Easy-Mode customer-env config autonomy class. (4) OP-03-00 keep-or-fold. (5) when the
most-restrictive PM∪technical combine (FE #1412) binds.
