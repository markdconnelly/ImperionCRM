import { Field, TextInput, Select } from "@/components/ui/form";
import Link from "next/link";

const ROWS = 5;
const COMMON_KEYS = ["employer", "role", "interest", "tech_stack", "location", "industry"];

export interface AudienceDefaults {
  name: string;
  description: string;
  kind: string;
  criteria: { key: string; value: string }[];
}

/**
 * Audience builder over the enrichment dossier (ADR-0026). Each criterion matches a
 * dossier attribute (contains). "Preview matches" shows who'd be included before you
 * commit; "Create" materializes the member set.
 */
export function AudienceForm({
  createAction,
  previewAction,
  defaults,
}: {
  createAction: (formData: FormData) => void | Promise<void>;
  previewAction: (formData: FormData) => void | Promise<void>;
  defaults?: AudienceDefaults;
}) {
  return (
    <form className="flex max-w-2xl flex-col gap-4 rounded-xl border border-border bg-panel p-5">
      <Field label="Name">
        <TextInput name="name" required defaultValue={defaults?.name ?? ""} />
      </Field>

      <Field label="Description">
        <TextInput name="description" defaultValue={defaults?.description ?? ""} />
      </Field>

      <Field label="Kind">
        <Select name="kind" defaultValue={defaults?.kind ?? "dynamic"}>
          <option value="dynamic">Dynamic (re-evaluate from criteria)</option>
          <option value="static">Static (snapshot now)</option>
        </Select>
      </Field>

      <fieldset className="rounded-lg border border-border p-3">
        <legend className="px-1 text-xs text-dim">
          Criteria over the enrichment dossier — a contact must match all of them
        </legend>
        <div className="flex flex-col gap-2">
          {Array.from({ length: ROWS }).map((_, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <TextInput
                name={`criteriaKey${i}`}
                placeholder="attribute (e.g. role)"
                list="enrichment-keys"
                defaultValue={defaults?.criteria[i]?.key ?? ""}
              />
              <TextInput
                name={`criteriaValue${i}`}
                placeholder="contains… (e.g. IT Director)"
                defaultValue={defaults?.criteria[i]?.value ?? ""}
              />
            </div>
          ))}
        </div>
        <datalist id="enrichment-keys">
          {COMMON_KEYS.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </fieldset>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          formAction={previewAction}
          className="rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-panel-2"
        >
          Preview matches
        </button>
        <button
          type="submit"
          formAction={createAction}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Create audience
        </button>
        <Link
          href="/campaigns"
          className="rounded-md border border-border px-4 py-2 text-sm text-dim hover:text-text"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
