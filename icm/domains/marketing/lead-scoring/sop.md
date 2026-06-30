---
id: marketing-01-G-lead-scoring
agent: belle
domain: marketing
op: 01-G
archetype: B1
trigger: a lead is captured (01-F), a behavioral signal accrues, or a scheduled re-score
autonomy:
  ceiling: L1
  always_gate: []
inputs:
  - the lead / re-score request (trigger payload)
  - prior lead_score baseline + history
  - fit signals (contact / account profile)
  - engagement signals (interaction, campaign touch)
  - the rule-based v1 scoring model + the MQL threshold (governed config)
outputs:
  - a recomputed lead_score persisted with its contributing-signal basis + as-of (internal, reversible)
  - the threshold evaluation + routing decision (MQL crossed → Chase / Stream 02, or below → 01-H nurture)
  - the attribution + scoring event emitted for analytics (→ 01-M)
  - the closed-run outcome stamp
seams: [Chase]
steps:
  - 01-ground-signals
  - 02-score
  - 03-evaluate-route
---

# SOP 01-G — lead-scoring (Belle / the marketing-qualification → Chase seam)

> **Dual-audience document (ADR-0136 A8).** This is the *one* canonical document for
> procedure 01-G: a human can follow it end-to-end to score a lead and evaluate the MQL
> threshold, and the runtime executes the same steps against the machine config
> (`agent.yaml` / `room.yaml` / the stage `CONTEXT.md` I/O contracts). The prose is
> single-sourced here; the execution SoR stays the ICM Workspace config the steps bind to.
>
> **This SOP follows the template-defining exemplar (#1759 — `social-inbox/sop.md`).** It
> mirrors that shape; the control layer it cites (the §A invariants, the B1 archetype rule,
> the action-catalog kinds) is **cited, never redefined** here.

## What this procedure is

**Job.** Recompute one lead's `lead_score` from **fit** (the contact/account profile) and
**engagement** (interactions, campaign touch), **persist** it as an internal reversible
write, and **evaluate** it against the marketing-qualified (MQL) threshold. When the score
crosses, the lead becomes an MQL and **routes to Chase / Stream 02 (lead-response)** — the
crossing *is* the hand-off. This realizes **Stream 01-G** (score a lead & evaluate the MQL
threshold).

**Archetype: B1 — Triage / Route** (ADR-0136 §B), as **the canonical Belle→Chase seam
emitter** (A11). The spine is the inherited B1 template — **Ground → Classify →
Resolve-owner → Disposition → Log** — instantiated here as the three stages below, where
*classify* is the score recompute and *resolve-owner/disposition* is the threshold-evaluate
+ route. Belle owns the marketing-qualification clock; Chase owns qualify/close; they meet
at the threshold-crossing step and never co-own. The B1 rule is inherited from ADR-0136;
this SOP honors it, it does not restate it.

**NOT this procedure.** There is **no send and no send path to invent** — nothing external
hears from this workflow (sends exit only through ADR-0058, and none originate here). The
threshold crossing is a **deterministic governed route**, not an outbound actuation and not
a self-approval; there is no separate hand-off action. Chase's qualify/close work is **not**
duplicated here — Stream 02 is referenced as the terminal step. Capturing the lead is 01-F;
running the nurture journey is 01-H; **changing the scoring model or the threshold** is a
human / governed-config act, never this workflow's.

## Autonomy contract

- **Ceiling L1, dialed from L0.** Per ADR-0136 A3 the procedure is built capability-complete
  to Belle's per-procedure ceiling but **ships at L0 (observe-only)**; autonomy is earned
  per-workflow upward, admin-only, audited, reversible (ADR-0109/0121/0128). v1 runs
  **human-approves-all** (`agent.yaml` `autonomy_rung: L1`).
- **The score write is internal and reversible.** Per ADR-0136 A10 row 1 the
  recompute + persist (stage 02) is an **internally reversible silver write → max
  auto-ceiling L2**: when an operator raises the dial it may self-approve, with no undo
  obligation, because nothing leaves the company.
- **The MQL routing is a deterministic governed event, not a self-approval.** The threshold
  + routing rule is governed config (not the agent's judgment); stage 03 executes it
  mechanically. The seam to Chase is the score crossing — an explicit Procedure Step (A11),
  not an actuation the agent self-approves.
- **No `always_gate` step.** This workflow touches none of the A2 universal gate classes —
  no money, no external client-facing send, no identity/destructive act (`always_gate: []`).
  Changing the model or threshold is the one human-only act, and it lives in governed config,
  not in this procedure.

## Inputs (procedure-level)

| Input | Grounded as | Why |
|---|---|---|
| The lead / re-score request | trigger payload | which lead, and why it's being scored |
| Prior score | `okf:lead_score` | the score being recomputed (baseline + history) |
| Fit — contact | `okf:contact` | who they are (role, source, consent) |
| Fit — account | `okf:account` | firmographic fit (size, segment), if the contact is mapped |
| Engagement | `okf:interaction` | behavioral signal — opens, clicks, replies, visits |
| Campaign touch | `okf:campaign` | which campaign(s) engaged them; attribution context |

Every `okf:` room above is in this workflow's `agent.yaml` `okf_rooms` allow-list
(least-privilege; ADR-0104 §5, enforced by `scripts/agent-yaml-gate.mjs`). The scoring
model and the MQL threshold are **governed config**, not an OKF room and not skill prose.

## Outputs (procedure-level)

A signal brief (the cited fit + engagement inputs, each with as-of), a recomputed
`lead_score` persisted with its contributing-signal basis + as-of, the threshold evaluation
+ routing decision (MQL → Chase/Stream 02, or below → 01-H nurture), the attribution +
scoring event emitted for analytics (→ 01-M), the closed-run outcome stamp, and the
**tracer** (each decision stamped into the `agent_run` / `agent_message` ledger).

## Seams (A11 — obligation/action separation)

This workflow owns only the **marketing-qualification clock**; the receiving agent owns its
act. The seam is an explicit Procedure Step, never co-ownership (ADR-0136 A11):

- **Chase** — when `lead_score` crosses the MQL threshold, the lead becomes an MQL and
  **routes into Stream 02 (lead-response)**. The score crossing **is** the hand-off — a
  deterministic governed event, **no separate hand-off action**. Belle owns the
  qualification clock up to the crossing; Chase owns qualify/close past it.

This procedure **terminates Belle's ownership at the MQL crossing → Stream 02**; below the
threshold the lead stays in Belle's nurture (→ 01-H).

## The steps

Operate one stage at a time, in numbered order. Load only what each stage's Inputs table
lists; produce exactly its named Outputs; run its Audit — a red audit **parks** the run,
never best-effort past it. Each step below is documented to the human+machine standard
(`goal · grounding sources · instructions · gate/invariant inherited · inputs · outputs ·
autonomy & tracer`); the per-stage machine contract is the stage `CONTEXT.md`.

### Step 01 — ground-signals (B1: Ground)

- **Goal.** Assemble the lead's scoring signals — fit (contact/account profile) and
  engagement (interactions, campaign touch) — each cited with its as-of.
- **Grounding sources.** `okf:lead_score` (prior baseline), `okf:contact` + `okf:account`
  (fit), `okf:interaction` + `okf:campaign` (engagement + attribution).
- **Instructions.** Resolve the lead from the trigger payload and pull the prior
  `lead_score` as the baseline; dedupe — one open score per lead. Read the fit signals and
  the recent `interaction` + `campaign` touch; note what should move the score. Write the
  signal brief — fit inputs, engagement inputs, campaign attribution — **citing each source
  + as-of**.
- **Gate / invariant inherited.** **A5 evidence floor** — every grounded signal cites a
  source + as-of; nothing fabricated; empty/missing signals **park**, never an invented
  signal. **A5c staleness honesty** — the **#389 predictive features are dormant**, so score
  on **rules-only** signals and **say so**; a dormant/stale source is flagged stale, never
  presented as live.
- **Inputs / outputs.** In: the trigger payload + the five grounding rooms. Out:
  `signals.md` (lead id, prior-score baseline, fit inputs, engagement inputs, campaign
  touch, each cited with as-of; the rules-only note).
- **Autonomy & tracer.** Grounding is a read — internally reversible (A10 row 1). The run
  writes `agent_run` / `agent_message` with per-signal source attribution (P2).

### Step 02 — score (B1: Classify — recompute + persist)

- **Goal.** Compute the lead's new `lead_score` from the grounded signals and persist it
  (internal, reversible).
- **Grounding sources.** Stage-01 `signals.md`; `okf:lead_score` (the record the recomputed
  score is persisted to); the **rule-based v1 scoring model** (governed config).
- **Instructions.** Apply the rule-based v1 scoring model over the fit + engagement signals
  from the brief — a deterministic computation with one correct output per input (predictive
  #389 dormant → rules only). Persist the recomputed `lead_score` (value + the
  contributing-signal basis + as-of) to the lead's score record. Score only from stage-01
  grounded signals — no new ungrounded input.
- **Gate / invariant inherited.** **A10 row 1** — an internally reversible silver write
  (no external party hears from it) → **max auto-ceiling L2**, no undo obligation. **A5**
  — the score's contributing-signal basis carries each source it stands on.
- **Inputs / outputs.** In: the signal brief + the score record. Out: `score.md` (the
  recomputed `lead_score`, the contributing-signal basis, the rules-only note, the persisted
  as-of).
- **Autonomy & tracer.** The persist self-approves at **L2** when the dial is up (A10);
  v1 keeps it human-approves-all. The contributing-signal basis rides the tracer (A5
  grounded-why).

### Step 03 — evaluate-route (B1: Resolve-owner → Disposition → Log) — the seam

The first-class outcome of this procedure: the threshold evaluation that **is** the
Belle→Chase seam. The route into Stream 02 is a **deterministic governed event** (the
threshold + routing rule is config), not an outbound actuation and not a self-approval —
there is no separate hand-off action and no send path (ADR-0058; none originate here).

- **Goal.** Evaluate the new `lead_score` against the MQL threshold and route — crossed →
  to Chase as the explicit A11 seam; below → stays in nurture — then close the run.
- **Grounding sources.** Stage-02 `score.md`; `okf:lead_score` (the **MQL threshold** as
  governed config + the score's standing).
- **Instructions.** Compare the recomputed `lead_score` to the marketing-qualified (MQL)
  threshold — a single deterministic comparison; the threshold is governed config, **not the
  agent's to set**. **Crossed → route the lead to Chase / Stream 02 (lead-response)** as the
  terminal hand-off step (the score crossing IS the seam; ADR-0024 lead-response). **Below →
  no route; the lead stays in Belle's nurture (→ 01-H).** Stamp the evaluation outcome on the
  score record and close the run. Do **not** duplicate Chase's qualify/close work.
- **Gate / invariant inherited.** **B1 rule** — mechanical routing auto-executes at L2
  (the routing record is internally reversible); the cross-client correlation carve-out
  stays internal (A7). **A11** — the hand-off is the explicit seam; Chase owns its act.
  **A7 pool-never-bleed** — no cross-client signal in the routing record.
- **Inputs / outputs.** In: the recomputed score + the governed threshold. Out: `route.md`
  (the threshold comparison, the routing decision — MQL → Chase/Stream 02, or below →
  nurture — and the closed-run outcome stamp).
- **Autonomy & tracer.** The route is a deterministic governed event (B1, L2-class), not a
  self-approval; the threshold is not altered here. Each decision is stamped for the tracer.

**Analytics emit (folds the 01-G step-4 attribution event).** On run close, emit the
**attribution + scoring event** for analytics → **01-M** (reporting; #1316) — the score
change, the contributing signals, and the MQL decision, so campaign attribution and the BI
hub see it. This is an **internal analytics emit**, not an external send.

## Learning on-ramp (how this earns more autonomy)

The score recompute and the MQL evaluation are the procedure's signal. Each run stamps its
**grounded-why** (the contributing-signal basis + as-of) and its routing decision into the
`agent_run` / `agent_message` tracer; these feed the **eval-harvest** (#1037) → a workflow
that demonstrates earned reliability lets an admin **raise the dial** per-workflow
(ADR-0109/0121), within the L1/L2 envelope and never past a governed-config act (model /
threshold tuning stays human). **v1 = human-approves-all;** the path to more automation runs
through this feedback loop, not around it.

## Dependencies & dormancy (honest posture — this documents the target, names the gates)

This SOP describes the **target** loop. In v1 several legs are runtime-gated and the runtime
**fails closed** — the procedure is real and dry-runnable, but it does not silently pretend a
signal is live:

- **Predictive features are dormant (#389).** The v1 scoring model is **rule-based only**;
  the predictive/semantic features are not hydrated. Stage 01 grounds on rules-only signals
  and **says so** (A5c) — it never assumes a predictive feature exists.
- **ICM executor integration is runtime-gated** — the self-hosted Managed Agents executor +
  delegate/handoff bus is not yet live (#489 / epic #695 / #341). Until then the run
  dry-runs stage-by-stage and stops; the Belle→Chase route is staged, not executed
  (icm/CLAUDE.md: no Claude-Code send/actuation path).
- **The scoring-model + MQL threshold policy is open (#1586).** The governed config the
  steps cite (the rule weights + the MQL threshold) lands with the lead-scoring / MQL
  driving policy; until then the steps reference the policy slot, never restate a value.
- **Signal sources hydrate via LP ingest.** `interaction` / `campaign` engagement signals
  hydrate only once the on-prem collectors land; until then a dormant source is flagged
  stale at stage 01 (A5c), never presented as live.

## Security & grounding

No secrets, no client PII, no client identifiers in this document (ADR-0060 / ADR-0086;
this file replicates to every agent machine). Data is referenced by room/id, never by value.
Every scoring signal is grounded and cited or the run parks (A5). The `lead_score` write is
internal and reversible (A10 row 1); the MQL routing is a deterministic governed event, not
a send — and the fail-closed posture above is deliberate: dormant ≠ done, and a dormant leg
is documented as dormant.
