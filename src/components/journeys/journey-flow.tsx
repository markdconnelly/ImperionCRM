import type { JourneyDetail, JourneyStep } from "@/types";
import { describeStep, validateJourneyDefinition, variantSplit } from "@/lib/journey";

const STEP_TONE: Record<string, string> = {
  send: "text-accent",
  wait: "text-dim",
  branch: "text-accent-2",
  score: "text-green",
  exit: "text-dim",
};

function StepCard({ step }: { step: JourneyStep }) {
  const tone = STEP_TONE[step.kind] ?? "text-text";
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>
            {step.kind}
          </span>
          <span className="text-sm font-medium">{step.label ?? describeStep(step)}</span>
        </div>
        <code className="text-xs text-dim">{step.key}</code>
      </div>

      <p className="mt-1 text-sm text-dim">{describeStep(step)}</p>

      {/* A/B variants on a send step (ADR-0073 decision 4). */}
      {step.kind === "send" && step.variants.length >= 2 && (
        <ul className="mt-3 flex flex-col gap-1">
          {variantSplit(step.variants).map((v) => {
            const variant = step.variants.find((x) => x.key === v.key);
            return (
              <li key={v.key} className="flex items-center justify-between text-xs">
                <span className="text-text">
                  {variant?.label ?? v.key}
                  {variant?.templateId ? (
                    <span className="text-dim"> · {variant.templateId}</span>
                  ) : null}
                </span>
                <span className="text-accent-2">{Math.round(v.fraction * 100)}%</span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Branch arms (ADR-0073 decision 3). */}
      {step.kind === "branch" && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-border px-2 py-1">
            <span className="text-green">if {step.condition} → </span>
            <code className="text-dim">{step.ifTrue ?? "end"}</code>
          </div>
          <div className="rounded border border-border px-2 py-1">
            <span className="text-amber">else → </span>
            <code className="text-dim">{step.ifFalse ?? "end"}</code>
          </div>
        </div>
      )}

      {/* Linear successor for non-branch steps. */}
      {step.kind !== "branch" && step.kind !== "exit" && (
        <p className="mt-2 text-xs text-dim">
          next → <code>{step.next ?? "end"}</code>
        </p>
      )}
    </div>
  );
}

export function JourneyFlow({ journey }: { journey: JourneyDetail }) {
  const { definition, summary } = journey;
  const problems = validateJourneyDefinition(definition);

  return (
    <div className="flex flex-col gap-4">
      {/* Summary chips. */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-border px-2 py-1 text-dim">
          {summary.stepCount} steps
        </span>
        <span className="rounded-full border border-border px-2 py-1 text-dim">
          {summary.sendCount} sends
        </span>
        <span className="rounded-full border border-border px-2 py-1 text-dim">
          {summary.branchCount} branches
        </span>
        {summary.hasAbTest && (
          <span className="rounded-full border border-border px-2 py-1 text-accent-2">A/B test</span>
        )}
        <span className="rounded-full border border-border px-2 py-1 text-dim">
          {summary.sourceSegmentCount} source segment{summary.sourceSegmentCount === 1 ? "" : "s"}
        </span>
        <span className="rounded-full border border-border px-2 py-1 text-dim">
          {journey.activeEnrollments} active enrollments
        </span>
      </div>

      {/* Validation problems (a half-authored journey). */}
      {problems.length > 0 && (
        <div className="rounded-lg border border-amber/40 bg-amber/5 p-3 text-xs text-amber">
          <p className="font-medium">This journey is not ready to run:</p>
          <ul className="mt-1 list-inside list-disc">
            {problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Source segments (ADR-0073 decision 2; segment table is #420). */}
      {definition.sourceSegmentIds.length > 0 && (
        <div className="text-xs text-dim">
          Enrolls from:{" "}
          {definition.sourceSegmentIds.map((s) => (
            <code key={s} className="mr-2">
              {s}
            </code>
          ))}
        </div>
      )}

      {/* The steps. */}
      {definition.steps.length === 0 ? (
        <p className="rounded-lg border border-border bg-panel px-4 py-8 text-center text-sm text-dim">
          This journey has no steps yet.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {definition.steps.map((step) => (
            <li key={step.key}>
              <StepCard step={step} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
