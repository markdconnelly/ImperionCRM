import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam and exercise the project-template data layer
// (ADR-0070 E1, migration 0109, #352) against a fake pg pool — SQL shape, the
// payload→item mapping, the create transaction, the protected-delete guard, and
// the instantiate snapshot. Same pattern as delivery-templates.test.ts.
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

describe("listProjectTemplates (ADR-0070 E1, #352)", () => {
  it("a project-type filter matches templates bound to that type OR unbound", async () => {
    await crm.listProjectTemplates({ projectTypeId: "pt-1" });
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("pt.project_type_id = $1 OR pt.project_type_id IS NULL");
    expect(query.mock.calls[0][1]).toEqual(["pt-1"]);
  });

  it("orders protected first and maps counts to numbers", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "t1",
          key: "implementation",
          name: "Implementation",
          description: null,
          project_type_id: null,
          project_type_name: null,
          is_protected: false,
          milestone_count: "4",
          item_count: "9",
        },
      ],
    });
    const out = await crm.listProjectTemplates();
    expect((query.mock.calls[0][0] as string)).toMatch(/ORDER BY pt\.is_protected DESC/);
    expect(out[0]).toEqual({
      id: "t1",
      key: "implementation",
      name: "Implementation",
      description: null,
      projectTypeId: null,
      projectTypeName: null,
      isProtected: false,
      milestoneCount: 4,
      itemCount: 9,
    });
  });
});

describe("getProjectTemplate (ADR-0070 E1)", () => {
  it("flattens the tree and lifts title/offset/duration out of payload", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "t1",
          key: "impl",
          name: "Implementation",
          description: "desc",
          project_type_id: null,
          project_type_name: null,
          is_protected: false,
        },
      ],
    });
    query.mockResolvedValueOnce({
      rows: [
        { id: "m1", parent_id: null, kind: "milestone", ordinal: 0, payload: { name: "Discovery", offsetDays: 0, durationDays: 7 } },
        { id: "i1", parent_id: "m1", kind: "task", ordinal: 0, payload: { title: "Kickoff", offsetDays: 1, durationDays: 2 } },
      ],
    });
    const out = await crm.getProjectTemplate("t1");
    expect((query.mock.calls[1][0] as string)).toMatch(/ORDER BY parent_id NULLS FIRST, ordinal/);
    expect(out?.items).toEqual([
      { id: "m1", parentId: null, kind: "milestone", ordinal: 0, title: "Discovery", offsetDays: 0, durationDays: 7 },
      { id: "i1", parentId: "m1", kind: "task", ordinal: 0, title: "Kickoff", offsetDays: 1, durationDays: 2 },
    ]);
  });

  it("returns null when the template does not exist", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await crm.getProjectTemplate("nope")).toBeNull();
  });
});

describe("createProjectTemplate (transaction)", () => {
  it("inserts the template then a milestone and its child items as template_item rows", async () => {
    const id = await crm.createProjectTemplate({
      key: "impl",
      name: "Implementation",
      description: null,
      projectTypeId: null,
      milestones: [
        { name: "Discovery", offsetDays: 0, durationDays: 7, items: [{ kind: "task", title: "Kickoff", offsetDays: 0, durationDays: 1 }] },
      ],
    });
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls).toContain("BEGIN");
    expect(sqls.some((s) => s.includes("INSERT INTO project_template"))).toBe(true);
    expect(sqls.filter((s) => s.includes("INSERT INTO template_item")).length).toBe(2); // milestone + child
    expect(sqls).toContain("COMMIT");
    expect(id).toBe("new-id");
  });
});

describe("deleteProjectTemplate", () => {
  it("refuses a protected default (no row deleted → throws)", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(crm.deleteProjectTemplate("protected-id")).rejects.toThrow(/protected/i);
    expect((query.mock.calls[0][0] as string)).toMatch(/is_protected = false/);
  });

  it("deletes a non-protected template", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(crm.deleteProjectTemplate("t1")).resolves.toBeUndefined();
  });
});

describe("instantiateProjectTemplate (snapshot, ADR-0070 E1)", () => {
  it("snapshots a generic template into project + milestone + task in one transaction", async () => {
    // getProjectTemplate: template row (not protected) + its items.
    query.mockResolvedValueOnce({
      rows: [{ id: "t1", key: "impl", name: "Implementation", description: null, project_type_id: null, project_type_name: null, is_protected: false }],
    });
    query.mockResolvedValueOnce({
      rows: [
        { id: "m1", parent_id: null, kind: "milestone", ordinal: 0, payload: { name: "Discovery", offsetDays: 0, durationDays: 7 } },
        { id: "i1", parent_id: "m1", kind: "task", ordinal: 0, payload: { title: "Kickoff", offsetDays: 0, durationDays: 1 } },
      ],
    });
    const projectId = await crm.instantiateProjectTemplate({
      projectTemplateId: "t1",
      accountId: "acc-1",
      name: "Acme Implementation",
      projectTypeId: "pt-1",
      startDate: "2026-07-01",
    });
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls.some((s) => s.includes("INSERT INTO project "))).toBe(true);
    expect(sqls.some((s) => s.includes("INSERT INTO project_milestone"))).toBe(true);
    expect(sqls.some((s) => s.includes("INSERT INTO task "))).toBe(true);
    expect(projectId).toBe("new-id");
  });

  it("throws when the template is missing", async () => {
    query.mockResolvedValueOnce({ rows: [] }); // getProjectTemplate → null
    await expect(
      crm.instantiateProjectTemplate({
        projectTemplateId: "gone",
        accountId: "acc-1",
        name: "X",
        projectTypeId: "pt-1",
        startDate: "2026-07-01",
      }),
    ).rejects.toThrow(/not found/i);
  });
});
