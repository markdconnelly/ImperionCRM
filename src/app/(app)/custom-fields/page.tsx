import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/policy";
import type { CustomFieldDef, CustomFieldType, ProjectTypeRow } from "@/types";
import {
  createFieldDefAction,
  updateFieldDefAction,
  deleteFieldDefAction,
} from "./actions";

/** The B4 field-type vocabulary (ADR-0065) rendered in the type pickers. */
const FIELD_TYPES: CustomFieldType[] = [
  "text",
  "number",
  "date",
  "single_select",
  "multi_select",
  "checkbox",
  "user",
  "currency",
];

const SELECT_TYPES: CustomFieldType[] = ["single_select", "multi_select"];
const input =
  "rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim";

/** Human label for a field type ("single_select" → "single select"). */
function typeLabel(t: string): string {
  return t.replace(/_/g, " ");
}

function ProjectTypeOptions({ types }: { types: ProjectTypeRow[] }) {
  return (
    <>
      <option value="">All projects (any type)</option>
      {types.map((pt) => (
        <option key={pt.id} value={pt.id}>
          {pt.name}
        </option>
      ))}
    </>
  );
}

function TypeOptions() {
  return (
    <>
      {FIELD_TYPES.map((t) => (
        <option key={t} value={t}>
          {typeLabel(t)}
        </option>
      ))}
    </>
  );
}

/** One existing definition with an inline edit + delete form (admin only). */
function DefRow({ def, types, canEdit }: { def: CustomFieldDef; types: ProjectTypeRow[]; canEdit: boolean }) {
  const scopeLabel =
    def.scope === "project"
      ? `Project · ${def.projectTypeName ?? "all types"}`
      : "Task";
  return (
    <tr className="border-t border-border align-top hover:bg-panel-2">
      <td className="px-4 py-2.5 text-dim">{def.ordinal}</td>
      <td className="px-4 py-2.5">
        <div className="font-medium">{def.label}</div>
        <div className="text-[11px] text-dim">{def.key}</div>
      </td>
      <td className="px-4 py-2.5 text-dim">{typeLabel(def.fieldType)}</td>
      <td className="px-4 py-2.5 text-dim">{scopeLabel}</td>
      <td className="px-4 py-2.5 text-xs">
        {def.required ? <span className="text-amber">required</span> : <span className="text-dim">optional</span>}
        {SELECT_TYPES.includes(def.fieldType) && (
          <div className="mt-1 text-[11px] text-dim">{def.options.join(", ") || "no options"}</div>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        {canEdit ? (
          <details>
            <summary className="cursor-pointer text-dim hover:text-text">Edit</summary>
            <form action={updateFieldDefAction} className="mt-2 flex flex-col gap-2 text-left">
              <input type="hidden" name="id" value={def.id} />
              <div className="flex flex-wrap gap-2">
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Scope
                  <select name="scope" defaultValue={def.scope} className={input}>
                    <option value="project">project</option>
                    <option value="task">task</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Project type
                  <select name="projectTypeId" defaultValue={def.projectTypeId ?? ""} className={input}>
                    <ProjectTypeOptions types={types} />
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Type
                  <select name="fieldType" defaultValue={def.fieldType} className={input}>
                    <TypeOptions />
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Order
                  <input name="ordinal" type="number" defaultValue={def.ordinal} className={`${input} w-16`} />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Label
                  <input name="label" defaultValue={def.label} className={input} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Key
                  <input name="key" defaultValue={def.key} className={input} />
                </label>
                <label className="mt-5 flex items-center gap-1.5 text-xs text-dim">
                  <input name="required" type="checkbox" defaultChecked={def.required} /> Required
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs text-dim">
                Options (one per line — select types only)
                <textarea name="options" rows={2} defaultValue={def.options.join("\n")} className={input} />
              </label>
              <button type="submit" className="self-start rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90">
                Save changes
              </button>
            </form>
          </details>
        ) : (
          <span className="text-dim">—</span>
        )}
      </td>
      <td className="px-2 py-2.5 text-right">
        {canEdit && (
          <form action={deleteFieldDefAction}>
            <input type="hidden" name="id" value={def.id} />
            <button type="submit" className="text-dim hover:text-red">
              Delete
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}

export default async function CustomFieldsPage() {
  const { customFields, crm } = getRepositories();
  const [defs, types, roles] = await Promise.all([
    customFields.listFieldDefs(),
    crm.listProjectTypes(),
    getSessionRoles(),
  ]);
  // Configuration is admin-permissioned (ADR-0065 security impact). Non-admins can
  // view the catalog but the create/edit/delete controls are hidden; the server
  // actions also fail closed via requireCapability("catalog:write").
  const canEdit = can(roles, "catalog:write");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Custom fields"
        description="Admin-definable fields on tasks and projects (ADR-0065 B4). A project field can be scoped to a single project type so it appears only there; fields are filterable and sortable in reporting."
      />

      {canEdit && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-sm font-semibold tracking-tight">Add a field</h2>
          <div className="rounded-lg border border-border bg-panel p-4">
            <form action={createFieldDefAction} className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Scope
                  <select name="scope" defaultValue="project" className={input}>
                    <option value="project">project</option>
                    <option value="task">task</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Project type
                  <select name="projectTypeId" defaultValue="" className={input}>
                    <ProjectTypeOptions types={types} />
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Type
                  <select name="fieldType" defaultValue="text" className={input}>
                    <TypeOptions />
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Order
                  <input name="ordinal" type="number" defaultValue={0} className={`${input} w-16`} />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex flex-1 flex-col gap-1 text-xs text-dim">
                  Label
                  <input name="label" required placeholder="e.g. Risk level" className={input} />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-xs text-dim">
                  Key
                  <input name="key" required placeholder="e.g. risk_level" className={input} />
                </label>
                <label className="mt-5 flex items-center gap-1.5 text-xs text-dim">
                  <input name="required" type="checkbox" /> Required
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs text-dim">
                Options (one per line — for single/multi select)
                <textarea name="options" rows={3} placeholder={"Low\nMedium\nHigh"} className={input} />
              </label>
              <button type="submit" className="self-start rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90">
                Create field
              </button>
            </form>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-sm font-semibold tracking-tight">Defined fields</h2>
        <div className="rounded-lg border border-border bg-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-dim">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Field</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Scope</th>
                  <th className="px-4 py-2 font-medium">Flags</th>
                  <th className="px-4 py-2 font-medium" />
                  <th className="px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {defs.map((d) => (
                  <DefRow key={d.id} def={d} types={types} canEdit={canEdit} />
                ))}
                {defs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-dim">
                      No custom fields defined yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
