# Stage 01 — detect-signal

**Job:** detect the vendor risk/EOL signal, classify it, and cite it with its source and as-of date.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Vendor/product state | `bronze pax8_*` (read-only) | catalog, pricing, and product-lifecycle changes on in-use SKUs | where a price hike or EOL first shows in the SoR mirror (room.md) |
| Exposed entitlements | silver `license_assignment` · `okf:license_assignment` | entitlements on the affected vendor/SKU | confirms the signal touches something we actually hold |
| Contractual exposure | silver `contract` · `okf:contract` | agreements referencing the affected vendor/SKU | term/expiry context — how locked-in the exposure is |
| Risk/EOL rubric | `./skills/risk-eol-rubric.md` | signal classes + evidence bar | what counts as a signal, what parks |

## Process

1. `[automation]` Fix the **as-of date** for the run and capture the triggering signal —
   a Pax8 bronze catalog/pricing/lifecycle change on an in-use SKU, or a routed
   observation — **citing the signal, its source, and its as-of** (A5).
2. `[automation]` Classify the signal per `risk-eol-rubric.md`: **price hike** ·
   **EOL/EOS** · **vendor instability**. An ambiguous or unverifiable signal — no citable
   source, or a rumor-grade observation — is **parked as a gap**, never classified on a
   guess (vance.md §5): a false vendor-risk alarm spends real credibility.
3. `[automation]` Confirm the signal is **live exposure**: it touches an entitlement in
   `license_assignment` or an agreement in `contract`. A signal on a SKU nobody holds is
   noted and closed, not advanced — no exposure, no advisory.

## Outputs

`signal.md` — the as-of date; the signal (class, vendor/SKU, evidence + source + as-of, the
effective/announced date if stated); the live-exposure confirmation (entitlements and
agreements touched, by count); or the parked/no-exposure disposition, noted — not guessed.

## Audit

- [ ] As-of date stated (not blank); the signal cites its source + as-of (A5)
- [ ] Signal classified per the rubric, or parked as ambiguous/unverifiable — never guessed
- [ ] Live exposure confirmed against `license_assignment`/`contract` (or no-exposure noted and closed)
- [ ] No actuation / no money commitment emitted (detect only — no switch, cancel, or buy)
