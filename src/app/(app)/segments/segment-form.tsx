"use client";

import { useState } from "react";
import { SEGMENT_RULE_FIELDS, SEGMENT_RULE_OPERATORS, parseSegmentRule } from "@/lib/segment";
import type { SegmentDetail, SegmentType } from "@/types";

const inputCls =
  "rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none";

interface ClauseDraft {
  field: string;
  operator: string;
  value: string;
}

/**
 * Segment create/edit form (#421). A plain server-action <form> with progressively-
 * revealed rule clauses: choosing "rule" shows the predicate editor (match all/any + a
 * list of field/operator/value clauses), which post as parallel `clauseField` /
 * `clauseOperator` / `clauseValue` arrays the action re-assembles. Choosing "manual"
 * hides the rule editor (members are added explicitly on the detail page). The submit is
 * the passed-in server action; for edit, a hidden `id` is included by the caller.
 */
export function SegmentForm({
  action,
  initial,
  submitLabel,
  hiddenId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial?: SegmentDetail;
  submitLabel: string;
  /** When set, posted as `id` so an edit action targets this segment. */
  hiddenId?: string;
}) {
  const [type, setType] = useState<SegmentType>(initial?.type ?? "manual");
  const initialRule = parseSegmentRule(initial?.ruleJson ?? null);
  const [match, setMatch] = useState<"all" | "any">(initialRule.match);
  const [clauses, setClauses] = useState<ClauseDraft[]>(
    initialRule.clauses.length > 0
      ? initialRule.clauses.map((c) => ({ ...c }))
      : [{ field: "email", operator: "contains", value: "" }],
  );

  function updateClause(i: number, patch: Partial<ClauseDraft>) {
    setClauses((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      {hiddenId && <input type="hidden" name="id" value={hiddenId} />}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-dim">Name</span>
        <input name="name" defaultValue={initial?.name ?? ""} required className={inputCls} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-dim">Description</span>
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={2}
          className={inputCls}
        />
      </label>

      <fieldset className="flex flex-col gap-1 text-sm">
        <span className="text-dim">Type</span>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="type"
              value="manual"
              checked={type === "manual"}
              onChange={() => setType("manual")}
            />
            <span>Manual — add contacts explicitly</span>
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="type"
              value="rule"
              checked={type === "rule"}
              onChange={() => setType("rule")}
            />
            <span>Rule — match contact fields</span>
          </label>
        </div>
      </fieldset>

      {type === "rule" && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-panel p-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-dim">Match</span>
            <select
              name="match"
              value={match}
              onChange={(e) => setMatch(e.target.value === "any" ? "any" : "all")}
              className={inputCls}
            >
              <option value="all">all clauses (AND)</option>
              <option value="any">any clause (OR)</option>
            </select>
          </div>

          {clauses.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                name="clauseField"
                value={c.field}
                onChange={(e) => updateClause(i, { field: e.target.value })}
                className={inputCls}
              >
                {SEGMENT_RULE_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <select
                name="clauseOperator"
                value={c.operator}
                onChange={(e) => updateClause(i, { operator: e.target.value })}
                className={inputCls}
              >
                {SEGMENT_RULE_OPERATORS.map((o) => (
                  <option key={o} value={o}>
                    {o.replace("_", " ")}
                  </option>
                ))}
              </select>
              <input
                name="clauseValue"
                value={c.value}
                onChange={(e) => updateClause(i, { value: e.target.value })}
                placeholder={c.operator === "is_set" ? "(no value)" : "value"}
                disabled={c.operator === "is_set"}
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={() => setClauses((cs) => cs.filter((_, idx) => idx !== i))}
                className="text-xs text-dim transition-colors hover:text-red"
                aria-label="Remove clause"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setClauses((cs) => [...cs, { field: "email", operator: "contains", value: "" }])
            }
            className="self-start text-xs text-accent transition-colors hover:underline"
          >
            + Add clause
          </button>
          <p className="text-xs text-dim">
            Rule segments are previewed/materialized on the detail page. The authoritative
            recompute runs in the pipeline.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
