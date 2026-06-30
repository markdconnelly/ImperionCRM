---
id: marketing-01-BC-paid-ads
agent: belle
domain: marketing
op: "01-B/01-C"
archetype: B6
trigger: boost a Social Post into an Ad (01-B), or manage a live Ad budget — pause / re-budget (01-C)
autonomy:
  ceiling: L3
  always_gate: [ad-spend, boost, budget-change]
inputs:
  - the trigger (a performing post to boost — 01-B; or a live ad under-/over-pacing or a campaign end — 01-C)
  - the source social_post (boost path — the published creative reused)
  - the live ad (change path — current budget / state / spend pace)
  - social_metric for the post/ad (CPL, results, spend pace)
  - the linked campaign target / envelope (CPL target, approved budget)
  - ad-spend-rules + brand-voice references
outputs:
  - a grounded paid brief (performance vs target, the path, the cited case)
  - a fully-specified paid action (boost: creative + audience + budget; change: pause/raise/lower/hold + new-$/delta) with its consequence preview
  - a money-class Social Action parked at the gate with the 4-part easy-button (never auto-sent)
  - an idempotently-actuated, read-back-confirmed ad state + the spend reconciled to campaign_metric (→ 01-M)
  - approval.decided tracer events (the human-commits-the-spend signal)
seams: [campaign-owner, reporting]
steps:
  - 01-ground
  - 02-draft
  - 03-money-gate
  - 04-actuate
  - 05-reconcile
---

# SOP 01-B/01-C — paid-ads (Belle / the money procedure of the marketing plane)

> **Dual-audience document (ADR-0136 A8).** This is the *one* canonical document for
> procedures 01-B and 01-C: a human can follow it end-to-end to boost a post or change a
> live ad budget, and the runtime executes the same steps against the machine config
> (`agent.yaml` / `room.yaml` / the stage `CONTEXT.md` I/O contracts). The prose is
> single-sourced here; the execution SoR stays the ICM Workspace config the steps bind to.
> `subject` is a parameter, not a duplicate — the loop is the same whether the ad runs for
> a client or for Imperion.
>
> **This SOP mirrors the template-defining exemplar (#1759, social-inbox `sop.md`).** It
> instantiates that shape for Belle's money procedure; the control layer it cites (the §A
> invariants, the B6 archetype rule, the action-catalog kinds) is **cited, never redefined**
> here.
>
> **One document, two ops.** This SOP covers **both** 01-B (the organic→paid *boost*
> bridge) and 01-C (the live-ad *budget lifecycle* — pause / re-budget). They share one
> spine — ground → draft → MONEY GATE → actuate → reconcile — and one dial-proof money gate;
> the only branch is the path resolved at stage 01.

## What this procedure is

**Job.** Ground one paid action against its target, draft it fully — either a **boost** of
a performing post into an Ad (01-B) or a **budget change** on a live Ad (pause / raise /
lower / hold, 01-C) — carry it to the money gate where a **human** commits the spend, then
actuate idempotently and reconcile the spend. This realizes **Stream 01-B** (boost a Social
Post into a paid Ad) and **Stream 01-C** (manage a live Ad budget) as one five-stage loop.

**Archetype: B6 — Money-gate** (ADR-0136 §B). The spine is the inherited B6 template —
**Ground → Compute → Draft → MONEY GATE → Actuate (idempotent, reconcile) → Log+mirror** —
instantiated here as the five stages below (compute folds into ground/draft; log+mirror
folds into reconcile). The money gate at stage 03 is **`always_gate` class-1 forever**
(ADR-0136 A2 §1, money out). The rule is inherited from ADR-0136; this SOP honors it, it
does not restate it.

**NOT this procedure.** No public reply or net-new post enters this loop — a brand reply is
01-D (social-inbox) and a compose/fan-out is 01-A. There is no second spend path: a paid
action exits **only** through the one gauntlet-gated money-class Social Action (ADR-0058 /
ADR-0124). Belle never commits the spend — she does the full setup and hands up a one-click
commit (BO-01 §5; belle.md §6).

## Autonomy contract

- **Ceiling L3 (capability), dialed from L0 — but the spend is L0 forever.** Per ADR-0136 A3
  the procedure is built capability-complete to Belle's **L3** ceiling and **ships at L0
  (observe-only)**; the dial is earned per-workflow upward, admin-only, audited, reversible
  (ADR-0109/0121). What the dial may raise is only the **internal, reversible** work — the
  draft/recommendation (stage 02) and the post-approval operational steps (actuate
  read-back, reconcile) climb to **L2** at `auto`. **The spend itself never moves.**
- **The money gate is dial-proof, class-1, forever** (ADR-0136 A2 §1 money out; A10 "no
  clean undo"). Every spend — boost deploy, ad deploy, pause, or budget change — is
  `always_gate` and **never self-approves at any dial, in any mode, and never recedes**
  (`always_gate: [ad-spend, boost, budget-change]`; belle.md §6; ad-spend-rules.md). A
  *pause* is reversible in isolation but is a money-lifecycle commit, so it gates with the
  rest (01-C). Any audit failure parks for a human in every mode.
- **No "park and wait."** The agent assembles the **full** creative + targeting + budget and
  hands up a one-click commit; it never stages a partial action and stalls (belle.md §6).

## Inputs (procedure-level)

| Input | Grounded as | Why |
|---|---|---|
| The trigger | trigger payload | the post to boost (01-B) or the live ad to re-budget (01-C), and which path |
| Source post (boost path) | `okf:social_post` | the published post reused as the boost creative |
| Live ad (change path) | `okf:ad` | the live ad whose budget / state changes |
| Recent performance | `okf:social_metric` | CPL, results, spend pace — the case for the action |
| Campaign target | `okf:campaign` | the target CPL / approved budget envelope to measure against |
| Result store | `okf:campaign_metric` | where the committed spend + paid results reconcile (→ 01-M) |
| Money rules | `./skills/ad-spend-rules.md` | the money-class gate, budget/pacing/idempotency, the consequence-preview floor |
| Brand voice | `../../skills/brand-voice.md` | a boosted post is still the brand's voice |

Every `okf:` room above is in this workflow's `agent.yaml` `okf_rooms` allow-list
(least-privilege; ADR-0104 §5, enforced by `scripts/agent-yaml-gate.mjs`).

## Outputs (procedure-level)

A grounded paid brief (performance vs target, path, cited case), a fully-specified paid
action with its consequence preview (exact $ + irreversibility flag), a money-class Social
Action parked at the gate behind the 4-part easy-button, an idempotently-actuated and
read-back-confirmed ad state, the spend reconciled to `campaign_metric`, and the **tracer
events** that record the human commit (`approval.decided`).

## Seams (A11 — obligation/action separation)

This workflow owns only the **paid-action clock**; another owner holds the budget envelope
and the downstream read. The seam is an explicit Procedure Step, never co-ownership
(ADR-0136 A11):

- **Campaign owner** — an action whose budget would exceed the campaign's approved envelope
  is **escalated** to the campaign owner, never self-drafted as routine (ad-spend-rules.md).
- **Reporting (01-M)** — the reconciled spend + paid results roll to `campaign_metric` for
  attribution; the BI hub owns the read, this workflow only registers the link and writes
  the fact (belle.md §7).
- **The money approver** — a human (Sterling / Nick, or Mark proxy in v1) commits every
  spend at stage 03; the platform's Meta ad-account peer-approval is the twin of that gate.

## The steps

Operate one stage at a time, in numbered order. Load only what each stage's Inputs table
lists; produce exactly its named Outputs; run its Audit — a red audit **parks** the run,
never best-effort past it. Each step below is documented to the human+machine standard
(`goal · grounding sources · instructions · gate/invariant inherited · inputs · outputs ·
autonomy & tracer`); the per-stage machine contract is the stage `CONTEXT.md`.

### Step 01 — ground (B6: Ground → Compute)

- **Goal.** Assemble the grounded paid brief — the post's/ad's Social Metrics and the linked
  campaign's target vs spend pace — and resolve which path (boost 01-B vs change 01-C).
- **Grounding sources.** The trigger; `okf:social_post` (boost creative) or `okf:ad` (live
  ad); `okf:social_metric` (CPL, results, pace); `okf:campaign` (target / envelope).
- **Instructions.** Resolve the path, the target post or `ad` id, and the linked `campaign`
  id. Read recent `social_metric`: results, CPL, spend pace. Write the brief — current
  performance vs the campaign target/envelope and the case for an action — **citing each
  source + as-of**. If the metric room is empty/missing, **park** — never guess a number or
  a budget.
- **Gate / invariant inherited.** **A5 evidence floor** — every grounded fact cites its
  source ref + as-of; nothing fabricated. **A5c staleness honesty** — a dormant/down
  collector is flagged stale, never presented as live; an empty room is a stop, not a
  licence to guess.
- **Inputs / outputs.** In: the trigger + the four grounding rooms. Out: `paid-brief.md`
  (path, target post/ad id, linked campaign + target, current performance, cited sources
  with as-of).
- **Autonomy & tracer.** Read-and-compute is internally reversible → auto at **L2** (A10).
  The run writes `agent_run` / `agent_message` with the per-source citations.

### Step 02 — draft (B6: Draft)

- **Goal.** Draft one paid action — a boost (audience, budget, creative reuse) or a budget
  change (pause / raise / lower / hold) — fully specified with its exact dollar figure.
- **Grounding sources.** Stage-01 `paid-brief.md`; `./skills/ad-spend-rules.md`;
  `../../skills/brand-voice.md`; `okf:social_post` (boost path) or `okf:ad` (change path).
- **Instructions.** **Boost path (01-B):** draft the boost — creative reuse (the published
  post), audience, and the **exact budget**. **Change path (01-C):** draft the
  recommendation — pause, raise, lower, or hold, with the **exact new budget / delta**.
  State the **rationale** tied to the brief's performance-vs-target and the **consequence
  preview** (the exact $ + the irreversibility flag — settled money). Stage the draft as an
  `ad` record (internal, reversible) — nothing is committed and no spend occurs here.
- **Gate / invariant inherited.** **A5 evidence floor + brand-voice.md** — a boosted post
  reuses substantiation already on file; no new unsourced claim is introduced (cite-or-cut,
  refusal-class). **ad-spend-rules.md budget discipline** — every budget ties to the
  campaign target/envelope; an over-envelope spend escalates to the campaign owner, never
  self-drafted (the A11 seam).
- **Inputs / outputs.** In: the brief + the two skills + the source post/ad. Out:
  `paid-action.md` (path, the fully-specified action, the rationale, the consequence preview
  with exact $ + irreversibility flag).
- **Autonomy & tracer.** A draft is internal and reversible → auto at **L2** (A10); it
  commits nothing. The performance-vs-target citations ride the tracer (A5 grounded-why
  feeds the easy-button).

### Step 03 — money-gate (B6: MONEY GATE) — the dial-proof human commit

The first-class, terminal checkpoint of this procedure. The action is emitted as a
money-class Social Action (`ad_deploy` for a boost, `ad_pause` / `ad_rebudget` for a change;
FE `src/lib/agent/action-catalog.ts` / `social-actions.ts`; backend
`src/shared/social-actions.ts`) through the one gauntlet (ADR-0058) to the cockpit (#1014) /
Teams card (#274). The human's decision lands at the backend approval choke point
`src/functions/agent/approve.ts` (`agent_pending_action`, migration 0158).

- **Goal.** Get the spend committed by a **human** at the money gate, with the exact $ and
  the irreversibility flag on the easy-button — never an auto-commit at any dial.
- **Grounding sources.** Stage-02 `paid-action.md`; `./skills/ad-spend-rules.md`; `okf:ad`
  (the draft/delta to commit).
- **Instructions.** Classify the action **money-class** (`ad_deploy` / `ad_pause` /
  `ad_rebudget`) and mark it `always_gate`. Emit it as a money-class Social Action
  (`social_dispatch`) → the gauntlet → the cockpit. Present the **A4 4-part easy-button**:
  the drafted action + the grounded why (performance-vs-target, cited + as-of) + one-click
  **Commit** + the **consequence preview** (the exact $ budget / delta and the
  irreversibility flag — settled money). Meta ad-account peer-approval is the platform twin
  of this gate.
- **Gate / invariant inherited.** **A2 §1 (money out) + B6** — the spend is `always_gate`
  class-1, **dial-proof**: it never self-approves at any dial, in any mode, and never recedes
  (ADR-0109/A10 "no clean undo"). **A4 easy-button bar** — no money gate is presented
  without the exact $ and the irreversibility flag (ad-spend-rules.md). A *pause* gates with
  the rest (money-lifecycle commit).
- **Inputs / outputs.** In: the drafted action + the money rules + the ad record. Out:
  `proposed-spend.md` (the money-class action, the exact $ budget / delta, the grounded
  rationale, the consequence preview, the gauntlet routing decision) and the
  `approval.decided` tracer event on the human's commit.
- **Autonomy & tracer.** v1 = every spend parks (L0/draft); at `auto` the gate self-approves
  **nothing** — only the internal draft (stage 02) and the post-approval steps (stages
  04–05) may climb to L2. The commit writes `approval.decided` with the approver + as-of;
  any audit failure parks.

**Checkpoint.** **A human commits the spend in the cockpit** via the 4-part easy-button. In
`draft` mode and `auto` mode alike, every spend parks for a human and never self-approves —
money is a permanent human hold (Sterling / Nick, or Mark proxy v1).

### Step 04 — actuate (B6: Actuate — idempotent)

- **Goal.** On the human's approval, deploy the boost / apply the budget change via the Meta
  Marketing API, idempotently, and read back the live state before close.
- **Grounding sources.** Stage-03 `proposed-spend.md` (the human-committed action + exact
  $); `./skills/ad-spend-rules.md` (idempotency-key + read-back rules); `okf:ad`.
- **Instructions.** Actuate via the Meta Marketing API (`social_dispatch`, ADR-0124),
  **idempotency-keyed (procedure + ad + period) so a replay is a no-op, never a
  double-spend** (A9b). **Read back** the live ad id + budget + state from Meta before
  advancing (A9c) and confirm it matches the committed amount; a mismatch **parks**. Advance
  the `ad` to its true state — **Deployed** (boost), **Paused**, or the new **budget**
  (change). A dormant/missing Meta token or ad-account scope → **skip and flag**, never
  silently drop.
- **Gate / invariant inherited.** **A9 idempotent actuation** — idempotency key (A9b) +
  read-back / close-on-verification (A9c), external Meta SoR authoritative (A9a). A
  committed-amount ≠ read-back mismatch is an audit failure that parks.
- **Inputs / outputs.** In: the approved spend + the money rules + the ad record. Out:
  `actuate-result.md` (outcome: deployed | paused | re-budgeted | skipped-dormant | failed;
  the external Meta ad id; the read-back live budget/state; the resulting `ad` status).
- **Autonomy & tracer.** Mechanical actuate + read-back (L2-class scripts behind the gate).
  The result is stamped with the external Meta ad id + as-of.

### Step 05 — reconcile (B6: Log+mirror)

- **Goal.** Reconcile the actuated spend and results to `campaign_metric` and close the run.
- **Grounding sources.** Stage-04 `actuate-result.md`; `okf:campaign_metric` (where spend +
  paid results land); `okf:social_metric` (the boosted post's ongoing metrics); `okf:ad`
  (the run to close).
- **Instructions.** Register the live Meta ad id for spend + result collection so the next
  run's stage 01 grounds on real numbers (the collector hydrates async). Reconcile the
  committed spend + paid results to `campaign_metric` (organic ∪ paid attribution → 01-M).
  Stamp the run outcome on the `ad` (committed $, approver, as-of). Close the run.
- **Gate / invariant inherited.** **A9 idempotent actuation** — the reconcile writes the
  external-SoR fact, not a guess. **A7 pool-never-bleed** — cross-client/account spend
  correlation stays internal/aggregated, never in the record.
- **Inputs / outputs.** In: the actuate result + the three rooms. Out: `reconcile.md` (the
  registered metric link, the spend reconciled to `campaign_metric`, the run-outcome stamp
  with committed $ + approver + as-of, the close state).
- **Autonomy & tracer.** Mechanical reconcile + close (L2-class scripts). The close is logged
  with the committed $, the approver, and the as-of.

## Learning on-ramp (how this earns more autonomy)

The money gate is **not** a learning surface — it never moves off `always_gate`, no matter
how reliable the agent becomes (ADR-0136 A2/A3; money has no clean undo). What earns the
dial here is the **internal** work: a draft (stage 02) and the post-approval operational
steps (stages 04–05) that demonstrate reliable grounding and clean idempotent actuation can,
per-workflow and admin-only, climb to **L2** (ADR-0109/0121). Every human commit writes
**`approval.decided`** to the run trace, which feeds the **eval-harvest** (#1037) — but the
ceiling on the spend is permanent. **v1 = human-commits-every-spend;** the path to more
automation runs through the *reversible* steps, never around the gate.

## Dependencies & dormancy (honest posture — this documents the target, names the gates)

This SOP describes the **target** loop. In v1 several legs are runtime-gated and the runtime
**fails closed** — the procedure is real and dry-runnable, but it does not silently pretend
to spend:

- **Stage-04 ICM executor integration is runtime-gated** — the self-hosted Managed Agents
  executor + delegate/handoff bus is not yet live (#489 / epic #695 / #341). Until then
  stage 03 dry-runs to the money gate and stops (icm/CLAUDE.md: no Claude-Code send path).
- **Meta Marketing API actuation is credential / scope gated** — boost deploy and budget
  change need the Meta Ads scope + an ad-account id + a peer-approver set; with the
  test-stage flag off (`META_MARKETING_TEST_STAGE`, fail-closed) actuation is an honest
  skip-and-flag, never a silent or pretended spend.
- **LP paid-metric ingest is credential / home-server gated** — `social_metric` /
  `campaign_metric` hydrate only once the on-prem collectors + Meta credentials land; until
  then the source is dormant and stage 01 flags it stale (A5c), never live.
- **The money gate is gated by design, not by dormancy.** Even with every credential live,
  stage 03 still parks for a human — `always_gate` is a permanent product property, not a
  v1 limitation.

## Security & grounding

No secrets, no client PII, no client identifiers in this document (ADR-0060 / ADR-0086; this
file replicates to every agent machine). Data is referenced by room/id, never by value. **No
spend, budget, or dollar figure is ever logged into this document** — the exact $ lives on
the gated action and its tracer, not in the SOP. Every claim a draft makes is grounded and
cited or it is cut (A5; brand-voice.md). The fail-closed posture above is deliberate: dormant
≠ done, and the money gate never recedes.
