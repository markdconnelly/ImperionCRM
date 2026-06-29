# Stream 06 — Change → Release

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

**Owner agent:** Marshall (Change/Release Management), reports to Dexter (CTO). **Owning ICM
domain:** `icm/domains/change-release/` (🔨UNBUILT — entire stream is procedure-only until
Marshall epic **#1553** authors the workspace + tracer).
**Stream scope:** change intake & classification · risk/impact assessment · the CAB / approval
gate · scheduling & the change calendar · rollback drafting · change comms · dispatch-to-executor ·
PIR/close · freeze calendar · standard-change catalog · Autotask change route.

**Core design rule (Marshall is an L2 GOVERNANCE GATE, never an actuator).** This stream *is* the
clean showcase of doctrine **A11 (obligation/action separation)**: Marshall owns the *governance
clock/standard* (classify, risk-score, schedule, draft rollback + comms, **park for approval**);
the *mechanical change act* is owned by the executing technical agent (Ozzie/Felix/Osiris/Phoenix/
Pierce) under THEIR ceiling. They meet at an explicit seam (OP-06-07), never co-own. Risk-score +
schedule + draft are **auto at L2 because internally reversible** (A10); the **approval decision is
`always_gate`** (A2 class-6, governance commitment) — dial-proof at any level; the **production
change is `always_gate` on the executor** (A2 class-4). Marshall never touches a CI.

**Seams (every cross-agent hand-off is an explicit Procedure Step, A11):** changes-in from Sage
(Problem Mgmt #1552), Pierce (project provisioning), Roman/Cyrus (security remediation #1556);
executors-out (OP-06-07); evidence-out → Grace (GRC #1557); client-comms-out → Celeste (#1396);
runbook-out → Alivia (#1561); risk-grounding-in → Audrey (financial) / Celeste (relationship).

**Substrate grounding (verified live, 2026-06-28):** `change_request` silver entity EXISTS (mig
`0135`, 💤dormant; concept file + ADR-0079; archetype D, Autotask = eventual record SoR via gated
#661; data_class `operational`). State machine LIVE in `src/lib/change.ts` (`change_status`
draft→pending_approval→approved|rejected→scheduled→completed|cancelled; `change_type`
standard|normal|emergency); helpers incl. `createChangeRequest`/`decideChangeApproval`(#659)/
`setChangeSchedule`(#660)/risk path (#658). Surfaces LIVE: `/changes`, `/changes/approvals`
(emergency-first), `/changes/calendar`; gates `change:write` (admin∨support), `change:approve`
(admin). Affected CIs = `change_affected_ci` over `cmdb_ci` union (#645). Standard = pre-authorized
(opens `approved`, audited `change.auto_approved`); normal/emergency open `pending_approval`;
schedule conflicts = **context only, NO hard freeze enforcement in v1** (deliberate follow-up).

**Archetype map (B-templates this stream instantiates).**

| Procedure | Archetype |
|---|---|
| OP-06-01 intake & classify | **B1 triage/route** |
| OP-06-02 risk & impact | **B4 audit-attest** (measure/score, internal) |
| OP-06-03 CAB approval gate ⛔ | **B2 gated-actuation** (the gate) |
| OP-06-04 schedule & calendar | **B2 gated-actuation** + **B9 deadline-sentinel** (freeze edge) |
| OP-06-05 draft rollback | **B2** prep step (the undo declaration, A10) |
| OP-06-06 change comms | **B7 client-facing-send** |
| OP-06-07 dispatch to executor | **A11 seam** → executor's **B2 gated-actuation** |
| OP-06-08 PIR & close | **B4 audit-attest** (verify + emit evidence) |
| OP-06-09 freeze calendar | **B9 deadline-sentinel** |
| OP-06-10 standard-change catalog | **B4 audit-attest** + ratification gate |
| OP-06-11 Autotask route | **B6/B2** external-SoR write (idempotent, A9) |

**Driving policy (every procedure):** inherits the doctrine universal baseline (ADR-0136 A2/A4/A5)
+ `TBD (mark-blocker: company-policy-collection)` for the 1–3 specific drivers (D4, #1586). Owed as
separate IT-Glue business docs: Change/Release Management · Change-Freeze/Blackout · Emergency-Change ·
Standard-Change Catalog · Maintenance-Window. Mapped in the #1586 pass.

**Dormancy flags:** 💤**0135** change_request mig not prod-applied · 🔨**UNBUILT** no icm/ workspace
yet · 🔌**#119** trigger-sync · 🔌**#991** cross-agent event bus / handoff intake · 🔌**#389** Voyage
embeddings (recall) · 🔌**#661** Autotask change write-back route. **3 schema gaps proposed to FE
(#1579):** rollback artifact (OP-06-05) · `change_freeze` calendar (OP-06-09) · standard-change
catalog (OP-06-10). Per A5c, deepened steps that depend on these ship **propose-only** until built.

---

## OP-06-01 · Intake & classify a change request
- **Owner / Stream:** Marshall / 06. **Archetype:** B1 triage/route.
- **Trigger:** a change is raised — from Sage (#1552 known-error remediation), Pierce (provisioning/
  scope change), Roman/Cyrus (#1556 security remediation), a tech/agent ad-hoc, or self-raised
  (Imperion-self/dogfood). `change.created` event.
- **Terminal outcome:** a persisted `change_request` classified `standard|normal|emergency` with
  affected CIs attached, in the correct initial status (`approved` if standard, else `pending_approval`).
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition → log):
  1. `[automation]` **Ground** — ingest the raised change (title/description/requester/account),
     **citing the source hand-off + as-of** (A5); empty/unparseable → park. **SEAM: accepts hand-off
     from Sage / Pierce / Roman / Cyrus / tech** (their proposal carries the rationale, attributed up-chain). **L2.**
  2. `[automation]` **Resolve owner** — attach affected CIs (`` `okf:cmdb_ci` `` via `change_affected_ci`,
     validated vs `listConfigurationItems`) — **shared sub-step: resolve Client Mapping** for owning
     `` `okf:account` ``.
  3. `[hybrid]` **Classify** `change_type` vs the **Standard-Change Catalog**: catalog-match → `standard`;
     novel/assessed → `normal`; break-fix-under-incident → `emergency`. Marshall recommends; routing
     auto-executes at L2 (B1 — classification/queue assignment is internally reversible), **except** a
     *novel standard candidate*, which parks (B1 carve-out: a pre-authorization is a governance act).
  4. `[automation]` **Disposition + log** — `createChangeRequest` (standard opens `approved`, audited;
     normal/emergency open `pending_approval`). **SEAM → OP-06-02 (risk) for normal/emergency.**
- **Autonomy ceiling:** **L2** (internally reversible — A10 row 1: CI-resolve/create-row). **`always_gate`
  (inherited A2 + delta):** adding a new entry to the Standard-Change Catalog (governance — see OP-06-10).
- **Human-in-loop:** Dexter pairing; v1 routes to Mark (proxy). Recede L0→L2 per A3 (ships observe-only).
- **Substrate deps:** 💤0135 · 🔨UNBUILT · 🔌#991 (handoff intake) · 🔌#119. **subject:** both.

## OP-06-02 · Risk & impact assessment
- **Owner / Stream:** Marshall / 06. **Archetype:** B4 audit-attest (internal — measure + score, no external attestation).
- **Trigger:** a `normal`/`emergency` change reaches `pending_approval` (from OP-06-01); or an admin
  requests re-assessment.
- **Terminal outcome:** `risk_derived` (0–100) set; effective band computed (`risk_override ??
  risk_derived`); affected-CI blast radius + criticality summarized onto the change for the approver.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → route):
  1. `[automation]` **Scope + collect evidence** — walk the affected-CI set → CMDB criticality
     (`` `okf:cmdb_ci` `` overlay) + CI relationships (`ci_relationship`, #647) to compute blast radius,
     **citing each CI + as-of** (A5). **L2.**
  2. `[automation]` **Evaluate** — compute `risk_derived` from criticality × blast-radius × change_type;
     write via the risk path (#658); band it (low/med/high).
  3. `[hybrid]` **Compose** — surface impacted clients/services + plain-language impact. **SEAM → Audrey**
     (financial-impact grounding) and **Celeste** (relationship impact) on high-band client-facing changes
     — advise-only, no gate from them (A11: they hold no clock here). Pool-correlate similar prior changes
     internally only (A7).
  4. `[gui-step]` Admin may set `risk_override` (override-wins) on change detail.
- **Autonomy ceiling:** **L2** (compute + write derived risk = reversible internal, A10). `risk_override`
  is a human GUI act. No `always_gate` (risk is advisory input to the OP-06-03 gate).
- **Human-in-loop:** Dexter pairing; approver always reads the score before deciding.
- **Substrate deps:** 💤0135 · 🔨UNBUILT · #647/#648 CMDB overlays · 🔌#991 (grounding) · 🔌#389. **subject:** both.

## OP-06-03 · CAB / approval gate (the core gate) ⛔
- **Owner / Stream:** Marshall / 06 — **THE governance gate; Marshall PARKS, a human decides.**
  **Archetype:** B2 gated-actuation (Marshall's actuation = *assembling and parking the decision*; the
  decision itself is the human's).
- **Trigger:** a `normal`/`emergency` change enters the approval queue (`/changes/approvals`);
  emergency surfaced first (expedited; urgency computed per A6 — an `always_gate` decision blocking a
  change window is urgent → dedicated chat).
- **Terminal outcome:** `approval_status` = `approved` or `rejected`; on approve `status→approved`,
  `approved_by_user_id`/`approved_at` stamped, audited `change.approved`/`change.rejected`.
- **Procedure Steps** (B2: ground → assemble ProposedAction → GATE → … ):
  1. `[automation]` **Assemble the CAB packet = the 4-part easy-button (A4):** (1) the **complete drafted
     change** — classification + schedule proposal (OP-06-04) + draft rollback (OP-06-05) + draft comms
     (OP-06-06); (2) the **grounded why** — risk band + affected CIs + impacted clients, each cited + as-of
     (A5); (3) the **one-click** Approve (+ one-click Reject/Edit, the inverse); (4) the **consequence
     preview** — what executes, on which CIs, the rollback path, irreversibility flags. **L2.**
  2. `[automation]` **PARK** into `/changes/approvals` (+ Teams Adaptive Card, the cockpit channel) — the
     `always_gate` stop. ⛔ A gate is never "park and wait"; it is "prep everything + present the button" (A4).
  3. `[gui-step]` **Human approver** (admin, `change:approve`) reviews packet → Approve / Reject / Edit.
     `decideChangeApproval` writes the verdict (refuses any decision on a change not `pending`).
  4. `[automation]` On approve → **SEAM → OP-06-04 (schedule)** then OP-06-07 (execute via tech agent).
     On reject → notify requester, `change.rejected`, terminal.
- **Autonomy ceiling:** L2 (assemble + park = auto). **`always_gate` (HARD, A2 class-6): the approval
  decision NEVER auto-executes at any dial** — Marshall's defining ceiling (A10 "no clean undo ⇒ gated":
  an approved prod change is irreversible-by-default). Standard changes bypass by being pre-authorized in
  OP-06-01 (catalog), NOT by Marshall auto-approving.
- **Human-in-loop:** Dexter (CTO, normal) / **Mark (CISO, security-affecting or emergency)** approver. Recede
  L0→L5 Marshall does MORE prep (richer easy-button) but the approve click stays human **forever** (A3 floor).
- **Substrate deps:** 💤0135 · 🔨UNBUILT · #659 approval slice · Teams/PA cockpit (BE #1089) · 🔌#119.
  **subject:** both. **(OWNERSHIP: clean — Marshall owns the gate-clock, owning tech agent owns execution, A11.)**

## OP-06-04 · Schedule change & manage the change calendar
- **Owner / Stream:** Marshall / 06. **Archetype:** B2 gated-actuation + B9 deadline-sentinel (freeze edge).
- **Trigger:** a change reaches `approved` and needs a window; or a scheduled change must be re-windowed.
- **Terminal outcome:** `schedule_start`/`schedule_end` set (validated end≥start), `status→scheduled`
  (reversible `approved↔scheduled` toggle); change appears on `/changes/calendar`.
- **Procedure Steps:**
  1. `[automation]` Propose a window honoring the **Maintenance-Window Policy** + **freeze/blackout
     calendar** (OP-06-09) + per-account preferred windows, cited (A5). **L2.**
  2. `[automation]` `findScheduleConflicts` — surface overlapping windows sharing an account/CI as
     **context** (v1 = informational, NO hard freeze enforcement — deliberate gap, see OP-06-09).
  3. `[hybrid]` `setChangeSchedule` sets the window; `nextScheduleStatus` promotes `approved→scheduled`.
     A change landing in a **freeze period** is flagged for human override.
  4. `[automation]` Notify owning tech agent + affected client (draft, via OP-06-06). **SEAM → OP-06-07.**
- **Autonomy ceiling:** **L2** (propose + set window on an already-approved change = reversible internal, A10
  row 1). **`always_gate`: scheduling INTO a declared freeze/blackout window** (overriding the freeze is a
  governance act — A2 class-6).
- **Human-in-loop:** Dexter pairing; freeze-override always human (the floor).
- **Substrate deps:** 💤0135 · 🔨UNBUILT · #660 schedule slice · freeze-calendar (UNBUILT, OP-06-09, #1579) ·
  🔌#119. **subject:** both.

## OP-06-05 · Draft the rollback / back-out plan
- **Owner / Stream:** Marshall / 06. **Archetype:** B2 prep step — this *is* the **undo declaration** A10
  requires of any reversible change (declare the undo + its trigger/verification before approval).
- **Trigger:** a `normal`/`emergency` change is being prepared for the CAB packet (OP-06-03), pre-approval.
- **Terminal outcome:** a documented, reviewable back-out plan attached to the change, required before
  approval for normal/emergency.
- **Procedure Steps:**
  1. `[automation]` Recall prior similar changes + affected-CI runbooks (IT Glue / Alivia) to draft a
     step-by-step back-out, **citing the source runbook + as-of**; on empty recall, park to the tech agent
     (A5 — never fabricate a back-out). **SEAM → Alivia (#1561)** for the canonical CI runbook. **L2.**
  2. `[automation]` Draft the rollback + define **success/verification criteria** and the rollback
     trigger condition (the A10 undo-window contract for this change).
  3. `[hybrid]` Owning tech agent (Ozzie/Felix/Osiris/Phoenix) reviews technical feasibility. **SEAM → executing agent.**
- **Autonomy ceiling:** **L2** (drafting only). No `always_gate` (a draft; INPUT to the gate). A change with
  **no clean back-out** is flagged `irreversible` → hardens the OP-06-03 gate (A10: no clean undo ⇒ always_gate).
- **Human-in-loop:** owning tech agent + Dexter. Recede per A3.
- **Substrate deps:** 🔨UNBUILT · 🔌#389 (recall) · Alivia/IT-Glue · **schema gap (rollback artifact, #1579)**.
  **subject:** both.

## OP-06-06 · Draft & dispatch change communications
- **Owner / Stream:** Marshall / 06. **Archetype:** B7 client-facing-send.
- **Trigger:** a change is scheduled (OP-06-04) — pre-change client notice; or status changes
  (approved/rescheduled/completed/backed-out).
- **Terminal outcome:** stakeholder + affected-client notifications drafted and (gated) dispatched.
- **Procedure Steps** (B7: ground → compose → SEND GATE → send → log):
  1. `[automation]` Draft the change notice (window, impact, expected disruption) from the record, no
     fabricated impact/timeline (A5). **L2.**
  2. `[hybrid]` **SEAM → Celeste (#1396)** for client-facing notices (relationship boundary — Marshall
     never 1:1 client-comms; Celeste owns the client voice, A11) / **Scout (#1554)** if onsite coordination.
  3. `[gui-step]` Client-facing send = **`always_gate`** (A2 class-2). **B7 transactional-ack carve-out
     applies:** a *templated, non-committal, deterministic* "your change window is confirmed for <date>"
     notice may reach **L3** (execute-then-notify) once dialed; any free-text or impact-committal notice
     stays gated.
- **Autonomy ceiling:** **L2** draft. **`always_gate`: any communicative/committal customer-facing send**
  (client_pii + customer-facing data_class). Transactional-ack → L3 (B7). Internal stakeholder notice → L3.
- **Human-in-loop:** Celeste + Dexter; client send always gated (floor).
- **Substrate deps:** 🔨UNBUILT · 🔌#991 (Celeste seam) · Teams/PA · M365 send (gated, ADR-0058).
  **subject:** both. **(SEAM/OWNERSHIP: client comms ride Celeste; Marshall owns internal/stakeholder, A11.)**

## OP-06-07 · Hand off approved change to the executing agent
- **Owner / Stream:** Marshall / 06 — **the actuation SEAM; Marshall does NOT execute.** **Archetype:**
  **A11 seam** → the executor's **B2 gated-actuation**. This procedure is the stream's canonical proof of
  obligation/action separation: Marshall holds the governance clock, the executor performs the act.
- **Trigger:** a `scheduled` change's window opens (or an approved emergency change ready to run).
- **Terminal outcome:** the change is handed to the **owning technical agent**, who actuates under
  **their own ceiling + `always_gate`** for production-affecting actions; `change_request` moves toward
  `completed`.
- **Procedure Steps:**
  1. `[automation]` **Re-ground (A5):** verify preconditions still hold (approval current, window open,
     freeze clear, CIs unchanged — cite the as-of of each); **refuse/re-park if drifted** (never proceed on
     stale ground). **L2.**
  2. `[automation]` **SEAM → executing agent by CI type/domain:** Ozzie (NOC/network/infra), Felix
     (endpoint/service), Osiris (identity/JML), Phoenix (backup/DR), Pierce (project provisioning). Emit the
     governed execution **ProposedAction** (approve-once/run-all, ADR-0081) into THEIR gauntlet.
  3. `[hybrid]` **Executing agent runs the change** — production-affecting actuation is `always_gate` in
     THEIR ladder (A2 class-4; Marshall's L2 does not raise it). On partial failure the executor **halts,
     no auto-rollback** (A10) and surfaces completed-vs-pending; re-run is idempotent from the top (B2). ⛔
  4. `[automation]` Receive completion signal → drive OP-06-08 (PIR).
- **Autonomy ceiling:** **Marshall L2 (dispatch/observe only).** EXECUTION inherits the executing agent's
  ceiling; **production-affecting change = `always_gate` on the executor**. Marshall can NEVER raise it (A11).
- **Human-in-loop:** the executing agent's human pairing holds the prod-actuation gate forever; Marshall's
  pairing (Dexter) holds the precondition re-check.
- **Substrate deps:** 🔨UNBUILT · 🔌#991 (dispatch seam) · 🔌#119 · executor gauntlet (#263 plane).
  **subject:** both. **(OWNERSHIP: clean by design — the gate-vs-actuator split is the whole point, A11.)**

## OP-06-08 · Post-implementation review (PIR) & close
- **Owner / Stream:** Marshall / 06. **Archetype:** B4 audit-attest (internal — verify + emit evidence).
- **Trigger:** owning tech agent signals the change is executed (OP-06-07), or the window elapsed.
- **Terminal outcome:** `status→completed` (or `cancelled`/backed-out); PIR verdict recorded (success /
  partial / failed+rolled-back); audit evidence emitted to Grace.
- **Procedure Steps:**
  1. `[automation]` **Verify (read-back, A9c):** collect the execution result + read back the affected CIs
     to confirm they reached the intended state vs OP-06-05 success criteria (close-on-verification, never
     close-on-signal). **L2.**
  2. `[hybrid]` On failure → **trigger rollback** (hand to executing agent, OP-06-07 path) and, if the
     failure reveals a recurring root cause, **SEAM → Sage (#1552, Problem Mgmt)** to raise a problem.
  3. `[automation]` Set terminal `status`; write the PIR note (attributed up-chain).
  4. `[automation]` **SEAM → Grace (#1557, GRC):** emit the change as control evidence (every change =
     audit evidence). **SEAM → Alivia (#1561):** update the affected-CI runbook (the one uniform
     dual-audience document, A8) with what changed.
- **Autonomy ceiling:** **L2** (verify + record + emit evidence = reversible internal, A10). Triggering a
  rollback re-enters OP-06-07 (executor's `always_gate`). No new gate of Marshall's own.
- **Human-in-loop:** Dexter pairing reviews failed/partial PIRs. Rollback actuation = executor's human floor.
- **Substrate deps:** 🔨UNBUILT · 🔌#991 (Grace/Sage/Alivia seams) · verifier plane (#286) · 🔌#389. **subject:** both.

## OP-06-09 · Maintain the freeze / blackout calendar — net-new, 💤DORMANT
- **Owner / Stream:** Marshall / 06. **Archetype:** B9 deadline-sentinel (a freeze is a clock the
  scheduler must honor).
- **Trigger:** a scheduled business event (peak season, client blackout, audit window) or admin declares
  a freeze; schedule-cadence review.
- **Terminal outcome:** a declared freeze/blackout window that OP-06-04 honors (scheduling into it =
  `always_gate`); freeze entered/exited with audit.
- **Procedure Steps:**
  1. `[gui-step]` Admin declares a freeze window (scope: estate-wide / per-account / per-CI-class).
  2. `[automation]` Marshall enforces it as a scheduling constraint in OP-06-04 (`findScheduleConflicts`
     graduates from informational → blocking for freeze windows). **L2.**
  3. `[hybrid]` Emergency-change exception during a freeze = explicit human override, audited (B9: the
     sentinel never auto-actuates around the freeze; it escalates + pre-stages the override easy-button).
- **Autonomy ceiling:** **L2.** **`always_gate`: scheduling into / overriding a freeze** (A2 class-6).
- **Human-in-loop:** Dexter/Mark declare freezes; override always human.
- **Substrate deps:** 🔨UNBUILT · **schema gap (`change_freeze`, #1579)** · ties OP-06-04. **subject:** both.

## OP-06-10 · Curate the standard-change catalog — net-new governance, 💤DORMANT
- **Owner / Stream:** Marshall / 06. **Archetype:** B4 audit-attest (identify + draft) + ratification gate.
- **Trigger:** a recurring low-risk `normal` change proves itself (clean track record) and is proposed
  for promotion to `standard`; or periodic catalog review.
- **Terminal outcome:** the standard-change catalog gains/loses a pre-authorized change class (drives
  OP-06-01 auto-approve).
- **Procedure Steps:**
  1. `[automation]` Identify promotion candidates from change history (repeated, low-risk, zero-failure
     normal changes) — earned-autonomy signal, cited (A5). **L2.**
  2. `[hybrid]` Draft the catalog entry (scope, pre-auth conditions, standard rollback). **SEAM → Grace**
     (does pre-authorizing this class hold up to audit?).
  3. `[gui-step]` **Human ratifies** the catalog change (pre-authorizing a change class is a governance
     act — `always_gate`, A2 class-6).
- **Autonomy ceiling:** **L2** (identify + draft). **`always_gate`: ratifying a catalog entry** (mirrors
  Vera's standard-version ratification — Marshall drafts, Mark/Dexter ratifies; A11 obligation/action split).
- **Human-in-loop:** Dexter/Mark ratifies. Recede per A3; ratification floor stays. **subject:** both.
- **Substrate deps:** 🔨UNBUILT · **schema gap (catalog, #1579)** · ties OP-06-01.

## OP-06-11 · Route the change record to Autotask — harvested #661, 💤DORMANT
- **Owner / Stream:** Marshall / 06 (write proposes; executing-agent/HITL actuates the external write).
  **Archetype:** external-SoR write — A9 idempotent actuation (B6/B2 shape).
- **Trigger:** a `completed`/`approved` change must be recorded in Autotask change management (the
  eventual record SoR).
- **Terminal outcome:** `autotask_change_id` populated; the app-native working object reconciled to the
  Autotask change record.
- **Procedure Steps:**
  1. `[automation]` Map `change_request` → Autotask change payload, **idempotency-keyed on
     `autotask_change_id`** (replay = no-op + audit note, never a double-write; A9b). **L2.**
  2. `[gui-step]` **HITL gated write** (#661) — Autotask is external SoR (the agent mirrors, never owns,
     A9a); the write is human-gated.
  3. `[automation]` **Read back** the Autotask record to confirm it landed, then stamp `autotask_change_id`
     and reconcile (close-on-verification, A9c).
- **Autonomy ceiling:** **L2** (map/propose). **`always_gate`: the external Autotask write** (writing a
  customer-system SoR is a mutation — A2 class-2/4).
- **Human-in-loop:** Dexter/admin gates the write. v1 → Mark.
- **Substrate deps:** 💤0135 · 🔌#661 · 🔨UNBUILT · 🔌#119.
  **subject:** both (Imperion-self changes also recorded if dogfooded into Autotask).

---

## Provable-coverage note

Change→Release surface fully covered: intake/classify (01), risk (02), the CAB gate (03), schedule +
calendar (04), rollback draft (05), comms (06), dispatch-to-executor (07), PIR/close (08), and the
governance/edge trio — freeze calendar (09), standard-change catalog (10), Autotask route (11). The
spine = 01→02→03→04→07→08, with 05/06 feeding the CAB packet. **Doctrine inheritance (ADR-0136):** every
procedure names its archetype (B1–B9) and inherits A1–A11; the stream is the canonical showcase of **A11
obligation/action separation** — Marshall owns governance only, **execution is explicitly NOT his** (07
dispatches to Ozzie/Felix/Osiris/Phoenix/Pierce under their ceiling + `always_gate`). 3 schema gaps proposed
to FE (#1579: rollback artifact, `change_freeze`, standard-change catalog); per A5c those procedures ship
propose-only until built.

**Count: 11 Operating Procedures** (OP-06-01 … OP-06-11).
