import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import { ASSESSMENT_DIMENSIONS, ASSESSMENT_RATINGS, RATING_LABEL } from "@/lib/assessment";
import type { Option } from "@/lib/data/repositories";
import type { SbrDetail, TicketRow } from "@/types";

export function SbrForm({
  action,
  sbr,
  accounts,
  contacts,
  assessments,
  tickets,
  scoreValues,
  checkedTicketIds,
}: {
  action: (formData: FormData) => void | Promise<void>;
  sbr?: SbrDetail | null;
  accounts: Option[];
  contacts: Option[];
  assessments: Option[];
  tickets: TicketRow[];
  scoreValues?: Record<string, string | null>;
  checkedTicketIds?: string[];
}) {
  const checked = new Set(checkedTicketIds ?? []);
  return (
    <form
      action={action}
      className="flex max-w-2xl flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      {sbr && <input type="hidden" name="id" value={sbr.id} />}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Account (company)">
          <Select name="accountId" defaultValue={sbr?.accountId ?? ""} required>
            <option value="" disabled>
              — Select an account —
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Performed by (contact)">
          <Select name="contactId" defaultValue={sbr?.contactId ?? ""}>
            <option value="">— None —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Review date">
          <TextInput type="date" name="reviewDate" defaultValue={sbr?.reviewDate ?? ""} required />
        </Field>
        <Field label="Period">
          <TextInput name="periodLabel" placeholder="e.g. 2026-Q3" defaultValue={sbr?.periodLabel ?? ""} />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={sbr?.status ?? "scheduled"}>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </Select>
        </Field>
      </div>

      <Field label="Benchmark against assessment">
        <Select name="benchmarkAssessmentId" defaultValue={sbr?.benchmarkAssessmentId ?? ""}>
          <option value="">— None —</option>
          {assessments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>

      <fieldset className="rounded-lg border border-border p-3">
        <legend className="px-1 text-xs text-dim">Re-benchmark — six dimensions</legend>
        <div className="grid grid-cols-2 gap-3">
          {ASSESSMENT_DIMENSIONS.map((d) => (
            <Field key={d.key} label={d.label}>
              <Select name={`score_${d.key}`} defaultValue={scoreValues?.[d.key] ?? ""}>
                <option value="">— Not scored —</option>
                {ASSESSMENT_RATINGS.map((r) => (
                  <option key={r} value={r}>
                    {RATING_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>
          ))}
        </div>
      </fieldset>

      {tickets.length > 0 && (
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-xs text-dim">Ticket history considered</legend>
          <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
            {tickets.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="ticketIds"
                  value={t.id}
                  defaultChecked={checked.has(t.id)}
                  className="h-4 w-4 rounded border-border bg-panel-2 accent-accent"
                />
                <span className="truncate">
                  <span className="text-dim">{t.account} ·</span> {t.title}
                  {t.status && <span className="text-dim"> ({t.status})</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <Field label="Concerns raised">
        <TextArea name="concerns" rows={2} defaultValue={sbr?.concerns ?? ""} />
      </Field>
      <Field label="Summary">
        <TextArea name="summary" rows={2} defaultValue={sbr?.summary ?? ""} />
      </Field>
      <Field label="Next actions">
        <TextArea name="nextActions" rows={2} defaultValue={sbr?.nextActions ?? ""} />
      </Field>

      <FormActions cancelHref="/sbr" />
    </form>
  );
}
