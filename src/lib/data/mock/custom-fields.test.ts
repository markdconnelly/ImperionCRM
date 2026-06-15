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
