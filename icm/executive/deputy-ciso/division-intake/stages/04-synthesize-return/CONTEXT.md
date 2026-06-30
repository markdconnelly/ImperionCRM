# Stage 04 — synthesize-return

**Job:** compose the report's result back up to Nova, carry the citations, and
route any always-gated item to Mark's queue. The return to Nova is the checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Delegation result | stage 03 `delegation.md` | the report's returned result, or the parked conflict/park | what to synthesize |
| Receipt | stage 01 `receipt.md` | the original intent + asking human | answer the unit that was actually delegated |

## Process

1. `[sonnet]` Compose the report's result into one concise return for Nova in
   Roman's voice — lead with exposure (active threat, control gap, stale access),
   findings cited by reference with an as-of, never smoothed and never an assumed
   all-clear.
2. `[script]` Carry the report's citations through so Nova (and the human) can drill
   to the source by reference. Any section the report could not ground is stated as
   "unconfirmed / no data," never filled in; never reproduce client PII or secrets.
3. `[script]` Route every always-gated item — destructive/client-facing containment,
   an identity/access change — to **Mark's** single queue (the CISO's human queue,
   CONSTITUTION §5.4); these are never returned as "done."
4. `[script]` Return the result to Nova and park. No actuation — every real effect
   already happened (or parked) inside the report under its gauntlet; security data
   read-only.

## Outputs

`return.md` — the synthesized result (cited by reference) for Nova, plus any
always-gated items routed to Mark's queue. The run ends here at the checkpoint;
Roman actuates nothing.

## Audit

- [ ] The return addresses the delegated unit; leads with exposure; findings cited by reference with as-of
- [ ] Citations carried through; any ungrounded section stated as "unconfirmed / no data," not invented; no PII or secret reproduced
- [ ] Always-gated items (destructive/client-facing containment, identity/access change) routed to Mark's queue, never returned as done
- [ ] Pool-never-bleed held — no other client's security signal surfaced (two-axis RLS); a signal cross-correlated internally was never leaked client-to-client
- [ ] No actuation occurred; security data stayed read-only — the run parked at the return to Nova

## Checkpoint

The human approves the synthesized return to Nova (and any item routed to Mark's
queue). When `auto`, this workflow may self-approve **only** a route+delegate
already made under stage 02's unambiguous-owner / within-authority / one-RLS-scope
rule; any parked item (destructive/client-facing containment, identity/access
change, ambiguity, over-authority) stays human-approved. `auto` never actuates,
never lowers a report's gauntlet, and never bypasses an always-gate (ADR-0128).
