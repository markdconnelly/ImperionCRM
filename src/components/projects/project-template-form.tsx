"use client";

import { useState } from "react";
import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import type { ProjectTypeRow } from "@/types";

/**
 * Authoring form for a project template (ADR-0070 E1, #352). The milestone/item
 * tree is too deep for flat FormData, so local React state holds the whole
 * template and a hidden `payload` input carries its JSON to the server action,
 * which parses + persists it in one transaction.
 *
 * Supports both create and IN-PLACE EDIT (#634): pass `initial` to pre-load an
 * existing template's tree and `templateId` to carry its id back to
 * `updateProjectTemplateAction` (which re-snapshots the tree). Create is the
 * no-`initial` path and is unchanged.
 */

export interface ItemDraft {
  kind: "step" | "task";
  title: string;
  offsetDays: number;
  durationDays: number;
}
export interface MilestoneDraft {
  name: string;
  offsetDays: number;
  durationDays: number;
  items: ItemDraft[];
}
export interface ProjectTemplateDraft {
  name: string;
  description: string;
  projectTypeId: string;
  milestones: MilestoneDraft[];
}

const newItem = (): ItemDraft => ({ kind: "task", title: "", offsetDays: 0, durationDays: 1 });
const newMilestone = (): MilestoneDraft => ({ name: "", offsetDays: 0, durationDays: 7, items: [] });

const numCell =
  "w-20 rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none";

export function ProjectTemplateForm({
  types,
  action,
  initial,
  templateId,
  submitLabel = "Create template",
}: {
  types: ProjectTypeRow[];
  action: (formData: FormData) => void | Promise<void>;
  /** Pre-loaded draft for in-place edit (#634); omit for create. */
  initial?: ProjectTemplateDraft;
  /** Existing template id, carried back to the update action; omit for create. */
  templateId?: string;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [projectTypeId, setProjectTypeId] = useState(initial?.projectTypeId ?? "");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(
    initial?.milestones?.length ? initial.milestones : [newMilestone()],
  );

  const patchM = (mi: number, patch: Partial<MilestoneDraft>) =>
    setMilestones((ms) => ms.map((m, i) => (i === mi ? { ...m, ...patch } : m)));
  const patchItem = (mi: number, ii: number, patch: Partial<ItemDraft>) =>
    setMilestones((ms) =>
      ms.map((m, i) =>
        i === mi ? { ...m, items: m.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) } : m,
      ),
    );

  const payload = JSON.stringify({
    name,
    description,
    projectTypeId: projectTypeId || null,
    milestones,
  });

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="payload" value={payload} />
      {templateId && <input type="hidden" name="id" value={templateId} />}

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-panel p-5 md:grid-cols-2">
        <Field label="Template name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required placeholder="Implementation" />
        </Field>
        <Field label="Applies to project type (optional)">
          <Select value={projectTypeId} onChange={(e) => setProjectTypeId(e.target.value)}>
            <option value="">Any type</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </Field>
      </div>

      {milestones.map((m, mi) => (
        <div key={mi} className="rounded-xl border border-border bg-panel p-5">
          <div className="flex items-center gap-3">
            <span className="text-xs text-dim">Milestone {mi + 1}</span>
            <input
              className="flex-1 rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm font-medium text-text focus:border-accent focus:outline-none"
              placeholder="Milestone name"
              value={m.name}
              onChange={(e) => patchM(mi, { name: e.target.value })}
            />
            <label className="flex items-center gap-1 text-xs text-dim">
              start +
              <input type="number" className={numCell} value={m.offsetDays} onChange={(e) => patchM(mi, { offsetDays: Number(e.target.value) || 0 })} />d
            </label>
            <label className="flex items-center gap-1 text-xs text-dim">
              lasts
              <input type="number" className={numCell} value={m.durationDays} onChange={(e) => patchM(mi, { durationDays: Number(e.target.value) || 0 })} />d
            </label>
            {milestones.length > 1 && (
              <button type="button" className="text-xs text-red hover:underline" onClick={() => setMilestones((ms) => ms.filter((_, i) => i !== mi))}>
                Remove
              </button>
            )}
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {m.items.map((it, ii) => (
              <li key={ii} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-panel-2 p-3">
                <select
                  className="rounded-md border border-border bg-panel px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
                  value={it.kind}
                  onChange={(e) => patchItem(mi, ii, { kind: e.target.value as "step" | "task" })}
                >
                  <option value="task">task</option>
                  <option value="step">step</option>
                </select>
                <input
                  className="min-w-40 flex-1 rounded-md border border-border bg-panel px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
                  placeholder="Item title"
                  value={it.title}
                  onChange={(e) => patchItem(mi, ii, { title: e.target.value })}
                />
                <label className="flex items-center gap-1 text-xs text-dim">
                  +<input type="number" className={numCell} value={it.offsetDays} onChange={(e) => patchItem(mi, ii, { offsetDays: Number(e.target.value) || 0 })} />d
                </label>
                <label className="flex items-center gap-1 text-xs text-dim">
                  for<input type="number" className={numCell} value={it.durationDays} onChange={(e) => patchItem(mi, ii, { durationDays: Number(e.target.value) || 0 })} />d
                </label>
                <button type="button" className="text-xs text-red hover:underline" onClick={() => patchM(mi, { items: m.items.filter((_, j) => j !== ii) })}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="mt-2 text-xs text-accent hover:underline" onClick={() => patchM(mi, { items: [...m.items, newItem()] })}>
            + Add item
          </button>
        </div>
      ))}

      <button type="button" className="self-start text-sm text-accent hover:underline" onClick={() => setMilestones((ms) => [...ms, newMilestone()])}>
        + Add milestone
      </button>

      <FormActions
        cancelHref={templateId ? `/project-templates/${templateId}` : "/project-templates"}
        submitLabel={submitLabel}
      />
    </form>
  );
}
