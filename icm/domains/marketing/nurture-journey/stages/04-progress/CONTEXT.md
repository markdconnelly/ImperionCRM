# Stage 04 — progress

**Job:** advance the enrollment or terminate it — at MQL (→ lead-scoring → Chase),
journey exit, or unsubscribe.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Step result | stages 02–03 output | the executed step | what just happened (send fired / internal step applied) |
| Updated score | `` `okf:lead_score` `` | this contact | the MQL crossing test |
| Recipient consent | `` `okf:consent_event` `` | this contact | an unsubscribe terminates the journey |
| Journey definition | `` `okf:workflow` `` | the target journey | end condition / next-due position (ADR-0073) |

## Process

1. `[script]` Feed the step's engagement back to scoring and read the updated
   `lead_score`. Evaluate against the MQL threshold.
2. `[script]` **Terminate or advance:**
   - **MQL crossed** → route to **lead-scoring (01-G) → Chase / Stream 02** — the
     crossing IS the seam (a deterministic route, not an actuation); close this
     journey enrollment.
   - **Unsubscribe** (`consent_event`) → stop the journey immediately; no further send.
   - **Journey end** reached → exit and close.
   - **Otherwise** → set the next-due position and hand back to stage 02.
3. `[script]` Stamp the enrollment outcome (advanced / MQL / exited / unsubscribed)
   with the as-of; cross-contact engagement correlation stays internal/aggregated
   (A7 — pool, never bleed).

## Outputs

`progress.md` — the updated score, the disposition (advance | MQL→Chase | exit |
unsubscribe), the seam emission (if MQL), and the next-due position (if advancing).

## Audit

- [ ] MQL threshold evaluated against the updated score
- [ ] MQL crossing routes to lead-scoring → Chase (the seam — no separate hand-off act)
- [ ] An unsubscribe terminates the journey with no further send
- [ ] Outcome stamped with as-of; no cross-contact data bled (internal/aggregated only)
