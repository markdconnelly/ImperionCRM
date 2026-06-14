import { Field, TextInput, Select } from "@/components/ui/form";
import type { Option } from "@/lib/data/repositories";
import type { DeliveryTemplateDetail, ProjectTypeRow } from "@/types";

/**
 * Provision-from-template entry point (ADR-0080 §4, ADR-0081 §3, #566). A lean
 * disclosure on the template detail page: pick an account, optionally a WON
 * opportunity (the won→Autotask provenance seam), a project type, and a start
 * date, then instantiate the template into a native project + provisioning/fire
 * rows. Server-rendered (no client state) — the action redirects to the new
 * project. Only mounted for `canManageProjects` users; the action re-checks
 * `delivery:write` server-side.
 */
export function ProvisionFromTemplateForm({
  template,
  action,
  accounts,
  wonOpportunities,
  types,
  defaultStartDate,
}: {
  template: DeliveryTemplateDetail;
  action: (formData: FormData) => void | Promise<void>;
  accounts: Option[];
  wonOpportunities: Option[];
  types: ProjectTypeRow[];
  /** Today (yyyy-mm-dd), used as the default project start. */
  defaultStartDate: string;
}) {
  const defaultTypeId = template.projectTypeId ?? types[0]?.id ?? "";
  return (
    <details className="group rounded-xl border border-border bg-panel p-5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-text">
        <span>Provision from this template</span>
        <span className="text-xs text-dim group-open:hidden">Expand</span>
      </summary>

      <p className="mt-2 text-xs text-dim">
        Creates a native project (milestones + tasks) and queues it for delivery. The
        backend executor stays gated until the contract is signed — nothing is written to
        Autotask here.
      </p>

      <form action={action} className="mt-4 flex max-w-lg flex-col gap-4">
        <input type="hidden" name="deliveryTemplateId" value={template.id} />

        <Field label="Account">
          <Select name="accountId" defaultValue="" required>
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

        <Field label="Project name">
          <TextInput name="name" defaultValue={template.name} required />
        </Field>

        <Field label="Won opportunity (optional)">
          <Select name="opportunityId" defaultValue="">
            <option value="">— None —</option>
            {wonOpportunities.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Project type">
          <Select name="projectTypeId" defaultValue={defaultTypeId} required>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Start date">
          <TextInput type="date" name="startDate" defaultValue={defaultStartDate} required />
        </Field>

        <div className="pt-1">
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Provision project
          </button>
        </div>
      </form>
    </details>
  );
}
