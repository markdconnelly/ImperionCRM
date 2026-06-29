# Stream 03 — Sold → Live

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

**Owner:** **Pierce** (Projects / Delivery / PMO). Epic #1395 (leaves #1431–1440).
**Scope:** opportunity `won` (Chase→Pierce seam, ADR-0096) → auto-provision (catalog-anchored
delivery template #1306, gated `contract_state='signed'`) → Onboarding (seeded protected project
type) → full PM lifecycle (initiate→plan→execute→monitor/control→close) on unified `task` → RAID
register → change-request routing → delivery-complete Handoff to Celeste (Stream 08).
**subject:** both (Imperion onboards itself — dogfood is a parameter, D7).

**Core design rule (Pierce is an L4 PROVISION-WITH-UNDO owner — B8 is the showcase).** This stream
*is* the clean showcase of doctrine **B8 (provision-with-undo)**: kickoff & provision-from-won are
**L4 reversible-auto behind an undo window** (A10 row 2 — the scaffold tears down cleanly during the
window, hardens at expiry), but only past a **`contract_state='signed'` REFUSE-precondition** (a
structural gate, NOT a waivable autonomy gate — ADR-0096). Irreversible or client-visible sub-steps
**peel off to their own gates** (welcome-email → B7 client-send, setup-fee → B6 money,
client-facing go-live date → A2 class-2) — they do not ride the L4 scaffold. Provisioning closes
**on verification** (Easy Mode verify job, A9c), never on fire.

**Seam rule (A11 — every cross-agent hand-off is an explicit Procedure Step).** Trigger-owner owns
the procedure end-to-end; hand-offs (Felix/technicians for technical fulfilment in Stream 04, Audrey
for cost validation, Celeste at delivery-complete) are *steps*, never co-ownership. Felix/technicians
work the TECHNICAL layer (most-restrictive PM∪technical combine on shared `task` rows); those
technical procedures live in **Stream 04** — referenced, not duplicated. **Seams:** won-in from Chase
(Stream 02, OP-03-00); provisioning-intake (OP-03-00→OP-03-01); cost-grounding-in → Audrey (Stream
09, advise-only, no gate); change-overlap seam ↔ Marshall (Stream 06, OP-03-08); closeout-out →
Celeste (Stream 08, OP-03-10).

**Ladder:** Pierce tops at **L4** (reversible-auto + undo, A10). Dial-proof `always_gate` (inherited
A2 + delta): client-facing delivery commitments (class-2) + ANY scope/timeline/provisioning CHANGE
(class-4/6). Refuse-preconditions (structural, NOT waivable gates): complete-without-verification;
provision-before-`contract_state='signed'`.

**Archetype map (B-templates this stream instantiates).**

| Procedure | Archetype |
|---|---|
| OP-03-00 triage won → candidate | **B1 triage/route** (the Chase→Pierce seam) |
| OP-03-01 kickoff & provision-from-won ⛔ | **B8 provision-with-undo** (the showcase) |
| OP-03-02 Onboarding / Easy Mode | **B8 provision-with-undo** (config-deploy variant) |
| OP-03-03 project-type ↔ catalog binding | **B4 audit-attest** (detect/maintain config) |
| OP-03-04 track milestones/tasks | **B4 audit-attest** (verify-to-complete) |
| OP-03-05 RAID register | **B4 audit-attest** + change-spawn (→ OP-03-08) |
| OP-03-06 burn / slippage / budget monitor | **B3 synthesis-brief** / **B9 deadline-sentinel** |
| OP-03-07 fire JIT delivery tickets | **B2 gated-actuation** (idempotent auto-fire, A9) |
| OP-03-08 route scope/timeline drift ⛔ | **B2 gated-actuation** (the change gate) |
| OP-03-09 status cadence & comms | **B3 synthesis-brief** + **B7 client-facing-send** |
| OP-03-10 closeout → Celeste | **B4 audit-attest** + **A11 seam** (sign-off gate → Handoff) |
| OP-03-11 stand up domain + persona | OS-self build/config (D7.1) |

**Driving policy (every procedure):** inherits the doctrine universal baseline (ADR-0136 A2/A4/A5)
+ `TBD (mark-blocker: company-policy-collection)` for the 1–3 specific drivers (D4, #1586). Owed as
separate IT-Glue business docs: Project-Delivery / PMO · Onboarding / Easy-Mode · Provisioning-Undo-Window ·
RAID-Escalation · Project-Change-Control · Delivery-Closeout. Mapped in the #1586 pass.

**Realization flag:** only `icm/domains/projects/pierce.md` is on main; `room.md`/`room.yaml` + all
per-workflow workspaces are the #1431 build leaf, NOT yet landed → **workspaces unbuilt until #1431;
procedure-only in fact.** **Dormancy:** 🔌#389 recall · 🔌#991 handoff bus · 🔌#119 trigger-sync ·
🔌DocuSign contract gate (#318) · 🔌Autotask-write (first live creates Mark-gated) · 🔌#1306 catalog
binding (partly placeholder). Per A5c, deepened steps that depend on these ship **propose-only** until built.

---

## OP-03-00 — Triage a won opportunity into a provisioning candidate  *(the Chase→Pierce seam step)*
- **Owner / Stream:** Pierce / 03. **Archetype:** B1 triage/route.
- **Trigger:** opportunity reaches `sales_stage='won'` — the Chase→Pierce seam (the state crossing IS the seam).
- **Terminal outcome:** a provisioning candidate on the board as **"ready to provision"** (or
  **deferred/blocked** with reason — contract unsigned, no catalog template, account unlinked).
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition → log):
  1. `[automation]` **Ground** — ingest the won `opportunity`, sold line-items, seam keys, contract_state,
     **citing the source `opportunity` row + as-of** (A5); empty/unparseable → park. **SEAM: accepts the
     won hand-off from Chase** (Stream 02 at `won`; rationale attributed up-chain). **L2.**
  2. `[automation]` **Resolve owner** — resolve the catalog-anchored template (#1306) and owning
     `` `okf:account` `` via Client Mapping.
  3. `[automation]` **Classify / check preconditions** — contract gate (`contract_state`), account linkage,
     template resolvable — routing auto-executes at L2 (B1 — candidate placement is internally reversible).
  4. `[hybrid]` **Disposition + log** — surface candidate as "ready to provision" / mark deferred + reason.
     **SEAM → OP-03-01 (provision)** when ready.
- **Autonomy ceiling:** **L2** (surface = internal/reversible, A10 row 1); the provision act + gate land on
  OP-03-01. No `always_gate` (advisory placement; INPUT to the OP-03-01 refuse-precondition).
- **Human-in-loop:** Dexter pairing; v1 routes to Mark (proxy). Recede L0→L2 per A3 (ships observe-only).
- **Realization:** `icm/domains/projects/provisioning-intake/` *(planned)*. **subject:** both.
  *(Reviewer veto candidate: fold into OP-03-01 steps 1–2.)*

## OP-03-01 — Kick off and provision a delivery project from won  *(leaf #1432)* ⛔
- **Owner / Stream:** Pierce / 03 — **THE B8 showcase; reversible-auto provisioning behind an undo window.**
  **Archetype:** B8 provision-with-undo.
- **Trigger:** a "ready-to-provision" candidate is actioned (human-trigger low dial; auto at raised
  dial once `contract_state='signed'`).
- **Terminal outcome:** a live delivery **project** (Autotask project + phases/tasks spine +
  `project_provisioning`), charter + resource plan, kickoff coordinated — `execute`-ready.
- **Procedure Steps** (B8: ground[refuse-precondition] → scaffold-select → plan → provision[L4,undo,verify] → emit+log):
  1. `[automation]` **Ground — REFUSE-precondition:** verify `contract_state='signed'` (ADR-0096). This is a
     **structural refuse, NOT a waivable gate** (B8): unsigned ⇒ the procedure cannot proceed at any dial.
     **Cite the contract record + as-of** (A5); on empty/unsigned, park back to OP-03-00 with reason.
  2. `[automation]` **Scaffold-select** the catalog-anchored delivery template (#1306, catalog-anchored, not hand-picked).
  3. `[automation]` **Plan** — draft charter + resource plan from the template.
  4. `[automation]` **Provision (L4, behind the undo window)** — instantiate (project + `project_milestone`
     per phase + `task` per template task + `project_provisioning` + `task_ticket_fire` rows),
     **idempotency-keyed** so a retry is a no-op + audit note (A9b); **close-on-verification** — confirm the
     scaffold landed by read-back before declaring done (A9c). The reversible scaffold tears down cleanly
     during the **undo window** (per-procedure policy duration) and **hardens at expiry** (later teardown is
     a new gated change). [→ Felix/technicians, Stream 04 for technical execution].
  5. `[hybrid]` **Peel-off gates (B8 — irreversible/client-visible sub-steps do NOT ride the L4 scaffold):**
     kickoff commitment + **client-facing go-live date** = **`always_gate`** (A2 class-2) presented as the
     4-part easy-button (A4: drafted kickoff/date · grounded why with cited contract + plan + as-of ·
     one-click confirm + one-click revise · consequence preview). Welcome-email peels to B7 (client-send);
     setup-fee peels to B6 (money).
- **Autonomy ceiling:** **L1 human-trigger → L4 auto-provision-with-undo** (A10 row 2 — externally reversible,
  clean undo within the window). **`always_gate`:** kickoff commitment, client go-live date (class-2).
  **Refuse-precondition:** provision before `contract_state='signed'`. **WHY L4 (not higher):** the scaffold
  is externally reversible only *within* the undo window — past expiry it hardens, so the auto-ceiling derives
  from the most-irreversible step inside the window (A10), and every client-visible/irreversible sub-step is
  peeled to its own gate.
- **Substrate deps:** 🔌DocuSign (hard gate, #318), 🔌Autotask-write, 🔌#119, 🔌#1306. **subject:** both.

## OP-03-02 — Onboard a new managed client through the Onboarding project type (Easy Mode)
- **Owner / Stream:** Pierce / 03. **Archetype:** B8 provision-with-undo (config-deploy variant — "clicking is deploying").
- **Trigger:** a won opportunity whose template resolves to the **Onboarding** project type (the
  seeded, protected type with its own page), OR a new managed-client agreement signed.
- **Terminal outcome:** customer environment configured + verified: each **Easy-Mode Deploy** step's
  config function executed against the authorized API, each linked task **closed-on-verification**.
- **Procedure Steps** (B8: ground[signed] → scaffold-select → provision[L4 config-deploy, verify] → emit+log):
  1. `[automation]` **Ground — REFUSE-precondition:** `contract_state='signed'` / managed-client agreement
     signed, cited + as-of (A5). Instantiate the Onboarding project from the seeded protected template.
  2. `[hybrid]` **Provision (per Easy-Mode step):** fire the config function performing the REAL configuration
     against the authorized API ("clicking is deploying"). **A9a — the external SoR is authoritative; the agent
     mirrors, never owns** (M365 identity / Pax8 licensing per step). **L4 behind the undo window.**
  3. `[automation]` **Easy-Mode Deploy** — **idempotent** (no-op + audit note when no linked task; A9b).
  4. `[automation]` **Verify (read-back, A9c):** verification job confirms the config landed → **closes the
     linked task on verification** (close-on-verification, never close-on-fire).
  5. `[hybrid]` **Peel-off gate:** any client-facing onboarding commitment / go-live = **`always_gate`** (A2
     class-2), 4-part easy-button (A4). [→ Felix/technicians, Stream 04].
- **Autonomy ceiling:** **L2 instantiate → L4** config deploys behind the contract-gate + undo (A10 row 2).
  **WHY L4:** customer-env writes are externally reversible within the undo window via the inverse config
  function; past it they harden. **OPEN (Mark):** do Easy-Mode customer-env config writes (live client tenant)
  get their own `always_gate` class (irreversible/client-visible peel, B8)? **Realization:**
  `icm/domains/projects/onboarding/` *(planned)*. **subject:** both.
  *(Reviewer veto candidate: keep distinct OR fold into #1432 + Stream-04 technical procs.)*

## OP-03-03 — Define & maintain the project-type ↔ product-catalog binding  *(leaf #1433)*
- **Owner / Stream:** Pierce / 03. **Archetype:** B4 audit-attest (internal — detect drift + maintain config, no external attestation).
- **Trigger:** a new/changed catalog product (#1306) lacking a delivery-template binding; periodic
  template review; a template-improvement proposal from closeout (OP-03-10).
- **Terminal outcome:** every sellable product that requires delivery has a bound template, so `won`
  line-items deterministically **select** one (catalog-driven, not hand-picked).
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → maintain):
  1. `[automation]` **Scope + collect evidence** — read the catalog + existing `delivery_template` bindings,
     **citing each catalog product + binding + as-of** (A5). **L2.**
  2. `[automation]` **Evaluate** — detect unbound/drifted products.
  3. `[hybrid]` **Compose** — propose the binding + template shape → park for human ratification.
  4. `[automation]` **Maintain** the binding (L2, internally reversible config).
- **Autonomy ceiling:** **L1 propose → L2 maintain** (config = reversible internal, A10 row 1). No
  `always_gate` (internal config; binding selection is not a money/client/identity act). **subject:** both.

## OP-03-04 — Track milestones/tasks to verified completion  *(leaf #1434)*
- **Owner / Stream:** Pierce / 03. **Archetype:** B4 audit-attest (verify-to-complete — measurement gates the completion assertion).
- **Trigger:** an active project; continuous during `execute`/`monitor-control`; or a status change.
- **Terminal outcome:** each deliverable to **complete only on a verification signal**; status kept current.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → assert[verify-gated]):
  1. `[automation]` **Scope** — L0 read across milestones + tasks, **citing each row + as-of** (A5).
  2. `[automation]` **Evaluate + maintain** — L2 maintain / roll-up status.
  3. `[hybrid]` **Assert — REFUSE-precondition:** no completion without a verification signal
     (close-on-verification, A9c — a deliverable is never marked done on signal alone).
  4. `[automation]` most-restrictive autonomy on shared `task` rows (PM∪technical combine). [→ Felix/technicians, Stream 04].
- **Autonomy ceiling:** **L0 read / L2 status** (reversible internal, A10 row 1). **Refuse-precondition:**
  complete-without-verification (structural). No `always_gate` of Pierce's own here. **subject:** both.

## OP-03-05 — Maintain the RAID Register  *(leaf #1435)*
- **Owner / Stream:** Pierce / 03. **Archetype:** B4 audit-attest (maintain register) + change-spawn (→ OP-03-08).
- **Trigger:** an active project; or a new R/A/I/D signal.
- **Terminal outcome:** an up-to-date RAID Register with dependency/critical-path conflicts flagged +
  escalated; nothing silently re-scoped.
- **Procedure Steps** (B4: scope → collect → evaluate → route):
  1. `[automation]` **Scope** — read plan + task graph + dependencies, **citing each source + as-of** (A5).
  2. `[automation]` **Evaluate + maintain** — L2 maintain R/A/I/D; flag dependency/critical-path conflicts.
  3. `[hybrid]` **Route** — escalations surface (urgency computed per A6 — a critical-path conflict blocking a
     committed date is urgent → dedicated chat; else Teams tag).
  4. `[automation]` a scope/timeline change → **SEAM → OP-03-08** (governed change request), **never silent**.
- **Autonomy ceiling:** **L2** (maintain register = reversible internal, A10 row 1); the *change* a RAID item
  triggers is gated downstream (OP-03-08). No `always_gate` of its own. **subject:** both.

## OP-03-06 — Monitor burn, schedule slippage, and budget overrun  *(leaf #1436)*
- **Owner / Stream:** Pierce / 03. **Archetype:** B3 synthesis-brief / B9 deadline-sentinel (watches burn/schedule clocks, never actuates).
- **Trigger:** active project / scheduled cadence; or a threshold crossed.
- **Terminal outcome:** burn/slippage/overrun flagged early; cost validated via the Audrey seam.
- **Procedure Steps** (B3/B9: watch → detect → quantify → draft-rec → route):
  1. `[automation]` **Watch** — read `time_record` + `project_baseline` + plan, **citing each source + as-of** (A5).
  2. `[automation]` **Detect + quantify** — L2 compute + flag burn / slippage / overrun ($/schedule risk).
  3. `[hybrid]` **Pierce↔Audrey seam (A11):** Audrey validates cost **read-only, advise-only** (she holds no
     clock here — no gate from her) [→ Stream 09]. Pool-correlate similar prior projects **internally only** (A7).
  4. `[hybrid]` **Route** — surface (A6); a timeline/scope change → **SEAM → OP-03-08** (parked, easy-button-ready).
- **Autonomy ceiling:** **L2** (compute + flag = reversible internal, A10 row 1); **no money action** (Audrey
  read-only — A11: money is not Pierce's clock). **B9 rule:** escalate-to-terminal, never auto-actuate a
  budget/schedule commitment under pressure. **subject:** both.

## OP-03-07 — Schedule and fire JIT delivery-queue tickets  *(leaf #1437)*
- **Owner / Stream:** Pierce / 03. **Archetype:** B2 gated-actuation (auto-fire is idempotent external write, A9).
- **Trigger:** a provisioned project with `task_ticket_fire` rows due (rolling window per task, ADR-0096 §7).
- **Terminal outcome:** each due delivery task has its Autotask dispatch ticket **fired** (created +
  linked), fire-state `fired`; the technical layer can pick it up.
- **Procedure Steps** (B2: ground → plan → actuate[idempotent] → reconcile → log):
  1. `[automation]` **Ground + plan** — L2 schedule the fire; on window: resolve parent `autotask_project_id`,
     **citing the `task_ticket_fire` row + as-of** (A5); **DEFER if not yet provisioned** (refuse on stale ground).
  2. `[automation]` **Actuate** — **L3 auto-fire** (`createProjectTicket`), **idempotency-key guarded** so a
     replay is a no-op + audit note, never a double-fire (A9b). **A9a — Autotask is the authoritative SoR; the
     agent mirrors.**
  3. `[automation]` **Reconcile (read-back, A9c)** — confirm the ticket landed before stamping fire-state `fired`.
     [→ Felix/technicians, Stream 04].
- **Autonomy ceiling:** **L2 schedule → L3 auto-fire.** **WHY L3 (not L4 silent):** creating a client-linked
  dispatch ticket is externally reversible but **visible** in the client's service queue → A10 row 3
  (reversible-but-visible ⇒ never silent, declare undo + notify). Idempotent, reconciled. **subject:** both.

## OP-03-08 — Route scope/timeline/provisioning drift as a governed change request  *(leaf #1438)* ⛔
- **Owner / Stream:** Pierce / 03 — **the change gate; Pierce drafts + parks, a human decides.**
  **Archetype:** B2 gated-actuation (Pierce's actuation = assembling + parking the change; approval is the human's).
- **Trigger:** detected scope / timeline / provisioning **drift** (from OP-03-05/06/04).
- **Terminal outcome:** the change is **approved + applied** OR rejected — but NEVER silently.
- **Procedure Steps** (B2: ground → assemble ProposedAction → GATE → actuate[idempotent] → reconcile → log):
  1. `[automation]` **Ground** — L2 auto-flag the drift, **citing the triggering RAID/burn/task signal + as-of** (A5).
  2. `[automation]` **Assemble the change = the 4-part easy-button (A4):** (1) the **drafted change request**
     (re-plan / re-date / re-provision impact); (2) the **grounded why** — impacted milestones/tasks/clients,
     each cited + as-of; (3) **one-click Approve + one-click Reject/Edit** (the inverse); (4) **consequence
     preview** — what re-plans, on which deliverables, and the undo path / irreversibility flag.
  3. `[hybrid]` **GATE — `always_gate`:** the change routes for human approval (ADR-0118/0121; A2 class-4/6 —
     a scope/timeline/provisioning change is a delivery commitment). ⛔ A gate is never "park and wait"; it is
     "prep everything + present the button" (A4).
  4. `[automation]` **Actuate + reconcile** — on approval, apply (re-plan / re-date / **re-provision with undo**,
     idempotency-keyed, read-back per A9). On reject → notify, terminal.
- **Autonomy ceiling:** **L2 auto-flag + assemble;** the change is **`always_gate`** (A2 class-4/6). **WHY
  gated forever:** a committed scope/timeline/provisioning change is a client-facing delivery commitment with
  no clean silent undo (A10 — the irreversible row). **Overlap with Marshall (Stream 06)** — different change
  objects (project-scope CR vs infra `change_request`); the seam to pin is which agent owns which change class
  (A11). **subject:** both.

## OP-03-09 — Run the internal status cadence & stakeholder comms plan  *(leaf #1439)*
- **Owner / Stream:** Pierce / 03. **Archetype:** B3 synthesis-brief (internal cadence) + B7 client-facing-send (client status).
- **Trigger:** a scheduled cadence tick; or a status-worthy event.
- **Terminal outcome:** internal cadence maintained; action-items/decisions logged; client-facing
  status drafted (human-sent).
- **Procedure Steps** (B3/B7: gather → synthesize → narrate → deliver[gate on client send]):
  1. `[automation]` **Gather + synthesize** — L2 schedule + assemble the internal status, **citing each
     project signal + as-of** (A5); anonymize any cross-client comparison (A7).
  2. `[automation]` **Narrate + log** — log action-items/decisions (attributed up-chain, P2); maintain the comms plan.
  3. `[hybrid]` **Deliver — client-facing status = `always_gate`** (A2 class-2; B7): Pierce **drafts**, a human
     **sends**. 4-part easy-button (A4). **B7 transactional-ack carve-out:** a *templated, non-committal,
     deterministic* "your status update for <date>" may reach **L3** once dialed; any free-text or
     commitment-bearing status stays gated.
- **Autonomy ceiling:** **L2 auto-internal;** client-facing status **`always_gate`** (class-2). Internal
  stakeholder brief is a B3 launchpad — an actionable item auto-spawns the owning worker procedure parked/draft
  (e.g. drift → OP-03-08). **subject:** both.

## OP-03-10 — Close out a delivery project and hand off to Celeste  *(leaf #1440)*
- **Owner / Stream:** Pierce / 03 — **terminal for Stream 03; the closeout SEAM → Celeste.** **Archetype:**
  B4 audit-attest (verify-complete + capture sign-off) + **A11 seam** (delivery-complete → Celeste Handoff).
- **Trigger:** all milestones verified-complete; project ready to close.
- **Terminal outcome:** project `status=complete` + final `project_baseline`; client sign-off
  captured; retro produced; **delivery-complete → Celeste Handoff** (Stream 08). Terminal for Stream 03.
- **Procedure Steps** (B4: scope[verify] → sign-off gate → capture → emit-evidence/seam):
  1. `[hybrid]` **Sign-off — `always_gate`:** deliverable acceptance / **client sign-off** (A2 class-2 — a
     client-facing acceptance commitment), 4-part easy-button (A4): drafted acceptance + cited completed
     deliverables/baseline + one-click capture + consequence preview (closes the project).
  2. `[automation]` **Capture** final `project_baseline` (read-back-verified, A9c).
  3. `[automation]` **Produce** the retrospective (attributed, P2).
  4. `[automation]` **L1 propose** template improvement (→ OP-03-03).
  5. `[automation]` **SEAM → Celeste (#1396, Stream 08):** emit delivery-complete → **Celeste Handoff** (she
     reads the retro **read-only**; Pierce does **not** run the QBR — A11: the relationship clock is Celeste's,
     the delivery clock is Pierce's; they meet at this explicit seam, never co-own). [→ Stream 08].
- **Autonomy ceiling:** **L1/L2** (verify + capture + emit = reversible internal, A10 row 1); **client sign-off
  `always_gate`** (class-2). **Substrate deps:** 🔌#991, Celeste #1396. **subject:** both.

## OP-03-11 — Stand up the Projects domain + wire the Pierce persona  *(leaf #1431 — OS-self, D7.1)*
- **Owner / Stream:** Pierce / 03 (OS-self build/config procedure).
- **Trigger:** activation of the Pierce agent (#1431); or a persona/room change.
- **Terminal outcome:** the projects domain room stands up and `pierce.md` composes into every
  Projects worker's system, so the above procedures' workspaces resolve.
- **Procedure Steps:**
  1. `[gui-step]` author `room.md`/`room.yaml` (budget ⊆ Constitution).
  2. `[gui-step]` compose `pierce.md`.
  3. `[automation]` icm-conformance gate.
  4. `[gui-step]` verify L0–L4 capability-complete (capability-built to ceiling; dial ships L0, A3).
- **Autonomy ceiling:** N/A (a build/config procedure). `always_gate` floor: ADR + migration numbers
  claimed at merge; codex + human review. **subject:** imperion (pure OS-self-operation).

---

## Provable-coverage note

Sold→Live surface fully covered: triage won→candidate (00), kickoff/provision-from-won (01), Onboarding/
Easy-Mode (02), catalog-binding (03), track-to-verified-complete (04), RAID (05), burn/slippage monitor (06),
JIT ticket fire (07), governed change (08), status cadence (09), closeout→Celeste (10), domain stand-up (11).
The spine = 00→01→04→(05/06)→10, with 02 the Onboarding variant of 01, 07 firing the provisioned queue, and
08 the change gate fed by 04/05/06. **Doctrine inheritance (ADR-0136):** every procedure names its archetype
(B1–B9) and inherits A1–A11; the stream is the canonical showcase of **B8 provision-with-undo** — kickoff &
provision-from-won (01/02) are L4 reversible-auto behind an undo window, gated on a structural
`contract_state='signed'` refuse-precondition, with irreversible/client-visible sub-steps (welcome-email→B7,
setup-fee→B6, go-live date→A2 class-2) peeled to their own gates and close-on-verification throughout. Per
A5c, deepened steps that depend on dormant substrate (#389/#991/#119/#318/#1306) ship propose-only until built.

**Count: 12 Operating Procedures** (10 filed leaves #1431–1440 + 2 harvested: OP-03-00 seam, OP-03-02
Onboarding/Easy-Mode). Workspaces unbuilt until #1431; procedure-only in fact.

**Flagged for Mark:** (1) Onboarding (OP-03-02) as its own filed leaf vs "OP-03-01 with the
Onboarding template". (2) Pierce↔Marshall change ownership seam (OP-03-08 vs Stream 06). (3)
Easy-Mode customer-env config autonomy class (its own `always_gate` peel, B8). (4) OP-03-00 keep-or-fold.
(5) when the most-restrictive PM∪technical combine (FE #1412) binds.
