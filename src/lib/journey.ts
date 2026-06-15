/**
 * Marketing-journey helpers (ADR-0073, #397).
 *
 * Pure, dependency-free, NOT server-only — safe to import from server reads, the
 * journey surface (#397) / builder (#399), and the vitest suite alike. ADR-0073's
 * key call (decision 1, RATIFIED): a journey is a SINGLE object on the existing
 * `workflow` substrate — a `workflow` row (kind='journey') whose `definition` jsonb
 * holds the ordered steps, the A/B variants, and the source segments. There are NO
 * journey_step / journey_enrollment child tables. This module is the one place that
 * understands the SHAPE of that jsonb: it defensively parses an untrusted blob into a
 * typed `JourneyDefinition`, validates it, and rolls it up for display.
 *
 * The DB does not constrain the definition (one object to version, ADR-0073) — so
 * every read flows through `parseJourneyDefinition`, which never throws and always
 * returns a well-formed (possibly empty) definition. Send execution, consent, and the
 * approval gate (ADR-0058/0055) are the backend runner's job (#398); this is read-shape
 * only.
 */

import type {
  JourneyBranchCondition,
  JourneyDefinition,
  JourneyStep,
  JourneyStepKind,
  JourneySummary,
  JourneyVariant,
} from "@/types";

/** The five journey step kinds (ADR-0073 decision 1). */
export const JOURNEY_STEP_KINDS: readonly JourneyStepKind[] = [
  "send",
  "wait",
  "branch",
  "score",
  "exit",
] as const;

/** The branch engagement predicates (ADR-0073 decision 3). */
export const JOURNEY_BRANCH_CONDITIONS: readonly JourneyBranchCondition[] = [
  "opened",
  "clicked",
  "replied",
  "bounced",
  "no_action",
] as const;

/** An empty journey — the safe fallback for a missing / malformed definition. */
export const EMPTY_JOURNEY_DEFINITION: JourneyDefinition = {
  steps: [],
  entryStepKey: null,
  sourceSegmentIds: [],
};

// ── Defensive parse ──────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function asFiniteNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asStepKind(v: unknown): JourneyStepKind | null {
  return typeof v === "string" && (JOURNEY_STEP_KINDS as readonly string[]).includes(v)
    ? (v as JourneyStepKind)
    : null;
}

function asBranchCondition(v: unknown): JourneyBranchCondition | null {
  return typeof v === "string" &&
    (JOURNEY_BRANCH_CONDITIONS as readonly string[]).includes(v)
    ? (v as JourneyBranchCondition)
    : null;
}

function parseVariant(raw: unknown, index: number): JourneyVariant | null {
  if (!isRecord(raw)) return null;
  const key = asString(raw.key) ?? `v${index + 1}`;
  const ratio = asFiniteNumber(raw.ratio);
  return {
    key,
    ratio: ratio != null && ratio > 0 ? ratio : 1,
    templateId: asString(raw.templateId),
    label: asString(raw.label),
  };
}

function parseStep(raw: unknown): JourneyStep | null {
  if (!isRecord(raw)) return null;
  const kind = asStepKind(raw.kind);
  const key = asString(raw.key);
  if (!kind || !key) return null; // a step without a kind or stable key is unusable
  const variantsRaw = Array.isArray(raw.variants) ? raw.variants : [];
  const variants = variantsRaw
    .map((v, i) => parseVariant(v, i))
    .filter((v): v is JourneyVariant => v !== null);
  return {
    key,
    kind,
    label: asString(raw.label),
    next: asString(raw.next),
    templateId: asString(raw.templateId),
    channel: asString(raw.channel),
    variants,
    waitHours: asFiniteNumber(raw.waitHours),
    condition: asBranchCondition(raw.condition),
    ifTrue: asString(raw.ifTrue),
    ifFalse: asString(raw.ifFalse),
    scoreDelta: asFiniteNumber(raw.scoreDelta),
  };
}

/**
 * Parse an untrusted `workflow.definition` blob into a typed journey. Never throws:
 * a missing / malformed / non-journey definition returns the empty journey. Unusable
 * steps (no kind / no key) are dropped. The entry step defaults to the first parsed
 * step when not declared.
 */
export function parseJourneyDefinition(raw: unknown): JourneyDefinition {
  if (!isRecord(raw)) return EMPTY_JOURNEY_DEFINITION;
  const stepsRaw = Array.isArray(raw.steps) ? raw.steps : [];
  const steps = stepsRaw
    .map(parseStep)
    .filter((s): s is JourneyStep => s !== null);
  const declaredEntry = asString(raw.entryStepKey);
  const entryStepKey =
    declaredEntry && steps.some((s) => s.key === declaredEntry)
      ? declaredEntry
      : (steps[0]?.key ?? null);
  const segRaw = Array.isArray(raw.sourceSegmentIds) ? raw.sourceSegmentIds : [];
  const sourceSegmentIds = segRaw
    .map(asString)
    .filter((s): s is string => s !== null);
  return { steps, entryStepKey, sourceSegmentIds };
}

// ── Roll-up + validation ───────────────────────────────────────────────────────

/** Does this send step run an A/B test (≥ 2 variants)? */
export function stepHasAbTest(step: JourneyStep): boolean {
  return step.kind === "send" && step.variants.length >= 2;
}

/** Derived counts for the list row + header. */
export function summariseJourney(def: JourneyDefinition): JourneySummary {
  let sendCount = 0;
  let branchCount = 0;
  let hasAbTest = false;
  for (const step of def.steps) {
    if (step.kind === "send") sendCount += 1;
    if (step.kind === "branch") branchCount += 1;
    if (stepHasAbTest(step)) hasAbTest = true;
  }
  return {
    stepCount: def.steps.length,
    sendCount,
    branchCount,
    hasAbTest,
    sourceSegmentCount: def.sourceSegmentIds.length,
  };
}

/**
 * Validate a parsed journey, returning human-readable problems (empty = valid). Used
 * by the builder (#399) and the read surface to flag a half-authored journey. Checks:
 * unique step keys, every `next`/branch target resolves to a real step, branch steps
 * declare a condition + both arms, send steps have a template or variants, and a
 * reachable exit exists.
 */
export function validateJourneyDefinition(def: JourneyDefinition): string[] {
  const problems: string[] = [];
  if (def.steps.length === 0) {
    problems.push("Journey has no steps.");
    return problems;
  }

  const keys = new Set<string>();
  for (const step of def.steps) {
    if (keys.has(step.key)) problems.push(`Duplicate step key "${step.key}".`);
    keys.add(step.key);
  }

  const resolves = (target: string | null): boolean => target == null || keys.has(target);
  for (const step of def.steps) {
    if (!resolves(step.next)) {
      problems.push(`Step "${step.key}" points next to a missing step "${step.next}".`);
    }
    switch (step.kind) {
      case "send":
        if (!step.templateId && step.variants.length === 0) {
          problems.push(`Send step "${step.key}" has no template or variants.`);
        }
        for (const v of step.variants) {
          if (!v.templateId) {
            problems.push(`Variant "${v.key}" of send step "${step.key}" has no template.`);
          }
        }
        break;
      case "wait":
        if (step.waitHours == null || step.waitHours <= 0) {
          problems.push(`Wait step "${step.key}" needs a positive duration.`);
        }
        break;
      case "branch":
        if (!step.condition) {
          problems.push(`Branch step "${step.key}" has no condition.`);
        }
        if (!resolves(step.ifTrue)) {
          problems.push(`Branch "${step.key}" if-true points to a missing step "${step.ifTrue}".`);
        }
        if (!resolves(step.ifFalse)) {
          problems.push(`Branch "${step.key}" if-false points to a missing step "${step.ifFalse}".`);
        }
        break;
      case "score":
        if (step.scoreDelta == null) {
          problems.push(`Score step "${step.key}" has no score delta.`);
        }
        break;
      case "exit":
        break;
    }
  }

  if (def.entryStepKey && !keys.has(def.entryStepKey)) {
    problems.push(`Entry step "${def.entryStepKey}" is not a step in the journey.`);
  }
  if (!def.steps.some((s) => s.kind === "exit")) {
    problems.push("Journey has no exit step.");
  }

  return problems;
}

/** Normalise A/B split ratios to fractions that sum to 1 (for display / assignment). */
export function variantSplit(variants: readonly JourneyVariant[]): { key: string; fraction: number }[] {
  const total = variants.reduce((sum, v) => sum + (v.ratio > 0 ? v.ratio : 0), 0);
  if (total <= 0) {
    const even = variants.length > 0 ? 1 / variants.length : 0;
    return variants.map((v) => ({ key: v.key, fraction: even }));
  }
  return variants.map((v) => ({ key: v.key, fraction: (v.ratio > 0 ? v.ratio : 0) / total }));
}

/** A one-line human summary of a step for the read viewer. */
export function describeStep(step: JourneyStep): string {
  switch (step.kind) {
    case "send": {
      const ch = step.channel ?? "message";
      if (step.variants.length >= 2) return `Send ${ch} — A/B (${step.variants.length} variants)`;
      return `Send ${ch}`;
    }
    case "wait":
      return step.waitHours != null ? `Wait ${step.waitHours}h` : "Wait";
    case "branch":
      return step.condition ? `Branch on ${step.condition}` : "Branch";
    case "score":
      return step.scoreDelta != null
        ? `Score ${step.scoreDelta >= 0 ? "+" : ""}${step.scoreDelta}`
        : "Score";
    case "exit":
      return "Exit";
  }
}
