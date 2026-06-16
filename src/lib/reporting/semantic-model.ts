/**
 * Governed semantic model — the reportable objects/fields registry (ADR-0075).
 *
 * ADR-0075 chose a **governed semantic model as the ONLY query surface** for the
 * self-serve report builder (decision §1): there is no raw-SQL path; the builder
 * (#411) and the persistence/executor (#410) can only reference what this registry
 * declares. This module IS that registry, in code, versioned — per the ADR's table
 * sketch note: "the semantic registry (reportable objects/fields + required grants)
 * lives in code, versioned."
 *
 * RBAC is enforced at BUILD **and** RUN (decision §2) with the SAME posture as
 * `canSeeRevenue` (ADR-0030): a field a user lacks the grant for is not selectable
 * (build) and is stripped from any selection (run). No report can surface data its
 * author could not already see. We never invent a new RBAC posture here — each
 * gated field names a `FieldGrant` whose predicate is exactly an existing
 * `roles.ts` capability (`canSeeRevenue` / `canSeeLaborCost`).
 *
 * PURE / edge-safe: imports only `roles.ts` (no pg, no node:*, no env), so it can be
 * unit-tested directly and imported from edge, server, or client alike — mirroring
 * the `policy.ts` convention.
 */
import type { AppRole } from "@/lib/auth/roles";
import { canSeeRevenue, canSeeLaborCost } from "@/lib/auth/roles";

/** Scalar type of a reportable field — drives sensible aggregation + the builder's UI affordances. */
export type FieldType = "string" | "number" | "currency" | "date" | "enum" | "boolean";

/** An aggregation a field may be rolled up by. `none` = the raw value (group/select only). */
export type Aggregation = "none" | "count" | "sum" | "avg" | "min" | "max";

/**
 * The RBAC grant a reportable field requires, beyond "authenticated". Each grant
 * names an EXISTING `roles.ts` predicate — the registry does not define new RBAC,
 * it reuses the posture already enforced server-side (ADR-0030/0075 §2). `null`
 * (the common case) = broadly readable.
 */
export type FieldGrant = "revenue" | "labor_cost";

/** grant → the existing capability predicate that decides it (no new posture). */
const GRANT_PREDICATE: Record<FieldGrant, (roles: readonly AppRole[] | undefined) => boolean> = {
  // Money/MRR/spend: hidden from a support-only user, exactly like rendered revenue.
  revenue: canSeeRevenue,
  // Pay-derived / comp-sensitive figures: finance | admin only.
  labor_cost: canSeeLaborCost,
};

/** A single reportable field on an object. */
export interface ReportableField {
  /** Stable key the builder/executor reference (never renamed without a migration of saved defs). */
  key: string;
  /** Human label for the builder UI. */
  label: string;
  type: FieldType;
  /** Aggregations the builder may offer for this field (always includes `none`). */
  aggregations: readonly Aggregation[];
  /**
   * RBAC grant required to select/see this field, or `null` if broadly readable.
   * A user lacking the grant cannot select it (build) and has it stripped (run).
   */
  grant: FieldGrant | null;
}

/** A reportable object (one root the builder can root a report on). */
export interface ReportableObject {
  /** Stable root_object key — persisted in `report_definition.root_object` (#410). */
  key: string;
  /** Human label for the builder UI. */
  label: string;
  /** Short description of the read surface this object reports over. */
  description: string;
  fields: readonly ReportableField[];
}

/** Aggregations that make sense for a numeric/currency measure. */
const NUMERIC_AGGS: readonly Aggregation[] = ["none", "count", "sum", "avg", "min", "max"];
/** Aggregations for a date dimension. */
const DATE_AGGS: readonly Aggregation[] = ["none", "count", "min", "max"];
/** Aggregations for a categorical/identity dimension (countable, not summable). */
const DIMENSION_AGGS: readonly Aggregation[] = ["none", "count"];

/**
 * THE REGISTRY. v1 core per ADR-0075 §1: account, contact, opportunity, ticket
 * (silver), campaign. Fields mirror the existing read shapes in `src/types`
 * (Account / ContactRow / OpportunityForecastRow / TicketRow / CampaignRow).
 *
 * Money fields carry `grant: "revenue"`; comp-derived figures carry
 * `grant: "labor_cost"`. Everything else is broadly readable (`grant: null`).
 *
 * Adding a reportable field = append a `ReportableField` here (and gate it if it is
 * money/comp/PII-ish). See docs/reporting/semantic-model.md.
 */
export const SEMANTIC_MODEL: readonly ReportableObject[] = [
  {
    key: "account",
    label: "Account",
    description: "Silver account (client) records — the managed-services customer master.",
    fields: [
      { key: "name", label: "Account name", type: "string", aggregations: DIMENSION_AGGS, grant: null },
      { key: "stage", label: "Pipeline stage", type: "enum", aggregations: DIMENSION_AGGS, grant: null },
      { key: "owner", label: "Owner", type: "string", aggregations: DIMENSION_AGGS, grant: null },
      { key: "health", label: "Health", type: "enum", aggregations: DIMENSION_AGGS, grant: null },
      // Money — hidden from support-only, exactly like rendered MRR (ADR-0030).
      { key: "mrr", label: "MRR", type: "currency", aggregations: NUMERIC_AGGS, grant: "revenue" },
    ],
  },
  {
    key: "contact",
    label: "Contact",
    description: "Silver contact records joined to their account.",
    fields: [
      { key: "fullName", label: "Full name", type: "string", aggregations: DIMENSION_AGGS, grant: null },
      { key: "email", label: "Email", type: "string", aggregations: DIMENSION_AGGS, grant: null },
      { key: "phone", label: "Phone", type: "string", aggregations: DIMENSION_AGGS, grant: null },
      { key: "account", label: "Account", type: "string", aggregations: DIMENSION_AGGS, grant: null },
    ],
  },
  {
    key: "opportunity",
    label: "Opportunity",
    description: "Silver opportunity / deal records with forecast fields (ADR-0072).",
    fields: [
      { key: "name", label: "Opportunity name", type: "string", aggregations: DIMENSION_AGGS, grant: null },
      { key: "account", label: "Account", type: "string", aggregations: DIMENSION_AGGS, grant: null },
      { key: "stage", label: "Sales stage", type: "enum", aggregations: DIMENSION_AGGS, grant: null },
      { key: "forecastCategory", label: "Forecast category", type: "enum", aggregations: DIMENSION_AGGS, grant: null },
      { key: "expectedCloseDate", label: "Expected close date", type: "date", aggregations: DATE_AGGS, grant: null },
      { key: "winProbability", label: "Win probability", type: "number", aggregations: NUMERIC_AGGS, grant: null },
      // Money — deal value (MRR) and weighted value are revenue-gated.
      { key: "dealValue", label: "Deal value (MRR)", type: "currency", aggregations: NUMERIC_AGGS, grant: "revenue" },
      { key: "weighted", label: "Weighted value", type: "currency", aggregations: NUMERIC_AGGS, grant: "revenue" },
    ],
  },
  {
    key: "ticket",
    label: "Ticket",
    description: "Silver ticket records (service desk) joined to their account.",
    fields: [
      { key: "number", label: "Ticket number", type: "string", aggregations: DIMENSION_AGGS, grant: null },
      { key: "title", label: "Title", type: "string", aggregations: DIMENSION_AGGS, grant: null },
      { key: "account", label: "Account", type: "string", aggregations: DIMENSION_AGGS, grant: null },
      { key: "status", label: "Status", type: "enum", aggregations: DIMENSION_AGGS, grant: null },
      { key: "priority", label: "Priority", type: "enum", aggregations: DIMENSION_AGGS, grant: null },
      { key: "opened", label: "Opened date", type: "date", aggregations: DATE_AGGS, grant: null },
    ],
  },
  {
    key: "campaign",
    label: "Campaign",
    description: "Marketing campaign records with rolled-up performance metrics.",
    fields: [
      { key: "name", label: "Campaign name", type: "string", aggregations: DIMENSION_AGGS, grant: null },
      { key: "platform", label: "Platform", type: "enum", aggregations: DIMENSION_AGGS, grant: null },
      { key: "status", label: "Status", type: "enum", aggregations: DIMENSION_AGGS, grant: null },
      { key: "leads", label: "Leads", type: "number", aggregations: NUMERIC_AGGS, grant: null },
      // Money — budget and spend are revenue-gated.
      { key: "budget", label: "Budget", type: "currency", aggregations: NUMERIC_AGGS, grant: "revenue" },
      { key: "spend", label: "Spend", type: "currency", aggregations: NUMERIC_AGGS, grant: "revenue" },
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// Pure, edge-safe helper API. The builder (#411) and persistence/executor (#410)
// enforce against these — there is no other query surface (ADR-0075 §1).
// ---------------------------------------------------------------------------

const OBJECT_BY_KEY: ReadonlyMap<string, ReportableObject> = new Map(
  SEMANTIC_MODEL.map((o) => [o.key, o]),
);

/** Whether the given roles satisfy a field's grant (`null` grant is always satisfied). */
function hasGrant(grant: FieldGrant | null, roles: readonly AppRole[] | undefined): boolean {
  if (grant === null) return true;
  return GRANT_PREDICATE[grant](roles);
}

/** The object's definition, or `undefined` if it is not in the registry. */
export function getReportableObject(objectKey: string): ReportableObject | undefined {
  return OBJECT_BY_KEY.get(objectKey);
}

/**
 * Objects the caller may report on. v1: every object has at least one broadly
 * readable field, so the list is role-independent — but we keep the `roles`
 * parameter so a future fully-gated object filters out without an API change.
 */
export function listReportableObjects(roles: readonly AppRole[] | undefined): ReportableObject[] {
  return SEMANTIC_MODEL.filter((o) => reportableFields(o.key, roles).length > 0);
}

/**
 * The fields of `objectKey` the caller may select — RBAC-filtered. Fields whose
 * grant the caller lacks are EXCLUDED (the build-time enforcement, ADR-0075 §2).
 * Unknown object → `[]`.
 */
export function reportableFields(
  objectKey: string,
  roles: readonly AppRole[] | undefined,
): ReportableField[] {
  const obj = OBJECT_BY_KEY.get(objectKey);
  if (!obj) return [];
  return obj.fields.filter((f) => hasGrant(f.grant, roles));
}

/**
 * Whether `fieldKey` on `objectKey` is selectable by the caller — object is in the
 * registry, field exists on it, and the caller satisfies its grant. The atomic
 * check the run-time strip (#410/#411) calls per selected field.
 */
export function isFieldAllowed(
  objectKey: string,
  fieldKey: string,
  roles: readonly AppRole[] | undefined,
): boolean {
  const obj = OBJECT_BY_KEY.get(objectKey);
  const field = obj?.fields.find((f) => f.key === fieldKey);
  if (!field) return false;
  return hasGrant(field.grant, roles);
}

/**
 * The aggregations declared for `objectKey.fieldKey`, or `[]` if the object/field is
 * not in the registry. RBAC-independent (a field's allowed aggregations do not depend
 * on the caller) — pair with `isFieldAllowed` for the access check.
 */
export function allowedAggregations(objectKey: string, fieldKey: string): readonly Aggregation[] {
  const obj = OBJECT_BY_KEY.get(objectKey);
  const field = obj?.fields.find((f) => f.key === fieldKey);
  return field ? field.aggregations : [];
}

/** A field reference inside a report selection: a field key + the aggregation to apply. */
export interface SelectedField {
  field: string;
  aggregation: Aggregation;
}

/** A report selection as the builder/executor hands it in (ADR-0075 §1 — registry-validated). */
export interface ReportSelection {
  root_object: string;
  fields: readonly SelectedField[];
  group_by?: readonly string[];
}

/** Why a selection (or part of it) was rejected — surfaced so the builder can explain. */
export interface SelectionRejection {
  kind: "unknown_object" | "unknown_field" | "forbidden_field" | "invalid_aggregation" | "unknown_group_by";
  detail: string;
}

/** The result of validating a report selection against the registry + caller RBAC. */
export interface ValidatedSelection {
  ok: boolean;
  /** The RBAC-stripped, registry-validated selection (safe to persist/execute). */
  selection: ReportSelection | null;
  /** Everything that was dropped or rejected — never silently swallowed. */
  rejections: readonly SelectionRejection[];
}

/**
 * Validate + RBAC-strip a report selection — THE seam the builder (#411) and
 * executor (#410) enforce against (ADR-0075 §1/§2). Guarantees of the returned
 * `selection`:
 *   - `root_object` exists in the registry (else ok=false, selection=null).
 *   - every field exists on that object AND the caller satisfies its grant
 *     (fields they lack the grant for are STRIPPED, not an error — same posture as
 *     `redactMoney`: the report simply cannot reference data its author can't see).
 *   - every field's aggregation is one the registry declares for it.
 *   - every group_by references a field that survived the same checks.
 * There is no raw-SQL path: anything not expressible against the registry is dropped.
 */
export function validateReportSelection(
  selection: ReportSelection,
  roles: readonly AppRole[] | undefined,
): ValidatedSelection {
  const rejections: SelectionRejection[] = [];
  const obj = OBJECT_BY_KEY.get(selection.root_object);
  if (!obj) {
    return {
      ok: false,
      selection: null,
      rejections: [
        { kind: "unknown_object", detail: `root_object "${selection.root_object}" is not in the semantic registry` },
      ],
    };
  }

  const keptFields: SelectedField[] = [];
  const keptFieldKeys = new Set<string>();
  for (const sel of selection.fields) {
    const field = obj.fields.find((f) => f.key === sel.field);
    if (!field) {
      rejections.push({ kind: "unknown_field", detail: `field "${sel.field}" is not on object "${obj.key}"` });
      continue;
    }
    if (!hasGrant(field.grant, roles)) {
      // STRIP — author lacks the grant; the report may not reference it.
      rejections.push({ kind: "forbidden_field", detail: `field "${sel.field}" requires a grant the caller lacks` });
      continue;
    }
    if (!field.aggregations.includes(sel.aggregation)) {
      rejections.push({
        kind: "invalid_aggregation",
        detail: `aggregation "${sel.aggregation}" is not allowed on "${obj.key}.${sel.field}"`,
      });
      continue;
    }
    keptFields.push({ field: sel.field, aggregation: sel.aggregation });
    keptFieldKeys.add(sel.field);
  }

  const keptGroupBy: string[] = [];
  for (const g of selection.group_by ?? []) {
    if (keptFieldKeys.has(g)) {
      keptGroupBy.push(g);
    } else {
      rejections.push({
        kind: "unknown_group_by",
        detail: `group_by "${g}" must reference a selected, allowed field on "${obj.key}"`,
      });
    }
  }

  return {
    ok: rejections.length === 0,
    selection: {
      root_object: obj.key,
      fields: keptFields,
      ...(keptGroupBy.length ? { group_by: keptGroupBy } : {}),
    },
    rejections,
  };
}
