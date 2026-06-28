# Stream 06 — Change → Release

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-0133](../../decision-records/ADR-0133-operating-procedure-catalog.md). Terms
> **Operating Procedure** / **Procedure Step** are defined in [`CONTEXT.md`](../../../CONTEXT.md).
>
> **D9 global principles apply to every procedure below** (encoded in each Human-in-loop field,
> not restated per entry): **P1** Nova-native human co-working (every flow co-works with a human
> through Nova) · **P2** each sub-agent's reasoning is ascribed back to the paired human, up the
> chain · **P3** an "easy button" at every human gate (prep to the goal, hand the human a one-click
> resolution) · **P4** urgent → dedicated chat, else → tag the team member in the shared Teams chat.

**Owner agent:** Marshall (Change/Release Management), reports to Dexter (CTO). **Owning ICM
domain:** `icm/domains/change-release/` (🔨UNBUILT — entire stream is procedure-only until
Marshall epic **#1553** authors the workspace + tracer).
**Stream scope:** change intake & classification · risk/impact assessment · the CAB / approval
gate · scheduling & the change calendar · rollback drafting · change comms · dispatch-to-executor ·
PIR/close · freeze calendar · standard-change catalog · Autotask change route.

**Core design rule (Marshall is an L2 GOVERNANCE GATE, never an actuator):** Marshall classifies,
risk-scores, schedules, drafts rollback + comms, and **PARKS the change for human approval**.
Risk-score + schedule + draft = auto (L2 reversible-internal); **change APPROVAL is `always_gate`**
(a human decision, never auto, at any dial). The **actual change EXECUTES via the owning technical
agent** (Ozzie/Felix/Osiris/Phoenix/Pierce) under THEIR ceiling + `always_gate` for
production-affecting actions — Marshall dispatches and observes, **never touches a CI himself**.

**Seams (every cross-agent hand-off is an explicit Procedure Step):** changes-in from Sage
(Problem Mgmt #1552), Pierce (project provisioning), Roman/Cyrus (security remediation #1556);
executors-out (OP-06-07); evidence-out → Grace (GRC #1557); client-comms-out → Celeste (#1396);
runbook-out → Lexicon (#1561); risk-grounding-in → Audrey (financial) / Celeste (relationship).

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

**Driving policy (every procedure):** `TBD (mark-blocker: company-policy-collection)` (D4,
#1586). Owed as separate IT-Glue business docs: Change/Release Management · Change-Freeze/Blackout ·
Emergency-Change · Standard-Change Catalog · Maintenance-Window. File at epic-filing time.

**Dormancy flags:** 💤**0135** change_request mig not prod-applied · 🔨**UNBUILT** no icm/ workspace
yet · 🔌**#119** trigger-sync · 🔌**#991** cross-agent event bus / handoff intake · 🔌**#389** Voyage
embeddings (recall) · 🔌**#661** Autotask change write-back route. **3 schema gaps proposed to FE
(#1579):** rollback artifact (OP-06-05) · `change_freeze` calendar (OP-06-09) · standard-change
catalog (OP-06-10).

---

## OP-06-01 · Intake & classify a change request
- **Owner / Stream:** Marshall / 06.
- **Trigger:** a change is raised — from Sage (#1552 known-error remediation), Pierce (provisioning/
  scope change), Roman/Cyrus (#1556 security remediation), a tech/agent ad-hoc, or self-raised
  (Imperion-self/dogfood). `change.created` event.
- **Terminal outcome:** a persisted `change_request` classified `standard|normal|emergency` with
  affected CIs attached, in the correct initial status (`approved` if standard, else `pending_approval`).
- **Procedure Steps:**
  1. `[automation]` Ingest the raised change (title/description/requester/account). **SEAM: accepts
     hand-off from Sage / Pierce / Roman / Cyrus / tech** (their proposal carries the rationale). **L2.**
  2. `[automation]` Resolve & attach affected CIs (`change_affected_ci`, validated vs
     `listConfigurationItems`) — **shared sub-step: resolve Client Mapping** for owning `account_id`.
  3. `[hybrid]` Classify `change_type` vs the **Standard-Change Catalog**: catalog-match → `standard`;
     novel/assessed → `normal`; break-fix-under-incident → `emergency`. Marshall recommends; a *novel
     standard candidate* is gated (catalog is curated).
  4. `[automation]` `createChangeRequest` — standard opens `approved` (audited); normal/emergency open
     `pending_approval`. **SEAM → OP-06-02 (risk) for normal/emergency.**
- **Driving policy:** TBD (#1586) — Standard-Change Catalog + Change Management Policy.
- **Realization:** `icm/domains/change-release/intake-classify/` 🔨UNBUILT (part of #1553 tracer).
- **Autonomy ceiling:** L2 (CI-resolve/create-row auto). **`always_gate`: adding a new entry to the
  Standard-Change Catalog** (pre-authorizing a class is a governance act — see OP-06-10).
- **Human-in-loop:** Dexter pairing. L1 = human confirms every classification; L2 = standard/normal
  auto-classified, novel-standard-promotion gated forever. v1 routes to Mark (proxy).
- **Substrate deps:** 💤0135 · 🔨UNBUILT · 🔌#991 (handoff intake) · 🔌#119. **subject:** both.

## OP-06-02 · Risk & impact assessment
- **Owner / Stream:** Marshall / 06.
- **Trigger:** a `normal`/`emergency` change reaches `pending_approval` (from OP-06-01); or an admin
  requests re-assessment.
- **Terminal outcome:** `risk_derived` (0–100) set; effective band computed (`risk_override ??
  risk_derived`); affected-CI blast radius + criticality summarized onto the change for the approver.
- **Procedure Steps:**
  1. `[automation]` Walk the affected-CI set → CMDB criticality (`cmdb_ci_overlay`) + CI relationships
     (`ci_relationship`, #647) to compute blast radius. **L2.**
  2. `[automation]` Compute `risk_derived` from criticality × blast-radius × change_type; write via the
     risk path (#658); band it (low/med/high).
  3. `[hybrid]` Surface impacted clients/services + plain-language impact. **SEAM → Audrey** (financial-
     impact grounding) and **Celeste** (relationship impact) on high-band client-facing changes —
     informational only, no gate from them.
  4. `[gui-step]` Admin may set `risk_override` (override-wins) on change detail.
- **Driving policy:** TBD (#1586) — Change Risk-Assessment / risk-band thresholds.
- **Realization:** `icm/domains/change-release/assess-change-risk/` 🔨UNBUILT.
- **Autonomy ceiling:** L2 (compute + write derived risk = reversible internal). `risk_override` is a
  human GUI act. No `always_gate` (risk is advisory input to the OP-06-03 gate).
- **Human-in-loop:** Dexter pairing. L1 = human reviews every score; L2 = auto-computed, override always
  human; approver always reads it before deciding.
- **Substrate deps:** 💤0135 · 🔨UNBUILT · #647/#648 CMDB overlays · 🔌#991 (grounding) · 🔌#389.
  **subject:** both.

## OP-06-03 · CAB / approval gate (the core gate) ⛔
- **Owner / Stream:** Marshall / 06 — **THE governance gate; Marshall PARKS, a human decides.**
- **Trigger:** a `normal`/`emergency` change enters the approval queue (`/changes/approvals`);
  emergency surfaced first (expedited).
- **Terminal outcome:** `approval_status` = `approved` or `rejected`; on approve `status→approved`,
  `approved_by_user_id`/`approved_at` stamped, audited `change.approved`/`change.rejected`.
- **Procedure Steps:**
  1. `[automation]` Assemble the **CAB packet**: classification + risk band + affected CIs + impacted
     clients + draft rollback (OP-06-05) + draft comms (OP-06-06) + schedule proposal (OP-06-04). **L2.**
  2. `[automation]` **PARK** into `/changes/approvals` (+ Teams Adaptive Card via Power Automate, the
     cockpit channel) — this is the `always_gate` stop. ⛔
  3. `[gui-step]` **Human approver** (admin, `change:approve`) reviews packet → Approve / Reject / Edit.
     `decideChangeApproval` writes the verdict (refuses any decision on a change not `pending`).
  4. `[automation]` On approve → **SEAM → OP-06-04 (schedule)** then OP-06-07 (execute via tech agent).
     On reject → notify requester, `change.rejected`, terminal.
- **Driving policy:** TBD (#1586) — CAB / Change-Approval-Authority (who approves which band);
  Emergency-Change (retro-approval).
- **Realization:** `icm/domains/change-release/change-approval-gate/` 🔨UNBUILT. **Live substrate:**
  `decideChangeApproval` + `/changes/approvals` already exist.
- **Autonomy ceiling:** L2 (assemble + park = auto). **`always_gate` (HARD): the approval decision NEVER
  auto-executes at any dial** — Marshall's defining ceiling. Standard changes bypass this gate by being
  pre-authorized in OP-06-01 (catalog), NOT by Marshall auto-approving.
- **Human-in-loop:** Dexter (CTO, normal) / **Mark (CISO, security-affecting or emergency)** approver.
  Recede: L1→L5 Marshall does MORE prep (richer packet) but the approve click stays human **forever**
  (dial-proof floor). v1 = Mark proxies all approvers.
- **Substrate deps:** 💤0135 · 🔨UNBUILT · #659 approval slice · Teams/PA cockpit (BE #1089) · 🔌#119.
  **subject:** both. **(OWNERSHIP: clean — Marshall owns the gate, owning tech agent owns execution.)**

## OP-06-04 · Schedule change & manage the change calendar
- **Owner / Stream:** Marshall / 06.
- **Trigger:** a change reaches `approved` and needs a window; or a scheduled change must be re-windowed.
- **Terminal outcome:** `schedule_start`/`schedule_end` set (validated end≥start), `status→scheduled`
  (reversible `approved↔scheduled` toggle); change appears on `/changes/calendar`.
- **Procedure Steps:**
  1. `[automation]` Propose a window honoring the **Maintenance-Window Policy** + **freeze/blackout
     calendar** + per-account preferred windows. **L2.**
  2. `[automation]` `findScheduleConflicts` — surface overlapping windows sharing an account/CI as
     **context** (v1 = informational, NO hard freeze enforcement — deliberate gap, see OP-06-09).
  3. `[hybrid]` `setChangeSchedule` sets the window; `nextScheduleStatus` promotes `approved→scheduled`.
     A change landing in a **freeze period** is flagged for human override.
  4. `[automation]` Notify owning tech agent + affected client (draft, via OP-06-06). **SEAM → OP-06-07.**
- **Driving policy:** TBD (#1586) — Maintenance-Window + Change-Freeze/Blackout.
- **Realization:** `icm/domains/change-release/schedule-change/` 🔨UNBUILT. Live: `setChangeSchedule` +
  `/changes/calendar`.
- **Autonomy ceiling:** L2 (propose + set window on an already-approved change = reversible internal).
  **`always_gate`: scheduling INTO a declared freeze/blackout window** (overriding the freeze is a
  governance act).
- **Human-in-loop:** Dexter pairing. L1 = human picks every window; L2 = Marshall proposes + sets within
  policy, freeze-override always human (the floor).
- **Substrate deps:** 💤0135 · 🔨UNBUILT · #660 schedule slice · freeze-calendar (UNBUILT, OP-06-09,
  #1579) · 🔌#119. **subject:** both.

## OP-06-05 · Draft the rollback / back-out plan
- **Owner / Stream:** Marshall / 06.
- **Trigger:** a `normal`/`emergency` change is being prepared for the CAB packet (OP-06-03), pre-approval.
- **Terminal outcome:** a documented, reviewable back-out plan attached to the change, required before
  approval for normal/emergency.
- **Procedure Steps:**
  1. `[automation]` Recall prior similar changes + affected-CI runbooks (IT Glue / Lexicon) to draft a
     step-by-step back-out. **SEAM → Lexicon (#1561)** for the canonical CI runbook. **L2.**
  2. `[automation]` Draft the rollback + define **success/verification criteria** and the rollback
     trigger condition.
  3. `[hybrid]` Owning tech agent (Ozzie/Felix/Osiris/Phoenix) reviews technical feasibility of the
     back-out. **SEAM → executing agent.**
- **Driving policy:** TBD (#1586) — Change Management Policy (back-out-plan-required rule).
- **Realization:** `icm/domains/change-release/draft-rollback-plan/` 🔨UNBUILT. **GAP:** no rollback-plan
  column on `change_request` today → likely a child artifact/note table (propose to FE, #1579).
- **Autonomy ceiling:** L2 (drafting only). No `always_gate` (a draft; INPUT to the gate).
- **Human-in-loop:** owning tech agent + Dexter. L1 = human writes; L2 = Marshall drafts, tech validates.
- **Substrate deps:** 🔨UNBUILT · 🔌#389 (recall) · Lexicon/IT-Glue · **schema gap (rollback artifact,
  #1579)**. **subject:** both.

## OP-06-06 · Draft & dispatch change communications
- **Owner / Stream:** Marshall / 06.
- **Trigger:** a change is scheduled (OP-06-04) — pre-change client notice; or status changes
  (approved/rescheduled/completed/backed-out).
- **Terminal outcome:** stakeholder + affected-client notifications drafted and (gated) dispatched.
- **Procedure Steps:**
  1. `[automation]` Draft the change notice (window, impact, expected disruption) from the record. **L2.**
  2. `[hybrid]` **SEAM → Celeste (#1396)** for client-facing notices (relationship boundary — Marshall
     never 1:1 client-comms; Celeste owns the client voice) / **Scout (#1554)** if onsite coordination.
  3. `[gui-step]` Client-facing send = human-approved (`always_gate` per ladder); internal stakeholder
     notices may auto at higher dial.
- **Driving policy:** TBD (#1586) — Change-Communication / client-notice SLA.
- **Realization:** `icm/domains/change-release/draft-change-comms/` 🔨UNBUILT.
- **Autonomy ceiling:** L2 (draft). **`always_gate`: any customer-facing send** (client_pii +
  customer-facing data_class). Internal-only notice may earn L3.
- **Human-in-loop:** Celeste + Dexter. L1 = human approves every notice; L3 = internal notices auto,
  client send always gated (floor).
- **Substrate deps:** 🔨UNBUILT · 🔌#991 (Celeste seam) · Teams/PA · M365 send (gated, ADR-0058).
  **subject:** both. **(SEAM/OWNERSHIP: client comms ride Celeste; Marshall owns internal/stakeholder.)**

## OP-06-07 · Hand off approved change to the executing agent
- **Owner / Stream:** Marshall / 06 — **the actuation SEAM; Marshall does NOT execute.**
- **Trigger:** a `scheduled` change's window opens (or an approved emergency change ready to run).
- **Terminal outcome:** the change is handed to the **owning technical agent**, who actuates under
  **their own ceiling + `always_gate`** for production-affecting actions; `change_request` moves toward
  `completed`.
- **Procedure Steps:**
  1. `[automation]` Verify preconditions still hold (approval current, window open, freeze clear, CIs
     unchanged — grounding re-check); refuse/re-park if drifted. **L2.**
  2. `[automation]` **SEAM → executing agent by CI type/domain:** Ozzie (NOC/network/infra), Felix
     (endpoint/service), Osiris (identity/JML), Phoenix (backup/DR), Pierce (project provisioning).
     Emit the governed execution proposal into THEIR gauntlet.
  3. `[hybrid]` **Executing agent runs the change** — production-affecting actuation is `always_gate` in
     THEIR ladder (Marshall's L2 does not raise it). Marshall observes, does not actuate. ⛔
  4. `[automation]` Receive completion signal → drive OP-06-08 (PIR).
- **Driving policy:** TBD (#1586) — Change-Execution / production-change authorization.
- **Realization:** spans Marshall + executing-agent workspaces 🔨UNBUILT.
- **Autonomy ceiling:** **Marshall L2 (dispatch/observe only).** EXECUTION inherits the executing agent's
  ceiling; **production-affecting change = `always_gate` on the executor**. Marshall can NEVER raise it.
- **Human-in-loop:** the executing agent's human pairing holds the prod-actuation gate forever; Marshall's
  pairing (Dexter) holds the precondition re-check.
- **Substrate deps:** 🔨UNBUILT · 🔌#991 (dispatch seam) · 🔌#119 · executor gauntlet (#263 plane).
  **subject:** both. **(OWNERSHIP: clean by design — gate vs actuator split is the whole point.)**

## OP-06-08 · Post-implementation review (PIR) & close
- **Owner / Stream:** Marshall / 06.
- **Trigger:** owning tech agent signals the change is executed (OP-06-07), or the window elapsed.
- **Terminal outcome:** `status→completed` (or `cancelled`/backed-out); PIR verdict recorded (success /
  partial / failed+rolled-back); audit evidence emitted to Grace.
- **Procedure Steps:**
  1. `[automation]` Collect the execution result + verify against OP-06-05 success criteria (did the CI
     reach the intended state?). **L2.**
  2. `[hybrid]` On failure → **trigger rollback** (hand to executing agent, OP-06-07 path) and, if the
     failure reveals a recurring root cause, **SEAM → Sage (#1552, Problem Mgmt)** to raise a problem.
  3. `[automation]` Set terminal `status`; write the PIR note.
  4. `[automation]` **SEAM → Grace (#1557, GRC):** emit the change as control evidence (every change =
     audit evidence). **SEAM → Lexicon (#1561):** update the affected-CI runbook with what changed.
- **Driving policy:** TBD (#1586) — PIR / change-closure.
- **Realization:** `icm/domains/change-release/change-pir-close/` 🔨UNBUILT.
- **Autonomy ceiling:** L2 (verify + record + emit evidence = reversible internal). Triggering a rollback
  re-enters OP-06-07 (executor's `always_gate`). No new gate of Marshall's own.
- **Human-in-loop:** Dexter pairing reviews failed/partial PIRs. L1 = human writes PIR; L2 = Marshall
  drafts verdict, human confirms failures. Rollback actuation = executor's human floor.
- **Substrate deps:** 🔨UNBUILT · 🔌#991 (Grace/Sage/Lexicon seams) · verifier plane (#286) · 🔌#389.
  **subject:** both.

## OP-06-09 · Maintain the freeze / blackout calendar — net-new, 💤DORMANT
- **Owner / Stream:** Marshall / 06.
- **Trigger:** a scheduled business event (peak season, client blackout, audit window) or admin declares
  a freeze; schedule-cadence review.
- **Terminal outcome:** a declared freeze/blackout window that OP-06-04 honors (scheduling into it =
  `always_gate`); freeze entered/exited with audit.
- **Procedure Steps:**
  1. `[gui-step]` Admin declares a freeze window (scope: estate-wide / per-account / per-CI-class).
  2. `[automation]` Marshall enforces it as a scheduling constraint in OP-06-04 (`findScheduleConflicts`
     graduates from informational → blocking for freeze windows). **L2.**
  3. `[hybrid]` Emergency-change exception during a freeze = explicit human override, audited.
- **Driving policy:** TBD (#1586) — Change-Freeze/Blackout.
- **Realization:** 🔨UNBUILT — **NO freeze-calendar schema today** (v1 conflict detection is
  informational-only per the change_request concept file: freeze-period gating is a deliberate
  follow-up). Propose a `change_freeze` table to FE (#1579). **DORMANT until built.**
- **Autonomy ceiling:** L2. **`always_gate`: scheduling into / overriding a freeze.**
- **Human-in-loop:** Dexter/Mark declare freezes; override always human.
- **Substrate deps:** 🔨UNBUILT · **schema gap (`change_freeze`, #1579)** · ties OP-06-04.
  **subject:** both.

## OP-06-10 · Curate the standard-change catalog — net-new governance, 💤DORMANT
- **Owner / Stream:** Marshall / 06.
- **Trigger:** a recurring low-risk `normal` change proves itself (clean track record) and is proposed
  for promotion to `standard`; or periodic catalog review.
- **Terminal outcome:** the standard-change catalog gains/loses a pre-authorized change class (drives
  OP-06-01 auto-approve).
- **Procedure Steps:**
  1. `[automation]` Identify promotion candidates from change history (repeated, low-risk, zero-failure
     normal changes) — earned-autonomy signal. **L2.**
  2. `[hybrid]` Draft the catalog entry (scope, pre-auth conditions, standard rollback). **SEAM → Grace**
     (does pre-authorizing this class hold up to audit?).
  3. `[gui-step]` **Human ratifies** the catalog change (pre-authorizing a change class is a governance
     act — `always_gate`).
- **Driving policy:** TBD (#1586) — Standard-Change Catalog governance / change-model.
- **Realization:** 🔨UNBUILT — **NO catalog schema today** (standard/normal/emergency is a free per-change
  pick). Propose a `standard_change_model` catalog to FE (#1579). **DORMANT until built.**
- **Autonomy ceiling:** L2 (identify + draft). **`always_gate`: ratifying a catalog entry** (mirrors
  Vera's standard-version ratification — Marshall drafts, Mark/Dexter ratifies).
- **Human-in-loop:** Dexter/Mark ratifies. L1→L5 Marshall surfaces better candidates; ratification floor
  stays. **subject:** both.
- **Substrate deps:** 🔨UNBUILT · **schema gap (catalog, #1579)** · ties OP-06-01.

## OP-06-11 · Route the change record to Autotask — harvested #661, 💤DORMANT
- **Owner / Stream:** Marshall / 06 (write proposes; executing-agent/HITL actuates the external write).
- **Trigger:** a `completed`/`approved` change must be recorded in Autotask change management (the
  eventual record SoR).
- **Terminal outcome:** `autotask_change_id` populated; the app-native working object reconciled to the
  Autotask change record.
- **Procedure Steps:**
  1. `[automation]` Map `change_request` → Autotask change payload (idempotent on `autotask_change_id`).
     **L2.**
  2. `[gui-step]` **HITL gated write** (#661) — Autotask is external SoR; the write is human-gated.
  3. `[automation]` Stamp `autotask_change_id`, reconcile.
- **Driving policy:** TBD (#1586).
- **Realization:** 🔌#661 route slice (planned, NOT built). 🔨UNBUILT workspace.
- **Autonomy ceiling:** L2 (map/propose). **`always_gate`: the external Autotask write** (writing the SoR
  is a customer-system mutation).
- **Human-in-loop:** Dexter/admin gates the write. v1 → Mark.
- **Substrate deps:** 💤0135 · 🔌#661 · 🔨UNBUILT · 🔌#119.
  **subject:** both (Imperion-self changes also recorded if dogfooded into Autotask).

---

## Provable-coverage note

Change→Release surface fully covered: intake/classify (01), risk (02), the CAB gate (03), schedule +
calendar (04), rollback draft (05), comms (06), dispatch-to-executor (07), PIR/close (08), and the
governance/edge trio — freeze calendar (09), standard-change catalog (10), Autotask route (11). The
spine = 01→02→03→04→07→08, with 05/06 feeding the CAB packet. Marshall owns governance only;
**execution is explicitly NOT his** (07 dispatches to Ozzie/Felix/Osiris/Phoenix/Pierce under their
ceiling) — the L2 gate-vs-actuator split is the stream's defining invariant. 3 schema gaps proposed to
FE (#1579: rollback artifact, `change_freeze`, standard-change catalog).

**Count: 11 Operating Procedures** (OP-06-01 … OP-06-11).
