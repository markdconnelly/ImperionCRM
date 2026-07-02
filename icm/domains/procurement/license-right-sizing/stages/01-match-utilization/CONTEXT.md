# Stage 01 — match-utilization

**Job:** match each SKU/quantity against actual utilization as of a stated date, parking every missing-data gap.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Entitlement + utilization facts | silver `license_assignment` · `okf:license_assignment` | entitlements, assigned quantities + utilization/true-up facts as of the run | what is paid for vs what is actually used |
| Client spine | silver `account` · `okf:account` | accounts owning the analyzed SKUs | attribute each finding to its client (or Imperion-self — subject: both, 02-B5) |
| Pax8 subscription state | bronze `pax8_*` (read-only) | active subscriptions, quantities, tiers | the SoR mirror of what is being paid for (room.md) |
| Right-sizing rubric | `./skills/right-sizing-rubric.md` | utilization thresholds | what over-provisioned means, when to park |

## Process

1. `[script]` Fix the **as-of date** for the run. Utilization matching is a snapshot claim;
   an undated match is an audit fail (A5).
2. `[automation]` For each SKU in scope, match the paid quantity/tier (Pax8 bronze +
   `license_assignment`) against **actual utilization** on the assignment/true-up facts,
   **citing the utilization data + its as-of date** on every match (A5, #1488). Apply the
   rubric's utilization thresholds to mark candidates: over-provisioned quantity,
   over-tiered SKU, consolidatable pattern.
3. `[automation]` **Park the gaps:** any SKU whose utilization data is missing, stale, or
   ambiguous is listed as a **parked gap — never guessed** (A5 empty→park); a guessed
   downgrade takes a tool from someone using it. The vendor-record model is a stub
   (#1311) — findings needing whole-vendor data are parked with that tag, not improvised.

## Outputs

`utilization-match.md` — the as-of date, the candidate list (SKU, owning account, paid
quantity/tier vs measured utilization, threshold triggered, evidence citation + as-of per
row), and the parked gaps (missing/stale utilization, #1311-gated items), not guessed.

## Audit

- [ ] As-of date stated; every match cites its utilization data source + as-of (A5)
- [ ] Missing/stale/ambiguous utilization parked as a gap — no usage level guessed
- [ ] Candidates marked only by rubric thresholds; #1311-gated items tagged, not improvised
- [ ] Measurement only — no actuation, no downgrade, no money commitment emitted
