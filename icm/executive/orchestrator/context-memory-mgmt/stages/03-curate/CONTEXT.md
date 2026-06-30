# Stage 03 — curate

**Job:** propose the durable facts/decisions from this thread worth persisting for
future turns — each as a parked deliberate-capture proposal with its source — then
park. Nova does not write memory.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Working context | stage 02 `context.md` | all | the grounded, cited picture to curate from |

## Process

1. `[sonnet]` Identify the durable facts and decisions from this thread that are
   worth carrying into future turns — the lasting outcomes, not the turn-by-turn
   noise. Skip anything already in long-term memory (a recalled deliberate capture).
2. `[sonnet]` Draft each as a proposed deliberate capture: the fact/decision in
   Nova's voice, with the source reference it grounds on carried through. Anything
   that cannot be grounded is not proposed — no fabricated captures.
3. `[script]` Park the proposals. Nova does **not** write long-term memory — there is
   no store tool (ADR-0116); the captures route to the human / Memory-MCP path. No
   send, no delegate, no write, no actuation.

## Outputs

`curation.md` — the list of proposed deliberate captures (durable facts/decisions),
each with its source reference, parked for the human / Memory-MCP path. The run ends
here at the checkpoint; nothing is written or actuated.

## Audit

- [ ] Each proposed capture carries a source reference; none fabricated or uncited
- [ ] No long-term memory written — the proposals park for the human / Memory-MCP path (no store tool, ADR-0116)
- [ ] No send, delegate, write, or money move occurred — the run parked
- [ ] Any ungroundable item dropped, not invented (CONSTITUTION §8)

## Checkpoint

The persistence proposals park for the **human / Memory-MCP path** — Nova never
writes long-term memory (no store tool, ADR-0116). `auto` may self-approve ONLY the
upstream assemble-and-publish of the grounded context (stage 02) when every item is
cited and every gap marked "no data"; the curation captures **always** park as
proposals. An uncited or ungroundable item, a recall miss, or any attempt to write
or actuate parks — a miss is "I don't know," not a guess (CONSTITUTION §8).
