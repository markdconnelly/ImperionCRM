# Reporting semantic model (governance layer)

The governed semantic model is the **only query surface** for the self-serve report
builder (ADR-0075 decision §1). It lives in code at
[`src/lib/reporting/semantic-model.ts`](../../src/lib/reporting/semantic-model.ts),
versioned with the app — there is **no raw-SQL path**. The builder (#411) and the
report persistence/executor (#410) can only reference what this registry declares.

The design rationale (why a governed model, not raw SQL or an embedded BI tool) is
in [ADR-0075](../decision-records/ADR-0075-self-serve-report-builder.md). This note
covers the registry's shape and how to extend it; the ADR is normative.

## What the registry declares

- **Reportable objects** — v1 core: `account`, `contact`, `opportunity`, `ticket`
  (silver), `campaign`. Each has a stable `key` (persisted as
  `report_definition.root_object`), a label, a description, and its reportable fields.
- **Reportable fields** — each field has a stable `key`, label, `type`
  (`string | number | currency | date | enum | boolean`), the `aggregations` the
  builder may offer (`none | count | sum | avg | min | max`), and a `grant`.
- **Per-object guardrail** (optional `guardrail`, #413) — query-cost metadata the runner
  reads via `objectGuardrail(key)`: `maxDetailRows` (detail-row cap, default 1000) and
  `requiresFilter` (a detail report on a high-cardinality object — currently `contact`,
  `ticket` — must carry a filter, else it is blocked). Bounds *cost*, not *access* — see
  [report-builder.md](report-builder.md) → Query-cost guardrails.

## RBAC — enforced at build AND run (ADR-0075 §2)

A field's `grant` is the RBAC requirement to select/see it, or `null` (broadly
readable, the common case). Each grant names an **existing** `roles.ts` predicate —
the registry does **not** invent a new posture:

| Grant | Predicate | Applies to |
|---|---|---|
| `revenue` | `canSeeRevenue` (hidden from support-only) | money/MRR/budget/spend/deal value |
| `labor_cost` | `canSeeLaborCost` (finance \| admin) | pay-derived / comp-sensitive figures |

- **Build time:** `reportableFields(objectKey, roles)` excludes fields the caller
  lacks the grant for — they are never offered in the builder.
- **Run time:** `validateReportSelection(selection, roles)` strips any forbidden
  field from a selection (same posture as `redactMoney`). No report can surface data
  its author could not already see.

## Helper API (pure, edge-safe)

`semantic-model.ts` imports only `roles.ts` — no `pg`, no `node:*` — so it unit-tests
directly and imports anywhere:

- `listReportableObjects(roles)` — objects the caller may report on.
- `reportableFields(objectKey, roles)` — RBAC-filtered selectable fields.
- `isFieldAllowed(objectKey, fieldKey, roles)` — per-field access check.
- `allowedAggregations(objectKey, fieldKey)` — declared aggregations for a field.
- `validateReportSelection({ root_object, fields, group_by }, roles)` — the
  build+run seam: returns the RBAC-stripped, registry-validated selection plus an
  itemised list of rejections (nothing is silently swallowed).

## How to add a reportable field

1. Append a `ReportableField` to the object's `fields` array in
   `semantic-model.ts` (or add a new `ReportableObject` for a new root).
2. Pick a `type` and sensible `aggregations` (`NUMERIC_AGGS` / `DATE_AGGS` /
   `DIMENSION_AGGS` helpers cover the common cases).
3. **If the field is money, comp-derived, or otherwise PII-ish, set a `grant`** so
   it cannot reach a user who can't already see it. Default to `null` only for
   broadly readable fields.
4. Add/extend a test in `semantic-model.test.ts` (object/field validation +, for a
   gated field, that a role lacking the grant cannot select it).

This is a small, reviewable code change — no migration, no schema change.
