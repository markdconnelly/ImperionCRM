---
id: marketing-01-L-campaign-plan
agent: belle
domain: marketing
op: 01-L
archetype: B9 (deadline-sentinel) + orchestrating container
trigger: a campaign brief, or an operator launches a campaign
autonomy:
  ceiling: L1
  always_gate: []
inputs:
  - the campaign brief / request (goal, push, launch date)
  - the campaign record being planned or extended
  - prior social_metric performance for the brand/channels
  - prior ad budget context (envelope basis only — never a spend)
  - brand-voice substantiation references
outputs:
  - a grounded campaign basis (goal, audience read, performance read, budget read — cited)
  - a drafted plan (objective, target segment, channel mix, budget envelope, message)
  - a human-approved plan + budget envelope (the plan-gate decision)
  - the campaign's children scheduled via their own sub-procedures, each carrying its own gate
  - campaign attribution wired for metric rollup (→ 01-M / #1316)
seams: [social-content (01-A), nurture-journey (01-H), campaign-send (01-I), paid-ads (01-B), event-promotion (01-K)]
steps:
  - 01-ground
  - 02-draft-plan
  - 03-plan-gate
  - 04-launch
---

# SOP 01-L — campaign-plan (Belle / the demand-engine launch container)

> **Dual-audience document (ADR-0136 A8).** This is the *one* canonical document for
> procedure 01-L: a human can follow it end-to-end to plan and launch a campaign, and the
> runtime executes the same steps against the machine config (`agent.yaml` / `room.yaml` /
> the stage `CONTEXT.md` I/O contracts). The prose is single-sourced here; the execution
> SoR stays the ICM Workspace config the steps bind to. `subject` is a parameter, not a
> duplicate — the loop is the same whether the campaign is the client's or Imperion's.
>
> **This SOP follows the template-defining exemplar (01-D social-inbox, #1759).** The
> control layer it cites (the §A invariants, the B9 archetype rule + the A11 seam, the
> action-catalog kinds the *children* emit) is **cited, never redefined** here.

## What this procedure is

**Job.** Plan **one** marketing campaign — objective, target segment, channel mix, proposed
budget **envelope**, message — get the plan + envelope human-approved, then **launch its
children through their own sub-procedures**, each carrying its own gate. This realizes
**Stream 01-L** (plan & launch a campaign) as the orchestrating container of the
demand engine: it plans and it launches, it **never** duplicates a child's actuation.

**Archetype: B9 — Deadline-sentinel + orchestrating container** (ADR-0136 §B). Belle holds
the **launch clock** for the whole campaign (the B9 spine — watch dates → plan → route to
gates, never auto-actuate) while each child owns its own act. The four stages below
instantiate that spine — **Ground → Draft-plan → Plan-gate → Launch** — with stage 04
referencing 01-A/01-H/01-I/01-B/01-K as sub-procedures. The B9 rule is inherited from
ADR-0136; this SOP honors it, it does not restate it.

**NOT this procedure.** Money never gets committed here — the actual ad spend is procedure
01-B / 01-C and is `always_gate` class-1 forever (ADR-0136 A2/A10; belle.md §6). The
container's budget figure is an **envelope**, a planning number, never a spend
authorization. There is no second send/publish/spend path: every child exits **only**
through its own sub-procedure's gate (a post's publish-gate via 01-A, a send's send-gate
via 01-I, paid's money-gate via 01-B). This container **never widens or waives a child's
gate**, and it never re-implements a child's act (A11).

## Autonomy contract

- **Ceiling L1, dialed from `draft`.** Per ADR-0136 A3 the procedure ships at `draft`
  (observe-only) and earns autonomy per-workflow upward, admin-only, audited, reversible
  (ADR-0109/0121). v1 runs **human-approves-all**. The container's own ceiling is **L1**:
  the planning work it does is internal, but the plan-gate is the human's call.
- **The internal plan/draft is L2-reversible** (ADR-0128 row 1). Objective, target segment,
  channel mix, proposed budget **envelope**, and message are reversible-internal artifacts —
  at `auto` they may self-approve at L2. **Approving the plan + budget envelope is still a
  human gate** (stage 03): nothing the container drafts is client-facing, but the launch
  authorization is the human's.
- **Approving an envelope is NOT approving a spend.** The dial-proof floor below the whole
  ladder is **money**: the actual ad spend stays `always_gate` and is committed only inside
  `paid-ads` (01-B/01-C), behind its own money gate (ADR-0136 A2/A10 — money has no clean
  undo; belle.md §6). No dial level on **this** workflow authorizes a dollar of spend, and
  the container's `always_gate` is `[]` precisely because it never holds a money or send act
  of its own — every such act lives in a child and carries the child's gate.

## Inputs (procedure-level)

| Input | Grounded as | Why |
|---|---|---|
| The brief / request | trigger payload | the goal, the push, the launch date (the B9 clock) |
| Campaign record | `okf:campaign` | objective, theme, any prior plan to extend; one run per campaign |
| Prior performance | `okf:social_metric` | what's landed lately — the basis for the channel mix |
| Budget context | `okf:ad` | what paid has cost + delivered (envelope basis only — never a spend) |
| Brand voice | `domains/marketing/skills/brand-voice.md` | how the campaign's message must sound |

Every `okf:` room above is in this workflow's `agent.yaml` `okf_rooms` allow-list
(`[campaign, ad, social_post, campaign_send, social_metric]` — least-privilege; ADR-0104 §5,
enforced by `scripts/agent-yaml-gate.mjs`). The children's actuation rooms belong to **their
own** manifests, not this container's.

## Outputs (procedure-level)

A grounded campaign basis (goal + audience/performance/budget read, each cited with as-of),
a drafted plan (objective, named segment, channel mix, labelled budget envelope, on-brand
message with per-claim substantiation), a human-approved plan + envelope (the plan-gate
decision), the campaign's children scheduled via their sub-procedures (each carrying its own
gate), and the campaign-attribution wiring that rolls every child's metrics up to the
campaign (→ marketing-metrics / 01-M / #1316).

## Seams (A11 — obligation/action separation)

This workflow owns only the **launch clock and the campaign attribution tag**; each child
owns its act. The seam is an explicit Procedure Step (stage 04), never co-ownership, and the
container **never duplicates or waives** a child's gate (ADR-0136 A11):

- **social-content (01-A)** — organic posts; each rides its own **publish-gate**.
- **nurture-journey (01-H)** — the multi-step journey; each step's send rides 01-I's gate.
- **campaign-send (01-I)** — consent-gated sends; each rides its own **send-gate**.
- **paid-ads (01-B)** — ads; each rides its own **money-gate** (`always_gate`, dial-proof).
- **event-promotion (01-K)** — an event lifecycle, when the campaign drives a webinar/event;
  its fill sends ride 01-I and its B9 clock is its own.

## The steps

Operate one stage at a time, in numbered order. Load only what each stage's Inputs table
lists; produce exactly its named Outputs; run its Audit — a red audit **parks** the run,
never best-effort past it. Each step below is documented to the human+machine standard
(`goal · grounding sources · instructions · gate/invariant inherited · inputs · outputs ·
autonomy & tracer`); the per-stage machine contract is the stage `CONTEXT.md`.

### Step 01 — ground (B9: Watch → Detect)

- **Goal.** Assemble the grounded basis for one campaign plan — the goal, prior performance,
  and the budget context — each cited with its as-of.
- **Grounding sources.** the brief / trigger payload (goal, launch date); `okf:campaign`
  (any plan to extend); `okf:social_metric` (recent brand/channel performance); `okf:ad`
  (prior spend + delivery, envelope basis only); `brand-voice.md` (how the read must sound).
- **Instructions.** Resolve the brief — the campaign goal, the launch date (the B9 clock),
  any existing `campaign` to extend; dedupe against an existing plan for the goal. Read
  recent `social_metric` for the brand/channels and note what to lean into. Read the budget
  context from prior `ad` rows as the **envelope basis only** — this stage reads, it never
  commits or implies a spend. Write the grounded basis with each source cited + as-of.
- **Gate / invariant inherited.** **A5 evidence floor** — every grounded fact cites a source
  + as-of; nothing fabricated. **A5c staleness honesty** — a dormant/stale metric collector
  is flagged stale, never presented as live. An **empty/missing brand room is a stop**
  (park), never a licence to invent a voice or a claim.
- **Inputs / outputs.** In: the brief + the four grounding rooms. Out: `basis.md` (goal,
  launch date, linked campaign id, performance read, budget read, cited sources with as-of).
- **Autonomy & tracer.** Grounding is internally reversible → auto at **L2** (A10). The run
  writes `agent_run` / `agent_message` with per-fact source attribution.

### Step 02 — draft-plan (B9: Quantify → Draft-rec)

- **Goal.** Draft the campaign plan — objective, target segment, channel mix, budget
  envelope, message — with no fabricated claim, price, or timeline.
- **Grounding sources.** Stage-01 `basis.md`; `okf:campaign` (where the plan is staged);
  `okf:social_metric` (informs the channel-mix weighting); `brand-voice.md` (tone).
- **Instructions.** Draft the **objective** and the named **target segment** — one campaign,
  one objective. Draft the **channel mix** (which children — posts / sends / journey / paid /
  event — and their weighting), informed by the prior `social_metric` read. Draft the
  **proposed budget envelope** as a planning figure for the gate, **not a spend**; no
  fabricated price. Draft the **message** on-brand — every claim carries a real source or it
  gets cut. Stage the plan on the `campaign` record (internal, reversible — L2).
- **Gate / invariant inherited.** **A5 evidence floor** + **brand-voice.md** — an unsourced
  stat/testimonial/quote/capability/price/timeline is **cut, not invented** (refusal-class).
  **A7 pool-never-bleed** — no client identity / confidential data in the message copy.
- **Inputs / outputs.** In: the basis + the channel/voice rooms. Out: `plan.md` (objective,
  segment, channel mix mapping to child procedures, the budget envelope labelled "envelope —
  not a spend authorization", the message, per-claim substantiation).
- **Autonomy & tracer.** The plan + draft are internal until the gate → auto at **L2** (A10,
  ADR-0128 row 1). The substantiation ref per claim rides the tracer (A5 grounded-why).

### Step 03 — plan-gate (B9: Route — the human checkpoint)

The container's one human checkpoint. The plan + envelope are routed to the cockpit (#1014)
/ Teams card (#274) through the gauntlet (ADR-0058); the human's decision lands at the
backend approval choke point (`agent_pending_action`, migration 0158). **No child has
actuated** — this gate approves the **plan only**.

- **Goal.** Get the plan + budget envelope human-approved (or revised, or rejected), making
  plain that approving the envelope is not approving a spend.
- **Grounding sources.** Stage-02 `plan.md`; `okf:campaign` (the plan to approve).
- **Instructions.** Assemble the gate package: the plan, the channel mix (which children will
  launch), the proposed budget **envelope**, and the per-claim substantiation. Present the
  **4-part easy-button (A4)**: the drafted plan + the grounded why (cited basis +
  substantiation refs) + one-click **Approve plan + envelope** + its reversible inverse
  (**revise/reject** — the plan is internal, nothing has actuated). Mark the envelope
  explicitly as **"a planning figure, not a spend authorization."**
- **Gate / invariant inherited.** **A4 easy-button bar** — the gate is not "done" without
  the complete plan + grounded why + one-click commit + its inverse. **A2/A10** — the
  container holds **no** `always_gate` act of its own; the **money** floor is enforced where
  the spend lives (01-B/01-C), and this gate **never** waives it. Any unsubstantiated claim
  or any audit failure parks for a human in every mode.
- **Inputs / outputs.** In: the plan + the campaign record. Out: `proposed-plan.md` (the plan
  package, the labelled budget envelope, the substantiation summary, the approval routing
  decision) and the `approval.decided` tracer event.
- **Autonomy & tracer.** v1 = every plan parks (`draft`). At `auto` the internal plan/draft
  may have self-approved at L2 (reversible-internal, ADR-0128 row 1), **but approving the
  plan + budget envelope is a human gate** here; the envelope is never a spend authorization.
  The decision writes `approval.decided`.

### Step 04 — launch (B9: Route children to their gates; A11 seam)

- **Goal.** Schedule the approved campaign's children via their own sub-procedures, each
  carrying its own gate, and wire the campaign attribution.
- **Grounding sources.** Stage-03 approved plan; `okf:campaign` (the campaign + attribution
  tag); `okf:social_post` (the organic-post children); `okf:campaign_send` (the send
  children).
- **Instructions.** From the approved channel mix, enumerate the children to launch. **Route
  each child to its sub-procedure, carrying its own gate — never duplicate its actuation:**
  organic posts → `social-content` (01-A, publish-gate); sends → `campaign-send` (01-I,
  consent-gated send-gate); the nurture journey → `nurture-journey` (01-H, each step's send
  rides 01-I); paid → `paid-ads` (01-B, `always_gate` money-gate); an event, if any →
  `event-promotion` (01-K, its fill sends ride 01-I). Tag each child with the **campaign
  attribution** so metrics roll up to the campaign (→ marketing-metrics / 01-M / #1316).
  Stamp the launch outcome on the `campaign` (children scheduled, approver, as-of) and close.
- **Gate / invariant inherited.** **A11 obligation/action separation** — the container holds
  the launch clock; each child owns its act. The hand-off is the explicit seam; the container
  **never** re-implements a child's publish/send/spend and **never** waives its gate. **Paid
  children route to `paid-ads` with `always_gate` intact** — no spend committed here.
- **Inputs / outputs.** In: the approved plan + the campaign/post/send rooms. Out:
  `launch.md` (per child: the sub-procedure it routed to and the gate it carries, the
  campaign attribution wiring, the launch outcome stamp, the close state).
- **Autonomy & tracer.** Mechanical scheduling + attribution + stamp (L2-class `[script]`
  steps); each child's actuation parks/dials inside its own sub-procedure, never here. The
  launch close is logged with the approver + as-of.

## Learning on-ramp (how this earns more autonomy)

The plan-gate decision is the container's learning signal. Every approve / revise / reject
writes **`approval.decided`** to the run trace; this feeds the **eval-harvest** (#1037) → a
container that demonstrates earned reliability lets an admin **raise the dial** per-workflow
(ADR-0109/0121), within the **L1** container ceiling and never past the money floor that
lives in the children (ADR-0136 A3/A10). **v1 = human-approves-all;** the path to more
automation runs through this feedback loop — and even fully dialed, the container's launch
**never** authorizes a child's spend or waives a child's gate.

## Dependencies & dormancy (honest posture — this documents the target, names the gates)

This SOP describes the **target** loop. In v1 several legs are runtime-gated and the runtime
**fails closed** — the procedure is real and dry-runnable, but it does not silently pretend
to launch:

- **Stage-04 ICM executor integration is runtime-gated** — the self-hosted Managed Agents
  executor + delegate/handoff bus that fans the container out to its child sub-procedures is
  not yet live (#489 / epic #695 / #341). Until then stage 04 dry-runs to the gate and stops
  (icm/CLAUDE.md: no Claude-Code send/launch path).
- **Each child's own dormancy applies on top.** A scheduled child still only actuates when
  *its* substrate is live — `social-content`'s publish path, `campaign-send`'s consent +
  send path, `paid-ads`' money gate, `event-promotion`'s clock. The container scheduling a
  child never bypasses the child's dormancy or its gate.
- **`social_metric` / `ad` grounding is LP-ingest gated** — the prior-performance and budget
  reads (stage 01) hydrate only once the on-prem collectors land; until then those sources
  are dormant and stage 01 flags them stale (A5c), never live. A cold-start campaign reads
  "none" explicitly rather than improvising a performance basis.

## Security & grounding

No secrets, no client PII, no client identifiers in this document (ADR-0060 / ADR-0086;
this file replicates to every agent machine). Data is referenced by room/id, never by value.
Every claim the plan or message makes is grounded and cited or it is cut (A5;
brand-voice.md). The fail-closed posture above is deliberate: dormant ≠ done, and a dormant
leg — the container's or a child's — is documented as dormant.
