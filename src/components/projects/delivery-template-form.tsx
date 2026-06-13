"use client";

import { useState } from "react";
import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import type { ProjectTypeRow } from "@/types";

/**
 * Authoring form for a delivery template (ADR-0081, #453). The tree is too deep
 * for flat FormData, so local React state holds the whole template and a hidden
 * `payload` input carries its JSON to `createDeliveryTemplateAction`, which
 * parses + persists it in one transaction. Edit is delete+recreate in v1, so
 * this form only creates.
 */

interface TaskDraft {
  title: string;
  offsetDays: number;
  durationDays: number;
  dispatchesTicket: boolean;
  ticketQueueId: string; // kept as string for the input; coerced server-side
  ticketTitle: string;
  ticketLeadDays: number;
}
interface PhaseDraft {
  name: string;
  offsetDays: number;
  durationDays: number;
  tasks: TaskDraft[];
}

const newTask = (): TaskDraft => ({
  title: "",
  offsetDays: 0,
  durationDays: 1,
  dispatchesTicket: false,
  ticketQueueId: "",
  ticketTitle: "",
  ticketLeadDays: 0,
});
const newPhase = (): PhaseDraft => ({ name: "", offsetDays: 0, durationDays: 7, tasks: [newTask()] });

const numCell =
  "w-20 rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none";

export function DeliveryTemplateForm({
  types,
  action,
}: {
  types: ProjectTypeRow[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState(1);
  const [projectTypeId, setProjectTypeId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [phases, setPhases] = useState<PhaseDraft[]>([newPhase()]);

  // Mutate a phase / a task immutably by index.
  const patchPhase = (pi: number, patch: Partial<PhaseDraft>) =>
    setPhases((ps) => ps.map((p, i) => (i === pi ? { ...p, ...patch } : p)));
  const patchTask = (pi: number, ti: number, patch: Partial<TaskDraft>) =>
    setPhases((ps) =>
      ps.map((p, i) =>
        i === pi ? { ...p, tasks: p.tasks.map((t, j) => (j === ti ? { ...t, ...patch } : t)) } : p,
      ),
    );

  const payload = JSON.stringify({
    name,
    description,
    version,
    projectTypeId: projectTypeId || null,
    isActive,
    phases: phases.map((p) => ({
      name: p.name,
      offsetDays: p.offsetDays,
      durationDays: p.durationDays,
      tasks: p.tasks.map((t) => ({
        title: t.title,
        offsetDays: t.offsetDays,
        durationDays: t.durationDays,
        dispatchesTicket: t.dispatchesTicket,
        ticketQueueId: t.ticketQueueId === "" ? null : Number(t.ticketQueueId),
        ticketTitle: t.ticketTitle,
        ticketLeadDays: t.ticketLeadDays,
      })),
    })),
  });

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="payload" value={payload} />

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-panel p-5 md:grid-cols-2">
        <Field label="Template name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required placeholder="Standard Network Refresh" />
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
        <div className="flex items-end gap-4">
          <Field label="Version">
            <TextInput
              type="number"
              min={1}
              value={version}
              onChange={(e) => setVersion(Number(e.target.value) || 1)}
            />
          </Field>
          <label className="flex items-center gap-2 pb-2 text-sm text-dim">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        </div>
      </div>

      {phases.map((phase, pi) => (
        <div key={pi} className="rounded-xl border border-border bg-panel p-5">
          <div className="flex items-center gap-3">
            <span className="text-xs text-dim">Phase {pi + 1}</span>
            <input
              className="flex-1 rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm font-medium text-text focus:border-accent focus:outline-none"
              placeholder="Phase name"
              value={phase.name}
              onChange={(e) => patchPhase(pi, { name: e.target.value })}
            />
            <label className="flex items-center gap-1 text-xs text-dim">
              start +
              <input type="number" className={numCell} value={phase.offsetDays} onChange={(e) => patchPhase(pi, { offsetDays: Number(e.target.value) || 0 })} />d
            </label>
            <label className="flex items-center gap-1 text-xs text-dim">
              lasts
              <input type="number" className={numCell} value={phase.durationDays} onChange={(e) => patchPhase(pi, { durationDays: Number(e.target.value) || 0 })} />d
            </label>
            {phases.length > 1 && (
              <button type="button" className="text-xs text-red hover:underline" onClick={() => setPhases((ps) => ps.filter((_, i) => i !== pi))}>
                Remove phase
              </button>
            )}
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {phase.tasks.map((task, ti) => (
              <li key={ti} className="rounded-lg border border-border bg-panel-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="min-w-40 flex-1 rounded-md border border-border bg-panel px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
                    placeholder="Task title"
                    value={task.title}
                    onChange={(e) => patchTask(pi, ti, { title: e.target.value })}
                  />
                  <label className="flex items-center gap-1 text-xs text-dim">
                    +<input type="number" className={numCell} value={task.offsetDays} onChange={(e) => patchTask(pi, ti, { offsetDays: Number(e.target.value) || 0 })} />d
                  </label>
                  <label className="flex items-center gap-1 text-xs text-dim">
                    for<input type="number" className={numCell} value={task.durationDays} onChange={(e) => patchTask(pi, ti, { durationDays: Number(e.target.value) || 0 })} />d
                  </label>
                  <label className="flex items-center gap-1 text-xs text-dim">
                    <input type="checkbox" checked={task.dispatchesTicket} onChange={(e) => patchTask(pi, ti, { dispatchesTicket: e.target.checked })} />
                    dispatches ticket
                  </label>
                  {phase.tasks.length > 1 && (
                    <button type="button" className="text-xs text-red hover:underline" onClick={() => patchPhase(pi, { tasks: phase.tasks.filter((_, j) => j !== ti) })}>
                      ✕
                    </button>
                  )}
                </div>
                {task.dispatchesTicket && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-1">
                    <label className="flex items-center gap-1 text-xs text-dim">
                      queue id
                      <input type="number" className={`${numCell} w-28`} placeholder="29683483" value={task.ticketQueueId} onChange={(e) => patchTask(pi, ti, { ticketQueueId: e.target.value })} />
                    </label>
                    <input
                      className="min-w-40 flex-1 rounded-md border border-border bg-panel px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
                      placeholder="Ticket title (defaults to task title)"
                      value={task.ticketTitle}
                      onChange={(e) => patchTask(pi, ti, { ticketTitle: e.target.value })}
                    />
                    <label className="flex items-center gap-1 text-xs text-dim">
                      fire<input type="number" className={numCell} value={task.ticketLeadDays} onChange={(e) => patchTask(pi, ti, { ticketLeadDays: Number(e.target.value) || 0 })} />d before
                    </label>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className="mt-2 text-xs text-accent hover:underline" onClick={() => patchPhase(pi, { tasks: [...phase.tasks, newTask()] })}>
            + Add task
          </button>
        </div>
      ))}

      <button type="button" className="self-start text-sm text-accent hover:underline" onClick={() => setPhases((ps) => [...ps, newPhase()])}>
        + Add phase
      </button>

      <FormActions cancelHref="/projects/templates" />
    </form>
  );
}
