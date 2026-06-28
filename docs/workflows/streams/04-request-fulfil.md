# Stream 04 — Request → Fulfil

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-NNNN](../../decision-records/ADR-NNNN-operating-procedure-catalog.md). Terms
> **Operating Procedure** / **Procedure Step** are defined in [`CONTEXT.md`](../../../CONTEXT.md).
>
> **D9 global principles apply to every procedure below** (encoded in each Human-in-loop field,
> not restated per entry): **P1** Nova-native human co-working (every flow co-works with a human
> through Nova) · **P2** each sub-agent's reasoning is ascribed back to the paired human, up the
> chain · **P3** an "easy button" at every human gate (prep to the goal, hand the human a one-click
> resolution) · **P4** urgent → dedicated chat, else → tag the team member in the shared Teams chat.

**Owner agents:** **Felix** (Service desk — triage · read-only diagnosis · gated remediation ·
close — the wedge, L1 default) · **Scout** (Dispatch — Autotask-native, thin, onsite/field, rare;
reports to Dexter, L3) · **Osiris** (Identity & Access / JML — joiner-mover-leaver; reports to
Roman, L3). **Stream scope:** human/ticket-**REQUEST**-driven work (event/alert-driven = Stream 05).
**Anchor:** `icm/domains/service/triage/` (5-stage BUILT workflow, #1067) = OP-04-02; everything
else is sized against it (D3).

**Seams (split per owner hand-off, linked by explicit hand-off steps):** Felix→Scout (onsite) ·
Felix→Osiris (identity symptom — Felix's no-fly zone) · Felix→Pierce (delivery/PM task — Stream 03)
· Felix→Sage/Ozzie (problem/NOC — Stream 05) · Felix→Celeste (relationship handoff) · Holly→Osiris
(HR lifecycle drives JML — Stream 10 seam).

**Felix's hard rule:** never troubleshoot blind on identity / backups / domain-controllers — those
are **escalate-only** (categorical, dial-proof); Felix holds NO grant for them at any level.

**v1 governance baseline (applies to every procedure):** every actuation is a ProposedAction through
the one gauntlet + pending-action cockpit (#263 BUILT/MERGED / #990 action-plane); **v1 =
human-approves-all** regardless of per-action ceiling. The per-action `auto_at_level` / `always_gate`
tags are the *capability ceiling*; the **production dial starts conservative (L1)** and rises per
earned autonomy (#250 dial→tier ceiling BUILT, inert until grants opened). v1 posture: all
autonomous actions WITHHELD → refuse@tool_grant.

**Dormancy flags:** **#119** trigger-sync (BE/PL deploy-dormant until function triggers synced) ·
**#389** Voyage embeddings TABLED (worker semantic recall dormant; v1 retrieval = pull-by-declaration
over okf_rooms) · **#991** event bus / **#998** inbox (cross-agent + wake substrate) · **#990**
action-plane/gauntlet · **#1036/#1034** always-gate data_class.

**Driving policy (every procedure):** `TBD (mark-blocker: company-policy-collection)` (D4, #1586).
Mapping to specific policy docs is a later pass.

**subject (every procedure):** both (`client | imperion` per D7.2 — every procedure also runs on
Imperion-itself as a dogfood client; runbooks written role-generically).

**Shared sub-procedures referenced, not duplicated (D3):** *resolve Client Mapping*
(entity_xref/account_domain) · *re-check grounding / optimistic concurrency on the ticket* · *post the
internal operational work-note* (`ticket.note`) · *emit a parked ProposedAction to the cockpit* ·
*re-assert consent on a client send* (ADR-0058). These are gauntlet/executor-owned Procedure Steps,
invoked by many procedures below.

---

## OP-04-01 · Intake & route service request
- **Owner / Stream:** Felix / 04. *(Routing substrate is Tier-2 Dispatch code, not a persona; Felix
  is the terminal owner of the routed unit.)*
- **Trigger:** `autotask.ticket.created` webhook → `agent_event` inbox row (#998 / mig 0164,
  idempotency_key UNIQUE) → Storage-Queue wake nudge (ADR-0111).
- **Terminal outcome:** one `agent_run` opened for the matched workflow, ticket stamped `dispatched`
  (or `ignored` if unmatched / `deferred`→`dead` on repeated failure).
- **Procedure Steps:**
  1. `[automation]` PL webhook writes the `agent_event` inbox row (id/routing-only payload, **no
     ticket body**) — PL emit half (PL#155, SHIPPED). **Hand-off:** inbox → BE dispatcher. **L2.**
  2. `[automation]` BE event-dispatcher (BE#296, SHIPPED) claims oldest pending `FOR UPDATE SKIP
     LOCKED` (rate-capped = back-pressure); maps `event_type → workflow` (v1 HARDCODE
     `autotask.ticket.created → service/triage`; `agent_subscription` fan-out deferred #999).
  3. `[automation]` `createIcmRun({workflowSlug:'triage', actingUserId:null})` — autonomous service
     identity, OPENS the run only (does NOT bypass gauntlet). Stamp `dispatched` + run_id.
     **Hand-off:** → OP-04-02.
  4. `[automation]` Unmatched → `ignored`; dispatch failure → `deferred` (retry) → `dead` at ceiling.
     Idempotent on redelivery.
- **Driving policy:** TBD (#1586).
- **Realization:** ICM dispatch substrate (code, not a workflow dir) — the inbox→dispatcher loop;
  front of every Service procedure.
- **Autonomy ceiling:** L2 (autonomous run-open = internal reversible write; no client/money/cred
  touch). No `always_gate` step — the routing binds nothing.
- **Human-in-loop:** none at L1+ for the *routing* (deterministic code); the work it routes TO carries
  the gates. **Mark / admin** owns the `event_type→workflow` map + kill-switch; recedes to zero as the
  map proves out.
- **Substrate deps:** #998 inbox (BUILT/prod-applied 0164) · #991/#997 transport (Storage-Queue
  notifier ratified) · **#119** (entire loop deploy-dormant; e2e proof gated). **subject:** both.
  **Maps to:** PL#155 / BE#296.

## OP-04-02 · Triage a service ticket 🔨 BUILT *(ANCHOR)*
- **Owner / Stream:** Felix / 04.
- **Trigger:** a routed `service/triage` run from OP-04-01 (one run per ticket).
- **Terminal outcome:** an internal exec-summary **work-note** to the ticket via `ticket.note`
  (operational tracer) **+** a parked next-step `ProposedAction` in the cockpit. Triaged, not yet
  remediated.
- **Procedure Steps** (the 5 BUILT stages, `tools:[pg.read, ticket.note]`):
  1. `[automation]` **research** — load ticket + resolve account + reporting contact + recent
     interactions → `dossier.md` (problem statement · affected asset · open questions). Reads
     `okf:ticket/account/contact/interaction`. **L0.**
  2. `[automation]` **asset-status** — snapshot affected `device`/`cloud_asset` status; flag anomalies
     (offline / stale patch / failed backup / stopped resource) → `asset-status.md`.
  3. `[automation]` **classify-path** — assign exactly one severity + category + one path
     (`endpoint|cloud|network|identity|other`); write the decision logic (signals weighed, runner-up
     rejected); set `escalate-only=true` if path=identity or symptom touches backups/DCs →
     `triage-decision.md`. **Hand-off (conditional):** escalate-only → OP-04-03.
  4. `[automation]` **troubleshoot** — run the path's **read-only** diagnostic step-set (v1: no
     remediation, no external command); form a leading root-cause hypothesis + confidence; flag a
     quick-fix masking a recurring root cause → `troubleshooting-log.md`. (escalate-only:
     `escalated — no steps run`.)
  5. `[hybrid]` **summary-handoff — CHECKPOINT.** Re-check ticket still-open/unchanged (optimistic
     concurrency; changed → park + re-ground). Compose internal-only exec-summary note.
     `[automation]` auto-write the `ticket.note` ONLY when ALL hold (operational class · note
     internal-only · stages 03/04 audits green); `[gui-step]` else parks. Emit recommended next action
     as a **parked** `ProposedAction`. **Hand-off:** → OP-04-04 / OP-04-08 / OP-04-09 / OP-04-03 /
     OP-04-06 per the proposal.
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/domains/service/triage/` — **live SoR** (D5); the human runbook is a generated
  projection of this workspace.
- **Autonomy ceiling:** L2 (only actuation = internal `ticket.note`). **always_gate:** the next-step
  `ProposedAction` ALWAYS parks in v1; any client-facing/financial/remediating follow-on is dial-proof
  gated.
- **Human-in-loop:** technician (Derek/Brandon/Luke) + Mark (admin/dial), paired role = approving
  Service technician. At L1 human approves note + every proposal; climbing the dial, the internal note
  self-approves (narrow `auto_may_self_approve` = operational note only); the **next-step proposal
  stays human at every level** (always_gate floor). v1 testing → Mark proxies the technician.
- **Substrate deps:** #263 gauntlet (BUILT) · #119 (e2e demo gated) · #389 (TABLED → no semantic
  recall; reads by pull-by-declaration over its 6 okf_rooms). **subject:** both. **Maps to:** #1067.

## OP-04-03 · Escalate a high-risk symptom (identity / backup / domain-controller)
- **Owner / Stream:** Felix / 04. *(Felix's hard guardrail: escalate, don't guess — blast radius too
  large for unattended steps.)*
- **Trigger:** stage-03 classify-path sets `escalate-only=true` (path=identity, or symptom touches
  backups / domain controllers).
- **Terminal outcome:** an **escalation ProposedAction** parked in the cockpit + routed to the correct
  owner (Osiris for identity/JML · Phoenix/BCDR for backups · a senior human for DCs) — **never** a
  troubleshooting step run blind.
- **Procedure Steps:**
  1. `[automation]` On `escalate-only`, **skip** the diagnostic step-set (record `escalated — no steps
     run`). **L0.**
  2. `[automation]` Compose the escalation summary: what is known, symptom class, why escalate-only.
  3. `[hybrid]` Emit the escalation as a parked `ProposedAction` into the handoff; **route** to owner.
     **Hand-off:** identity → **Osiris** (OP-04-10/11/12); backups → **Phoenix/BCDR** (Stream 05); DC →
     senior human. Always parks for a human decision.
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only (rides inside the triage workspace as the escalate branch; no
  separate dir). Graduates to its own workspace if a remediation-side identity/backup workflow is built.
- **Autonomy ceiling:** L1 (propose-only). **always_gate:** identity/backup/DC actions are
  categorically escalate-only — Felix holds NO grant at any dial level.
- **Human-in-loop:** Mark (CISO, identity/security) + the receiving owner-agent's paired human. Never
  recedes — permanent hard-stop floor (dial-proof).
- **Substrate deps:** #991 handoff/event bus (cross-agent routing) · #990 action-plane. **subject:**
  both.

## OP-04-04 · Governed remediation of a ticket (runbook execution)
- **Owner / Stream:** Felix / 04.
- **Trigger:** an approved remediation `ProposedAction`/sequence from OP-04-02 (a human green-lit the
  triage next-step), referencing an established runbook/Playbook.
- **Terminal outcome:** the remediation Sequence executed (or **parked/refused** at the gauntlet)
  against the affected asset; ticket moved toward resolved, evidence captured for OP-04-05.
- **Procedure Steps:**
  1. `[gui-step]` Human approves the Sequence at the cockpit (approve-once / run-all; most-restrictive
     step sets the bar — ADR-0081). **No prod patch/config/isolation without this gate or an
     established runbook reference** (Felix guardrail).
  2. `[automation]` Re-validate grounding fail-closed (ticket exists/open/unchanged; optimistic
     concurrency) before any actuation.
  3. `[automation]` Run the Sequence in `plan_seq` order through the **gauntlet** (#285) → governed
     runbook action (#1077 / #990). A failed step **HALTS** the rest (no auto-rollback; mark
     failed-at-N; surface).
  4. `[automation]` Capture per-step execution evidence. **Hand-off:** → OP-04-05.
  5. `[automation]` Anything touching identity / backups / DCs **refuses/escalates** → **Hand-off**
     OP-04-03 (never remediated by Felix).
- **Driving policy:** TBD (#1586).
- **Realization:** ICM — planned `icm/domains/service/remediation/` (graduates from procedure-only once
  #1077 lands; today the triage proposal parks and a human acts). #1040 closed-loop epic.
- **Autonomy ceiling:** **L4 (reversible-auto behind an undo window) at the top of the dial — REVERSIBLE
  remediation classes only** (G3: L4 execute_notify is reversible-only). Irreversible classes park
  regardless of dial. **always_gate:** isolation/destructive/config-on-prod-without-runbook + all
  identity/backup/DC. v1: all autonomous actions WITHHELD → propose-then-human.
- **Human-in-loop:** technician (Derek/Brandon) approves; Mark on the dial + always-gate floor. Recedes
  L1→L4 as runbook track record earns autonomy on reversible classes; the human stays forever on
  irreversible/identity/destructive items.
- **Substrate deps:** #990 (BUILT) · #263 gauntlet/verifier (BUILT) · #1077 governed runbook execution
  (OPEN) · #119 · #250 (BUILT, inert until grants opened). **subject:** both.

## OP-04-05 · Verify-and-close a remediated ticket
- **Owner / Stream:** Felix / 04. *(Felix guardrail: no close without a verification signal — a
  symptom gone quiet is not a confirmed fix.)*
- **Trigger:** a remediation Sequence reports complete (OP-04-04), or a human marks work done.
- **Terminal outcome:** ticket **closed** with captured verification evidence — OR re-opened/parked if
  the verification signal is absent.
- **Procedure Steps:**
  1. `[automation]` Re-read the affected asset's *real current status* (device/cloud_asset) — confirm
     the anomaly that drove the ticket has cleared. **L0.**
  2. `[automation]` Capture the verification evidence (#1078); attach as the close justification.
  3. `[automation]` Flag if the fix masks a recurring root cause → emit a Problem-Mgmt hand-off.
     **Hand-off:** recurring root cause → **Sage (L3/Problem-Mgmt, Stream 05)**.
  4. `[hybrid]` Close ONLY on a present verification signal (the close write is an actuation through the
     executor); **no signal → park / re-open**, never close-on-quiet.
- **Driving policy:** TBD (#1586).
- **Realization:** ICM — planned `icm/domains/service/close/` (or a close stage of remediation); #1078.
  Procedure-only until built.
- **Autonomy ceiling:** L3 (close = low-risk reversible operational write once the verification signal
  is present, execute-then-notify). **always_gate:** none intrinsic, but close is **blocked by
  contract** absent a verification signal (a precondition, not a dial item).
- **Human-in-loop:** technician — at L1 approves the close; climbs to auto-close on a clean
  verification signal; the **"never close without verification" rule is dial-proof** (structural
  precondition). v1: human-confirmed close.
- **Substrate deps:** #1078 verification+evidence (OPEN) · #119. **subject:** both.

## OP-04-06 · Log ticket time & document the work — always-gate 💰
- **Owner / Stream:** Felix / 04. *(Distinct from Stream 09 weekly Timesheet attestation — this is the
  per-ticket Autotask TimeEntry the technician logs as they work.)*
- **Trigger:** remediation/diagnosis work completed (OP-04-04/05) and time must be attributed.
- **Terminal outcome:** an Autotask `TimeEntry` (Ticket Time Entry) drafted against the ticket —
  **always parked for a human** in v1.
- **Procedure Steps:**
  1. `[automation]` Compose the time entry draft (duration, work summary, billable hint from
     entitlement context — covered-vs-billable per #1306). **L0/L1.**
  2. `[gui-step]` **Always-gate:** human approves before `autotask_log_time` writes (action =
     `financial` data_class → dial-proof).
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only → the always-gated `autotask_log_time` action (Felix's two
  always-gated actions per felix.md). No separate workspace.
- **Autonomy ceiling:** **L1 propose-only — `autotask_log_time` is `financial` → ALWAYS-GATE.** Never
  Felix's call to post; he drafts, a human approves.
- **Human-in-loop:** technician / Nick (finance touch on billable). Dial-proof floor — never recedes
  (financial class).
- **Substrate deps:** #1306 service catalog & entitlements (grounds covered-vs-billable) · #119.
  **subject:** both.

## OP-04-07 · Post a client-facing reply on a ticket — always-gate
- **Owner / Stream:** Felix / 04.
- **Trigger:** a ticket needs a customer-facing update/answer (info request, resolution notice) —
  surfaced by triage or a human.
- **Terminal outcome:** a client-facing reply posted — **always parked for a human** in v1; sent only
  via the ADR-0058 approval-gated path with consent re-asserted.
- **Procedure Steps:**
  1. `[automation]` Draft the client-facing reply (channel-aware, internal-note context stripped).
     **L0/L1.**
  2. `[gui-step]` **Always-gate:** human approves; `[automation]` send via ADR-0058 path (consent
     re-asserted at execution). Felix holds NO autonomous send grant.
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only → the always-gated `autotask_post_reply` action (`client_pii` +
  customer-facing). No separate workspace.
- **Autonomy ceiling:** **L1 propose-only — `autotask_post_reply` is customer-facing + `client_pii` →
  ALWAYS-GATE.**
- **Human-in-loop:** technician approves every client send. Dial-proof floor (customer-facing) — never
  recedes.
- **Substrate deps:** ADR-0058 send path · #119. **subject:** both. **NOTE — possible OVERLAP w/
  Stream 03 (Pierce, PM-layer client comms):** a delivery-task client update may route through Pierce's
  PM layer; the technical-layer reply here combines **most-restrictively** with Pierce's (#1431).
  Flagged for assembly.

## OP-04-08 · SLA-aware ticket assignment (skill + load) — Felix↔Scout seam
- **Owner / Stream:** **Felix↔Scout seam.** The *queue self-assignment* (Felix self-assigning within
  limits, #1073) is Felix; the *dispatch/technician-match* substrate (#1071 technician+skill model) is
  Scout's dispatch tier. **Provisional single owner = Felix** (self-assign of the working agent), Scout
  owning the onsite carve-out (OP-04-09). **Flag for Mark: confirm the assign-vs-dispatch ownership
  line.**
- **Trigger:** a triaged ticket needs an owner (from OP-04-02), or an unassigned ticket crosses an
  SLA-risk threshold.
- **Terminal outcome:** ticket assigned to the best-matched technician (human or agent) within
  skill + load + SLA-target limits.
- **Procedure Steps:**
  1. `[automation]` Read the technician + skill model (#1071) and current load/capacity (#1072). **L0.**
  2. `[automation]` Match ticket category/path (from triage) → required skill → available technician
     under SLA target (#1073, builds on #320 routing).
  3. `[hybrid]` Assign within limits (internal reversible write); `[gui-step]` out-of-limits /
     SLA-breach-risk parks for a human dispatcher. **Hand-off:** onsite required → **Scout**
     (OP-04-09).
- **Driving policy:** TBD (#1586).
- **Realization:** ICM — planned `icm/domains/dispatch/`; #1073/#1071/#1072. Procedure-only until built.
- **Autonomy ceiling:** L2/L3 — internal scheduling/assignment auto (reversible); customer-facing
  schedule commitment gated (Scout's ceiling). **always_gate:** customer-facing commit.
- **Human-in-loop:** dispatcher (Derek) / Anna (PM capacity). Recedes to auto internal assignment as
  the skill/load model proves out; human stays on customer-facing commitments.
- **Substrate deps:** #1071 technician+skill model (OPEN) · #1072 capacity/calendar (OPEN) · #320
  service-desk routing · #119. **subject:** both.

## OP-04-09 · Dispatch an onsite / field visit
- **Owner / Stream:** **Scout** / 04 (Dispatch — Autotask-native, thin, rare).
- **Trigger:** a ticket flagged "needs onsite" (by Felix triage OP-04-02, or a human).
- **Terminal outcome:** an onsite visit scheduled in **Autotask native dispatch** with a
  customer-confirmed time slot (the confirm itself gated).
- **Procedure Steps:**
  1. `[automation]` Match a field tech by **skill + location + availability** in Autotask native
     dispatch. **L0.**
  2. `[automation]` Propose a schedule slot (internal scheduling auto).
  3. `[gui-step]` **Customer-confirm gated** — the customer-facing commitment (the onsite time) parks
     for a human/customer confirm. **Hand-off:** back to Felix for the working ticket once attended.
- **Driving policy:** TBD (#1586).
- **Realization:** ICM — planned `icm/domains/dispatch/dispatch-assign/` (#1554, tracer). Thin; leans on
  Autotask. Procedure-only until built.
- **Autonomy ceiling:** **L3** (internal scheduling auto; customer-facing commit gated — Scout's
  confirmed ceiling). **always_gate:** the customer-facing schedule commitment.
- **Human-in-loop:** dispatcher / the customer. Recedes to auto internal match+propose; the
  customer-facing confirm stays gated at every level.
- **Substrate deps:** Autotask native dispatch API · #1071 technician model · #991 handoff · #119.
  **subject:** both.

## OP-04-10 · Joiner — provision identity, license & least-privilege access
- **Owner / Stream:** **Osiris** / 04 (Identity & Access / JML — reports to Roman). *(Lifts identity out
  of Felix's escalate-only no-fly zone.)*
- **Trigger:** an HR lifecycle "joiner" event from **Holly (HR, Stream 10)**, or an access-request
  ticket. **Hand-off (inbound):** Holly → Osiris.
- **Terminal outcome:** a new identity provisioned with the role's **least-privilege** grants +
  licenses — **all grants/elevation parked** (gated) in v1.
- **Procedure Steps:**
  1. `[automation]` Resolve the joiner's role profile → least-privilege grant set + license requirement
     (catalog-anchored where applicable). **L0.**
  2. `[automation]` Draft the provisioning Sequence (create identity, assign license via Pax8/M365,
     grant least-priv access).
  3. `[gui-step]` **Always-gate:** grants / elevation / break-glass park for a human approve.
     `[automation]` on approval, run the provisioning Sequence under the JML runbook. **Hand-off:** →
     requesting manager + Holly (confirmation).
- **Driving policy:** TBD (#1586).
- **Realization:** ICM — planned `icm/domains/identity/joiner-mover-leaver/` (#1562, tracer covers all
  three of OP-04-10/11/12). Procedure-only until built.
- **Autonomy ceiling:** **L3** — but joiner **grants are gated** (least-priv provisioning is
  propose-then-approve). **always_gate:** grants / elevation / break-glass (all access-granting steps).
- **Human-in-loop:** Mark (CISO/Roman) + requesting manager. Grants never recede below human-approve
  (security floor); license/identity-shell creation may auto under runbook.
- **Substrate deps:** M365/Entra provisioning · Pax8 license (#1042 loop) · #991 HR-event bus from
  Holly · #119 · entitlement catalog #1306. **subject:** both. **(Imperion dogfood: onboarding a new
  Imperion hire runs the same JML.)**

## OP-04-11 · Mover — role / access change
- **Owner / Stream:** **Osiris** / 04.
- **Trigger:** an HR "mover" event (role change) from Holly, an access-review cadence, or a change
  ticket.
- **Terminal outcome:** access adjusted to the **new** role's least-privilege set — additions gated,
  removals applied; net result is least-privilege-correct.
- **Procedure Steps:**
  1. `[automation]` Diff current grants vs the new role's least-privilege profile (additions +
     removals). **L0.**
  2. `[gui-step]` **Always-gate** the additions (new grants/elevation park for approve).
  3. `[automation]` Apply removals (revoking excess access is reversible-low-risk; least-privilege
     bias). **Hand-off:** confirmation → Holly + manager.
- **Driving policy:** TBD (#1586).
- **Realization:** ICM — `icm/domains/identity/joiner-mover-leaver/` (#1562). Procedure-only until built.
- **Autonomy ceiling:** **L3** — removals/right-sizing auto under runbook; **always_gate:** any new
  grant / elevation.
- **Human-in-loop:** Mark (CISO) + manager. Grant-additions never recede (security floor); removals
  climb to auto.
- **Substrate deps:** as OP-04-10 · access-review cadence. **subject:** both.

## OP-04-12 · Leaver — deprovision identity & revoke access
- **Owner / Stream:** **Osiris** / 04.
- **Trigger:** an HR "leaver" event from Holly (verified termination), or a review-cadence
  orphan-account finding.
- **Terminal outcome:** the leaver's identity & access fully **revoked/deprovisioned**, licenses
  reclaimed — the auto-eligible end of the JML spectrum.
- **Procedure Steps:**
  1. `[automation]` Verify the leaver event (verified-termination signal from Holly's HR lifecycle —
     the precondition for auto). **L0.**
  2. `[automation]` Run the deprovision Sequence under the JML runbook: disable identity, revoke
     sessions/grants, reclaim licenses, handle data-handoff per policy.
  3. `[automation]` Capture evidence; **Hand-off:** orphan/anomaly or break-glass account → **escalate
     to Roman/Mark**; license reclaim → Vance (shelfware, Stream 07).
- **Driving policy:** TBD (#1586).
- **Realization:** ICM — `icm/domains/identity/joiner-mover-leaver/` (#1562). Procedure-only until built.
- **Autonomy ceiling:** **L3 — verified-leaver deprovision auto under the JML runbook** (the one
  auto-eligible JML path, on a verified-termination precondition). **always_gate:** break-glass /
  elevation accounts; any deprovision NOT backed by a verified-termination signal parks.
- **Human-in-loop:** Mark (CISO) + Holly. Recedes to auto on a verified-termination signal; un-verified
  or break-glass cases stay human (dial-proof floor).
- **Substrate deps:** M365/Entra deprovision · #991 HR-event bus · Pax8 license reclaim (#1042) · #119.
  **subject:** both. **(Imperion dogfood: offboarding an Imperion contributor runs the same flow.)**

---

## Provable-coverage note

Request→Fulfil surface covered end-to-end across three owners: intake/route (01), triage (02 — the
sole BUILT workflow + the 01 dispatch substrate, deploy-dormant on #119), the escalate guardrail (03),
remediate→verify→close (04/05), the two always-gated client/financial touches (06 financial, 07
client-facing), assignment at the Felix↔Scout seam (08), Scout's onsite dispatch (09), and Osiris's
full JML spectrum (10 joiner / 11 mover / 12 leaver). Everything except OP-04-02 is procedure-only /
planned ICM, mostly **dormant** pending #119, #1077/#1078 (remediation/verify), #1071/#1072 (dispatch
model), #1562 (JML), #389 (worker recall TABLED). Open lines flagged for Mark: OP-04-08 assign-vs-
dispatch ownership; an ITIL Incident-vs-Request-Fulfilment split (path=`other` is doing a lot of work);
the Stream 04↔05 boundary on shared remediation/verify sub-procedures (request-driven here vs
event/alert-driven Stream 05); OP-04-07 vs Pierce dedup; and the auto-leaver precondition. The wedge's
hard floors are dial-proof: identity/backup/DC escalate-only (03), financial log-time (06),
client-facing reply (07), and every JML grant (10/11).

**Count: 12 Operating Procedures** (Felix 7: OP-04-01..07; Felix/Scout seam 1: OP-04-08; Scout 1:
OP-04-09; Osiris 3: OP-04-10..12).
