import { describe, expect, test } from "vitest";
import {
  MAX_SAVED_VIEWS,
  isViewSaved,
  normalizeQuery,
  parseSavedViews,
  removeSavedView,
  savedViewHref,
  serializeSavedViews,
  upsertSavedView,
  type SavedTaskView,
} from "@/lib/task-views";

describe("normalizeQuery (#344 — canonical filter-state comparison)", () => {
  test("strips a leading ? and trims", () => {
    expect(normalizeQuery("?view=board")).toBe("view=board");
    expect(normalizeQuery("  view=board  ")).toBe("view=board");
  });

  test("empty / null-ish inputs collapse to the empty default view", () => {
    expect(normalizeQuery("")).toBe("");
    expect(normalizeQuery("?")).toBe("");
    expect(normalizeQuery(undefined as unknown as string)).toBe("");
  });

  test("key order is canonicalised so equivalent filter sets compare equal", () => {
    expect(normalizeQuery("view=board&category=project")).toBe(
      normalizeQuery("category=project&view=board"),
    );
  });
});

describe("parseSavedViews (#344 — a corrupt store must never throw)", () => {
  test("null / malformed JSON / non-array yield []", () => {
    expect(parseSavedViews(null)).toEqual([]);
    expect(parseSavedViews("not json")).toEqual([]);
    expect(parseSavedViews('{"name":"x"}')).toEqual([]);
  });

  test("drops nameless or non-object entries and normalises queries", () => {
    const raw = JSON.stringify([
      { name: "  My board ", query: "?view=board&category=project" },
      { name: "", query: "view=list" },
      { query: "orphan" },
      42,
    ]);
    expect(parseSavedViews(raw)).toEqual([
      { name: "My board", query: "category=project&view=board" },
    ]);
  });

  test("dedupes by case-insensitive name, keeping the first", () => {
    const raw = JSON.stringify([
      { name: "Mine", query: "view=board" },
      { name: "mine", query: "view=list" },
    ]);
    const out = parseSavedViews(raw);
    expect(out).toHaveLength(1);
    expect(out[0].query).toBe("view=board");
  });

  test("caps the parsed list at MAX_SAVED_VIEWS", () => {
    const raw = JSON.stringify(
      Array.from({ length: MAX_SAVED_VIEWS + 5 }, (_, i) => ({ name: `v${i}`, query: "" })),
    );
    expect(parseSavedViews(raw)).toHaveLength(MAX_SAVED_VIEWS);
  });
});

describe("upsertSavedView (#344 — save & replace)", () => {
  test("appends a new view", () => {
    const out = upsertSavedView([], "Project board", "view=board&category=project");
    expect(out).toEqual([{ name: "Project board", query: "category=project&view=board" }]);
  });

  test("replaces by case-insensitive name in place", () => {
    const start: SavedTaskView[] = [
      { name: "A", query: "view=list" },
      { name: "Board", query: "view=board" },
    ];
    const out = upsertSavedView(start, "board", "view=board&group=category");
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual({ name: "board", query: "group=category&view=board" });
    expect(out[0]).toBe(start[0]); // untouched
  });

  test("rejects an empty/whitespace name (list unchanged)", () => {
    const start: SavedTaskView[] = [{ name: "A", query: "" }];
    expect(upsertSavedView(start, "   ", "view=board")).toBe(start);
  });

  test("drops a brand-new view past the cap, but still allows replacement", () => {
    const full = Array.from({ length: MAX_SAVED_VIEWS }, (_, i) => ({ name: `v${i}`, query: "" }));
    expect(upsertSavedView(full, "new", "view=board")).toBe(full);
    const replaced = upsertSavedView(full, "v0", "view=board");
    expect(replaced).toHaveLength(MAX_SAVED_VIEWS);
    expect(replaced[0].query).toBe("view=board");
  });
});

describe("removeSavedView (#344)", () => {
  test("removes by case-insensitive name, returning a new list", () => {
    const start: SavedTaskView[] = [
      { name: "Keep", query: "" },
      { name: "Drop", query: "view=board" },
    ];
    const out = removeSavedView(start, "drop");
    expect(out).toEqual([{ name: "Keep", query: "" }]);
    expect(out).not.toBe(start);
  });
});

describe("savedViewHref (#344)", () => {
  test("empty query → bare /tasks", () => {
    expect(savedViewHref("")).toBe("/tasks");
    expect(savedViewHref("?")).toBe("/tasks");
  });

  test("non-empty query → /tasks?<canonical>", () => {
    expect(savedViewHref("view=board&category=project")).toBe(
      "/tasks?category=project&view=board",
    );
  });
});

describe("isViewSaved (#344 — order-insensitive match)", () => {
  test("matches regardless of key order or leading ?", () => {
    const views: SavedTaskView[] = [{ name: "B", query: "category=project&view=board" }];
    expect(isViewSaved(views, "?view=board&category=project")).toBe(true);
    expect(isViewSaved(views, "view=list")).toBe(false);
  });

  test("the default empty view matches an empty saved query", () => {
    expect(isViewSaved([{ name: "Default", query: "" }], "")).toBe(true);
  });
});

describe("serializeSavedViews (#344 — round-trips through parse)", () => {
  test("serialize → parse is identity for clean data", () => {
    const views: SavedTaskView[] = [
      { name: "Board", query: "view=board" },
      { name: "List", query: "" },
    ];
    expect(parseSavedViews(serializeSavedViews(views))).toEqual(views);
  });
});
