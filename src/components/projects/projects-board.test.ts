import { describe, expect, it } from "vitest";
import { projectCardMeta } from "./projects-board";
import type { AppliedTag, ProjectRow } from "@/types";

/**
 * Rich-card derivation for the projects kanban (#439 C1-F4, ADR-0066). Pure
 * shaping over the project read model + the tag map (ADR-0065 B6); projects carry
 * no subtask rollup. No DOM, no pg.
 */
function project(over: Partial<ProjectRow> & { id: string }): ProjectRow {
  return {
    name: "Project",
    account: "Acme",
    opportunity: null,
    type: "Onboarding",
    typeKey: "onboarding",
    owner: null,
    status: "in_progress",
    targetLive: null,
    ...over,
  };
}

const tag = (id: string, label: string): AppliedTag => ({ id, label, color: "green" });

describe("projectCardMeta", () => {
  it("hides the owner line when the project is unowned", () => {
    expect(projectCardMeta(project({ id: "p1" }), {}).showOwner).toBe(false);
  });

  it("shows the owner line when an owner is set", () => {
    expect(projectCardMeta(project({ id: "p1", owner: "Dana" }), {}).showOwner).toBe(true);
  });

  it("returns the project's tag chips, empty when none apply", () => {
    const tags = { p1: [tag("a", "priority")] };
    expect(projectCardMeta(project({ id: "p1" }), tags).tags).toHaveLength(1);
    expect(projectCardMeta(project({ id: "p2" }), tags).tags).toEqual([]);
  });
});
