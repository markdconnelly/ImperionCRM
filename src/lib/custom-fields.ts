/**
 * Custom-field value helpers (ADR-0065 B4, #614) — the ONE place a custom field's
 * jsonb value is turned into a display string or parsed back out of a form, keyed
 * by its `fieldType`. Pure functions, no I/O — unit-tested in custom-fields.test.ts.
 *
 * This is the READ/CONSUME side of B4 (#338 shipped the schema + admin authoring):
 * the panel that renders + edits values on the task / project edit forms parses
 * input through {@link parseCustomFieldFormValue} and renders through
 * {@link formatCustomFieldValue}, and the same display helper feeds a future
 * list/board column.
 */
import type { CustomFieldType, CustomFieldValue } from "@/types";
import type { Option } from "@/lib/data/repositories";

/** True for the select types, which carry an `options` choice list. */
export function isSelectType(t: CustomFieldType): boolean {
  return t === "single_select" || t === "multi_select";
}

/** True if a value counts as "answered" for required-field enforcement (B4-F3). */
export function hasCustomFieldValue(value: CustomFieldValue["value"]): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim() !== "";
  return true; // number 0 / boolean false are still answers
}

/**
 * Render a decoded custom-field value as a human display string, keyed by type.
 * `users` resolves a `user`-type id to a name (falls back to the raw id). An
 * unanswered field (and a `user`/`select` value whose target was archived) degrades
 * to a dash, never a fabricated placeholder (#614 honest-degradation rule).
 */
export function formatCustomFieldValue(
  value: CustomFieldValue["value"],
  fieldType: CustomFieldType,
  users: readonly Option[] = [],
): string {
  if (!hasCustomFieldValue(value)) return "—";
  switch (fieldType) {
    case "checkbox":
      return value ? "Yes" : "No";
    case "multi_select":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "user": {
      const id = String(value);
      return users.find((u) => u.id === id)?.name ?? id;
    }
    case "currency": {
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n)
        ? n.toLocaleString(undefined, { style: "currency", currency: "USD" })
        : String(value);
    }
    default:
      return String(value);
  }
}

/**
 * Parse a custom field's posted form value into the typed jsonb the data layer
 * stores, keyed by `fieldType`. An empty/absent input decodes to null (which
 * {@link CustomFieldsRepository.setValue} treats as "clear the field"). The raw
 * form accessor is passed in so this stays a pure function (no FormData import):
 * `single(name)` returns the single value, `multi(name)` the multi-select array.
 */
export function parseCustomFieldFormValue(
  fieldType: CustomFieldType,
  single: (name: string) => string,
  multi: (name: string) => string[],
  name: string,
): CustomFieldValue["value"] {
  switch (fieldType) {
    case "checkbox":
      return single(name) === "on";
    case "number":
    case "currency": {
      const raw = single(name).trim();
      if (raw === "") return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    case "multi_select": {
      const arr = multi(name).filter((s) => s.trim() !== "");
      return arr.length > 0 ? arr : null;
    }
    default: {
      const raw = single(name).trim();
      return raw === "" ? null : raw;
    }
  }
}

/** The form field name a custom field's input posts under (stable, key-addressed). */
export function customFieldInputName(fieldId: string): string {
  return `cf_${fieldId}`;
}

/**
 * A custom-field filter encoded for the URL (ADR-0065 B4-F2, #714): `<key>:<value>`.
 * The list/board `?cf=` param and the saved-views snapshot ride on this — saved
 * views capture the whole query string (#344), so encoding the filter in the URL is
 * what makes a custom-field filter saveable, with no new storage. `key` is the
 * field's stable machine key (no colon allowed in a key — the migration uses
 * snake_case handles); everything after the FIRST colon is the value, so values may
 * contain colons.
 */
export interface CustomFieldFilterToken {
  key: string;
  value: string;
}

/** Encode a `{key, value}` filter as the `key:value` URL token. */
export function encodeCustomFieldFilter(key: string, value: string): string {
  return `${key}:${value}`;
}

/**
 * Decode a `key:value` URL token into a filter, or null if malformed/empty. Splits
 * on the first colon so a value containing colons survives; an empty key or value
 * decodes to null (honest degradation — a bad token is simply ignored).
 */
export function parseCustomFieldFilter(
  raw: string | undefined | null,
): CustomFieldFilterToken | null {
  if (!raw) return null;
  const i = raw.indexOf(":");
  if (i <= 0) return null;
  const key = raw.slice(0, i).trim();
  const value = raw.slice(i + 1).trim();
  if (key === "" || value === "") return null;
  return { key, value };
}
