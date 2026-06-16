import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam and exercise the intake-form data layer (ADR-0070
// E3, migration 0111, #354) against a fake pg pool — the list/get SQL + mapping,
// the create INSERT, and the submit transaction's field → task mapping. Same
// pattern as project-template.test.ts.
const { query, connect, clientQuery, getPool } = vi.hoisted(() => {
  const clientQuery = vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [{ id: "new-id" }] }),
  );
  const release = vi.fn();
  const query = vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>>(
    async () => ({ rows: [], rowCount: 0 }),
  );
  const connect = vi.fn(async () => ({ query: clientQuery, release }));
  const getPool = vi.fn((): unknown => ({ query, connect }));
  return { query, connect, clientQuery, release, getPool };
});
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { postgresRepositories } from "./postgres-repositories";

const crm = postgresRepositories.crm;

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query, connect });
  query.mockResolvedValue({ rows: [], rowCount: 0 });
  clientQuery.mockResolvedValue({ rows: [{ id: "new-id" }] });
});

describe("listIntakeForms (ADR-0070 E3, #354)", () => {
  it("counts fields + submissions and maps to camelCase", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "f1",
          key: "new_client_request",
          name: "New client request",
          description: null,
          default_project_name: "Acme Onboarding",
          default_category: "project",
          is_active: true,
          field_count: "3",
          submission_count: "5",
        },
      ],
    });
    const out = await crm.listIntakeForms();
    expect((query.mock.calls[0][0] as string)).toMatch(/jsonb_array_length\(f\.fields\)/);
    expect(out[0]).toEqual({
      id: "f1",
      key: "new_client_request",
      name: "New client request",
      description: null,
      defaultProjectName: "Acme Onboarding",
      defaultCategory: "project",
      isActive: true,
      fieldCount: 3,
      submissionCount: 5,
    });
  });
});

describe("getIntakeForm (ADR-0070 E3)", () => {
  it("returns the form with its fields + routing defaults", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "f1",
          key: "ncr",
          name: "New client request",
          description: "desc",
          fields: [{ key: "summary", label: "Summary", type: "text", required: true, options: [], mapsTo: "title" }],
          default_project_id: "p1",
          default_account_id: null,
          default_owner_user_id: null,
          default_category: "general",
          is_active: true,
          default_project_name: "Acme",
          default_account_name: null,
          default_owner_name: null,
        },
      ],
    });
    const out = await crm.getIntakeForm("f1");
    expect(out?.fields).toHaveLength(1);
    expect(out?.fields[0].mapsTo).toBe("title");
    expect(out?.defaultProjectName).toBe("Acme");
  });

  it("returns null when the form does not exist", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await crm.getIntakeForm("nope")).toBeNull();
  });
});

describe("createIntakeForm", () => {
  it("inserts the form with its fields serialized to jsonb", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: "new-id" }] });
    const id = await crm.createIntakeForm({
      key: "ncr",
      name: "New client request",
      description: null,
      fields: [{ key: "summary", label: "Summary", type: "text", required: true, options: [], mapsTo: "title" }],
      defaultProjectId: "p1",
      defaultAccountId: null,
      defaultOwnerUserId: null,
      defaultCategory: "general",
      isActive: true,
    });
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("INSERT INTO intake_form");
    const params = query.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe("ncr");
    expect(JSON.parse(params[3] as string)[0].mapsTo).toBe("title");
    expect(id).toBe("new-id");
  });
});

describe("updateIntakeForm (in-place edit, ADR-0070 E3, #639)", () => {
  const input = {
    key: "ncr", // present, but the UPDATE must NOT change the column
    name: "New client request v2",
    description: "updated",
    fields: [{ key: "summary", label: "Summary", type: "text" as const, required: true, options: [], mapsTo: "title" as const }],
    defaultProjectId: "p1",
    defaultAccountId: null,
    defaultOwnerUserId: null,
    defaultCategory: "project",
    isActive: false,
  };

  it("patches the row in place without touching id or key (preserves submissions)", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await crm.updateIntakeForm("f1", input);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("UPDATE intake_form");
    // The stable `key` and id must survive an edit — the SET clause never re-keys.
    expect(sql).not.toMatch(/SET[\s\S]*\bkey\s*=/);
    const params = query.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe("f1"); // WHERE id = $1
    expect(params[1]).toBe("New client request v2");
    expect(JSON.parse(params[3] as string)[0].mapsTo).toBe("title");
    expect(params[7]).toBe("project"); // default_category
    expect(params[8]).toBe(false); // is_active toggle is honored
  });

  it("throws when the form does not exist (rowCount 0)", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(crm.updateIntakeForm("gone", input)).rejects.toThrow(/not found/i);
  });
});

describe("deleteIntakeForm", () => {
  it("deletes by id (CASCADE drops submissions)", async () => {
    await crm.deleteIntakeForm("f1");
    expect((query.mock.calls[0][0] as string)).toMatch(/DELETE FROM intake_form WHERE id = \$1/);
    expect(query.mock.calls[0][1]).toEqual(["f1"]);
  });
});

describe("submitIntakeForm (transaction + field → task mapping, ADR-0070 E3)", () => {
  it("maps title/detail/note/due_at onto a task routed to the form defaults", async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            name: "New client request",
            fields: [
              { key: "summary", label: "Summary", type: "text", required: true, options: [], mapsTo: "title" },
              { key: "details", label: "Details", type: "textarea", required: false, options: [], mapsTo: "detail" },
              { key: "when", label: "When", type: "date", required: false, options: [], mapsTo: "due_at" },
              { key: "extra", label: "Extra", type: "text", required: false, options: [], mapsTo: "note" },
            ],
            default_project_id: "p1",
            default_account_id: "a1",
            default_owner_user_id: "u1",
            default_category: "project",
          },
        ],
      }) // SELECT form
      .mockResolvedValueOnce({ rows: [{ id: "task-1" }] }) // INSERT task
      .mockResolvedValueOnce({ rows: [{ id: "sub-1" }] }); // INSERT submission

    const out = await crm.submitIntakeForm(
      "f1",
      { summary: "Fix printer", details: "It is broken", when: "2026-07-01", extra: "urgent" },
      "actor-1",
    );

    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls).toContain("BEGIN");
    expect(sqls).toContain("COMMIT");
    const taskCall = clientQuery.mock.calls.find((c) => (c[0] as string).includes("INSERT INTO task"))!;
    const p = taskCall[1] as unknown[];
    // [account_id, title, detail, category, due_at, project_id, owner_user_id]
    expect(p[0]).toBe("a1");
    expect(p[1]).toBe("Fix printer");
    expect(p[2]).toBe("It is broken\n\nExtra: urgent");
    expect(p[3]).toBe("project");
    expect(p[4]).toBe("2026-07-01");
    expect(p[5]).toBe("p1");
    expect(p[6]).toBe("u1");
    expect(out).toEqual({ taskId: "task-1", submissionId: "sub-1" });
  });

  it("falls back to the form name when no title field is filled", async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            name: "Fallback form",
            fields: [{ key: "summary", label: "Summary", type: "text", required: false, options: [], mapsTo: "title" }],
            default_project_id: null,
            default_account_id: null,
            default_owner_user_id: null,
            default_category: "general",
          },
        ],
      }) // SELECT form
      .mockResolvedValueOnce({ rows: [{ id: "task-2" }] }) // INSERT task
      .mockResolvedValueOnce({ rows: [{ id: "sub-2" }] }); // INSERT submission
    await crm.submitIntakeForm("f1", {}, null);
    const taskCall = clientQuery.mock.calls.find((c) => (c[0] as string).includes("INSERT INTO task"))!;
    expect((taskCall[1] as unknown[])[1]).toBe("Fallback form");
  });

  it("rolls back and throws when the form is missing", async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // SELECT form → none
    await expect(crm.submitIntakeForm("gone", {}, null)).rejects.toThrow(/not found/i);
    expect(clientQuery.mock.calls.map((c) => c[0] as string)).toContain("ROLLBACK");
  });
});
