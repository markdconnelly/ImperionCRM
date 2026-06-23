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

## Silver mapping (merge — LP #280 + the `license_assignment` projection)

The merge ([LocalPipeline #280](https://github.com/markdconnelly/ImperionCRM_LocalPipelineEnrichment/issues/280))
resolves Pax8 records onto silver in two steps:

1. **Pax8 company → `account` (built, LP #280).** Resolve `pax8_companies` to the silver
   `account` via the entity-resolution registry (`entity_xref`, source_system `pax8`,
   [#1054](https://github.com/markdconnelly/ImperionCRM/issues/1054)) — falling back to name
   match — so every Pax8 record hangs off the right client.
2. **Pax8 license → `license_assignment` (silver, migration 0176, [#1223](https://github.com/markdconnelly/ImperionCRM/issues/1223)).**
   The per-license facts need a home the existing schema lacked (`contract` is header-only;
   `device` has no license column). The thin **`license_assignment`** silver entity is that
   home: one account-resolved row per assigned license carrying the **actual licensed
   quantity** (the actual side of the [#1041](https://github.com/markdconnelly/ImperionCRM/issues/1041)
   true-up) plus the optional **`device_id`** (license → device, CMDB) and **`contract_id`**
   (license → agreement, [#1085](https://github.com/markdconnelly/ImperionCRM/issues/1085))
   links. Distributor-agnostic by construction (`source`; `pax8` first). Concept:
   [`semantic-layer/tables/license_assignment.md`](../database/semantic-layer/tables/license_assignment.md).
   The LP merge extension that populates it is the #280 populate twin.

Until the merge runs, the bronze tables stand alone (raw, queryable) and `license_assignment`
is empty. The coverage matrix carries the `license_assignment` row.

## Boundaries

No secrets in the repo or DB — the Pax8 credential is Key-Vault-by-reference (ADR-0103).
Bronze is PII-adjacent and access-controlled (ADR-0039). Specific subscription/cost figures
resolve against the live read-only DB, never docs.
