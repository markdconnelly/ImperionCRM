# Workflow: call-capture (sales conversational-intelligence loop, 02 Stream-02)

**Job:** turn a captured sales call — transcribed and analyzed by the
conversational-intelligence substrate — into a logged outcome and a **parked
next-step proposal on the open `opportunity`** (an internal, reversible
`opportunity.write`), so no captured call leaves the deal un-updated and no
customer-facing action is taken without routing through the gated path.

**Trigger:** a conversational-intelligence analysis lands for a sales call tied to
an open `opportunity` — the substrate has written the `interaction` (summary +
outcome). One run per captured call.

**Sender identity:** none. This workflow has no send path — any actual follow-up
touch routes to `pursue-opportunity` (02-A3), where it re-inherits that workflow's
always_gate. Chase drafts and parks; the binding act is always a human's
(`room.md` seam, BO-02 §5).

## What this is NOT

- NOT the transcription / analysis infrastructure — that is the
  **conversational-intelligence substrate** (it transcribes the call, lands the
  verbatim turns to bronze, and writes the summary, ADR-0113). This workflow only
  **consumes** that output.
- NOT an interaction writer — the substrate lands the `interaction`; to a sales
  worker interactions are **read-only history** (`room.md`). There is deliberately
  **no `interaction.write` tool** here; a direct call-log write, if ever required,
  is a separate Constitution-widening decision out of scope here.
- NOT a customer-facing send — nothing outbound happens in this workflow; the
  follow-up belongs to `pursue-opportunity` (02-A3).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ground | Read the landed conv-intel `interaction` (summary + outcome) + tied open `opportunity` + contact; cite + as-of (A5); dormant/empty feed → stale-not-live park (A5c) | — |
| 02 | extract | Extract the call OUTCOME + proposed NEXT-STEP from the conv-intel analysis; cite the interaction, no fabrication (A5); pool-never-bleed (A7) | — |
| 03 | park-log | **Checkpoint:** draft the next-step (L1); park it on the opportunity via `opportunity.write` (L2, internal/reversible); no customer-facing action; log idempotent (A9b) | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). Default rung **L1** (`room.md`): the next-step proposal
parks for a human. When admin-flipped to `auto`, stage 03 may self-execute **ONLY**
the internal, reversible next-step park on the opportunity (`opportunity.write`) at
**L2** (A10 row 1, ADR-0128) — an internal CRM write with no customer-facing effect.
The interaction itself is the substrate's to write, not this workflow's. **No
customer-facing touch sends here at any rung** — the actual follow-up routes to
`pursue-opportunity` (02-A3) and is dial-proof always-gate there (BO-02 §5; Chase
has no commitment send path). Audit failure escalates to the human queue
(CONSTITUTION §5.4).

## Dependency / dormancy

This workflow is **dormant until the conversational-intelligence substrate lands**.
It consumes the substrate's output — the analyzed `interaction` for a captured call;
with no conv-intel output there is nothing to ground on. Until the substrate is live
this workflow ships **propose-only**: stage 01 detects a dormant/empty feed and
flags it **stale-not-live**, parking the run rather than running on a missing input
(A5c). No partial best-effort on an absent substrate.

## Medallion boundary (no interaction.write)

The medallion substrate is owned by no domain (`room.md`). The conv-intel substrate
lands the `interaction` (bronze verbatim turns + the summary, ADR-0113); a sales
worker reads interactions as history and never writes them. This workflow therefore
has **no `interaction.write` tool** — it reads the interaction (`pg.read`) and parks
the next-step on the opportunity (`opportunity.write`). A direct call-log write is a
separate Constitution-widening decision, explicitly out of scope here.

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `voice-and-tone.md` (every sales draft sounds
the same). Workflow-local (Tier 3, `./skills/`): `capture-rules.md` (what counts as
a next-step, how to phrase it, the trace-to-interaction requirement). Mark-editable
business content; stages cite, never restate. Format rules: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
