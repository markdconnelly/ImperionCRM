"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  JourneyBranchCondition,
  JourneyDefinition,
  JourneyStep,
  JourneyStepKind,
} from "@/types";
import {
  JOURNEY_BRANCH_CONDITIONS,
  JOURNEY_STEP_KINDS,
  describeStep,
  newJourneyStep,
  nextStepKey,
  validateJourneyDefinition,
} from "@/lib/journey";
import { saveJourneyAction } from "@/app/(app)/journeys/actions";

// The journey builder (ADR-0073, #399). Authors the SINGLE journey object — the
// ordered steps (send / wait / branch / score / exit), reorder, per-step config, and
// A/B variants on a send — and serialises the whole `definition` into a hidden field
// the server action re-parses and persists onto the workflow row. There are NO
// journey_step child tables: this edits one in-memory object then saves it whole.
//
// Downstream not-yet-built pieces degrade HONESTLY, never faked:
//  - Segment targeting (#420/#421) has no schema yet, so the enrollment source is a
//    disabled, clearly-labelled empty state (the journey still saves; it just can't
//    enrol until segments land).
//  - Composer template pickers are free-text template ids until a template index is
//    wired — flagged as such, not a fake dropdown of real templates.

const inputClass =
  "w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none";

const STEP_TONE: Record<string, string> = {
  send: "text-accent",
  wait: "text-dim",
  branch: "text-accent-2",
  score: "text-green",
  exit: "text-dim",
};

type Props = {
  journeyId: string;
  initialName: string;
  initialStatus: string;
  initialDefinition: JourneyDefinition;
};

export function JourneyBuilder({
  journeyId,
  initialName,
  initialStatus,
  initialDefinition,
}: Props) {
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState(initialStatus);
  const [steps, setSteps] = useState<JourneyStep[]>(initialDefinition.steps);
  const [sourceSegmentIds] = useState<string[]>(initialDefinition.sourceSegmentIds);

  const stepKeys = useMemo(() => steps.map((s) => s.key), [steps]);

  // Entry is the first step (the read model + runtime default), kept honest as steps move.
  const definition: JourneyDefinition = useMemo(
    () => ({
      steps,
      entryStepKey: steps[0]?.key ?? null,
      sourceSegmentIds,
    }),
    [steps, sourceSegmentIds],
  );

  const problems = useMemo(() => validateJourneyDefinition(definition), [definition]);

  function updateStep(key: string, patch: Partial<JourneyStep>) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function addStep(kind: JourneyStepKind) {
    setSteps((prev) => [...prev, newJourneyStep(kind, nextStepKey({ ...definition, steps: prev }))]);
  }

  function removeStep(key: string) {
    setSteps((prev) => prev.filter((s) => s.key !== key));
  }

  function move(key: string, dir: -1 | 1) {
    setSteps((prev) => {
      const i = prev.findIndex((s) => s.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  return (
    <form action={saveJourneyAction} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={journeyId} />
      <input type="hidden" name="definition" value={JSON.stringify(definition)} />

      {/* Journey-level fields. */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-xs text-dim">Journey name</span>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New-lead nurture"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-dim">Status</span>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            <option value="paused">paused</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </div>

      {/* Enrollment source — honest degraded state (segments are #420/#421, no schema yet). */}
      <div className="rounded-lg border border-border bg-panel p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-dim">
            Enrollment source
          </span>
          <span className="rounded-full border border-amber/40 px-2 py-0.5 text-[11px] text-amber">
            segments coming
          </span>
        </div>
        {sourceSegmentIds.length > 0 ? (
          <p className="mt-2 text-xs text-dim">
            Enrolls from:{" "}
            {sourceSegmentIds.map((s) => (
              <code key={s} className="mr-2">
                {s}
              </code>
            ))}
          </p>
        ) : (
          <p className="mt-2 text-xs text-dim">
            A journey enrols contacts from a <strong>segment</strong> (ADR-0073 decision 2). The
            segment model + contact membership are a later build (#420 / #421) and have no schema
            yet, so targeting is disabled here. You can author the steps now; enrollment wiring lands
            with segments.
          </p>
        )}
        <button
          type="button"
          disabled
          className="mt-2 cursor-not-allowed rounded-md border border-border px-3 py-1.5 text-xs text-dim opacity-50"
        >
          Add segment (coming with #420)
        </button>
      </div>

      {/* The ordered steps. */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text">Steps</h2>
          <span className="text-xs text-dim">{steps.length} step{steps.length === 1 ? "" : "s"}</span>
        </div>

        {steps.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-panel px-4 py-8 text-center text-sm text-dim">
            No steps yet. Add a send, wait, branch, score, or exit step below.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {steps.map((step, i) => (
              <li key={step.key}>
                <StepEditor
                  step={step}
                  index={i}
                  total={steps.length}
                  stepKeys={stepKeys}
                  onChange={(patch) => updateStep(step.key, patch)}
                  onRemove={() => removeStep(step.key)}
                  onMove={(dir) => move(step.key, dir)}
                />
              </li>
            ))}
          </ol>
        )}

        <div className="flex flex-wrap gap-2">
          {JOURNEY_STEP_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => addStep(kind)}
              className="rounded-md border border-border bg-panel-2 px-3 py-1.5 text-xs text-text hover:border-accent"
            >
              + {kind}
            </button>
          ))}
        </div>
      </div>

      {/* Live validation (same checker the read viewer + backend runner use). */}
      {problems.length > 0 ? (
        <div className="rounded-lg border border-amber/40 bg-amber/5 p-3 text-xs text-amber">
          <p className="font-medium">Not ready to run yet (you can still save a draft):</p>
          <ul className="mt-1 list-inside list-disc">
            {problems.map((p, idx) => (
              <li key={idx}>{p}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-lg border border-green/30 bg-green/5 p-3 text-xs text-green">
          Journey is structurally valid.
        </p>
      )}

      <p className="text-xs text-dim">
        Sends still cross the approval gate and autonomy dial at runtime (ADR-0058/0055) — authoring
        a send here does not bypass it.
      </p>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Save journey
        </button>
        <Link
          href={`/journeys/${journeyId}`}
          className="rounded-md border border-border px-4 py-2 text-sm text-dim hover:text-text"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function StepEditor({
  step,
  index,
  total,
  stepKeys,
  onChange,
  onRemove,
  onMove,
}: {
  step: JourneyStep;
  index: number;
  total: number;
  stepKeys: string[];
  onChange: (patch: Partial<JourneyStep>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const tone = STEP_TONE[step.kind] ?? "text-text";
  const otherKeys = stepKeys.filter((k) => k !== step.key);

  return (
    <div className="rounded-lg border border-border bg-panel p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>
            {step.kind}
          </span>
          <code className="text-xs text-dim">{step.key}</code>
          <span className="text-xs text-dim">{describeStep(step)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
            className="rounded border border-border px-2 py-0.5 text-xs text-dim hover:text-text disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move down"
            className="rounded border border-border px-2 py-0.5 text-xs text-dim hover:text-text disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove step"
            className="rounded border border-border px-2 py-0.5 text-xs text-red hover:bg-red/10"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] text-dim">Label</span>
          <input
            value={step.label ?? ""}
            onChange={(e) => onChange({ label: e.target.value || null })}
            placeholder="Optional description"
            className={inputClass}
          />
        </label>

        {/* Linear successor — every kind except branch / exit routes via `next`. */}
        {step.kind !== "branch" && step.kind !== "exit" && (
          <NextSelect
            label="Next step"
            value={step.next}
            options={otherKeys}
            onChange={(v) => onChange({ next: v })}
          />
        )}

        {/* SEND: channel + template + A/B variants. */}
        {step.kind === "send" && (
          <>
            <label className="block">
              <span className="mb-1 block text-[11px] text-dim">Channel</span>
              <select
                value={step.channel ?? "email"}
                onChange={(e) => onChange({ channel: e.target.value })}
                className={inputClass}
              >
                <option value="email">email</option>
                <option value="sms">sms</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] text-dim">
                Template id{" "}
                <span className="text-dim/70">(free-text until a template picker is wired)</span>
              </span>
              <input
                value={step.templateId ?? ""}
                onChange={(e) => onChange({ templateId: e.target.value || null })}
                placeholder="tpl_welcome"
                disabled={step.variants.length >= 2}
                className={`${inputClass} disabled:opacity-50`}
              />
            </label>
            <VariantEditor step={step} onChange={onChange} />
          </>
        )}

        {/* WAIT: duration in hours. */}
        {step.kind === "wait" && (
          <label className="block">
            <span className="mb-1 block text-[11px] text-dim">Wait (hours)</span>
            <input
              type="number"
              min={1}
              value={step.waitHours ?? ""}
              onChange={(e) =>
                onChange({ waitHours: e.target.value === "" ? null : Number(e.target.value) })
              }
              className={inputClass}
            />
          </label>
        )}

        {/* BRANCH: engagement condition + both arms. */}
        {step.kind === "branch" && (
          <>
            <label className="block">
              <span className="mb-1 block text-[11px] text-dim">If contact</span>
              <select
                value={step.condition ?? "opened"}
                onChange={(e) =>
                  onChange({ condition: e.target.value as JourneyBranchCondition })
                }
                className={inputClass}
              >
                {JOURNEY_BRANCH_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <NextSelect
              label="→ then go to"
              value={step.ifTrue}
              options={otherKeys}
              onChange={(v) => onChange({ ifTrue: v })}
            />
            <NextSelect
              label="otherwise go to"
              value={step.ifFalse}
              options={otherKeys}
              onChange={(v) => onChange({ ifFalse: v })}
            />
          </>
        )}

        {/* SCORE: lead-score delta. */}
        {step.kind === "score" && (
          <label className="block">
            <span className="mb-1 block text-[11px] text-dim">Lead-score delta</span>
            <input
              type="number"
              value={step.scoreDelta ?? ""}
              onChange={(e) =>
                onChange({ scoreDelta: e.target.value === "" ? null : Number(e.target.value) })
              }
              className={inputClass}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function NextSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-dim">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className={inputClass}
      >
        <option value="">end</option>
        {options.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
    </label>
  );
}

function VariantEditor({
  step,
  onChange,
}: {
  step: JourneyStep;
  onChange: (patch: Partial<JourneyStep>) => void;
}) {
  function addVariant() {
    const key = String.fromCharCode(97 + step.variants.length); // a, b, c…
    onChange({ variants: [...step.variants, { key, ratio: 1, templateId: null, label: null }] });
  }
  function updateVariant(key: string, patch: Partial<JourneyStep["variants"][number]>) {
    onChange({
      variants: step.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)),
    });
  }
  function removeVariant(key: string) {
    onChange({ variants: step.variants.filter((v) => v.key !== key) });
  }

  return (
    <div className="sm:col-span-2 rounded-md border border-border/60 bg-panel-2 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-accent-2">
          A/B variants {step.variants.length >= 2 ? "(test active)" : "(optional)"}
        </span>
        <button
          type="button"
          onClick={addVariant}
          className="rounded border border-border px-2 py-0.5 text-[11px] text-dim hover:text-text"
        >
          + variant
        </button>
      </div>
      {step.variants.length === 0 ? (
        <p className="mt-1 text-[11px] text-dim">
          Add 2+ variants to A/B test this send (sticky per enrollee, ADR-0073 decision 4). With a
          single template above, no test runs.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {step.variants.map((v) => (
            <li key={v.key} className="grid grid-cols-[auto_1fr_5rem_auto] items-center gap-2">
              <code className="text-[11px] text-dim">{v.key}</code>
              <input
                value={v.templateId ?? ""}
                onChange={(e) => updateVariant(v.key, { templateId: e.target.value || null })}
                placeholder="template id"
                className={`${inputClass} py-1`}
              />
              <input
                type="number"
                min={1}
                value={v.ratio}
                onChange={(e) => updateVariant(v.key, { ratio: Number(e.target.value) || 1 })}
                title="split weight"
                className={`${inputClass} py-1`}
              />
              <button
                type="button"
                onClick={() => removeVariant(v.key)}
                aria-label="Remove variant"
                className="rounded border border-border px-2 py-0.5 text-[11px] text-red hover:bg-red/10"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
