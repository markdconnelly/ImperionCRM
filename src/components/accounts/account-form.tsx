import { Field, TextInput, Select, FormActions } from "@/components/ui/form";
import type { AccountEditable } from "@/lib/data/repositories";

export function AccountForm({
  action,
  account,
}: {
  action: (formData: FormData) => void | Promise<void>;
  account?: AccountEditable | null;
}) {
  return (
    <form
      action={action}
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      {account && <input type="hidden" name="id" value={account.id} />}

      <Field label="Name">
        <TextInput name="name" defaultValue={account?.name ?? ""} required />
      </Field>

      <Field label="Relationship">
        <Select name="relationship" defaultValue={account?.relationship ?? ""}>
          <option value="">— Unknown —</option>
          <option value="prospect">Prospect</option>
          <option value="customer">Customer</option>
          <option value="partner">Partner</option>
        </Select>
      </Field>

      <Field label="Lifecycle stage">
        <Select
          name="lifecycleStage"
          defaultValue={account?.lifecycleStage ?? "prospect"}
        >
          <option value="prospect">Prospect</option>
          <option value="onboarding">Onboarding</option>
          <option value="implementation">Implementation</option>
          <option value="operational_readiness">Operational readiness</option>
          <option value="managed_active">Managed / Active</option>
          <option value="dormant">Dormant</option>
        </Select>
      </Field>

      <Field label="Status">
        <Select
          name="isActive"
          defaultValue={account?.isActive === false ? "false" : "true"}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </Field>

      <FormActions cancelHref="/accounts" />
    </form>
  );
}
