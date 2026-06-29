# Workflow: pursue-opportunity (sales pipeline management, 02-A3)

**Job:** keep an open `opportunity` moving — surface its next-best action,
compose the pursuit touch, get it human-approved, and re-stage/re-queue —
so no deal stalls unseen and every customer-facing touch is grounded and gated.

**Trigger:** an open `opportunity` with a due next action, or a new inbound
signal on an open deal (Stream 02 02-A3, archetype B7 client-facing-send). One
run per due touch.

**Sender identity:** the shared sales mailbox (email) or page identity (DM),
through the ADR-0058 path only. Chase has **no send path of his own** — he
drafts and parks; the binding act is always a human's (room.md seam, BO-02 §5).

## What this is NOT

- NOT a quote builder — KQM is the quote SoR, read-only (ADR-0080); pricing,
  discount, and term assertions are not Chase's to make (02-A5).
- NOT the renewal send-for-signature path (that is 02-A7/A8) — no contract
  exits here.
- NOT lead qualification (02-A1) or opportunity creation (02-A2) — those run
  upstream; this workflow pursues an opportunity that already exists.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ground | Surface the next-best action; cite opportunity state + as-of (A5) | — |
| 02 | compose | Compose the touch; no fabricated capability/timeline/price | — |
| 03 | send-gate | Human approves/sends via ADR-0058; committal touch always parks | **Yes** |
| 04 | log | Log + re-stage + re-queue, idempotent (A9b) | terminal |

## Autonomy

Starts `draft` (ADR-0061). Default rung **L1** (room.md). When admin-flipped to
`auto`, stage 03 may self-approve **ONLY** the B7 transactional-acknowledgement
carve-out (templated, non-committal, deterministic trigger — e.g. a "received"
ack) at L3. Every communicative/committal touch, and **any pricing/discount/term
assertion or send-for-signature, is dial-proof always-gate** and parks in every
mode (ADR-0128, BO-02 §5). Audit failure escalates to the human queue
(CONSTITUTION §5.4).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `pursuit-rules.md` (frequency caps,
no-false-urgency, the transactional-ack carve-out definition). Domain-shared
(Tier 2, `../skills/`): `voice-and-tone.md`. Mark-editable business content;
stages cite, never restate. Format rules: `../../../CONVENTIONS.md`. The
structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
