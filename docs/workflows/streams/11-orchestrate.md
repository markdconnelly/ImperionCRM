# Stream 11 — Orchestrate

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-0133](../../decision-records/ADR-0133-operating-procedure-catalog.md). Terms
> **Operating Procedure** / **Procedure Step** are defined in [`CONTEXT.md`](../../../CONTEXT.md).
>
> **D9 global principles apply to every procedure below** (encoded in each Human-in-loop field,
> not restated per entry): **P1** Nova-native human co-working (every flow co-works with a human
> through Nova) · **P2** each sub-agent's reasoning is ascribed back to the paired human, up the
> chain · **P3** an "easy button" at every human gate (prep to the goal, hand the human a one-click
> resolution) · **P4** urgent → dedicated chat, else → tag the team member in the shared Teams chat.

**Owners:** Nova (single feminine orchestrator, replaces Jarvis) + the 5 C-suite agents
(Rachel / Dexter / Roman / Sterling / Jessica). **Stream scope:** the orchestration spine —
intake routing · 3-level correlation/ledger · context & memory · killswitch handling ·
the single human queue — plus, per C-suite agent, a scheduled cross-division **synthesis
brief** for the paired human + the agent's **division-orchestration** (delegate/handoff +
escalate).

**Ladder ceiling — ALL L2, delegate-only.** Nova and the 5 C-suite agents synthesize / advise /
orchestrate and **NEVER directly actuate**. room.yaml grants `pg.read` + `delegate`/`handoff`
cap + worker `knowledge.search`/`memory.recall` (retrieval tier #1537) + (Nova only)
`search_knowledge` orchestrator recall — **NO direct-actuation tools**, so L2 is enforced
STRUCTURALLY by the `workflow ⊆ domain ⊆ Constitution` subset invariant. Every world-changing
act inherits the executing sub-agent's gauntlet + ceiling and cannot bypass it.

**Routing is hierarchical:** Nova routes ACROSS divisions (N1 → the owning exec); each C-suite
routes WITHIN its division (exec → worker) and owns the cross-division synthesis. The 5
division-orchestration procedures (Rachel / Dexter / Roman / Sterling / Jessica) are
load-bearing, not duplicates of Nova N1.

**subject:** `imperion` (the OS orchestrating itself + the business). Each procedure runs the
SAME whether the work-unit concerns a client or Imperion-as-client (D7.2 — dogfood is a
parameter, not a duplicate).

**Realization:** `icm/executive/<role>/` (sibling to `domains/`, SAME anatomy). Per D5, each
procedure with ≥1 [automation]/[hybrid] step is REALIZED-IN its `icm/executive/<role>/<wf>/`
ICM Workspace once scaffolded.

**Whole stream UNBUILT / DORMANT.** Verified: `icm/executive/` + `icm/org.yaml` do NOT yet
exist (F2 #1536, scaffold `icm/executive/` + `org.yaml`, pending). The exec-tier ADR
foundation **#1535 is MERGED as ADR-0131**; the scaffold (#1536) is not. Every procedure below
is authored-against-placeholder until #1536 lands.

**Driving policy (every procedure):** `TBD (mark-blocker: company-policy-collection)` (D4, #1586).

**Epics:** Nova #1545 · Rachel #1546 · Dexter #1547 · Roman #1548 · Sterling #1549 ·
Jessica #1550 (parent #1534, all milestoned v1.0).

**Substrate dormancy (applies stream-wide):** retrieval tier #1537 (worker
`knowledge.search`/`memory.recall`) UNBUILT · gold/MemPalace hydration DORMANT (Voyage seed
**#389** TABLED = gating dep — agents ship but stay propose-only until embeddings hydrate) ·
event/handoff substrate **#991** + `relationship.*` bus (BE-W7 **#437**) UNBUILT (delegate/handoff
rides it) · trigger-sync **#119** (timers deploy-dormant) · `icm/executive/` + `icm/org.yaml`
UNBUILT (**#1536**). Killswitch 3-scope + circuit-breaker = backend (jarvis-design),
deploy-dormant until #119.

---

## NOVA — orchestration spine (epic #1545)

## N1 · Route an intake (intake-route) — THE orchestration entry procedure
- **Owner / Stream:** Nova / 11.
- **Trigger:** any human ask in `/jarvis`(→`/nova`) chat or sidecar turn, OR a drained
  `agent_event` (BE event-dispatcher, e.g. `autotask.ticket.created`).
- **Terminal outcome:** the request CLASSIFIED + DELEGATED to exactly one exec/sub-agent (or
  answered directly if read-only), with an `agent_run` opened + `conversation_id` correlated;
  the answer synthesized back to the human.
- **Procedure Steps:**
  1. `[automation]` Mint/resolve `conversation_id` + `agent_run` (insert-at-start `running`);
     title the conversation (first msg / ticket subject). [hand-off from: BE dispatcher OR FE turn loop] **L2.**
  2. `[automation]` Classify intent → archetype · owner · division (the Triage tier-1 stamp);
     read-only grounding via `search_knowledge` / `pg.read`. **L2.**
  3. `[automation]` **Delegate** to the owning exec/sub-agent via `delegate`/`handoff` cap
     (rides `relationship.*` bus #437) — Nova NEVER actuates the work itself (L2 structural).
  4. `[hybrid]` Receive the sub-agent result/proposal; if a `proposedActions[]` envelope
     returns, surface it to the cockpit / inline approval card — never auto-send.
  5. `[automation]` Synthesize the answer back to the human; finish `agent_run`
     (`succeeded|parked|failed|refused`).
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/nova/intake-route/` (ICM Workspace).
- **Autonomy ceiling:** L2 (route/synthesize only). `always_gate`: Nova holds NO actuation
  grant — every world-changing act inherits the executing sub-agent's gauntlet + ceiling.
- **Human-in-loop:** Derek is Nova's primary consult for ambiguous routing; the human gate is
  the *sub-agent's* (Nova never sends). Recedes: at low dial Nova drafts the route for
  confirmation; at high dial auto-routes read-only/internal, but customer-facing always parks
  at the sub-agent. **always_gate floor:** any sub-agent action that is customer-facing / money /
  credentials / prod-migration stays gated regardless of dial.
- **Substrate deps:** event-dispatcher (BE #296, deploy-dormant #119) · `agent_run` /
  `agent_conversation` (mig 0163 applied) · `search_knowledge` orchestrator recall · org.yaml
  routing map (#1536 UNBUILT). **subject:** imperion.

## N2 · Correlate + ledger a multi-agent run (3-level correlation)
- **Owner / Stream:** Nova / 11.
- **Trigger:** any orchestrated turn that fans to ≥1 sub-agent (sequence dispatch, sub-agent
  enter/exit).
- **Terminal outcome:** a complete 3-level correlated trace persisted —
  `conversation_id`(session/root) → `run_id`(turn) → `step_id`(+parent) — joinable in Postgres
  + App Insights, glass-box-inspectable in the `/jarvis` drill-in.
- **Procedure Steps:**
  1. `[automation]` Write `agent_run` per turn + per-step `agent_message`
     (routing.decided / subagent.enter|exit / tool.call / action.proposed), sub-agent name in
     tool_calls. **L2.**
  2. `[automation]` Map `conversation_id`/`run_id`/`step_id` → App Insights
     `operation_Id`/`operation_ParentId`; emit structured `[nova] <evt>` LAW log lines per the
     fixed event taxonomy. **L2.**
  3. `[automation]` On run completion or TTL, the reaper flips stuck `running`→`failed` (emit
     `run.reaped`); parked runs untouched. **L2.**
- **Driving policy:** TBD (#1586).
- **Realization:** spine procedure — shared sub-procedure referenced by N1 and by every stream
  1–10 (the audit substrate; streams point here rather than re-listing ledger writes).
- **Autonomy ceiling:** L2 (observability write only; no world-change). `always_gate`: n/a
  (internal-reversible ledger writes).
- **Human-in-loop:** Mark/Derek as glass-box reviewers (read drill-in); no approval needed —
  this is the audit substrate that *enables* every other gate. Never recedes below "human can
  always inspect."
- **Substrate deps:** `agent_run` / `agent_message` (mig 0163) · LAW sink (sanctioned) ·
  run-reaper (BE #290, dormant #119). **subject:** imperion.

## N3 · Manage orchestration context + memory (context/memory management)
- **Owner / Stream:** Nova / 11.
- **Trigger:** each turn (context assembly) + post-turn (memory sweep of transcribed
  conversations).
- **Terminal outcome:** the right grounding loaded for the turn (OKF-room reads + semantic
  recall, sources cited, never fabricate on empty) AND verbatim turns captured → enriched to
  silver `memory_enrichment` for faithful recall.
- **Procedure Steps:**
  1. `[automation]` Assemble turn context per retrieval doctrine: OKF-grounded reads for facts
     (`pg.read` / declared `okf_rooms`), semantic recall for context (`search_knowledge`), cite
     sources, refuse-on-empty rather than fabricate. **L2.**
  2. `[automation]` Pull-by-query gold recall (two-level: gold summary → drill verbatim bronze)
     — DORMANT until Voyage #389 + gold hydration. **L2.**
  3. `[automation]` Post-turn: memory-sweep drains transcribed conversations → captureTurn +
     enrichTurn (Haiku → silver `memory_enrichment`). **L2.**
- **Driving policy:** TBD (#1586).
- **Realization:** spine procedure, shared sub-procedure.
- **Autonomy ceiling:** L2 (internal reversible memory writes). `always_gate`: writes that would
  cross the personal→company wall (never auto — separate promotion path).
- **Human-in-loop:** owner-scoped; the Personal Curator surfaces contradictions for the owner's
  approve. Recedes with dial on enrichment confidence; contradiction-resolution stays human.
- **Substrate deps:** `memory_enrichment` (mig 0173, prod-apply Mark-gated) · gold ranker /
  `knowledge_object` / embeddings (DORMANT, #389) · Universal Memory MCP (orchestrator-only).
  **subject:** imperion.

## N4 · Engage a killswitch / handle a circuit-break (killswitch handling)
- **Owner / Stream:** Nova / 11.
- **Trigger:** a human-pulled kill-switch (3-scope: global / per-agent / per-workflow) OR an
  auto circuit-break (≥3 rejects in the last 10 → auto-freeze workflow + demote rung).
- **Terminal outcome:** the targeted scope HALTED (no further dispatch/actuation in scope),
  `killswitch.engaged` / `autonomy.demoted` emitted, in-flight runs parked, human notified.
- **Procedure Steps:**
  1. `[gui-step]` Human flips the kill-switch in the operator surface (or the circuit-breaker
     auto-trips the narrowest scope first). [hand-off from: human OR gauntlet gate]
  2. `[automation]` Nova stops routing/dispatch into the killed scope (gauntlet gate 1 =
     killswitch); parks/holds in-flight sequences (`sequence.parked`). **L2.**
  3. `[automation]` Emit `killswitch.engaged` + notify; on circuit-break also `autonomy.demoted`
     (rung demote, workflow freeze). **L2.**
  4. `[hybrid]` Resume requires a human un-flip / re-arm (audited, reversible).
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/nova/` checkpoint / sub-procedure; partly backend-enforced.
- **Autonomy ceiling:** L2 (Nova enforces the stop; does not actuate around it). `always_gate`:
  re-arming / un-killing is ALWAYS human.
- **Human-in-loop:** Mark/Derek pull + re-arm; the engage path is the one place a human's stop
  OVERRIDES the dial entirely (dial-proof safety). Never recedes — kill + re-arm stay human at
  every level.
- **Substrate deps:** killswitch 3-scope + circuit-breaker (backend, jarvis-design;
  deploy-dormant #119) · #272 circuit-breaker / #271 caps (open). **subject:** imperion.

## N5 · Route a Mark-gated call to the single human queue (gatekeeper hand-off)
- **Owner / Stream:** Nova / 11.
- **Trigger:** any sub-agent action the gauntlet flags `always_gate` / above-ceiling
  (customer-facing · money · prod-migration · deploy · X.0.0).
- **Terminal outcome:** the action PARKED into the one human queue (Teams Adaptive Card via
  Power Automate primary; in-app cockpit fallback), the approve/edit/reject decision relayed
  back, the run resumed or marked failed-at-N.
- **Procedure Steps:**
  1. `[automation]` Detect the parked ProposedAction/sequence (gauntlet gate 8 hard_ceiling).
     [hand-off from: sub-agent gauntlet] **L2.**
  2. `[automation]` Post the approval card (rationale + triage class + consent basis +
     tier/dataClass) to the single human queue; TTL default 7 days. **L2.**
  3. `[gui-step]` Human approves / edit-and-approves / rejects. [hand-off to: human]
  4. `[automation]` On approve, relay verbatim `input` to the ADR-0058 send path (re-assert
     consent/grounding); else mark failed/parked; harvest the decision → eval. **L2.**
- **Driving policy:** TBD (#1586).
- **Realization:** spine + cockpit; shared sub-procedure referenced by N1 and every send across
  streams 1–10 (the generic single-human-queue mechanism the C-suite escalation steps feed).
- **Autonomy ceiling:** L2 (Nova ROUTES the gate; never self-approves). `always_gate`: the
  routed actions are by definition dial-proof — Nova cannot collapse the queue.
- **Human-in-loop:** Mark (+ the role-paired human) IS the queue. This is "the real ceiling"
  (one reviewer, many sessions). Does NOT recede — the always_gate floor is exactly this queue.
- **Substrate deps:** Teams Cards + Power Automate (#274) · `agent_pending_action` (mig 0163) ·
  cockpit `/operator/cockpit` (#1014) · gauntlet #263 (built, dormant #119). **subject:** imperion.

---

## C-SUITE archetype — scheduled cross-division SYNTHESIS BRIEF + division-orchestration

Each C-suite agent is delegate-only L2, read + recall, NO actuation. Its **synthesis brief**
rolls up the division's state for the paired human (a read-only artifact — no external send, no
gate); its **division-orchestration** is pure delegate/handoff routing within the division +
escalation into Nova N5. A C-suite agent's division-*member* operational procedures (Felix
triage, Cyrus alert-triage, Holly onboarding, …) live in those members' own streams (1–10) —
NOT duplicated here.

## R1 · Compose Rachel's daily-brief (synthesis brief → Derek)
- **Owner / Stream:** Rachel (Chief of Staff) / 11. **Serves:** Derek. **Division:** Internal
  Ops / G&A (Holly, Laurel, per-employee-brain, dogfood).
- **Trigger:** schedule (daily, cron via timer — deploy-dormant #119).
- **Terminal outcome:** a cross-division status brief delivered to Derek — priorities, blockers,
  decisions-needed.
- **Procedure Steps:**
  1. `[automation]` Recall + read across G&A division state (HR/onboarding pipeline,
     legal/contract queue, brain-program + dogfood status) via `pg.read` / `memory.recall`.
     [hand-off from: division members' streams — read-only, no re-run] **L2.**
  2. `[automation]` Aggregate cross-division status / priorities / blockers; flag
     decisions-needed. **L2.**
  3. `[hybrid]` Render Derek's brief; deliver (read-only artifact — no external send → no gate);
     Derek consumes + decides.
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/chief-of-staff/daily-brief/` (ICM Workspace).
- **Autonomy ceiling:** L2 delegate-only. `always_gate`: holds NO actuation grant — any implied
  action routes back through the owning sub-agent's gauntlet.
- **Human-in-loop:** Derek consumes + makes the calls. Recedes: at low dial Rachel drafts for
  review; at high dial auto-delivers, but every *decision* the brief surfaces is Derek's.
  always_gate floor: n/a (read-only synthesis).
- **Substrate deps:** retrieval tier #1537 (recall) · timer #119 · org.yaml division map #1536 ·
  cross-agent handoff substrate #991. **subject:** imperion.

## R2 · Orchestrate the G&A division (delegate/handoff + escalate-to-human)
- **Owner / Stream:** Rachel / 11.
- **Trigger:** Nova delegates a G&A request, OR a division member emits a handoff/escalation
  (HR / legal / brain / dogfood).
- **Terminal outcome:** the request routed to the right G&A sub-agent (Holly/Laurel) OR
  escalated to Derek; division coherence maintained.
- **Procedure Steps:**
  1. `[automation]` Receive the delegation from Nova / member handoff. [hand-off from: Nova N1 OR
     member stream] **L2.**
  2. `[automation]` Classify → delegate to Holly (HR) / Laurel (Legal) / brain-program / dogfood
     owner via the `handoff` cap. **L2.**
  3. `[hybrid]` On cross-division or human-judgment items, escalate to Derek (the single
     human-queue path, → N5).
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/chief-of-staff/` room-level routing.
- **Autonomy ceiling:** L2 delegate-only. `always_gate`: no actuation — member gauntlets apply.
- **Human-in-loop:** Derek for division escalations. Recedes with dial on routing confidence;
  member-level always_gate (Holly identity/JML, Laurel binding contract) stays gated.
- **Substrate deps:** `relationship.*` / handoff bus #437 / #991 · org.yaml #1536.
  **subject:** imperion.

## D1 · Compose Dexter's delivery-pulse (synthesis brief)
- **Owner / Stream:** Dexter (CTO) / 11. **Serves:** Derek / Mark / Luke / Brandon / Anna.
  **Division:** Service Delivery & Eng (Felix, Ozzie, Sage, Marshall, Scout, Phoenix, Pierce).
- **Trigger:** schedule (recurring).
- **Terminal outcome:** an exec delivery summary — backlog / SLA / incidents / problems /
  change-calendar / capacity rolled up + risks flagged.
- **Procedure Steps:**
  1. `[automation]` Recall + read across delivery/eng state: ticket backlog + SLA, open incidents
     (Ozzie), problems (Sage), change calendar (Marshall), dispatch load (Scout), backup posture
     (Phoenix), project status (Pierce). [hand-off from: streams 3–6 — read-only] **L2.**
  2. `[automation]` Roll up; compute risks (SLA-breach trends, capacity gaps, change collisions).
     **L2.**
  3. `[hybrid]` Render the exec summary + risks; deliver to eng leadership (read-only).
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/cto/delivery-pulse/` (ICM Workspace).
- **Autonomy ceiling:** L2 delegate-only. `always_gate`: no actuation.
- **Human-in-loop:** Derek / Mark / Luke / Brandon / Anna consume. Recedes with dial on
  auto-compile; risk-driven *actions* route to the owning sub-agent gauntlet. always_gate floor:
  n/a (read-only).
- **Substrate deps:** retrieval tier #1537 · timer #119 · org.yaml #1536 · member streams' silver
  entities (incl. #1577 problem/known_error, #1578 monitoring bronze, #1579
  change_freeze/rollback). **subject:** imperion.

## D2 · Orchestrate the Service Delivery & Eng division (delegate + escalate)
- **Owner / Stream:** Dexter / 11.
- **Trigger:** Nova delegates a delivery/eng request, OR a member escalates (incident sev,
  problem, change risk, capacity).
- **Terminal outcome:** routed to the right delivery/eng sub-agent OR escalated to the human eng
  leads.
- **Procedure Steps:**
  1. `[automation]` Receive the delegation/handoff. [hand-off from: Nova N1 OR member] **L2.**
  2. `[automation]` Delegate to Felix / Ozzie / Sage / Marshall / Scout / Phoenix / Pierce per
     archetype. **L2.**
  3. `[hybrid]` Escalate cross-division / human-judgment items (major incident, architecture
     call) to Derek / Luke / Brandon / Anna (→ N5).
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/cto/` room-level routing.
- **Autonomy ceiling:** L2 delegate-only. `always_gate`: no actuation; member ceilings apply
  (Ozzie/Cyrus L4 reversible-auto, destructive/identity gated).
- **Human-in-loop:** eng leads on escalation. Recedes with dial on routing; member always_gate
  (prod remediation, identity, DCs) stays.
- **Substrate deps:** handoff bus #437 / #991 · org.yaml #1536. **subject:** imperion.

## O1 · Compose Roman's security-posture-brief (synthesis brief → Mark)
- **Owner / Stream:** Roman (Deputy CISO) / 11. **Serves:** Mark. **Division:** Security &
  Compliance (Cyrus, Grace, Osiris).
- **Trigger:** schedule (recurring) OR on-incident.
- **Terminal outcome:** Mark's security brief — SOC + GRC + Identity posture rolled up +
  escalations.
- **Procedure Steps:**
  1. `[automation]` Recall + read across SOC alert/incident posture (Cyrus), control/evidence +
     compliance drift (Grace), identity/JML state (Osiris). Audit-by-reference (never reproduce
     credential/PII values). [hand-off from: Stream 7 — read-only] **L2.**
  2. `[automation]` Roll up posture; flag escalations (active incident, control failure, IAM
     drift). **L2.**
  3. `[hybrid]` Render Mark's brief; deliver; the on-incident path delivers immediately.
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/deputy-ciso/security-posture-brief/` (ICM Workspace).
- **Autonomy ceiling:** L2 delegate-only. `always_gate`: no actuation; all remediation routes to
  member/human (security data_class is always-gate).
- **Human-in-loop:** Mark (CISO) consumes + decides remediation. Never recedes on security
  decisions — Mark holds the security veto; the brief auto-compiles, the decisions stay Mark's.
- **Substrate deps:** retrieval tier #1537 · timer #119 · org.yaml #1536 · posture/SOC silver
  (Stream 7, #1578 monitoring bronze) · audit-by-reference read scope. **subject:** imperion.

## O2 · Orchestrate the Security & Compliance division (delegate + escalate)
- **Owner / Stream:** Roman / 11.
- **Trigger:** Nova delegates a security/compliance request, OR a member escalates (incident,
  control gap, identity event).
- **Terminal outcome:** routed to Cyrus / Grace / Osiris OR escalated to Mark.
- **Procedure Steps:**
  1. `[automation]` Receive the delegation/handoff. [hand-off from: Nova N1 OR member] **L2.**
  2. `[automation]` Delegate to SOC (Cyrus) / GRC (Grace) / Identity-JML (Osiris). **L2.**
  3. `[hybrid]` Escalate to Mark on every security-decision / remediation-commit (security =
     always Mark, → N5).
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/deputy-ciso/` room-level routing.
- **Autonomy ceiling:** L2 delegate-only. `always_gate`: no actuation; member remediation + any
  credential/security data_class always gated.
- **Human-in-loop:** Mark. Does not recede on remediation — Roman drafts/routes, Mark decides.
- **Substrate deps:** handoff bus #437 / #991 · org.yaml #1536. **subject:** imperion.

## S1 · Compose Sterling's financial-pulse (synthesis brief → Nick)
- **Owner / Stream:** Sterling (Deputy CFO) / 11. **Serves:** Nick. **Division:**
  Revenue/Client/Finance (Chase, Belle, Celeste, Vance, Audrey).
- **Trigger:** schedule (recurring).
- **Terminal outcome:** Nick's financial brief — AR/AP / margin / revenue / pipeline rolled up +
  flags (unprofitable work, at-risk revenue).
- **Procedure Steps:**
  1. `[automation]` Recall + read across finance/revenue state: AR/AP + margin (Audrey,
     read-only), pipeline (Chase), engagement (Belle), account health/churn (Celeste), vendor
     spend (Vance). **Salary/comp non-disclosure honored** (aggregate, never individual Pay
     Rate). [hand-off from: streams 2/8/9 — read-only] **L2.**
  2. `[automation]` Roll up; flag unprofitable work + at-risk revenue. **L2.**
  3. `[hybrid]` Render Nick's brief; deliver (read-only).
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/deputy-cfo/financial-pulse/` (ICM Workspace).
- **Autonomy ceiling:** L2 delegate-only, read-heavy. `always_gate`: no actuation; money movement
  is QBO-SoR / human only.
- **Human-in-loop:** Nick (CFO) consumes + decides. Recedes with dial on auto-compile; every
  money decision stays Nick's. always_gate floor: comp non-disclosure (never emit individual
  salary, even to Nick's brief — aggregate only).
- **Substrate deps:** retrieval tier #1537 · timer #119 · org.yaml #1536 · finance silver
  (Stream 9, QBO read-only, #1580 AR/invoice) · payroll-RLS (comp gag). **subject:** imperion.

## S2 · Orchestrate the Revenue/Client/Finance division (delegate + escalate)
- **Owner / Stream:** Sterling / 11.
- **Trigger:** Nova delegates a revenue/finance request, OR a member escalates (margin risk,
  churn signal, renewal money gate, AR aging).
- **Terminal outcome:** routed to Chase / Belle / Celeste / Vance / Audrey OR escalated to Nick.
- **Procedure Steps:**
  1. `[automation]` Receive the delegation/handoff. [hand-off from: Nova N1 OR member] **L2.**
  2. `[automation]` Delegate to the right revenue/client/finance sub-agent. **L2.**
  3. `[hybrid]` Escalate money-gate / binding-commitment items to Nick (single human queue, → N5).
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/deputy-cfo/` room-level routing.
- **Autonomy ceiling:** L2 delegate-only. `always_gate`: no actuation; member money/commitment
  steps always gated.
- **Human-in-loop:** Nick. Does not recede on money/commitments.
- **Substrate deps:** handoff bus #437 / #991 · org.yaml #1536. **subject:** imperion.

## J1 · Compose Jessica's risk-assurance-sweep (synthesis brief → Mark)
- **Owner / Stream:** Jessica (Chief Risk Officer) / 11. **Serves:** Mark. **Division:**
  Platform & Assurance (Vera, Tess, Lexicon).
- **Trigger:** schedule (recurring).
- **Terminal outcome:** Mark's risk brief — conformance / quality / telemetry / control-drift
  rolled up + quarantine flags.
- **Procedure Steps:**
  1. `[automation]` Recall + read across assurance state: conformance/deviation findings (Vera),
     ticket/service quality (Tess), doc-hygiene/knowledge drift (Lexicon), agent telemetry/eval
     scores. Audit-by-reference. [hand-off from: Stream 7/10 — read-only] **L2.**
  2. `[automation]` Roll up the risk picture; surface quarantine flags + control-drift. **L2.**
  3. `[hybrid]` Render Mark's risk brief; deliver (read-only).
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/cro/risk-assurance-sweep/` (ICM Workspace).
- **Autonomy ceiling:** L2 delegate-only. `always_gate`: no actuation; every
  correction/quarantine-promotion routes to owner/Mark (framework-owned earned-autonomy state
  machine — observe only).
- **Human-in-loop:** Mark (risk reports to Mark). Recedes with dial on auto-compile;
  quarantine/correction decisions stay human. always_gate floor: standard ratification +
  governance-config = always Mark.
- **Substrate deps:** retrieval tier #1537 · timer #119 · org.yaml #1536 · conformance / eval /
  telemetry substrate (#983 / #990 / #1412, partly UNBUILT) · audit-by-reference.
  **subject:** imperion.

## J2 · Orchestrate the Platform & Assurance division (delegate + escalate)
- **Owner / Stream:** Jessica / 11.
- **Trigger:** Nova delegates an assurance/quality/governance request, OR a member escalates
  (conformance deviation, quality miss, doc-drift, telemetry anomaly).
- **Terminal outcome:** routed to Vera / Tess / Lexicon OR escalated to Mark.
- **Procedure Steps:**
  1. `[automation]` Receive the delegation/handoff. [hand-off from: Nova N1 OR member] **L2.**
  2. `[automation]` Delegate to Vera (conformance) / Tess (QA) / Lexicon (doc-hygiene → IT Glue
     SoT). **L2.**
  3. `[hybrid]` Escalate quarantine / standard-change / governance-config items to Mark (→ N5).
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/cro/` room-level routing.
- **Autonomy ceiling:** L2 delegate-only. `always_gate`: no actuation; member corrective / config /
  standard-change always gated (Vera/Tess top at L2).
- **Human-in-loop:** Mark. Does not recede on governance/standard decisions.
- **Substrate deps:** handoff bus #437 / #991 · org.yaml #1536. **subject:** imperion.

---

## Provable-coverage note

Orchestration spine fully covered: intake routing (N1), 3-level correlation/ledger (N2),
context & memory (N3), killswitch handling (N4), the single human queue (N5). Each of the 5
C-suite agents covered by its two load-bearing procedures: a scheduled cross-division
synthesis brief for the paired human + within-division delegate/handoff orchestration — Rachel
(R1/R2 → Derek), Dexter (D1/D2), Roman (O1/O2 → Mark), Sterling (S1/S2 → Nick), Jessica (J1/J2
→ Mark). Routing is hierarchical (Nova ACROSS divisions; each C-suite WITHIN), so the 5
division-orchestration procedures are not duplicates of N1; N2 and N5 are shared sub-procedures
the rest of the catalog (streams 1–10) references rather than re-lists. All L2 delegate-only —
no actuation grant; every world-changing act inherits the executing sub-agent's gauntlet +
ceiling. Whole stream UNBUILT: `icm/executive/` + `icm/org.yaml` pending #1536 (exec-tier ADR
foundation #1535 MERGED as ADR-0131).

**Count: 15 Operating Procedures** (Nova 5: N1–N5; C-suite 10 = 5 × {synthesis-brief +
division-orchestration}: R1/R2, D1/D2, O1/O2, S1/S2, J1/J2).
