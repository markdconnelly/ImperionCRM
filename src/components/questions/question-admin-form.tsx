import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import type { QuestionEditable } from "@/lib/data/repositories";
import type { QuestionTemplateRow } from "@/types";

const RESPONSE_TYPES = [
  "text",
  "longtext",
  "number",
  "currency",
  "boolean",
  "single_select",
  "multi_select",
  "rating",
  "date",
];

export function QuestionAdminForm({
  action,
  kind,
  question,
  templates,
  selectedTemplateIds,
}: {
  action: (formData: FormData) => void | Promise<void>;
  kind: string;
  question?: QuestionEditable | null;
  /** When provided (edit), shows the assessment-template membership selector (many-to-many, migration 0040). */
  templates?: QuestionTemplateRow[];
  selectedTemplateIds?: string[];
}) {
  const selected = new Set(selectedTemplateIds ?? []);
  return (
    <form
      action={action}
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      {question && <input type="hidden" name="id" value={question.id} />}
      <input type="hidden" name="kind" value={kind} />

      <Field label="Prompt">
        <TextInput name="prompt" defaultValue={question?.prompt ?? ""} required />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Key (stable machine name)">
          <TextInput
            name="key"
            placeholder="e.g. downtime_cost_per_day"
            defaultValue={question?.key ?? ""}
            required
          />
        </Field>
        <Field label="Response type">
          <Select name="responseType" defaultValue={question?.responseType ?? "text"}>
            {RESPONSE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Help text">
        <TextInput name="helpText" defaultValue={question?.helpText ?? ""} />
      </Field>

      <Field label="Options (one per line — for select/rating)">
        <TextArea
          name="options"
          rows={3}
          placeholder={"allocated\nflexible\nnone_yet"}
          defaultValue={question?.options?.join("\n") ?? ""}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Dimension (assessment only)">
          <TextInput
            name="dimension"
            placeholder="identity, endpoint, …"
            defaultValue={question?.dimension ?? ""}
          />
        </Field>
        <Field label="Order">
          <TextInput type="number" name="ordinal" step="1" defaultValue={String(question?.ordinal ?? 0)} />
        </Field>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="required"
            defaultChecked={question?.required ?? false}
            className="h-4 w-4 rounded border-border bg-panel-2 accent-accent"
          />
          <span>Required</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={question ? question.active : true}
            className="h-4 w-4 rounded border-border bg-panel-2 accent-accent"
          />
          <span>Active</span>
        </label>
      </div>

      {templates && templates.length > 0 && (
        <Field label="Assessments this question appears on">
          <input type="hidden" name="templates" value="1" />
          <div className="flex flex-col gap-1.5 rounded-md border border-border bg-panel-2 p-3">
            {templates.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="templateIds"
                  value={t.id}
                  defaultChecked={selected.has(t.id)}
                  className="h-4 w-4 rounded border-border bg-panel accent-accent"
                />
                <span>
                  {t.title} <span className="text-xs text-dim">({t.kind} v{t.version})</span>
                </span>
              </label>
            ))}
          </div>
        </Field>
      )}

      <FormActions cancelHref="/questions" />
    </form>
  );
}
