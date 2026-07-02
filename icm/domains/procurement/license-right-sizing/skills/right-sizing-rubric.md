# Right-sizing rubric (Mark-editable — utilization thresholds + consolidation patterns + the tradeoff shape)

> DEFAULTS authored by the agent 2026-07-01. The rubric for `license-right-sizing`: when a
> SKU/quantity counts as over-provisioned, which consolidation patterns to look for, and
> the shape every recommendation takes. Mark: edit freely; stages cite this, nothing
> restates it.

## Utilization thresholds (when a candidate is marked)

Judged per SKU per account, as of a stated date, off `license_assignment`
utilization/true-up facts + the Pax8 bronze mirror:

| Signal | Threshold (default) | Candidate class |
|---|---|---|
| Quantity utilization | < 80% of paid quantity actively utilized for 2 consecutive snapshots | **over-provisioned quantity** → downgrade quantity |
| Tier utilization | the tier-differentiating features show no utilization for 2 consecutive snapshots | **over-tiered SKU** → downgrade tier |
| Overlapping SKUs | two entitled SKUs whose catalog capability sets materially overlap for the same consumers | **consolidatable** → consolidate onto one |

Two-snapshot persistence is deliberate: one low snapshot is noise (seasonality, a hiring
dip), two is a pattern. First-sighting candidates are noted as "watch", not recommended.
**Missing, stale, or ambiguous utilization data → park the gap, never guess** (A5
empty→park; vance.md §5) — a guessed downgrade takes a tool from someone using it.

## SKU-consolidation patterns

- **Bundle absorption:** a held suite/bundle already includes a capability bought
  separately → drop the standalone.
- **Tier collapse:** a mixed estate (some seats premium, some standard) where utilization
  supports one tier → converge on it.
- **Duplicate capability:** two vendors' SKUs doing the same catalog job for the same
  consumers → consolidate onto the better-priced/better-fit one. (Whole-vendor overlap
  beyond license/SKU data is **gated on the vendor-record model stub, #1311** — tag it,
  don't improvise; the cross-vendor advisory is 02-B9's job.)

## The quantify-the-tradeoff shape (every recommendation)

Per finding, in this order (vance.md §3):
1. **The cost** — measured current cost (invoice mirror preferred, Pax8 fallback; cite
   which + as-of) vs target cost; savings labeled **derived**.
2. **The utilization** — the measured signal that triggered the threshold, cited + as-of.
3. **The rejected alternative** — what was considered and not recommended, with the
   reason (keep as-is / cancel outright / different target tier).

Floors: never recommend below the **service-catalog baseline** (#1306) — a rec that would
under-license is dropped here and belongs to 02-B4's exposure flag (risk over cost,
vance.md §3). Term-committed subscriptions right-size at the term boundary — stamp the
boundary date; the renewal clock is the Deadline Sentinel's (02-B1).

## The commit-splits-out rule (hard)

This workflow **analyzes and drafts. It NEVER commits.** Every consolidate/downgrade/
cancel is a money commitment — `always_gate` forever (ADR-0109, migration 0184) — decided
by a human at the **governed-procurement money gate (02-B2)** (approve-once; BO-03
Procurement §5). B4: assertion-with-spend ≠ measurement (A11). No Pax8 push, no silver
write, no external message (room.md).

## Discipline

- **Cite + as-of on every figure** (A5); measured vs derived always labeled.
- **Pool stays internal** (A7): cross-client utilization patterns inform thresholds but
  never appear in client-visible artifacts; vendor pricing never crosses a client or
  tenant boundary (CS-08 §5, room.md).
- **No PII, no row-level values committed.** Report by account/SKU (business
  identifiers); query the live read-only DB for actuals. Synthetic example shape:
  "Client C — 50× SKU-Z premium paid, 31 utilized across 2 snapshots (as-of 2026-07-01)
  → over-provisioned; rec: downgrade to 35 (buffer per budget-owner attest), $9/mo/unit
  measured → $135/mo derived saving; rejected: cancel-to-31 (no hiring buffer)."
