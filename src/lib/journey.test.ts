import { describe, it, expect } from "vitest";
import {
  EMPTY_JOURNEY_DEFINITION,
  JOURNEY_STEP_KINDS,
  describeStep,
  parseJourneyDefinition,
  stepHasAbTest,
  summariseJourney,
  validateJourneyDefinition,
  variantSplit,
} from "./journey";
import type { JourneyStep } from "@/types";

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
