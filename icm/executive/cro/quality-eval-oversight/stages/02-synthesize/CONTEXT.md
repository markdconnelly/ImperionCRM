# Stage 02 — synthesize

**Job:** turn the gather record into a baseline-compared, regression-ranked roll-up
with the coverage gaps isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Compute pass rate vs baseline per module; collapse duplicates across
   runs and mark each module above / at / below its bar.
2. `[sonnet]` Rank the regressions, worst slippage first — run-over-run trend stated
   where the data supports it, and only where it does.
3. `[sonnet]` Isolate the coverage gaps: modules with no goldens, thin sets, or no
   case per always-gate class — each stated as a gap with what is missing.
4. `[sonnet]` Label every judgment **signal vs inference**: a measured pass rate is
   signal; a suspected cause is "suspected, pending Tess's check" — never asserted
   (jessica.md §5). Cross-correlate against prior Service-Quality activity
   internally only — pool, never bleed; nothing here is client-facing.

## Outputs

`synthesis.md` — a baseline-compared, regression-ranked roll-up (worst slippage
leading) and a separate coverage-gap list, each item naming the module, the measured
figures by reference, and any prior Service-Quality activity already in motion.

## Audit

- [ ] Every module's pass rate is compared to its baseline; above/at/below stated
- [ ] Roll-up is regression-ranked, worst slippage leading
- [ ] Every coverage gap names the module and states exactly what is missing
- [ ] Signal vs inference labeled; no suspected cause asserted as fact
- [ ] Cross-correlation is internal only — no client-facing content produced
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] Read-only — no golden edited, no baseline moved, no run re-scored
