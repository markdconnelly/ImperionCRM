import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import type { QuestionEditable } from "@/lib/data/repositories";

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
}: {
  action: (formData: FormData) => void | Promise<void>;
  kind: string;
  question?: QuestionEditable | null;
}) {
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

      <FormActions cancelHref="/questions" />
    </form>
  );
}
