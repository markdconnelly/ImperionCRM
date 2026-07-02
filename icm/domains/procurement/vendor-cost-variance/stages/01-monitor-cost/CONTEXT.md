# Stage 01 — monitor-cost

**Job:** compute actual vs expected vendor cost and the variance, as of a stated date, citing the cost source on every figure.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Actual billed cost | silver `invoice` · `okf:invoice` | vendor invoice lines in the refresh window | what the vendor actually billed (QBO read-only mirror) |
| Entitlement/true-up facts | silver `license_assignment` · `okf:license_assignment` | quantities + true-up facts as of the run | the quantity leg of expected cost |
| Contract terms | silver `contract` · `okf:contract` | agreed price/term/escalator per vendor agreement | the price leg of expected cost |
| Client spine | silver `account` · `okf:account` | accounts behind the monitored spend | attribute variance to its client (or Imperion-self — subject: both, 02-B7) |
| Variance rubric | `./skills/variance-rubric.md` | expected-cost derivation + thresholds | how expected is derived, what variance is material |

## Process

1. `[script]` Fix the **as-of date** and the refresh window for the run. Variance is a
   snapshot claim; an undated figure is an audit fail (A5).
2. `[automation]` Read the **actual** billed cost per vendor/subscription off the
   `invoice` mirror, citing each invoice line + as-of (A5). Derive the **expected** cost
   per `variance-rubric.md` — contract terms (agreed price, escalator) × the true-up
   quantity on `license_assignment` — with the derivation **labeled derived** and each
   input cited + as-of.
3. `[automation]` Compute the variance (actual − expected, absolute and %) per
   vendor/subscription (#1484). A vendor whose contract terms or true-up facts are missing
   or stale gets **a noted gap, never a guessed expectation** (A5 empty→park; vance.md
   §5). Cross-client cost patterns stay internal (A7 pool-never-bleed).

## Outputs

`variance.md` — the as-of date + window, per vendor/subscription: actual (cited invoice
source + as-of), expected (derivation shown, inputs cited, labeled derived), variance ($
and %), threshold status per the rubric; and the noted gaps (missing terms / stale
true-up), not guessed.

## Audit

- [ ] As-of date + window stated; every figure cites its cost source + as-of (A5)
- [ ] Expected cost shown as a derivation (labeled derived) from cited contract terms + true-up facts
- [ ] Missing terms/true-up facts noted as gaps — no expectation guessed
- [ ] Measurement only — no reconciliation, no true-up, no money commitment emitted
