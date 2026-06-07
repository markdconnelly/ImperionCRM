import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";

/**
 * Create an audience over the aggregated enriched profiles (ADR-0026). `definition`
 * is opaque criteria JSON for dynamic audiences (evaluated by a later engine).
 */
export function AudienceForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      <Field label="Name">
        <TextInput name="name" required />
      </Field>

      <Field label="Description">
        <TextInput name="description" placeholder="e.g. IT Directors in the Pacific NW" />
      </Field>

      <Field label="Kind">
        <Select name="kind" defaultValue="static">
          <option value="static">Static (a fixed set)</option>
          <option value="dynamic">Dynamic (criteria over enrichment)</option>
        </Select>
      </Field>

      <Field label="Definition (JSON criteria, optional)">
        <TextArea
          name="definition"
          rows={4}
          placeholder='{"role": "IT Director", "region": "PNW"}'
        />
      </Field>

      <FormActions cancelHref="/campaigns" />
    </form>
  );
}
