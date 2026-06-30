---
id: marketing-01-K-event-promotion
agent: belle
domain: marketing
op: 01-K
archetype: B9 (deadline-sentinel) + B7 sends via 01-I
trigger: an Event is created (a scheduled webinar/live event Imperion hosts, with a start time)
autonomy:
  ceiling: L1
  always_gate: [large-or-new-audience-blast]
inputs:
  - the Event record (start time, theme, fill target) — orchestration metadata, a Planned-Connector dep, not a room
  - linked campaign (objective, theme, the angle to serve)
  - existing/planned campaign_send + social_post for the campaign (dedupe surface)
  - incoming Event Registrations (read back through lead-capture, 01-F)
  - per-registrant consent_event basis (captured at registration, for downstream sends)
  - the attendance record (attended / no-show split)
  - matched contact kernel for registrants/enrollees
outputs:
  - a fill plan (campaigns/sends → 01-I, posts → 01-A) with lead times + cited campaign/as-of
  - the captured registrant set (each linked to its contact, with consent state + as-of)
  - the computed reminder schedule + the campaign-send hand-offs (each with its gate noted)
  - the attended/no-show split, the nurture-journey enrollments per track, the scoring hand-off, and the run-outcome stamp
seams: [Chase via 01-F lead_hook, campaign-send 01-I, social-content 01-A, lead-capture 01-F, nurture-journey 01-H, scoring 01-G]
steps:
  - 01-drive-fill
  - 02-capture-registrations
  - 03-watch-clock
  - 04-post-event
---

# SOP 01-K — event-promotion (Belle / the Event-lifecycle deadline sentinel)

> **Dual-audience document (ADR-0136 A8).** This is the *one* canonical document for
> procedure 01-K: a human can follow it end-to-end to run an event/webinar to a full house
> and a warm follow-up, and the runtime executes the same steps against the machine config
> (`agent.yaml` / `room.yaml` / the stage `CONTEXT.md` I/O contracts). The prose is
> single-sourced here; the execution SoR stays the ICM Workspace config the steps bind to.
> `subject` is a parameter, not a duplicate — the loop is the same whether the event belongs
> to a client or to Imperion.
>
> This SOP mirrors the template-defining exemplar **social-inbox (#1759)**. The control
> layer it cites (the §A invariants, the B9/B7 archetype rules, the action-catalog kinds) is
> **cited, never redefined** here.

## What this procedure is

**Job.** Take a scheduled event/webinar to a **full house and a warm follow-up**: drive
registrations through the other procedures, then **watch the event-start clock** and fire
reminders at the right lead times, then enroll attendees and no-shows into post-event
nurture. This realizes **Stream 01-K** (run an Event lifecycle) as one run per event
lifecycle.

**Archetype: B9 — Deadline-sentinel** (ADR-0136 §B). The spine is the inherited B9
template — **Watch → Detect → Quantify → Draft-rec → Route (parked, easy-button) +
notify** — instantiated here as the four stages below, with the **event-start time** as
the clock. Every outbound **send** additionally instantiates **B7 — Client-facing-send**,
but **never in this workflow** — each send is delegated to **campaign-send (01-I)** and
rides 01-I's gate. Both archetype rules are inherited from ADR-0136; this SOP honors them,
it does not restate them.

**NOT this procedure.** This workflow **orchestrates; it does not duplicate**. It owns no
send path of its own — every actuation belongs to a sub-procedure and carries that
sub-procedure's gate (A11). The event record is **orchestration metadata** (a
Planned-Connector dependency), not a room it reads; registrations are read back through
**lead-capture (01-F)**, never by a direct event-room read. Money never enters this loop —
a boost or ad is procedure 01-B / 01-C and is `always_gate` forever (ADR-0136 A2; belle.md
§6). The orchestrating campaign container that *instantiates* an event as a child is 01-L,
not here.

## Autonomy contract

- **Ceiling L1, dialed from draft.** Per ADR-0136 A3 the procedure is built to Belle's
  per-procedure ladder (ADR-0128) but **ships at draft/L0 (observe-only)**; autonomy is
  earned per-workflow upward, admin-only, audited, reversible (ADR-0109/0121). v1 runs
  **human-approves-all**.
- **This workflow holds NO send/post checkpoint of its own.** The sentinel's own acts are
  **internal planning + scheduling** of fill and reminders — reversible internal
  step-records, **auto at L2** under `auto` (ADR-0128 / ADR-0136 A10 row 1). It
  **pre-stages the easy-button on the clock; a human commits the send** (A11).
- **Every outbound inherits the sub-procedure's gate.** A **send** inherits the
  **campaign-send (01-I)** gate — a routine known-audience send may reach L3; a **post**
  inherits the **social-content (01-A)** gate. **Reminder sends fire on the event clock,
  but each send still passes its gate.**
- **Refusal floor, below every dial.** A **large or new-audience blast is `always_gate`**
  — staged fully, handed up, never auto-fired at any rung (`always_gate:
  [large-or-new-audience-blast]`; belle.md §6; room.yaml). Money (boost/ad) likewise never
  enters this workflow.

## Inputs (procedure-level)

| Input | Grounded as | Why |
|---|---|---|
| The event | trigger payload (Planned-Connector dep) | start time, theme, fill target — orchestration metadata, **not** a room |
| Linked campaign | `okf:campaign` | objective, theme, the angle to serve fill + reminders |
| Scheduled sends | `okf:campaign_send` | existing/planned sends to dedupe fill + reminders against |
| Planned posts | `okf:social_post` | existing/planned posts to dedupe fill against |
| Registrations | trigger payload → read back via 01-F | who registered (read through lead-capture, never a direct event read) |
| Contact kernel | `okf:contact` | resolve registrants/enrollees to contacts |
| Consent basis | `okf:consent_event` | a valid basis to send to each registrant downstream |
| Brand voice | `../../skills/brand-voice.md` | how every public word sounds (domain-tier skill) |

Every `okf:` room above is in this workflow's `agent.yaml` `okf_rooms` allow-list
(least-privilege; ADR-0104 §5, enforced by `scripts/agent-yaml-gate.mjs`). The event
record is **not** an `okf_room` — it is a Planned-Connector dependency, grounded only as
trigger metadata.

## Outputs (procedure-level)

A fill plan (campaigns/sends → 01-I, posts → 01-A, with lead times + cited campaign/as-of),
the captured registrant set (each linked to its contact, with consent state + as-of), the
computed reminder schedule + the campaign-send hand-offs (each with its gate noted), and
the post-event close — the attended/no-show split, the nurture-journey enrollments per
track, the scoring hand-off, and the run-outcome stamp.

## Seams (A11 — obligation/action separation)

This workflow owns only the **event clock**; each act belongs to its sub-procedure. The
seam is an explicit Procedure Step, never co-ownership (ADR-0136 A11):

- **campaign-send (01-I)** — every fill send and every reminder send actuates here, riding
  01-I's consent + send gate. The sentinel pre-stages the easy-button; 01-I commits.
- **social-content (01-A)** — every organic fill post actuates here, riding 01-A's
  social-content gate.
- **lead-capture (01-F)** — every Event Registration is captured here (normalized,
  consent-captured, deduped); registrations are read back through it, never a direct event
  read. A registrant that crosses the MQL threshold routes onward to **Chase** via 01-F's
  `lead_hook` — the score crossing *is* the seam (belle.md §7).
- **nurture-journey (01-H)** — attendees and no-shows enroll here for post-event follow-up;
  the journey's sends carry their own (campaign-send) gate.
- **scoring (01-G)** — attendance feeds back here so the event signal moves `lead_score`.

## The steps

Operate one stage at a time, in numbered order. Load only what each stage's Inputs table
lists; produce exactly its named Outputs; run its Audit — a red audit **parks** the run,
never best-effort past it. Each step below is documented to the human+machine standard
(`goal · grounding sources · instructions · gate/invariant inherited · inputs · outputs ·
autonomy & tracer`); the per-stage machine contract is the stage `CONTEXT.md`.

### Step 01 — drive-fill (B9: Watch → Draft-rec; delegated B7 sends/posts)

- **Goal.** Plan and schedule the fill activities for one event — the campaigns, Campaign
  Sends, and organic posts — delegating every actuation to its sub-procedure.
- **Grounding sources.** The event (trigger payload); `okf:campaign` (the angle);
  `okf:campaign_send` + `okf:social_post` (the dedupe surface); `brand-voice.md`.
- **Instructions.** Resolve the event (start time, fill target, linked `campaign` id) and
  read existing `campaign_send` / `social_post` for the campaign to avoid double-scheduling.
  Plan the fill — which Campaign Sends (→ **campaign-send**, 01-I) and which organic posts
  (→ **social-content**, 01-A), at which lead times before the event — **citing the
  campaign + as-of**. Schedule each fill activity as a sub-procedure invocation tagged with
  the event + campaign attribution. **You schedule; each send/post actuates through its own
  procedure's gate** — this stage never sends. An empty/missing campaign room → **park**,
  never invent an event angle.
- **Gate / invariant inherited.** **A5 evidence floor** — every fill activity cites its
  campaign source + as-of; nothing fabricated. **A11** — each send/post is the
  sub-procedure's act, gated there; this stage holds only the schedule. **B9 rule** — watch
  and pre-stage, never auto-actuate.
- **Inputs / outputs.** In: the event + the four grounding sources. Out: `fill-plan.md`
  (the linked campaign id, the scheduled fill activities with lead times, cited sources
  with as-of).
- **Autonomy & tracer.** Planning + scheduling is internally reversible → auto at **L2**
  (A10). The run writes `agent_run` / `agent_message` with per-activity attribution.

### Step 02 — capture-registrations (B9: Detect; delegated capture via 01-F)

- **Goal.** Route each incoming Event Registration through the capture inbox so it lands as
  a normalized, consent-captured contact via lead-capture.
- **Grounding sources.** The registration set (trigger payload); `okf:contact` (dedupe /
  owner-resolution); `okf:consent_event` (consent captured at registration).
- **Instructions.** For each new registration assemble the capture payload (source = this
  event, campaign touch, consent state) and hand it to **lead-capture** (01-F) through the
  capture inbox. Confirm each registration resolved to a `contact` (dedupe / owner-
  resolution is lead-capture's job; this stage only verifies the round-trip), **citing the
  source registration + as-of**. Record the captured registrant set on the run for the
  clock and follow-up stages. Existing-customer registrants follow lead-capture's customer
  rule (not treated as new leads).
- **Gate / invariant inherited.** **A5 evidence floor** — each registration cites its
  source + as-of. **A11** — capture is lead-capture's act; this stage only routes and
  verifies the round-trip. **A7 pool-never-bleed** — no cross-client/audience data bleeds
  into the record (internal/aggregated only).
- **Inputs / outputs.** In: the registration set + contact kernel + consent state. Out:
  `registrations.md` (the captured registrant set, each linked to its `contact` with
  consent state + as-of, plus any unresolved registrations flagged for spot-check).
- **Autonomy & tracer.** The capture writes are internal/reversible and owned by
  lead-capture (auto at L2 there); this stage only routes and verifies — nothing outbound
  is committed. Each verification is stamped for the tracer.

### Step 03 — watch-clock (B9: Watch → Quantify → Route; sends are B7 via 01-I)

- **Goal.** Watch the event-start clock and fire reminder Campaign Sends at the right lead
  times — each through campaign-send's gate, never auto-fired here (the sentinel's core
  act).
- **Grounding sources.** The event clock (start time + reminder lead times, trigger
  payload); `okf:campaign` (the reminder's theme); `okf:campaign_send` (the reminder sends
  to schedule/dedupe); `okf:consent_event` (registered-audience consent).
- **Instructions.** Compute the due reminder lead times relative to the event-start time
  (cadence/date math, e.g. T-7 / T-1 / T-0); for each due reminder, dedupe against an
  existing `campaign_send` — **cite the event date + as-of**. Draft each reminder's angle
  from the linked `campaign` + brand voice — no fabricated claim/timeline (A5/B7). On each
  due lead time, hand the reminder to **campaign-send** (01-I) as a pre-staged easy-button.
  **The send rides campaign-send's gate** — a routine known-audience reminder may reach L3,
  a large/new-audience reminder is `always_gate`. The sentinel pre-stages; it never
  auto-fires a client send.
- **Gate / invariant inherited.** **B9 rule** — alert/escalate at the policy-set lead times
  and keep the easy-button pre-staged at every level; **never auto-actuate** a send even
  under deadline pressure, and a passed lead time is a **logged escalation**, not a license
  to fire (ADR-0136 B9). **A11** — the reminder send is campaign-send's act. **A5** — every
  reminder cited to the event date + as-of. **A2 + B7** — a large/new-audience reminder is
  `always_gate` (inherited at 01-I).
- **Inputs / outputs.** In: the event clock + the three grounding rooms. Out:
  `reminders.md` (the computed reminder schedule, the drafted reminder angles, the
  campaign-send hand-offs each with its gate noted, cited to the event date + as-of).
- **Autonomy & tracer.** Computing and scheduling the reminders is internal/reversible →
  auto at **L2**; each reminder **send** gates inside campaign-send. The clock fires the
  schedule; the gate fires the send. Each hand-off is stamped for the tracer.

### Step 04 — post-event (B9: Route + notify; delegated nurture via 01-H, scoring 01-G)

- **Goal.** Enroll attendees and no-shows into post-event nurture and feed attendance back
  to scoring — every follow-up send owned by nurture-journey.
- **Grounding sources.** The attendance record (attended / no-show, trigger payload); the
  stage-02 captured registrants; `okf:contact` (resolve enrollees); `okf:consent_event`
  (follow-up consent).
- **Instructions.** Split the registrant set into attended / no-show from the attendance
  record (cited + as-of); resolve each to its `contact`. Enroll attendees and no-shows into
  the matching post-event track via **nurture-journey** (01-H) — attendees into a warm
  follow-up, no-shows into a re-engage track. **The journey's sends carry their own
  (campaign-send) gate**; this stage only enrolls. Feed attendance back to scoring (→ 01-G)
  so the event signal moves `lead_score`. Stamp the run outcome (registered / attended /
  no-show counts, enrolled tracks, as-of) and close the run.
- **Gate / invariant inherited.** **A5 evidence floor** — the attendance split is cited +
  as-of. **A11** — every enrollee routes through nurture-journey; no send actuated here.
  **A7 pool-never-bleed** — cross-event correlation stays internal/aggregated. **B9 rule** —
  the terminal route + notify; the run's outcome is logged, including any missed lead time
  from stage 03.
- **Inputs / outputs.** In: the attendance record + the stage-02 registrants + the two
  rooms. Out: `post-event.md` (the attended/no-show split, the nurture-journey enrollments
  per track, the scoring hand-off, the run-outcome stamp + close state).
- **Autonomy & tracer.** Enrollment + scoring + close are internal/reversible → auto at
  **L2**; the post-event journey's **sends** gate inside nurture-journey (which inherits
  campaign-send's gate; large/new-audience → `always_gate`). The close is logged with the
  counts + as-of.

## Learning on-ramp (how this earns more autonomy)

This workflow's learning signal is **delegated, not local** — it holds no send checkpoint
of its own, so the approve / approve-with-feedback / deny tracer events
(`approval.decided`, `feedback.recorded`) are written by the **sub-procedures** it routes
to (campaign-send 01-I, social-content 01-A, nurture-journey 01-H). What this sentinel
earns separately is **the clock**: clean, on-time, deduped reminder schedules that the
operator approves at the gate demonstrate reliability, letting an admin **raise the dial**
on the *scheduling* acts (auto at L2 → the sentinel pre-stages without a babysitter) per
ADR-0109/0121, always within the L1 ceiling and never past the `always_gate` blast (ADR-0136
A3). **v1 = human-approves-all;** the path to more automation runs through this feedback
loop, not around it.

## Dependencies & dormancy (honest posture — this documents the target, names the gates)

This SOP describes the **target** loop. In v1 several legs are runtime-gated and the
runtime **fails closed** — the procedure is real and dry-runnable, but it does not silently
pretend to send:

- **The ICM executor + delegate/handoff bus is runtime-gated** — the self-hosted Managed
  Agents executor that would actuate the delegated sends/posts is not yet live (#489 / epic
  #695 / #341). Until then this sentinel dry-runs to each sub-procedure hand-off and stops
  (icm/CLAUDE.md: no Claude-Code send path).
- **The event-platform connector is a Planned Connector** — the event record (and the
  registration / attendance feeds) hydrate only once the event-platform connector lands.
  Until then the trigger metadata is dormant and the run flags it stale (A5c), never live.
- **Sub-procedure dormancy is inherited.** Fill/reminder sends are dormant until
  **campaign-send (01-I)** is live; fill posts until **social-content (01-A)**; registration
  capture until **lead-capture (01-F)**; post-event follow-up until **nurture-journey
  (01-H)**. This workflow does not light up ahead of the procedures it delegates to.
- **LP ingest is credential / home-server gated** — the campaign / consent / contact rooms
  this workflow grounds on hydrate only once the on-prem collectors + source credentials
  land; until then a dormant source is flagged stale at the grounding stage (A5c), never
  presented as live.

## Security & grounding

No secrets, no client PII, no client identifiers in this document (ADR-0060 / ADR-0086;
this file replicates to every agent machine). Data is referenced by room/id, never by
value. Every public claim a reminder makes is grounded and cited or it is cut (A5;
brand-voice.md). The fail-closed posture above is deliberate: dormant ≠ done, and a dormant
leg is documented as dormant.
