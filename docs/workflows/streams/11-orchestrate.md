# Stream 11 — Orchestrate

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

**Owners:** Nova (single feminine orchestrator, replaces Jarvis) + the 5 C-suite agents
(Rachel / Dexter / Roman / Sterling / Jessica). **Stream scope:** the orchestration spine —
intake routing · 3-level correlation/ledger · context & memory · killswitch handling ·
the single human queue — plus, per C-suite agent, a scheduled cross-division **synthesis
brief** for the paired human + the agent's **division-orchestration** (delegate/handoff +
escalate).

**Core design rule (Nova + all 5 C-suite are L2 DELEGATE-ONLY, never actuators).** This stream
is the clean showcase of doctrine **A3 (ship-dial = L0)** structurally fused with **A11
(obligation/action separation)**: Nova and the C-suite own the *orchestration clock/standard*
(route, correlate, synthesize, **park for the owning gate**); the *mechanical world-changing act*
is owned by the executing sub-agent (streams 1–10) under THEIR ceiling + `always_gate`. They meet
at an explicit seam (the delegate/handoff step, A11), never co-own. **L2 is enforced STRUCTURALLY,
not by dial:** room.yaml grants `pg.read` + `delegate`/`handoff` cap + worker
`knowledge.search`/`memory.recall` (retrieval tier #1537) + (Nova only) `search_knowledge`
orchestrator recall — and **NO direct-actuation tools at all**, so the `workflow ⊆ domain ⊆
Constitution` subset invariant makes actuation *impossible to grant*, not merely un-dialed. Every
world-changing act inherits the executing sub-agent's gauntlet + ceiling and cannot bypass it.

**Routing is hierarchical:** Nova routes ACROSS divisions (N1 → the owning exec); each C-suite
routes WITHIN its division (exec → worker) and owns the cross-division synthesis. The 5
division-orchestration procedures (Rachel / Dexter / Roman / Sterling / Jessica) are
load-bearing, not duplicates of Nova N1.

**Seams (every cross-agent hand-off is an explicit Procedure Step, A11):** intake-in from the BE
event-dispatcher / FE turn loop (N1); delegate-out → the owning exec/sub-agent across streams 1–10
(N1, R2/D2/O2/S2/J2); gate-out → the single human queue (every C-suite escalation → N5);
recall-in ← division members' silver entities (read-only, the synthesis briefs R1/D1/O1/S1/J1);
killswitch-in ← human / circuit-breaker (N4). The C-suite synthesis briefs **launch back into**
the owning worker procedure (B3 launchpad rule), they never reach past the seam to actuate.

**subject:** `imperion` (the OS orchestrating itself + the business). Each procedure runs the
SAME whether the work-unit concerns a client or Imperion-as-client (D7.2 / A8 dogfood — subject is
a parameter, not a duplicate).

**Realization:** `icm/executive/<role>/` (sibling to `domains/`, SAME anatomy). Per D5/A8, each
procedure with ≥1 [automation]/[hybrid] step is REALIZED-IN its `icm/executive/<role>/<wf>/`
ICM Workspace once scaffolded — the one uniform dual-audience document binds to that workspace.

**Whole stream UNBUILT / DORMANT.** Verified: `icm/executive/` + `icm/org.yaml` do NOT yet
exist (F2 #1536, scaffold `icm/executive/` + `org.yaml`, pending). The exec-tier ADR
foundation **#1535 is MERGED as ADR-0131**; the scaffold (#1536) is not. Every procedure below
is authored-against-placeholder until #1536 lands. Per **A5c** every deepened step that depends on
dormant substrate (retrieval, gold recall, event bus, org.yaml) ships **propose-only** and says so
rather than presenting dormant data as live.

**Archetype map (B-templates this stream instantiates).** This stream is **THE B3
synthesis-brief showcase** — every C-suite brief is a B3 launchpad.

| Procedure | Archetype |
|---|---|
| N1 intake-route (orchestration entry) | **B1 triage/route** (the ACROSS-division router) |
| N2 3-level correlation/ledger | **orchestration primitive** (audit substrate; B1-adjacent, observe-only) |
| N3 context/memory management | **orchestration primitive** (grounding/recall substrate) |
| N4 killswitch / circuit-break | **orchestration primitive** (the dial-proof stop) |
| N5 gatekeeper single-human queue | **orchestration primitive** (the A6 terminal-backstop queue) |
| R1 daily-brief → Derek | **B3 synthesis-brief** (launchpad) |
| R2 G&A division-orchestration | **B1 triage/route** (WITHIN-division) |
| D1 delivery-pulse | **B3 synthesis-brief** (launchpad) |
| D2 Delivery/Eng division-orchestration | **B1 triage/route** (WITHIN-division) |
| O1 security-posture-brief → Mark | **B3 synthesis-brief** (launchpad) |
| O2 Security/Compliance division-orchestration | **B1 triage/route** (WITHIN-division) |
| S1 financial-pulse → Nick | **B3 synthesis-brief** (launchpad) |
| S2 Revenue/Client/Finance division-orchestration | **B1 triage/route** (WITHIN-division) |
| J1 risk-assurance-sweep → Mark | **B3 synthesis-brief** (launchpad) |
| J2 Platform/Assurance division-orchestration | **B1 triage/route** (WITHIN-division) |
| OP-11-16 strategic-planning + OKR cadence | **B3 synthesis-brief** (launchpad) |
| OP-11-17 board/investor reporting pack | **B3 synthesis-brief** + **B4 audit-attest** (external-facing → `always_gate`) |

**Driving policy (every procedure):** inherits the doctrine universal baseline (ADR-0136 A2/A4/A5)
+ `TBD (mark-blocker: company-policy-collection)` for the 1–3 specific drivers (D4, #1586).

**Epics:** Nova #1545 · Rachel #1546 · Dexter #1547 · Roman #1548 · Sterling #1549 ·
Jessica #1550 (parent #1534, all milestoned v1.0).

**Substrate dormancy (applies stream-wide):** retrieval tier #1537 (worker
`knowledge.search`/`memory.recall`) UNBUILT · gold/MemPalace hydration DORMANT (Voyage seed
**#389** TABLED = gating dep — agents ship but stay propose-only until embeddings hydrate) ·
event/handoff substrate **#991** + `relationship.*` bus (BE-W7 **#437**) UNBUILT (delegate/handoff
rides it) · trigger-sync **#119** (timers deploy-dormant) · `icm/executive/` + `icm/org.yaml`
UNBUILT (**#1536**). Killswitch 3-scope + circuit-breaker = backend (jarvis-design),
deploy-dormant until #119. Per A5c, deepened steps that depend on these ship **propose-only**.

---

## NOVA — orchestration spine (epic #1545)

## N1 · Route an intake (intake-route) — THE orchestration entry procedure
- **Owner / Stream:** Nova / 11. **Archetype:** B1 triage/route (the ACROSS-division router).
- **Trigger:** any human ask in `/jarvis`(→`/nova`) chat or sidecar turn, OR a drained
  `agent_event` (BE event-dispatcher, e.g. `autotask.ticket.created`).
- **Terminal outcome:** the request CLASSIFIED + DELEGATED to exactly one exec/sub-agent (or
  answered directly if read-only), with an `agent_run` opened + `conversation_id` correlated;
  the answer synthesized back to the human.
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition → log):
  1. `[automation]` **Ground** — mint/resolve `conversation_id` + `agent_run` (insert-at-start
     `running`); title the conversation (first msg / ticket subject), **citing the intake source +
     as-of** (A5); empty/unparseable intake → park, never fabricate a routing target. [hand-off
     from: BE dispatcher OR FE turn loop] **L2.**
  2. `[automation]` **Classify** intent → archetype · owner · division (the Triage tier-1 stamp);
     read-only grounding via `search_knowledge` / `pg.read`. Pool-correlate prior similar intakes
     internally only (A7). **L2.**
  3. `[automation]` **Resolve owner + delegate** — route to the owning exec/sub-agent via
     `delegate`/`handoff` cap (rides `relationship.*` bus #437). Mechanical routing **auto-executes
     at L2** (B1 — assignment is internally reversible, A10 row 1); Nova NEVER actuates the work
     itself (no actuation grant — L2 structural).
  4. `[hybrid]` **Disposition** — receive the sub-agent result/proposal; if a `proposedActions[]`
     envelope returns, surface it to the cockpit / inline approval card — **never auto-send** (the
     gate is the sub-agent's, → N5).
  5. `[automation]` **Log** — synthesize the answer back to the human; finish `agent_run`
     (`succeeded|parked|failed|refused`), attributed up-chain (P2).
- **Autonomy ceiling:** **L2** (route/synthesize only — internally reversible, A10 row 1).
  **`always_gate` (inherited A2):** Nova holds NO actuation grant — every world-changing act
  (customer-facing / money / credentials / prod-migration) inherits the executing sub-agent's
  gauntlet + ceiling and stays gated regardless of dial.
- **Human-in-loop:** Derek is Nova's primary consult for ambiguous routing; the human gate is the
  *sub-agent's* (Nova never sends). Recede L0→L2 per A3 (ships observe-only): at low dial Nova
  drafts the route for confirmation; at high dial auto-routes read-only/internal, customer-facing
  always parks at the sub-agent.
- **Substrate deps:** event-dispatcher (BE #296, deploy-dormant #119) · `agent_run` /
  `agent_conversation` (mig 0163 applied) · `search_knowledge` orchestrator recall · org.yaml
  routing map (#1536 UNBUILT, A5c propose-only). **subject:** imperion.

## N2 · Correlate + ledger a multi-agent run (3-level correlation)
- **Owner / Stream:** Nova / 11. **Archetype:** orchestration primitive — the audit substrate
  every other gate stands on (B1-adjacent log discipline, observe-only).
- **Trigger:** any orchestrated turn that fans to ≥1 sub-agent (sequence dispatch, sub-agent
  enter/exit).
- **Terminal outcome:** a complete 3-level correlated trace persisted —
  `conversation_id`(session/root) → `run_id`(turn) → `step_id`(+parent) — joinable in Postgres
  + App Insights, glass-box-inspectable in the `/jarvis` drill-in.
- **Procedure Steps:**
  1. `[automation]` Write `agent_run` per turn + per-step `agent_message`
     (routing.decided / subagent.enter|exit / tool.call / action.proposed), sub-agent name in
     tool_calls — **each step attributed up-chain to the paired human (P2)**. **L2.**
  2. `[automation]` Map `conversation_id`/`run_id`/`step_id` → App Insights
     `operation_Id`/`operation_ParentId`; emit structured `[nova] <evt>` LAW log lines per the
     fixed event taxonomy. **L2.**
  3. `[automation]` On run completion or TTL, the reaper flips stuck `running`→`failed` (emit
     `run.reaped`); parked runs untouched (a park is not a failure — A10 halt-not-rollback). **L2.**
- **Autonomy ceiling:** **L2** (observability write only; no world-change — A10 row 1).
  **`always_gate`:** n/a (internal-reversible ledger writes).
- **Human-in-loop:** Mark/Derek as glass-box reviewers (read drill-in); no approval needed —
  this is the audit substrate that *enables* every other gate. Never recedes below "human can
  always inspect."
- **Realization:** spine procedure — shared sub-procedure referenced by N1 and by every stream
  1–10 (the audit substrate; streams point here rather than re-listing ledger writes).
- **Substrate deps:** `agent_run` / `agent_message` (mig 0163) · LAW sink (sanctioned) ·
  run-reaper (BE #290, dormant #119). **subject:** imperion.

## N3 · Manage orchestration context + memory (context/memory management)
- **Owner / Stream:** Nova / 11. **Archetype:** orchestration primitive — the grounding/recall
  substrate that makes the A5 evidence floor mechanically possible.
- **Trigger:** each turn (context assembly) + post-turn (memory sweep of transcribed
  conversations).
- **Terminal outcome:** the right grounding loaded for the turn (OKF-room reads + semantic
  recall, sources cited, never fabricate on empty) AND verbatim turns captured → enriched to
  silver `memory_enrichment` for faithful recall.
- **Procedure Steps:**
  1. `[automation]` Assemble turn context per retrieval doctrine: OKF-grounded reads for facts
     (`pg.read` / declared `okf_rooms`), semantic recall for context (`search_knowledge`), **cite
     sources + as-of, refuse-on-empty rather than fabricate** (A5 — this step IS the evidence
     floor's machinery). **L2.**
  2. `[automation]` Pull-by-query gold recall (two-level: gold summary → drill verbatim bronze)
     — DORMANT until Voyage #389 + gold hydration; **on dormant recall, say so (A5c staleness
     honesty), never present dormant data as live**. **L2.**
  3. `[automation]` Post-turn: memory-sweep drains transcribed conversations → captureTurn +
     enrichTurn (Haiku → silver `memory_enrichment`). **L2.**
- **Autonomy ceiling:** **L2** (internal reversible memory writes — A10 row 1). **`always_gate`:**
  writes that would cross the personal→company wall (never auto — separate promotion path; A7
  pool-never-bleed across the knowledge boundary).
- **Human-in-loop:** owner-scoped; the Personal Curator surfaces contradictions for the owner's
  approve. Recedes with dial on enrichment confidence; contradiction-resolution stays human.
- **Realization:** spine procedure, shared sub-procedure.
- **Substrate deps:** `memory_enrichment` (mig 0173, prod-apply Mark-gated) · gold ranker /
  `knowledge_object` / embeddings (DORMANT, #389) · Universal Memory MCP (orchestrator-only).
  **subject:** imperion.

## N4 · Engage a killswitch / handle a circuit-break (killswitch handling)
- **Owner / Stream:** Nova / 11. **Archetype:** orchestration primitive — the dial-proof STOP
  (the one place a human's halt overrides every dial).
- **Trigger:** a human-pulled kill-switch (3-scope: global / per-agent / per-workflow) OR an
  auto circuit-break (≥3 rejects in the last 10 → auto-freeze workflow + demote rung).
- **Terminal outcome:** the targeted scope HALTED (no further dispatch/actuation in scope),
  `killswitch.engaged` / `autonomy.demoted` emitted, in-flight runs parked, human notified.
- **Procedure Steps:**
  1. `[gui-step]` Human flips the kill-switch in the operator surface (or the circuit-breaker
     auto-trips the narrowest scope first). [hand-off from: human OR gauntlet gate]
  2. `[automation]` Nova stops routing/dispatch into the killed scope (gauntlet gate 1 =
     killswitch); parks/holds in-flight sequences (`sequence.parked` — a halt, not a rollback,
     A10). **L2.**
  3. `[automation]` Emit `killswitch.engaged` + notify; on circuit-break also `autonomy.demoted`
     (rung demote, workflow freeze). **Urgency is computed (A6):** a containment-class freeze
     blocking active work is urgent → dedicated chat; else a Teams tag. **L2.**
  4. `[hybrid]` Resume requires a human un-flip / re-arm (audited, reversible).
- **Autonomy ceiling:** **L2** (Nova enforces the stop; does not actuate around it).
  **`always_gate`:** re-arming / un-killing is ALWAYS human.
- **Human-in-loop:** Mark/Derek pull + re-arm; the engage path is the one place a human's stop
  OVERRIDES the dial entirely (dial-proof safety). Never recedes — kill + re-arm stay human at
  every level.
- **Realization:** `icm/executive/nova/` checkpoint / sub-procedure; partly backend-enforced.
- **Substrate deps:** killswitch 3-scope + circuit-breaker (backend, jarvis-design;
  deploy-dormant #119) · #272 circuit-breaker / #271 caps (open). **subject:** imperion.

## N5 · Route a Mark-gated call to the single human queue (gatekeeper hand-off)
- **Owner / Stream:** Nova / 11. **Archetype:** orchestration primitive — the **A6 terminal
  backstop**: the single-human gatekeeper queue every `reports_to` chain walks up into.
- **Trigger:** any sub-agent action the gauntlet flags `always_gate` / above-ceiling
  (customer-facing · money · prod-migration · deploy · X.0.0), OR an unanswered C-suite escalation
  walking up the `reports_to` chain (A6: paired human → division exec's human → here).
- **Terminal outcome:** the action PARKED into the one human queue (Teams Adaptive Card via
  Power Automate primary; in-app cockpit fallback), the approve/edit/reject decision relayed
  back, the run resumed or marked failed-at-N.
- **Procedure Steps:**
  1. `[automation]` Detect the parked ProposedAction/sequence (gauntlet gate 8 hard_ceiling), OR
     accept a `reports_to`-escalated item whose paired human did not respond inside the urgency
     window (A6). [hand-off from: sub-agent gauntlet OR C-suite escalation] **L2.**
  2. `[automation]` Post the approval card = **the 4-part easy-button (A4):** the drafted
     artifact + the grounded why (rationale + triage class + consent basis + tier/dataClass, cited
     A5) + the one-click commit (+ inverse where reversible) + the consequence preview ($ /
     irreversibility flag). Urgency computed (A6); TTL default 7 days. **L2.**
  3. `[gui-step]` Human approves / edit-and-approves / rejects. [hand-off to: human]
  4. `[automation]` On approve, relay verbatim `input` to the ADR-0058 send path (re-assert
     consent/grounding, idempotency-keyed A9); else mark failed/parked; harvest the decision →
     eval. **L2.**
- **Autonomy ceiling:** **L2** (Nova ROUTES the gate; never self-approves). **`always_gate`:** the
  routed actions are by definition dial-proof — Nova cannot collapse the queue (A2/A10 no-clean-undo
  row stays gated forever).
- **Human-in-loop:** Mark (+ the role-paired human) IS the queue. This is "the real ceiling"
  (one reviewer, many sessions) and the **A6 terminal backstop** — nothing is dropped, nothing
  auto-actuates past the gate. Does NOT recede — the always_gate floor is exactly this queue.
- **Realization:** spine + cockpit; shared sub-procedure referenced by N1 and every send across
  streams 1–10 (the generic single-human-queue mechanism the C-suite escalation steps feed).
- **Substrate deps:** Teams Cards + Power Automate (#274) · `agent_pending_action` (mig 0163) ·
  cockpit `/operator/cockpit` (#1014) · gauntlet #263 (built, dormant #119). **subject:** imperion.

---

## C-SUITE archetype — scheduled cross-division SYNTHESIS BRIEF (B3) + division-orchestration (B1)

Each C-suite agent is delegate-only L2, read + recall, NO actuation grant. Its **synthesis brief**
is a **B3 launchpad, not a readout**: it rolls up the division's state for the paired human and,
per the B3 rule, **auto-spawns the owning worker procedure PARKED/draft (attributed,
easy-button-ready) for one-click launch from inside the brief** — the C-suite agent NEVER actuates
(it delegates DOWN by pre-staging the worker's gated procedure; delegate-only L2 holds structurally
via the subset invariant, A3+A11). Its **division-orchestration** is pure delegate/handoff routing
(B1, WITHIN the division) + escalation into Nova N5 (the A6 `reports_to` chain). A C-suite agent's
division-*member* operational procedures (Felix triage, Cyrus alert-triage, Holly onboarding, …)
live in those members' own streams (1–10) — NOT duplicated here.

## R1 · Compose Rachel's daily-brief (synthesis brief → Derek)
- **Owner / Stream:** Rachel (Chief of Staff) / 11. **Serves:** Derek. **Division:** Internal
  Ops / G&A (Holly, Laurel, per-employee-brain, dogfood). **Archetype:** B3 synthesis-brief (launchpad).
- **Trigger:** schedule (daily, cron via timer — deploy-dormant #119).
- **Terminal outcome:** a cross-division status brief delivered to Derek — priorities, blockers,
  decisions-needed — **each decision-needed item carrying a pre-staged, parked worker procedure**
  for one-click launch.
- **Procedure Steps** (B3: gather → synthesize → narrate → deliver → log):
  1. `[automation]` **Gather** — recall + read across G&A division state (HR/onboarding pipeline,
     legal/contract queue, brain-program + dogfood status) via `pg.read` / `memory.recall`,
     **citing each source + as-of (A5)**; on dormant recall, flag it (A5c). [hand-off from:
     division members' streams — read-only, no re-run] **L2.**
  2. `[automation]` **Synthesize** — aggregate cross-division status / priorities / blockers; flag
     decisions-needed. Pool-correlate internally; **never surface one client's specifics into
     another's** context (A7). **L2.**
  3. `[hybrid]` **Narrate + deliver (A6) + launchpad** — render Derek's brief (read-only artifact —
     no external send → no gate), attributed up-chain (P2); for each actionable item **auto-spawn
     the owning worker procedure PARKED in draft** (Holly onboarding / Laurel contract / …) so Derek
     one-click-launches it into that worker's own gauntlet. Rachel never actuates.
- **Autonomy ceiling:** **L2 delegate-only.** **`always_gate`:** holds NO actuation grant — any
  launched item runs under the owning sub-agent's gauntlet + ceiling (the launchpad pre-stages, the
  worker gates).
- **Human-in-loop:** Derek consumes + makes the calls. Recedes per A3: at low dial Rachel drafts
  for review; at high dial auto-delivers, but every *decision* the brief surfaces is Derek's.
- **Driving policy:** TBD (#1586). **Realization:** `icm/executive/chief-of-staff/daily-brief/`.
- **Substrate deps:** retrieval tier #1537 (recall) · timer #119 · org.yaml division map #1536 ·
  cross-agent handoff substrate #991 (all A5c propose-only). **subject:** imperion.

## R2 · Orchestrate the G&A division (delegate/handoff + escalate-to-human)
- **Owner / Stream:** Rachel / 11. **Archetype:** B1 triage/route (WITHIN-division).
- **Trigger:** Nova delegates a G&A request, OR a division member emits a handoff/escalation
  (HR / legal / brain / dogfood).
- **Terminal outcome:** the request routed to the right G&A sub-agent (Holly/Laurel) OR
  escalated to Derek; division coherence maintained.
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition → log):
  1. `[automation]` **Ground** — receive the delegation from Nova / member handoff, citing the
     carried rationale + as-of (A5). [hand-off from: Nova N1 OR member stream] **L2.**
  2. `[automation]` **Classify + resolve-owner** — delegate to Holly (HR) / Laurel (Legal) /
     brain-program / dogfood owner via the `handoff` cap; routing auto-executes at L2 (reversible
     assignment, A10 row 1). **L2.**
  3. `[hybrid]` **Disposition** — on cross-division or human-judgment items, escalate to Derek up
     the `reports_to` chain (→ Nova N5, the A6 single-human-queue path).
- **Autonomy ceiling:** **L2 delegate-only.** **`always_gate`:** no actuation — member gauntlets
  apply (Holly identity/JML, Laurel binding contract stay gated regardless of Rachel's dial, A11).
- **Human-in-loop:** Derek for division escalations. Recedes with dial on routing confidence;
  member-level always_gate stays.
- **Driving policy:** TBD (#1586). **Realization:** `icm/executive/chief-of-staff/` room routing.
- **Substrate deps:** `relationship.*` / handoff bus #437 / #991 · org.yaml #1536. **subject:** imperion.

## D1 · Compose Dexter's delivery-pulse (synthesis brief)
- **Owner / Stream:** Dexter (CTO) / 11. **Serves:** Derek / Mark / Luke / Brandon / Anna.
  **Division:** Service Delivery & Eng (Felix, Ozzie, Sage, Marshall, Scout, Phoenix, Pierce).
  **Archetype:** B3 synthesis-brief (launchpad).
- **Trigger:** schedule (recurring).
- **Terminal outcome:** an exec delivery summary — backlog / SLA / incidents / problems /
  change-calendar / capacity rolled up + risks flagged — **each risk carrying a parked worker
  procedure** for one-click launch.
- **Procedure Steps** (B3: gather → synthesize → narrate → deliver → log):
  1. `[automation]` **Gather** — recall + read across delivery/eng state: ticket backlog + SLA,
     open incidents (Ozzie), problems (Sage), change calendar (Marshall), dispatch load (Scout),
     backup posture (Phoenix), project status (Pierce), **each cited + as-of (A5)**. [hand-off from:
     streams 3–6 — read-only] **L2.**
  2. `[automation]` **Synthesize** — roll up; compute risks (SLA-breach trends, capacity gaps,
     change collisions). Pool-correlate internally only (A7). **L2.**
  3. `[hybrid]` **Narrate + deliver + launchpad** — render the exec summary + risks; deliver to eng
     leadership (read-only, no gate); for each risk-driven action **auto-spawn the owning worker
     procedure PARKED in draft** (Marshall change, Ozzie remediation, …) for one-click launch into
     that worker's gauntlet. Dexter never actuates.
- **Autonomy ceiling:** **L2 delegate-only.** **`always_gate`:** no actuation — launched items run
  under the owning sub-agent's gauntlet.
- **Human-in-loop:** Derek / Mark / Luke / Brandon / Anna consume. Recedes per A3 on auto-compile;
  risk-driven *actions* route to the owning sub-agent gauntlet.
- **Driving policy:** TBD (#1586). **Realization:** `icm/executive/cto/delivery-pulse/`.
- **Substrate deps:** retrieval tier #1537 · timer #119 · org.yaml #1536 · member streams' silver
  entities (incl. #1577 problem/known_error, #1578 monitoring bronze, #1579
  change_freeze/rollback). **subject:** imperion.

## D2 · Orchestrate the Service Delivery & Eng division (delegate + escalate)
- **Owner / Stream:** Dexter / 11. **Archetype:** B1 triage/route (WITHIN-division).
- **Trigger:** Nova delegates a delivery/eng request, OR a member escalates (incident sev,
  problem, change risk, capacity).
- **Terminal outcome:** routed to the right delivery/eng sub-agent OR escalated to the human eng
  leads.
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition):
  1. `[automation]` **Ground** — receive the delegation/handoff, citing carried rationale (A5).
     [hand-off from: Nova N1 OR member] **L2.**
  2. `[automation]` **Classify + resolve-owner** — delegate to Felix / Ozzie / Sage / Marshall /
     Scout / Phoenix / Pierce per archetype (reversible routing, L2). **L2.**
  3. `[hybrid]` **Disposition** — escalate cross-division / human-judgment items (major incident,
     architecture call) to Derek / Luke / Brandon / Anna up `reports_to` (→ N5).
- **Autonomy ceiling:** **L2 delegate-only.** **`always_gate`:** no actuation; member ceilings apply
  (Ozzie/Cyrus L4 reversible-auto, destructive/identity gated — A10/A11).
- **Human-in-loop:** eng leads on escalation. Recedes with dial on routing; member always_gate
  (prod remediation, identity, DCs) stays.
- **Driving policy:** TBD (#1586). **Realization:** `icm/executive/cto/` room routing.
- **Substrate deps:** handoff bus #437 / #991 · org.yaml #1536. **subject:** imperion.

## O1 · Compose Roman's security-posture-brief (synthesis brief → Mark)
- **Owner / Stream:** Roman (Deputy CISO) / 11. **Serves:** Mark. **Division:** Security &
  Compliance (Cyrus, Grace, Osiris). **Archetype:** B3 synthesis-brief (launchpad).
- **Trigger:** schedule (recurring) OR on-incident.
- **Terminal outcome:** Mark's security brief — SOC + GRC + Identity posture rolled up +
  escalations — **each remediation carrying a parked worker procedure** for one-click launch.
- **Procedure Steps** (B3: gather → synthesize → narrate → deliver → log):
  1. `[automation]` **Gather** — recall + read across SOC alert/incident posture (Cyrus),
     control/evidence + compliance drift (Grace), identity/JML state (Osiris). **Audit-by-reference
     — cite the source + as-of, never reproduce credential/PII values** (A5 + A7). [hand-off from:
     Stream 7 — read-only] **L2.**
  2. `[automation]` **Synthesize** — roll up posture; flag escalations (active incident, control
     failure, IAM drift). **L2.**
  3. `[hybrid]` **Narrate + deliver (A6) + launchpad** — render Mark's brief (read-only); the
     on-incident path delivers immediately (**urgency computed A6 — a sev-high incident is urgent →
     dedicated chat**); for each remediation **auto-spawn the owning worker procedure PARKED in
     draft** (Cyrus containment, Osiris JML, …) for one-click launch into that worker's gauntlet.
     Roman never actuates.
- **Autonomy ceiling:** **L2 delegate-only.** **`always_gate`:** no actuation; all remediation
  routes to member/human (security data_class is always-gate, A2/A7).
- **Human-in-loop:** Mark (CISO) consumes + decides remediation. Never recedes on security
  decisions — Mark holds the security veto; the brief auto-compiles, the decisions stay Mark's.
- **Driving policy:** TBD (#1586). **Realization:** `icm/executive/deputy-ciso/security-posture-brief/`.
- **Substrate deps:** retrieval tier #1537 · timer #119 · org.yaml #1536 · posture/SOC silver
  (Stream 7, #1578 monitoring bronze) · audit-by-reference read scope. **subject:** imperion.

## O2 · Orchestrate the Security & Compliance division (delegate + escalate)
- **Owner / Stream:** Roman / 11. **Archetype:** B1 triage/route (WITHIN-division).
- **Trigger:** Nova delegates a security/compliance request, OR a member escalates (incident,
  control gap, identity event).
- **Terminal outcome:** routed to Cyrus / Grace / Osiris OR escalated to Mark.
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition):
  1. `[automation]` **Ground** — receive the delegation/handoff, citing carried rationale (A5).
     [hand-off from: Nova N1 OR member] **L2.**
  2. `[automation]` **Classify + resolve-owner** — delegate to SOC (Cyrus) / GRC (Grace) /
     Identity-JML (Osiris) via `handoff` cap. **L2.**
  3. `[hybrid]` **Disposition** — escalate to Mark on every security-decision / remediation-commit
     (security = always Mark, up `reports_to` → N5).
- **Autonomy ceiling:** **L2 delegate-only.** **`always_gate`:** no actuation; member remediation +
  any credential/security data_class always gated (A2/A7).
- **Human-in-loop:** Mark. Does not recede on remediation — Roman drafts/routes, Mark decides (A11).
- **Driving policy:** TBD (#1586). **Realization:** `icm/executive/deputy-ciso/` room routing.
- **Substrate deps:** handoff bus #437 / #991 · org.yaml #1536. **subject:** imperion.

## S1 · Compose Sterling's financial-pulse (synthesis brief → Nick)
- **Owner / Stream:** Sterling (Deputy CFO) / 11. **Serves:** Nick. **Division:**
  Revenue/Client/Finance (Chase, Belle, Celeste, Vance, Audrey). **Archetype:** B3 synthesis-brief (launchpad).
- **Trigger:** schedule (recurring).
- **Terminal outcome:** Nick's financial brief — AR/AP / margin / revenue / pipeline rolled up +
  flags (unprofitable work, at-risk revenue) — **each flag carrying a parked worker procedure**
  for one-click launch.
- **Procedure Steps** (B3: gather → synthesize → narrate → deliver → log):
  1. `[automation]` **Gather** — recall + read across finance/revenue state: AR/AP + margin
     (Audrey, read-only), pipeline (Chase), engagement (Belle), account health/churn (Celeste),
     vendor spend (Vance), **each cited + as-of (A5)**. **Salary/comp non-disclosure honored —
     aggregate, never individual Pay Rate** (A7 pool-never-bleed across the comp boundary).
     [hand-off from: streams 2/8/9 — read-only] **L2.**
  2. `[automation]` **Synthesize** — roll up; flag unprofitable work + at-risk revenue. **L2.**
  3. `[hybrid]` **Narrate + deliver + launchpad** — render Nick's brief (read-only); for each flag
     **auto-spawn the owning worker procedure PARKED in draft** (Audrey AR action, Chase renewal,
     Vance procurement, …) for one-click launch into that worker's **money-gate (B6)** gauntlet.
     Sterling never moves money.
- **Autonomy ceiling:** **L2 delegate-only, read-heavy.** **`always_gate`:** no actuation; money
  movement is QBO-SoR / human only (A2 class-1, A9 SoR-mirrors-never-owns).
- **Human-in-loop:** Nick (CFO) consumes + decides. Recedes per A3 on auto-compile; every money
  decision stays Nick's. always_gate floor: comp non-disclosure (never emit individual salary, even
  to Nick's brief — aggregate only, A7).
- **Driving policy:** TBD (#1586). **Realization:** `icm/executive/deputy-cfo/financial-pulse/`.
- **Substrate deps:** retrieval tier #1537 · timer #119 · org.yaml #1536 · finance silver
  (Stream 9, QBO read-only, #1580 AR/invoice) · payroll-RLS (comp gag). **subject:** imperion.

## S2 · Orchestrate the Revenue/Client/Finance division (delegate + escalate)
- **Owner / Stream:** Sterling / 11. **Archetype:** B1 triage/route (WITHIN-division).
- **Trigger:** Nova delegates a revenue/finance request, OR a member escalates (margin risk,
  churn signal, renewal money gate, AR aging).
- **Terminal outcome:** routed to Chase / Belle / Celeste / Vance / Audrey OR escalated to Nick.
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition):
  1. `[automation]` **Ground** — receive the delegation/handoff, citing carried rationale (A5).
     [hand-off from: Nova N1 OR member] **L2.**
  2. `[automation]` **Classify + resolve-owner** — delegate to the right revenue/client/finance
     sub-agent via `handoff` cap. **L2.**
  3. `[hybrid]` **Disposition** — escalate money-gate / binding-commitment items to Nick up
     `reports_to` (single human queue, → N5).
- **Autonomy ceiling:** **L2 delegate-only.** **`always_gate`:** no actuation; member
  money/commitment steps always gated (A2 class-1/2, A11).
- **Human-in-loop:** Nick. Does not recede on money/commitments.
- **Driving policy:** TBD (#1586). **Realization:** `icm/executive/deputy-cfo/` room routing.
- **Substrate deps:** handoff bus #437 / #991 · org.yaml #1536. **subject:** imperion.

## J1 · Compose Jessica's risk-assurance-sweep (synthesis brief → Mark)
- **Owner / Stream:** Jessica (Chief Risk Officer) / 11. **Serves:** Mark. **Division:**
  Platform & Assurance (Vera, Tess, Alivia). **Archetype:** B3 synthesis-brief (launchpad).
- **Trigger:** schedule (recurring).
- **Terminal outcome:** Mark's risk brief — conformance / quality / telemetry / control-drift
  rolled up + quarantine flags — **each flag carrying a parked worker procedure** for one-click launch.
- **Procedure Steps** (B3: gather → synthesize → narrate → deliver → log):
  1. `[automation]` **Gather** — recall + read across assurance state: conformance/deviation
     findings (Vera), ticket/service quality (Tess), doc-hygiene/knowledge drift (Alivia), agent
     telemetry/eval scores. **Audit-by-reference, cite + as-of (A5)**. [hand-off from: Stream 7/10 —
     read-only] **L2.**
  2. `[automation]` **Synthesize** — roll up the risk picture; surface quarantine flags +
     control-drift. Pool-correlate internally only (A7). **L2.**
  3. `[hybrid]` **Narrate + deliver + launchpad** — render Mark's risk brief (read-only); for each
     quarantine/correction **auto-spawn the owning worker procedure PARKED in draft** (Vera
     conformance, Tess quality-audit, …) for one-click launch into that worker's gauntlet — but the
     quarantine-promotion / correction decision itself is the framework-owned earned-autonomy state
     machine (observe only). Jessica never actuates.
- **Autonomy ceiling:** **L2 delegate-only.** **`always_gate`:** no actuation; every
  correction/quarantine-promotion routes to owner/Mark (framework-owned earned-autonomy state
  machine — observe only, A3/A11).
- **Human-in-loop:** Mark (risk reports to Mark). Recedes per A3 on auto-compile;
  quarantine/correction decisions stay human. always_gate floor: standard ratification +
  governance-config = always Mark.
- **Driving policy:** TBD (#1586). **Realization:** `icm/executive/cro/risk-assurance-sweep/`.
- **Substrate deps:** retrieval tier #1537 · timer #119 · org.yaml #1536 · conformance / eval /
  telemetry substrate (#983 / #990 / #1412, partly UNBUILT) · audit-by-reference.
  **subject:** imperion.

## J2 · Orchestrate the Platform & Assurance division (delegate + escalate)
- **Owner / Stream:** Jessica / 11. **Archetype:** B1 triage/route (WITHIN-division).
- **Trigger:** Nova delegates an assurance/quality/governance request, OR a member escalates
  (conformance deviation, quality miss, doc-drift, telemetry anomaly).
- **Terminal outcome:** routed to Vera / Tess / Alivia OR escalated to Mark.
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition):
  1. `[automation]` **Ground** — receive the delegation/handoff, citing carried rationale (A5).
     [hand-off from: Nova N1 OR member] **L2.**
  2. `[automation]` **Classify + resolve-owner** — delegate to Vera (conformance) / Tess (QA) /
     Alivia (doc-hygiene → IT Glue SoT) via `handoff` cap. **L2.**
  3. `[hybrid]` **Disposition** — escalate quarantine / standard-change / governance-config items
     to Mark up `reports_to` (→ N5).
- **Autonomy ceiling:** **L2 delegate-only.** **`always_gate`:** no actuation; member corrective /
  config / standard-change always gated (Vera/Tess top at L2, A11).
- **Human-in-loop:** Mark. Does not recede on governance/standard decisions.
- **Driving policy:** TBD (#1586). **Realization:** `icm/executive/cro/` room routing.
- **Substrate deps:** handoff bus #437 / #991 · org.yaml #1536. **subject:** imperion.

---

## ENTERPRISE STRATEGY — exec-tier synthesis briefs (Cluster 7, NO M&A)

The two procedures below extend the C-suite synthesis-brief archetype to the **enterprise/exec
planning surface** (#1630, organic path to $100M — corp-dev/M&A and multi-entity consolidation
explicitly DROPPED). Both are **L2 delegate-only** like every procedure in this stream: they roll
up cross-division state for the paired human and **launch back into** owning worker procedures
(B3 launchpad), never reaching past the seam to actuate. The business/enterprise-risk register,
business-insurance portfolio, and facilities/fleet procedures of Cluster 7 live in **Stream 10**
(separate PR), not here.

## OP-11-16 · Run strategic / annual planning + OKR cadence (synthesis brief → Derek)
- **Owner / Stream:** Rachel (Chief of Staff) + Nova / 11. **Serves:** Derek (+ the C-suite as
  contributors). **Division:** cross-division (Rachel facilitates the planning clock; Nova supplies
  the across-division roll-up). **Archetype:** B3 synthesis-brief (launchpad).
- **Trigger:** the planning calendar — annual plan kickoff + the recurring OKR review cadence
  (quarterly/monthly check-in), cron via timer (deploy-dormant #119); or an admin opens an
  off-cycle re-plan.
- **Terminal outcome:** a planning/OKR brief delivered to Derek — proposed objectives + key
  results, progress vs current-period targets, at-risk OKRs + the strategic decisions they force —
  **each decision-needed item carrying a pre-staged, parked worker procedure** for one-click launch
  into the owning division's gauntlet. Rachel/Nova never set the objectives; Derek (+ C-suite) does.
- **Procedure Steps** (B3: gather → synthesize → narrate → deliver → log):
  1. `[automation]` **Gather** — recall + read the planning inputs across every division: the
     C-suite pulses (R1/D1/O1/S1/J1 outputs), the current OKR set + measured progress, financial
     trajectory (Sterling/Audrey, read-only) and delivery/capacity (Dexter), **citing each source +
     as-of (A5)**; on dormant recall (no hydrated gold / no prior OKR baseline), **flag it (A5c),
     never present dormant data as live**. [hand-off from: C-suite briefs + division members'
     streams — read-only, no re-run] **L2.**
  2. `[automation]` **Synthesize** — aggregate progress vs key results; compute at-risk OKRs
     (off-trajectory KRs, capacity/funding gaps, cross-objective collisions); draft proposed
     next-period objectives from the rolled-up state. **Pool-correlate internally only; never
     surface one client's specifics into another's context (A7).** **L2.**
  3. `[hybrid]` **Narrate + deliver (A6) + launchpad** — render Derek's planning brief (read-only
     artifact — no external send → no gate), attributed up-chain (P2); for each at-risk OKR /
     decision-needed item **auto-spawn the owning worker procedure PARKED in draft** (a Dexter
     delivery action D2, a Sterling finance action S2, a Rachel G&A action R2, …) so Derek
     one-click-launches it into that division's own gauntlet. **Nova supplies the across-division
     correlation (its N1/N2 substrate); Rachel owns the planning-clock narrative.** Neither actuates
     — setting/committing an objective is Derek's call, and any resulting world-change runs under the
     owning sub-agent's ceiling.
- **Autonomy ceiling:** **L2 delegate-only** (compile + narrate + pre-stage = reversible internal,
  A10 row 1; structurally L2 — no actuation grant, the subset invariant makes actuation
  impossible to grant, not merely un-dialed). **`always_gate`:** holds NO actuation grant — every
  launched planning action runs under the owning sub-agent's gauntlet + ceiling (the launchpad
  pre-stages, the worker gates); **committing the objective set is Derek's decision, never
  auto-set**.
- **Human-in-loop:** Derek consumes + makes the planning calls (with the C-suite as contributors).
  Recedes per A3: at low dial Rachel/Nova draft the brief for review; at high dial auto-deliver the
  compiled brief, but every *objective-setting decision* it surfaces stays Derek's (the planning
  call never recedes to the agent).
- **Driving policy:** inherits the doctrine universal baseline (A2/A4/A5) + TBD (#1586) for the
  Strategic-Planning / OKR-Cadence drivers (owed as #1586 IT-Glue business docs). **Realization:**
  `icm/executive/chief-of-staff/strategic-planning/` (Rachel-owned room; Nova roll-up via N1/N2).
- **Substrate deps:** retrieval tier #1537 (recall) · timer #119 · org.yaml division map #1536 ·
  the C-suite pulse outputs (R1/D1/O1/S1/J1) · cross-agent handoff substrate #991 (launchpad
  spawn); **OKR persistence has no silver entity yet — propose-to-FE, A5c propose-only until built**
  (all dormant deps ship propose-only). **subject:** imperion.

## OP-11-17 · Produce the board / investor reporting pack (synthesis brief + audit-attest)
- **Owner / Stream:** Sterling (Deputy CFO) + Rachel (Chief of Staff) / 11. **Serves:** Nick (CFO) +
  the board/investor audience via Nick. **Division:** cross-division (Sterling owns the financial
  substance; Rachel owns the narrative/assembly clock). **Archetype:** B3 synthesis-brief (launchpad)
  **+ B4 audit-attest** — the pack is an **external-facing attestation**, so its sign-off is
  `always_gate` (A2 + B4 audience split).
- **Trigger:** the board/reporting calendar (per-meeting / quarterly), cron via timer (deploy-dormant
  #119); or Nick requests an off-cycle pack.
- **Terminal outcome:** a complete board/investor pack assembled — financial results + KPIs +
  strategic-narrative + risk summary, each figure **evidence-backed and cited** — **parked for a
  human sign-off** (the external attestation is never auto-issued); on sign-off, the released pack is
  recorded as the attested artifact. Sterling/Rachel assemble + attest-prep; Nick signs.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → route-gaps → sign-off,
  fused with B3 gather→synthesize→narrate→deliver):
  1. `[automation]` **Scope + collect evidence (A5, audit-by-reference)** — assemble the reporting
     figures from the silver SoR: financials (Sterling/Audrey, **QBO read-only — QBO is the SoR, the
     agent mirrors, never owns, A9a**), revenue/pipeline (Chase), delivery/SLA KPIs (Dexter), risk
     posture (Jessica/Roman), **citing the source + as-of of every figure**; on dormant/un-hydrated
     finance silver, **flag it (A5c), never fabricate a number**. **Salary/comp non-disclosure
     honored — aggregate only, never individual Pay Rate (A7 pool-never-bleed across the comp
     boundary).** [hand-off from: S1/D1/J1 + streams 2/8/9 — read-only] **L2.**
  2. `[automation]` **Evaluate + synthesize** — reconcile the figures (period-over-period, vs plan
     from OP-11-16), compute the KPI deltas + variance flags; **pool-correlate internally only,
     never surface one client's specifics across the pack (A7)**. **L2.**
  3. `[hybrid]` **Compose the pack + the attestation package = the 4-part easy-button (A4):** the
     drafted board pack (financials + KPIs + strategic narrative, Rachel-narrated, attributed P2) +
     the grounded why (each figure cited + as-of, the reconciliation trail) + the one-click
     Sign-off-&-release (+ Edit) + the consequence preview (this pack goes to the board/investors —
     external, committal). For each pack-surfaced strategic action **auto-spawn the owning worker
     procedure PARKED in draft** (B3 launchpad) for one-click launch — the pack is also a launchpad,
     not only a readout.
  4. `[gui-step]` **Human sign-off = `always_gate`** — Nick (CFO) reviews the evidence-backed pack
     and **signs/releases it** (B4 external-facing attestation: an investor/board pack is a committal
     external assertion → human-signed, dial-proof). Sterling/Rachel **never auto-issue** the pack.
  5. `[automation]` **Record + route-gaps** — on sign-off, record the released pack as the attested
     artifact (idempotency-keyed, read-back to confirm it landed, A9c); route any evidence gap found
     during assembly back to the owning division (→ S2 / D2 / J2).
- **Autonomy ceiling:** **L2 delegate-only** (assemble + evidence-back + pre-stage = reversible
  internal, A10 row 1; no actuation grant — structural L2). **`always_gate` (HARD, A2 + B4): the
  pack's sign-off / external release** — an investor/board pack is an external-facing attestation
  + a committal customer-/stakeholder-facing artifact (A2 class-2), so the release NEVER
  auto-executes at any dial. Money figures are QBO-SoR read-only (A9a); comp is aggregate-only (A7).
- **Human-in-loop:** Nick (CFO) signs/releases the pack; the C-suite contributes the substance.
  Recedes per A3 on the *assembly* (at high dial Sterling/Rachel pre-stage the full evidence-backed
  pack), but the **external sign-off click stays human forever** (B4 attestation floor) — and the
  **comp non-disclosure floor holds even into Nick's pack** (aggregate only, A7).
- **Driving policy:** inherits the doctrine universal baseline (A2/A4/A5) + TBD (#1586) for the
  Board-Reporting / Investor-Disclosure drivers (owed as #1586 IT-Glue business docs). **Realization:**
  `icm/executive/deputy-cfo/board-reporting-pack/` (Sterling-owned room; Rachel narrative assembly).
- **Substrate deps:** retrieval tier #1537 · timer #119 · org.yaml #1536 · finance silver (Stream 9,
  QBO read-only, #1580 AR/invoice) · payroll-RLS (comp gag) · the C-suite pulse outputs
  (S1/D1/J1) · cross-agent handoff substrate #991; **board-pack/attestation artifact has no silver
  entity yet — propose-to-FE, A5c propose-only until built**. **subject:** imperion.

---

## Provable-coverage note

Orchestration spine fully covered: intake routing (N1, **B1**), 3-level correlation/ledger (N2),
context & memory (N3), killswitch handling (N4), the single human queue (N5) — N2–N5 the
orchestration primitives every stream 1–10 gate stands on. Each of the 5 C-suite agents covered by
its two load-bearing procedures: a scheduled cross-division **B3 synthesis-brief** for the paired
human (this stream is THE B3 launchpad showcase — each brief auto-spawns the owning worker
procedure parked for one-click launch, the C-suite agent never actuating) + a within-division
**B1** delegate/handoff orchestration — Rachel (R1/R2 → Derek), Dexter (D1/D2), Roman (O1/O2 →
Mark), Sterling (S1/S2 → Nick), Jessica (J1/J2 → Mark). Routing is hierarchical (Nova ACROSS
divisions; each C-suite WITHIN), so the 5 division-orchestration procedures are not duplicates of
N1; N2 and N5 are shared sub-procedures the rest of the catalog (streams 1–10) references rather
than re-lists. **Doctrine inheritance (ADR-0136):** every procedure names its archetype and
inherits A1–A11; the stream is the canonical showcase of **A3 ship-dial = L0 fused with A11
obligation/action separation** — all 15 procedures are **L2 delegate-only with NO actuation grant**,
so every world-changing act inherits the executing sub-agent's gauntlet + ceiling and cannot be
bypassed (the subset invariant makes actuation impossible to grant, not merely un-dialed). The 5
C-suite briefs are the **B3 launchpad showcase**; N5 is the **A6 terminal single-human backstop**.
Whole stream UNBUILT: `icm/executive/` + `icm/org.yaml` pending #1536 (exec-tier ADR foundation
#1535 MERGED as ADR-0131); per A5c every procedure ships propose-only until its substrate hydrates.
**Enterprise-strategy extension (#1630, Cluster 7, organic — NO M&A):** two exec-tier briefs added —
strategic/annual planning + OKR cadence (OP-11-16, Rachel + Nova, B3) and the board/investor
reporting pack (OP-11-17, Sterling + Rachel, B3 + **B4 external-facing attestation → sign-off
`always_gate`**) — both **L2 delegate-only** consistent with the stream invariant (compile + launchpad,
never actuate; the planning call stays Derek's, the pack sign-off stays Nick's). Cluster 7's
enterprise/business-risk register, business-insurance portfolio, and facilities/fleet procedures live
in **Stream 10** (separate PR), not here.

**Count: 17 Operating Procedures** (Nova 5: N1–N5; C-suite 10 = 5 × {synthesis-brief +
division-orchestration}: R1/R2, D1/D2, O1/O2, S1/S2, J1/J2; enterprise-strategy 2: OP-11-16,
OP-11-17).
