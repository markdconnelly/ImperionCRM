---
id: marketing-01-M-marketing-metrics
agent: belle
domain: marketing
op: 01-M
archetype: B3
trigger: scheduled, or operator-requested
autonomy:
  ceiling: L0
  always_gate: []
inputs:
  - new social_metric readings (organic performance, per post/channel)
  - new campaign_metric readings (paid + send/journey/event results)
  - the in-scope campaign spine for the rollup + attribution grouping
  - each reading's source ref + as-of (the evidence floor)
outputs:
  - gathered, name-normalized organic + paid readings keyed to source + as-of
  - the organic ∪ paid union + multi-touch attribution (CPL / CAC / ROAS / sourced + influenced pipeline)
  - advisory anomaly + stale-source flags, each naming the human-routed owning procedure
  - a parked-draft launchpad feed to 01-C (re-budget) / 01-L (re-plan) for any under-performer
seams: [marketing-01-C, marketing-01-L, reporting]
steps:
  - 01-gather
  - 02-synthesize
  - 03-flag
---

# SOP 01-M — marketing-metrics (Belle / the reporting back-channel)

> **Dual-audience document (ADR-0136 A8).** This is the *one* canonical document for
> procedure 01-M: a human can follow it end-to-end to produce the marketing read-model, and
> the runtime executes the same steps against the machine config (`agent.yaml` / `room.yaml` /
> the stage `CONTEXT.md` I/O contracts). The prose is single-sourced here; the execution SoR
> stays the ICM Workspace config the steps bind to. `subject` is a parameter, not a duplicate —
> the read-model is the same whether the window covers Imperion's own marketing or a client's.
>
> **This SOP follows the template-defining exemplar (social-inbox `sop.md`, #1759).** It uses
> the same shape and section set; the control layer it cites (the §A invariants, the B3
> archetype rule, the action-catalog kinds) is **cited, never redefined** here.

## What this procedure is

**Job.** Surface marketing analytics + multi-touch attribution as a **read-model**. Gather
and **name-normalize** the metric substrate (organic Social Metrics + paid `campaign_metric`),
**union organic ∪ paid** into one marketing picture, compute **touch → opportunity → won**
attribution, and **flag** anomalies + stale sources for a human. This realizes **Stream 01-M**
(marketing analytics & attribution) — Belle's reporting back-channel, where the numbers have
to match everywhere and a stale source is called stale, not dressed up as live.

**Archetype: B3 — Synthesis-brief** (ADR-0136 §B). The spine is the inherited B3 template —
**Gather → Synthesize → Deliver** — instantiated here as the three stages below. The B3 rule is
that the brief is a **launchpad, not a readout**: an actionable finding (an under-performer)
**auto-spawns the owning worker procedure in a parked/draft state** for one-click launch — Belle
delivers that launchpad, she never actuates it. This archetype rule is inherited from ADR-0136;
this SOP honors it, it does not restate it.

**NOT this procedure.** This loop **reads and flags — it never actuates**. It opens no action,
writes no silver, sends nothing. Re-budgeting a campaign is **01-C** and ad spend is
`always_gate` class-1 forever (ADR-0136 A2.1; belle.md §6); re-planning a campaign is **01-L**.
This procedure stages the parked-draft launchpad that *feeds* those procedures and stops — a
human commits the re-budget / re-plan there, never here. Authoring a metric or a campaign is not
this procedure either.

## Autonomy contract

- **Ceiling L0 — read-only, no actuation.** Per ADR-0136 A3 the procedure is built and ships at
  its **L0** ceiling: it only reads the metric read-model, normalizes it, unions it, attributes
  it, and flags. It self-actuates **nothing** (`agent.yaml` `auto_may_self_approve`); every
  surfaced finding is advisory and a human acts on it. The domain L3 ceiling (room.md) does **not**
  apply — this procedure tops out at read+flag.
- **The flag is a launchpad, not a fix (B3).** When stage 03 flags an under-performing
  channel/campaign, it **auto-spawns a parked-draft launchpad** — an attributed, easy-button-ready
  feed into **01-C** (re-budget) / **01-L** (re-plan). Belle **delivers** the launchpad; the worker
  procedure stays parked/draft for a human's one-click launch. She never actuates the re-budget or
  re-plan from inside this brief (the B3 launchpad rule).
- **No refusal floor is needed — there is no act to refuse.** This workflow has no send path, no
  silver write, and no checkpoint, because it has nothing to approve (`always_gate: []`). Its only
  dial-proof boundary is **A7 pool-never-bleed**: any cross-client benchmark is anonymized and
  aggregated only — no client identifier, no row-level bleed — regardless of dial.

## Inputs (procedure-level)

| Input | Grounded as | Why |
|---|---|---|
| Organic performance | `okf:social_metric` | the organic side of the union, per post/channel |
| Paid + send/journey/event results | `okf:campaign_metric` | the paid side of the union + spend (ad results exposed for attribution, #1316) |
| Campaign spine | `okf:campaign` | the rollup + attribution touch grouping (touch → campaign) |
| Each reading's as-of | the source ref carried on each metric | the evidence floor — cite source + as-of, flag a dormant collector stale |

Every `okf:` room above is in this workflow's `agent.yaml` `okf_rooms` allow-list
(`[social_metric, campaign_metric, campaign]` — read-model only; least-privilege, ADR-0104 §5,
enforced by `scripts/agent-yaml-gate.mjs`). The workflow's `tools` are read-only
(`pg.read, knowledge.search, memory.recall`) — no write, no send path.

## Outputs (procedure-level)

A gathered, name-normalized set of organic + paid readings keyed to source + as-of (stage 01);
the **organic ∪ paid union** plus the multi-touch attribution figures — CPL / CAC / ROAS,
sourced + influenced pipeline vs spend — with cited touches and any anonymized aggregate
benchmark (stage 02); and the **advisory flag set** — anomalies + stale sources, each naming the
human-routed owning procedure, with a **parked-draft launchpad** pre-staged for any under-performer
(stage 03). Nothing is actuated, sent, or written to silver. The synthesized read-model is the
back-channel that feeds the **BI hub** (`/social/analytics` + `/reporting#marketing`, ADR-0062;
01-M → reporting).

## Seams (A11 — obligation/action separation)

This workflow owns only the **reporting clock + the flag**; the owning procedure owns the act it
flags. The seam is an explicit Procedure Step (the parked-draft launchpad), never co-ownership
(ADR-0136 A11):

- **01-C (re-budget)** — an under-performing **paid** channel/campaign auto-spawns a parked-draft
  re-budget launchpad into 01-C. Belle stages it; ad spend stays `always_gate` and a human commits
  it there, never here.
- **01-L (re-plan)** — an under-performing **campaign** auto-spawns a parked-draft re-plan
  launchpad into 01-L for a human to launch.
- **reporting (BI hub)** — the unioned, attributed read-model is delivered to the BI hub marketing
  section (ADR-0062) as the reporting back-channel; the hub renders, this workflow never actuates.

## The steps

Operate one stage at a time, in numbered order. Load only what each stage's Inputs table lists;
produce exactly its named Outputs; run its Audit — a red audit **parks** the run, never
best-effort past it. Each step below is documented to the human+machine standard (`goal ·
grounding sources · instructions · gate/invariant inherited · inputs · outputs · autonomy &
tracer`); the per-stage machine contract is the stage `CONTEXT.md`.

### Step 01 — gather (B3: Gather)

- **Goal.** Ingest and name-normalize the marketing metric substrate — organic + paid — each
  reading cited with its source and as-of, a dormant collector flagged stale rather than presented
  as live.
- **Grounding sources.** `okf:social_metric` (organic, per post/channel), `okf:campaign_metric`
  (paid + send/journey/event results), `okf:campaign` (the in-scope rollup spine).
- **Instructions.** Resolve the reporting window + scope from the trigger and enumerate the
  in-scope `campaign` ids for the rollup. Pull `social_metric` + `campaign_metric` for the window;
  **normalize metric names (#135)** so the same number reads the same everywhere, keyed to its
  source. Stamp each reading with its **as-of**; a dormant/down collector (stale as-of, no fresh
  rows) is **flagged stale, never presented as live**. No fabricated reading.
- **Gate / invariant inherited.** **A5 evidence floor** — every reading cites its source ref +
  as-of; nothing fabricated. **A5c staleness honesty** — a dormant source (collector down) is
  flagged stale, never presented as live.
- **Inputs / outputs.** In: the reporting window + the three grounding rooms. Out: `gathered.md`
  (the name-normalized organic + paid readings keyed to source + as-of, the in-scope campaign ids,
  any stale-collector flags).
- **Autonomy & tracer.** Read + normalize only — **L0**, nothing actuates. The run writes
  `agent_run` / `agent_message` with per-reading source attribution.

### Step 02 — synthesize (B3: Synthesize)

- **Goal.** Union organic ∪ paid into one marketing picture and compute multi-touch attribution
  over touch → opportunity → won, with any cross-client benchmark anonymized and aggregated only.
- **Grounding sources.** Stage-01 `gathered.md`; `okf:social_metric` (organic side);
  `okf:campaign_metric` (paid side + spend); `okf:campaign` (attribution grouping).
- **Instructions.** **Union organic (`social_metric`) ∪ paid (`campaign_metric`)** into one
  result set, keyed by campaign + channel, carrying each source's as-of forward — the union is done
  in the **query layer**, not a DB view. Compute multi-touch attribution over **touch → opportunity
  → won (#1316)**: sourced/influenced pipeline vs spend, CPL, CAC, ROAS, citing the contributing
  touches (ad results are exposed for attribution, #1316). A metric with no clean source stays
  uncomputed and is noted, not invented.
- **Gate / invariant inherited.** **A5 evidence floor** — attribution figures cite their
  contributing touches; none fabricated. **A7 pool-never-bleed** — any cross-client benchmark is
  anonymized + aggregated only; no client identifier, no row-level personal data, no single-client
  figure leaves the aggregate.
- **Inputs / outputs.** In: the gathered readings + the three rooms. Out: `synthesis.md` (the
  unioned organic ∪ paid result set, the multi-touch attribution figures with cited touches, any
  anonymized aggregate benchmark).
- **Autonomy & tracer.** Synthesis is internal read-only — **L0**, nothing actuates. The
  contributing-touch refs per figure ride the tracer (A5 grounded-why feeds the BI hub).

### Step 03 — flag (B3: Deliver — launchpad, not readout)

- **Goal.** Surface anomalies and stale sources for a human as advisory flags, and pre-stage the
  parked-draft launchpad for any under-performer — read-and-flag only, no actuation.
- **Grounding sources.** Stage-02 `synthesis.md`; stage-01 `gathered.md` (the stale-collector flags
  to carry through); `okf:campaign` (naming the owning campaign per flag).
- **Instructions.** Detect anomalies in the synthesized result set — under-performing
  channels/campaigns (CPL / CAC / ROAS off target), spend-pace outliers, attribution gaps — citing
  the figure + as-of behind each flag. Carry the stage-01 **stale-collector flags** through so a
  stale source reads as stale, not as a real anomaly. Emit the flag set as **advisory only**,
  naming the owning procedure a human may route each to; for an under-performer, **auto-spawn the
  parked-draft launchpad** feeding **01-C (re-budget) / 01-L (re-plan)** — attributed,
  easy-button-ready, parked for a human's one-click launch.
- **Gate / invariant inherited.** **B3 launchpad rule** — the deliverable is a launchpad: an
  under-performer auto-spawns the owning worker procedure in a parked/draft state; this stage never
  actuates it (ADR-0136 §B B3). **A5 evidence floor** — each anomaly flag cites its figure + as-of.
  **A11** — the launchpad is the explicit seam; the owning procedure (01-C / 01-L) owns the act.
- **Inputs / outputs.** In: the synthesis + the stage-01 stale flags + the campaign spine. Out:
  `flags.md` (the advisory anomaly + stale-source flags, each with its citing figure + as-of and
  the suggested owning procedure) plus the pre-staged parked-draft launchpad — and nothing actuated.
- **Autonomy & tracer.** Flag + deliver only — **L0**; no send, no silver write, no action opened.
  Each flag is stamped with its citing figure + as-of for the tracer.

## Learning on-ramp (how this earns more autonomy)

This procedure has **no autonomy to earn** — it is a B3 read-model pinned at **L0** with no act to
gate (`always_gate: []`). Its learning signal is **accuracy, not approval**: the read-model is the
ground truth the *other* procedures are judged against, so a flag that a human acts on (a re-budget
in 01-C, a re-plan in 01-L) is a downstream tracer that validates the synthesis. The path here is
not "raise the dial" but "make the numbers match everywhere and the stale sources honest" — the
read-model earns trust by being right, and the actuation autonomy lives in the procedures it feeds.

## Dependencies & dormancy (honest posture — this documents the target, names the gates)

This SOP describes the **target** read-model. In v1 several legs are runtime-gated and the runtime
**fails closed** — the procedure is real and dry-runnable, but it does not silently present a
dormant source as live:

- **Metric collectors are credential / home-server gated (#119).** `social_metric` and
  `campaign_metric` hydrate only once the collectors land and bronze fills; until then the source is
  dormant and stage 01 flags it stale (A5c), never live.
- **The parked-draft launchpad depends on the ICM executor (#489 / epic #695 / #341).** The
  self-hosted Managed Agents executor + delegate/handoff bus is not yet live; until then stage 03
  delivers the flags + the *dry-runnable* launchpad description and stops — there is no Claude-Code
  actuation path (icm/CLAUDE.md), and B3 never actuated anyway.
- **Metric-name normalization (#135) is resolved.** Stage 01 reconciles unstable metric names so the
  same number reads the same everywhere; the union (#1316 attribution) consumes the normalized names.
- **The union is query-layer, not a DB view.** organic (`social_metric`) ∪ paid (`campaign_metric`)
  is composed in the synthesize step's query, keyed by campaign + channel — there is no materialized
  union object to keep in sync.

## Security & grounding

No secrets, no client PII, no client identifiers in this document (ADR-0060 / ADR-0086; this file
replicates to every agent machine). Data is referenced by room/id, never by value; the workflow's
own surface is read-only (`pg.read` / `knowledge.search` / `memory.recall`, no write, no send).
Every figure the read-model presents is grounded and cited or it is left uncomputed (A5); a dormant
collector is flagged stale (A5c). Any cross-client benchmark is anonymized + aggregated only — pool,
never bleed (A7). The fail-closed posture above is deliberate: dormant ≠ done, and a dormant leg is
documented as dormant.
