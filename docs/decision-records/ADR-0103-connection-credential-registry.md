---
adr: 0103
title: "Connection credential registry — client scope + account linkage + cert-or-secret auth (extend connection, not a new table)"
status: accepted
date: 2026-06-18
repo: frontend
summary: "Resolves #904 (epic #903). Every Key-Vault-custodied credential becomes legible + governed: the GUI lists each secret's NAME (never value) under a human-readable naming standard (conn-<scope>-<provider>[-<tenantId|userId>]), classified by scope — user=personal, company=Imperion-as-its-own-client, client=managed customer — and linked to the account object where it belongs to a customer (many connections → one account; M365 ties to account via account_tenant). Extends the existing connection model (migration 0141: client scope + account_id + auth_method/cert_thumbprint) rather than a duplicate registry table. The M365 enterprise app authenticates by certificate OR secret. GUI = Settings catalog (#905) + account-page panel (#906) + account_tenant UI (#907); siblings = backend custody (BE #217) + LP estate discovery (LP #234)."
tags: [connections, security]
---
# ADR-0103: Connection credential registry — scope taxonomy, account linkage, cert-or-secret

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-18 |
| **Cross-references** | ADR-0024 (per-user/company connections), ADR-0042 (four-repo division), backend ADR (cert-or-secret custody, BE #217), pipeline ADR-0018 (per-client onboarding app), LP #234 (estate discovery) |

## Problem

Every credential the system custodies in Key Vault (per-user OAuth tokens, company API
keys, the M365 enterprise-app credential) is opaque: there is no governed surface that
answers *what secrets exist, who they belong to, and which customer they serve*. Operators
cannot see — without reading Key Vault directly — which integrations are an employee's own
(personal), Imperion's own company systems, or a managed client's. For M365 specifically a
customer may run **multiple tenants** under **one company**, and nothing ties the tenant
credential to the account object. And the M365 enterprise app authenticates by certificate
only, with no support for a client-secret.

## Context

- `connection` (ADR-0024, migration 0020) already models connections with `scope`
  (`user`|`company`), `provider`, `display_name`, `status`, and **`keyvault_secret_ref`**
  — the Key Vault secret *name* (the token itself never touches the DB, CLAUDE.md §5).
- `account_tenant` (0061) already models tenant→account, many-to-one.
- The local pipeline's per-client collectors authenticate a **single** onboarding/enterprise
  app (one client id + certificate) tokened per tenant by varying the tenant id; the
  tenant set is a hand-maintained `IMPERION_M365_TENANT_IDS` env var (pipeline ADR-0018).
- Imperion is both the system creator and its own first client, so "company" and "client"
  must be distinguishable and persisted, not inferred.

## Options considered

1. **A new `credential_registry` table** mirroring Key Vault secret names.
2. **Extend the existing `connection` model** with the missing dimensions (scope value,
   account link, auth method) and render the registry GUI over `connection`.

### Tradeoffs

Option 1 duplicates `connection` (which already holds the secret name, scope, provider,
status) and creates a second source of truth that must be kept in sync with the connect
flow — drift risk, two places to govern. Option 2 reuses the one row that already exists
per credential, keeps the connect/custody path single-sourced, and turns "the registry"
into a read over `connection` — no new SoR.

## Decision

**Extend `connection`** (migration 0141):

1. **Scope taxonomy** — add `client` to `connection_scope`: `user` = personal (an
   employee's own), `company` = Imperion acting as its own first client, `client` = a
   managed customer. Persisted, not inferred.
2. **Account linkage** — `connection.account_id` (FK→account, `ON DELETE SET NULL`,
   nullable; set for client scope). **Many connections → one account** (multiple M365
   tenants per company). Complements `account_tenant`.
3. **Cert-or-secret auth** — `connection.auth_method` (`certificate`|`secret`) +
   `cert_thumbprint`; the secret path reuses `keyvault_secret_ref`. The M365 enterprise
   app supports **both**.
4. **KV naming standard** (human-readable, names only): `conn-<scope>-<provider>[-<tenantId|userId>]`
   — e.g. `conn-client-<tenantId>-m365`, `conn-company-qbo`, `conn-<userId>-mileiq`.

The GUI renders the registry over `connection` — Settings **Credentials catalog** (#905)
and the **Account-page credentials panel** (#906) list `keyvault_secret_ref` +
`display_name` + scope + linked account + status, **never the value**. The
`account_tenant` management UI (#907) curates the tenant→account map the estate discovery
enumerates. The local pipeline (LP #234) reads `client`-scope M365 connections joined to
`account_tenant` to fan out per tenant — retiring the env-var tenant list — and
authenticates each via cert or secret.

## Consequences

### Security impact

Secret **values never enter the DB or the GUI** — only the Key Vault *name*
(`keyvault_secret_ref`) and metadata are surfaced; the token/secret stays in Key Vault
(CLAUDE.md §5). The naming standard makes a stray or mis-scoped secret obvious. Access stays
**fail-closed**: a client tenant with no `client`-scope connection / credential is never
touched (pipeline ADR-0018). The local pipeline gets **read-only** SELECT on `connection`
(it never writes it). Cert-or-secret widens the enterprise-app auth surface but both
credentials remain Key-Vault-custodied; certificate stays preferred.

### Cost impact

None — additive columns + one enum value on an existing table; no new store.

### Operational impact

Operators get a single governed view of every custodied credential by scope and account.
The `account_tenant` registry (curated in the new UI) becomes the source of truth for the
M365 client estate, replacing the per-machine env var — adding/removing a managed tenant is
a GUI action, fail-closed by construction.

## Future considerations

- Per-client onboarding-app registrations (distinct app per client) could layer on by
  storing a per-connection `client_id` alongside the auth method — out of scope here (one
  multi-tenant enterprise app today).
- Credential/consent expiry surfacing can hang off the same `connection.status` the catalog
  already renders.
- The same scope/registry pattern generalizes to every custodied credential (Autotask,
  IT Glue, QBO, …), not just M365.
