# Stage 03 — propose-actions

**Job:** turn the flagged deadlines into one proposed-action set for a human and
**park** every send and signature. This is the checkpoint; the run never sends a
notice, signs, or binds.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Deadlines | `deadlines.md` (stage 02 output) | all | the flagged items to propose action on |
| Watch-list | `watchlist.md` (stage 01 output) | counterparty + deal refs | attach each proposal to the right record |

> No new OKF grounding here — there are no `okf:` markers; this stage packages prior
> stages' outputs and parks.

## Process

1. `[sonnet]` For each **due** item, propose the human action — **send notice**,
   **start review**, or **prep renewal** — with a one-line rationale grounded in the
   computed deadline. Never invent a term or date to justify a proposal; an
   unverifiable item is proposed for human confirmation, not action.
2. `[script]` Assemble the handoff: the proposed actions and the unverifiable-item
   confirmations, each attached to the counterparty/deal by id.
3. `[script]` Park every send and signature: sending a notice, signing,
   countersigning, and send-for-signature are human-only on the ADR-0058 path. This
   workflow has no send/execution path and proposes only.

## Outputs

`proposals.md` — per item, the proposed human action (send notice / start review /
prep renewal) or a confirm-this-unverifiable-item note, attached to the
`account`/`opportunity` by id, with every send/signature explicitly parked.
**This stage parks** — it presents the proposals to a human (CONSTITUTION §5.4) and
ends. No notice sent, no signature, no binding, in any mode.

## Audit

- [ ] Every due item carries a proposed action (send notice / start review / prep renewal) attached by id
- [ ] Every unverifiable item is routed for human confirmation — none auto-resolved or assumed
- [ ] Execution parked — no notice send / sign / countersign / send-for-signature occurs

## Checkpoint

The human approves (or edits) the proposed-action set before anything leaves this
workflow. In `draft`, every proposal is human-approved. In `auto`, the workflow may
self-approve ONLY producing + documenting the internal watch-list/findings record;
every proposed **notice/send/signature**, any genuine legal call, and any audit
failure park for a human, in every mode (CONTEXT.md · CONSTITUTION §5).
