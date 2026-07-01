# Stream 04 — Request → Fulfil

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

**Owner agents:** **Felix** (Service desk — triage · read-only diagnosis · gated remediation ·
close — the wedge, L1 default) · **Scout** (Dispatch — Autotask-native, thin, onsite/field, rare;
reports to Dexter, L3) · **Osiris** (Identity & Access / JML — joiner-mover-leaver; reports to
Roman, L3). **Stream scope:** human/ticket-**REQUEST**-driven work (event/alert-driven = Stream 05).
**Anchor:** `icm/domains/service/triage/` (5-stage BUILT workflow, #1067) = OP-04-02; everything
else is sized against it (D3).

**Core design rule (Osiris is the doctrine B5 JML SHOWCASE; Felix is escalate-not-guess).** This
stream carries the canonical instantiation of doctrine **B5 (Joiner-Mover-Leaver on disable ≠
delete)**: Osiris **auto-disables + session/token-revokes a Leaver at L4** (disabling is externally
reversible → fast termination containment without a gate, A10 row 2) while **delete / deprovision /
license-removal stays `always_gate`** as the human-approved cleanup (irreversible — A10 row 4), and a
**Joiner's grants gate** (privilege grant is class-3, over-grant prevention > speed). Felix is the
B1-triage wedge whose **identity/backup/DC symptoms PARK** (the B1 escalate carve-out) — he holds the
*service clock*, never the *identity act* (A11): they meet at an explicit seam (OP-04-03 → Osiris).

**Seams (every cross-agent hand-off is an explicit Procedure Step, A11):** Felix→Scout (onsite,
OP-04-09) · Felix→Osiris (identity symptom — Felix's no-fly zone, OP-04-03) · Felix→Pierce
(delivery/PM task — Stream 03) · Felix→Sage/Ozzie (problem/NOC — Stream 05) · Felix→Celeste
(relationship + client-comms handoff) · Holly→Osiris (HR lifecycle drives JML — Stream 10 seam,
OP-04-10/11/12).

**Felix's hard rule:** never troubleshoot blind on identity / backups / domain-controllers — those
are **escalate-only** (categorical, dial-proof; the B1 high-risk-symptom carve-out); Felix holds NO
grant for them at any level.

**v1 governance baseline (applies to every procedure).** Per doctrine **A3 (ship-dial = L0)** every
procedure is built capability-complete to its agent's ceiling but its **dial ships at L0
(observe-only)**; autonomy is earned per-workflow upward, admin-only, audited, reversible. Every
actuation is a ProposedAction through the one gauntlet + pending-action cockpit (#263 BUILT/MERGED /
#990 action-plane); the per-action `auto_at_level` / `always_gate` tags are the *capability ceiling*
(A2 + A10-derived), the dial only ever raises the floor between L0 and that ceiling and **never**
touches an `always_gate` step. v1 posture: all autonomous actions WITHHELD → refuse@tool_grant.

**Archetype map (B-templates this stream instantiates).**

| Procedure | Archetype |
|---|---|
| OP-04-01 intake & route | **B1 triage/route** (routing substrate) |
| OP-04-02 triage 🔨BUILT *(anchor)* | **B1 triage/route** |
| OP-04-03 escalate high-risk symptom | **B1** escalate carve-out (parks → Osiris/Phoenix) |
| OP-04-04 governed remediation | **B2 gated-actuation** |
| OP-04-05 verify & close | **B4 audit-attest** (verify + read-back, A9c) |
| OP-04-06 log ticket time 💰 | **B6 money-gate** (always-gate, financial) |
| OP-04-07 client-facing reply | **B7 client-facing-send** (always-gate) |
| OP-04-08 SLA-aware assignment | **B1 triage/route** (Felix↔Scout seam) |
| OP-04-09 dispatch onsite | **B1 triage/route** (Scout, customer-confirm gated) |
| OP-04-10 Joiner | **B5 JML** (grants gate) |
| OP-04-11 Mover | **B5 JML** (additions gate, removals auto) |
| OP-04-12 Leaver | **B5 JML** (disable@L4 ≠ delete always-gate) |
| OP-04-13 hardware/RMA/warranty + procurement logistics | **B2 gated-actuation** (Vance money-seam + Scout staging) |
| OP-04-14 carrier/circuit/telco lifecycle | **B9 deadline-sentinel** + **B2 gated-actuation** (Vance seam + Ozzie act) |
| OP-04-15 field-service capacity planning | **B3 synthesis-brief** (Scout, launchpad) |

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
- **Owner / Stream:** Felix / 04. **Archetype:** B1 triage/route (the routing substrate). *(Routing
  substrate is Tier-2 Dispatch code, not a persona; Felix is the terminal owner of the routed unit.)*
- **Trigger:** `autotask.ticket.created` webhook → `agent_event` inbox row (#998 / mig 0164,
  idempotency_key UNIQUE) → Storage-Queue wake nudge (ADR-0111).
- **Terminal outcome:** one `agent_run` opened for the matched workflow, ticket stamped `dispatched`
  (or `ignored` if unmatched / `deferred`→`dead` on repeated failure).
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition → log):
  1. `[automation]` **Ground** — PL webhook writes the `agent_event` inbox row (id/routing-only
     payload, **no ticket body**), **citing the source webhook + as-of** (A5); unparseable/empty →
     park (never fabricate a route) — PL emit half (PL#155, SHIPPED). **Hand-off:** inbox → BE
     dispatcher. **L2.**
  2. `[automation]` **Classify** — BE event-dispatcher (BE#296, SHIPPED) claims oldest pending `FOR
     UPDATE SKIP LOCKED` (rate-capped = back-pressure); maps `event_type → workflow` (v1 HARDCODE
     `autotask.ticket.created → service/triage`; `agent_subscription` fan-out deferred #999).
  3. `[automation]` **Resolve-owner + disposition** — `createIcmRun({workflowSlug:'triage',
     actingUserId:null})` — autonomous service identity, OPENS the run only (does NOT bypass
     gauntlet). Stamp `dispatched` + run_id. **Hand-off:** → OP-04-02.
  4. `[automation]` **Log** — Unmatched → `ignored`; dispatch failure → `deferred` (retry) → `dead`
     at ceiling. Idempotent on redelivery (A9b: replay = no-op + audit note via idempotency_key).
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586).
- **Realization:** ICM dispatch substrate (code, not a workflow dir) — the inbox→dispatcher loop;
  front of every Service procedure.
- **Autonomy ceiling:** **L2** (autonomous run-open = internally reversible write, A10 row 1; no
  client/money/cred touch). No `always_gate` step — the routing binds nothing (B1: mechanical routing
  auto-executes at L2).
- **Human-in-loop:** none at L1+ for the *routing* (deterministic code); the work it routes TO carries
  the gates. **Mark / admin** owns the `event_type→workflow` map + kill-switch; recedes to zero as the
  map proves out. Dial ships L0 (A3).
- **Substrate deps:** #998 inbox (BUILT/prod-applied 0164) · #991/#997 transport (Storage-Queue
  notifier ratified) · **#119** (entire loop deploy-dormant; e2e proof gated). **subject:** both.
  **Maps to:** PL#155 / BE#296.

## OP-04-02 · Triage a service ticket 🔨 BUILT *(ANCHOR)*
- **Owner / Stream:** Felix / 04. **Archetype:** B1 triage/route.
- **Trigger:** a routed `service/triage` run from OP-04-01 (one run per ticket).
- **Terminal outcome:** an internal exec-summary **work-note** to the ticket via `ticket.note`
  (operational tracer) **+** a parked next-step `ProposedAction` in the cockpit. Triaged, not yet
  remediated.
- **Procedure Steps** (the 5 BUILT stages, `tools:[pg.read, ticket.note]`):
  1. `[automation]` **research (Ground)** — load ticket + resolve account + reporting contact + recent
     interactions → `dossier.md` (problem statement · affected asset · open questions), **citing each
     `okf:ticket/account/contact/interaction` row + as-of** (A5); empty retrieval → park, never
     fabricate. **L0.**
  2. `[automation]` **asset-status (Ground)** — snapshot affected `device`/`cloud_asset` status; flag
     anomalies (offline / stale patch / failed backup / stopped resource) → `asset-status.md`, cited.
  3. `[automation]` **classify-path (Classify)** — assign exactly one severity + category + one path
     (`endpoint|cloud|network|identity|other`); write the decision logic (signals weighed, runner-up
     rejected); set `escalate-only=true` if path=identity or symptom touches backups/DCs →
     `triage-decision.md` (B1 high-risk-symptom carve-out). **Hand-off (conditional):** escalate-only
     → OP-04-03. Pool-correlate similar prior tickets **internally only** (A7).
  4. `[automation]` **troubleshoot (Disposition)** — run the path's **read-only** diagnostic step-set
     (v1: no remediation, no external command); form a leading root-cause hypothesis + confidence;
     flag a quick-fix masking a recurring root cause → `troubleshooting-log.md`. (escalate-only:
     `escalated — no steps run`.)
  5. `[hybrid]` **summary-handoff (Log) — CHECKPOINT.** Re-check ticket still-open/unchanged (optimistic
     concurrency; changed → park + re-ground, A5). Compose internal-only exec-summary note, reasoning
     attributed up-chain (P2). `[automation]` auto-write the `ticket.note` ONLY when ALL hold
     (operational class · note internal-only · stages 03/04 audits green); `[gui-step]` else parks.
     Emit recommended next action as a **parked** `ProposedAction`. **Hand-off:** → OP-04-04 /
     OP-04-08 / OP-04-09 / OP-04-03 / OP-04-06 per the proposal.
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586).
- **Realization:** `icm/domains/service/triage/` — **live SoR** (D5); the human runbook is a generated
  projection of this workspace (the one uniform dual-audience document, A8).
- **Autonomy ceiling:** **L2** (only actuation = internal `ticket.note` = internally reversible, A10
  row 1; B1 routing auto-executes at L2). **`always_gate` (inherited A2 + delta):** the next-step
  `ProposedAction` ALWAYS parks in v1; any client-facing/financial/remediating follow-on is dial-proof
  gated.
- **Human-in-loop:** technician (Derek/Brandon/Luke) + Mark (admin/dial), paired role = approving
  Service technician. At L1 human approves note + every proposal; climbing the dial, the internal note
  self-approves (narrow `auto_may_self_approve` = operational note only); the **next-step proposal
  stays human at every level** (always_gate floor). v1 testing → Mark proxies the technician.
- **Substrate deps:** #263 gauntlet (BUILT) · #119 (e2e demo gated) · #389 (TABLED → no semantic
  recall; reads by pull-by-declaration over its 6 okf_rooms). **subject:** both. **Maps to:** #1067.

## OP-04-03 · Escalate a high-risk symptom (identity / backup / domain-controller)
- **Owner / Stream:** Felix / 04. **Archetype:** B1 escalate carve-out (the high-risk-symptom escape
  that *parks regardless of dial*). *(Felix's hard guardrail: escalate, don't guess — blast radius too
  large for unattended steps.)* This is the canonical **A11 seam**: Felix owns the *service clock*,
  the *identity/backup/DC act* belongs to Osiris/Phoenix — they meet here, never co-own.
- **Trigger:** stage-03 classify-path sets `escalate-only=true` (path=identity, or symptom touches
  backups / domain controllers).
- **Terminal outcome:** an **escalation ProposedAction** parked in the cockpit + routed to the correct
  owner (Osiris for identity/JML · Phoenix/BCDR for backups · a senior human for DCs) — **never** a
  troubleshooting step run blind.
- **Procedure Steps:**
  1. `[automation]` On `escalate-only`, **skip** the diagnostic step-set (record `escalated — no steps
     run`). **L0.**
  2. `[automation]` Compose the escalation summary: what is known (each fact cited + as-of, A5),
     symptom class, why escalate-only; reasoning attributed up-chain (P2).
  3. `[hybrid]` Emit the escalation as a parked `ProposedAction` into the handoff; **route** to owner
     (urgency computed per A6 — a high-risk symptom blocking a clock → dedicated chat, else Teams tag).
     **Hand-off (SEAM, A11):** identity → **Osiris** (OP-04-10/11/12); backups → **Phoenix/BCDR**
     (Stream 05); DC → senior human. Always parks for a human decision.
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586).
- **Realization:** procedure-only (rides inside the triage workspace as the escalate branch; no
  separate dir). Graduates to its own workspace if a remediation-side identity/backup workflow is built.
- **Autonomy ceiling:** **L1 (propose-only).** **`always_gate`:** identity/backup/DC actions are
  categorically escalate-only — Felix holds NO grant at any dial level (A10 row 4 "no clean undo ⇒
  gated" applied categorically to the symptom class; the parking is dial-proof).
- **Human-in-loop:** Mark (CISO, identity/security) + the receiving owner-agent's paired human. Never
  recedes — permanent hard-stop floor (dial-proof).
- **Substrate deps:** #991 handoff/event bus (cross-agent routing) · #990 action-plane. **subject:**
  both.

## OP-04-04 · Governed remediation of a ticket (runbook execution)
- **Owner / Stream:** Felix / 04. **Archetype:** B2 gated-actuation.
- **Trigger:** an approved remediation `ProposedAction`/sequence from OP-04-02 (a human green-lit the
  triage next-step), referencing an established runbook/Playbook.
- **Terminal outcome:** the remediation Sequence executed (or **parked/refused** at the gauntlet)
  against the affected asset; ticket moved toward resolved, evidence captured for OP-04-05.
- **Procedure Steps** (B2: ground → plan → GATE → actuate → reconcile → log):
  1. `[gui-step]` **GATE = the 4-part easy-button (A4):** human approves the Sequence at the cockpit —
     (1) the **complete drafted plan** (the remediation Sequence); (2) the **grounded why** (affected
     asset + triage hypothesis, cited + as-of, A5); (3) **one-click** approve-once/run-all **+ its
     inverse** where the class is reversible (ADR-0081); (4) the **consequence preview** (what runs, on
     which asset, irreversibility flags). Most-restrictive step sets the bar. **No prod
     patch/config/isolation without this gate or an established runbook reference** (Felix guardrail).
  2. `[automation]` **Re-ground (A5)** — re-validate fail-closed (ticket exists/open/unchanged;
     optimistic concurrency) before any actuation; drifted → re-park.
  3. `[automation]` **Actuate** — run the Sequence in `plan_seq` order through the **gauntlet** (#285)
     → governed runbook action (#1077 / #990), each step **idempotency-keyed** (replay = no-op + audit
     note, A9b). A failed step **HALTS** the rest (no auto-rollback — A10; mark failed-at-N; surface
     completed-vs-pending). On one re-approval, **re-run the whole bundle from the top** — completed
     steps no-op via their key (B2 resume contract).
  4. `[automation]` **Reconcile + log** — capture per-step execution evidence. **Hand-off:** →
     OP-04-05.
  5. `[automation]` Anything touching identity / backups / DCs **refuses/escalates** → **Hand-off**
     OP-04-03 (never remediated by Felix; A11 seam).
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586).
- **Realization:** ICM — planned `icm/domains/service/remediation/` (graduates from procedure-only once
  #1077 lands; today the triage proposal parks and a human acts). #1040 closed-loop epic.
- **Autonomy ceiling:** **L4 (externally reversible, clean undo behind an undo window) — REVERSIBLE
  remediation classes only** (A10 row 2: declare undo + undo window; G3: L4 execute_notify is
  reversible-only). Irreversible classes park regardless of dial (A10 row 4). **`always_gate`:**
  isolation/destructive/config-on-prod-without-runbook (A2 class-4) + all identity/backup/DC. v1: all
  autonomous actions WITHHELD → propose-then-human.
- **Human-in-loop:** technician (Derek/Brandon) approves; Mark on the dial + always-gate floor. Recedes
  L1→L4 as runbook track record earns autonomy on reversible classes; the human stays forever on
  irreversible/identity/destructive items.
- **Substrate deps:** #990 (BUILT) · #263 gauntlet/verifier (BUILT) · #1077 governed runbook execution
  (OPEN) · #119 · #250 (BUILT, inert until grants opened). **subject:** both.

## OP-04-05 · Verify-and-close a remediated ticket
- **Owner / Stream:** Felix / 04. **Archetype:** B4 audit-attest (internal — verify + emit evidence,
  close-on-verification). *(Felix guardrail: no close without a verification signal — a symptom gone
  quiet is not a confirmed fix.)*
- **Trigger:** a remediation Sequence reports complete (OP-04-04), or a human marks work done.
- **Terminal outcome:** ticket **closed** with captured verification evidence — OR re-opened/parked if
  the verification signal is absent.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → route → sign-off):
  1. `[automation]` **Verify (read-back, A9c)** — re-read the affected asset's *real current status*
     (device/cloud_asset) — confirm the anomaly that drove the ticket has cleared, **cited + as-of**
     (close-on-verification, never close-on-signal). **L0.**
  2. `[automation]` **Collect-evidence** — capture the verification evidence (#1078); attach as the
     close justification.
  3. `[automation]` **Route-gaps** — flag if the fix masks a recurring root cause → emit a Problem-Mgmt
     hand-off. **Hand-off (SEAM, A11):** recurring root cause → **Sage (L3/Problem-Mgmt, Stream 05)**.
  4. `[hybrid]` **Sign-off** — close ONLY on a present verification signal (the close write is an
     actuation through the executor); **no signal → park / re-open**, never close-on-quiet.
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586).
- **Realization:** ICM — planned `icm/domains/service/close/` (or a close stage of remediation); #1078.
  Procedure-only until built.
- **Autonomy ceiling:** **L3** (close = low-risk externally-reversible operational write once the
  verification signal is present — A10 row 3 execute-then-notify; B4 internal measure auto-runs at L2,
  the close-write notifies). **`always_gate`:** none intrinsic, but close is **blocked by contract**
  absent a verification signal (a precondition, not a dial item).
- **Human-in-loop:** technician — at L1 approves the close; climbs to auto-close on a clean
  verification signal; the **"never close without verification" rule is dial-proof** (structural
  precondition). v1: human-confirmed close.
- **Substrate deps:** #1078 verification+evidence (OPEN) · #119. **subject:** both.

## OP-04-06 · Log ticket time & document the work — always-gate 💰
- **Owner / Stream:** Felix / 04. **Archetype:** B6 money-gate (financial-class write). *(Distinct from
  Stream 09 weekly Timesheet attestation — this is the per-ticket Autotask TimeEntry the technician logs
  as they work.)*
- **Trigger:** remediation/diagnosis work completed (OP-04-04/05) and time must be attributed.
- **Terminal outcome:** an Autotask `TimeEntry` (Ticket Time Entry) drafted against the ticket —
  **always parked for a human** in v1.
- **Procedure Steps** (B6: ground → compute → draft → MONEY GATE → actuate → log):
  1. `[automation]` **Ground + compute + draft** — compose the time entry draft (duration, work
     summary, billable hint from entitlement context — covered-vs-billable per #1306), **citing the
     entitlement source + as-of** (A5). **L0/L1.**
  2. `[gui-step]` **MONEY GATE — `always_gate` (A2 class-1, dial-proof, A4 easy-button):** human
     approves before `autotask_log_time` writes — present the exact billable $/duration, the SoR
     (Autotask, external, agent mirrors never owns — A9a), and the irreversibility flag.
  3. `[automation]` **Actuate idempotently** — `autotask_log_time` is **idempotency-keyed**
     (procedure + ticket + period; replay = no-op + audit note, never a double-log — A9b) and
     **reads back** the Autotask TimeEntry to confirm it landed before closing the step (A9c).
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586).
- **Realization:** procedure-only → the always-gated `autotask_log_time` action (Felix's two
  always-gated actions per felix.md). No separate workspace.
- **Autonomy ceiling:** **L1 propose-only — `autotask_log_time` is `financial` (money-out, A2 class-1) →
  ALWAYS-GATE forever** (A10 row 4: no clean undo on a posted billable entry). Never Felix's call to
  post; he drafts, a human approves.
- **Human-in-loop:** technician / Nick (finance touch on billable). Dial-proof floor — never recedes
  (financial class).
- **Substrate deps:** #1306 service catalog & entitlements (grounds covered-vs-billable) · #119.
  **subject:** both.

## OP-04-07 · Post a client-facing reply on a ticket — always-gate
- **Owner / Stream:** Felix / 04. **Archetype:** B7 client-facing-send.
- **Trigger:** a ticket needs a customer-facing update/answer (info request, resolution notice) —
  surfaced by triage or a human.
- **Terminal outcome:** a client-facing reply posted — **always parked for a human** in v1; sent only
  via the ADR-0058 approval-gated path with consent re-asserted.
- **Procedure Steps** (B7: ground → compose → SEND GATE → send → log):
  1. `[automation]` **Compose** — draft the client-facing reply (channel-aware, internal-note context
     stripped, **no fabricated capability/timeline/price**, opt-out/frequency respected — A5/B7); one
     client's specifics never bleed into another's (A7). **L0/L1.**
  2. `[gui-step]` **SEND GATE — `always_gate` (A2 class-2, A4 easy-button):** human approves;
     `[automation]` send via the ADR-0058 path **idempotency-keyed** (replay = no-op, never a
     double-send — A9b), consent re-asserted at execution. Felix holds NO autonomous send grant.
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586).
- **Realization:** procedure-only → the always-gated `autotask_post_reply` action (`client_pii` +
  customer-facing). No separate workspace.
- **Autonomy ceiling:** **L1 propose-only — `autotask_post_reply` is customer-facing + `client_pii` →
  ALWAYS-GATE** (A2 class-2; free-text/committal reply is outside the B7 transactional-ack carve-out).
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
  line.** **Archetype:** B1 triage/route (SLA-aware assignment). The SLA *clock* (Celeste, A11) is
  distinct from this assignment *act* — they meet at the SLA-risk threshold seam.
- **Trigger:** a triaged ticket needs an owner (from OP-04-02), or an unassigned ticket crosses an
  SLA-risk threshold.
- **Terminal outcome:** ticket assigned to the best-matched technician (human or agent) within
  skill + load + SLA-target limits.
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition → log):
  1. `[automation]` **Ground** — read the technician + skill model (#1071) and current load/capacity
     (#1072), **cited + as-of** (A5). **L0.**
  2. `[automation]` **Classify/match** — ticket category/path (from triage) → required skill →
     available technician under SLA target (#1073, builds on #320 routing). Pool-correlate load
     patterns internally only (A7).
  3. `[hybrid]` **Resolve-owner + disposition** — assign within limits (internally reversible write,
     B1 auto@L2); `[gui-step]` out-of-limits / SLA-breach-risk parks for a human dispatcher (urgency
     computed per A6 — SLA breach imminent → dedicated chat). **Hand-off:** onsite required →
     **Scout** (OP-04-09).
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586).
- **Realization:** ICM — planned `icm/domains/dispatch/`; #1073/#1071/#1072. Procedure-only until built.
- **Autonomy ceiling:** **L2/L3** — internal scheduling/assignment auto (internally reversible, A10
  row 1; B1 routing auto@L2); customer-facing schedule commitment gated (Scout's ceiling).
  **`always_gate`:** customer-facing commit (A2 class-2).
- **Human-in-loop:** dispatcher (Derek) / Anna (PM capacity). Recedes to auto internal assignment as
  the skill/load model proves out; human stays on customer-facing commitments.
- **Substrate deps:** #1071 technician+skill model (OPEN) · #1072 capacity/calendar (OPEN) · #320
  service-desk routing · #119. **subject:** both.

## OP-04-09 · Dispatch an onsite / field visit
- **Owner / Stream:** **Scout** / 04 (Dispatch — Autotask-native, thin, rare). **Archetype:** B1
  triage/route (onsite dispatch; the customer-confirm is the gated client-facing edge, B7).
- **Trigger:** a ticket flagged "needs onsite" (by Felix triage OP-04-02, or a human).
- **Terminal outcome:** an onsite visit scheduled in **Autotask native dispatch** with a
  customer-confirmed time slot (the confirm itself gated).
- **Procedure Steps** (B1: ground → match → disposition):
  1. `[automation]` **Ground/match** — match a field tech by **skill + location + availability** in
     Autotask native dispatch (external SoR — agent mirrors, never owns, A9a), **cited + as-of** (A5).
     **L0.**
  2. `[automation]` **Disposition** — propose a schedule slot (internal scheduling auto, B1 auto@L2).
  3. `[gui-step]` **Customer-confirm gated — `always_gate` (A2 class-2, A4 easy-button):** the
     customer-facing commitment (the onsite time) parks for a human/customer confirm; the Autotask
     write is idempotency-keyed + read-back (A9b/c). **Hand-off:** back to Felix for the working ticket
     once attended.
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586).
- **Realization:** ICM — planned `icm/domains/dispatch/dispatch-assign/` (#1554, tracer). Thin; leans on
  Autotask. Procedure-only until built.
- **Autonomy ceiling:** **L3** (internal scheduling externally-reversible auto — A10 row 3; the
  customer-facing commit gated — Scout's confirmed ceiling). **`always_gate`:** the customer-facing
  schedule commitment (A2 class-2).
- **Human-in-loop:** dispatcher / the customer. Recedes to auto internal match+propose; the
  customer-facing confirm stays gated at every level.
- **Substrate deps:** Autotask native dispatch API · #1071 technician model · #991 handoff · #119.
  **subject:** both.

## OP-04-10 · Joiner — provision identity, license & least-privilege access
- **Owner / Stream:** **Osiris** / 04 (Identity & Access / JML — reports to Roman). **Archetype:** B5
  JML (the Joiner — **grants gate**). *(Lifts identity out of Felix's escalate-only no-fly zone.)*
- **Trigger:** an HR lifecycle "joiner" event from **Holly (HR, Stream 10)**, or an access-request
  ticket. **Hand-off (inbound, SEAM A11):** Holly → Osiris.
- **Terminal outcome:** a new identity provisioned with the role's **least-privilege** grants +
  licenses — **all grants/elevation parked** (gated) in v1.
- **Procedure Steps** (B5: ground → compute-delta → plan → GATE → actuate → log):
  1. `[automation]` **Ground** — resolve the joiner's role profile → least-privilege grant set +
     license requirement (catalog-anchored where applicable), **citing the HR/M365 source + as-of**
     (A5). **L0.**
  2. `[automation]` **Compute-delta + plan** — draft the provisioning Sequence (create identity, assign
     license via Pax8/M365, grant least-priv access) vs the role template.
  3. `[gui-step]` **GATE (scoped) — `always_gate` (A2 class-3, A4 easy-button):** grants / elevation /
     break-glass park for a human approve (**B5: Joiner grants gate** — privilege grant is class-3,
     over-grant prevention > speed). `[automation]` on approval, run the provisioning Sequence under
     the JML runbook **idempotency-keyed + read-back** (A9b/c). **Hand-off:** → requesting manager +
     Holly (confirmation).
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586).
- **Realization:** ICM — planned `icm/domains/identity/joiner-mover-leaver/` (#1562, tracer covers all
  three of OP-04-10/11/12). Procedure-only until built.
- **Autonomy ceiling:** **L3** — but joiner **grants are gated** (least-priv provisioning is
  propose-then-approve). **`always_gate`:** grants / elevation / break-glass (all access-granting steps,
  A2 class-3 — A10 row 4: a privilege grant has no clean undo of exposure once made).
- **Human-in-loop:** Mark (CISO/Roman) + requesting manager. Grants never recede below human-approve
  (security floor); license/identity-shell creation may auto under runbook.
- **Substrate deps:** M365/Entra provisioning · Pax8 license (#1042 loop) · #991 HR-event bus from
  Holly · #119 · entitlement catalog #1306. **subject:** both. **(Imperion dogfood: onboarding a new
  Imperion hire runs the same JML.)**

## OP-04-11 · Mover — role / access change
- **Owner / Stream:** **Osiris** / 04. **Archetype:** B5 JML (the Mover = net delta of Joiner + Leaver
  — **additions gate, removals auto**).
- **Trigger:** an HR "mover" event (role change) from Holly, an access-review cadence, or a change
  ticket.
- **Terminal outcome:** access adjusted to the **new** role's least-privilege set — additions gated,
  removals applied; net result is least-privilege-correct.
- **Procedure Steps** (B5: ground → compute-delta → GATE (scoped) → actuate → log):
  1. `[automation]` **Ground + compute-delta** — diff current grants vs the new role's least-privilege
     profile (additions + removals), **citing the HR/M365 source + as-of** (A5). **L0.**
  2. `[gui-step]` **GATE (scoped) — `always_gate` the additions (A2 class-3):** new grants/elevation
     park for approve (B5: a grant is class-3, over-grant prevention > speed).
  3. `[automation]` **Actuate** — apply removals (revoking excess access is externally reversible —
     least-privilege bias; A10 row 2), **idempotency-keyed + read-back** (A9b/c). **Hand-off:**
     confirmation → Holly + manager.
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586).
- **Realization:** ICM — `icm/domains/identity/joiner-mover-leaver/` (#1562). Procedure-only until built.
- **Autonomy ceiling:** **L3** — removals/right-sizing auto under runbook (A10 row 2 reversible).
  **`always_gate`:** any new grant / elevation (A2 class-3).
- **Human-in-loop:** Mark (CISO) + manager. Grant-additions never recede (security floor); removals
  climb to auto.
- **Substrate deps:** as OP-04-10 · access-review cadence. **subject:** both.

## OP-04-12 · Leaver — deprovision identity & revoke access
- **Owner / Stream:** **Osiris** / 04. **Archetype:** B5 JML — **the doctrine SHOWCASE of the
  `disable ≠ delete` split** (A10-derived ceilings).
- **Trigger:** an HR "leaver" event from Holly (verified termination), or a review-cadence
  orphan-account finding.
- **Terminal outcome:** the leaver's identity & access fully **revoked/deprovisioned**, licenses
  reclaimed — the auto-eligible end of the JML spectrum.
- **Procedure Steps** (B5: ground → plan → split-actuate → GATE (cleanup) → log+notify):
  1. `[automation]` **Ground** — verify the leaver event (verified-termination signal from Holly's HR
     lifecycle — the precondition for auto, **cited + as-of**, A5). **L0.**
  2. `[automation]` **Auto-disable + revoke (reversible half, L4)** — disable identity, revoke
     sessions/tokens/grants **idempotency-keyed + read-back** (A9b/c). **B5: disabling is externally
     reversible → fast termination containment at L4 without a gate** (A10 row 2 — declare undo +
     window); this is the security advantage of acting fast.
  3. `[gui-step]` **GATE (cleanup) — `always_gate` (A2 class-3):** **delete / deprovision /
     license-removal (irreversible) is the human-approved cleanup** (B5 — A10 row 4: no clean undo on a
     deleted identity/reclaimed license); data-handoff per policy. `[automation]` license reclaim →
     Vance (shelfware, Stream 07).
  4. `[automation]` **Log + notify** — capture evidence; **Hand-off:** orphan/anomaly or break-glass
     account → **escalate to Roman/Mark** (A6 routing).
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586).
- **Realization:** ICM — `icm/domains/identity/joiner-mover-leaver/` (#1562). Procedure-only until built.
- **Autonomy ceiling:** **L4 disable+revoke / `always_gate` delete+deprovision** (the B5 split: the
  reversible containment half auto-acts behind an undo window — A10 row 2; the irreversible cleanup
  half is gated forever — A10 row 4). **`always_gate`:** delete/deprovision/license-removal · break-glass
  / elevation accounts · any disable NOT backed by a verified-termination signal parks.
- **Human-in-loop:** Mark (CISO) + Holly. The disable+revoke recedes to auto on a verified-termination
  signal; the delete/deprovision cleanup + un-verified/break-glass cases stay human (dial-proof floor).
- **Substrate deps:** M365/Entra deprovision · #991 HR-event bus · Pax8 license reclaim (#1042) · #119.
  **subject:** both. **(Imperion dogfood: offboarding an Imperion contributor runs the same flow.)**

## OP-04-13 · Manage hardware RMA / warranty + procurement logistics (drop-ship · staging · asset-tag)
- **Owner / Stream:** **Vance↔Scout seam** / 04. The *procurement / vendor-order / warranty-claim*
  half is **Vance** (asset & vendor owner, Stream 07 — the money/vendor clock, A11); the *physical
  receive → stage → asset-tag → onsite-install* fulfilment half is **Scout** (dispatch/field, this
  stream). **Provisional terminal owner = Scout** (the fulfilment unit lands here as a Request);
  **Felix** raises the failed-hardware ticket. **Archetype:** B2 gated-actuation (the procurement
  commit + the staging actuation). The vendor-order *commitment* (Vance, money) is distinct from the
  *logistics act* (Scout) — they meet at OP-04-13 step 3, never co-own (A11).
- **Trigger:** a hardware failure/RMA ticket (Felix triage OP-04-02 flags faulty/EOL device), a
  delivery-project procurement need (Pierce, Stream 03), or a refresh/expansion line (Celeste 08-I →
  Vance). **Hand-off (inbound, SEAM A11):** Felix / Pierce / Vance → Scout.
- **Terminal outcome:** the RMA/warranty claim or procurement order is placed (Vance-gated), the
  inbound hardware **received → staged → asset-tagged → linked to its `cmdb_ci`**, and (if onsite)
  dispatched for install — **the purchase/RMA commitment always parked for a human** in v1.
- **Procedure Steps** (B2: ground → plan → GATE → actuate → reconcile → log):
  1. `[automation]` **Ground** — resolve the affected asset/`cmdb_ci`, warranty/entitlement status, and
     vendor (Pax8 / distributor / OEM), **citing the asset record + warranty source + as-of** (A5);
     empty/expired-warranty → flag (never fabricate a coverage claim). **L0.**
  2. `[automation]` **Plan** — draft the RMA/warranty claim **or** the procurement order (drop-ship vs
     stock), the staging/asset-tag checklist, and the onsite-install need; pool-correlate prior
     same-model failures across the base internally only (A7 — RMA pattern signal). **L1/L2.**
  3. `[gui-step]` **GATE = the 4-part easy-button (A4) — `always_gate` (A2 class-1, money out):** the
     **vendor order / paid RMA commitment is Vance's money act** — present exact $ + vendor SoR
     (external, agent mirrors never owns, A9a) + irreversibility flag; the human approves before any
     spend. **SEAM → Vance** (Stream 07 procurement — the money clock is his, A11). A no-cost
     in-warranty RMA still parks the *vendor-facing claim send* (B7 class-2, vendor commitment).
  4. `[automation]` **Actuate the logistics half (Scout) idempotently** — on approval, the inbound
     hardware is received, staged, **asset-tagged and linked to `cmdb_ci`** (internal-reversible write,
     B2 auto@L2), each step **idempotency-keyed** (replay = no-op + audit note, A9b). A failed step
     **HALTS** the rest (no auto-rollback, A10); surface completed-vs-pending.
  5. `[automation]` **Reconcile (read-back, A9c)** — confirm the asset-tag/`cmdb_ci` link landed + the
     vendor order/RMA reference is recorded before close. **Hand-off:** onsite install → **Scout
     dispatch (OP-04-09)**; device live → Felix's working ticket; license/shelfware reconcile → **Vance
     (Stream 07)**.
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586) — Procurement /
  Hardware-RMA / Asset-Tagging.
- **Realization:** procedure-only — the logistics half rides Scout dispatch; the money half is Vance's
  Stream 07 procurement procedure (referenced, not duplicated, D3). No separate workspace until built.
- **Autonomy ceiling:** **Scout L2 (staging/asset-tag = internally reversible, A10 row 1).** **`always_gate`:**
  the **vendor order / paid RMA spend** (Vance, A2 class-1 — money out has no clean undo, A10 row 4) +
  any vendor-facing claim send (A2 class-2). Vance/HITL never recedes on the spend.
- **Human-in-loop:** Vance's human on the purchase/RMA money commitment (dial-proof floor); dispatcher
  (Derek) / Scout on the onsite. Staging/asset-tag climbs to auto; the spend stays human forever.
- **Substrate deps:** `cmdb_ci`/asset model (exists) · Pax8/distributor procurement (#1042 loop) · Vance
  Stream 07 procurement seam · #991 handoff · #119. **subject:** both. **(Imperion dogfood: Imperion's
  own hardware refresh/RMA runs the same flow.)** **(OWNERSHIP: clean — Vance owns the money/vendor
  clock, Scout owns the logistics act, A11; flag for Mark: confirm the procurement-vs-fulfilment line.)**

## OP-04-14 · Manage carrier / circuit / telco lifecycle (order · install · renew · cancel · port)
- **Owner / Stream:** **Vance↔Ozzie seam** / 04. The *carrier contract / order / renewal-cancel
  deadline* clock is **Vance** (vendor & deadline-sentinel owner, Stream 07 — A11); the *technical
  circuit turn-up / cutover / port act* is **Ozzie** (NOC/network, Stream 05). **Provisional terminal
  owner = Scout/Ozzie fulfilment** (the install/turn-up unit lands here). **Archetype:** B9
  deadline-sentinel (the contract-term/cancel-by clock) + B2 gated-actuation (the carrier order + the
  cutover act). The carrier *deadline* (Vance sentinel) vs the *cutover act* (Ozzie) meet at an
  explicit seam (A11), never co-own.
- **Trigger:** a new-circuit need (delivery/expansion), a carrier renewal/cancel-by date approaching
  (Vance's B9 sentinel fires T-30/T-7/T-1), a carrier price-hike/EOL signal, or a number-port request.
  **Hand-off (inbound, SEAM A11):** Vance deadline → Ozzie/Scout; Celeste 08-J vendor-eval → Vance.
- **Terminal outcome:** the carrier action completed — new circuit ordered + **turned up + cutover
  verified**, OR a renewal/cancel decision routed (never auto-committed), OR a number port executed —
  with the carrier-order spend + any cancel/port **always parked for a human**.
- **Procedure Steps** (B9 watch + B2 actuate: watch → detect → GATE(decision) → actuate(cutover) → reconcile):
  1. `[automation]` **Watch (B9, Vance)** — read the carrier contract term + cancel-by/renewal dates +
     circuit inventory, **citing each date + as-of** (A5); alert at policy lead times (T-30/T-7/T-1).
     **B9 rule: escalate-to-terminal, never auto-actuate** a renew/cancel under deadline pressure (a
     missed cancel-by is a *logged escalation failure*, surfaced in Vance's brief — A6/B9). **L0/L2.**
  2. `[automation]` **Detect + quantify** the action (order / renew / cancel / port) + $ / disruption
     risk; pool-correlate carrier reliability/price across the base internally only (A7). **L2.**
  3. `[gui-step]` **GATE = 4-part easy-button (A4):** the **carrier order / renewal / cancellation /
     port commitment is `always_gate`** — order/renew = money + binding (A2 class-1/6); cancel/port =
     service-disrupting + irreversible-once-ported (A2 class-2/4). **SEAM → Vance** (the contract money
     clock, A11) for the commit decision. Present exact $ + carrier SoR + the disruption/irreversibility
     flag. Routes to a human — never Vance's call to bind.
  4. `[automation]` **Actuate the technical half (Ozzie) idempotently** — on approval, the circuit
     turn-up / cutover / port executes through the NOC gauntlet (Stream 05), **idempotency-keyed** (A9b);
     a cutover is **service-affecting → halt-on-fail, no auto-rollback** (A10), completed-vs-pending
     surfaced. **SEAM → Ozzie (Stream 05)** — the cutover act is his, under his ceiling + `always_gate`.
  5. `[automation]` **Reconcile (read-back, A9c)** — confirm circuit live / port completed + the carrier
     order reference recorded before close. **Hand-off:** live circuit → `cmdb_ci` link (OP-04-13 path)
     + Felix working ticket; cost reconcile → Vance (Stream 07).
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586) — Carrier /
  Telco-Lifecycle / Circuit-Cutover / Number-Port.
- **Realization:** procedure-only — the deadline half is Vance's Stream 07 sentinel; the cutover half is
  Ozzie's Stream 05 act (both referenced, not duplicated, D3). No separate workspace until built.
- **Autonomy ceiling:** **L2 watch/detect (Vance) + Ozzie's cutover ceiling.** **`always_gate`:** the
  carrier order/renew/cancel/port commitment (A2 class-1/2/4/6 — money + binding + service-disrupting;
  no clean undo on a bound contract or completed port, A10 row 4); a **service-affecting cutover** is
  `always_gate` on Ozzie (A2 class-4). Dial-proof — a deadline never licenses an autonomous commit (B9).
- **Human-in-loop:** Vance's human on the carrier commit + Mark/Dexter on a service-affecting cutover.
  Watch/detect recedes to auto; the commit + cutover stay human (dial-proof floor).
- **Substrate deps:** carrier-contract / circuit-inventory model (**silver `carrier_contract` +
  `circuit`, #1651 / migration 0254 — authored, dormant until prod-applied**, A5c) · Vance B9
  sentinel (Stream 07) · Ozzie cutover (Stream 05) · #991 handoff · #119.
  **subject:** both. **(OWNERSHIP: clean — Vance owns the deadline/money clock, Ozzie owns the cutover
  act, A11; flag for Mark: carrier-contract silver model + the Stream 04↔05↔07 boundary.)**

## OP-04-15 · Plan field-service capacity at volume (Scout — un-thin)
- **Owner / Stream:** **Scout** / 04 (Dispatch — un-thinned to a planning role at volume). **Archetype:**
  B3 synthesis-brief (the capacity brief is a launchpad — a forecast gap pre-stages the owning
  hiring/scheduling/reassignment procedure parked; Scout synthesizes + recommends, never commits
  headcount/spend). The capacity *forecast/standard* (Scout) is distinct from the *staffing/commit act*
  (HR/Holly · dispatcher) — they meet at the launchpad seam (A11).
- **Trigger:** a planning cadence (weekly/monthly field-capacity review) OR a load signal — onsite
  backlog rising, SLA-at-risk dispatch queue (from OP-04-08/09), a seasonal/project surge (Pierce
  delivery pipeline), or a region/skill coverage gap.
- **Terminal outcome:** a field-service capacity brief — forecast demand vs available tech
  hours/skills/regions, surplus/shortfall flagged, each gap a one-click launchpad to its owning
  procedure (reassignment, overtime/contractor, hiring) — **advisory; Scout commits nothing.**
- **Procedure Steps** (B3: gather → synthesize → narrate → deliver → log):
  1. `[automation]` **Gather (cross-source, cite)** — read the technician + skill model (#1071), current
     load/capacity (#1072), the onsite/dispatch backlog (OP-04-09), and the inbound demand signal
     (Pierce delivery pipeline Stream 03, SLA-risk queue OP-04-08), **each source cited + as-of** (A5);
     empty/stale → say so, never present dormant capacity as live (A5c). **L0.**
  2. `[hybrid]` **Synthesize + narrate** — forecast demand vs capacity by skill/region/window; flag
     surplus/shortfall + SLA-coverage risk (signal vs inference labeled); pool-correlate seasonal/load
     patterns across the base internally only (A7); reasoning attributed up-chain (P2). **L2.**
  3. `[gui-step]` **Deliver (launchpad)** — the dispatcher/Dexter reviews; each shortfall **auto-spawns
     its owning worker procedure parked/draft** for one-click launch — internal reassignment (OP-04-08),
     overtime/contractor or **hiring → Holly (HR, Stream 10)**, or a refresh-of-equipment need → Vance.
     **`always_gate` (A2): any staffing/spend commitment** (hire, contractor, overtime budget) routes
     as a *recommendation* to a human — Scout never commits headcount or spend (B3 launchpad).
  4. `[automation]` **Log** — persist the capacity brief version (audited; attributed).
- **Driving policy:** inherits doctrine baseline (A2/A4/A5); specific drivers TBD (#1586) — Field-Capacity /
  Dispatch-SLA / Staffing-Threshold.
- **Realization:** ICM — planned `icm/domains/dispatch/capacity-planning/` (rides the dispatch domain,
  #1554). Procedure-only until the technician/capacity model (#1071/#1072) lands; dormant until then (A5c).
- **Autonomy ceiling:** **L2** (forecast + flag + pre-stage launchpad = reversible internal, A10 row 1;
  B3 no actuation). **`always_gate`:** any staffing/spend commitment the brief implies (hire = HR commit,
  contractor/overtime = money A2 class-1) — routed, never committed by Scout.
- **Human-in-loop:** dispatcher (Derek) / Dexter; Holly (HR) on any staffing commit. Forecast climbs to
  auto-draft; every commitment stays human (A3 floor).
- **Substrate deps:** #1071 technician+skill model (OPEN) · #1072 capacity/calendar (OPEN) · Pierce
  delivery-pipeline signal (Stream 03) · #991 handoff (Holly HR seam) · #389 (pattern recall, TABLED) ·
  #119. **subject:** both. **(OWNERSHIP: clean — Scout owns the capacity forecast/standard; the
  staffing/spend act is HR/dispatcher/Vance, A11.)**

---

## Provable-coverage note

Request→Fulfil surface covered end-to-end across three owners: intake/route (01), triage (02 — the
sole BUILT workflow + the 01 dispatch substrate, deploy-dormant on #119), the escalate guardrail (03),
remediate→verify→close (04/05), the two always-gated client/financial touches (06 financial, 07
client-facing), assignment at the Felix↔Scout seam (08), Scout's onsite dispatch (09), and Osiris's
full JML spectrum (10 joiner / 11 mover / 12 leaver). **Doctrine inheritance (ADR-0136):** every
procedure names its archetype (B1–B9) and inherits A1–A11 — the stream carries the canonical showcase
of **B5 (Joiner-Mover-Leaver)** in OP-04-12's `disable ≠ delete` split (auto-disable+revoke @L4
reversible vs always-gate delete/deprovision cleanup) and of the **B1 high-risk-symptom carve-out** in
Felix's identity/backup/DC escalate-only park (03). Everything except OP-04-02 is procedure-only /
planned ICM, mostly **dormant** pending #119, #1077/#1078 (remediation/verify), #1071/#1072 (dispatch
model), #1562 (JML), #389 (worker recall TABLED); per A5c those steps ship **propose-only** until their
substrate hydrates. **Cluster-5 scale-up additions (2026-06-29, #1629):** the service-delivery
fulfilment trio — hardware RMA/warranty + procurement logistics (13, Vance↔Scout seam), carrier/circuit/
telco lifecycle (14, Vance↔Ozzie seam), and field-service capacity planning at volume (15, Scout
un-thinned to a B3 capacity brief) — each a cross-stream seam landing its *fulfilment unit* here while
the money/deadline/cutover halves stay with their owning agents (Vance Stream 07, Ozzie Stream 05),
A11. Open lines flagged for Mark: OP-04-08 assign-vs-dispatch ownership; OP-04-13 procurement-vs-
fulfilment line + OP-04-14 carrier-contract silver model (silver `carrier_contract` + `circuit`
shipped dormant, #1651/0254) + the Stream 04↔05↔07 boundary; an ITIL Incident-vs-Request-Fulfilment split (path=`other` is doing a lot of work);
the Stream 04↔05 boundary on shared remediation/verify sub-procedures (request-driven here vs event/
alert-driven Stream 05); OP-04-07 vs Pierce dedup; and the auto-leaver precondition. The wedge's hard
floors are dial-proof: identity/backup/DC escalate-only (03), financial log-time (06), client-facing
reply (07), every JML grant (10/11), and every procurement/carrier money commit (13/14).

**Count: 15 Operating Procedures** (Felix 7: OP-04-01..07; Felix/Scout seam 1: OP-04-08; Scout 1:
OP-04-09; Osiris 3: OP-04-10..12; Vance↔Scout seam 1: OP-04-13; Vance↔Ozzie seam 1: OP-04-14; Scout 1:
OP-04-15).
