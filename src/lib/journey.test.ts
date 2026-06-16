import { describe, it, expect } from "vitest";
import {
  EMPTY_JOURNEY_DEFINITION,
  JOURNEY_STEP_KINDS,
  allocateSplitPercent,
  clearWinner,
  describeStep,
  newJourneyStep,
  nextStepKey,
  parseJourneyDefinition,
  selectWinner,
  splitPercentsSumTo100,
  stepHasAbTest,
  stepHasWinner,
  summariseJourney,
  validateJourneyDefinition,
  variantMetricsAvailable,
  variantSplit,
} from "./journey";
import type { JourneyDefinition, JourneyStep } from "@/types";

// A minimal valid step builder so tests state only the fields they care about.
function step(partial: Partial<JourneyStep> & { key: string; kind: JourneyStep["kind"] }): JourneyStep {
  return {
    label: null,
    next: null,
    templateId: null,
    channel: null,
    variants: [],
    waitHours: null,
    condition: null,
    ifTrue: null,
    ifFalse: null,
    scoreDelta: null,
    winner: null,
    ...partial,
  };
}

describe("parseJourneyDefinition", () => {
  it("returns the empty journey for non-objects", () => {
    expect(parseJourneyDefinition(null)).toEqual(EMPTY_JOURNEY_DEFINITION);
    expect(parseJourneyDefinition(undefined)).toEqual(EMPTY_JOURNEY_DEFINITION);
    expect(parseJourneyDefinition("nope")).toEqual(EMPTY_JOURNEY_DEFINITION);
    expect(parseJourneyDefinition([1, 2, 3])).toEqual(EMPTY_JOURNEY_DEFINITION);
  });

  it("drops unusable steps (missing kind or key)", () => {
    const def = parseJourneyDefinition({
      steps: [
        { key: "s1", kind: "send" },
        { kind: "wait" }, // no key
        { key: "s3", kind: "bogus" }, // bad kind
        "garbage",
      ],
    });
    expect(def.steps.map((s) => s.key)).toEqual(["s1"]);
  });

  it("defaults entryStepKey to the first step when missing or invalid", () => {
    const a = parseJourneyDefinition({ steps: [{ key: "s1", kind: "send" }, { key: "s2", kind: "exit" }] });
    expect(a.entryStepKey).toBe("s1");
    const b = parseJourneyDefinition({
      entryStepKey: "ghost",
      steps: [{ key: "s1", kind: "send" }],
    });
    expect(b.entryStepKey).toBe("s1");
    const c = parseJourneyDefinition({
      entryStepKey: "s2",
      steps: [{ key: "s1", kind: "send" }, { key: "s2", kind: "exit" }],
    });
    expect(c.entryStepKey).toBe("s2");
  });

  it("parses variants with a default key + positive ratio", () => {
    const def = parseJourneyDefinition({
      steps: [
        {
          key: "s1",
          kind: "send",
          variants: [{ templateId: "t_a" }, { key: "b", ratio: -5, templateId: "t_b" }],
        },
      ],
    });
    const v = def.steps[0].variants;
    expect(v[0].key).toBe("v1");
    expect(v[0].ratio).toBe(1); // missing ratio → 1
    expect(v[1].ratio).toBe(1); // non-positive ratio → 1
  });

  it("keeps only string source segment ids", () => {
    const def = parseJourneyDefinition({
      steps: [{ key: "s1", kind: "exit" }],
      sourceSegmentIds: ["seg_a", 7, null, "seg_b"],
    });
    expect(def.sourceSegmentIds).toEqual(["seg_a", "seg_b"]);
  });

  it("recognises all five step kinds", () => {
    const def = parseJourneyDefinition({
      steps: JOURNEY_STEP_KINDS.map((k, i) => ({ key: `s${i}`, kind: k })),
    });
    expect(def.steps.map((s) => s.kind)).toEqual([...JOURNEY_STEP_KINDS]);
  });
});

describe("summariseJourney", () => {
  it("counts steps, sends, branches and detects A/B", () => {
    const def = {
      entryStepKey: "s1",
      sourceSegmentIds: ["seg_a"],
      steps: [
        step({
          key: "s1",
          kind: "send",
          variants: [
            { key: "a", ratio: 1, templateId: "ta", label: null },
            { key: "b", ratio: 1, templateId: "tb", label: null },
          ],
        }),
        step({ key: "s2", kind: "branch", condition: "opened", ifTrue: "s3", ifFalse: "s3" }),
        step({ key: "s3", kind: "exit" }),
      ],
    };
    expect(summariseJourney(def)).toEqual({
      stepCount: 3,
      sendCount: 1,
      branchCount: 1,
      hasAbTest: true,
      sourceSegmentCount: 1,
    });
  });

  it("a single-variant send is not an A/B test", () => {
    const def = {
      entryStepKey: "s1",
      sourceSegmentIds: [],
      steps: [step({ key: "s1", kind: "send", templateId: "t", variants: [] }), step({ key: "s2", kind: "exit" })],
    };
    expect(summariseJourney(def).hasAbTest).toBe(false);
    expect(stepHasAbTest(def.steps[0])).toBe(false);
  });
});

describe("validateJourneyDefinition", () => {
  it("flags an empty journey", () => {
    expect(validateJourneyDefinition(EMPTY_JOURNEY_DEFINITION)).toContain("Journey has no steps.");
  });

  it("passes a well-formed journey", () => {
    const def = {
      entryStepKey: "s1",
      sourceSegmentIds: [],
      steps: [
        step({ key: "s1", kind: "send", templateId: "t", next: "s2" }),
        step({ key: "s2", kind: "wait", waitHours: 24, next: "s3" }),
        step({ key: "s3", kind: "branch", condition: "opened", ifTrue: "s4", ifFalse: "s4" }),
        step({ key: "s4", kind: "exit" }),
      ],
    };
    expect(validateJourneyDefinition(def)).toEqual([]);
  });

  it("catches dangling next/branch targets, duplicate keys, and missing config", () => {
    const def = {
      entryStepKey: "s1",
      sourceSegmentIds: [],
      steps: [
        step({ key: "s1", kind: "send", next: "ghost" }), // no template/variants + dangling next
        step({ key: "s1", kind: "wait", waitHours: 0 }), // duplicate key + non-positive wait
        step({ key: "s3", kind: "branch", ifTrue: "nope" }), // no condition + dangling ifTrue
        step({ key: "s4", kind: "score" }), // no delta
      ],
    };
    const problems = validateJourneyDefinition(def);
    expect(problems.some((p) => p.includes("Duplicate step key"))).toBe(true);
    expect(problems.some((p) => p.includes("missing step \"ghost\""))).toBe(true);
    expect(problems.some((p) => p.includes("no template or variants"))).toBe(true);
    expect(problems.some((p) => p.includes("positive duration"))).toBe(true);
    expect(problems.some((p) => p.includes("no condition"))).toBe(true);
    expect(problems.some((p) => p.includes("no score delta"))).toBe(true);
    expect(problems.some((p) => p.includes("no exit step"))).toBe(true);
  });
});

describe("variantSplit", () => {
  it("normalises ratios to fractions summing to 1", () => {
    const split = variantSplit([
      { key: "a", ratio: 3, templateId: null, label: null },
      { key: "b", ratio: 1, templateId: null, label: null },
    ]);
    expect(split).toEqual([
      { key: "a", fraction: 0.75 },
      { key: "b", fraction: 0.25 },
    ]);
  });

  it("falls back to an even split when all ratios are non-positive", () => {
    const split = variantSplit([
      { key: "a", ratio: 0, templateId: null, label: null },
      { key: "b", ratio: 0, templateId: null, label: null },
    ]);
    expect(split).toEqual([
      { key: "a", fraction: 0.5 },
      { key: "b", fraction: 0.5 },
    ]);
  });
});

describe("describeStep", () => {
  it("renders a human one-liner per kind", () => {
    expect(describeStep(step({ key: "s", kind: "send", channel: "email" }))).toBe("Send email");
    expect(
      describeStep(
        step({
          key: "s",
          kind: "send",
          channel: "email",
          variants: [
            { key: "a", ratio: 1, templateId: null, label: null },
            { key: "b", ratio: 1, templateId: null, label: null },
          ],
        }),
      ),
    ).toContain("A/B");
    expect(describeStep(step({ key: "s", kind: "wait", waitHours: 12 }))).toBe("Wait 12h");
    expect(describeStep(step({ key: "s", kind: "branch", condition: "clicked" }))).toBe("Branch on clicked");
    expect(describeStep(step({ key: "s", kind: "score", scoreDelta: 5 }))).toBe("Score +5");
    expect(describeStep(step({ key: "s", kind: "score", scoreDelta: -3 }))).toBe("Score -3");
    expect(describeStep(step({ key: "s", kind: "exit" }))).toBe("Exit");
  });
});

// ── Builder helpers (#399) ────────────────────────────────────────────────────

describe("newJourneyStep (builder #399)", () => {
  it("seeds sensible kind-specific defaults", () => {
    expect(newJourneyStep("send", "s1")).toMatchObject({ key: "s1", kind: "send", channel: "email" });
    expect(newJourneyStep("wait", "s1").waitHours).toBeGreaterThan(0);
    expect(newJourneyStep("branch", "s1").condition).toBe("opened");
    expect(newJourneyStep("score", "s1").scoreDelta).not.toBeNull();
    expect(newJourneyStep("exit", "s1")).toMatchObject({ kind: "exit", waitHours: null, condition: null });
  });

  it("produces a step that round-trips through parse unchanged", () => {
    const built = newJourneyStep("send", "s1");
    const parsed = parseJourneyDefinition({ steps: [built] });
    expect(parsed.steps[0]).toMatchObject({ key: "s1", kind: "send" });
  });
});

describe("nextStepKey (builder #399)", () => {
  function def(keys: string[]): JourneyDefinition {
    return {
      entryStepKey: null,
      sourceSegmentIds: [],
      steps: keys.map((k) => newJourneyStep("exit", k)),
    };
  }

  it("returns s1 for an empty journey", () => {
    expect(nextStepKey(EMPTY_JOURNEY_DEFINITION)).toBe("s1");
  });

  it("never collides with an existing key", () => {
    const d = def(["s1", "s2"]);
    const next = nextStepKey(d);
    expect(d.steps.some((s) => s.key === next)).toBe(false);
  });

  it("skips a gap-filling collision (s1,s3 present → not s1/s3)", () => {
    const next = nextStepKey(def(["s1", "s3"]));
    expect(["s1", "s3"]).not.toContain(next);
  });
});

// ── A/B split + winner selection (#400) ───────────────────────────────────────

const variant = (key: string, ratio: number) => ({ key, ratio, templateId: `t_${key}`, label: null });

describe("allocateSplitPercent (#400)", () => {
  it("returns whole percents summing to exactly 100 for an even split", () => {
    const alloc = allocateSplitPercent([variant("a", 1), variant("b", 1)]);
    expect(alloc).toEqual([
      { key: "a", percent: 50 },
      { key: "b", percent: 50 },
    ]);
    expect(splitPercentsSumTo100(alloc)).toBe(true);
  });

  it("honours weighted ratios (3:1 → 75/25)", () => {
    const alloc = allocateSplitPercent([variant("a", 3), variant("b", 1)]);
    expect(alloc).toEqual([
      { key: "a", percent: 75 },
      { key: "b", percent: 25 },
    ]);
  });

  it("sums to exactly 100 even when fractions don't divide evenly (3-way)", () => {
    const alloc = allocateSplitPercent([variant("a", 1), variant("b", 1), variant("c", 1)]);
    expect(alloc.reduce((s, a) => s + a.percent, 0)).toBe(100);
    expect(splitPercentsSumTo100(alloc)).toBe(true);
    // largest-remainder gives the leftover percent to the first variant deterministically.
    expect(alloc).toEqual([
      { key: "a", percent: 34 },
      { key: "b", percent: 33 },
      { key: "c", percent: 33 },
    ]);
  });

  it("is empty for no variants and 100 for a single variant", () => {
    expect(allocateSplitPercent([])).toEqual([]);
    expect(allocateSplitPercent([variant("a", 1)])).toEqual([{ key: "a", percent: 100 }]);
  });
});

describe("winner selection (#400)", () => {
  const abSend = () =>
    step({
      key: "s1",
      kind: "send",
      templateId: null,
      variants: [variant("a", 1), variant("b", 1)],
    });

  it("metrics are honestly unavailable (manual selection only, no run telemetry yet)", () => {
    expect(variantMetricsAvailable()).toBe(false);
  });

  it("promotes a real variant and reflects it in stepHasWinner + describeStep", () => {
    const promoted = selectWinner(abSend(), "b");
    expect(promoted.winner).toBe("b");
    expect(stepHasWinner(promoted)).toBe(true);
    expect(describeStep(promoted)).toContain("winner: b");
  });

  it("ignores a winner that names no variant on the step", () => {
    const promoted = selectWinner(abSend(), "ghost");
    expect(promoted.winner).toBeNull();
    expect(stepHasWinner(promoted)).toBe(false);
  });

  it("won't promote a winner on a non-A/B send (single variant)", () => {
    const single = step({ key: "s1", kind: "send", templateId: "t", variants: [variant("a", 1)] });
    expect(selectWinner(single, "a").winner).toBeNull();
  });

  it("clearWinner re-opens the split", () => {
    const promoted = selectWinner(abSend(), "a");
    expect(clearWinner(promoted).winner).toBeNull();
  });
});

describe("parseJourneyDefinition winner (#400)", () => {
  it("keeps a winner that names a real variant", () => {
    const def = parseJourneyDefinition({
      steps: [
        {
          key: "s1",
          kind: "send",
          winner: "b",
          variants: [
            { key: "a", templateId: "ta" },
            { key: "b", templateId: "tb" },
          ],
        },
      ],
    });
    expect(def.steps[0].winner).toBe("b");
  });

  it("drops a stale winner that names no variant", () => {
    const def = parseJourneyDefinition({
      steps: [
        {
          key: "s1",
          kind: "send",
          winner: "ghost",
          variants: [{ key: "a", templateId: "ta" }, { key: "b", templateId: "tb" }],
        },
      ],
    });
    expect(def.steps[0].winner).toBeNull();
  });
});

describe("validateJourneyDefinition winner (#400)", () => {
  it("flags a winner on a non-A/B send and a winner naming no variant", () => {
    const def = {
      entryStepKey: "s1",
      sourceSegmentIds: [],
      steps: [
        step({ key: "s1", kind: "send", templateId: "t", winner: "a" }), // winner but no variants
        step({
          key: "s2",
          kind: "send",
          winner: "z",
          variants: [variant("a", 1), variant("b", 1)],
        }), // winner names no variant
        step({ key: "s3", kind: "exit" }),
      ],
    };
    const problems = validateJourneyDefinition(def);
    expect(problems.some((p) => p.includes("is not an A/B test"))).toBe(true);
    expect(problems.some((p) => p.includes('winner "z" is not one of its variants'))).toBe(true);
  });

  it("passes a valid A/B send with a promoted winner", () => {
    const def = {
      entryStepKey: "s1",
      sourceSegmentIds: [],
      steps: [
        step({
          key: "s1",
          kind: "send",
          next: "s2",
          winner: "a",
          variants: [variant("a", 1), variant("b", 1)],
        }),
        step({ key: "s2", kind: "exit" }),
      ],
    };
    expect(validateJourneyDefinition(def)).toEqual([]);
  });
});
