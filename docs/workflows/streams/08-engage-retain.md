# Stream 08 — Engage → Retain

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

**Owner agent:** Celeste (Client Success / vCIO / vCISO), reports to Jessica (CRO). **Owning ICM
domain:** `icm/domains/client-success/`. **Stream scope:** the active-customer **relationship hub /
client-360** — Handoff Hub intake → Account Success Plan → QBR/TBR → health/churn → Client Risk
Register → expansion mint→assign→Chase → vCIO advisory → vCISO advisory (advisory-only).

**Core design rule (Celeste is the relationship hub + a synthesis engine, never an actuator of
commitment).** This stream is the canonical showcase of doctrine **B3 synthesis-brief** (account
plans, QBR/TBR, health, vCIO/vCISO advisory) and **A11 (obligation/action separation)**: Celeste
owns the *relationship/clock/standard* (synthesize the client-360, brief, recommend, **park**);
the *binding act* — the close, the purchase, the remediation — is owned by another agent or a human
under THEIR ceiling. Every B3 brief is a **launchpad, not a readout**: an actionable item
**auto-spawns the owning worker procedure in a parked/draft state** for one-click human launch from
inside the brief; **Celeste never actuates** (she delegates down/out by pre-staging the gated step).

**Celeste's HARD ceilings (dial-proof `always_gate` floors on ALL 14 procedures, inherited A2 — no
rung, no earned autonomy crosses them):**
- **NO-COMMITS-EVER:** every binding commitment — roadmap · SLA · pricing · spend ·
  security-remediation — routes as a *recommendation* to a human (A2 class-2/6; celeste.md guardrail
  1; ladder ADR-0128). A roadmap/budget/SLA is a binding-class artifact: **no clean undo once
  committed ⇒ `always_gate` forever** (A10 row 4).
- **MSSP / vCISO advisory-only:** security = visibility · posture · risk · recommendations;
  remediation is human / Datto; **no compliance-management** (v1 exclusion) (A2 class-5; guardrail 2).
- Plus: **signal-vs-inference** (the A5 evidence floor in this stream — never invent health/sentiment;
  every flag carries its source + as-of, empty→park, guardrail 3) · **non-interest upsell** (never
  recommend spend for Imperion revenue alone, guardrail 4) · **client-confidential** (A7
  pool-never-bleed — Celeste may cross-correlate the whole client pool internally to sharpen a
  benchmark/recommendation, but one client's identifiable data never surfaces in another's brief/QBR;
  external peer insight is **anonymized/aggregated only** ("peers in your size band average X");
  `{operational, client_pii}` under `client_pii` data_class, ADR-0118, guardrail 5).

**Pinned seam (Chase ↔ Celeste, A11):** Celeste owns the relationship; **Chase owns the close** of
any transaction inside it. Renewal-readiness (08-E) and expansion mint→assign (08-F) hand OUT to
Chase at an explicit Procedure Step; never duplicate his close/pricing procedures here — reference
them as the terminal step. The relationship-clock vs the transaction-act meet at the seam, never
co-own.

**Seams (every cross-agent hand-off is an explicit Procedure Step, A11):** handoffs-IN from every
other agent (Chase/Pierce/Audrey/Belle/Felix/Vance/Vera → 08-A, the client-360 intake);
renewal-OUT → Chase (08-E); expansion-OUT → Chase (08-F); refresh/vendor-OUT → Vance (08-I/J);
margin-grounding-IN → Audrey (read-only); posture-grounding-IN → Vera (vCISO measures, Celeste
presents); remediation-OUT → human/Datto (08-K/L/M).

**Archetype map (B-templates this stream instantiates).**

| Procedure | Archetype |
|---|---|
| 08-A handoff intake / client-360 | **B1 triage/route** (+ fold/synthesize) |
| 08-B Account Success Plan | **B3 synthesis-brief** (launchpad) |
| 08-C QBR/TBR | **B3 synthesis-brief** (launchpad) |
| 08-D health & churn; intervene | **B3 synthesis-brief** + **B7 client-send** (save touch) |
| 08-E renewal readiness → Chase | **B3 synthesis-brief** → **A11 seam** to Chase |
| 08-F expansion mint→assign → Chase | **B3 synthesis-brief** → **A11 seam** to Chase (pinned) |
| 08-G vCIO roadmap / strategic plan | **B3 synthesis-brief** (binding-class → L1) |
| 08-H IT budget / forecast | **B3 synthesis-brief** (spend → L1) |
| 08-I tech lifecycle / refresh | **B3 synthesis-brief** → **A11 seam** to Vance |
| 08-J vendor / solution eval | **B3 synthesis-brief** → **A11 seam** to Vance |
| 08-K vCISO posture report | **B3 synthesis-brief** (MSSP advisory-only) |
| 08-L Client Risk Register | **B3 synthesis-brief** (register maintain) |
| 08-M awareness / enablement | **B3 synthesis-brief** (advisory) |
| 08-N proactive updates + knowledge | **B7 client-facing-send** (L3→L4) |
| 08-O offboard a client (termination → data-return + deprovision) 💤 | **B8 provision-with-undo (reverse)** + **B5 JML** + **B9** (retention clock) + **B6/B7** peels |
| 08-P issue an SLA-breach service credit 💰 | **B6 money-gate** (obligation/action separation A11) |
| 08-Q relationship recovery / save-the-account (acute) 💤 | **B3 synthesis-brief** (save plan) + **B7 client-send** (executive recovery touch) |

**Driving policy (every procedure):** inherits the doctrine universal baseline (ADR-0136 A2/A4/A5)
+ `TBD (mark-blocker: company-policy-collection)` for the 1–3 specific drivers (D4, #1586). Policies
Celeste's procedures lean hardest on (highest-value collection entries): Client Success / QBR
cadence · churn-intervention / save-offer · MSSP advisory-scope (present vs route to Datto). Mapped
in the #1586 pass.

**Dormancy flags:** ⚠️ **#991** cross-agent handoff/event bus (the load-bearing dep — without it the
client-360 has no input and most of the stream is dormant) · **#389** Voyage embeddings (worker
semantic recall — TABLED, gates real autonomy) · **#119** trigger-sync (deploy-dormant until synced).
Per A5c, deepened steps that depend on these ship **propose-only** until built and say so rather than
present dormant data as live. **subject:** client | imperion — every procedure runs once;
Imperion-itself is a managed client (dogfood, D7.2); default = both. **Realization:** Celeste domain
tier landed (PR #1507: `icm/domains/client-success/` room + `celeste.md` + client-360 handoff-intake
workflow + `strategic_business_review` okf_room). **realized** = ICM Workspace is/becomes SoR (the one
uniform dual-audience document, A8); **procedure-only** = `docs/runbooks/08-engage-retain/` until an
automatable step graduates it (D5).

---

## 08-A · Intake & fold a cross-agent Handoff into the client-360 ⚡
- **Owner / Stream:** Celeste / 08. **Archetype:** B1 triage/route (the handoff-hub intake — fold +
  synthesize into the client-360).
- **Trigger:** a `relationship.*` Handoff event from any agent (Chase→won/renewal · Pierce→
  delivery-complete+retro · Audrey→margin/AR/financial-health · Belle→engagement/sentiment ·
  Felix→service-pattern/incident · Vance→vendor/EOL/risk · Vera→governance/posture).
- **Terminal outcome:** the account's client-360 is updated; the handoff logged; any derived signal
  routed to its owning downstream procedure (health, ASP, risk register, expansion).
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition → log):
  1. `[automation]` **Ground** — consume the Handoff off the cross-agent bus, **citing the source
     agent + as-of** (A5); resolve to an `account` via Client Mapping; empty/unparseable → park.
     **SEAM: HAND-OFF IN from every other agent** (Chase/Pierce/Audrey/Belle/Felix/Vance/Vera) — the
     seam that makes Celeste the client-360 (A11; each handoff carries its rationale attributed
     up-chain). **L0.**
  2. `[automation]` **Classify** the signal (health / financial / service / vendor / posture /
     engagement / lifecycle); label **signal vs inference** (A5 — every flag carries its evidence).
     **L2.**
  3. `[automation]` **Fold + log** into the account picture; append to the handoff log — routing
     auto-executes at L2 (B1 — fold/log/route is internally reversible, A10 row 1). Pool-correlate the
     signal against the base internally only (A7 — never let one client's specifics surface in
     another's picture).
  4. `[hybrid]` **Disposition** — route the derived signal to its owning procedure (→ 08-D health,
     08-B ASP, 08-I/J/L risk register) — internal routing, no external touch. **B1 carve-out:** a
     signal implying a binding commitment parks downstream (NO-COMMITS), never auto-actuates here.
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace (handoff-intake workflow, landed PR #1507) — **live SoR**.
- **Autonomy ceiling:** **L2** (auto fold/log/route — internally reversible, A10 row 1). No external
  touch here; any *commitment* the signal implies inherits NO-COMMITS downstream. No `always_gate`
  step here (all internal).
- **Human-in-loop:** Jessica (CRO) / CS-lead (paired). L1 = human reviews the fold; L2 auto. Recede
  L0→L2 per A3 (ships observe-only).
- **Substrate deps:** ⚠️ **#991 (the load-bearing dep)**, #119, #389 (recall). **subject:** both.
  **Maps to:** #1443. **(OWNERSHIP: clean — Celeste owns the client-360 hub; each upstream agent owns
  its own signal, A11.)**

## 08-B · Maintain the Account Success Plan ⚡
- **Owner / Stream:** Celeste / 08. **Archetype:** B3 synthesis-brief (the ASP is a launchpad, not a
  static record — an actionable item spawns its owning worker procedure parked).
- **Trigger:** scheduled per-account review interval OR a material client-360 change from 08-A
  (new goal, value-realization shift, risk).
- **Terminal outcome:** the living ASP (goals · value-realization · next actions) is current and
  human-co-shaped; each next-action is a one-click launchpad to its owning gated procedure.
- **Procedure Steps** (B3: gather → synthesize → narrate → deliver → log):
  1. `[automation]` **Gather** — pull current client-360 + last ASP version, **each goal/signal cited
     + as-of** (A5); diff for stale goals / new signals. **L0.**
  2. `[hybrid]` **Synthesize + narrate** — draft updated goals + value-realization + next actions
     (L2 maintain; signal-vs-inference labeled; anonymized cross-client benchmark only, A7; dormancy
     flagged honestly, A5c); reasoning attributed up-chain (P2). Teams-loop co-shape.
  3. `[gui-step]` **Deliver (launchpad)** — human (CS-lead) co-shapes + accepts in-app; each
     **actionable item auto-spawns the owning worker procedure parked/draft** for one-click launch
     (B3 launchpad — Celeste never actuates). **`always_gate` (A2): any binding commitment** (SLA/spend/
     roadmap) in the plan routes as a *recommendation* to a human — never auto-commits at any dial.
  4. `[automation]` **Log** — persist the ASP version (audited; attested original preserved).
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace once the ASP write path lands; **procedure-only** until then.
- **Autonomy ceiling:** **L2** (maintain internal record + pre-stage the launchpad = reversible
  internal, A10 row 1). Any embedded commitment = `always_gate` (A10 row 4: roadmap/SLA/spend has no
  clean undo → gated forever).
- **Human-in-loop:** Jessica (CRO) / CS-lead. L1 co-shape+approve → L2 draft-solo + approve-only.
  **always_gate floor:** any binding commitment in the plan never auto-commits (A3 floor).
- **Substrate deps:** ASP store (backend-owed); #991 live signal feed; #389 recall. **subject:** both.
  **Maps to:** #1444.

## 08-C · Prepare & facilitate a QBR/TBR ⚡
- **Owner / Stream:** Celeste / 08. **Archetype:** B3 synthesis-brief (the QBR/TBR is the archetypal
  launchpad — a cross-division brief whose action items pre-stage owning procedures).
- **Trigger:** the QBR/TBR cadence falls due for an account (quarterly/scheduled review).
- **Terminal outcome:** a QBR/TBR packet assembled from ASP + reads, the review delivered, outcomes/
  next-actions captured back into the ASP and risk register, each action one-click-launchable.
- **Procedure Steps** (B3: gather → synthesize → narrate → deliver → log):
  1. `[automation]` **Gather (cross-division, cite)** — `strategic_business_review` (OKF) + ASP +
     Audrey financial-health reads (read-only) + posture summary (vCISO) + lifecycle/EOL, **each
     source cited + as-of** (A5); empty→park. **L0.**
  2. `[hybrid]` **Synthesize + narrate** — draft the QBR/TBR deck/agenda (L2 assemble; signal-vs-
     inference labeled; cross-client benchmark anonymized/aggregated only, A7; dormant feeds flagged,
     A5c); attributed up-chain (P2).
  3. `[gui-step]` **Deliver (launchpad)** — human reviews/edits; the review is delivered to the
     client; each action item **auto-spawns its owning worker procedure parked** for one-click launch
     (Celeste delegates, never actuates). **`always_gate` (A2 class-2/6):** any roadmap/SLA/pricing/
     spend item presented is a *recommendation*, never a commitment — the client-facing delivery itself
     is gated (A4 easy-button: drafted deck + grounded why + one-click send/edit + consequence preview).
  4. `[automation]` **Log** — capture outcomes → update ASP (08-B) + Client Risk Register (08-L).
- **Driving policy:** TBD (#1586) — Client Success / QBR cadence.
- **Realization:** ICM Workspace (assemble automatable) — realized; facilitation [gui-step] rides as a checkpoint.
- **Autonomy ceiling:** **L2** (assemble + capture + pre-stage launchpad = reversible internal, A10).
  Delivery/commitments human-gated.
- **Human-in-loop:** Jessica (CRO) / CS-lead facilitates. L1→L2 reduces drafting effort. **always_gate
  floor:** every commitment-class item stays a recommendation (A3 floor).
- **Substrate deps:** `strategic_business_review` OKF (exists); Audrey margin-grounding seam (#1415,
  read-only). **subject:** both. **Maps to:** #1445.

## 08-D · Monitor client health & churn risk; intervene 💤
- **Owner / Stream:** Celeste / 08. **Archetype:** B3 synthesis-brief (the health verdict) +
  **B7 client-facing-send** (the save touch). Urgency on a degrading account is computed (A6 — a churn
  window closing is urgent → dedicated chat).
- **Trigger:** scheduled health recompute OR a degrading signal from 08-A (recurring tickets,
  falling usage, sentiment drop, AR-aging).
- **Terminal outcome:** a per-account health/churn verdict (signal vs inference) flagged + surfaced;
  an at-risk account triggers a routine **save-outreach** intervention.
- **Procedure Steps:**
  1. `[automation]` **Synthesize** — compute health_score across signals (service patterns, usage,
     engagement/sentiment, financial-health), **each input cited + as-of** (A5); label signal vs
     inference; pool-correlate churn patterns across the base internally only (A7). **L2 compute+flag.**
  2. `[automation]` Surface at-risk accounts to the cockpit; record the churn flag with its evidence
     (A5 — no flag without provenance).
  3. `[hybrid]` **Churn-risk intervention (B7 send)** — draft routine save outreach (L3 auto low-risk
     external touch, execute-then-notify; share mechanism = 08-N L3, referenced not duplicated per D3);
     no fabricated capability/timeline/price in the message (A5); opt-out/frequency honored.
  4. `[gui-step]` **SEND GATE** — low dial = human approves; high dial = auto-sends only the
     *templated, non-committal* save touch (B7 transactional-ack carve-out, L3 execute-then-notify) —
     still **`always_gate` (A2 class-2)** if it carries any commitment/discount → routes to human.
- **Driving policy:** TBD (#1586) — churn-intervention / save-offer.
- **Realization:** ICM Workspace once health_score weighting + collectors land; **procedure-only /
  dormant** until then.
- **Autonomy ceiling:** **L3** (routine templated save outreach, execute-then-notify — externally
  reversible, declare-notify, A10 row 3). Any retention *offer*/discount = `always_gate` (money/term
  commitment, A2 class-1/2).
- **Human-in-loop:** Jessica (CRO) / CS-lead. L1 co-shapes; L3 auto routine touch. **always_gate
  floor:** no save-offer that commits pricing/term ever auto-sends (A3 floor).
- **Substrate deps:** 💤 **#1046 health_score weighting** + **#1369/#1370 interaction/comms
  collectors** (named blockers); #389 sentiment recall; #991 feed. Per A5c ships propose-only until
  weighting + collectors land. **subject:** both. **Maps to:** #1446.

## 08-E · Assess renewal readiness & route ⚡
- **Owner / Stream:** Celeste / 08. **Archetype:** B3 synthesis-brief (the readiness verdict) →
  **A11 seam** to Chase (Celeste owns the relationship-clock; Chase owns the close).
- **Trigger:** an upcoming `contract` expiration window opens (renewal: identified) OR a Chase
  renewal/expansion handoff.
- **Terminal outcome:** a renewal-readiness verdict (health + value-realization + risk) produced and
  routed to Chase (close) and Audrey (margin) — Celeste does **not** close.
- **Procedure Steps** (B3: gather → synthesize → deliver-as-handoff):
  1. `[automation]` **Gather** — pull contract expiry + client-360 + ASP value-realization + health
     verdict, **each cited + as-of** (A5). **L0.**
  2. `[automation]` **Synthesize** — produce a renewal-readiness assessment (at-risk? ready? reprice
     candidate?), labeled signal vs inference; benchmark anonymized only (A7). **L2.**
  3. `[hybrid]` **SEAM → Chase** (renewal transaction = his, A11) with **Audrey** margin-grounding
     (read-only, advise-only — she holds no clock here). **HAND-OFF OUT → Stream 02 (Chase) + Audrey
     #1394/#1415** (carries the rationale attributed up-chain). **B3 launchpad:** the routed assessment
     pre-stages Chase's renewal procedure parked for one-click launch.
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace (assessment automatable) — realized; the route is a handoff event.
- **Autonomy ceiling:** **L2** (assess + route internal = reversible, A10 row 1). The renewal
  send-for-signature is Chase's and is **`always_gate`** there (A2 class-2 — binding renewal has no
  clean undo, A10 row 4; not Celeste's to commit).
- **Human-in-loop:** Nick (finance, via Audrey margin) + Chase's human on the close. **always_gate
  floor:** the binding renewal lives in Stream 02, gated there (A11 seam).
- **Substrate deps:** `contract_renewal` model; Chase seam #1392; Audrey margin #1415. **subject:**
  both. **Seam:** Celeste→Chase. **Maps to:** #1447.

## 08-F · Mint, triage & assign an expansion opportunity (→ Chase) ⚡ — THE PINNED SEAM
- **Owner / Stream:** Celeste / 08. **Archetype:** B3 synthesis-brief (detect+mint the opportunity) →
  **A11 seam** to Chase. This procedure is the stream's canonical proof of obligation/action
  separation: Celeste mints + assigns the relationship-side opportunity, **Chase owns the close**.
- **Trigger:** expansion value detected in the client-360 (usage growth, unmet need, lifecycle/EOL
  refresh, advisory finding).
- **Terminal outcome:** an `opportunity` (kind=upsell/expansion) auto-created, triaged, and
  **assigned to a salesperson — Chase owns the close.**
- **Procedure Steps:**
  1. `[automation]` **Detect + ground** expansion value, **cited + as-of** (A5); check it is **not a
     non-interest upsell** (guardrail 4 — flag + stop if not in the client's interest, refusal-class).
     **L0.**
  2. `[automation]` Auto-create the `opportunity` (L2 internal write) + triage (qualify, size);
     pool-correlate similar expansion patterns internally only (A7).
  3. `[automation]` **SEAM → Chase** — assign to a salesperson. **HAND-OFF OUT → Stream 02 (Chase):
     Chase owns the close** (A11; the minted opp pre-stages his procedure parked, B3 launchpad).
     Celeste retains the relationship; the transaction lives inside her account.
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace — realized once the auto-create-opp write path + assignment routing
  land (backend-owed); procedure-only until then.
- **Autonomy ceiling:** **L2** (auto-create + triage + assign — all internal/reversible, A10 row 1).
  The close is Chase's; **pricing/term = `always_gate`** in Stream 02 (A2 class-2, A10 row 4).
- **Human-in-loop:** Chase's human owns the close + commitment. Celeste's side is internal-only.
  **always_gate floor:** no expansion *commitment* by Celeste at any level (A3 floor).
- **Substrate deps:** auto-create-opportunity write path + triage/assignment routing (backend-owed);
  Chase #1392. **subject:** both. **Seam:** Celeste→Chase (pinned). **Maps to:** #1448.

## 08-G · Draft the technology roadmap / strategic plan (vCIO) 💤
- **Owner / Stream:** Celeste / 08. **Archetype:** B3 synthesis-brief — but the artifact is
  binding-class, so the ceiling is pinned at **L1 propose** (A10 row 4: a committed roadmap has no
  clean undo → gated forever).
- **Trigger:** vCIO planning cadence OR a QBR/TBR that surfaces a strategic gap.
- **Terminal outcome:** a proposed technology roadmap / strategic plan drafted and routed as a
  **recommendation** to a human (NO COMMITS).
- **Procedure Steps** (B3: gather → synthesize → deliver-as-recommendation):
  1. `[automation]` **Gather** — assemble vCIO context (CMDB/lifecycle + posture + ASP + financial
     constraints), **each cited + as-of** (A5); empty→park. **L0.**
  2. `[hybrid]` **Synthesize** — draft the roadmap (L1 propose) — signal vs inference labeled; peer
     benchmark anonymized only (A7); dormant feeds flagged (A5c).
  3. `[gui-step]` **`always_gate` (A2 class-6)** — the roadmap routes as a *recommendation* to a human
     (B3 launchpad: each roadmap line pre-stages its owning procedure parked); never a commitment.
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only / dormant until #1043 vCIO assembly lands.
- **Autonomy ceiling:** **L1 propose** (NO-COMMITS ceiling is the operative bound — roadmap is a
  binding-class artifact, A10 row 4: never auto, gated forever).
- **Human-in-loop:** Mark / Jessica (CRO) + client. **always_gate floor:** roadmap commitment is
  human, always (A3 floor).
- **Substrate deps:** 💤 **#1043 vCIO assembly** (named blocker). Per A5c ships propose-only until it
  lands. **subject:** both. **Maps to:** #1449.

## 08-H · IT budget planning & forecasting (vCIO) 💤
- **Owner / Stream:** Celeste / 08. **Archetype:** B3 synthesis-brief — spend artifact, ceiling pinned
  at **L1 propose** (money out = A2 class-1, the irreversible row, A10 row 4).
- **Trigger:** budget-cycle cadence OR a QBR/TBR/roadmap that requires a spend forecast.
- **Terminal outcome:** a proposed IT budget / forecast drafted and routed as a **spend
  recommendation** to a human (NO COMMITS).
- **Procedure Steps** (B3: gather → synthesize → deliver-as-recommendation):
  1. `[automation]` **Gather** — pull profitability/spend reads (Audrey, read-only) + lifecycle/refresh
     + roadmap, **each cited + as-of** (A5). **L0.**
  2. `[hybrid]` **Synthesize** — draft the budget/forecast (L1 propose); benchmark anonymized only (A7).
  3. `[gui-step]` **`always_gate` (A2 class-1, money out)** — spend routes as a *recommendation*; no
     spend commitment (B3 launchpad: a line item pre-stages Vance/Audrey's gated procedure parked).
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only / dormant until #1043 + #1044.
- **Autonomy ceiling:** **L1 propose** (spend = NO-COMMITS ceiling; money out never auto, A10 row 4).
- **Human-in-loop:** Nick (finance) + Mark / Jessica (CRO) + client. **always_gate floor:** spend
  commitment is human, always (A3 floor).
- **Substrate deps:** 💤 **#1043 vCIO assembly + #1044 profitability/spend** (named blockers). Per A5c
  ships propose-only until they land. **subject:** both. **Maps to:** #1450.

## 08-I · Technology lifecycle / refresh planning (vCIO) ⚡
- **Owner / Stream:** Celeste / 08. **Archetype:** B3 synthesis-brief (the refresh plan) → **A11 seam**
  to Vance for any purchase (Celeste advises; Vance/human owns the money act).
- **Trigger:** asset EOL/refresh threshold crossed (CMDB lifecycle) OR QBR planning.
- **Terminal outcome:** an asset lifecycle + refresh plan (what's EOL, what to refresh, when)
  produced as advisory, feeding the roadmap/budget + expansion detection.
- **Procedure Steps:**
  1. `[automation]` **Gather** — read CMDB (`cloud_asset`/device) for EOL / refresh-due assets,
     **each cited + as-of** (A5). **L0.**
  2. `[automation]` **Synthesize** — produce a refresh plan (prioritized, signal vs inference); peer
     refresh-pattern benchmark anonymized only (A7). **L2.**
  3. `[hybrid]` **Deliver as advisory** → feeds 08-G/H + 08-F (expansion). **SEAM → Vance** +
     **`always_gate` (A2 class-1, money out)** if it implies a purchase commitment (B3 launchpad:
     pre-stages Vance's procurement procedure parked; Celeste never commits the spend).
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace (CMDB read automatable) — realized.
- **Autonomy ceiling:** **L2** (produce advisory = reversible internal, A10 row 1). Any purchase =
  `always_gate` (Vance/human, A10 row 4).
- **Human-in-loop:** Mark / Jessica (CRO) + client + Vance's human on procurement. **always_gate
  floor:** refresh *purchase* never auto-commits (A3 floor).
- **Substrate deps:** CMDB (`cloud_asset`/`device` exist; **direct read granted #1689** — Felix/Service
  owns the CMDB SoR, Celeste reads read-only, resolving the direct-read-vs-handoff contradiction); Vance
  procurement seam. **subject:** both. **Seam:** Celeste→Vance. **Maps to:** #1451.

## 08-J · Vendor / solution evaluation advisory (vCIO) ⚡
- **Owner / Stream:** Celeste / 08. **Archetype:** B3 synthesis-brief (the evaluation) → **A11 seam**
  to Vance for any procurement.
- **Trigger:** a client need for a new/replacement solution OR a Vance vendor-change handoff (price
  hike, EOL, vendor risk).
- **Terminal outcome:** a vendor/solution evaluation (options, tradeoffs, recommendation) delivered
  as advisory; any purchase routes to Vance/human.
- **Procedure Steps:**
  1. `[automation]` **Gather** — requirement + current stack (CMDB) + Vance vendor signals, **each
     cited + as-of** (A5); empty→park. **L0.**
  2. `[hybrid]` **Synthesize** — draft the evaluation (options · tradeoffs · recommendation), signal
     vs inference; cross-client vendor experience pooled internally, delivered anonymized/aggregated
     only (A7 — never name another client's deployment).
  3. `[gui-step]` **Deliver as advisory. SEAM → Vance (#1398)** for any procurement (B3 launchpad
     pre-stages his gated procedure parked); **`always_gate` (A2 class-1)** on the purchase commitment.
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace (assemble automatable) — realized.
- **Autonomy ceiling:** **L2** (advisory = reversible internal, A10 row 1). Purchase commit =
  `always_gate` (Vance, money ceiling architectural, A10 row 4).
- **Human-in-loop:** Mark / Jessica (CRO) + Vance's human. **always_gate floor:** procurement
  commitment is human/Vance-gated, always (A3 floor).
- **Substrate deps:** Vance seam #1398; CMDB. **subject:** both. **Seam:** Celeste→Vance. **Maps to:** #1452.

## 08-K · Security posture review & client reporting (vCISO, advisory-only) ⚡
- **Owner / Stream:** Celeste / 08. **Archetype:** B3 synthesis-brief (the posture report) — MSSP
  advisory-only is the dial-proof ceiling. This is the **A11** vCISO seam: Vera owns/measures the
  Client Security Standard, Celeste presents against it, human/Datto remediate — three distinct owners.
- **Trigger:** posture review cadence (quarterly snapshot) OR a Vera posture-change handoff OR a QBR/TBR.
- **Terminal outcome:** a client-facing security posture report (Imperion Secure Score + pillars +
  drift) produced and presented — **visibility/advisory only; remediation is human/Datto.**
- **Procedure Steps:**
  1. `[automation]` **Gather** — read `posture_snapshot` (Secure Score + Posture Pillars + Golden-State
     drift) for the account, **cited + as-of** (A5); empty/stale → say so, never present dormant
     posture as live (A5c). **L0.**
  2. `[hybrid]` **Synthesize** — compose the posture report + recommendations (signal vs inference;
     **advisory only**); peer posture benchmark anonymized/aggregated only (A7 — a threat seen at
     client A may sharpen B's recommendation, but A is never named).
  3. `[gui-step]` **Present to the client. `always_gate` / refuse-class (A2 class-5):** any
     **remediation commitment** routes to human/Datto — Celeste presents, never remediates (B3 launchpad
     pre-stages the remediation as a parked human/Datto action).
- **Driving policy:** TBD (#1586) — MSSP advisory-scope. **Note:** the Client Security Standard is
  **Vera-owned**; Celeste presents against it, does not own it (A11).
- **Realization:** ICM Workspace (read+compose automatable) — realized.
- **Autonomy ceiling:** **L3 max for the share** (auto-share at L3, approval at low dial — externally
  reversible report, A10 row 3); **remediation = MSSP advisory-only ceiling (dial-proof)** — never
  actuated.
- **Human-in-loop:** Mark (CISO) / Roman (dCISO) + Datto for remediation. **always_gate floor:** no
  remediation action by Celeste at any level (MSSP boundary, A3 floor).
- **Substrate deps:** `posture_snapshot` (exists; **direct read granted #1689** — `sec` data_class,
  audit-by-reference; Vera's segment owns the scoring, Celeste reads the measured snapshot read-only and
  never re-scores); Vera seam; #1310 posture. **subject:** both. **Maps to:** #1453.

## 08-L · Maintain the client-facing Client Risk Register (vCISO) ⚡
- **Owner / Stream:** Celeste / 08. **Archetype:** B3 synthesis-brief (the register is a living brief —
  each open risk is a launchpad to its owning gated remediation/escalation).
- **Trigger:** a new/changed risk signal from 08-A (churn, financial, service, vendor, security/
  posture) OR posture review.
- **Terminal outcome:** the per-client Client Risk Register (each risk labeled **signal vs
  inference**) is current and surfaced for advisory/QBR — **recommendations only, no remediation commitment.**
- **Procedure Steps:**
  1. `[automation]` **Gather** — aggregate risks across the five categories from the client-360,
     **each cited + as-of** (A5); label signal vs inference (no risk without provenance). **L0.**
  2. `[automation]` **Synthesize** — update the Client Risk Register (L2 internal maintain); pool-
     correlate risk patterns across the base internally only (A7).
  3. `[hybrid]` **Surface (launchpad)** for advisory/QBR (08-C) with recommendations; each open risk
     **pre-stages its owning remediation/escalation procedure parked** for one-click human launch.
     **`always_gate` (A2 class-5):** no binding remediation commitment (no-commits-ever, MSSP
     advisory-only).
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace / Risk Register store (backend-owed); procedure-only until store lands.
- **Autonomy ceiling:** **L2** (maintain register = reversible internal, A10 row 1). Remediation/
  commitment = `always_gate` + MSSP advisory-only.
- **Human-in-loop:** Mark (CISO) + client. **always_gate floor:** every register item stays a
  recommendation (A3 floor).
- **Substrate deps:** Risk Register store; #1310 posture; #991 risk-signal feed. **subject:** both. **Maps to:** #1454.

## 08-M · Security awareness / enablement recommendations (vCISO) ⚡
- **Owner / Stream:** Celeste / 08. **Archetype:** B3 synthesis-brief (the advisory) — the *framing*
  here vs the *actual share path* (08-N, B7) kept separate per A11 (recommend vs send).
- **Trigger:** a posture/awareness gap surfaced (phishing pillar, training gap) OR cadence.
- **Terminal outcome:** security awareness/enablement recommendations delivered to the client —
  **advisory only.**
- **Procedure Steps:**
  1. `[automation]` **Gather** — read posture + awareness signals, **cited + as-of** (A5); identify
     enablement gaps. **L0.**
  2. `[hybrid]` **Synthesize** — draft awareness/enablement recommendations; peer awareness benchmark
     anonymized only (A7).
  3. `[gui-step]` **Deliver as advisory** (shares 08-N's B7 share path). **`always_gate` (A2 class-5):**
     any program *commitment* (managed training service) routes to human (no-commits + MSSP
     advisory-only; B3 launchpad pre-stages the program procedure parked).
- **Driving policy:** TBD (#1586) — MSSP advisory-scope.
- **Realization:** procedure-only (advisory) until enablement-content substrate; the advisory framing
  (this) vs the actual share path (08-N) kept separate per filed leaves (#1455 vs #1456).
- **Autonomy ceiling:** **L3** (advisory share = externally reversible, A10 row 3). Commitment =
  `always_gate` + MSSP advisory-only.
- **Human-in-loop:** Mark + client. **always_gate floor:** no program commitment (A3 floor).
- **Substrate deps:** posture #1310; enablement content (**#1690 resolved: owned by Alivia/Knowledge
  + IT Glue back-sync LP #408; Celeste CONSUMES via `knowledge.search`, never authors** — grant landed,
  💤dormant on the content store + #389). **subject:** both. **Maps to:** #1455.

## 08-N · Proactive client updates + knowledge-asset sharing (L3→L4) ⚡
- **Owner / Stream:** Celeste / 08. **Archetype:** B7 client-facing-send (the stream's actuating
  send-procedure — proactive updates ride the transactional-ack carve-out toward L4).
- **Trigger:** an important update a client should know (advisory, notice) OR a knowledge-asset/
  how-to need surfaced (1Password, M365 enablement).
- **Terminal outcome:** clients receive timely important updates + knowledge assets — at L3 with
  approval / churn-save, at L4 routine how-to enablement fully automatically.
- **Procedure Steps** (B7: ground → compose → SEND GATE → send → log):
  1. `[automation]` **Ground** — detect the share-worthy update / knowledge asset from the client-360
     + knowledge base, **cited + as-of** (A5); empty/stale recall → park, never fabricate (A5c). **L0.**
  2. `[hybrid]` **Compose + SEND GATE (L3):** auto-share important updates + provide knowledge assets
     **WITH approval** + churn-save outreach (no fabricated capability/timeline/price; opt-out +
     frequency hard stops, B7); the share mechanism 08-D L3 invokes — shared sub-procedure per D3.
  3. `[automation]` **Send (L4 carve-out):** auto-share *routine, templated, non-committal* knowledge/
     enablement how-to (1Password, M365, etc.) fully automatically — B7 transactional-ack: deterministic
     trigger, zero free-form claims, opt-out respected (externally reversible, execute-then-notify,
     A10 row 2); idempotency-keyed so a replay is a no-op (A9b).
  4. *(ceiling)* **`always_gate` (A2 class-2):** any update carrying a commitment (SLA/pricing/
     remediation) parks for a human regardless of level (free-text/committal stays gated, B7).
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace (share path automatable) — realized; the L3→L4 progression workspace.
- **Autonomy ceiling:** **L4** (the stream max — routine reversible enablement auto-share, A10 row 2
  clean-undo allows L4). Commitment-class / free-text shares = `always_gate`.
- **Human-in-loop:** Jessica (CRO) / CS-lead. L3 = approval on important/save outreach; L4 = routine
  how-to auto. **always_gate floor:** commitment-bearing shares always park (A3 floor).
- **Substrate deps:** knowledge-asset store + #389 (semantic recall for relevance); #991 feed.
  **#1690 resolved:** the library is owned by Alivia/Knowledge + IT Glue back-sync (LP #408);
  Celeste CONSUMES via `knowledge.search` (grant landed on 08-N/08-M), never authors —
  💤dormant until the content store + #389 hydrate. **subject:** both. **Maps to:** #1456.

## 08-O · Offboard a client (termination → data-return + deprovision) 💤 — net-new, schema #1622
- **Owner / Stream:** Celeste / 08 — **Celeste owns the relationship/retention boundary + the
  offboarding clock; the destructive acts are NOT hers.** **Archetype:** **B8 provision-with-undo run
  in REVERSE** (the offboard is the tear-down past the hardened scaffold — the OP-03-01/02 mirror) +
  **B5 JML** (Osiris deprovision) + **B9 deadline-sentinel** (retention/legal-hold clock) + **B6/B7**
  peels (final invoice/credit, data-return confirmation). This is the canonical A11 cross-owner seam:
  **Celeste** owns the termination/retention clock + client comms, **Osiris** owns the identity/access
  deprovision act, **Pierce** owns the project/asset teardown — three distinct owners meeting at
  explicit steps, never co-owning.
- **Trigger:** a client termination/non-renewal signal — a `contract` non-renewal (08-E routed to lost),
  an explicit termination notice, or an admin-declared offboarding. **Hand-off (inbound, SEAM A11):**
  Chase (lost/churned) / Celeste health (08-D terminal) → offboarding.
- **Terminal outcome:** the client is fully offboarded — **data returned** (confirmed), **identity/access
  deprovisioned** (Osiris), **delivery assets/projects torn down** (Pierce), final invoice/credit
  reconciled, retention/legal-hold honored — with every irreversible/destructive step **always-gated**
  and the **retention clock** enforced before any delete.
- **Procedure Steps** (B8-reverse: ground[refuse] → plan-teardown → RETENTION GATE → split-actuate → peels → log):
  1. `[automation]` **Ground — REFUSE-precondition:** verify the termination signal is real + the
     **retention/legal-hold window** + contractual data-return obligation, **citing the contract +
     termination record + as-of** (A5); on empty/unverified termination → park (never deprovision on an
     unconfirmed signal — the offboard mirror of the `contract_state='signed'` structural gate, B8). **L0.**
  2. `[automation]` **Plan the teardown** — assemble the offboarding checklist from the `client_offboarding`
     model (**schema gap #1622 — propose-only/dormant until built, A5c**): data-return scope, deprovision
     set, project/asset teardown, license reclaim, final-invoice/credit lines. **L1/L2.**
  3. `[automation]` **Retention clock (B9):** the retention/legal-hold dates are a sentinel — **no
     deletion before the hold expires** (escalate-to-terminal, never auto-delete under the clock; a
     premature delete is a refusal-class violation, A10 row 4 + B9). **L0/L2.**
  4. `[gui-step]` **RETENTION/DEPROVISION GATE = 4-part easy-button (A4) — `always_gate`:** the
     **data-return + the destructive deprovision** is presented for a human decision (A2 class-3/4 —
     identity-destructive + production-destructive; no clean undo, A10 row 4). **SEAM → Osiris** (the
     **Leaver-class deprovision act**, OP-04-12 B5: disable+revoke is the reversible containment half,
     **delete/deprovision/license-removal stays the human-approved cleanup** — referenced, not
     duplicated, D3). **SEAM → Pierce** for delivery-project/asset teardown (the B8 hardened-scaffold
     teardown = a new gated change, Stream 03). Celeste never actuates the delete.
  5. `[hybrid]` **Peel-off gates (B8 — irreversible/client-visible sub-steps do NOT ride one bundle):**
     **data-return confirmation = B7 client-facing-send** (`always_gate` A2 class-2, no fabricated
     scope/timeline; consent + opt-out honored); **final invoice / credit reconciliation = B6
     money-gate** (`always_gate` A2 class-1 — routes to Audrey/Nick, see 08-P for the credit half);
     license reclaim → Vance (shelfware, Stream 07).
  6. `[automation]` **Log + verify (read-back, A9c)** — confirm each deprovision/teardown landed
     (close-on-verification, never close-on-fire); persist the offboarding record (audited, attributed);
     **SEAM → Audrey** (final AR/credit reconcile) + handoff log close. **B8-reverse close: hardens at
     completion** — a re-onboard is a new gated provision (OP-03-01), not an undo.
- **Driving policy:** TBD (#1586) — Client-Offboarding / Data-Return / Retention-Legal-Hold /
  Deprovision-Checklist.
- **Realization:** **procedure-only / 💤dormant** — depends on the `client_offboarding` silver model
  (**schema gap #1622, propose-only per A5c**); the deprovision act is Osiris's JML (OP-04-12), the
  teardown is Pierce's (Stream 03), both referenced not duplicated (D3). No workspace until #1622 lands.
- **Autonomy ceiling:** **Celeste L2** (plan + maintain the offboarding record + retention-clock watch =
  reversible internal, A10 row 1; B9 watch). **`always_gate`:** data-return send (A2 class-2) · the
  destructive deprovision/delete/license-removal (A2 class-3/4 — Osiris's cleanup, A10 row 4) ·
  project/asset teardown (Pierce gated change) · final invoice/credit (A2 class-1). The retention/
  legal-hold delete-block is a **structural refuse-precondition**, dial-proof.
- **Human-in-loop:** Jessica (CRO) / CS-lead on the relationship side; **Mark (CISO) + Osiris's human**
  on the deprovision; Nick (finance) on the final invoice/credit; legal on hold release. Every
  destructive/money/client-send step stays human (A3 floor — none recede).
- **Substrate deps:** 💤 **schema gap `client_offboarding` (#1622, propose-only)** · Osiris JML
  (OP-04-12, #1562) · Pierce teardown (Stream 03) · Audrey final-AR/credit seam · #991 handoff · #119.
  **subject:** both. **(Imperion dogfood: offboarding a deprecated Imperion tenant/relationship runs the
  same flow.)** **(OWNERSHIP: clean — Celeste owns the retention clock + comms, Osiris owns the
  deprovision act, Pierce owns the teardown, A11.)** **Schema gap flagged to FE: #1622.**

## 08-P · Issue an SLA-breach service credit 💰 — net-new
- **Owner / Stream:** Celeste / 08 — **Celeste owns the SLA standard/clock + the breach
  determination; the money act is NOT hers.** **Archetype:** **B6 money-gate** — the canonical A11
  obligation/action separation in this stream's money form: Celeste owns the **SLA obligation** (is it
  breached? does it earn a credit per the agreement?), **Audrey** owns the **credit-memo money act**
  (the irreversible financial write). They meet at the gate, never co-own.
- **Trigger:** an SLA-breach signal — a missed SLA target from Felix's service/dispatch data (OP-04-08
  SLA-risk crossed into breach), an availability/incident breach (Ozzie/Phoenix Stream 05), or a
  client-raised credit claim surfaced in the client-360 (08-A).
- **Terminal outcome:** an SLA-breach **service credit determined per the SLA agreement** and a
  **credit memo drafted + always-gated** to a human (Audrey/Nick) — Celeste determines the obligation,
  she never posts the money.
- **Procedure Steps** (B6: ground → compute → draft → MONEY GATE → actuate → log):
  1. `[automation]` **Ground** — pull the SLA target + the actual measured breach (uptime/response/
     resolution) + the client's SLA terms from the `contract`/SLA model, **each cited + as-of** (A5);
     empty/unmeasured → park, never fabricate a breach (signal-vs-inference, guardrail 3). **L0.**
  2. `[automation]` **Compute the obligation** — apply the SLA credit schedule (breach severity →
     credit %/amount per the agreement) to derive the owed credit; pool-correlate breach patterns across
     the base internally only (A7 — never name another client's breach). **L2.**
  3. `[automation]` **Draft** the service-credit memo (breach evidence, credit basis, $ amount) — the
     obligation artifact, attributed up-chain (P2).
  4. `[gui-step]` **MONEY GATE — `always_gate` (A2 class-1, money out, dial-proof, A4 easy-button):**
     **SEAM → Audrey/Nick** — the **credit-memo financial write is Audrey's money act** (A11: Celeste's
     SLA clock determines the obligation; Audrey's ledger executes it). Present the exact $ credit + the
     SoR (QBO credit memo, external — agent mirrors never owns, A9a) + the irreversibility flag (a posted
     credit has no clean undo, A10 row 4). The human approves before any credit posts. **NO-COMMITS-EVER:**
     Celeste never commits the money (celeste.md guardrail 1).
  5. `[automation]` **Actuate idempotently (Audrey side)** — on approval, the credit memo is posted
     **idempotency-keyed** (procedure + breach + period; replay = no-op + audit note, never a
     double-credit, A9b) and **read back** from QBO to confirm it landed (A9c). **SEAM → 08-D / Belle**
     for any client-facing credit notice (B7, gated). The client-facing communication of the credit is a
     separate B7 send.
- **Driving policy:** TBD (#1586) — SLA / Service-Level-Agreement / Service-Credit schedule. **Note:**
  the SLA *standard* is the contractual obligation Celeste owns; the *credit schedule* is the policy that
  computes it.
- **Realization:** ICM Workspace once the SLA model + credit path land; **procedure-only** until then.
  The money act is Audrey's (Stream 09, referenced not duplicated, D3).
- **Autonomy ceiling:** **Celeste L2** (determine breach + compute + draft = reversible internal, A10 row
  1). **`always_gate`: the credit memo / money out** (Audrey, A2 class-1 — A10 row 4: a posted credit/
  refund has no clean undo). Dial-proof — never Celeste's to post, never auto at any level.
- **Human-in-loop:** Nick (finance) + Audrey's human on the credit-memo post; Jessica (CRO) / CS-lead on
  the breach determination + client relationship. The money post stays human forever (A3 floor + NO-COMMITS).
- **Substrate deps:** SLA/`contract` model + service-credit schedule (backend/schema-owed) · Felix/Ozzie
  breach signal (#991 feed) · Audrey credit-memo path (Stream 09, QBO) · #389 recall · #119. **subject:**
  both. **Seam:** Celeste→Audrey (money) + Celeste→Belle/08-D (client notice). **(OWNERSHIP: clean —
  Celeste owns the SLA obligation/clock, Audrey owns the money act, A11.)**

## 08-Q · Relationship recovery / save-the-account (acute) ⚡ — net-new
- **Owner / Stream:** Celeste / 08. **Archetype:** B3 synthesis-brief (the save plan) + B7 client-send
  (the executive recovery touch) — the **acute** counterpart to 08-D (08-D handles slow-degradation
  churn; this handles the acute relationship rupture). Resolves the #1396 v2-deferral (un-deferred #1693).
- **Trigger:** a Felix major-incident / SLA-breach handoff **or** a sharp sentiment/health drop — an
  acute event that puts the *relationship* (not just the ticket) at risk. One run per at-risk event.
- **Terminal outcome:** an executive recovery touch + a save plan, tracked to resolution — the
  relationship is recovered or the risk is escalated; distinct from 08-D's routine save-outreach.
- **Procedure Steps:**
  1. `[automation]` **Assemble incident context** — the Felix seam: the major-incident / SLA-breach
     facts (`ticket`) + relationship context (`account`/`contact`/`interaction`/SBR), **cited + as-of**
     (A5); empty/unresolvable → park. **L0.**
  2. `[hybrid]` **Draft executive recovery touch + save plan** — signal vs inference; **NO-COMMITS**:
     a credit routes to Audrey/08-P (the only credit path), an SLA change to a human, a remediation to
     Felix/Datto, a price to a human (B3 launchpad pre-stages each as a parked owner-action). **L2.**
  3. `[gui-step]` **SEND GATE + track** — the acute executive send is **`always_gate` (A2 class-2)**:
     relationship-sensitive, so it parks for a human in EVERY mode (unlike 08-D, no send auto-fires at
     any rung); exits only via ADR-0058. Then track to resolution (hand SLA-credit to Audrey/08-P,
     remediation to Felix).
- **Driving policy:** TBD (#1586) — churn-intervention / save-offer (acute).
- **Realization:** ICM Workspace (assemble + draft automatable) — realized; 💤dormant on **#991** (the
  Felix incident-handoff feed).
- **Autonomy ceiling:** **L2** (assemble + draft = reversible internal, A10 row 1). The executive
  recovery **send is human-gated at every rung** (acute relationship-sensitive) — NO-COMMITS-EVER and
  MSSP-advisory-only dial-proof.
- **Human-in-loop:** Jessica (CRO) / CS-lead approves the recovery send + owns the relationship call;
  credit → Audrey, remediation → Felix/Datto. **always_gate floor:** the acute executive send always
  parks (A3 floor).
- **Substrate deps:** **#991** (Felix incident-handoff feed — the load-bearing dep) · #1369/#1370
  (sentiment-drop trigger) · 08-P (SLA credit, Audrey) · #389 · #119. **subject:** both. **Seam:**
  Felix→Celeste (incident IN) · Celeste→Audrey/08-P (credit) · Celeste→human (executive send).
  **(OWNERSHIP: clean — Celeste owns the relationship recovery; Felix owns the technical incident;
  Audrey owns the credit money, A11.)** **Maps to:** #1693.

---

## Provable-coverage note

Engage→Retain surface fully covered by one owner (Celeste), zero in-stream ownership gaps: handoff-
hub intake / the client-360 (A) · account success plan (B) · QBR/TBR (C) · health/churn 💤 (D) ·
renewal-readiness → Chase (E) · expansion mint→assign → Chase, the pinned seam (F) · vCIO roadmap 💤
(G) · IT budget 💤 (H) · tech lifecycle/refresh (I) · vendor/solution eval → Vance (J) · vCISO
posture report (K) · client risk register (L) · awareness/enablement (M) · proactive updates +
knowledge-sharing, L4 stream-max (N). Maps 1:1 to filed playbooks #1443–1456 (08-A…N in order; #1442
= persona-activation leaf, folded into Realization). **Cluster-5 scale-up additions (2026-06-29,
#1629):** client offboarding (O — the B8-provision-with-undo run in *reverse*: termination → data-
return + deprovision, three-owner seam Celeste/Osiris/Pierce, 💤dormant on **schema gap #1622**) and
the SLA-breach service credit (P — a B6 money-gate, the stream's canonical money-form A11 seam: Celeste
owns the SLA obligation, Audrey owns the credit-memo money act). The whole stream is load-bearing on
**#991** (handoff bus) + **#389** (Voyage recall); per A5c deepened steps ship propose-only until their
substrate hydrates. **Doctrine inheritance (ADR-0136):** every procedure names its archetype (B1–B9)
and inherits A1–A11; the stream is the canonical showcase of **B3 synthesis-brief** (12 of 14 original
procedures are launchpads — the QBR/ASP/health/vCIO/vCISO briefs each pre-stage their owning worker
procedure parked for one-click human launch, **Celeste never actuates**) and of **A11
obligation/action separation** (the relationship-clock is hers; the close/purchase/remediation/
deprovision/credit-money is explicitly NOT — O hands the deprovision to Osiris + teardown to Pierce, P
hands the credit money to Audrey). **NO-COMMITS-EVER** and **MSSP-advisory-only** are dial-proof
`always_gate` floors (inherited A2) on all 17. Seams are explicit hand-off steps: IN from all 7 other
agents (A); OUT → Chase (E renewal, F expansion); OUT → Vance (I refresh, J vendor); OUT → human/Datto
(K/L/M vCISO remediation); OUT → Osiris + Pierce (O offboarding); OUT → Audrey (P credit money). The
close stays Chase's (Stream 02) — no qualify/close procedure appears here (correctly). **Schema gap
flagged to FE: #1622** (`client_offboarding` silver model; 08-O ships propose-only/dormant until built).

**Operator-readiness additions (2026-06-29, #1396 audit):** **08-Q relationship recovery /
save-the-account** (the *acute* save — a Felix major-incident/SLA-breach or sharp sentiment drop ⇒
executive recovery touch + save plan; B3+B7; un-defers #1693 from v2; 💤dormant on **#991**). The
acute counterpart to 08-D's slow-churn save; NO-COMMITS holds (credit→Audrey/08-P, remediation→Felix).

**Count: 17 Operating Procedures** (08-A … 08-Q; #1442 folded as persona-activation per D9).
