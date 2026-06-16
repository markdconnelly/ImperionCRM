import { describe, expect, it } from "vitest";
import { cardEngagement, initialsOf } from "./card-engagement";
import type { WorkAssignmentRow } from "@/types";

/**
 * Rich-card engagement derivation for the kanban remainder (#608 C1-F4, ADR-0066).
 * Pure shaping of two board-only bulk reads — the assignee avatar cap/overflow and
 * the comment/attachment count footer. No DOM, no pg. Honest degradation: absent
 * data → nothing shown, never a fabricated count.
 */
const person = (userId: string, name: string, role: WorkAssignmentRow["role"] = "assignee"): WorkAssignmentRow => ({
  userId,
  name,
  role,
});

describe("initialsOf", () => {
  it("takes first+last initial of a multi-part name", () => {
    expect(initialsOf("Ada Lovelace")).toBe("AL");
    expect(initialsOf("Grace Brewster Hopper")).toBe("GH");
  });
  it("takes the first two letters of a single-word name", () => {
    expect(initialsOf("Edsger")).toBe("ED");
  });
  it("falls back to ? for an empty / whitespace name", () => {
    expect(initialsOf("   ")).toBe("?");
  });
});

describe("cardEngagement", () => {
  it("shows nothing when there are no assignees and no counts", () => {
    const meta = cardEngagement(undefined, undefined);
    expect(meta.showAvatars).toBe(false);
    expect(meta.showCounts).toBe(false);
    expect(meta.shown).toEqual([]);
    expect(meta.overflow).toBe(0);
  });

  it("shows every avatar with no overflow up to the cap", () => {
    const meta = cardEngagement([person("1", "A B"), person("2", "C D"), person("3", "E F")], undefined);
    expect(meta.showAvatars).toBe(true);
    expect(meta.shown).toHaveLength(3);
    expect(meta.overflow).toBe(0);
  });

  it("caps the avatars at 3 and rolls the rest into overflow", () => {
    const people = ["1", "2", "3", "4", "5"].map((id) => person(id, `User ${id}`));
    const meta = cardEngagement(people, undefined);
    expect(meta.shown).toHaveLength(3);
    expect(meta.overflow).toBe(2);
  });

  it("keeps the primary first (caller orders it; the slice preserves order)", () => {
    const meta = cardEngagement(
      [person("1", "Owner", "primary"), person("2", "Helper")],
      undefined,
    );
    expect(meta.shown[0].role).toBe("primary");
  });

  it("surfaces non-zero counts and flags the footer", () => {
    const meta = cardEngagement(undefined, { comments: 3, attachments: 1 });
    expect(meta.comments).toBe(3);
    expect(meta.attachments).toBe(1);
    expect(meta.showCounts).toBe(true);
  });

  it("treats 0/0 counts as nothing to show", () => {
    const meta = cardEngagement(undefined, { comments: 0, attachments: 0 });
    expect(meta.showCounts).toBe(false);
  });

  it("shows the footer when only one of the two counts is non-zero", () => {
    expect(cardEngagement(undefined, { comments: 0, attachments: 2 }).showCounts).toBe(true);
    expect(cardEngagement(undefined, { comments: 5, attachments: 0 }).showCounts).toBe(true);
  });
});
