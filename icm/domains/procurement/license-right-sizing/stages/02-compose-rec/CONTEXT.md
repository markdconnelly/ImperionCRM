# Stage 02 — compose-rec

**Job:** draft the right-sizing recommendation — consolidate/downgrade per finding — with the dollars attached.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Utilization matches | `utilization-match.md` (stage 01 output) | full | the cited candidates to recommend on |
| Billing consequence | silver `invoice` · `okf:invoice` | invoice lines for the candidate subscriptions | the measured unit cost each candidate actually bills at |
| Pax8 pricing/terms | bronze `pax8_*` (read-only) | candidate + target SKUs' price/term | current vs target pricing where the invoice mirror is silent |
| Right-sizing rubric | `./skills/right-sizing-rubric.md` | consolidation patterns + tradeoff shape | which pattern applies, how the rec is shaped |

## Process

1. `[automation]` Price each candidate: the measured current cost (invoice mirror
   preferred, Pax8 bronze fallback — cite which + as-of) and the target cost after the
   recommended consolidate/downgrade; derived savings **labeled derived** (A5). A
   candidate with no measured cost is carried as a gap, never estimated (vance.md §5).
2. `[hybrid]` Draft the right-sizing recommendation per `right-sizing-rubric.md` — the
   applicable consolidation pattern or downgrade per finding — in Vance's
   quantify-the-tradeoff shape (vance.md §3): the cost, the utilization, and the
   **rejected alternative** on every line (e.g. why downgrade beats cancel here, or why
   status-quo was rejected). Never below the service-catalog baseline — a rec that would
   under-license is dropped and noted for 02-B4 (risk over cost, vance.md §3).

## Outputs

`right-sizing-rec.md` — the as-of date, per finding: the recommended action
(consolidate/downgrade), current vs target cost (measured vs derived labeled, source +
as-of), the utilization evidence, the rejected alternative; total derived savings; the
carried-forward gaps (incl. #1311-gated items).

## Audit

- [ ] Every figure carries its cost source + as-of date; measured vs derived labeled (A5)
- [ ] Every recommendation names the cost, the utilization, and the rejected alternative (vance.md §3)
- [ ] No recommendation drops below the service-catalog baseline; no price invented; gaps carried, not estimated
- [ ] Draft only — no actuation, no consolidate/downgrade, no money commitment emitted
