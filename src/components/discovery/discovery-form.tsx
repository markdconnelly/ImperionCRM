import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import { QuestionFields } from "@/components/engagements/question-fields";
import type { Option } from "@/lib/data/repositories";
import type { DiscoveryCallDetail, QuestionRow } from "@/types";

export function DiscoveryForm({
  action,
  discovery,
  accounts,
  opportunities,
  contacts,
  questions,
  answerValues,
}: {
  action: (formData: FormData) => void | Promise<void>;
  discovery?: DiscoveryCallDetail | null;
  accounts: Option[];
  opportunities: Option[];
  contacts: Option[];
  questions: QuestionRow[];
  answerValues?: Record<string, string | null>;
}) {
  return (
    <form
      action={action}
      className="flex max-w-2xl flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      {discovery && <input type="hidden" name="id" value={discovery.id} />}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Account (company)">
          <Select name="accountId" defaultValue={discovery?.accountId ?? ""} required>
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
        <Field label="Opportunity">
          <Select name="opportunityId" defaultValue={discovery?.opportunityId ?? ""}>
            <option value="">— None —</option>
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Performed by (contact)">
          <Select name="contactId" defaultValue={discovery?.contactId ?? ""}>
            <option value="">— None —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Held on">
          <TextInput type="date" name="heldAt" defaultValue={discovery?.heldAt ?? ""} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Status">
          <Select name="status" defaultValue={discovery?.status ?? "scheduled"}>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </Field>
        <Field label="Verdict">
          <Select name="verdict" defaultValue={discovery?.verdict ?? ""}>
            <option value="">— Undecided —</option>
            <option value="fit">Fit</option>
            <option value="not_fit">Not a fit</option>
            <option value="nurture">Nurture</option>
          </Select>
        </Field>
        <Field label="SBR cadence">
          <Select name="sbrCadence" defaultValue={discovery?.sbrCadence ?? ""}>
            <option value="">—</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </Select>
        </Field>
      </div>

      <Field label="Verdict reason">
        <TextInput name="verdictReason" defaultValue={discovery?.verdictReason ?? ""} />
      </Field>

      <Field label="Next step (locked)">
        <TextArea name="nextStep" rows={2} defaultValue={discovery?.nextStep ?? ""} />
      </Field>

      <fieldset className="rounded-lg border border-border p-3">
        <legend className="px-1 text-xs text-dim">Discovery captures</legend>
        <QuestionFields questions={questions} values={answerValues} />
      </fieldset>

      <FormActions cancelHref="/discovery" />
    </form>
  );
}
