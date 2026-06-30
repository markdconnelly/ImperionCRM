# Stage 02 — assess

**Job:** turn the scan record into an exposure-ranked set of governance flags,
each grounded in the ledger.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Scan record | stage 01 `scan.md` | all | the raw posture material |

## Process

1. `[sonnet]` Flag the high-dial risks — an `auto` dial sitting high relative to the
   agent's risk (a high-impact or always-gate-heavy agent running hot). Name the
   agent/workflow and its rung.
2. `[sonnet]` Flag the aging gates — pending-approval items past the staleness
   threshold; name the queue and the oldest item's age.
3. `[sonnet]` Flag the kill-switch state — any scope engaged or partial; name the
   scope and what it currently revokes.
4. `[sonnet]` Flag the run-ledger anomalies — error spikes and stuck runs; name the
   agent/workflow and the count.
5. `[sonnet]` Rank all flags by exposure — the posture that most needs a human's
   hand leads. Every flag must trace to a ledger read from stage 01; drop anything
   not grounded there.

## Outputs

`assessment.md` — an exposure-ranked flag list (highest exposure leading), each
item naming the agent/workflow or scope, the concrete posture, and the exposure.

## Audit

- [ ] Flags are exposure-ranked, highest exposure leading
- [ ] Every flag is grounded in a stage-01 ledger read and cited; nothing inferred beyond the ledger
- [ ] Each flag names the agent/workflow or scope and states the concrete exposure
- [ ] Read-only — no dial flipped, no kill-switch toggled, nothing actuated
- [ ] Internal posture only — no client data introduced
