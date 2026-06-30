# Stage 01 — ground

**Job:** read the conversational-intelligence output for this call (the landed
`interaction` summary + outcome) and the tied open `opportunity` + contact, cited
and as-of'd, so the capture is grounded before anything is extracted.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Trigger | the conv-intel analysis-landed event | full payload | which call, which interaction, which opportunity |
| Interaction | the conv-intel-landed `interaction` · `okf:interaction` | this call only | the call summary + outcome (substrate-written, read-only) |
| Opportunity | silver `opportunity` · `okf:opportunity` | the tied deal only | stage, owner, current next action, as-of |
| Contact | silver `contact` · `okf:contact` | the deal's primary contact | who the call was with |

## Process

1. `[script]` Resolve the `interaction` and the tied `opportunity` from the
   trigger by known key; read the interaction summary + outcome and the
   opportunity stage/owner/as-of. The substrate wrote the interaction — read it,
   never write it.
2. `[script]` Confirm the interaction is **live**: if the conv-intel feed is
   dormant/empty (no analysis landed, substrate not live), flag **stale-not-live**
   and park — never run on a missing input (A5c).
3. `[sonnet]` Summarize what grounds this call in one or two sentences, **citing
   the interaction + the opportunity + their as-of** (A5). No fabrication; absence
   of an interaction is a park, not a gap to fill.

## Outputs

`ground.md` — interaction id + as-of, opportunity id + stage + as-of, primary
contact, a one-or-two-sentence grounded summary, and a `live | stale-not-live`
flag. Unknowns stated as unknowns.

## Audit

- [ ] Interaction id + opportunity id + as-of timestamps present (none blank)
- [ ] Feed liveness flagged; a dormant/empty conv-intel feed parked stale-not-live (A5c)
- [ ] Every claim traceable to an input row (no invention); interaction read, never written
