# Stage 02 — route

**Job:** route each classified item to the agent that owns its act — and **refuse**
a 1:1 reply to an existing customer, routing it to Celeste (a hard stop).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Triage batch | stage 01 output | all | the per-item intent + author match to route on |
| Author / account | `` `okf:contact` `` | matched authors | is the author an existing customer? |

## Process

1. `[script]` **Customer guard (refusal floor).** If the item is a 1:1 DM whose
   author is an **existing customer**, **REFUSE** the reply and route to Celeste
   (BO-04) — a hard stop, stronger than any gate, never a queued send. Do not draft.
2. `[script]` **Route by intent (auto at L2 — internally reversible):** lead →
   Stream 02 (Chase / lead-response, emit a `lead_hook`); support → Felix /
   Stream 04; brand → keep (continues to stage 03); spam → drop. **The hand-off is
   an explicit step; the receiving agent owns its act, this workflow owns only the
   routing clock (A11).**
3. `[script]` Stamp the routing decision + receiving agent on each item for the
   tracer; cross-client signal correlation in routing stays internal-only (A7).

## Outputs

`routing.md` — per item: the routing decision (Chase | Felix | brand-keep | drop |
**refused→Celeste**), the receiving agent, and the brand-items subset that proceeds
to stage 03.

## Audit

- [ ] Every item routed to exactly one owner (or dropped as spam)
- [ ] Existing-customer 1:1 DM → REFUSED + routed to Celeste, never queued or drafted
- [ ] Lead items emit a `lead_hook` into Stream 02 (the seam is an explicit step)
- [ ] Only `brand`-intent items proceed to draft (stage 03)
- [ ] No cross-client signal bled into the routing record (internal only)
