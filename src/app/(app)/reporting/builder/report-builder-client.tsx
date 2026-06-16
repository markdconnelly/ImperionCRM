"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  Aggregation,
  ReportableObject,
  ReportSelection,
  SelectedField,
} from "@/lib/reporting/semantic-model";
import type { ReportFilter, ReportResult, FilterOp } from "@/lib/reporting/report-runner";
import type { BuilderPayload } from "@/lib/reporting/builder-types";
import type { ReportVisibility } from "@/types";
import { ReportResultView } from "@/components/reporting/report-result-view";
import { createReportAction, updateReportAction, previewReportAction } from "./actions";

/** The persisted shape the edit page hydrates from. */
export interface BuilderInitial {
  id: string;
  name: string;
  visibility: ReportVisibility;
  viz: string;
  selection: ReportSelection;
  filters: ReportFilter[];
}

const VIZ_OPTIONS = ["table", "bar", "line"] as const;
const FILTER_OPS: { value: FilterOp; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "contains", label: "contains" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
];

const inputCls =
  "rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none";

/**
 * The interactive report builder (ADR-0075 §1/§4, #411): pick a root object → select
 * fields + aggregations → group → filter → choose a viz → preview → save. The `objects`
 * prop is ALREADY RBAC-filtered server-side (build-time enforcement, ADR-0075 §2), so a
 * field the caller can't see is never offered here; the save/preview actions re-validate
 * and strip server-side (run-time enforcement).
 */
export function ReportBuilderClient({
  objects,
  initial,
}: {
  objects: ReportableObject[];
  initial?: BuilderInitial;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [visibility, setVisibility] = useState<ReportVisibility>(initial?.visibility ?? "private");
  const [viz, setViz] = useState<string>(initial?.viz ?? "table");
  const [rootObject, setRootObject] = useState<string>(
    initial?.selection.root_object ?? objects[0]?.key ?? "",
  );
  const [selected, setSelected] = useState<SelectedField[]>(
    initial ? [...initial.selection.fields] : [],
  );
  const [groupBy, setGroupBy] = useState<string[]>(
    initial?.selection.group_by ? [...initial.selection.group_by] : [],
  );
  const [filters, setFilters] = useState<ReportFilter[]>(initial?.filters ?? []);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewing, startPreview] = useTransition();
  const [saving, startSave] = useTransition();

  const obj = useMemo(() => objects.find((o) => o.key === rootObject), [objects, rootObject]);
  const selectedKeys = useMemo(() => new Set(selected.map((s) => s.field)), [selected]);

  function changeObject(key: string) {
    setRootObject(key);
    setSelected([]);
    setGroupBy([]);
    setFilters([]);
    setResult(null);
  }

  function toggleField(fieldKey: string) {
    setResult(null);
    setSelected((prev) =>
      prev.some((s) => s.field === fieldKey)
        ? prev.filter((s) => s.field !== fieldKey)
        : [...prev, { field: fieldKey, aggregation: "none" }],
    );
    setGroupBy((prev) => prev.filter((g) => g !== fieldKey || selectedKeys.has(g)));
  }

  function setAggregation(fieldKey: string, aggregation: Aggregation) {
    setResult(null);
    setSelected((prev) => prev.map((s) => (s.field === fieldKey ? { ...s, aggregation } : s)));
  }

  function toggleGroupBy(fieldKey: string) {
    setResult(null);
    setGroupBy((prev) =>
      prev.includes(fieldKey) ? prev.filter((g) => g !== fieldKey) : [...prev, fieldKey],
    );
  }

  function buildPayload(): BuilderPayload {
    return {
      name,
      visibility,
      viz,
      selection: {
        root_object: rootObject,
        fields: selected,
        ...(groupBy.length ? { group_by: groupBy } : {}),
      },
      filters,
    };
  }

  function onPreview() {
    setError(null);
    startPreview(async () => {
      const res = await previewReportAction(buildPayload());
      if (!res) {
        setError("Select at least one field to preview.");
        setResult(null);
        return;
      }
      setResult(res);
    });
  }

  function onSave() {
    setError(null);
    if (!name.trim()) {
      setError("Give the report a name before saving.");
      return;
    }
    if (selected.length === 0) {
      setError("Select at least one field before saving.");
      return;
    }
    startSave(async () => {
      try {
        if (initial) await updateReportAction(initial.id, buildPayload());
        else await createReportAction(buildPayload());
        // The action redirects; refresh as a fallback if it returns.
        router.push("/reporting/builder");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save the report.");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
      {/* ── Builder controls ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-panel p-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-dim">Report name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Open pipeline by stage"
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-dim">Report on</span>
          <select value={rootObject} onChange={(e) => changeObject(e.target.value)} className={inputCls}>
            {objects.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {obj && <span className="text-[11px] text-dim">{obj.description}</span>}
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] text-dim">Fields</span>
          {obj?.fields.map((f) => {
            const sel = selected.find((s) => s.field === f.key);
            return (
              <div key={f.key} className="rounded-md border border-border/60 bg-panel-2 p-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!sel}
                    onChange={() => toggleField(f.key)}
                    className="accent-accent"
                  />
                  <span className="flex-1">{f.label}</span>
                  <span className="text-[10px] uppercase text-dim">{f.type}</span>
                </label>
                {sel && (
                  <div className="mt-2 flex items-center gap-2 pl-6">
                    <select
                      value={sel.aggregation}
                      onChange={(e) => setAggregation(f.key, e.target.value as Aggregation)}
                      className={`${inputCls} py-1 text-xs`}
                    >
                      {f.aggregations.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-[11px] text-dim">
                      <input
                        type="checkbox"
                        checked={groupBy.includes(f.key)}
                        onChange={() => toggleGroupBy(f.key)}
                        className="accent-accent-2"
                      />
                      group
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Filters on selected fields */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] text-dim">Filters</span>
          {filters.map((f, i) => (
            <div key={i} className="flex items-center gap-1">
              <select
                value={f.field}
                onChange={(e) =>
                  setFilters((prev) => prev.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)))
                }
                className={`${inputCls} py-1 text-xs`}
              >
                {selected.map((s) => (
                  <option key={s.field} value={s.field}>
                    {obj?.fields.find((ff) => ff.key === s.field)?.label ?? s.field}
                  </option>
                ))}
              </select>
              <select
                value={f.op}
                onChange={(e) =>
                  setFilters((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, op: e.target.value as FilterOp } : x)),
                  )
                }
                className={`${inputCls} py-1 text-xs`}
              >
                {FILTER_OPS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                value={f.value}
                onChange={(e) =>
                  setFilters((prev) => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                }
                placeholder="value"
                className={`${inputCls} w-20 py-1 text-xs`}
              />
              <button
                type="button"
                onClick={() => setFilters((prev) => prev.filter((_, j) => j !== i))}
                className="text-xs text-dim hover:text-red"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() =>
              setFilters((prev) => [...prev, { field: selected[0].field, op: "contains", value: "" }])
            }
            className="self-start text-xs text-accent disabled:text-dim"
          >
            + Add filter
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] text-dim">Visualize</span>
            <select value={viz} onChange={(e) => setViz(e.target.value)} className={inputCls}>
              {VIZ_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] text-dim">Visibility</span>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ReportVisibility)}
              className={inputCls}
            >
              <option value="private">private</option>
              <option value="shared">shared</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPreview}
            disabled={previewing || selected.length === 0}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-panel-2 disabled:opacity-50"
          >
            {previewing ? "Running…" : "Run preview"}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : initial ? "Save changes" : "Save report"}
          </button>
        </div>
        {error && <p className="text-xs text-red">{error}</p>}
      </div>

      {/* ── Live preview ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {result ? (
          <ReportResultView result={result} viz={viz} />
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-panel/50 p-10 text-center text-sm text-dim">
            Pick fields and run a preview to see the report.
          </p>
        )}
      </div>
    </div>
  );
}
