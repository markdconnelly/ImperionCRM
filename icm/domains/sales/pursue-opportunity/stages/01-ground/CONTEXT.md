# Stage 01 — ground

**Job:** surface the opportunity's next-best action from its live state, cited
and as-of'd, so the touch is grounded before anything is composed.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Trigger | the due-action / inbound-signal event | full payload | which opportunity, what's due |
| Opportunity | silver `opportunity` · `okf:opportunity` | the triggering deal only | stage, owner, next action, as-of |
| Account/contact | silver `account` / `contact` · `okf:account` `okf:contact` | the deal's account + primary contact | who we're pursuing |
| History | `interaction` timeline · `okf:interaction` | this opportunity, last 5 touches | last contact, what was said |

## Process

1. `[script]` Resolve the opportunity from the trigger; read stage, owner, due
   next action, and last-touch timestamp by known key. Missing/unparseable
   opportunity state → audit fail (park).
2. `[script]` Pull the last 5 interactions on this opportunity and the primary
   contact, tenant-isolated. Absence is information, not a gap to fill.
3. `[sonnet]` Determine the next-best action (advance-stage nudge, answer an open
   question, schedule a step) in one sentence of reasoning, **citing the
   opportunity state + as-of** (A5). No fabrication; if the state can't ground a
   call, say so and park.

## Outputs

`ground.md` — opportunity id + stage + as-of, last-touch summary, the proposed
next-best action + one-sentence rationale. Unknowns stated as unknowns.

## Audit

- [ ] Opportunity id, stage, and as-of timestamp present (none blank)
- [ ] Exactly one proposed next-best action with grounded rationale
- [ ] Every claim traceable to an input row (no invention)
