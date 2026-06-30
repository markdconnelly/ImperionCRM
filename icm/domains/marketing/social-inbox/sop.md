---
id: marketing-01-D-social-inbox
agent: belle
domain: marketing
op: 01-D
archetype: B1
trigger: social.dm.received (poll v1)
autonomy:
  ceiling: L3
  always_gate: [1:1-existing-customer-DM]
inputs:
  - new social_engagement items (inbound DM / comment / mention)
  - prior interaction thread for each item
  - contact_social_identity author→contact match
  - consent_event basis per recipient
  - brand-voice + substantiation references
outputs:
  - per-item triage + routing decision (lead→Chase, support→Felix, brand→keep, spam→drop, existing-customer-DM→Celeste)
  - drafted on-brand reply for brand items (substantiated)
  - dispatched reply (test-stage gated) + contact-link + timeline log
  - feedback.recorded / approval.decided tracer events (the learning signal)
seams: [Chase, Felix, Celeste]
steps:
  - 01-gather-classify
  - 02-route
  - 03-draft-reply
  - 04-send-gate
  - 05-dispatch-log
---

# SOP 01-D — social-inbox (Belle / the Meta DM messaging loop)

> **Dual-audience document (ADR-0136 A8).** This is the *one* canonical document for
> procedure 01-D: a human can follow it end-to-end to triage the social inbox, and the
> runtime executes the same steps against the machine config (`agent.yaml` / `room.yaml` /
> the stage `CONTEXT.md` I/O contracts). The prose is single-sourced here; the execution
> SoR stays the ICM Workspace config the steps bind to. `subject` is a parameter, not a
> duplicate — the loop is the same whether the inbox belongs to a client or to Imperion.
>
> **This SOP is the template-defining exemplar (#1759).** It sets the shape for Belle's
> other Stream-01 procedures; the control layer it cites (the §A invariants, the B1/B7
> archetype rules, the action-catalog kinds) is **cited, never redefined** here.

## What this procedure is

**Job.** Sweep the inbound social plane, classify each item by **intent**
(lead | support | brand | spam), route it to the agent that owns the act, and — for
**brand** items only — draft an on-brand reply and carry it through the send gate to
dispatch. This realizes **Stream 01-D** (triage the social inbox & reply) as the main
flow and **01-E** (monitor mentions & sentiment) as the listening sweep that feeds it.

**Archetype: B1 — Triage / Route** (ADR-0136 §B). The spine is the inherited B1 template
— **Ground → Classify → Resolve-owner → Disposition → Log** — instantiated here as the
five stages below. The brand-reply disposition additionally instantiates **B7 —
Client-facing-send** at stage 04 (the send gate). Both archetype rules are inherited from
ADR-0136; this SOP honors them, it does not restate them.

**NOT this procedure.** Money never enters this loop — a boost or ad is procedure
01-B / 01-C and is `always_gate` class-1 forever (ADR-0136 A2.1; belle.md §6). There is
no second send path: a reply exits **only** through the one Social Action gauntlet
(ADR-0058). Public compose/fan-out (a net-new post) is 01-A, not here.

## Autonomy contract

- **Ceiling L3, dialed from L0.** Per ADR-0136 A3 the procedure is built
  capability-complete to Belle's **L3** ceiling but **ships at L0 (observe-only)**;
  autonomy is earned per-workflow upward, admin-only, audited, reversible
  (ADR-0109/0121). v1 runs **human-approves-all**.
- **The L3 carve-out is narrow** (ADR-0136 B7 transactional-acknowledgement sub-class):
  when an operator raises the dial, stage 04 may self-approve **only a templated,
  non-committal brand reply to a LEAD** — execute-then-notify at L3. A **free-text**
  reply stays gated; **any audit failure** parks for a human in every mode.
- **Refusal floor, below every dial.** A 1:1 DM to an **existing customer** is
  **refused, never queued** — routed to Celeste (BO-04). No dial level and no approval
  path *through this workflow* permits it (`always_gate: [1:1-existing-customer-DM]`;
  belle.md §6; room.md).

## Inputs (procedure-level)

| Input | Grounded as | Why |
|---|---|---|
| New inbound items | `okf:social_engagement` | the DMs / comments / mentions to triage |
| Prior thread | `okf:interaction` | a DM is a thread, not a one-off |
| Author identity | `okf:contact_social_identity` | resolve author handle → contact (the existing-customer guard) |
| Customer status | `okf:contact` | is the author an existing customer? (refusal floor) |
| Consent basis | `okf:consent_event` | a valid basis to reply in-channel at send time |
| Brand voice | `domains/marketing/skills/brand-voice.md` | how every public word sounds |

Every `okf:` room above is in this workflow's `agent.yaml` `okf_rooms` allow-list
(least-privilege; ADR-0104 §5, enforced by `scripts/agent-yaml-gate.mjs`).

## Outputs (procedure-level)

A triage batch (per-item intent + sentiment/topic + author match), a routing record,
a substantiated draft reply for brand items, a dispatched reply (read-back confirmed,
contact-linked, timeline-logged), and the **tracer events** that feed learning
(`approval.decided`, `feedback.recorded`).

## Seams (A11 — obligation/action separation)

This workflow owns only the **routing clock**; the receiving agent owns its act. The
seam is an explicit Procedure Step, never co-ownership (ADR-0136 A11):

- **Chase** — a **lead**-intent item emits a `lead_hook` into Stream 02 (lead-response).
- **Felix** — a **support**-intent item routes to service (Stream 04).
- **Celeste** — a 1:1 DM whose author is an **existing customer** is **refused** here and
  routed to her (relationship), never drafted or queued.

## The steps

Operate one stage at a time, in numbered order. Load only what each stage's Inputs table
lists; produce exactly its named Outputs; run its Audit — a red audit **parks** the run,
never best-effort past it. Each step below is documented to the human+machine standard
(`goal · grounding sources · instructions · gate/invariant inherited · inputs · outputs ·
autonomy & tracer`); the per-stage machine contract is the stage `CONTEXT.md`.

### Step 01 — gather-classify (B1: Ground → Classify)

- **Goal.** Sweep new inbound engagement, classify each item by intent, and tag
  sentiment + topic (the 01-E listening pass).
- **Grounding sources.** `okf:social_engagement` (new items), `okf:interaction` (prior
  thread), `okf:contact_social_identity` (author→contact), `brand-voice.md` (the
  topic/sentiment lens).
- **Instructions.** Resolve the sweep window and pull new `social_engagement` items since
  the last sweep, deduped. For each item classify intent — **lead | support | brand |
  spam** — and tag sentiment + topic. Resolve the author handle to a `contact` (or stamp
  "anonymous"); anonymous chatter stays off Contact-360.
- **Gate / invariant inherited.** **A5 evidence floor** — every item cites its source ref
  + as-of; nothing fabricated. **A5c staleness honesty** — a dormant source (poll down /
  recall down) is flagged stale, never presented as live.
- **Inputs / outputs.** In: the sweep window + the four grounding rooms. Out:
  `triage-batch.md` (per-item intent, sentiment/topic, author match, any stale flag).
- **Autonomy & tracer.** Classification is internally reversible → auto at **L2** (A10).
  The run writes `agent_run` / `agent_message` with per-item thought attribution.

### Step 02 — route (B1: Resolve-owner → Disposition)

- **Goal.** Route each classified item to exactly one owner — and enforce the
  existing-customer refusal floor.
- **Grounding sources.** Stage-01 `triage-batch.md`; `okf:contact` (existing-customer
  check).
- **Instructions.** **Customer guard first:** a 1:1 DM whose author is an existing
  customer is **REFUSED** and routed to Celeste (BO-04) — do not draft, do not queue.
  Otherwise route by intent: lead → Chase (emit `lead_hook` into Stream 02); support →
  Felix; brand → keep (continues to stage 03); spam → drop.
- **Gate / invariant inherited.** **B1 rule** — mechanical routing auto-executes at L2
  (assignment is internally reversible); the refusal floor and cross-client correlation
  carve-outs gate regardless of dial. **A11** — the hand-off is the explicit seam; the
  receiving agent owns its act. **A7 pool-never-bleed** — cross-client signal stays
  internal-only, never in the routing record.
- **Inputs / outputs.** In: the triage batch + customer status. Out: `routing.md`
  (per-item decision + receiving agent + the brand subset for stage 03).
- **Autonomy & tracer.** Routing auto at **L2**; the refusal is a dial-proof floor. Each
  decision is stamped for the tracer.

### Step 03 — draft-reply (B7: Compose)

- **Goal.** For brand items only, author the on-brand reply — substantiated, in voice, no
  fabricated claim.
- **Grounding sources.** Stage-02 brand subset; `okf:social_engagement` (the item);
  `okf:interaction` (thread); `brand-voice.md`.
- **Instructions.** Read the item + its thread; identify what's being asked. Draft the
  per-channel reply **in brand voice** — polished, unmistakably human, channel-appropriate,
  no impersonation. **Every claim carries a real source or it gets cut.** Mark the reply's
  class — **templated-ack** vs **free-text** — so stage 04 applies the right ceiling.
- **Gate / invariant inherited.** **A5 evidence floor** + **brand-voice.md** — an
  unsourced stat/testimonial/quote/capability is cut, not invented (refusal-class). **B7
  compose rule** — no fabricated capability/timeline/price.
- **Inputs / outputs.** In: the brand subset + the item/thread + brand voice. Out:
  `draft-reply.md` (reply text, channel, class, substantiation ref).
- **Autonomy & tracer.** A draft is internal until the gate (L2). The substantiation refs
  per claim ride the tracer (A5 grounded-why feeds the easy-button).

### Step 04 — send-gate (B7: SEND GATE) — the a/b/c outcome contract

The first-class, three-way outcome of this procedure. The reply is emitted as a Social
Action (`social_reply_*` kind, FE `src/lib/agent/action-catalog.ts` / `social-actions.ts`;
backend `src/shared/social-actions.ts`) through the one gauntlet (ADR-0058) to the cockpit
(#1014) / Teams card (#274). The human's decision lands at the backend approval choke point
`src/functions/agent/approve.ts` (`agent_pending_action`, migration 0158).

- **Goal.** Get the brand reply approved (or revised, or denied) at the human gate, with
  the consent/window check applied before it can send.
- **Grounding sources.** Stage-03 `draft-reply.md`; `okf:consent_event` (per-recipient
  basis); stage-02 routing (confirm brand-keep).
- **Instructions.** Run the **consent + window check** (`consent.check`) — a hard filter,
  non-eligible items drop, never send. Present the **A4 easy-button**: the complete drafted
  reply + the grounded why (substantiation + as-of + driving policy) + one-click **Send** +
  its one-click inverse (**retract**) + the recipient/consent basis.
- **Gate / invariant inherited.** **A2.2 + B7** — client-facing send is `always_gate`
  class-2, with the narrow **transactional-acknowledgement** L3 carve-out only. **A4
  easy-button bar.** **A10** — a posted reply is *externally reversible but client-visible*
  → max auto-ceiling **L3, never silent** (retract is the declared undo).

**The three-way outcome** (author to exactly this contract):

- **a — approved** → dispatch the reply via the `meta-organic` adapter
  (`src/shared/meta-organic.ts`: `replyToIgDirect` / `replyToFbComment`), **test-stage
  gated** behind `META_SOCIAL_*_TEST_STAGE` (fail-closed; dormant → honest no-op) → log
  dispatch (stage 05). Records `approval.decided`.
- **b — approved with feedback** → record the feedback as **`feedback.recorded`** (the
  learning signal) **and re-enter step 03 with the feedback as input → produce v2 →
  re-park stage 04 for a one-tap final approve.** A bounded back-edge (revise-cap); v2
  **still parks** — a customer-facing reply never auto-sends on the strength of a revise.
  Depends on the backend **`revise` outcome** (markdconnelly/ImperionCRM_Backend#498) —
  `approve.ts` today carries `approve | reject | edit | feedback` only.
- **c — denied** → record the denial reason as **`feedback.recorded`** → **drop the
  draft** → if the inbound thread still owes a reply, **route it to the operator queue**
  (no silent drop). Depends on the backend **deny-route** outcome
  (markdconnelly/ImperionCRM_Backend#499).

- **Inputs / outputs.** In: the draft + consent basis + routing. Out: `proposed-reply.md`
  (the per-item reply action, its class, the consent basis, the gauntlet routing decision)
  and the approval/feedback tracer events.
- **Autonomy & tracer.** v1 = every reply parks (L0/draft). At `auto`: only a templated,
  non-committal reply to a **lead** self-approves at L3 (B7 carve-out); free-text stays
  gated; an existing-customer reply never reaches this stage (refused at stage 02); any
  audit failure parks. Every decision writes `approval.decided`; every a/b/c also writes
  the feedback signal.

### Step 05 — dispatch-log (B1: Log; B7: Send → Log+back-sync)

- **Goal.** Dispatch the approved reply per network idempotently, attach it to its
  Contact, read back the status, and log the timeline.
- **Grounding sources.** Stage-04 approved reply; `okf:contact_social_identity` (author
  match); `okf:interaction` (thread); `okf:social_engagement` (the answered item).
- **Instructions.** Send via the per-network adapter, **idempotency-keyed (item +
  channel)** so a retry is a no-op (A9b). Attach the reply to its `contact` on match;
  leave anonymous chatter off Contact-360. **Read back** the send status (A9c); stamp the
  item replied (approver, as-of); write to the `interaction` timeline; roll listening
  sentiment/volume into `social_metric` (→ 01-M).
- **Gate / invariant inherited.** **A9 idempotent actuation** — idempotency key (A9b) +
  read-back / close-on-verification (A9c), external SoR authoritative (A9a). **A7** — no
  cross-client data in the record.
- **Inputs / outputs.** In: the approved reply + the four rooms. Out: `dispatch.md`
  (per-channel send status read-back-confirmed, contact attachment, timeline ref, close
  state).
- **Autonomy & tracer.** Mechanical send + log (L2-class scripts behind the gate). The
  close is logged with the approver + as-of.

## Learning on-ramp (how this earns more autonomy)

The a/b/c outcomes are the procedure's learning signal. Every approve / approve-with-
feedback / deny writes **`approval.decided`** and **`feedback.recorded`** to the run
trace; these feed the **eval-harvest** (#1037) → an agent that demonstrates earned
reliability lets an admin **raise the dial** per-workflow (ADR-0109/0121), within the L3
ceiling and never past an `always_gate` step (ADR-0136 A3). **v1 = human-approves-all;**
the path to more automation runs through this feedback loop, not around it.

## Dependencies & dormancy (honest posture — this documents the target, names the gates)

This SOP describes the **target** loop. In v1 several legs are runtime-gated and the
runtime **fails closed** — the procedure is real and dry-runnable, but it does not
silently pretend to send:

- **Stage-04 ICM executor integration is runtime-gated** — the self-hosted Managed Agents
  executor + delegate/handoff bus is not yet live (#489 / epic #695 / #341). Until then
  stage 04 dry-runs to the gate and stops (icm/CLAUDE.md: no Claude-Code send path).
- **The b-loop (`revise`)** depends on **markdconnelly/ImperionCRM_Backend#498** — the
  backend approval action enum is `approve | reject | edit | feedback` today; the bounded
  re-draft back-edge lands with the `revise` outcome.
- **The c-loop (deny-route)** depends on **markdconnelly/ImperionCRM_Backend#499** — the
  "drop draft, route the still-owed thread to the operator queue" path.
- **LP Meta DM ingest is credential / home-server gated** — `social_engagement` hydrates
  only once the on-prem collectors + Meta credentials land; until then the source is
  dormant and stage 01 flags it stale (A5c), never live.
- **IG / FB test-stage flags are OFF (fail-closed).** `META_SOCIAL_*_TEST_STAGE` gates the
  `meta-organic` adapter (`liveSocialWriteEnabled`); with the flag off a dispatch is an
  honest no-op. v1 keeps the `social_reply_*` grants withheld (migration 0209).

## Security & grounding

No secrets, no client PII, no client identifiers in this document (ADR-0060 / ADR-0086;
this file replicates to every agent machine). Data is referenced by room/id, never by
value. Every public claim a reply makes is grounded and cited or it is cut (A5;
brand-voice.md). The fail-closed posture above is deliberate: dormant ≠ done, and a
dormant leg is documented as dormant.
