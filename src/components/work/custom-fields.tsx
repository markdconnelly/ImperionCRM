import { getRepositories } from "@/lib/data";
import { saveCustomFieldValuesAction } from "@/app/(app)/custom-fields/value-actions";
import {
  customFieldInputName,
  formatCustomFieldValue,
  isSelectType,
} from "@/lib/custom-fields";
import type { CustomFieldParentType, CustomFieldValue } from "@/types";
import type { Option } from "@/lib/data/repositories";

/**
 * Custom-field values on a work object (ADR-0065 B4, #614) — the read/consume
 * surface over the schema + admin authoring #338 shipped.
 *
 * Polymorphic by (parentType, parentId): the same panel drops onto the task and
 * project edit forms, same shape as {@link Attachments}. It resolves the applicable
 * fields via `customFields.listValuesFor(parentType, parentId, projectTypeId)` —
 * the LEFT JOIN means every applicable field appears, unanswered ones as null — and
 * writes through one `saveCustomFieldValuesAction` submit behind `delivery:write`.
 *
 * Honest degradation (#614): when no field is defined for the object, the panel
 * renders nothing (not a fabricated placeholder). An unanswered field shows a dash
 * in read-only mode. Inputs render per `field_type`; required fields (B4-F3) are
 * marked and enforced server-side.
 */
export async function CustomFields({
  parentType,
  parentId,
  projectTypeId,
  canManage,
}: {
  parentType: CustomFieldParentType;
  parentId: string;
  /** The project's type for value scoping; null for a task (task fields are never type-scoped). */
  projectTypeId: string | null;
  /** Whether the viewer may edit (gated on `delivery:write` by the caller). */
  canManage: boolean;
}) {
  const { customFields, crm } = getRepositories();
  const fields = await customFields.listValuesFor(parentType, parentId, projectTypeId);

  // No applicable fields → render nothing (honest degradation, #614).
  if (fields.length === 0) return null;

  // Only fetch the user list when a user-type field is present (it drives that picker).
  const needsUsers = fields.some((f) => f.fieldType === "user");
  const users = needsUsers ? await crm.userOptions() : [];

  return (
    <section className="max-w-lg rounded-xl border border-border bg-panel p-5">
      <div>
        <h3 className="font-display text-sm font-semibold tracking-tight">Custom fields</h3>
        <p className="mt-0.5 text-xs text-dim">
          Admin-defined fields on this {parentType} (ADR-0065 B4).
        </p>
      </div>

      {canManage ? (
        <form action={saveCustomFieldValuesAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="parentType" value={parentType} />
          <input type="hidden" name="parentId" value={parentId} />
          {fields.map((f) => (
            <div key={f.fieldId} className="flex flex-col gap-1">
              {/* Definition shipped with each field so the action parses + enforces without a re-read. */}
              <input type="hidden" name="fieldIds" value={f.fieldId} />
              <input type="hidden" name={`type_${f.fieldId}`} value={f.fieldType} />
              <input type="hidden" name={`required_${f.fieldId}`} value={f.required ? "1" : ""} />
              <label
                htmlFor={customFieldInputName(f.fieldId)}
                className="text-xs font-medium text-dim"
              >
                {f.label}
                {f.required && <span className="ml-1 text-red">*</span>}
              </label>
              <CustomFieldInput field={f} users={users} />
            </div>
          ))}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Save fields
            </button>
          </div>
        </form>
      ) : (
        <dl className="mt-3 flex flex-col gap-2">
          {fields.map((f) => (
            <div key={f.fieldId} className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-dim">{f.label}</dt>
              <dd className="text-sm text-text">
                {formatCustomFieldValue(f.value, f.fieldType, users)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

const INPUT_CLASS =
  "rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent";

/** The editable input for one custom field, keyed by its `field_type` (B4-F1). */
function CustomFieldInput({ field, users }: { field: CustomFieldValue; users: readonly Option[] }) {
  const name = customFieldInputName(field.fieldId);
  const id = name;
  const v = field.value;

  switch (field.fieldType) {
    case "checkbox":
      return (
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={v === true}
          className="h-4 w-4 self-start accent-accent"
        />
      );
    case "number":
    case "currency":
      return (
        <input
          id={id}
          name={name}
          type="number"
          step="any"
          defaultValue={typeof v === "number" ? v : v != null ? String(v) : ""}
          className={INPUT_CLASS}
        />
      );
    case "date":
      return (
        <input
          id={id}
          name={name}
          type="date"
          defaultValue={typeof v === "string" ? v : ""}
          className={INPUT_CLASS}
        />
      );
    case "single_select":
      return (
        <select id={id} name={name} defaultValue={typeof v === "string" ? v : ""} className={INPUT_CLASS}>
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "multi_select": {
      const selected = Array.isArray(v) ? v : [];
      return (
        <select id={id} name={name} multiple defaultValue={selected} className={`${INPUT_CLASS} h-24`}>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    case "user":
      return (
        <select id={id} name={name} defaultValue={typeof v === "string" ? v : ""} className={INPUT_CLASS}>
          <option value="">—</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      );
    default:
      return (
        <input
          id={id}
          name={name}
          type="text"
          defaultValue={typeof v === "string" ? v : v != null && !isSelectType(field.fieldType) ? String(v) : ""}
          className={INPUT_CLASS}
        />
      );
  }
}
