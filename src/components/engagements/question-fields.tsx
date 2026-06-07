import { Field, TextInput, TextArea, Select } from "@/components/ui/form";
import { ASSESSMENT_RATINGS, RATING_LABEL, type AssessmentRating } from "@/lib/assessment";
import type { QuestionRow } from "@/types";

/**
 * Renders a set of editable questions (ADR-0023) as form fields, one per
 * `response_type`. Field names are `q_<questionId>`; the matching server action maps
 * them back to typed answers. `values` pre-fills on edit (keyed by question id).
 * Server component — the inputs are uncontrolled with defaultValue.
 */
export function QuestionFields({
  questions,
  values,
}: {
  questions: QuestionRow[];
  values?: Record<string, string | null>;
}) {
  if (questions.length === 0) {
    return (
      <p className="text-sm text-dim">
        No active questions configured for this engagement.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q) => {
        const name = `q_${q.id}`;
        const v = values?.[q.id] ?? "";
        return (
          <Field key={q.id} label={q.required ? `${q.prompt} *` : q.prompt}>
            {renderInput(q, name, v)}
            {q.helpText && (
              <span className="mt-1 block text-[11px] text-dim">{q.helpText}</span>
            )}
          </Field>
        );
      })}
    </div>
  );
}

function renderInput(q: QuestionRow, name: string, v: string) {
  switch (q.responseType) {
    case "longtext":
      return <TextArea name={name} rows={3} defaultValue={v} />;
    case "number":
      return <TextInput type="number" name={name} step="1" defaultValue={v} />;
    case "currency":
      return <TextInput type="number" name={name} min="0" step="1" placeholder="USD" defaultValue={v} />;
    case "date":
      return <TextInput type="date" name={name} defaultValue={v} />;
    case "boolean":
      return (
        <Select name={name} defaultValue={v}>
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      );
    case "single_select":
      return (
        <Select name={name} defaultValue={v}>
          <option value="">—</option>
          {(q.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      );
    case "rating":
      return (
        <Select name={name} defaultValue={v}>
          <option value="">— Not scored —</option>
          {(q.options ?? ASSESSMENT_RATINGS).map((o) => (
            <option key={o} value={o}>
              {RATING_LABEL[o as AssessmentRating] ?? o}
            </option>
          ))}
        </Select>
      );
    case "multi_select":
      return (
        <div className="flex flex-wrap gap-3">
          {(q.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name={name}
                value={o}
                defaultChecked={parseMulti(v).includes(o)}
                className="h-4 w-4 rounded border-border bg-panel-2 accent-accent"
              />
              <span>{o.replace(/_/g, " ")}</span>
            </label>
          ))}
        </div>
      );
    case "text":
    default:
      return <TextInput name={name} defaultValue={v} />;
  }
}

/** Best-effort parse of a stored multi-select value (JSON array text). */
function parseMulti(v: string): string[] {
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
