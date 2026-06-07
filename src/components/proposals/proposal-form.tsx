import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import type { Option, ProposalEditable } from "@/lib/data/repositories";

export function ProposalForm({
  action,
  proposal,
  opportunities,
}: {
  action: (formData: FormData) => void | Promise<void>;
  proposal?: ProposalEditable | null;
  opportunities: Option[];
}) {
  return (
    <form
      action={action}
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      {proposal && <input type="hidden" name="id" value={proposal.id} />}

      <Field label="Title">
        <TextInput name="title" defaultValue={proposal?.title ?? ""} required />
      </Field>

      <Field label="Opportunity">
        <Select name="opportunityId" defaultValue={proposal?.opportunityId ?? ""} required>
          <option value="" disabled>
            — Select an opportunity —
          </option>
          {opportunities.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Status">
        <Select name="status" defaultValue={proposal?.status ?? "draft"}>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
        </Select>
      </Field>

      <Field label="Monthly value (USD)">
        <TextInput
          type="number"
          name="amountMrr"
          min="0"
          step="1"
          placeholder="e.g. 2500"
          defaultValue={proposal?.amountMrr ?? ""}
        />
      </Field>

      <Field label="Document URL">
        <TextInput
          type="url"
          name="documentUrl"
          placeholder="Link to the proposal document"
          defaultValue={proposal?.documentUrl ?? ""}
        />
      </Field>

      <Field label="Notes">
        <TextArea name="notes" rows={3} defaultValue={proposal?.notes ?? ""} />
      </Field>

      <FormActions cancelHref="/proposals" />
    </form>
  );
}
