# Stage 04 — synthesize-return

**Job:** compose the report's result back up to Nova, carry the citations, and
route any always-gated item to Derek's queue. The return to Nova is the checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Delegation result | stage 03 `delegation.md` | the report's returned result, or the parked conflict/park | what to synthesize |
| Receipt | stage 01 `receipt.md` | the original intent + asking human | answer the unit that was actually delegated |

## Process

1. `[sonnet]` Compose the report's result into one concise return for Nova in
   Rachel's voice — answer first, the two things that matter, the one decision needed;
   facts cited to source with an as-of, never smoothed.
2. `[script]` Carry the report's citations through so Nova (and the human) can drill
   to the source. Any section the report could not ground is stated as "no data," never
   filled in.
3. `[script]` Route every always-gated item — a binding contract, an employment or
   comp decision — to **Derek's** single queue (CONSTITUTION §5.4); these are never
   returned as "done."
4. `[script]` Return the result to Nova and park. No actuation — every real effect
   already happened (or parked) inside the report under its gauntlet; salary/comp/
   personal data never travels in the return.

## Outputs

`return.md` — the synthesized result (cited) for Nova, plus any always-gated items
routed to Derek's queue. The run ends here at the checkpoint; Rachel actuates nothing.

## Checkpoint

The composed return to Nova (and any item routed to Derek's queue) is what a human
approves. In `auto`, this stage may self-approve ONLY a return that delegated
unambiguously to one report within authority and one RLS scope, with no always-gated
item; anything binding (a signed contract, an employment/comp decision) or ambiguous
parks for Derek. Auto never binds the company, never actuates, and never lets salary/
comp/personal data travel.

## Audit

- [ ] The return addresses the delegated unit; answer first; figures cited with as-of
- [ ] Citations carried through; any ungrounded section stated as "no data," not invented
- [ ] Always-gated items (a binding contract / employment / comp decision) routed to Derek's queue, never returned as done
- [ ] Pool-never-bleed held — no other client's or owner's data surfaced; no salary/comp/personal data travelled (two-axis RLS)
- [ ] No actuation occurred — the run parked at the return to Nova
