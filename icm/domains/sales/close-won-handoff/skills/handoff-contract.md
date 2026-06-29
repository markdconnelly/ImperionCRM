# Close-won hand-off contract (Mark-editable)

> DEFAULTS authored by the agent 2026-06-29 — Mark: edit freely. This is the canonical
> statement of **what each of the two close-won seams CARRIES** (stages 02/03 cite it,
> nothing restates it). It does NOT re-argue the seam doctrine (that is ADR-0096 + the
> A11 obligation/action separation) — it pins the payload and the one hard precondition.

## Seam 1 — sale→delivery hand-off → Pierce (Stream 03, ADR-0096)

The delivery hand-off carries:

- **Catalog-anchored line-items** — the won deal's sold items, anchored to the service
  catalog (#1306); these **select the delivery template** Pierce provisions against.
  Off-catalog / unmappable → flag for a human (refuse-precondition), never a guessed template.
- **Won opportunity ref** — the closed-won `opportunity_id` (KQM-mirrored order ref).
- **Close date** — the stamped close-won date.
- **Attribution** — won source + owning rep/account link.

## Seam 2 — relationship hand-off → Celeste (Stream 08)

The relationship hand-off carries:

- **Account** — the now-active-customer account (`account_id`).
- **Relationship state** — transaction closed-won; the relationship transitions from
  Chase's transaction scope to Celeste's ongoing-relationship ownership.
- **Next-touch context** — primary contact, what was sold, and the onboarding-adjacent
  note for the first relationship touch. Grounded or omitted — no fabricated commitment.

## The one hard precondition (lives on the actuator, not on Chase)

**DocuSign contract-signed is a precondition on Pierce's *provisioning*, NOT on Chase's
close** (A11 — the gate is on the actuator). This workflow stamps closed-won and emits the
seams regardless of signature state; Pierce's provisioning does not start until the contract
is signed. Never assert the DocuSign gate as cleared from here, and never block the close on it.

## Rule

Both emits are **deterministic governed events, NOT sends and NOT new tools** — the
won-detection IS the hand-off. Nothing customer-facing originates in this workflow. #991
(the hand-off bus) is dormant in v1 → the emits ship propose-only until it lands (A5c).
