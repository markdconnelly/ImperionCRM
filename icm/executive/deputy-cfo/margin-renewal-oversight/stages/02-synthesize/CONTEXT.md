# Stage 02 — synthesize

**Job:** turn the gather record into a leakage-ranked margin roll-up and an
exposure-ranked renewal book, with the flags isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Compute margin by account / engagement: invoiced revenue against time +
   expense cost; collapse duplicates across engagements. Where a figure is an estimate,
   flag it as such with its basis.
2. `[sonnet]` Rank the margin roll-up by leakage — unprofitable work leading.
3. `[sonnet]` Assess the renewal book: open renewal opportunities + license true-ups,
   read against Celeste's client-health and Chase's pricing signals from the gather
   record; rank by at-risk exposure.
4. `[sonnet]` Isolate the flags — **unprofitable work** and **at-risk renewals** — each
   naming the account / engagement and stating the exposure, and noting the owning
   sub-agent (Celeste for a renewal save, Chase for a reprice). **Pool-never-bleed:**
   this cross-correlation is internal only, never client-facing.

## Outputs

`synthesis.md` — a leakage-ranked margin roll-up and an exposure-ranked renewal book
(highest exposure leading), plus a separate flag list, each item naming the
account / engagement, its exposure, and the owning sub-agent.

## Audit

- [ ] Margin roll-up is leakage-ranked, highest exposure leading
- [ ] Renewal book is exposure-ranked; each at-risk renewal states its exposure
- [ ] Every flag names an account / engagement, states the exposure, and names the owning sub-agent
- [ ] Every estimate is marked as an estimate with its basis; no invented margin
- [ ] Cross-correlation is internal only — pool-never-bleed, nothing client-facing
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] Read-only — no financial record written, no money moved
- [ ] No send/write/actuation occurred — Sterling delegated or parked
