# Stage 02 — margin-input

**Job:** take Audrey's grounded margin floor as a handoff input, or park if it's missing.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Renewal context | `renewal-context.md` (stage 01 output) | full | the baseline being repriced |
| Margin floor | Audrey handoff — Finance renewal-margin grounding (#1426) | the grounded margin floor + basis | the constraint the reprice must respect |

## Process

1. `[script]` Read the margin floor from Audrey's handoff (the grounded floor + its basis).
   Chase does **not** read financials directly — this arrives as a handoff, not a query.
2. `[script]` If no margin floor is present, **park** the run with reason `awaiting-margin`
   (route to Audrey). A reprice without a margin floor is a guess — Chase does not guess
   into a data gap (his guardrail).

## Outputs

`margin.md` — the grounded margin floor + basis, or `awaiting-margin` (run parked). The
floor is the binding constraint for stage 03.

## Audit

- [ ] A margin floor is present with its basis, OR the run parked `awaiting-margin`
- [ ] The floor was taken from Audrey's handoff, not computed here (Chase reads no financials)
