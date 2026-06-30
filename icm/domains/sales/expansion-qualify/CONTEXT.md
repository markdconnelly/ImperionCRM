# Workflow: expansion-qualify (Celeste→Chase upsell/expansion seam, Stream-02)

**Job:** accept an expansion `opportunity` that Client Success sourced on an
existing customer and qualify it on expansion-specific signals — then route a
qualified expansion into the pursuit motion or park it back to the relationship
owner — so no whitespace stalls unseen and no expansion is pursued unqualified.

**Trigger:** a Client-Success-sourced expansion `opportunity` is assigned to Chase
on an existing account (Stream 02, the upsell/expansion seam). One run per assigned
expansion opp.

**Single owner:** Chase owns the **transaction**; Client Success owns the
**relationship** and the **sourcing** (chase.md §7 seam). Chase does not create the
opportunity and does not own the account relationship.

## What this is NOT

- NOT net-new lead qualification — that is `lead-response` (02-A1), scored on cold
  ICP fit. An existing customer is already a fit; this qualifies on expansion
  signals, not ICP.
- NOT opportunity creation — Client Success sources and assigns the expansion opp;
  this workflow only accepts and qualifies it.
- NOT a quote builder or pricing action — KQM is the quote SoR, read-only
  (ADR-0080/0081); no pricing/discount/term assertion is Chase's to make here.
- NOT a customer-facing send — every outbound touch routes to `pursue-opportunity`
  (02-A3); nothing communicative leaves this workflow.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ground | Read the sourced expansion opp + owning account + relationship/health/usage context; cite + as-of (A5) | — |
| 02 | qualify | Assess expansion signals (NOT ICP); signal-vs-inference; decide qualify/disqualify | — |
| 03 | stamp-route | Apply the internal reversible qualification stamp; route qualified → 02-A3, disqualified → Client Success | **Yes** |
| 04 | log | Log decision + handoff record, idempotent (A9b) | terminal |

## Autonomy

Starts `draft` (ADR-0061). Default rung **L1** (room.md): the qualification
decision is drafted and parks. When admin-flipped to `auto`, stage 03 may
self-execute **ONLY** the INTERNAL reversible qualification stamp (`opportunity.write`)
at **L2** — no customer-facing effect, fully reversible. Routing and the handoff
record are non-actuating. Every customer-facing touch routes to `pursue-opportunity`
(02-A3) and re-inherits its always_gate; any pricing/discount/term assertion or
send-for-signature is dial-proof always-gate and parks in every mode (ADR-0128,
BO-02 §5). Audit failure escalates to the human queue (CONSTITUTION §5.4).

## Dependency / dormancy

This workflow is **dormant until the Client-Success expansion-sourcing seam
lands** — nothing assigns an expansion opportunity to Chase until that seam exists,
so it ships **propose-only** and qualifies nothing in production until Client
Success sources expansion opps. No Celeste-side artifact is built here; this is the
accepting/qualifying half of the seam only.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `expansion-rules.md` (the expansion signal
set, the qualify/disqualify bar, the route-vs-park-to-Client-Success rule).
Domain-shared (Tier 2, `../skills/`): `voice-and-tone.md`. Mark-editable business
content; stages cite, never restate. Format rules: `../../../CONVENTIONS.md`. The
structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
