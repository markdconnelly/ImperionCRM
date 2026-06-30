# Stage 03 — escalate-deliver

**Job:** escalate the assessed SLA breaches to the single human queue, tag the owner,
route each lead to lead-response (02-A1) for the first-touch, then deliver the sentinel
digest and log idempotently. Terminal stage. The run sends nothing customer-facing,
writes no silver, and commits nothing.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Assessment | `assessment.md` (stage 02 output) | breached + imminent-breach leads | the assessed items to escalate + route |
| Watch-list | `watchlist.md` (stage 01 output) | lead + as-of refs + stale flags | attach each escalation to the right lead; carry stale flags through |

> No new OKF grounding here — there are no `okf:` markers; this stage packages prior
> stages' outputs, escalates, and routes.

## Process

1. `[script]` **Escalate** each breach to the **single human queue** (CONSTITUTION
   §5.4) and **tag the owner of record** — *internal routing only*, not a customer
   send. Carry the stage-01 stale-feed flags through so a stale feed reads as stale, not
   as a real breach.
2. `[script]` **Route** each escalated lead to **lead-response (02-A1)** for the actual
   qualification + first-touch — staged for that workflow under its own gates. This
   stage opens no first-touch and makes no customer contact; the first-touch is 02-A1's
   job, never here.
3. `[script]` **Deliver** the sentinel digest (A6 routing) → the owner + the single
   human queue (CONSTITUTION §5.4); **log idempotently** (one escalation per lead per
   sweep — a re-run of the same sweep does not double-escalate). **No actuation here:**
   no customer-facing send, no silver write, no commitment.

## Outputs

`digest.md` — the SLA sentinel digest: each escalated breach with its severity + owner,
the internal escalation to the human queue (§5.4), the route-to-02-A1 hand-off per
lead, the carried stale-feed flags, and the idempotent log entry — and nothing
actuated.

## Audit

- [ ] Each breach escalated to the single human queue (CONSTITUTION §5.4) + owner tagged — internal only
- [ ] Each escalated lead routed to lead-response (02-A1); no first-touch made here
- [ ] Stale-feed flags carried through and labeled stale, not breach
- [ ] Delivered + logged idempotently (one escalation per lead per sweep); no customer send, no silver write, no commitment (watch-and-escalate only)
