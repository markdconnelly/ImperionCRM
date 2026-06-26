---
type: Silver Table
title: cmdb_ci_overlay
entity: cmdb_ci_overlay
archetype: D
description: App-native per-CI criticality / business-impact overlay — one row per Configuration Item (polymorphic ci_type+ci_id pair over the read-only cmdb_ci union) carrying a derived_default (computed from silver attributes) and a nullable admin override. Effective criticality = override ?? derived_default; the weighting input for impact analysis. IT Glue write-back is a separate gated slice.
resource: ../../../decision-records/ADR-0047-device-inventory.md
tags: [silver, service-desk, cmdb, criticality, business-impact, overlay, archetype-d, app-native]
data_class: operational
timestamp: 2026-06-25T00:00:00Z
---

# cmdb_ci_overlay

The CMDB **per-CI criticality / business-impact overlay** — one row per Configuration
Item carrying a **criticality** rating
([#648](https://github.com/markdconnelly/ImperionCRM/issues/648), parent
[#372](https://github.com/markdconnelly/ImperionCRM/issues/372); CMDB authority ADR
authored in parallel under [#646](https://github.com/markdconnelly/ImperionCRM/issues/646)
/ PR #812, nominally **ADR-0097**, with the umbrella **ADR-0078**). The CI register
([#645](https://github.com/markdconnelly/ImperionCRM/issues/645)) is a READ-ONLY `cmdb_ci`
UNION projected over silver `account` / [`contact`](contact.md) / [`device`](device.md)
(no `cmdb_ci` table), so a CI is a polymorphic `(ci_type, ci_id)` pair. This table stores a
**per-CI attribute** — criticality — that has nowhere in silver to live.

It is the **attribute** twin of [`ci_relationship`](ci_relationship.md) (#647, the **edge**
overlay): both are **archetype D** (app-owned sidecar hung off a read-only projection — the
family of [`collections_activity`](collections_activity.md)) **but app-native**. A separate
table rather than a column on `ci_relationship` because that table's grain is an *edge*
(two CIs); this table's grain is a single *CI*. Pushing criticality out to **IT Glue is a
separate, gated round-trip slice** (a later
[#372](https://github.com/markdconnelly/ImperionCRM/issues/372) child), not this table.

## Source of record / authority

- **The website is the system of record for the criticality overlay.** The rating is:
  - **derived_default** — computed from EXISTING silver attributes and recomputable on
    demand (`crm.deriveCiCriticality()`, the same rule the migration seed runs). v1 rule:
    - **account** → `account.relationship` × `account.lifecycle_stage`: `customer` &
      `managed_active` → **high**; `customer` (other stage) or `partner` → **medium**;
      `prospect` / unknown → **low**.
    - **device** → `device.device_type`: `server` | `network` → **high**; `workstation` |
      `mobile` | `laptop` | `desktop` → **medium**; unknown → **low**.
    - **user** → **medium** baseline (silver `contact` carries no seniority/role signal
      today; an admin override is the escape hatch until such a signal lands — a future
      front-end schema change, ADR-0042).
    - **cloud** → `cloud_asset.category`: `database` | `identity` | `security` → **high**;
      `compute` | `network` → **medium**; else → **low** (#653).
    - **software** → flat **low** baseline — a supporting CI carries no business-impact
      signal of its own; an admin override is the escape hatch (#652).
    The derived rule **never** assigns `critical` — a machine should not silently declare a
    CI business-critical; that level is reserved for an explicit human override. The
    IDENTICAL rule is encoded in `src/lib/cmdb/criticality.ts::deriveCriticality` (the
    in-code read path + unit tests) so SQL and code never diverge.
  - **override** — an admin's explicit rating (`cmdb:write`, ADR-0045). Nullable: NULL means
    "use the derived default".
- **Override survives re-derivation.** `crm.deriveCiCriticality()` rewrites ONLY
  `derived_default`; `override` (and its audit `override_by` / `override_at`) is never
  touched — the same survival pattern manual edges use in `ci_relationship`.
- **Effective criticality = `override ?? derived_default`** — the single resolution point
  (`effectiveCriticality`), the weighting input for impact analysis
  ([#650](https://github.com/markdconnelly/ImperionCRM/issues/650)).
- **Key is a business key, not an FK.** A CI is a projection over silver (#645) — there is
  no `cmdb_ci` table to reference, and `ci_id` is unique only within a `ci_type`. The app
  validates the CI exists in `listConfigurationItems` before an UPSERT.

## Schema

| Column | Type | Notes |
|---|---|---|
| `ci_type` | text | `account` \| `user` \| `device` \| `cloud` \| `software` (CHECK); part of the PK |
| `ci_id` | text | CI business key within `ci_type`; part of the PK |
| `derived_default` | `ci_criticality` enum | computed from silver attributes; recomputed by the derivation (rewrites THIS column only); never `critical` |
| `override` | `ci_criticality` enum | admin's explicit rating; NULL = use `derived_default`; survives re-derivation |
| `override_by` / `override_at` | text / timestamptz | audit of the last override change |
| `created_at` / `updated_at` | timestamptz | row timestamps |

`ci_criticality` enum = `critical` \| `high` \| `medium` \| `low` (highest → lowest).
PRIMARY KEY `(ci_type, ci_id)` — one overlay row per CI.

## Joins

- `(ci_type, ci_id)` → the `cmdb_ci` union read-model (#645) — i.e. silver
  [`account`](account.md), [`contact`](contact.md) (the `user` CI), [`device`](device.md),
  [`cloud_asset`](cloud_asset.md) (the `cloud` CI), or [`software_ci`](software_ci.md)
  (the `software` CI).
  Business-key join, **not an FK** (the register is a union/projection).
- **Consumers:** the CI register badge + CI-detail criticality panel (`/cmdb`,
  `/cmdb/<type>/<id>`); later CMDB impact analysis
  ([#650](https://github.com/markdconnelly/ImperionCRM/issues/650)) weights the effective
  criticality. Read path: folded into `crm.listConfigurationItems()` (LEFT-merged in code,
  with an in-code derived fallback when the overlay is unseeded). Writes:
  `crm.setCiCriticalityOverride` (override, `cmdb:write`) and `crm.deriveCiCriticality`
  (recompute derived). Pure helpers in `src/lib/cmdb/criticality.ts`.

## Notes

Gated by `cmdb:write` (admin-only, ADR-0045) on every write; the CMDB *register* is visible
to admin∨support (`canSeeCmdb`, read-only). **App-native: nothing here propagates to IT Glue**
(that is a separate gated slice). **PII-free:** a row is a CI business key + a criticality
rating + an optional admin/timestamp audit — it mints no personal data of its own; CI display
names and attributes resolve live from the read-only register / silver.
