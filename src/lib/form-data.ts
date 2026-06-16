/**
 * The form-data grammar (#189) — the ONE place form-field coercion lives.
 *
 * Eight server-action files used to privately re-implement these helpers
 * (`str`/`orNull`/`answerFor` verbatim in assessments + discovery; drifting
 * `orNull` variants in contacts/campaigns; inline copies elsewhere). Actions
 * now shrink to guard → parse → repo call, and new builder forms (#109–#112)
 * inherit the grammar instead of adding copies.
 *
 * Conventions (all values trimmed; empty string means "not provided"):
 * - text inputs/selects     → `str` (required) / `strOrNull` (optional) / `strOr` (defaulted)
 * - checkboxes              → `checkbox` (`"on"` → true)
 * - multi-value fields      → `strList` (drops empties)
 * - numbers                 → `intOr` (NaN-safe fallback)
 * - indexed key/value rows  → `indexedPairs` (`key0`/`value0` … `key{n-1}`/`value{n-1}`)
 * - engagement answers      → `parseAnswer` + `hasAnswerValue` (the five
 *   response-type cases for the discovery/assessment question catalog)
 *
 * Pure functions, no I/O — unit-tested in form-data.test.ts.
 */

import type { AnswerInput } from "@/lib/data/repositories";
import type { QuestionRow } from "@/types";

/** Required text field: always a trimmed string ("" when absent). */
export function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Coerce an already-extracted value: trimmed string, or null when empty/absent. */
export function orNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/** Optional text field: trimmed string, or null when empty/absent. */
export function strOrNull(formData: FormData, key: string): string | null {
  return orNull(formData.get(key));
}

/** Defaulted text field (status/kind selects): trimmed string, or `fallback` when empty/absent. */
export function strOr(formData: FormData, key: string, fallback: string): string {
  return str(formData, key) || fallback;
}

/** Checkbox: true iff the field posted "on". */
export function checkbox(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

/** Multi-value field (`<select multiple>`, checkbox groups): all non-empty values. */
export function strList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map(String)
    .filter((s) => s !== "");
}

/** Integer field: parsed number, or `fallback` when absent/not finite. */
export function intOr(formData: FormData, key: string, fallback: number): number {
  const n = Number(str(formData, key));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Optional integer field: parsed number, or null when absent/blank/not finite.
 * Unlike `intOr` an empty input means "not set" (e.g. a WIP limit left blank),
 * never a coerced 0.
 */
export function intOrNull(formData: FormData, key: string): number | null {
  const s = str(formData, key);
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Indexed key/value rows (`${keyField}0`/`${valueField}0` … up to `rows`):
 * keeps only rows where BOTH sides are non-empty.
 */
export function indexedPairs(
  formData: FormData,
  keyField: string,
  valueField: string,
  rows: number,
): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  for (let i = 0; i < rows; i++) {
    const key = str(formData, `${keyField}${i}`);
    const value = str(formData, `${valueField}${i}`);
    if (key && value) out.push({ key, value });
  }
  return out;
}

/**
 * Map a question's posted `q_<id>` field to a typed engagement answer — the five
 * response-type cases (number/currency, boolean, date, multi_select, text) used by
 * the discovery + assessment questionnaires (ADR-0022/0027).
 */
export function parseAnswer(
  q: QuestionRow,
  formData: FormData,
  answeredByContactId: string | null = null,
): AnswerInput {
  const name = `q_${q.id}`;
  const a: AnswerInput = {
    questionId: q.id,
    valueText: null,
    valueNumber: null,
    valueBool: null,
    valueJson: null,
    valueDate: null,
    answeredByContactId,
  };
  switch (q.responseType) {
    case "number":
    case "currency":
      a.valueNumber = strOrNull(formData, name);
      break;
    case "boolean": {
      const s = str(formData, name);
      a.valueBool = s === "" ? null : s === "true";
      break;
    }
    case "date":
      a.valueDate = strOrNull(formData, name);
      break;
    case "multi_select": {
      const all = strList(formData, name);
      a.valueJson = all.length > 0 ? all : null;
      break;
    }
    default:
      a.valueText = strOrNull(formData, name);
  }
  return a;
}

/** True when the answer carries any value (empty answers are dropped, not saved). */
export function hasAnswerValue(a: AnswerInput): boolean {
  return (
    a.valueText != null ||
    a.valueNumber != null ||
    a.valueBool != null ||
    a.valueJson != null ||
    a.valueDate != null
  );
}
