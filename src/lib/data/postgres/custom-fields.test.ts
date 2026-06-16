import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the custom-field definition + polymorphic value
// SQL shape and row mapping (ADR-0065 B4, #338) are exercised against a fake pg
// pool. Same pattern as tags.test.ts / saved-views.test.ts.
const { query, connect, client, getPool } = vi.hoisted(() => {
  const client = {
    query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>>(
      async () => ({ rows: [], rowCount: 0 }),
    ),
    release: vi.fn(),
  };
  const query = vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>>(
    async () => ({ rows: [], rowCount: 0 }),
  );
  const connect = vi.fn(async () => client);
  return {
    client,
    query,
    connect,
    getPool: vi.fn((): unknown => ({ query, connect })),
  };
});
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { postgresRepositories } from "./postgres-repositories";

const cf = postgresRepositories.customFields;

const defRow = {
  id: "f1",
  scope: "project",
  project_type_id: "pt-impl",
  project_type_name: "Implementation",
  key: "risk_level",
  label: "Risk level",
  field_type: "single_select",
  options: ["Low", "Medium", "High"],
  required: true,
  ordinal: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query, connect });
  query.mockResolvedValue({ rows: [], rowCount: 0 });
  client.query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe("custom fields repository (ADR-0065 B4, #338)", () => {
  it("listFieldDefs maps rows + resolves the project-type name", async () => {
    query.mockResolvedValueOnce({ rows: [defRow] });
    const out = await cf.listFieldDefs();
    expect(out).toEqual([
      {
        id: "f1",
        scope: "project",
        projectTypeId: "pt-impl",
        projectTypeName: "Implementation",
        key: "risk_level",
        label: "Risk level",
        fieldType: "single_select",
        options: ["Low", "Medium", "High"],
        required: true,
        ordinal: 0,
      },
    ]);
  });

  it("listFieldDefsFor includes global (NULL) + the project-type's fields", async () => {
    query.mockResolvedValueOnce({ rows: [defRow] });
    await cf.listFieldDefsFor("project", "pt-impl");
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/project_type_id IS NULL OR d\.project_type_id = \$2::uuid/);
    expect(params).toEqual(["project", "pt-impl"]);
  });

  it("createFieldDef stores options only for select types and trims key/label", async () => {
    query.mockResolvedValueOnce({ rows: [defRow] });
    await cf.createFieldDef({
      scope: "project",
      projectTypeId: "pt-impl",
      key: "  risk_level  ",
      label: "  Risk level  ",
      fieldType: "single_select",
      options: ["Low", "Medium", "High"],
      required: true,
      ordinal: 0,
    });
    const params = query.mock.calls[0][1] as unknown[];
    expect(params[2]).toBe("risk_level"); // key trimmed
    expect(params[3]).toBe("Risk level"); // label trimmed
    expect(params[5]).toBe(JSON.stringify(["Low", "Medium", "High"]));
  });

  it("createFieldDef forces a non-select field's options to [] and a task field's type to null", async () => {
    query.mockResolvedValueOnce({ rows: [{ ...defRow, scope: "task", project_type_id: null, project_type_name: null, field_type: "text", options: [] }] });
    await cf.createFieldDef({
      scope: "task",
      projectTypeId: "pt-ignored", // a task field is never type-scoped
      key: "owner_note",
      label: "Owner note",
      fieldType: "text",
      options: ["bogus"], // ignored for a non-select type
      required: false,
      ordinal: 1,
    });
    const params = query.mock.calls[0][1] as unknown[];
    expect(params[1]).toBeNull(); // task → project_type_id null
    expect(params[5]).toBe(JSON.stringify([])); // non-select → []
  });

  it("updateFieldDef returns null when the id is gone", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const out = await cf.updateFieldDef("missing", {
      scope: "task",
      projectTypeId: null,
      key: "k",
      label: "L",
      fieldType: "text",
      options: [],
      required: false,
      ordinal: 0,
    });
    expect(out).toBeNull();
  });

  it("deleteFieldDef returns true when a row was removed (values cascade)", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    expect(await cf.deleteFieldDef("f1")).toBe(true);
    expect(query.mock.calls[0][0]).toMatch(/DELETE FROM custom_field_def/);
  });

  it("listValuesFor LEFT JOINs so unanswered fields still appear (value null)", async () => {
    query.mockResolvedValueOnce({
      rows: [
        { field_id: "f1", key: "risk_level", label: "Risk level", field_type: "single_select", options: ["Low", "High"], required: true, value: "High" },
        { field_id: "f2", key: "notes", label: "Notes", field_type: "text", options: null, required: false, value: null },
      ],
    });
    const out = await cf.listValuesFor("project", "proj-1", "pt-impl");
    expect(out[0].value).toBe("High");
    expect(out[1]).toEqual({
      fieldId: "f2", key: "notes", label: "Notes", fieldType: "text", options: [], required: false, value: null,
    });
    expect(query.mock.calls[0][0]).toMatch(/LEFT JOIN custom_field_value/);
  });

  it("setValue upserts JSON on the PK for a present value", async () => {
    await cf.setValue({ fieldId: "f1", parentType: "project", parentId: "proj-1", value: ["a", "b"] });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO custom_field_value/);
    expect(sql).toMatch(/ON CONFLICT \(field_id, parent_type, parent_id\)/);
    expect(params).toEqual(["f1", "project", "proj-1", JSON.stringify(["a", "b"])]);
  });

  it("setValue DELETEs the row when the value is cleared (null or empty array)", async () => {
    await cf.setValue({ fieldId: "f1", parentType: "project", parentId: "proj-1", value: null });
    expect(query.mock.calls[0][0]).toMatch(/DELETE FROM custom_field_value/);
    query.mockClear();
    await cf.setValue({ fieldId: "f1", parentType: "task", parentId: "t-1", value: [] });
    expect(query.mock.calls[0][0]).toMatch(/DELETE FROM custom_field_value/);
  });

  it("listValuesForMany short-circuits to {} for an empty id list (no query)", async () => {
    const out = await cf.listValuesForMany("task", []);
    expect(out).toEqual({});
    expect(query).not.toHaveBeenCalled();
  });

  it("listValuesForMany INNER JOINs the value table and buckets rows by parent", async () => {
    query.mockResolvedValueOnce({
      rows: [
        { parent_id: "t-a", field_id: "f1", key: "risk_level", label: "Risk level", field_type: "single_select", value: "High" },
        { parent_id: "t-a", field_id: "f2", key: "notes", label: "Notes", field_type: "text", value: "hi" },
        { parent_id: "t-b", field_id: "f1", key: "risk_level", label: "Risk level", field_type: "single_select", value: "Low" },
      ],
    });
    const map = await cf.listValuesForMany("task", ["t-a", "t-b"]);
    expect(query.mock.calls[0][0]).toMatch(/JOIN custom_field_def d ON d\.id = v\.field_id/);
    expect(map["t-a"]).toHaveLength(2);
    expect(map["t-b"][0]).toMatchObject({ key: "risk_level", value: "Low" });
  });

  it("listValuesForMany adds the key filter only when fieldKeys is non-empty", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await cf.listValuesForMany("task", ["t-a"], ["risk_level"]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/d\.key = ANY\(\$3::text\[\]\)/);
    expect(params).toEqual(["task", ["t-a"], ["risk_level"]]);
  });

  it("filterByCustomField eq matches the scalar over the GIN index within the field group", async () => {
    query.mockResolvedValueOnce({ rows: [{ parent_id: "p-hi" }] });
    const ids = await cf.filterByCustomField({
      scope: "project", projectTypeId: "pt-impl", fieldKey: "risk_level", op: "eq", value: "High",
    });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/v\.value = \$4::jsonb/);
    expect(params).toEqual(["project", "risk_level", "pt-impl", JSON.stringify("High")]);
    expect(ids).toEqual(["p-hi"]);
  });

  it("filterByCustomField contains wraps the value as a jsonb array for @>", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await cf.filterByCustomField({
      scope: "project", projectTypeId: null, fieldKey: "areas", op: "contains", value: "sec",
    });
    const sql = query.mock.calls[0][0];
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toMatch(/v\.value @> \$4::jsonb/);
    expect(params[3]).toBe(JSON.stringify(["sec"]));
    // a null projectTypeId matches the global field
    expect(params[2]).toBeNull();
  });
});
