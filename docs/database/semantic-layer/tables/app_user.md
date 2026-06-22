---
type: Silver Table
title: app_user
entity: app_user
archetype: H
description: Internal employee/user identity — sourced from Entra ID; roles drive RBAC; payroll/comp extensions are segregated and gated.
resource: ../../../decision-records/ADR-0016-rbac-and-identity-model.md
tags: [silver, identity, rbac, reference]
data_class: people_hr
timestamp: 2026-06-22T00:00:00Z
---

# app_user

The internal user (Imperion employee). Governed by
[ADR-0016](../../../decision-records/ADR-0016-rbac-and-identity-model.md). Identity is
**Entra ID** — there is no third-party IdP.

## Source of record / authority

**Entra ID is the identity source** (`entra_object_id`, `email`, `display_name`); `roles`
are derived from Entra group membership and drive RBAC across the app. `group_ids` carries
the **raw Entra group object-ids** from the sign-in token — the authoritative membership
record (distinct from the lossy `roles` projection), feeding the two-axis RLS company scope
(ADR-0105, #967). Payroll/HR extensions (`employee_profile`, `pay_rate`, classification
1099/W2) are **segregated** and comp data is finance/backend-gated (GRANT-restricted) — not
part of this row.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `entra_object_id` | text | Entra identity (source key) |
| `email` | text | |
| `display_name` | text | |
| `roles` | text[] | from Entra groups; drives RBAC |
| `group_ids` | text[] | raw Entra group object-ids; two-axis RLS company scope (ADR-0105) |

## Joins

- Referenced as `owner_user_id` / `created_by_user_id` / approver fields across the schema.
- Extensions: `employee_profile` (1:1), `pay_rate` (comp-gated), `connection` (per-user
  OAuth, `owner_user_id`).

## Notes

User identity is personal data. Keep row-level values out of this doc; resolve against the
live read-only DB. Comp/pay never appears here.
