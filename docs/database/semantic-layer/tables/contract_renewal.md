---
type: Silver Table
title: contract_renewal
entity: contract_renewal
archetype: B
description: App-native renewal satellite — the in-flight renewal of an expiring contract (lifecycle identified→priced→quoted→sent→renewed|repriced|churned + layered repricing); Imperion is SoR, the opportunity merge never writes it.
resource: ../../../decision-records/ADR-0130-renewals-and-opportunity-consistency.md
tags: [silver, sales, renewal, contract, repricing, archetype-b]
data_class: operational
timestamp: 2026-07-01T00:00:00Z
---

# contract_renewal

The **in-flight renewal** of an expiring managed-services contract — the app-native
record the renewal motion (radar → repricing → worklist → quote → e-sign → outcome)
hangs off. A renewal is **not** a flavored opportunity: the silver
[`opportunity`](opportunity.md) is externally merged every cycle, so renewal state on it
would be clobbered; this satellite is the one place renewal-specific data lives
([ADR-0130](../../../decision-records/ADR-0130-renewals-and-opportunity-consistency.md) D1;
#1324, epic #1304). Migration `0248` (batch pre-assigned; renumber-at-merge per §10.3 if
collided).

## Source of record / authority

- **Imperion is the system of record** — app-native, archetype B. **The opportunity merge
  never writes this table** (that separation is the reason it exists, ADR-0130 D1). The
  pipelines have read-only grants.
- **Who writes:** the **renewals radar** (#1323, over `contract.end_date`) creates a row at
  `status=identified` when a contract crosses the lead-time threshold (default **90 days**)
  — app-only, **no opportunity yet** (D3 two-stage trigger, keeps Autotask clean). Pursuit
  (a human via the worklist #1327, or the backend repricing executor #1326 / Chase) prices
  it, mints the `kind=renewal` [`opportunity`](opportunity.md), sets `opportunity_id`, and
  advances the lifecycle.
- **Radar idempotency:** `UNIQUE (contract_id, term_end)` — one renewal per contract per
  expiring term; re-running the radar never duplicates an in-flight renewal.
- **Repricing is layered and auditable** (D6): base = `current_revenue` (a **snapshot** of
  `contract.estimated_revenue` at open, deliberately not a live read); escalation % = the
  per-contract clause ELSE a 5% baseline; + term incentive + cost pass-through; human
  override allowed on the % or the final number. The full derivation lives in
  `proposed_pricing`.
- The **contract itself stays Autotask-SoR** ([`contract`](contract.md), ADR-0044) and the
  **envelope stays DocuSign-SoR** ([`esign_envelope`](esign_envelope.md), ADR-0071) — this
  row links to both, it never mirrors them.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | surrogate PK |
| `tenant_id` | uuid | scopes the renewal |
| `account_id` | uuid | the client → [`account`](account.md); FK, CASCADE |
| `contract_id` | uuid | the **expiring agreement** → [`contract`](contract.md); FK, CASCADE; required |
| `status` | `contract_renewal_status` enum | `identified` (radar-created, app-only) · `priced` (repricing proposed) · `quoted` (KQM quote attached) · `sent` (out for signature) · `renewed` (closed flat) · `repriced` (closed with a price change) · `churned` (did not renew) |
| `current_revenue` | numeric? | snapshot of `contract.estimated_revenue` at open — the repricing base (D6); **financial-gated** at render |
| `proposed_revenue` | numeric? | the proposed renewal number, human-overridable; **financial-gated** |
| `proposed_pricing` | jsonb? | full derivation `{ base, escalation_pct, escalation_source, term_incentive, cost_passthrough, final, overridden_by? }` — audit + margin display; **financial-gated** |
| `opportunity_id` | uuid? | the `kind=renewal` [`opportunity`](opportunity.md) documenting the pursuit; FK, SET NULL; **NULL while `identified`** — minted at pursuit (D3) |
| `esign_envelope_id` | uuid? | the envelope the renewal quote went out on → [`esign_envelope`](esign_envelope.md); FK, SET NULL; set when `sent` |
| `term_end` | date | the `contract.end_date` this renewal renews; `(contract_id, term_end)` unique |
| `created_at` / `updated_at` | timestamptz | timestamps (`set_updated_at` trigger) |

## Joins

- `contract_id` → [`contract`](contract.md) (the expiring agreement; the radar reads its
  `end_date` + `estimated_revenue`).
- `account_id` → [`account`](account.md) (the client; the worklist groups by it).
- `opportunity_id` → [`opportunity`](opportunity.md) (`kind='renewal'` — the sales artifact;
  the D4 single-opportunity SOP keeps it ONE silver row across Autotask↔KQM).
- `esign_envelope_id` → [`esign_envelope`](esign_envelope.md) (the signature event when the
  renewal quote is sent).
- **Consumers:** the renewals radar (#1323), the repricing executor (#1326, backend), the
  renewal worklist (#1327), quote→e-sign (#1328), and outcome roll-ups (renewed/repriced/
  churned feed churn-risk #1046). The future Autotask write-back is a separate gated
  backend slice — **no write-back in this slice**.

## Notes

`data_class` is **operational** (ADR-0130 D7), but the revenue columns
(`current_revenue`, `proposed_revenue`, `proposed_pricing`) are **financial-gated at
render** (`canSeeRevenue`, ADR-0030) — the same boundary as `opportunity.amount_mrr`.
Renewal pricing is **commercially sensitive and client-identifying in context** — keep
specifics out of this doc; resolve against the live read-only DB. No personal PII on the
row; no secrets.
