# Stage 04 — synthesize-return

**Job:** compose the report's finding back up to Nova, carry the citations, and
route any always-gated corrective/config item to Mark's queue. The return to Nova
is the checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Delegation result | stage 03 `delegation.md` | the report's returned finding, or the parked conflict/park | what to synthesize |
| Receipt | stage 01 `receipt.md` | the original intent + asking human | answer the unit that was actually delegated |

## Process

1. `[sonnet]` Compose the report's finding into one concise return for Nova in
   Jessica's voice — lead with the highest-severity finding; severity stated plainly,
   cited to source with an as-of, never softened.
2. `[script]` Carry the report's citations through so Nova (and the human) can drill
   to the source. Any section the report could not ground is stated as "no data" (or
   "suspected, pending the report's check"), never filled in.
3. `[script]` Route every always-gated corrective/config item — a fix, a governance
   change, a control ratification, a quarantine action — to **Mark's** single queue
   (risk reports to Mark; the lever you flagged is never yours, CS-17 Audit §5); these
   are never returned as "done."
4. `[script]` Return the finding to Nova and park. No actuation — every real effect
   already happened (or parked) inside the report under its gauntlet; the assurance
   line stays audit/recommend-only.

## Outputs

`return.md` — the synthesized finding (cited) for Nova, plus any always-gated
corrective/config items routed to Mark's queue. The run ends here at the checkpoint;
Jessica actuates nothing.

## Audit

- [ ] The return addresses the delegated unit; leads with the finding/severity; cited with as-of
- [ ] Citations carried through; any ungrounded section stated as "no data" / "suspected, pending check," not invented
- [ ] Always-gated items (correction / governance / config / ratification) routed to Mark's queue, never returned as done
- [ ] Pool-never-bleed held — no other client's or owner's data surfaced (two-axis RLS)
- [ ] No actuation occurred; the assurance line stayed audit-only — the run parked at the return to Nova

## Checkpoint

The finding/route returned to Nova (never an action). In `draft`, Mark approves the
return. In `auto`, this workflow may self-approve ONLY when stage 02 routed to a
single unambiguous report within the asking human's authority and one RLS scope, and
nothing always-gated remains; any conflict, park, corrective/governance/config item,
or over-authority unit parks for Mark. Auto never lowers a report's gauntlet and
never actuates (ADR-0128).
