import { describe, expect, it } from "vitest";
import { mockRepositories } from "./mock-repositories";

/**
 * Behaviour tests for the mock custom-fields repository (ADR-0065 B4, #338): the
 * in-memory definition + value store used in mock mode. Covers scoping (a
 * project-type-scoped field appears only on that type + global), the
 * select-options gate, value upsert/clear, and that a form read includes
 * unanswered fields. The mock store is module-level singleton state; each test
 * uses unique keys/ids so it does not collide with the others.
 */
const cf = mockRepositories.customFields;

describe("mock custom fields — definitions + scoping", () => {
  it("a project-type-scoped field appears on that type and not another (B4 acceptance)", async () => {
    const risk = await cf.createFieldDef({
      scope: "project",
      projectTypeId: "pt-impl",
      key: "risk_level_acc",
      label: "Risk level",
      fieldType: "single_select",
      options: ["Low", "High"],
      required: false,
      ordinal: 0,
    });

    const onImpl = await cf.listFieldDefsFor("project", "pt-impl");
    expect(onImpl.some((d) => d.id === risk.id)).toBe(true);

    const onOther = await cf.listFieldDefsFor("project", "pt-onboarding");
    expect(onOther.some((d) => d.id === risk.id)).toBe(false);
  });

  it("a global (null) project field appears for every project type", async () => {
    const g = await cf.createFieldDef({
      scope: "project",
      projectTypeId: null,
      key: "global_field",
      label: "Global",
      fieldType: "text",
      options: [],
      required: false,
      ordinal: 1,
    });
    const onAny = await cf.listFieldDefsFor("project", "pt-anything");
    expect(onAny.some((d) => d.id === g.id)).toBe(true);
  });

  it("a task field is never project-type-scoped and drops select options for non-select types", async () => {
    const t = await cf.createFieldDef({
      scope: "task",
      projectTypeId: "pt-impl", // ignored for a task
      key: "task_note",
      label: "Task note",
      fieldType: "text",
      options: ["ignored"], // ignored for a non-select type
      required: false,
      ordinal: 0,
    });
    expect(t.projectTypeId).toBeNull();
    expect(t.options).toEqual([]);
  });

  it("deleteFieldDef removes the def and cascades its values", async () => {
    const d = await cf.createFieldDef({
      scope: "task",
      projectTypeId: null,
      key: "to_delete",
      label: "Doomed",
      fieldType: "text",
      options: [],
      required: false,
      ordinal: 0,
    });
    await cf.setValue({ fieldId: d.id, parentType: "task", parentId: "task-x", value: "hi" });
    expect(await cf.deleteFieldDef(d.id)).toBe(true);
    const vals = await cf.listValuesFor("task", "task-x", null);
    expect(vals.some((v) => v.fieldId === d.id)).toBe(false);
  });
});

describe("mock custom fields — values", () => {
  it("listValuesFor returns every applicable field, unanswered ones as null", async () => {
    const d = await cf.createFieldDef({
      scope: "project",
      projectTypeId: "pt-vals",
      key: "owner_val",
      label: "Owner",
      fieldType: "text",
      options: [],
      required: false,
      ordinal: 0,
    });
    const before = await cf.listValuesFor("project", "proj-1", "pt-vals");
    expect(before.find((v) => v.fieldId === d.id)?.value).toBeNull();

    await cf.setValue({ fieldId: d.id, parentType: "project", parentId: "proj-1", value: "Ada" });
    const after = await cf.listValuesFor("project", "proj-1", "pt-vals");
    expect(after.find((v) => v.fieldId === d.id)?.value).toBe("Ada");
  });

  it("setValue with null clears the stored value", async () => {
    const d = await cf.createFieldDef({
      scope: "task",
      projectTypeId: null,
      key: "clearable",
      label: "Clearable",
      fieldType: "text",
      options: [],
      required: false,
      ordinal: 0,
    });
    await cf.setValue({ fieldId: d.id, parentType: "task", parentId: "task-c", value: "x" });
    await cf.setValue({ fieldId: d.id, parentType: "task", parentId: "task-c", value: null });
    const vals = await cf.listValuesFor("task", "task-c", null);
    expect(vals.find((v) => v.fieldId === d.id)?.value).toBeNull();
  });
});

describe("mock custom fields — batched column read + reporting filter (#714)", () => {
  it("listValuesForMany returns only answered values, keyed by parent (no N+1)", async () => {
    const d = await cf.createFieldDef({
      scope: "task",
      projectTypeId: null,
      key: "many_note",
      label: "Note",
      fieldType: "text",
      options: [],
      required: false,
      ordinal: 0,
    });
    await cf.setValue({ fieldId: d.id, parentType: "task", parentId: "t-a", value: "alpha" });
    // t-b has no value → it must NOT appear in the map (honest degradation).
    const map = await cf.listValuesForMany("task", ["t-a", "t-b"]);
    expect(map["t-a"]?.[0]).toMatchObject({ key: "many_note", value: "alpha" });
    expect(map["t-b"]).toBeUndefined();
  });

  it("listValuesForMany narrows to the requested field keys", async () => {
    const a = await cf.createFieldDef({
      scope: "task", projectTypeId: null, key: "k_keep", label: "Keep",
      fieldType: "text", options: [], required: false, ordinal: 0,
    });
    const b = await cf.createFieldDef({
      scope: "task", projectTypeId: null, key: "k_drop", label: "Drop",
      fieldType: "text", options: [], required: false, ordinal: 1,
    });
    await cf.setValue({ fieldId: a.id, parentType: "task", parentId: "t-k", value: "yes" });
    await cf.setValue({ fieldId: b.id, parentType: "task", parentId: "t-k", value: "no" });
    const map = await cf.listValuesForMany("task", ["t-k"], ["k_keep"]);
    expect(map["t-k"].map((e) => e.key)).toEqual(["k_keep"]);
  });

  it("filterByCustomField matches an eq scalar within the (scope, type) field group (B4 AC)", async () => {
    const risk = await cf.createFieldDef({
      scope: "project", projectTypeId: "pt-impl-714", key: "risk_714", label: "Risk",
      fieldType: "single_select", options: ["Low", "High"], required: false, ordinal: 0,
    });
    await cf.setValue({ fieldId: risk.id, parentType: "project", parentId: "p-hi", value: "High" });
    await cf.setValue({ fieldId: risk.id, parentType: "project", parentId: "p-lo", value: "Low" });
    const hits = await cf.filterByCustomField({
      scope: "project", projectTypeId: "pt-impl-714", fieldKey: "risk_714", op: "eq", value: "High",
    });
    expect(hits).toEqual(["p-hi"]);
  });

  it("filterByCustomField with contains matches a multi-select member", async () => {
    const tags = await cf.createFieldDef({
      scope: "project", projectTypeId: null, key: "ms_714", label: "Areas",
      fieldType: "multi_select", options: ["net", "sec"], required: false, ordinal: 0,
    });
    await cf.setValue({ fieldId: tags.id, parentType: "project", parentId: "p-ms", value: ["net", "sec"] });
    const hits = await cf.filterByCustomField({
      scope: "project", projectTypeId: null, fieldKey: "ms_714", op: "contains", value: "sec",
    });
    expect(hits).toEqual(["p-ms"]);
  });
});
