---
id: marketing-01-H-nurture-journey
agent: belle
domain: marketing
op: 01-H
archetype: B7
trigger: an enrollment signal (a lead, an event attendee/no-show, a behavioral trigger)
autonomy:
  ceiling: L1 — internal step-records are reversible (L2); each send inherits 01-I (blast always_gate)
  always_gate: [large-or-new-audience-blast]
inputs:
  - an enrolled contact (the journey's triggering signal)
  - the journey definition on the workflow substrate
  - the contact's current lead_score (below-MQL precondition)
  - per-recipient consent basis at each send
  - brand-voice references for every drafted send
outputs:
  - an enrollment record on the workflow substrate (basis + entry step)
  - a per-step internal change (wait / branch / score-bump) or a drafted send awaiting the gate
  - a consent-gated Campaign Send (via 01-I) per send step
  - a disposition (advance / MQL→Chase / exit / unsubscribe) + the seam emission at MQL
  - approval.decided / feedback.recorded tracer events (the learning signal)
seams: [Chase]
steps:
  - 01-enroll
  - 02-next-step
  - 03-send-gate
  - 04-progress
---

# SOP 01-H — nurture-journey (Belle / the multi-step nurture cadence)

> **Dual-audience document (ADR-0136 A8).** This is the *one* canonical document for
> procedure 01-H: a human can follow it end-to-end to carry an enrolled contact through a
> nurture cadence, and the runtime executes the same steps against the machine config
> (`agent.yaml` / `room.yaml` / the stage `CONTEXT.md` I/O contracts). The prose is
> single-sourced here; the execution SoR stays the ICM Workspace config the steps bind to.
> The journey is the same whether the enrollment came from a segment, an event, or a
> behavioral trigger — the enrollment basis is a parameter, not a duplicate procedure.
>
> **This SOP mirrors the template-defining exemplar (01-D social-inbox, #1759).** The
> control layer it cites (the §A invariants, the B7 archetype rule, the action-catalog
> kinds) is **cited, never redefined** here.

## What this procedure is

**Job.** Carry one **enrolled** contact through a multi-step nurture cadence — **send,
wait, branch, score-bump** — until it qualifies (MQL → Chase), exits the journey, or
unsubscribes. The journey owns its internal step records; **every send delegates to the
01-I send gate**. This realizes **Stream 01-H** (run a nurture journey, up to MQL).

**Archetype: B7 — Client-facing-send** (ADR-0136 §B). This is a *multi-step cadence*: the
internal steps (enroll, wait, branch, score-bump) are reversible internal records, but
**each send instantiates B7** — ground → compose → SEND GATE → send → log — and inherits
**01-I**'s consent gate rather than opening a second send path. The B7 archetype rule
(no fabricated capability/claim/timeline/price; opt-out + frequency hard stops at send
time) is inherited from ADR-0136; this SOP honors it, it does not restate it.

**NOT this procedure.** Money never enters this loop — a boost or ad is procedure
01-B / 01-C and is `always_gate` class-1 forever (ADR-0136 A2.1; belle.md §6). There is
no second send path: every send exits **only** through the one Campaign Send gauntlet
(ADR-0058 / 01-I). Lead **qualify/close** is Chase's (Stream 02), not here — this stream
hands off at the `lead_score` MQL crossing and never duplicates Chase's procedures.

## Autonomy contract

- **Ceiling L1, dialed from L0.** Per ADR-0136 A3 the procedure is built capability-complete
  but **ships at L0 (observe-only)**; the production dial **starts at L1** and climbs only
  on earned autonomy, per-workflow, admin-only, audited, reversible (ADR-0109/0121).
  v1 runs **human-approves-all**.
- **Internal step-records are reversible → L2** (ADR-0136 A10 row 1). Enrollment, wait,
  branch, and score-bump are internal writes with a clean inverse (a halt has no external
  trace), so they auto-execute at **L2**. No external party is touched by an internal step.
- **Each send inherits 01-I's ceiling, never this procedure's.** A **routine,
  known-audience** send may recede to **L3** when an operator raises the dial (ADR-0128);
  a **new or materially larger audience** blast is **`always_gate`** (`always_gate:
  [large-or-new-audience-blast]`; ADR-0136 A2.2 class-2; belle.md §6) — staged for a human
  in every mode. **Opt-out and frequency caps are hard stops at send time**, dial-proof.
- **Money is below the whole ladder.** A boost / ad / budget never auto-executes at any
  rung (ADR-0136 A2.1; belle.md §6) — and it is not this procedure's act in the first place.

## Inputs (procedure-level)

| Input | Grounded as | Why |
|---|---|---|
| The enrolled contact | `okf:contact` | the kernel record the journey runs against |
| Journey definition | `okf:workflow` | step graph + cadence timing + entry point (ADR-0073) |
| Current score | `okf:lead_score` | below-MQL is the nurture precondition; the MQL test |
| Per-send consent | `okf:consent_event` | a valid CAN-SPAM basis to send at send time |
| Send fact | `okf:campaign_send` | the per-send record 01-I gates and fires |
| Campaign context | `okf:campaign` | attribution + frequency-cap context for each send |
| Brand voice | `domains/marketing/skills/brand-voice.md` | how every drafted send sounds |

Every `okf:` room above is in this workflow's `agent.yaml` `okf_rooms` allow-list
(least-privilege; ADR-0104 §5, enforced by `scripts/agent-yaml-gate.mjs`).

## Outputs (procedure-level)

An enrollment record on the `workflow` substrate (basis + entry step), a per-step internal
change (wait / branch / score-bump) **or** a drafted send + variant awaiting the gate, a
consent-gated Campaign Send dispatched via 01-I, a disposition (advance | MQL→Chase | exit |
unsubscribe) with the seam emission at MQL, and the **tracer events** that feed learning
(`approval.decided`, `feedback.recorded`).

## Seams (A11 — obligation/action separation)

This workflow owns only the **nurture clock**; the receiving agent owns its act. The seam
is an explicit Procedure Step, never co-ownership (ADR-0136 A11):

- **Chase** — when the `lead_score` crosses the **MQL threshold** the contact routes to
  lead-scoring (01-G) → Chase / Stream 02 (lead-response). **The crossing IS the seam** —
  a deterministic route, not a hand-off actuation; Belle owns the marketing-qualification
  clock, Chase owns qualify/close (belle.md §7). This journey closes the enrollment on the
  crossing; it never duplicates Chase's procedures.

## The steps

Operate one stage at a time, in numbered order. Load only what each stage's Inputs table
lists; produce exactly its named Outputs; run its Audit — a red audit **parks** the run,
never best-effort past it. Each step below is documented to the human+machine standard
(`goal · grounding sources · instructions · gate/invariant inherited · inputs · outputs ·
autonomy & tracer`); the per-stage machine contract is the stage `CONTEXT.md`.

### Step 01 — enroll (B7: Ground — establish the run)

- **Goal.** Enroll the triggering contact on the `workflow` journey substrate, capturing
  its enrollment basis and its entry step.
- **Grounding sources.** The enrollment trigger payload; `okf:contact` (the enrolling
  contact); `okf:workflow` (step graph + entry point, ADR-0073); `okf:lead_score` (start
  state — below-MQL is the nurture precondition).
- **Instructions.** Resolve the **enrollment basis** from the trigger — segment membership,
  a sub-MQL captured lead (01-F), event follow-up / attendee / no-show (01-K), or manual.
  **Dedupe** against an existing active enrollment of this contact on this `workflow` — a
  re-enroll is a no-op, not a duplicate. Confirm the contact is **below MQL**; an
  already-qualified contact does not nurture — route straight to progress (step 04). Record
  the entry step, the segment/source basis, and the as-of.
- **Gate / invariant inherited.** **A5 evidence floor** — the enrollment basis cites its
  source + as-of; nothing fabricated. **A10 row 1** — enrollment is a reversible internal
  write (a re-enroll/halt has a clean inverse).
- **Inputs / outputs.** In: the trigger + the four grounding rooms. Out: `enrollment.md`
  (contact id, journey id, enrollment basis, entry step, start score — each with as-of).
- **Autonomy & tracer.** Enrollment is internally reversible → auto at **L2** (A10). The
  run writes `agent_run` / `agent_message` with the enrollment basis attributed.

### Step 02 — next-step (B7: Compose — drive the cadence; the folded 01-J audience step)

- **Goal.** Execute the next due cadence step for the enrolled contact — an A/B send, a
  wait, a branch, or a score-bump — and keep the enrollment's audience-segment basis fresh.
- **Grounding sources.** Stage-01 `enrollment.md`; `okf:workflow` (step graph + cadence
  timing); `okf:lead_score` (a branch / score-bump reads the score); `brand-voice.md`
  (how a send sounds — domain-tier skill).
- **Instructions.** Resolve the **next due step** deterministically from the journey
  definition against the enrollment position + cadence clock (wait timers / branch
  conditions are date and field math, not interpretation). For a **wait / branch /
  score-bump**: apply it as a **reversible internal step record** (L2) — set the next-due
  time, take the branch, or bump the score; no external party is touched. For a **send**
  step: draft the on-brand message (and its A/B variant if the step defines one) — no
  fabricated claim, stat, or timeline — and **hand the drafted send to step 03; do not send
  here.**
  **The audience-segment unit is a STEP here, not its own procedure** (folded 01-J,
  Stream-01 D9): build/refresh the segment membership that feeds enrollment — dynamic
  re-eval on cadence, respecting suppression / non-interest flags — as part of resolving
  who is due. It never becomes a separate send path.
- **Gate / invariant inherited.** **B7 compose rule** — a drafted send carries no
  fabricated capability/claim/timeline/price (refusal-class). **A5 evidence floor** + 
  **brand-voice.md** — an unsourced stat/testimonial/quote is cut, not invented. **A10 row
  1** — wait/branch/score-bump are reversible internal records. **A7 pool-never-bleed** —
  cross-contact engagement used to re-segment stays internal/aggregated, never bled.
- **Inputs / outputs.** In: the enrollment + the journey definition + score + brand voice.
  Out: `next-step.md` (the resolved step type, the applied internal change **or** the
  drafted send + variant awaiting the gate, and the updated enrollment position).
- **Autonomy & tracer.** Internal step records auto at **L2**; a drafted send is internal
  until the gate (L2). The step type + applied change is stamped for the tracer.

### Step 03 — send-gate (B7: SEND GATE — delegate to 01-I)

The first-class gate of this procedure: **each send is 01-I**. The send is emitted as a
Campaign Send ProposedAction through the one gauntlet (ADR-0058) to the cockpit / Teams
card. The human's decision lands at the backend approval choke point; the send fires
backend-only (ADR-0058) — there is no Claude-Code send path (icm/CLAUDE.md).

- **Goal.** Route the drafted journey send through the consent gate — opt-out and frequency
  hard stops at send time — escalating a new/large-audience posture to an `always_gate` blast.
- **Grounding sources.** Stage-02 drafted send; `okf:campaign_send` (the per-send fact to
  gate and fire); `okf:consent_event` (per-recipient CAN-SPAM / opt-out basis); `okf:campaign`
  (attribution + frequency-cap context).
- **Instructions.** Run the **consent gate, per recipient, at send time** (`consent.check`) —
  CAN-SPAM basis, opt-out state, frequency caps. A non-consented or opted-out recipient is
  **dropped** — a hard filter, never advisory; an over-cap send is held. **Classify audience
  posture**: routine (known audience, within cap) vs blast (new or materially larger
  audience). Emit the send as a Campaign Send ProposedAction → the gauntlet. Present the
  **A4 4-part easy-button**: the drafted send + the grounded why (substantiation + as-of +
  driving policy) + one-click **Fire** + the audience/recipient-count preview.
- **Gate / invariant inherited.** **A2.2 + B7** — a client-facing send is `always_gate`
  class-2; a **routine known-audience** send carries the L3 carve-out (ADR-0128), a **blast**
  escalates to `always_gate` (`large-or-new-audience-blast`). **The opt-out / frequency hard
  stop is dial-proof** (belle.md §6; BO-01 §5). **A4 easy-button bar.** **A10** — a fired
  send is *externally reversible but client-visible* → never silent.
- **Inputs / outputs.** In: the drafted send + the per-send record + consent + campaign.
  Out: `proposed-send.md` (the consented recipient set with drops noted, the audience
  posture, the per-send action, the gauntlet routing decision) and the approval/feedback
  tracer events.
- **Autonomy & tracer.** v1 = every send parks. At `auto`: only a **routine** known-audience
  send — consent-clean, within caps, clean audit — self-approves at L3; a **blast**, any
  **consent/opt-out failure**, or **any audit failure** parks for a human in every mode.
  Every decision writes `approval.decided`; the gate outcome writes `feedback.recorded`.

### Step 04 — progress (B7: Log + back-sync; the engagement→01-G feedback)

- **Goal.** Advance the enrollment or terminate it — at MQL (→ 01-G → Chase), journey exit,
  or unsubscribe — and feed engagement back to scoring.
- **Grounding sources.** Stages 02–03 step result; `okf:lead_score` (the MQL crossing test);
  `okf:consent_event` (an unsubscribe terminates); `okf:workflow` (end condition / next-due
  position, ADR-0073).
- **Instructions.** **Feed the step's engagement back to scoring** (01-G) and read the
  updated `lead_score`; evaluate against the MQL threshold. Then **terminate or advance**:
  **MQL crossed** → route to lead-scoring (01-G) → Chase / Stream 02 — the crossing IS the
  seam — and close this enrollment; **unsubscribe** (`consent_event`) → stop the journey
  immediately, no further send; **journey end** reached → exit and close; **otherwise** →
  set the next-due position and hand back to step 02. Stamp the outcome with the as-of.
- **Gate / invariant inherited.** **A11** — the MQL crossing is the explicit seam step
  (Chase owns qualify; this journey owns the clock); the route is deterministic, not an
  actuation. **A7 pool-never-bleed** — cross-contact engagement correlation stays
  internal/aggregated, never in the record. **A10 row 1** — the disposition write is a
  reversible internal record.
- **Inputs / outputs.** In: the step result + updated score + consent + journey definition.
  Out: `progress.md` (the updated score, the disposition — advance | MQL→Chase | exit |
  unsubscribe — the seam emission if MQL, the next-due position if advancing).
- **Autonomy & tracer.** Mechanical scoring feedback + disposition (L2 internal). The
  disposition is logged with the as-of; the seam emission (if MQL) is stamped for the tracer.

## Learning on-ramp (how this earns more autonomy)

The send-gate outcomes are the procedure's learning signal. Every approve /
approve-with-feedback / deny at step 03 writes **`approval.decided`** and
**`feedback.recorded`** to the run trace; these feed the **eval-harvest** (#1037) → a
journey that demonstrates earned reliability on **routine, known-audience** sends lets an
admin **raise the dial** per-workflow (ADR-0109/0121), within the inherited 01-I ceiling and
never past an `always_gate` blast (ADR-0136 A3). **v1 = human-approves-all;** the path to
more automation runs through this feedback loop, not around it. A **blast** never earns
auto — it is `always_gate` forever.

## Dependencies & dormancy (honest posture — this documents the target, names the gates)

This SOP describes the **target** loop. In v1 several legs are runtime-gated and the
runtime **fails closed** — the procedure is real and dry-runnable, but it does not silently
pretend to send:

- **The journey runner / ICM executor integration is runtime-gated** — the self-hosted
  Managed Agents executor + delegate/handoff bus is not yet live (#489 / epic #695 / #341;
  journey runner BE #145). Until then the cadence dry-runs to the send gate and stops
  (icm/CLAUDE.md: no Claude-Code send path).
- **The send leg depends on the 01-I Campaign Send path** (ADR-0058, backend-only) — every
  journey send fires through 01-I's consent gate; with the backend send path dormant a
  dispatch is an honest no-op, never a silent send.
- **LP ingest is credential / home-server gated** — `workflow` enrollment sources (segment
  membership, captured leads, event follow-up) and the `consent_event` basis hydrate only
  once the on-prem collectors + source credentials land (#119); until then the source is
  dormant and step 01/03 flag it stale (A5c), never live.
- **Event substrate is poll-first in v1** — behavioral-trigger enrollment and spike-driven
  cadence are deferred (#991); v1 drives the cadence on the poll clock.
- **Voyage recall is dormant** — #389 predictive/engagement-recall features are tabled; the
  journey scores and segments on rules only and says so (A5c).

## Security & grounding

No secrets, no client PII, no client identifiers in this document (ADR-0060 / ADR-0086;
this file replicates to every agent machine). Data is referenced by room/id, never by
value. Every claim a send makes is grounded and cited or it is cut (A5; brand-voice.md).
Consent (opt-out / frequency) is a per-recipient hard filter at send time, never advisory.
The fail-closed posture above is deliberate: dormant ≠ done, and a dormant leg is documented
as dormant.
