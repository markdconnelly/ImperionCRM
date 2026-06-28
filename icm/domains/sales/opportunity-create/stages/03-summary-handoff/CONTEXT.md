# Stage 03 — summary-handoff

**Job:** produce an internal summary of the opportunity created and park the next-step proposal.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Opportunity | `opportunity.md` (stage 02 output) | full | what was created/updated |
| Qualification | `qualification.md` (stage 01 output) | full | the rationale to carry forward |

## Process

1. `[sonnet]` Write a short internal summary: the opportunity (id, stage, amount-if-known),
   the qualification rationale, and the recommended **next step** (first outreach / proposal
   motion) as a *proposal* — not an action.
2. `[script]` Park the next-step proposal for a human or the next workflow. No send, no
   customer-facing effect — the next customer-facing step is always a separate, gated motion
   (Chase drafts, a human/dial approves the send via ADR-0058).

## Outputs

`handoff.md` — internal summary + the parked next-step proposal. Terminal stage; the run ends
parked (the opportunity now exists in the pipeline; the first customer touch is a new motion).

## Audit

- [ ] Summary names the opportunity id + stage
- [ ] Next step is framed as a parked proposal, not an executed action
- [ ] No send / customer-facing effect emitted in this workflow
