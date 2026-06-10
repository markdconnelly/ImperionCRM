import { Field, TextInput } from "@/components/ui/form";
import type { ProjectTypeRow } from "@/types";

/**
 * Project-type administration on the project board (ADR-0052 §1): types are
 * data, created here without a migration. Protected types (Onboarding) and
 * types in use cannot be deleted — the delete control simply isn't offered.
 */
export function ProjectTypeManager({
  types,
  createAction,
  deleteAction,
}: {
  types: ProjectTypeRow[];
  createAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <h3 className="font-display text-base font-semibold tracking-tight">Project types</h3>
      <p className="mt-0.5 text-sm text-dim">
        Types are data, not code — add one here and the board tracks it immediately.
        Onboarding is protected; a type with projects can&apos;t be deleted.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {types.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between rounded-md border border-border bg-panel-2 px-3 py-2 text-sm"
          >
            <div>
              <span className="font-medium">{t.name}</span>
              <span className="ml-2 text-xs text-dim">
                {t.projectCount} {t.projectCount === 1 ? "project" : "projects"}
                {t.isProtected && " · protected"}
              </span>
              {t.description && <p className="mt-0.5 text-xs text-dim">{t.description}</p>}
            </div>
            {!t.isProtected && t.projectCount === 0 && (
              <form action={deleteAction}>
                <input type="hidden" name="id" value={t.id} />
                <button type="submit" className="text-xs text-dim hover:text-red">
                  Delete
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <form action={createAction} className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Field label="New type name">
              <TextInput name="name" placeholder="e.g. M365 migration" required />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Description (optional)">
              <TextInput name="description" placeholder="What this kind of project delivers" />
            </Field>
          </div>
        </div>
        <button
          type="submit"
          className="self-start rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
        >
          + Add type
        </button>
      </form>
    </div>
  );
}
