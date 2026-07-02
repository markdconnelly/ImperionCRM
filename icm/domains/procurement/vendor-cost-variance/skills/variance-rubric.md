# Variance rubric (Mark-editable — expected-cost derivation + thresholds + the Audrey handoff shape)

> DEFAULTS authored by the agent 2026-07-01. The rubric for `vendor-cost-variance`: how
> expected cost is derived, when a variance is material, how the Audrey handoff is
> packaged, and the measure-vs-own split. Mark: edit freely; stages cite this, nothing
> restates it.

## Expected-cost derivation

Expected cost per vendor/subscription, per billing period, is a **derived** figure — show
the derivation and cite every input + as-of (A5):

```
expected = contract agreed unit price (contract, cited)
         × true-up quantity          (license_assignment, cited)
         ± contracted escalator/discount in force for the period (contract, cited)
```

- The **actual** is the measured invoice-mirror line (QBO read-only mirror) — cite the
  line + as-of.
- If the contract carries no agreed price (or terms are missing/stale), there is **no
  expectation — note the gap**, never substitute a guess, a list price, or last month's
  bill as "expected" (vance.md §5). Last-period actuals may be shown as *context*,
  labeled as such, never as the expectation.

## Variance thresholds (when a variance flags)

| Condition (default) | Disposition |
|---|---|
| \|variance\| ≥ 5% of expected AND ≥ $50 for the period | **flag** |
| \|variance\| ≥ 15% or ≥ $250, or any unexplained new line-item | **flag, high urgency** (A6 computes up) |
| below both floors | log only (visible in the run record, no flag) |
| favorable variance (actual < expected) | still flags at the same floors — an under-bill reconciles the same as an over-bill |

Direction matters for urgency, not for whether it flags. Repeated same-vendor variance
across consecutive runs escalates one urgency step (a pattern, not noise).

## The Audrey handoff shape

One package per flagged vendor/subscription — everything Audrey needs to reconcile
without re-deriving:

1. **The variance** — $ and %, period, as-of.
2. **The actual** — invoice-mirror citation.
3. **The expected** — the derivation above, inputs cited.
4. **Candidate explanation class** (Vance's read, labeled as hypothesis, never asserted):
   quantity drift (true-up lag) · price change (escalator/renewal repricing) · billing
   error · new/unmapped line-item.
5. **Clock notes** — the term/renewal boundary if one is near (the Deadline Sentinel,
   02-B1, owns that clock).

## The measure-vs-own split (hard)

**Vance MEASURES the variance; Audrey OWNS the money clock** (A11 obligation/action
separation). This workflow is **read-only money**:

- No reconciliation, credit pursuit, dispute, true-up, or payment act here — those live
  in Audrey's stream (→ Stream 09) and **the money commitment is gated on Audrey's
  side**.
- Procurement-side remediation (a true-up buy, a term change) is `always_gate` forever
  (ADR-0109, migration 0184) at the governed-procurement money gate (02-B2) — noted,
  never staged as a commitment from this workflow.
- No QBO push, no Pax8 push, no silver write, no external message — QBO and Pax8 are the
  systems of record; the mirrors are read-only (room.md).

## Discipline

- **Cite + as-of on every figure** (A5); actual = measured, expected = derived, always
  labeled.
- **Pool stays internal** (A7): cross-client cost patterns sharpen the read but never
  appear in a client-visible artifact; vendor pricing/terms never cross a client or
  tenant boundary (CS-08 §5, room.md).
- **No PII, no row-level values committed.** Report by vendor/account/SKU (business
  identifiers); query the live read-only DB for actuals. Synthetic example shape:
  "Vendor V / Client D — actual $1,240 (invoice mirror, as-of 2026-07-01) vs expected
  $1,100 derived (contract $11/unit × 100 true-up units) → +$140 / +12.7% → flag;
  hypothesis: quantity drift; → Audrey."
