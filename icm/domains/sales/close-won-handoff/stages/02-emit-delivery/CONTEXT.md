# Stage 02 — emit-delivery

**Job:** emit the sale→delivery hand-off to Pierce — the won deal's catalog-anchored
line-items select the delivery template (#1306) → Stream 03.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Close stamp | `close.md` (stage 01 output) | full | the closed-won opportunity ref + close date + attribution |
| Line-items | silver `opportunity` · `` `okf:opportunity` `` | this opportunity's sold line-items | catalog-anchored items that select the delivery template (#1306) |

## Process

1. `[script]` Guard: proceed only if stage 01 stamped closed-won (fail-closed; never emit
   delivery off an unclosed deal).
2. `[script]` Resolve the won deal's **catalog-anchored line-items**; map them to the
   delivery template (#1306, ADR-0096). Off-catalog / unmappable items → flag for a human
   (refuse-precondition — do not emit a guessed template).
3. `[script]` **SEAM → emit the sale→delivery hand-off to Pierce / Stream 03** carrying the
   won opportunity ref, close date, attribution, and the selected line-items/template. This
   is a **deterministic governed event, NOT a send and NOT a new tool** — the won-detection
   IS the hand-off; the seam rule is governed config, executed mechanically. The DocuSign
   contract-signed gate is a precondition on **Pierce's provisioning**, not on this emit
   (A11 — the gate is on the actuator). Reference Stream 03 as the terminal actuation; do
   not duplicate Pierce's provisioning work here.

## Outputs

`delivery-handoff.md` — the emitted hand-off: won opportunity ref, close date, attribution,
the catalog-anchored line-items + selected delivery template (#1306), and the Stream 03
routing. #991 (hand-off bus) dormant → propose-only (A5c).

## Audit

- [ ] Stage 01 stamped closed-won (else parked)
- [ ] Line-items catalog-anchored; template selected per #1306 (off-catalog → flagged, not guessed)
- [ ] Hand-off emitted to Pierce / Stream 03 as the explicit seam (deterministic, not a send)
- [ ] DocuSign gate left on Pierce's provisioning side — not asserted as cleared here
- [ ] No customer-facing effect; no provisioning performed in this workflow
