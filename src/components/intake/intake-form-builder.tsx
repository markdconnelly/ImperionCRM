"use client";

import { useState } from "react";
import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import type { ProjectRow } from "@/types";

/**
 * Authoring form for an intake form (ADR-0070 E3, #354). The field list is too
 * structured for flat FormData, so local React state holds the whole definition and
 * a hidden `payload` input carries its JSON to createIntakeFormAction, which parses
 * + persists it. Edit is delete+recreate in v1, so this form only creates.
 *
 * Each field declares where its answer lands on the created task (`mapsTo`): the
 * task title, its detail, an appended note line, or the due date.
 */

type FieldType = "text" | "textarea" | "date" | "select";
type FieldMap = "title" | "detail" | "due_at" | "note";

interface FieldDraft {
  label: string;
  type: FieldType;
  required: boolean;
  mapsTo: FieldMap;
  options: string; // comma-separated; only used for `select`
}

const newField = (mapsTo: FieldMap = "note"): FieldDraft => ({
  label: "",
  type: "text",
  required: false,
  mapsTo,
  options: "",
});

const cell =
  "rounded-md border border-border bg-panel px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none";

export function IntakeFormBuilder({
  projects,
  action,
}: {
  projects: ProjectRow[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultProjectId, setDefaultProjectId] = useState("");
  const [defaultCategory, setDefaultCategory] = useState("general");
  // Seed with a title field so a new form is valid by default.
  const [fields, setFields] = useState<FieldDraft[]>([
    { ...newField("title"), label: "Summary" },
  ]);

  const patch = (i: number, p: Partial<FieldDraft>) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...p } : f)));

  const payload = JSON.stringify({
    name,
    description,
    defaultProjectId: defaultProjectId || null,
    defaultCategory,
    isActive: true,
    fields: fields.map((f) => ({
      key: f.label, // server slugifies label→key when key is absent
      label: f.label,
      type: f.type,
      required: f.required,
      mapsTo: f.mapsTo,
      options: f.type === "select" ? f.options.split(",").map((s) => s.trim()).filter(Boolean) : [],
    })),
  });

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="payload" value={payload} />

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-panel p-5 md:grid-cols-2">
        <Field label="Form name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required placeholder="New client request" />
        </Field>
        <Field label="Files into project (optional)">
          <Select value={defaultProjectId} onChange={(e) => setDefaultProjectId(e.target.value)}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.account}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </Field>
        <Field label="Queue (task category)">
          <Select value={defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)}>
            <option value="general">General</option>
            <option value="project">Project</option>
            <option value="onboarding">Onboarding</option>
            <option value="sales">Sales</option>
          </Select>
        </Field>
      </div>

      <div className="rounded-xl border border-border bg-panel p-5">
        <p className="mb-3 text-xs text-dim">
          Fields. Each field&apos;s answer lands where you map it on the created task. At least one field
          must map to the title.
        </p>
        <ul className="flex flex-col gap-2">
          {fields.map((f, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-panel-2 p-3">
              <input
                className={`min-w-40 flex-1 ${cell}`}
                placeholder="Field label"
                value={f.label}
                onChange={(e) => patch(i, { label: e.target.value })}
              />
              <select className={cell} value={f.type} onChange={(e) => patch(i, { type: e.target.value as FieldType })}>
                <option value="text">text</option>
                <option value="textarea">long text</option>
                <option value="date">date</option>
                <option value="select">choice</option>
              </select>
              <label className="flex items-center gap-1 text-xs text-dim">
                maps to
                <select className={cell} value={f.mapsTo} onChange={(e) => patch(i, { mapsTo: e.target.value as FieldMap })}>
                  <option value="title">title</option>
                  <option value="detail">detail</option>
                  <option value="note">note</option>
                  <option value="due_at">due date</option>
                </select>
              </label>
              <label className="flex items-center gap-1 text-xs text-dim">
                <input type="checkbox" checked={f.required} onChange={(e) => patch(i, { required: e.target.checked })} />
                required
              </label>
              {f.type === "select" && (
                <input
                  className={`min-w-40 flex-1 ${cell}`}
                  placeholder="Choices, comma-separated"
                  value={f.options}
                  onChange={(e) => patch(i, { options: e.target.value })}
                />
              )}
              {fields.length > 1 && (
                <button type="button" className="text-xs text-red hover:underline" onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}>
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
        <button type="button" className="mt-3 text-xs text-accent hover:underline" onClick={() => setFields((fs) => [...fs, newField()])}>
          + Add field
        </button>
      </div>

      <FormActions cancelHref="/intake" />
    </form>
  );
}
