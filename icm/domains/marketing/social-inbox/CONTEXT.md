# Workflow: social-inbox (marketing v1)

**Job:** sweep the inbound social plane, classify each item by **intent**
(lead | support | brand | spam), route it to the agent that owns the act, and —
for **brand** items only — draft an on-brand reply and get it sent. This realizes
**two** Stream-01 procedures: **01-D** (triage the social inbox & reply) as the
main flow, and **01-E** (monitor mentions & sentiment) as the gather/listening
sweep that feeds it. (Stream 01-D/01-E; B1 triage/route + B7 reply + B3 listening.)

**Trigger:** a scheduled listening sweep finds new `social_engagement` items (DMs,
comments, mentions), or an operator says "work the inbox." One run per sweep batch;
each item carries its own intent + routing decision.

**Sender identity:** a brand reply is dispatched in-channel as the page identity
through the approval-gated `send.dm` path (ADR-0058). There is no second send path,
and **money never enters this workflow** — a boost/ad is procedure 01-B/01-C.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather-classify | Sweep new engagement items, classify intent, tag sentiment/topic for listening | — |
| 02 | route | Route by intent; existing-customer DM → REFUSE + route to Celeste | — |
| 03 | draft-reply | Brand items only: author the on-brand reply (no fabricated claim) | — |
| 04 | send-gate | Route the reply as a Social Action → gauntlet → cockpit | **Yes** |
| 05 | dispatch-log | Per-channel idempotent send; contact-link; read back; log timeline | — |

## Autonomy

Starts `draft` (ADR-0061); the domain default is L1 (room.md). Intent
classification and intent-based routing are internally reversible and auto at
**L2**; listening tag/log (sentiment, topic, contact-link) auto at **L2**. When an
admin flips this workflow to `auto`, stage 04 may self-approve **only a TEMPLATED,
non-committal brand reply to a LEAD** — execute-then-notify at **L3** (ADR-0128 B7
carve-out). A **free-text** reply, any reply to an **existing customer**, and **any
audit failure** park for a human in every mode.

One act is a **refusal floor below every dial:** a 1:1 DM to an **existing
customer** is **refused, never queued** — routed to Celeste (BO-04). No dial level
and no approval path *through this workflow* permits it (room.md; belle.md §6).

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `brand-voice.md` (every marketing draft
sounds the same). Mark-editable business content; stages cite, never restate.
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed workflow prose is `prose.md`.

## SOP (the dual-audience document)

The full human+machine SOP for this procedure — frontmatter procedure-object +
the end-to-end runnable steps, the stage-04 a/b/c outcome contract, the learning
on-ramp, and the dormancy posture — is [`sop.md`](sop.md) (ADR-0136 A8; the
template-defining exemplar, #1759). This `CONTEXT.md` stays the thin routing
surface; `sop.md` is the canonical prose. The control layer (§A invariants, the
B1/B7 archetype rules) is cited there from ADR-0136, never redefined.
