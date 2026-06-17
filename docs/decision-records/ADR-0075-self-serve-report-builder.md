---
adr: 0075
title: "Self-serve report builder — governed semantic model over the BI hub"
status: accepted
date: 2026-06-12
repo: frontend
summary: "A governed semantic model is the only query surface."
tags: [reporting]
---
# ADR-0075: Self-serve report builder — governed semantic model over the BI hub

| Field | Value |
|---|---|
| **Repo** | frontend (semantic model, schema, builder GUI, render) |
| **Status** | Accepted (2026-06-12, merged to main; scope locked with Mark) |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0062 (reporting BI hub), ADR-0021 (reporting read model + Recharts), ADR-0046 (saved list views), ADR-0030/0016 (RBAC), ADR-0042 (division of labor — direct reads for rendering allowed) |
| **Epic** | #321 · Parent #314 |

## Problem

The BI hub `/reporting` (ADR-0062) renders **developer-defined** reports on a curated read model with Recharts (ADR-0021). End users cannot build their own — pick an object, choose fields/filters/grouping, choose a viz, save, share. Every major CRM ships a drag-drop report/dashboard builder; it is the difference between a fixed dashboard and a tool people explore.

## Context

- **Direct DB reads for rendering are allowed (ADR-0042)** — reporting does not need the backend.
- **RBAC is enforced server-side already (ADR-0030/0016)** — e.g. revenue is blanked for Support. A user-built query must inherit those grants, not route around them.
- **Saved-views already exist (ADR-0046)** — a persisted user-defined view with filters. Report definitions are the same idea generalised to fields + grouping + viz; reuse that pattern rather than invent persistence.
- **This is PRODUCTION data with client PII.** A self-serve query surface is a data-exfiltration risk if it exposes raw tables or arbitrary SQL.

## Options considered

- **A. Raw SQL / arbitrary query builder.** Maximum power; unacceptable risk — arbitrary joins over PII, RBAC bypass, query-cost blowups on prod. Rejected.
- **B. Governed semantic model — whitelisted objects/fields, RBAC-scoped, no raw SQL (chosen).** Users build reports against a declared set of reportable objects and fields; the builder emits a constrained, parameterised query the system controls. Safe, RBAC-honouring, still genuinely self-serve.
- **C. Embed a third-party BI tool (Metabase/Power BI embed).** Fast, but another system holding prod PII + its own auth/RBAC to reconcile with ours, and it sits outside the app. Rejected for v1 (revisit only via ADR if B proves insufficient).

## Decision

1. **A governed semantic model is the only query surface.** A declarative registry names the **reportable objects** (account, contact, opportunity, ticket-silver, campaign, etc.) and, per object, the **reportable fields**, their types, allowed aggregations, and **the RBAC grant each requires**. The builder can only reference what the registry exposes; there is no raw-SQL path.

2. **RBAC enforced at build *and* run (ADR-0030/0016).** A field a user lacks the grant for is not selectable and is stripped server-side at execution — same posture as `canSeeRevenue`. No report can surface data its author could not already see.

3. **Report definition = generalised saved view (ADR-0046).** `report_definition` persists object + fields + filters + grouping + viz; `dashboard` composes report definitions. Reuse the saved-views sharing/ownership model rather than a new one.

4. **Render through the existing surface (ADR-0021).** v1 outputs: tabular + the standard Recharts chart types over the curated read model. **No arbitrary cross-object joins** in v1 — a report is rooted on one object with declared, pre-modelled relations only.

5. **Query-cost guardrails.** Row/time limits and required filters on large objects; the read model, not ad-hoc table scans, backs reports. Expensive shapes are blocked or sampled with a visible notice (no silent truncation).

**Table sketch (migration number at implementation):**

```sql
report_definition (
  id, owner_user_id fk, name,
  root_object text,                 -- must exist in the semantic registry
  fields jsonb,                     -- selected fields + aggregations (registry-validated)
  filters jsonb, group_by jsonb, viz text,
  visibility text check (visibility in ('private','shared')), ...  -- reuse ADR-0046 model
)
dashboard ( id, owner_user_id fk, name, layout jsonb, visibility text, ... )
dashboard_item ( id, dashboard_id fk, report_definition_id fk, position jsonb, ... )
-- the semantic registry (reportable objects/fields + required grants) lives in code, versioned.
```

## Consequences

- Users get real self-serve reporting without a raw-SQL or RBAC-bypass risk on prod PII.
- The semantic registry is a new maintenance surface — adding a reportable field is a small, reviewable code change (and a natural pairing with self-service config, the v2 item in #314).
- Pairs with, but does not require, the deferred self-service-config epic.

## Future considerations

- Limited cross-object reporting via pre-modelled relations once the single-root model proves out.
- Scheduled report delivery / export.
- Embedded third-party BI (option C) only if the governed model proves insufficient — would need an ADR.
