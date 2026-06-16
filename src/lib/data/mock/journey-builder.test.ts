import { describe, expect, it } from "vitest";
import { mockRepositories } from "./mock-repositories";
import { newJourneyStep } from "@/lib/journey";
import type { JourneyDefinition } from "@/types";

/**
 * Behaviour tests for the journey-builder writes on the mock workflows repository
 * (ADR-0073, #399). A journey is a SINGLE object on the workflow substrate — create
 * inserts a kind='journey' row with an empty definition; save persists the whole
 * definition + name/status back. The mock store is module-level, so created ids are
 * unique per call and these tests assert the round-trip, not isolation.
 */
const repo = mockRepositories.workflows;

describe("mock journey builder (#399)", () => {
  it("createJourney returns an id and the new journey reads back paused + empty", async () => {
    const id = await repo.createJourney("My nurture");
    const got = await repo.getJourney(id);
    expect(got).not.toBeNull();
    expect(got).toMatchObject({ id, name: "My nurture", status: "paused" });
    expect(got!.definition.steps).toHaveLength(0);
  });

  it("saveJourney persists the whole definition, name, and status", async () => {
    const id = await repo.createJourney("Draft");
    const definition: JourneyDefinition = {
      entryStepKey: "s1",
      sourceSegmentIds: [],
      steps: [
        { ...newJourneyStep("send", "s1"), next: "s2", templateId: "tpl_x" },
        newJourneyStep("exit", "s2"),
      ],
    };
    await repo.saveJourney(id, { name: "Live nurture", status: "active", definition });

    const got = await repo.getJourney(id);
    expect(got).toMatchObject({ name: "Live nurture", status: "active" });
    expect(got!.definition.steps.map((s) => s.key)).toEqual(["s1", "s2"]);
    expect(got!.summary.sendCount).toBe(1);
  });

  it("saveJourney on an unknown id is a no-op (does not throw)", async () => {
    await expect(
      repo.saveJourney("nope", {
        name: "x",
        status: "paused",
        definition: { steps: [], entryStepKey: null, sourceSegmentIds: [] },
      }),
    ).resolves.toBeUndefined();
  });
});
