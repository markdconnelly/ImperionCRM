# Credentials catalog (Settings → Credentials)

The **credential registry** (ADR-0103) — a governed, admin-only view of every credential the
system custodies in Azure Key Vault, at **Settings → Credentials** (`/settings/credentials`).

## What it shows

One row per `connection`, grouped by **scope**:

| Scope | Meaning |
|---|---|
| **Personal** (`user`) | An employee's own connection (their M365, social, etc.). |
| **Company** (`company`) | Imperion's own company systems (Autotask, IT Glue, the M365 enterprise app, …) — Imperion acting as its own first client. |
| **Client** (`client`) | A managed customer's connection, **linked to that customer's account**. |

Columns: the **Key Vault secret name**, the connection display name, provider, the linked
**account** (client scope) or owner (personal), the **auth method** (certificate / secret /
OAuth), and status.

## What it never shows

**Secret values are never displayed.** Only the Key Vault secret *name* is surfaced, for
traceability. The token/secret itself lives only in Key Vault and never enters the database,
this page, or any log (CLAUDE.md §5, ADR-0103).

## Naming standard

Key Vault secret names follow `conn-<scope>-<provider>[-<tenantId|userId>]` — e.g.
`conn-client-<tenantId>-m365`, `conn-company-qbo`, `conn-user-<userId>-mileiq`. The standard
makes a mis-scoped or stray secret obvious at a glance.

## Related surfaces

- **Account page → Credentials panel** (#906) — the client connections for one account.
- **Settings → Tenant mapping** (`/settings/tenant-mapping`, ADR-0051) — maps M365 tenants
  onto accounts (the registry the on-prem estate discovery enumerates).
- Credential custody (write) is the backend's job; the on-prem pipeline authenticates the M365
  enterprise app by certificate or secret per this registry (BE #217, LP #234).

Access: admin-only (`canSeeSettings`, ADR-0030).
