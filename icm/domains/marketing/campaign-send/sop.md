---
id: marketing-01-I-campaign-send
agent: belle
domain: marketing
op: 01-I
archetype: B7
trigger: a scheduled send, or a nurture-journey step (01-H)
autonomy:
  ceiling: L1
  always_gate: [large-or-new-audience-blast]
inputs:
  - the scheduled Campaign Send + its linked campaign
  - the resolved audience/segment (contact recipient basis)
  - consent_event basis per recipient (opt-in / CAN-SPAM / opt-out)
  - recent campaign_send history per recipient (frequency-cap basis)
  - brand-voice + substantiation references
outputs:
  - a grounded send brief (copy + substantiation + audience descriptor)
  - the consent-clean recipient basis (counts + drop categories, no PII)
  - the proposed send action (routine vs always_gate blast) at the gate
  - the delivery read-back + reconciled campaign_metric attribution
  - approval.decided tracer events (the learning signal)
seams: [01-H, 01-M, Chase]
steps:
  - 01-build-ground
  - 02-consent-gate
  - 03-send-gate
  - 04-send-log
---

# SOP 01-I — campaign-send (Belle / the outbound Campaign Send loop)

> **Dual-audience document (ADR-0136 A8).** This is the *one* canonical document for
> procedure 01-I: a human can follow it end-to-end to ground, consent-gate, and fire a
> Campaign Send, and the runtime executes the same steps against the machine config
> (`agent.yaml` / `room.yaml` / the stage `CONTEXT.md` I/O contracts). The prose is
> single-sourced here; the execution SoR stays the ICM Workspace config the steps bind to.
> `subject` is a parameter, not a duplicate — the loop is the same whether the send is a
> client campaign or an internal newsletter.
>
> **Shape mirrors the template-defining exemplar (#1759, `social-inbox/sop.md`).** The
> control layer it cites (the §A invariants, the B7 archetype rule, the action-catalog
> kinds) is **cited, never redefined** here.

## What this procedure is

**Job.** Build and ground **one Campaign Send**, gate consent **per recipient at send
time**, carry the send through the send gate, and deliver it to a consented audience —
then read back delivery and reconcile attribution. This realizes **Stream 01-I**
(schedule & fire a Campaign Send) as Belle's outbound-comms act: the brand reaching its
audience in their inbox, through the one outbound send path (ADR-0058).

**Archetype: B7 — Client-facing-send** (ADR-0136 §B). The spine is the inherited B7
template — **Ground → Compose → SEND GATE → Send → Log** — instantiated here as the four
stages below. The send-gate stage is the first-class B7 outcome: a client-facing send is
`always_gate` class-2, with the narrow **routine-send** L3 carve-out only. The B7 rule is
inherited from ADR-0136; this SOP honors it, it does not restate it.

**NOT this procedure.** Money never enters this loop — a paid boost or ad is procedure
01-B / 01-C and is `always_gate` class-1 forever (ADR-0136 A2.1; belle.md §6). There is
no second send path: a send exits **only** through the one ADR-0058 backend send path
(`send.email`) — never an operator's personal mailbox, never an invented route. A net-new
public post is 01-A; the inbound triage/reply loop is 01-D (`social-inbox`), not here.

## Autonomy contract

- **Ceiling L1, dialed from L0.** Per ADR-0136 A3 the procedure ships at the domain
  default **L1** (`agent.yaml` `autonomy_rung: L1`; room.md) and is built capability-complete;
  autonomy is earned per-workflow upward, admin-only, audited, reversible (ADR-0109/0121).
  v1 runs **human-approves-all**.
- **The L3 carve-out is narrow** (ADR-0136 B7 routine-send sub-class; ADR-0128 L3
  execute-then-notify): when an operator raises the dial, stage 03 may self-approve **only a
  ROUTINE send** — consent-clean, to a **known/established** audience within frequency caps,
  with a clean audit. Any **unsubstantiated** claim, an **opt-out/consent** violation, or
  **any audit failure** parks for a human in every mode.
- **Blast floor, below every dial.** A **large or new-audience blast** is `always_gate`
  (`always_gate: [large-or-new-audience-blast]`; ADR-0136 A2 class-2; belle.md §6) — staged
  fully, never auto, a human commits the send. No dial level and no approval path *through
  this workflow* lets a blast self-fire.

## Inputs (procedure-level)

| Input | Grounded as | Why |
|---|---|---|
| The scheduled send | `okf:campaign_send` | the staged send + its audience basis |
| Linked campaign | `okf:campaign` | objective, theme, the offer to serve |
| Audience members | `okf:contact` | the recipient basis to size + ground |
| Consent basis | `okf:consent_event` | a valid opt-in / CAN-SPAM basis + no opt-out, per recipient |
| Send history | `okf:campaign_send` | frequency-cap evaluation per recipient |
| Brand voice | `domains/marketing/skills/brand-voice.md` | how every public word sounds |
| Performance store | `okf:campaign_metric` | where delivery + attribution lands (→ 01-M) |

Every `okf:` room above is in this workflow's `agent.yaml` `okf_rooms` allow-list
(least-privilege; ADR-0104 §5, enforced by `scripts/agent-yaml-gate.mjs`).

## Outputs (procedure-level)

A grounded send brief (built copy + the substantiation reference per claim + the audience
descriptor), the consent-clean recipient basis (counts + drop categories, no row-level
PII), the proposed send action (routine vs `always_gate` blast) at the gate, the delivery
read-back + reconciled `campaign_metric` attribution, and the **tracer events** that feed
learning (`approval.decided`).

## Seams (A11 — obligation/action separation)

This workflow owns the **send clock and the send act**; the upstream/downstream owners own
theirs. The seam is an explicit Procedure Step, never co-ownership (ADR-0136 A11):

- **01-H (nurture-journey)** — a journey step *delegates* a send into this gate; the
  journey owns its cadence, this procedure owns the consent gate + send. A send never
  auto-fires on a journey step's strength (blast → `always_gate`).
- **01-M (analytics)** — stage 04 registers the send for metric collection and reconciles
  attribution into `campaign_metric`; the analytics read-model (01-M) owns the rollup.
- **Chase** — a send is part of the Demand → Lead engine; lead routing at the MQL
  threshold is the Belle→Chase seam (belle.md §7), not an act of this procedure.

## The steps

Operate one stage at a time, in numbered order. Load only what each stage's Inputs table
lists; produce exactly its named Outputs; run its Audit — a red audit **parks** the run,
never best-effort past it. Each step below is documented to the human+machine standard
(`goal · grounding sources · instructions · gate/invariant inherited · inputs · outputs ·
autonomy & tracer`); the per-stage machine contract is the stage `CONTEXT.md`.

### Step 01 — build-ground (B7: Ground → Compose)

- **Goal.** Build one Campaign Send and resolve its audience/segment into a grounded
  brief — copy, the linked campaign, the audience basis — each cited with its as-of, no
  fabricated claim.
- **Grounding sources.** `okf:campaign_send` (the staged send + audience basis),
  `okf:campaign` (objective/offer), `okf:contact` (the resolved recipient set),
  `brand-voice.md` (how it sounds).
- **Instructions.** Resolve the send: scheduled time, linked `campaign` id, and the
  audience/segment → the `contact` recipient set, deduped. Build the send copy from the
  campaign + brand voice — on-brand, one offer, one CTA. **Every claim names a source +
  as-of, or it is cut/softened.** Classify the **audience descriptor** —
  **known/established** vs **new/materially-larger** — which feeds the stage-03 gate.
- **Gate / invariant inherited.** **A5 evidence floor** — every fact cites its source +
  as-of; nothing fabricated. **B7 compose rule** — no fabricated capability/timeline/price
  (refusal-class). An empty/missing brand room is a **stop, not a licence to invent copy**.
- **Inputs / outputs.** In: the schedule/journey trigger + the four grounding rooms. Out:
  `brief.md` (copy, substantiation ref per claim, recipient basis as counts, audience
  descriptor, cited sources with as-of).
- **Autonomy & tracer.** Build + ground is an internal draft → auto at **L2** (A10); the
  send itself does not actuate here. The run writes `agent_run` / `agent_message` with the
  substantiation refs riding the tracer.

### Step 02 — consent-gate (B7: per-recipient consent hard filter)

- **Goal.** Hard-filter the recipient list per recipient — CAN-SPAM, opt-out, frequency
  caps — dropping every non-consented recipient before the send is proposed.
- **Grounding sources.** Stage-01 `brief.md`; `okf:contact` (the recipient set);
  `okf:consent_event` (authoritative opt-in / CAN-SPAM / opt-out per recipient);
  `okf:campaign_send` (recent send history → frequency cap).
- **Instructions.** For **each recipient**, check `consent_event` for a valid opt-in /
  CAN-SPAM basis and **no** standing opt-out, then apply the **frequency cap** against
  recent `campaign_send` history. A non-consented, opted-out, or over-cap recipient is
  **dropped** — a hard filter, never advisory. If consent cannot be evaluated for a
  recipient, **exclude** that recipient; **never send on an unknown consent state.**
- **Gate / invariant inherited.** **The B7 opt-out/frequency hard stop** — consent is a
  per-recipient filter at send time, never list-level, never advisory (belle.md §6;
  CONSTITUTION §5.4). A systemic consent-source failure **parks** the run. **A7
  pool-never-bleed** — no cross-audience signal leaks into the record.
- **Inputs / outputs.** In: the brief + the recipient set + consent + history. Out:
  `consented-list.md` (filtered recipient basis as counts: eligible vs dropped, with drop
  category — opted-out | no-consent | over-cap | unverifiable — and the consent/cap as-of;
  no row-level PII).
- **Autonomy & tracer.** The filter is a deterministic `[script]` evaluation (L2-class);
  the consent/eligibility check is stamped per the tracer (belle.md §6 audience-basis
  tracer).

### Step 03 — send-gate (B7: SEND GATE) — the routine-vs-blast outcome

The first-class, gated outcome of this procedure. The send is emitted as a ProposedAction
(`send_email` kind, FE `src/lib/agent/action-catalog.ts` — T2 / `client_pii` /
`contact_channel`, `comms_send` executor) through the one gauntlet (ADR-0058) to the
cockpit / Teams card. The human's decision lands at the backend approval choke point
(`agent_pending_action`, migration 0158).

- **Goal.** Get the send approved (or escalated) at the human gate, with the audience
  posture (routine vs blast) decided and the consent-clean basis carried forward.
- **Grounding sources.** Stage-01 `brief.md` (copy + substantiation + audience descriptor);
  stage-02 `consented-list.md` (the consent-clean basis); `okf:campaign_send` (the send to
  propose).
- **Instructions.** Classify the send posture from the stage-01 descriptor + the consented
  counts: **routine** (known/established, within cap) vs **blast** (new or materially
  larger). Emit the send as a ProposedAction → the gauntlet. Present the **A4 easy-button**:
  the drafted send + the grounded why (substantiation refs + as-of) + one-click **Fire** +
  the audience/recipient-count preview (eligible vs dropped).
- **Gate / invariant inherited.** **A2.2 + B7** — a client-facing send is `always_gate`
  class-2, with the narrow **routine-send** L3 carve-out only (`send_email` is
  `autoAtLevel:3`, `alwaysGate:false`, but the `client_pii` data-class ceiling keeps v1
  parked, ADR-0118). **A4 easy-button bar.** **Money is NOT in this action** — a paid
  boost/ad is 01-B/01-C, `always_gate` (A2.1).

**The outcome contract** (author to exactly this):

- **routine → approve** → at `auto` and a clean audit, stage 03 may self-approve a
  **routine** send (execute-then-notify, L3 carve-out) → proceed to stage 04. In v1 (and
  for any blast) the human approves in the cockpit. Records `approval.decided`.
- **new/large → always_gate blast** → escalate to
  `publish_blast_new_or_large_audience` = `always_gate` (ADR-0136 A2 class-2): the send is
  **staged, never auto** — a human commits it. No dial level lets a blast self-fire.
- **fail → park** → any **unsubstantiated** claim, an **opt-out/consent** violation, or
  **any audit failure** parks for a human in every mode — never best-effort past a red audit.

- **Inputs / outputs.** In: the brief + consented list + the send record. Out:
  `proposed-send.md` (the send action, the audience posture, the substantiation summary,
  the recipient-count preview, the gauntlet routing decision) and the approval tracer event.
- **Autonomy & tracer.** v1 = every send parks (L0/draft). At `auto`: only a routine,
  consent-clean, known-audience send with a clean audit self-approves at L3 (B7 carve-out);
  a blast never self-fires; any audit failure parks. Every decision writes
  `approval.decided` with the human approver + as-of.

### Step 04 — send-log (B7: Send → Log + back-sync)

- **Goal.** Fire the approved send idempotently, read back delivery, advance the send
  status to the true outcome, and reconcile attribution into Campaign Metrics.
- **Grounding sources.** Stage-03 approved send; stage-02 `consented-list.md` (the basis to
  fire to); `okf:campaign_send` (the status to advance); `okf:campaign_metric` (where
  delivery + performance lands).
- **Instructions.** Fire via the backend send path (`send.email`, ADR-0058 backend-only) to
  the consented list, **idempotency-keyed (campaign_send + period) so a replay is a no-op**
  — never a double-send (A9b). **Read back** delivery (accepted / bounced / deferred) before
  advancing (A9c); record it on the `campaign_send` row. Advance the send to **Delivered**
  (or **Partially-delivered**) — a failed/partial fire is recorded as such, never presented
  as delivered. Register the send for metric collection and reconcile attribution into
  `campaign_metric` (→ 01-M); close the run.
- **Gate / invariant inherited.** **A9 idempotent actuation** — idempotency key (A9b) +
  read-back / close-on-verification (A9c), external SoR authoritative (A9a). **A7
  pool-never-bleed** — cross-audience performance correlation stays internal/aggregated,
  never in the record.
- **Inputs / outputs.** In: the approved send + the consented basis + the two rooms. Out:
  `send-log.md` (delivery result — delivered | partial | failed, with accepted/bounced
  counts — the resulting `campaign_send` status, the registered metric links, the close
  state).
- **Autonomy & tracer.** Mechanical fire + log (L2-class scripts behind the gate). The close
  is logged with the approver + as-of.

## Learning on-ramp (how this earns more autonomy)

The send-gate outcome is the procedure's learning signal. Every approve / escalate / park
writes **`approval.decided`** to the run trace; these feed the **eval-harvest** (#1037) → an
agent that demonstrates earned reliability on **routine known-audience sends** lets an admin
**raise the dial** per-workflow (ADR-0109/0121), within the L3 routine carve-out and never
past the `always_gate` blast (ADR-0136 A3). **v1 = human-approves-all;** the path to more
automation runs through this feedback loop, not around it — and never reaches a blast.

## Dependencies & dormancy (honest posture — this documents the target, names the gates)

This SOP describes the **target** loop. In v1 several legs are runtime-gated and the runtime
**fails closed** — the procedure is real and dry-runnable, but it does not silently pretend
to send:

- **Stage-03 ICM executor integration is runtime-gated** — the self-hosted Managed Agents
  executor + delegate/handoff bus is not yet live (#489 / epic #695 / #341). Until then
  stage 03 dry-runs to the gate and stops (icm/CLAUDE.md: no Claude-Code send path).
- **The backend send path is gated** — the `send_email` action executes through the
  backend's `comms_send` binding (ADR-0058); with the executor dormant a fire is an honest
  no-op, never a silent send. The `client_pii` data-class ceiling (ADR-0118) keeps v1 parked
  even where capability is L3.
- **LP / source ingest is credential-gated** — `campaign_send`, `consent_event`, and
  `campaign_metric` hydrate only once the on-prem collectors + source credentials land;
  until then a dormant consent source is flagged stale (A5c) and stage 02 **excludes**
  rather than sends on an unknown state.
- **Consent substrate honesty** — the per-recipient consent gate is only as strong as the
  `consent_event` basis; an unverifiable consent state excludes the recipient (fail-closed),
  it never defaults to send.

## Security & grounding

No secrets, no client PII, no client identifiers in this document (ADR-0060 / ADR-0086; this
file replicates to every agent machine). Data is referenced by room/id, never by value;
recipient bases are counts + categories, never row-level. Every public claim a send makes is
grounded and cited or it is cut (A5; brand-voice.md). Consent is a per-recipient hard filter
at send time, never advisory. The fail-closed posture above is deliberate: dormant ≠ done,
and a dormant leg is documented as dormant.
