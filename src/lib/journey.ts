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
    // A/B winner (#400): keep only if it names a real variant on this step — a stale
    // winner (variant removed/renamed) is dropped so it can never promote a ghost.
    winner: (() => {
      const w = asString(raw.winner);
      return w != null && variants.some((v) => v.key === w) ? w : null;
    })(),
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
        // A/B winner (#400): a promoted winner must name a real variant on an A/B send.
        if (step.winner != null) {
          if (step.variants.length < 2) {
            problems.push(
              `Send step "${step.key}" has a winner but is not an A/B test (needs 2+ variants).`,
            );
          } else if (!step.variants.some((v) => v.key === step.winner)) {
            problems.push(
              `Send step "${step.key}" winner "${step.winner}" is not one of its variants.`,
            );
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

// ── A/B split allocation + winner selection (ADR-0073 decision 4, #400) ──────────
//
// #399 lets an operator *define* A/B variants (each with a relative `ratio` weight);
// #400 turns those weights into a deterministic traffic split that sums to EXACTLY
// 100% — and lets the operator *promote a winner*. Winner selection is MANUAL/
// operator-chosen: there are NO live per-variant journey-run metrics yet (the runner
// is backend #398, and no run telemetry exists), so a metric-driven pick is honestly
// degraded — `variantMetricsAvailable()` is the single source of that truth, and the
// UI shows an empty state instead of fabricating a "winning" rate.

/**
 * Deterministic integer-percentage split across variants, summing to EXACTLY 100
 * (largest-remainder / Hare quota). This is the *displayed and assigned* traffic
 * split — `variantSplit` gives raw fractions; this rounds them to whole percents
 * without drift. Order is stable (input order), and the residual percents go to the
 * largest fractional remainders, ties broken by input order — so the same variants
 * always allocate the same way (sticky-per-enrollee assignment, ADR-0073 decision 4).
 */
export function allocateSplitPercent(
  variants: readonly JourneyVariant[],
): { key: string; percent: number }[] {
  if (variants.length === 0) return [];
  const fractions = variantSplit(variants); // sums to ~1
  const raw = fractions.map((f) => f.fraction * 100);
  const floors = raw.map((r) => Math.floor(r));
  let remainder = 100 - floors.reduce((s, n) => s + n, 0);
  // Distribute the leftover percents to the largest fractional parts, input-order ties.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const percents = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k += 1) {
    percents[order[k].i] += 1;
    remainder -= 1;
  }
  return variants.map((v, i) => ({ key: v.key, percent: percents[i] }));
}

/** Do the integer split percents sum to exactly 100? (Builder validation for #400.) */
export function splitPercentsSumTo100(
  alloc: readonly { percent: number }[],
): boolean {
  return alloc.reduce((s, a) => s + a.percent, 0) === 100;
}

/**
 * Whether per-variant send metrics exist to drive an automatic winner. HONEST FALSE
 * for now — the journey runner (#398) has shipped no per-variant run telemetry, so
 * winner selection is operator-manual and the UI must show an empty metrics state
 * rather than invent open/click rates. Flip this (and feed real counts) when the
 * backend exposes journey-run metrics.
 */
export function variantMetricsAvailable(): boolean {
  return false;
}

/** Is this send step running an A/B test with a winner already promoted? (#400) */
export function stepHasWinner(step: JourneyStep): boolean {
  return stepHasAbTest(step) && step.winner != null;
}

/**
 * Promote a variant as the A/B winner on a send step (#400). Returns a new step (pure).
 * No-op unless the step is an A/B send and the key names a real variant on it — so a
 * winner can never reference a ghost variant.
 */
export function selectWinner(step: JourneyStep, variantKey: string): JourneyStep {
  if (!stepHasAbTest(step)) return step;
  if (!step.variants.some((v) => v.key === variantKey)) return step;
  return { ...step, winner: variantKey };
}

/** Clear any promoted winner from a step (re-open the split). Pure. (#400) */
export function clearWinner(step: JourneyStep): JourneyStep {
  return step.winner == null ? step : { ...step, winner: null };
}

// ── Builder helpers (ADR-0073, #399) ─────────────────────────────────────────

/** A fresh step of the given kind, all kind-specific fields null/empty (builder #399). */
export function newJourneyStep(kind: JourneyStepKind, key: string): JourneyStep {
  return {
    key,
    kind,
    label: null,
    next: null,
    templateId: null,
    channel: kind === "send" ? "email" : null,
    variants: [],
    waitHours: kind === "wait" ? 24 : null,
    condition: kind === "branch" ? "opened" : null,
    ifTrue: null,
    ifFalse: null,
    scoreDelta: kind === "score" ? 10 : null,
    winner: null,
  };
}

/**
 * The next free `sN` step key for a definition (builder #399). Stable, collision-free
 * keys are what branches + the enrollment cursor reference, so they never reuse.
 */
export function nextStepKey(def: JourneyDefinition): string {
  let n = def.steps.length + 1;
  const used = new Set(def.steps.map((s) => s.key));
  while (used.has(`s${n}`)) n += 1;
  return `s${n}`;
}

/** A one-line human summary of a step for the read viewer. */
export function describeStep(step: JourneyStep): string {
  switch (step.kind) {
    case "send": {
      const ch = step.channel ?? "message";
      if (step.variants.length >= 2) {
        return step.winner != null
          ? `Send ${ch} — A/B (winner: ${step.winner})`
          : `Send ${ch} — A/B (${step.variants.length} variants)`;
      }
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
