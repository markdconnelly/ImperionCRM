---
id: marketing-01-A-social-content
agent: belle
domain: marketing
op: 01-A
archetype: B7
trigger: a post brief, a campaign child (01-L), or an operator "post this"
autonomy:
  ceiling: L3
  always_gate: [large-or-new-audience-blast]
inputs:
  - the slot / brief (target channels, scheduled time, linked campaign)
  - linked campaign objective + theme
  - recent organic performance for the channel(s)
  - the calendar slot / existing draft (dedupe)
  - brand-voice + channel-norms + substantiation references
outputs:
  - a grounded brief (objective · angle · audience · key message · cited sources)
  - the single composition + per-channel adaptations (every claim substantiated)
  - a proposed publish action (audience posture, substantiation summary, gauntlet routing)
  - a dispatched, read-back-confirmed publish per channel + the social_post status
  - back-synced Social Metrics (→ 01-M) + the approval.decided tracer (the learning signal)
seams: [campaign-plan, marketing-metrics]
steps:
  - 01-ground
  - 02-compose
  - 03-publish-gate
  - 04-dispatch
  - 05-reconcile
---

# SOP 01-A — social-content (Belle / the compose-once → fan-out publish loop)

> **Dual-audience document (ADR-0136 A8).** This is the *one* canonical document for
> procedure 01-A: a human can follow it end-to-end to compose and publish a Social Post,
> and the runtime executes the same steps against the machine config (`agent.yaml` /
> `room.yaml` / the stage `CONTEXT.md` I/O contracts). The prose is single-sourced here;
> the execution SoR stays the ICM Workspace config the steps bind to. `subject` is a
> parameter, not a duplicate — the loop is the same whether the page belongs to a client
> or to Imperion.
>
> **Shape mirrors the 01-D exemplar (#1759).** This SOP follows the template-defining
> social-inbox SOP; the control layer it cites (the §A invariants, the B7 archetype rule,
> the action-catalog kinds) is **cited, never redefined** here.

## What this procedure is

**Job.** Compose **one** on-brand Social Post, adapt it per network, and carry it through
the publish gate to dispatch on our own established audience — drafted by Belle, approved
by a human (v1). This realizes **Stream 01-A** (compose & publish a social post, organic)
as the compose-once → fan-out flow (ADR-0124).

**Archetype: B7 — Client-facing-send** (ADR-0136 §B). The spine is the inherited B7
template — **Ground → Compose → SEND GATE → Send → Log+back-sync** — instantiated here as
the five stages below. The send is a **public post**, not the transactional-acknowledgement
carve-out: a routine post reaches **L3** (externally reversible via unpublish), a
**large/new-audience** post is `always_gate`. The archetype rule is inherited from
ADR-0136; this SOP honors it, it does not restate it.

**NOT this procedure.** **Compose-once → fan-out to selected channels (ADR-0124) is NOT a
Campaign Send.** A Campaign Send (01-I) is recipient-addressed and consent-gated per
recipient; this is one composition published on our own page identity to an established
audience — no per-recipient consent ledger, one `social_post` (+ per-channel rows). Money
never enters this loop — a boost or ad is procedure 01-B / 01-C and is `always_gate`
class-1 forever (ADR-0136 A2; belle.md §6). There is no second send path: a publish exits
**only** through the one Social Action gauntlet (ADR-0058 / ADR-0124). Inbound triage &
reply is 01-D (social-inbox), not here.

## Autonomy contract

- **Ceiling L3, dialed from L1.** Per ADR-0136 A3 the procedure is built
  capability-complete to Belle's **L3** ceiling but **ships at L0/draft (observe-only)**;
  autonomy is earned per-workflow upward, admin-only, audited, reversible
  (ADR-0109/0128). v1 runs **human-approves-all**; the dial starts at L1.
- **The L3 carve-out is the routine organic post** (ADR-0128 L3 routine; belle.md §1):
  when an operator raises the dial, stage 03 may self-approve **only a routine** post —
  pre-substantiated, on-brand, to an **established** channel/audience within frequency
  caps, with a clean audit — **execute-then-notify at L3** (the post is externally
  reversible via unpublish). A **large or new-audience blast**, any **unsubstantiated**
  claim, an **empty brand room**, or **any audit failure** parks for a human in every mode.
- **`always_gate` floor, above the L3 carve-out.** A **large/new-audience blast** is
  `always_gate` (ADR-0136 A2 class-2; belle.md §6) — no dial level self-approves it; Belle
  stages the segment, content, and timing and a human commits the send.

## Inputs (procedure-level)

| Input | Grounded as | Why |
|---|---|---|
| The slot / brief | trigger payload | what we're posting, where, and when |
| Linked campaign | `okf:campaign` | objective, theme, the angle to serve |
| Recent performance | `okf:social_metric` | what's landed lately on this channel |
| Calendar slot / draft | `okf:social_post` | dedupe against an existing draft for the slot |
| Channel rows | `okf:social_post_channel` | the per-network fan-out targets |
| Brand voice | `../../skills/brand-voice.md` | how every public word sounds |
| Channel norms | `./skills/channel-norms.md` | per-network length/format/link rules |
| Substantiation rules | `./skills/substantiation-rules.md` | cite-or-cut for every claim |

Every `okf:` room above is in this workflow's `agent.yaml` `okf_rooms` allow-list
(least-privilege; ADR-0104 §5, enforced by `scripts/agent-yaml-gate.mjs`).

## Outputs (procedure-level)

A grounded brief (objective · angle · audience · key message, each cited with as-of), the
single composition + per-channel adaptations (every claim substantiated), a proposed
publish action (audience posture, substantiation summary, gauntlet routing), a dispatched
publish (read-back-confirmed per channel, status-advanced), back-synced Social Metrics
(→ 01-M), and the **tracer events** that feed learning (`approval.decided`).

## Seams (A11 — obligation/action separation)

This workflow owns only the **publish clock** for one Social Post; the seam is an explicit
Procedure Step, never co-ownership (ADR-0136 A11):

- **campaign-plan (01-L)** — a campaign child arrives as a brief; this workflow grounds on
  the linked `campaign` but does not own the campaign plan.
- **marketing-metrics (01-M)** — stage 05 registers the published post ids and back-syncs
  `social_metric`; the BI hub / metrics workflow owns the downstream rollup, not this run.
- **Money is a hard boundary, not a seam** — a boost/ad is procedure 01-B/01-C and never
  enters this loop (`always_gate` class-1; belle.md §6).

## The steps

Operate one stage at a time, in numbered order. Load only what each stage's Inputs table
lists; produce exactly its named Outputs; run its Audit — a red audit **parks** the run,
never best-effort past it. Each step below is documented to the human+machine standard
(`goal · grounding sources · instructions · gate/invariant inherited · inputs · outputs ·
autonomy & tracer`); the per-stage machine contract is the stage `CONTEXT.md`.

### Step 01 — ground (B7: Ground)

- **Goal.** Assemble the grounded brief for one Social Post — voice, channel norms, the
  linked campaign, recent performance, and the slot — each cited with its as-of.
- **Grounding sources.** The slot/brief (trigger), `brand-voice.md`, `channel-norms.md`,
  `okf:campaign` (the slot's campaign), `okf:social_metric` (recent window),
  `okf:social_post` (an existing draft to dedupe against).
- **Instructions.** Resolve the slot: target channel set, scheduled time, linked
  `campaign` id (if any); dedupe against an existing `social_post`. Read recent
  `social_metric` for the channel(s) and note what to lean into. Write the brief — the
  objective, angle, audience, key message — **citing each source + as-of**.
- **Gate / invariant inherited.** **A5 evidence floor** — every grounded fact cites its
  source + as-of; nothing fabricated. **A5c staleness honesty** — a dormant collector
  (poll/recall down) is flagged stale, never presented as live. **Empty/missing brand room
  → park** — never invent a voice or a claim.
- **Inputs / outputs.** In: the slot + the grounding rooms/skills. Out: `brief.md`
  (channel set, scheduled time, linked campaign id, objective + angle + audience + key
  message, cited sources with as-of).
- **Autonomy & tracer.** Grounding is read-only → **L0**. The run writes `agent_run` /
  `agent_message` with per-fact source attribution.

### Step 02 — compose (B7: Compose)

- **Goal.** Author one composition and its per-network adaptations, every claim
  substantiated.
- **Grounding sources.** Stage-01 `brief.md`; `brand-voice.md`; `channel-norms.md`;
  `substantiation-rules.md`; `okf:social_post` (where the composition is staged);
  `okf:social_post_channel` (the fan-out targets to adapt for).
- **Instructions.** Write the **single composition** from the brief — on-brand, one idea,
  one CTA, hook front-loaded. For each target channel **adapt** per `channel-norms.md`
  (length, links, hashtags, media, alt-text) — adapt, don't duplicate. Run
  `substantiation-rules.md` over every claim: name a source + as-of, or **cut/soften**.
  Stamp the **audience descriptor** (established vs new/large) for the stage-03 gate.
- **Gate / invariant inherited.** **A5 evidence floor** + **substantiation-rules.md** — an
  unsourced stat/testimonial/quote/capability/scarcity is cut, not invented
  (refusal-class). **B7 compose rule** — no fabricated capability/timeline/price. **No
  client identity / confidential data** in public copy.
- **Inputs / outputs.** In: the brief + brand voice + channel norms + the post/channel
  rows. Out: `composition.md` (the single composition, per-channel adaptations, a
  substantiation ref per claim, the audience descriptor).
- **Autonomy & tracer.** Staging the composition on `social_post` + one
  `social_post_channel` row per channel is internal & reversible → auto at **L2** (A10).
  The substantiation refs per claim ride the tracer (A5 grounded-why feeds the easy-button).

### Step 03 — publish-gate (B7: SEND GATE) — the publish-gate contract

The first-class checkpoint of this procedure. The publish is emitted as a Social Action
(`publish_post_routine` / `publish_blast_new_or_large_audience` kinds, FE
`src/lib/agent/action-catalog.ts` / `social-actions.ts`; backend
`src/shared/social-actions.ts`) through the one gauntlet (ADR-0058 / ADR-0124) to the
cockpit (#1014) / Teams card (#274). The human's decision lands at the backend approval
choke point `src/functions/agent/approve.ts` (`agent_pending_action`, migration 0158).

- **Goal.** Get the publish approved (or edited, or denied) at the human gate, with the
  audience posture classified before it can send.
- **Grounding sources.** Stage-02 `composition.md` (incl. the audience descriptor);
  `okf:social_post` (the draft to publish); `okf:social_post_channel` (the per-channel
  targets).
- **Instructions.** Classify the audience posture from the composition's descriptor —
  **routine** (established audience, within frequency cap) vs **blast** (new or materially
  larger audience). Emit the publish as a Social Action → the gauntlet: a **routine** post
  carries the L3 routine-post rung (ADR-0128); a **blast** escalates to `always_gate`
  (ADR-0136 A2 class-2) — staged, never auto. Present the **A4 4-part easy-button**: the
  drafted post + the grounded why (substantiation refs + as-of) + one-click **Publish** +
  its one-click inverse (**unpublish**) + the reach/audience preview.
- **Gate / invariant inherited.** **A2 + B7** — a public client-facing send is
  `always_gate` class-2 for a **blast**, with the narrow **routine-post** L3 carve-out for
  the established-audience case only. **A4 easy-button bar.** **A10** — a published post is
  *externally reversible but client-visible* → max auto-ceiling **L3, never silent**
  (unpublish is the declared undo). **Money (boost/ad) is NOT in this action** — that is
  01-B/01-C.
- **Inputs / outputs.** In: the composition + the post/channel rows. Out:
  `proposed-publish.md` (the per-channel publish actions, the audience posture
  routine | blast, the substantiation summary, the gauntlet routing decision) and the
  approval tracer event.
- **Autonomy & tracer.** v1 = every publish parks (L0/draft). At `auto`: only a **routine**
  organic post self-approves at L3 (B7 routine carve-out); a **blast**, any
  **unsubstantiated** claim, an **empty brand room**, or **any audit failure** parks. Every
  decision writes `approval.decided`.

### Step 04 — dispatch (B7: Send)

- **Goal.** Publish the approved post per channel idempotently, and read back the status.
- **Grounding sources.** Stage-03 approved publish; `okf:social_post_channel` (the dispatch
  targets + external refs); `okf:social_post` (the status to advance).
- **Instructions.** For each approved channel, dispatch via the per-network adapter
  (`social_dispatch`, ADR-0124), **idempotency-keyed (post + channel)** so a retry is a
  no-op (A9b). A channel with a dormant/missing token is **skipped and flagged**, never
  silently dropped. **Read back** the publish status + external post id per channel before
  advancing (A9c); record it on the `social_post_channel` row. Advance the `social_post` to
  **Published** (or **Partially-published** if a channel was dormant).
- **Gate / invariant inherited.** **A9 idempotent actuation** — deterministic idempotency
  key (A9b) + read-back / close-on-verification (A9c), external SoR authoritative (A9a).
  **A7 pool-never-bleed** — no cross-client/audience data in the dispatch record.
- **Inputs / outputs.** In: the approved publish + the post/channel rows. Out:
  `dispatch-result.md` (per-channel: published | skipped-dormant | failed, the external
  post id where published, the resulting `social_post` status).
- **Autonomy & tracer.** Mechanical send + status advance (L2-class scripts behind the
  gate). Each dispatch is stamped with the approver + as-of.

### Step 05 — reconcile (B7: Log+back-sync)

- **Goal.** Register the published post ids for metric collection, back-sync Social
  Metrics, and close the run.
- **Grounding sources.** Stage-04 `dispatch-result.md` (what published, with external ids);
  `okf:social_metric` (where performance lands); `okf:social_post` (the run to close).
- **Instructions.** Register the published external post ids for metric collection so the
  next run's stage 01 grounds on real numbers (the collector hydrates async; this stage
  only registers the link, ADR-0124). **Back-sync Social Metrics → 01-M.** Stamp the run
  outcome on the `social_post` (published channels, approver, as-of). Close the run.
- **Gate / invariant inherited.** **A9c read-back** — close on the verified dispatch
  result, never on fire. **A7 pool-never-bleed** — cross-post performance correlation stays
  internal/aggregated, never in the record.
- **Inputs / outputs.** In: the dispatch result + the metric store + the post record. Out:
  `reconcile.md` (the registered metric links, the run-outcome stamp, the close state).
- **Autonomy & tracer.** Mechanical register + log (L2-class scripts). The close is logged
  with the approver + as-of.

## Learning on-ramp (how this earns more autonomy)

The publish-gate decision is the procedure's learning signal. Every approve / edit / deny
writes **`approval.decided`** to the run trace; this feeds the **eval-harvest** (#1037) →
an agent that demonstrates earned reliability on routine posts lets an admin **raise the
dial** per-workflow (ADR-0109/0128), within the L3 ceiling and never past the
`always_gate` blast (ADR-0136 A3). **v1 = human-approves-all;** the path to more automation
runs through this feedback loop, not around it.

## Dependencies & dormancy (honest posture — this documents the target, names the gates)

This SOP describes the **target** loop. In v1 several legs are runtime-gated and the
runtime **fails closed** — the procedure is real and dry-runnable, but it does not silently
pretend to publish:

- **Stage-03 ICM executor integration is runtime-gated** — the self-hosted Managed Agents
  executor + delegate/handoff bus is not yet live (#489 / epic #695 / #341). Until then
  stage 03 dry-runs to the gate and stops (icm/CLAUDE.md: no Claude-Code send path).
- **Meta social test-stage flags are OFF (fail-closed).** `META_SOCIAL_*_TEST_STAGE` gates
  the `social_dispatch` / `meta-organic` adapter; with the flag off a dispatch is an honest
  no-op (skipped-dormant), never a silent success. v1 keeps the publish grants withheld
  (migration 0209).
- **LP social ingest is credential / home-server gated** — `social_metric` (and the
  per-channel collectors) hydrate only once the on-prem collectors + Meta credentials land;
  until then stage 01 flags the source stale (A5c), never live, and stage 05 registers the
  link for later hydration.

## Security & grounding

No secrets, no client PII, no client identifiers in this document (ADR-0060 / ADR-0086;
this file replicates to every agent machine). Data is referenced by room/id, never by
value. Every public claim a post makes is grounded and cited or it is cut (A5;
substantiation-rules.md). The fail-closed posture above is deliberate: dormant ≠ done, and
a dormant leg is documented as dormant.
</content>
</invoke>
