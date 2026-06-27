---
adr: 0127
title: "Web role least-privilege: SELECT-by-default + explicit write allowlist"
status: proposed
date: 2026-06-27
repo: frontend
summary: "The web DB identity is SELECT-only by default; INSERT/UPDATE/DELETE is granted only on an explicit allowlist of tables the GUI writes directly. Replaces migration 0002's blanket RW-on-all-tables grant. Amends ADR-0042 §1; a CI guard bans re-introducing the blanket pattern."
tags: [security, database, least-privilege, grants]
---

# ADR-0127: Web role least-privilege — SELECT-by-default + explicit write allowlist

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-27 |
| **Cross-references** | Amends ADR-0042 §1 (four-repo division of labor); supersedes the grant posture of migration 0002; corrects #1360 / migration 0215 |

## Problem

Migration `0002_app_identity_grants.sql` grants the web identity
`mgid-imperioncrm-web-prd` blanket `SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA
public`, plus an `ALTER DEFAULT PRIVILEGES` that re-applies the same to **every future
table**. So the GUI's DB role can write **every** table — bronze landing zones, agent/
orchestrator tables, embeddings, silver tiers the pipeline owns — none of which the front
end should mutate. This contradicts ADR-0042 §1 (the front end is GUI-only: direct DB
*reads* for rendering, every *write* is a process) and the §5 least-privilege posture, and
it grows silently: each new table is born web-writable. A compromised web identity (or an
injection) could tamper with the entire operational + agent-memory substrate.

#1360 (migration 0215) began fixing this table-by-table for the social plane but (a) only
covered nine tables and (b) over-revoked four tables the GUI legitimately writes
(`campaign`, `ad`, `campaign_send`, `interaction`) — proof that ad-hoc per-table revokes
don't scale and are error-prone.

## Context

- The web role is the identity the Next.js app (server actions / route handlers / the typed
  data layer in `src/lib/data/postgres/postgres-repositories.ts`) uses for **all** direct DB
  access. Some of that is legitimate GUI writes (CRM/projects/tasks/time+expense/templates/
  intake/CMDB overlays/personal-spine/`website_*` bronze/audit). The rest of the schema is
  written by the backend (agent/orchestrator), the cloud Pipeline, or the on-prem Local
  Pipeline under their own roles.
- An audit of the data layer (every `INSERT/UPDATE/DELETE` literal in `src/`) yields the
  authoritative set of tables the GUI writes directly — the **write allowlist** (see
  `docs/security/web-role-write-allowlist.md`). It is intentionally biased toward inclusion:
  omitting a genuinely-written table breaks a feature; including a never-written one only
  loosens the grant slightly.

## Options considered

1. **Keep per-table REVOKE migrations** (the 0215 approach). Rejected: doesn't scale, leaves
   the blanket default in place, and the next new table is web-writable again.
2. **Flip to SELECT-by-default + explicit write allowlist** (chosen). Revoke all web writes,
   flip the default privilege so future tables are web-SELECT-only, and grant writes back on
   the explicit allowlist. New write surfaces become a deliberate, reviewable per-table grant.

### Tradeoffs

- (+) Least-privilege by construction; new tables are safe by default; the write surface is
  an auditable list, not "everything".
- (−) The allowlist must be maintained: a new GUI-written table needs an explicit grant in
  its migration (the CI guard + this doc make that obvious). A missed grant fails fast (the
  insert errors) rather than silently over-permitting.

## Decision

The web identity is **SELECT-by-default**. `INSERT/UPDATE/DELETE` is granted **only** on the
explicit allowlist of tables the GUI writes directly (migration 0216;
`docs/security/web-role-write-allowlist.md`). Migration 0216:
1. `REVOKE INSERT, UPDATE, DELETE ON ALL TABLES` from web (SELECT and sequence USAGE kept);
2. flips the `ALTER DEFAULT PRIVILEGES` so future tables are web-SELECT-only;
3. `GRANT INSERT, UPDATE, DELETE` back on the allowlist.

This **amends ADR-0042 §1**: the front end still does direct reads for rendering, and its
direct writes are now bounded to the allowlist (the rest go through the backend/pipeline
boundary). Adding a GUI-written table is a deliberate per-table web write grant in that
table's migration — never a blanket grant. A **CI guard**
(`src/lib/security/web-grant-guard.test.ts`) fails any migration (other than the historical
0002) that re-introduces a blanket `ON ALL TABLES … TO web` write grant or a write
`ALTER DEFAULT PRIVILEGES … TO web`.

## Security impact

Tightens least-privilege materially: removes ~165 tables from the web write surface (bronze,
agent, embeddings, pipeline-owned silver), shrinking the blast radius of a compromised web
identity to the GUI's own working set. SELECT is unchanged (rendering unaffected).

## Cost / operational impact

One migration + a CI test; no runtime cost. **Apply is gated** on a pre-apply prod
introspection diff (the data-layer audit is authoritative for what the GUI writes, but a few
admin-config tables in the revoke set should be confirmed against live write usage before
apply). Each prod apply remains Mark-gated (system CLAUDE.md §10.3).

## Future considerations

A periodic reconciliation (the eval/quality plane, or a scheduled introspection job) could
diff live web grants against the checked-in allowlist and flag drift. Per-environment role
names (dev/staging) would generalize the guard beyond the prod role string.
