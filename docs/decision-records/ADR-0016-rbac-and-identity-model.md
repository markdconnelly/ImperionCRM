# ADR-0016: RBAC and identity model

- **Status:** Accepted
- **Date:** 2026-06-07

## Problem
Decide how users, roles, and access control work for an internal, Entra-authenticated
app whose data is full of PII and whose agents act on users' behalf.

## Context
Meridian is single-tenant (Imperion employees only). Entra ID is the sole IdP
(ADR-0002) and CLAUDE.md §3 makes Entra the source of truth for identity and RBAC.
Roles include Admin, Sales, Delivery/Ops, Leadership (Board access), and Read-only.

## Options considered
1. **Entra-sourced roles + app RBAC, PII-aware.**
2. Roles managed entirely in-app (local role column).

## Tradeoffs
- (1) aligns with §3 — Entra groups are authoritative, mirrored to `app_user.roles`
  on sign-in; one place to manage membership; consistent with Conditional
  Access/MFA. Requires group→role mapping.
- (2) faster to iterate but manual, diverges from the Entra-as-source-of-truth
  posture, and duplicates identity governance.

## Decision
Adopt (1). `app_user` mirrors the Entra identity (`entra_object_id`, email, display
name) and is upserted on each sign-in; **roles derive from Entra group/app-role
claims** mapped to app permissions (Admin, Sales, Delivery/Ops, Leadership,
Read-only). Authorization is **role-based now**, with the schema ready for
**row-level (owner/team) scoping** via `owner_user_id` on accounts/opportunities/tasks.
**PII columns are flagged and access is audit-logged** (`audit_log`, `pii_access_log`).
**Agent actions inherit the acting user's permission scope** (ADR-0015).

## Security impact
Centralizes identity governance in Entra (MFA, Conditional Access, lifecycle).
Least-privilege + audit on PII access directly serve the "Mythos Proof" posture
(CLAUDE.md §5). No third-party IdP (ADR-0002).

## Cost impact
None.

## Operational impact
Define the Entra group → role mapping and keep it in config. Joiner/mover/leaver is
handled by Entra group membership. Row-level scoping rules (e.g. "sales see their
own accounts") are an open item to finalize before that data widens.

## Future considerations
Attribute-based / row-level security in Postgres; per-record sharing; delegated
admin.
