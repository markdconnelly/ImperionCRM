# Stage 01 — ground

**Job:** read the Client-Success-sourced expansion opportunity, its owning
account, and the relationship/health/usage context carried on it — cited and
as-of'd — so the qualification call is grounded before anything is assessed.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Trigger | the expansion-opp-assigned event | full payload | which expansion opp, which account |
| Opportunity | silver `opportunity` · `okf:opportunity` | the assigned expansion opp only | type, owner (sourced by Client Success), carried health/usage signals, as-of |
| Account | silver `account` · `okf:account` | the owning account | the existing customer being expanded into |
| Contact | silver `contact` · `okf:contact` | the account's primary contact | who the relationship is with |
| History | `interaction` timeline · `okf:interaction` | this account, last 5 touches | relationship context, prior interest |

## Process

1. `[script]` Resolve the expansion opportunity from the trigger; read its type,
   sourcing owner, carried health/usage signals, and as-of by known key.
   Missing/unparseable opportunity → audit fail (park).
2. `[script]` Read the owning `account` and primary `contact`, tenant-isolated; pull
   the last 5 interactions on this account. Absence is information, not a gap to fill.
3. `[script]` Check the source freshness: a dormant or empty source (the expansion
   seam not yet supplying live signals) is flagged **stale, not live** (A5c) — the
   carried signals are read as-of and not treated as current truth.
4. `[sonnet]` Summarize the grounding in one paragraph — the expansion opp + as-of,
   the account, the carried health/usage/relationship context **as signal vs
   inference** — **citing each input + as-of** (A5). No fabrication; if the source
   can't ground a call, say so and park.

## Outputs

`ground.md` — expansion opp id + type + as-of, owning account + primary contact,
carried health/usage signals (each marked signal/inference and as-of), relationship
summary, and any stale-source flag. Unknowns stated as unknowns.

## Audit

- [ ] Expansion opp id, type, and as-of timestamp present (none blank)
- [ ] Owning account + carried signals cited to input rows, each as-of'd
- [ ] Stale/dormant source flagged as stale, not presented as live (A5c)
- [ ] Every claim traceable to an input row (no invention)
