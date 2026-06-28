# Stream 08 — Engage → Retain

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-NNNN](../../decision-records/ADR-NNNN-operating-procedure-catalog.md). Terms
> **Operating Procedure** / **Procedure Step** are defined in [`CONTEXT.md`](../../../CONTEXT.md).
>
> **D9 global principles apply to every procedure below** (encoded in each Human-in-loop field,
> not restated per entry): **P1** Nova-native human co-working (every flow co-works with a human
> through Nova) · **P2** each sub-agent's reasoning is ascribed back to the paired human, up the
> chain · **P3** an "easy button" at every human gate (prep to the goal, hand the human a one-click
> resolution) · **P4** urgent → dedicated chat, else → tag the team member in the shared Teams chat.

**Owner agent:** Celeste (Client Success / vCIO / vCISO). **Owning ICM domain:**
`icm/domains/client-success/`. **Stream scope:** the active-customer **relationship hub /
client-360** — Handoff Hub intake → Account Success Plan → QBR/TBR → health/churn → Client Risk
Register → expansion mint→assign→Chase → vCIO advisory → vCISO advisory (advisory-only).

**Celeste is the relationship hub: OP-08-01 receives a Handoff from EVERY other agent** (Chase,
Pierce, Audrey, Belle, Felix, Vance, Vera) — that intake IS the client-360. The whole stream is
load-bearing on **#991** (cross-agent event/handoff bus, BE-W7 `relationship.*`): without the bus
the client-360 has no input and most of the stream is dormant.

**Pinned seam (Chase ↔ Celeste):** Celeste owns the relationship; **Chase owns the close** of any
transaction inside it. Renewal-readiness (OP-08-05) and expansion mint→assign (OP-08-06) hand OUT
to Chase; never duplicate his close/pricing procedures here — reference them as the terminal step.

**Celeste's HARD ceilings (dial-proof `always_gate` floors on ALL 14 procedures — no rung, no
earned autonomy crosses them):**
- **NO-COMMITS-EVER:** every binding commitment — roadmap · SLA · pricing · spend ·
  security-remediation — routes as a *recommendation* to a human (celeste.md guardrail 1; ladder ADR-0128).
- **MSSP / vCISO advisory-only:** security = visibility · posture · risk · recommendations;
  remediation is human / Datto; **no compliance-management** (v1 exclusion) (guardrail 2).
- Plus: **signal-vs-inference** (never invent health/sentiment; every flag carries its evidence,
  guardrail 3) · **non-interest upsell** (never recommend spend for Imperion revenue alone,
  guardrail 4) · **client-confidential** (one client's data never crosses into another's;
  `{operational, client_pii}` under `client_pii` data_class, ADR-0118, guardrail 5).

**Driving policy (every procedure):** `TBD (mark-blocker: company-policy-collection)` (D4, #1586).
Policies Celeste's procedures lean hardest on (highest-value collection entries): Client Success /
QBR cadence · churn-intervention / save-offer · MSSP advisory-scope (present vs route to Datto).

**Dormancy flags:** **#991** cross-agent handoff/event bus (the load-bearing dep) · **#389** Voyage
embeddings (worker semantic recall — TABLED, gates real autonomy) · **#119** trigger-sync (deploy-
dormant until synced). **subject:** client | imperion — every procedure runs once; Imperion-itself
is a managed client (dogfood, D7.2); default = both. **Realization:** Celeste domain tier landed
(PR #1507: `icm/domains/client-success/` room + `celeste.md` + client-360 handoff-intake workflow +
`strategic_business_review` okf_room). **realized** = ICM Workspace is/becomes SoR;
**procedure-only** = `docs/runbooks/08-engage-retain/` until an automatable step graduates it (D5).

---

## 08-A · Intake & fold a cross-agent Handoff into the client-360 ⚡
- **Owner / Stream:** Celeste / 08.
- **Trigger:** a `relationship.*` Handoff event from any agent (Chase→won/renewal · Pierce→
  delivery-complete+retro · Audrey→margin/AR/financial-health · Belle→engagement/sentiment ·
  Felix→service-pattern/incident · Vance→vendor/EOL/risk · Vera→governance/posture).
- **Terminal outcome:** the account's client-360 is updated; the handoff logged; any derived signal
  routed to its owning downstream procedure (health, ASP, risk register, expansion).
- **Procedure Steps:**
  1. `[automation]` Consume the Handoff off the cross-agent bus; resolve to an `account` via Client
     Mapping. **HAND-OFF IN from every other agent** — the seam that makes Celeste the client-360. **L0.**
  2. `[automation]` Classify the signal (health / financial / service / vendor / posture /
     engagement / lifecycle); label **signal vs inference**. **L2.**
  3. `[automation]` Fold into the account picture; append to the handoff log (L2 internal reversible).
  4. `[hybrid]` Route the derived signal to its owning procedure (→ 08-D health, 08-B ASP, 08-I/J/L
     risk register) — internal routing, no external touch.
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace (handoff-intake workflow, landed PR #1507) — **live SoR**.
- **Autonomy ceiling:** L2 (auto fold/log/route). No external touch here; any *commitment* the
  signal implies inherits NO-COMMITS downstream.
- **Human-in-loop:** Derek/CS-lead (paired). L1 = human reviews the fold; L2 auto. No `always_gate`
  step here (all internal).
- **Substrate deps:** ⚠️ **#991 (the load-bearing dep)**, #119. **subject:** both. **Maps to:** #1443.

## 08-B · Maintain the Account Success Plan ⚡
- **Owner / Stream:** Celeste / 08.
- **Trigger:** scheduled per-account review interval OR a material client-360 change from 08-A
  (new goal, value-realization shift, risk).
- **Terminal outcome:** the living ASP (goals · value-realization · next actions) is current and
  human-co-shaped.
- **Procedure Steps:**
  1. `[automation]` Pull current client-360 + last ASP version; diff for stale goals / new signals. **L0.**
  2. `[hybrid]` Draft updated goals + value-realization + next actions (L2 maintain; Teams-loop co-shape).
  3. `[gui-step]` Human (CS-lead) co-shapes + accepts in-app. **`always_gate` if any step proposes a
     binding commitment** (SLA/spend/roadmap) → routes as recommendation.
  4. `[automation]` Persist the ASP version (audited; attested original preserved).
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace once the ASP write path lands; **procedure-only** until then.
- **Autonomy ceiling:** L2 (maintain internal record). Any embedded commitment = `always_gate`.
- **Human-in-loop:** Derek/CS-lead. L1 co-shape+approve → L2 draft-solo + approve-only. **always_gate
  floor:** any binding commitment in the plan never auto-commits.
- **Substrate deps:** ASP store (backend-owed); #991 live signal feed. **subject:** both. **Maps to:** #1444.

## 08-C · Prepare & facilitate a QBR/TBR ⚡
- **Owner / Stream:** Celeste / 08.
- **Trigger:** the QBR/TBR cadence falls due for an account (quarterly/scheduled review).
- **Terminal outcome:** a QBR/TBR packet assembled from ASP + reads, the review delivered, outcomes/
  next-actions captured back into the ASP and risk register.
- **Procedure Steps:**
  1. `[automation]` Assemble context: `strategic_business_review` (OKF) + ASP + Audrey financial-
     health reads (read-only) + posture summary (vCISO) + lifecycle/EOL. **L0.**
  2. `[hybrid]` Draft the QBR/TBR deck/agenda (L2 assemble; signal-vs-inference labeled).
  3. `[gui-step]` Human reviews/edits; the review is delivered to the client. **`always_gate`:** any
     roadmap/SLA/pricing/spend item presented is a *recommendation*, never a commitment.
  4. `[automation]` Capture outcomes → update ASP (08-B) + Client Risk Register (08-L).
- **Driving policy:** TBD (#1586) — Client Success / QBR cadence.
- **Realization:** ICM Workspace (assemble automatable) — realized; facilitation [gui-step] rides as a checkpoint.
- **Autonomy ceiling:** L2 (assemble + capture). Delivery/commitments human-gated.
- **Human-in-loop:** Derek/CS-lead facilitates. L1→L2 reduces drafting effort. **always_gate floor:**
  every commitment-class item stays a recommendation.
- **Substrate deps:** `strategic_business_review` OKF (exists); Audrey margin-grounding seam (#1415,
  read-only). **subject:** both. **Maps to:** #1445.

## 08-D · Monitor client health & churn risk; intervene 💤
- **Owner / Stream:** Celeste / 08.
- **Trigger:** scheduled health recompute OR a degrading signal from 08-A (recurring tickets,
  falling usage, sentiment drop, AR-aging).
- **Terminal outcome:** a per-account health/churn verdict (signal vs inference) flagged + surfaced;
  an at-risk account triggers a routine **save-outreach** intervention.
- **Procedure Steps:**
  1. `[automation]` Compute health_score across signals (service patterns, usage, engagement/
     sentiment, financial-health); label signal vs inference. **L2 compute+flag.**
  2. `[automation]` Surface at-risk accounts to the cockpit; record the churn flag with its evidence.
  3. `[hybrid]` **Churn-risk intervention** — draft routine save outreach (L3 auto low-risk external
     touch, execute-then-notify; share mechanism = 08-N L3, referenced not duplicated per D3).
  4. `[gui-step]` Low dial = human approves; high dial = auto-sends routine save touch — still
     `always_gate` if it carries any commitment/discount → routes to human.
- **Driving policy:** TBD (#1586) — churn-intervention / save-offer.
- **Realization:** ICM Workspace once health_score weighting + collectors land; **procedure-only /
  dormant** until then.
- **Autonomy ceiling:** L3 (routine save outreach, execute-then-notify). Any retention *offer*/
  discount = `always_gate`.
- **Human-in-loop:** Derek/CS-lead. L1 co-shapes; L3 auto routine touch. **always_gate floor:** no
  save-offer that commits pricing/term ever auto-sends.
- **Substrate deps:** 💤 **#1046 health_score weighting** + **#1369/#1370 interaction/comms
  collectors** (named blockers); #389 sentiment recall; #991 feed. **subject:** both. **Maps to:** #1446.

## 08-E · Assess renewal readiness & route ⚡
- **Owner / Stream:** Celeste / 08.
- **Trigger:** an upcoming `contract` expiration window opens (renewal: identified) OR a Chase
  renewal/expansion handoff.
- **Terminal outcome:** a renewal-readiness verdict (health + value-realization + risk) produced and
  routed to Chase (close) and Audrey (margin) — Celeste does **not** close.
- **Procedure Steps:**
  1. `[automation]` Pull contract expiry + client-360 + ASP value-realization + health verdict. **L0.**
  2. `[automation]` Produce a renewal-readiness assessment (at-risk? ready? reprice candidate?),
     labeled signal vs inference. **L2.**
  3. `[hybrid]` Route to **Chase** (renewal transaction = his) with **Audrey** margin-grounding
     (read-only). **HAND-OFF OUT → Stream 02 (Chase) + Audrey #1394/#1415.**
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace (assessment automatable) — realized; the route is a handoff event.
- **Autonomy ceiling:** L2 (assess + route internal). The renewal send-for-signature is Chase's and
  is `always_gate` (not Celeste's to commit).
- **Human-in-loop:** Nick (finance, via Audrey margin) + Chase's human on the close. **always_gate
  floor:** the binding renewal lives in Stream 02, gated there.
- **Substrate deps:** `contract_renewal` model; Chase seam #1392; Audrey margin #1415. **subject:**
  both. **Seam:** Celeste→Chase. **Maps to:** #1447.

## 08-F · Mint, triage & assign an expansion opportunity (→ Chase) ⚡ — THE PINNED SEAM
- **Owner / Stream:** Celeste / 08.
- **Trigger:** expansion value detected in the client-360 (usage growth, unmet need, lifecycle/EOL
  refresh, advisory finding).
- **Terminal outcome:** an `opportunity` (kind=upsell/expansion) auto-created, triaged, and
  **assigned to a salesperson — Chase owns the close.**
- **Procedure Steps:**
  1. `[automation]` Detect expansion value; check it is **not a non-interest upsell** (guardrail 4 —
     flag + stop if not in the client's interest). **L0.**
  2. `[automation]` Auto-create the `opportunity` (L2 internal write) + triage (qualify, size).
  3. `[automation]` Assign to a salesperson. **HAND-OFF OUT → Stream 02 (Chase): Chase owns the
     close.** Celeste retains the relationship; the transaction lives inside her account.
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace — realized once the auto-create-opp write path + assignment routing
  land (backend-owed); procedure-only until then.
- **Autonomy ceiling:** L2 (auto-create + triage + assign — all internal/reversible). The close is
  Chase's; pricing/term = `always_gate` (in Stream 02).
- **Human-in-loop:** Chase's human owns the close + commitment. Celeste's side is internal-only.
  **always_gate floor:** no expansion *commitment* by Celeste at any level.
- **Substrate deps:** auto-create-opportunity write path + triage/assignment routing (backend-owed);
  Chase #1392. **subject:** both. **Seam:** Celeste→Chase (pinned). **Maps to:** #1448.

## 08-G · Draft the technology roadmap / strategic plan (vCIO) 💤
- **Owner / Stream:** Celeste / 08.
- **Trigger:** vCIO planning cadence OR a QBR/TBR that surfaces a strategic gap.
- **Terminal outcome:** a proposed technology roadmap / strategic plan drafted and routed as a
  **recommendation** to a human (NO COMMITS).
- **Procedure Steps:**
  1. `[automation]` Assemble vCIO context (CMDB/lifecycle + posture + ASP + financial constraints). **L0.**
  2. `[hybrid]` Draft the roadmap (L1 propose) — signal vs inference labeled.
  3. `[gui-step]` **`always_gate`** — the roadmap routes as a recommendation to a human; never a commitment.
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only / dormant until #1043 vCIO assembly lands.
- **Autonomy ceiling:** **L1 propose** (NO-COMMITS ceiling is the operative bound — roadmap is a
  binding-class artifact).
- **Human-in-loop:** Mark/Derek + client. **always_gate floor:** roadmap commitment is human, always.
- **Substrate deps:** 💤 **#1043 vCIO assembly** (named blocker). **subject:** both. **Maps to:** #1449.

## 08-H · IT budget planning & forecasting (vCIO) 💤
- **Owner / Stream:** Celeste / 08.
- **Trigger:** budget-cycle cadence OR a QBR/TBR/roadmap that requires a spend forecast.
- **Terminal outcome:** a proposed IT budget / forecast drafted and routed as a **spend
  recommendation** to a human (NO COMMITS).
- **Procedure Steps:**
  1. `[automation]` Pull profitability/spend reads (Audrey, read-only) + lifecycle/refresh + roadmap. **L0.**
  2. `[hybrid]` Draft the budget/forecast (L1 propose).
  3. `[gui-step]` **`always_gate`** — spend routes as a recommendation; no spend commitment.
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only / dormant until #1043 + #1044.
- **Autonomy ceiling:** **L1 propose** (spend = NO-COMMITS ceiling).
- **Human-in-loop:** Nick (finance) + Mark/Derek + client. **always_gate floor:** spend commitment
  is human, always.
- **Substrate deps:** 💤 **#1043 vCIO assembly + #1044 profitability/spend** (named blockers).
  **subject:** both. **Maps to:** #1450.

## 08-I · Technology lifecycle / refresh planning (vCIO) ⚡
- **Owner / Stream:** Celeste / 08.
- **Trigger:** asset EOL/refresh threshold crossed (CMDB lifecycle) OR QBR planning.
- **Terminal outcome:** an asset lifecycle + refresh plan (what's EOL, what to refresh, when)
  produced as advisory, feeding the roadmap/budget + expansion detection.
- **Procedure Steps:**
  1. `[automation]` Read CMDB (`cloud_asset`/device) for EOL / refresh-due assets. **L0.**
  2. `[automation]` Produce a refresh plan (prioritized, signal vs inference). **L2.**
  3. `[hybrid]` Surface as advisory → feeds 08-G/H + 08-F (expansion). **`always_gate`** if it
     implies a purchase commitment (→ Vance/human).
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace (CMDB read automatable) — realized.
- **Autonomy ceiling:** L2 (produce advisory). Any purchase = `always_gate` (Vance/human).
- **Human-in-loop:** Mark/Derek + client. **always_gate floor:** refresh *purchase* never auto-commits.
- **Substrate deps:** CMDB (`cloud_asset` exists); Vance procurement seam. **subject:** both. **Maps to:** #1451.

## 08-J · Vendor / solution evaluation advisory (vCIO) ⚡
- **Owner / Stream:** Celeste / 08.
- **Trigger:** a client need for a new/replacement solution OR a Vance vendor-change handoff (price
  hike, EOL, vendor risk).
- **Terminal outcome:** a vendor/solution evaluation (options, tradeoffs, recommendation) delivered
  as advisory; any purchase routes to Vance/human.
- **Procedure Steps:**
  1. `[automation]` Gather requirement + current stack (CMDB) + Vance vendor signals. **L0.**
  2. `[hybrid]` Draft the evaluation (options · tradeoffs · recommendation), signal vs inference.
  3. `[gui-step]` Deliver as advisory. **HAND-OFF OUT → Vance (#1398)** for any procurement;
     **`always_gate`** on the purchase commitment.
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace (assemble automatable) — realized.
- **Autonomy ceiling:** L2 (advisory). Purchase commit = `always_gate` (Vance, money ceiling architectural).
- **Human-in-loop:** Mark/Derek + Vance's human. **always_gate floor:** procurement commitment is
  human/Vance-gated, always.
- **Substrate deps:** Vance seam #1398; CMDB. **subject:** both. **Seam:** Celeste→Vance. **Maps to:** #1452.

## 08-K · Security posture review & client reporting (vCISO, advisory-only) ⚡
- **Owner / Stream:** Celeste / 08.
- **Trigger:** posture review cadence (quarterly snapshot) OR a Vera posture-change handoff OR a QBR/TBR.
- **Terminal outcome:** a client-facing security posture report (Imperion Secure Score + pillars +
  drift) produced and presented — **visibility/advisory only; remediation is human/Datto.**
- **Procedure Steps:**
  1. `[automation]` Read `posture_snapshot` (Secure Score + Posture Pillars + Golden-State drift)
     for the account. **L0.**
  2. `[hybrid]` Compose the posture report + recommendations (signal vs inference; **advisory only**).
  3. `[gui-step]` Present to the client. **`always_gate` / refuse-class:** any **remediation
     commitment** routes to human/Datto — Celeste presents, never remediates (Vera measures, Celeste
     presents, human/Datto remediate).
- **Driving policy:** TBD (#1586) — MSSP advisory-scope. **Note:** the Client Security Standard is
  **Vera-owned**; Celeste presents against it, does not own it.
- **Realization:** ICM Workspace (read+compose automatable) — realized.
- **Autonomy ceiling:** **L3 max for the share** (auto-share at L3, approval at low dial);
  **remediation = MSSP advisory-only ceiling (dial-proof)** — never actuated.
- **Human-in-loop:** Mark (CISO/Roman dCISO) + Datto for remediation. **always_gate floor:** no
  remediation action by Celeste at any level (MSSP boundary).
- **Substrate deps:** `posture_snapshot` (exists); Vera seam; #1310 posture. **subject:** both. **Maps to:** #1453.

## 08-L · Maintain the client-facing Client Risk Register (vCISO) ⚡
- **Owner / Stream:** Celeste / 08.
- **Trigger:** a new/changed risk signal from 08-A (churn, financial, service, vendor, security/
  posture) OR posture review.
- **Terminal outcome:** the per-client Client Risk Register (each risk labeled **signal vs
  inference**) is current and surfaced for advisory/QBR — **recommendations only, no remediation commitment.**
- **Procedure Steps:**
  1. `[automation]` Aggregate risks across the five categories from the client-360; label signal vs inference. **L0.**
  2. `[automation]` Update the Client Risk Register (L2 internal maintain).
  3. `[hybrid]` Surface for advisory/QBR (08-C) with recommendations. **`always_gate`:** no binding
     remediation commitment (no-commits-ever).
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace / Risk Register store (backend-owed); procedure-only until store lands.
- **Autonomy ceiling:** L2 (maintain register). Remediation/commitment = `always_gate` + MSSP advisory-only.
- **Human-in-loop:** Mark (CISO) + client. **always_gate floor:** every register item stays a recommendation.
- **Substrate deps:** Risk Register store; #1310 posture; #991 risk-signal feed. **subject:** both. **Maps to:** #1454.

## 08-M · Security awareness / enablement recommendations (vCISO) ⚡
- **Owner / Stream:** Celeste / 08.
- **Trigger:** a posture/awareness gap surfaced (phishing pillar, training gap) OR cadence.
- **Terminal outcome:** security awareness/enablement recommendations delivered to the client —
  **advisory only.**
- **Procedure Steps:**
  1. `[automation]` Read posture + awareness signals; identify enablement gaps. **L0.**
  2. `[hybrid]` Draft awareness/enablement recommendations.
  3. `[gui-step]` Deliver as advisory (shares 08-N's share path). **`always_gate`:** any program
     *commitment* (managed training service) routes to human (no-commits + MSSP advisory-only).
- **Driving policy:** TBD (#1586) — MSSP advisory-scope.
- **Realization:** procedure-only (advisory) until enablement-content substrate; the advisory framing
  (this) vs the actual share path (08-N) kept separate per filed leaves (#1455 vs #1456).
- **Autonomy ceiling:** L3 (advisory share). Commitment = `always_gate` + MSSP advisory-only.
- **Human-in-loop:** Mark + client. **always_gate floor:** no program commitment.
- **Substrate deps:** posture #1310; enablement content. **subject:** both. **Maps to:** #1455.

## 08-N · Proactive client updates + knowledge-asset sharing (L3→L4) ⚡
- **Owner / Stream:** Celeste / 08.
- **Trigger:** an important update a client should know (advisory, notice) OR a knowledge-asset/
  how-to need surfaced (1Password, M365 enablement).
- **Terminal outcome:** clients receive timely important updates + knowledge assets — at L3 with
  approval / churn-save, at L4 routine how-to enablement fully automatically.
- **Procedure Steps:**
  1. `[automation]` Detect the share-worthy update / knowledge asset from the client-360 + knowledge base. **L0.**
  2. `[hybrid]` **L3:** auto-share important updates + provide knowledge assets **WITH approval** +
     churn-save outreach (the share mechanism 08-D L3 invokes — shared sub-procedure per D3).
  3. `[automation]` **L4:** auto-share routine knowledge/enablement how-to (1Password, M365, etc.)
     fully automatically (reversible; execute-then-notify).
  4. *(ceiling)* **`always_gate`:** any update carrying a commitment (SLA/pricing/remediation) parks
     for a human regardless of level.
- **Driving policy:** TBD (#1586).
- **Realization:** ICM Workspace (share path automatable) — realized; the L3→L4 progression workspace.
- **Autonomy ceiling:** **L4** (the stream max — routine reversible enablement auto-share).
  Commitment-class shares = `always_gate`.
- **Human-in-loop:** Derek/CS-lead. L3 = approval on important/save outreach; L4 = routine how-to
  auto. **always_gate floor:** commitment-bearing shares always park.
- **Substrate deps:** knowledge-asset store + #389 (semantic recall for relevance); #991 feed.
  **subject:** both. **Maps to:** #1456.

---

## Provable-coverage note

Engage→Retain surface fully covered by one owner (Celeste), zero in-stream ownership gaps: handoff-
hub intake / the client-360 (A) · account success plan (B) · QBR/TBR (C) · health/churn 💤 (D) ·
renewal-readiness → Chase (E) · expansion mint→assign → Chase, the pinned seam (F) · vCIO roadmap 💤
(G) · IT budget 💤 (H) · tech lifecycle/refresh (I) · vendor/solution eval → Vance (J) · vCISO
posture report (K) · client risk register (L) · awareness/enablement (M) · proactive updates +
knowledge-sharing, L4 stream-max (N). Maps 1:1 to filed playbooks #1443–1456 (08-A…N in order; #1442
= persona-activation leaf, folded into Realization). The whole stream is load-bearing on **#991**
(handoff bus) + **#389** (Voyage recall). **NO-COMMITS-EVER** and **MSSP-advisory-only** are
dial-proof `always_gate` floors on all 14. Seams are explicit hand-off steps: IN from all 7 other
agents (A); OUT → Chase (E renewal, F expansion); OUT → Vance (I refresh, J vendor); OUT → human/
Datto (K/L/M vCISO remediation). The close stays Chase's (Stream 02) — no qualify/close procedure
appears here (correctly).

**Count: 14 Operating Procedures** (08-A … 08-N; #1442 folded as persona-activation per D9).
