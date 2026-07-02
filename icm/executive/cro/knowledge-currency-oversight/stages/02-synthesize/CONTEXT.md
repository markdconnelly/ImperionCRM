# Stage 02 — synthesize

**Job:** turn the gather record into a reasoning-risk-ranked roll-up with verified
and suspected staleness split and the coverage gaps and spine breaks isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Rank by reasoning risk: stale AND actively-recalled first (an agent is
   reasoning on it now), then stale-but-idle, then lagging OKF concepts, then spine
   breaks; collapse duplicates.
2. `[sonnet]` Split every finding into **verified** (stamp/usage directly read) vs
   **suspected** — a suspected staleness is labeled "suspected, pending Alivia's
   check" and never asserted (jessica.md §5).
3. `[sonnet]` Isolate the coverage gaps (areas agents ground on with no knowledge
   object / no concept file) and the spine breaks, each with the affected joins or
   recalls stated by reference.
4. `[sonnet]` Cross-correlate against prior Knowledge activity internally only —
   pool, never bleed; nothing here is client-facing.

## Outputs

`synthesis.md` — a reasoning-risk-ranked roll-up (stale-and-used leading) with each
finding labeled verified or suspected, and separate coverage-gap and spine-break
lists, each item naming the knowledge item / entity, the evidence by reference, and
any prior Knowledge activity already in motion.

## Audit

- [ ] Roll-up is reasoning-risk-ranked — stale-and-actively-used leads
- [ ] Every finding labeled verified or suspected; no suspected staleness asserted as fact
- [ ] Every coverage gap and spine break names its item/entity and cites its evidence
- [ ] Cross-correlation is internal only — no client-facing content produced
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] Read-only — nothing rewritten, nothing re-vectorized
