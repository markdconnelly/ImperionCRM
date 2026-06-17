/**
 * CRM contact-segment helpers (ADR-0073 decision 2, #420/#421).
 *
 * Pure, dependency-free, NOT server-only — safe to import from server reads, the
 * segment surface (#421), and the vitest suite alike. A `segment` is a general-purpose
 * CRM contact set (migration 0126): `type='manual'` (a static set whose members are
 * added/removed explicitly) or `type='rule'` (a dynamic set defined by a `rule_json`
 * predicate over `contact` fields, materialized into `segment_member`). It is the
 * enrollment SOURCE a marketing journey draws from, and is reusable for comms / list
 * views — explicitly DISTINCT from an ad audience (ADR-0026), which syncs out to ad
 * platforms.
 *
 * This module is the one place that understands the SHAPE of `rule_json`. The DB does
 * not constrain it (one object to author/version, like `workflow.definition`), so every
 * read flows through `parseSegmentRule`, which never throws and always returns a
 * well-formed (possibly empty) rule. The rule EVALUATOR (materializing membership) is a
 * process the backend / local-pipeline runs (ADR-0042); this is shape + a small
 * in-memory matcher the surface uses to PREVIEW a rule against already-loaded contacts.
 */

import type { ContactRow } from "@/types";

/** The fields a rule predicate may test (kept tiny + safe; matches ContactRow). */
export const SEGMENT_RULE_FIELDS = ["email", "account", "fullName", "phone"] as const;
export type SegmentRuleField = (typeof SEGMENT_RULE_FIELDS)[number];

/** The comparison operators a rule clause may use. */
export const SEGMENT_RULE_OPERATORS = ["contains", "equals", "starts_with", "is_set"] as const;
export type SegmentRuleOperator = (typeof SEGMENT_RULE_OPERATORS)[number];

/** A single predicate over one contact field. */
export interface SegmentRuleClause {
  field: SegmentRuleField;
  operator: SegmentRuleOperator;
  /** The comparison value; ignored for `is_set`. */
  value: string;
}

/**
 * A rule-segment's membership predicate. `match` is ALL (every clause must hold) or ANY
 * (at least one). An empty clause list matches nothing (a rule segment with no clauses is
 * inert, never "everyone").
 */
export interface SegmentRule {
  match: "all" | "any";
  clauses: SegmentRuleClause[];
}

/** The safe fallback for a missing / malformed rule. */
export const EMPTY_SEGMENT_RULE: SegmentRule = { match: "all", clauses: [] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asField(v: unknown): SegmentRuleField | null {
  return typeof v === "string" && (SEGMENT_RULE_FIELDS as readonly string[]).includes(v)
    ? (v as SegmentRuleField)
    : null;
}

function asOperator(v: unknown): SegmentRuleOperator | null {
  return typeof v === "string" && (SEGMENT_RULE_OPERATORS as readonly string[]).includes(v)
    ? (v as SegmentRuleOperator)
    : null;
}

function parseClause(raw: unknown): SegmentRuleClause | null {
  if (!isRecord(raw)) return null;
  const field = asField(raw.field);
  const operator = asOperator(raw.operator);
  if (!field || !operator) return null; // a clause without a known field/operator is unusable
  return {
    field,
    operator,
    value: typeof raw.value === "string" ? raw.value : "",
  };
}

/**
 * Parse an untrusted `segment.rule_json` blob into a typed rule. Never throws: a missing
 * / malformed blob returns the empty rule. Unusable clauses (unknown field/operator) are
 * dropped.
 */
export function parseSegmentRule(raw: unknown): SegmentRule {
  if (!isRecord(raw)) return EMPTY_SEGMENT_RULE;
  const match = raw.match === "any" ? "any" : "all";
  const clausesRaw = Array.isArray(raw.clauses) ? raw.clauses : [];
  const clauses = clausesRaw
    .map(parseClause)
    .filter((c): c is SegmentRuleClause => c !== null);
  return { match, clauses };
}

/** Serialize a rule for storage (round-trips through parseSegmentRule). */
export function serializeSegmentRule(rule: SegmentRule): Record<string, unknown> {
  return { match: rule.match, clauses: rule.clauses };
}

function clauseMatches(clause: SegmentRuleClause, contact: ContactRow): boolean {
  const raw = contact[clause.field];
  const field = typeof raw === "string" ? raw.toLowerCase() : "";
  const value = clause.value.trim().toLowerCase();
  switch (clause.operator) {
    case "is_set":
      return typeof raw === "string" && raw.trim().length > 0;
    case "equals":
      return field === value;
    case "starts_with":
      return value.length > 0 && field.startsWith(value);
    case "contains":
    default:
      return value.length > 0 && field.includes(value);
  }
}

/**
 * Does a contact satisfy a rule? An empty clause list matches nothing. Used by the
 * surface to PREVIEW a rule against already-loaded contacts — the authoritative
 * materialization is the backend/pipeline evaluator's job (ADR-0042).
 */
export function contactMatchesRule(rule: SegmentRule, contact: ContactRow): boolean {
  if (rule.clauses.length === 0) return false;
  return rule.match === "all"
    ? rule.clauses.every((c) => clauseMatches(c, contact))
    : rule.clauses.some((c) => clauseMatches(c, contact));
}

/** Preview: the contacts a rule would select from a candidate list. */
export function previewRuleMembers(rule: SegmentRule, contacts: readonly ContactRow[]): ContactRow[] {
  return contacts.filter((c) => contactMatchesRule(rule, c));
}
