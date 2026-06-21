# Pax8 integration

How **Imperion OS** ingests Pax8 — the distributor through which the MSP procures and bills
cloud licenses. Pax8 is the foundation of the **procure → provision → bill** loop
([#1042](https://github.com/markdconnelly/ImperionCRM/issues/1042)) and license-cost
reconciliation ([#1041](https://github.com/markdconnelly/ImperionCRM/issues/1041)).

[← Integrations](README.md)

> **Four-repo model (ADR-0042).** This front end *registers* the Pax8 provider and *collects*
> the credential; it never runs the integration. The on-prem **LocalPipeline** ingests Pax8
> into bronze and merges it to silver (merge co-locates with ingestion, LP ADR-0026).

## Credential

Pax8 authenticates with an **OAuth client-credentials** pair (client id + client secret).
It is a **company-scoped** credential (the MSP has one Pax8 distributor account spanning many
customer companies), entered under **Settings → Company credentials** (the `pax8` entry in
`company-providers.ts`). The secret is custodied in **Key Vault by reference** (ADR-0103) —
it never touches the database or a log. `pax8` is a registered `connection_provider` value
(migration 0161) so the credential registry and account panel can store it.

## Bronze (migration 0161)

The collector ([LocalPipeline #279](https://github.com/markdconnelly/ImperionCRM_LocalPipelineEnrichment/issues/279))
writes the standard bronze envelope (flat text columns + `tenant_id, source, external_id,
collected_at, raw_payload, content_hash`, PK `(tenant_id, source, external_id)`; `tenant_id`
= the Pax8 partner/account id):

| Table | What it holds | Join spine |
|---|---|---|
| `pax8_companies` | Customer companies under the MSP Pax8 account | `pax8_company_id` |
| `pax8_subscriptions` | Recurring subscriptions (the billing spine) | `company_id`, `pax8_subscription_id` |
| `pax8_licenses` | License assignments (the provision link) | `company_id`, `subscription_id` |
| `pax8_orders` | Procurement orders (the procure side) | `company_id` |

The tables are **empty in prod** until migration 0161 is applied and the credential lands
(both Mark-gated, #1042); the collector self-gates until then.

## Silver mapping (planned — merge follow-up, LP #280)

The merge ([LocalPipeline #280](https://github.com/markdconnelly/ImperionCRM_LocalPipelineEnrichment/issues/280))
resolves Pax8 records onto existing silver entities — **no new silver entity**; Pax8 enriches
what already exists:

1. **Pax8 company → `account`.** Resolve `pax8_companies` to the silver `account` via the
   entity-resolution registry (`entity_xref`, source_system `pax8`, #1054) — falling back to
   name match — so every Pax8 record hangs off the right client.
2. **Pax8 subscription/license → `contract` / agreement line.** A subscription is a recurring
   commitment; map it to the client's `contract` (ADR-0080 sale→delivery) as the *actual*
   licensed quantity, for true-up against the contracted quantity ([#1041](https://github.com/markdconnelly/ImperionCRM/issues/1041)).
3. **Pax8 license → `device` link (where assignable).** When `assigned_to` resolves to a
   user/device, link the license to the silver `device` so the CMDB shows what is licensed.

Until the merge lands, the bronze tables stand alone (raw, queryable, no silver projection).
The coverage matrix carries the ⏳ row for this mapping.

## Boundaries

No secrets in the repo or DB — the Pax8 credential is Key-Vault-by-reference (ADR-0103).
Bronze is PII-adjacent and access-controlled (ADR-0039). Specific subscription/cost figures
resolve against the live read-only DB, never docs.
