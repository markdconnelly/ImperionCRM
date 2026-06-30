# Stage 04 — synthesize-return

**Job:** compose the report's result back up to Nova, carry the citations, and
route any always-gated item to Luke's queue. The return to Nova is the checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Delegation result | stage 03 `delegation.md` | the report's returned result, or the parked conflict/park | what to synthesize |
| Receipt | stage 01 `receipt.md` | the original intent + asking human | answer the unit that was actually delegated |

## Process

1. `[sonnet]` Compose the report's result into one concise return for Nova in
   Dexter's voice — risk first, then the plan; SLA/breach/capacity figures cited to
   source with an as-of, never invented.
2. `[script]` Carry the report's citations through so Nova (and the human) can drill
   to the source. Any section the report could not ground is stated as "no data,"
   never filled in.
3. `[script]` Route every always-gated item — a production change, a destructive or
   identity action — to **Luke's** single queue (the human queue, CONSTITUTION §5.4);
   these are never returned as "done."
4. `[script]` Return the result to Nova and park. No actuation — every real effect
   already happened (or parked) inside the report under its gauntlet.

## Outputs

`return.md` — the synthesized result (cited) for Nova, plus any always-gated items
routed to Luke's queue. The run ends here at the checkpoint; Dexter actuates nothing.

## Checkpoint

The return to Nova is the checkpoint — the route/result, never an action. In
`draft`, a human approves the return; production changes, destructive actions, and
identity actions are already parked to Luke's queue at the report tier and are never
part of what is approved here. In `auto`, this workflow may self-approve ONLY a
clean return where the route was unambiguous, within the asking human's authority,
inside one RLS scope, and carried no always-gated item; anything else parks for Luke
(`agent.yaml` `auto_may_self_approve`). Auto never lowers a report's gauntlet and
never actuates (ADR-0128).

## Audit

- [ ] The return addresses the delegated unit; risk first; figures cited with as-of
- [ ] Citations carried through; any ungrounded section stated as "no data," not invented
- [ ] Always-gated items (production change / destructive / identity action) routed to Luke's queue, never returned as done
- [ ] Pool-never-bleed held — no other client's or owner's data surfaced (two-axis RLS)
- [ ] No actuation occurred — the run parked at the return to Nova; Dexter actuated nothing
