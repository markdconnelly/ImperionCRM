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

describe("updateProjectTemplate (re-snapshot, ADR-0070 E1, #634)", () => {
  const input = {
    key: "impl",
    name: "Implementation v2",
    description: "updated",
    projectTypeId: null,
    milestones: [
      { name: "Discovery", offsetDays: 0, durationDays: 7, items: [{ kind: "task" as const, title: "Kickoff", offsetDays: 0, durationDays: 1 }] },
    ],
  };

  it("patches the header, drops old items, and re-inserts the tree in one transaction", async () => {
    // header UPDATE reports a row hit so the guard passes
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("UPDATE project_template")) return { rows: [], rowCount: 1 };
      return { rows: [{ id: "new-id" }] };
    });
    await crm.updateProjectTemplate("t1", input);
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls).toContain("BEGIN");
    expect(sqls.some((s) => s.includes("UPDATE project_template") && s.includes("is_protected = false"))).toBe(true);
    expect(sqls.some((s) => s.includes("DELETE FROM template_item"))).toBe(true);
    expect(sqls.filter((s) => s.includes("INSERT INTO template_item")).length).toBe(2); // milestone + child
    expect(sqls).toContain("COMMIT");
  });

  it("refuses a protected default (header UPDATE hits no row → rollback + throw)", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("UPDATE project_template")) return { rows: [], rowCount: 0 };
      return { rows: [{ id: "new-id" }] };
    });
    await expect(crm.updateProjectTemplate("protected-id", input)).rejects.toThrow(/protected/i);
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls).toContain("ROLLBACK");
    expect(sqls.some((s) => s.includes("DELETE FROM template_item"))).toBe(false);
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

// ── Task checklist templates (ADR-0070 E1-F3, #633) ─────────────────────────────
// Reuse the project_template / template_item tables (no migration); the accessors
// filter on the `checklist:` key prefix.
describe("listChecklistTemplates (ADR-0070 E1-F3, #633)", () => {
  it("filters to the checklist key prefix and maps item counts to numbers", async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: "c1", name: "Onboarding checks", description: null, item_count: "3" }],
    });
    const out = await crm.listChecklistTemplates();
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("WHERE pt.key LIKE $1");
    expect(query.mock.calls[0][1]).toEqual(["checklist:%"]);
    expect(out).toEqual([{ id: "c1", name: "Onboarding checks", description: null, itemCount: 3 }]);
  });
});

describe("getChecklistTemplate", () => {
  it("resolves only checklist-prefixed rows and lifts titles out of payload (ordered)", async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: "c1", name: "Onboarding checks", description: "desc" }],
    });
    query.mockResolvedValueOnce({
      rows: [{ payload: { title: "Create accounts" } }, { payload: { title: "Assign hardware" } }],
    });
    const out = await crm.getChecklistTemplate("c1");
    expect(query.mock.calls[0][1]).toEqual(["c1", "checklist:%"]);
    expect((query.mock.calls[1][0] as string)).toMatch(/ORDER BY ordinal/);
    expect(out).toEqual({
      id: "c1",
      name: "Onboarding checks",
      description: "desc",
      items: ["Create accounts", "Assign hardware"],
    });
  });

  it("returns null when the id is not a checklist template", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await crm.getChecklistTemplate("nope")).toBeNull();
  });
});

describe("createChecklistTemplate (transaction)", () => {
  it("inserts a checklist-prefixed project_template then a task item per trimmed line", async () => {
    const id = await crm.createChecklistTemplate({
      name: "Onboarding checks",
      description: null,
      items: ["Create accounts", "  ", "Assign hardware"], // blank dropped
    });
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls).toContain("BEGIN");
    expect(sqls.some((s) => s.includes("INSERT INTO project_template"))).toBe(true);
    // The project_template key carries the checklist prefix.
    const ptCall = clientQuery.mock.calls.find((c) => (c[0] as string).includes("INSERT INTO project_template"));
    expect((ptCall?.[1] as unknown[])[0]).toMatch(/^checklist:/);
    expect(sqls.filter((s) => s.includes("INSERT INTO template_item")).length).toBe(2); // blank dropped
    expect(sqls).toContain("COMMIT");
    expect(id).toBe("new-id");
  });
});

describe("deleteChecklistTemplate", () => {
  it("guards on the checklist key prefix and throws when nothing matched", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(crm.deleteChecklistTemplate("not-a-checklist")).rejects.toThrow(/not found/i);
    expect(query.mock.calls[0][1]).toEqual(["not-a-checklist", "checklist:%"]);
  });

  it("deletes a checklist template that matched", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(crm.deleteChecklistTemplate("c1")).resolves.toBeUndefined();
  });
});

describe("applyChecklistTemplateToTask (snapshot → subtasks, #633)", () => {
  it("inserts a subtask under the task per item, inheriting account/project/category", async () => {
    // getChecklistTemplate: header + items.
    query.mockResolvedValueOnce({ rows: [{ id: "c1", name: "Checks", description: null }] });
    query.mockResolvedValueOnce({
      rows: [{ payload: { title: "Create accounts" } }, { payload: { title: "Assign hardware" } }],
    });
    // getTask: the parent task.
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "t1",
          account_id: "acc-1",
          title: "Onboard",
          detail: null,
          status: "open",
          category: "onboarding",
          due_at: null,
          start_at: null,
          estimate: null,
          estimate_unit: null,
          project_id: "p1",
          parent_task_id: null,
          autotask_ticket_ref: null,
        },
      ],
    });
    const n = await crm.applyChecklistTemplateToTask({ checklistTemplateId: "c1", taskId: "t1" });
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls.filter((s) => s.includes("INSERT INTO task")).length).toBe(2);
    // Each insert binds parent_task_id = the target task.
    const insert = clientQuery.mock.calls.find((c) => (c[0] as string).includes("INSERT INTO task"));
    expect((insert?.[1] as unknown[])).toContain("t1");
    expect(n).toBe(2);
  });

  it("is a no-op (0) when the template is empty", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: "c1", name: "Checks", description: null }] });
    query.mockResolvedValueOnce({ rows: [] }); // no items
    const n = await crm.applyChecklistTemplateToTask({ checklistTemplateId: "c1", taskId: "t1" });
    expect(n).toBe(0);
  });

  it("is a no-op (0) when the target task is missing", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: "c1", name: "Checks", description: null }] });
    query.mockResolvedValueOnce({ rows: [{ payload: { title: "X" } }] });
    query.mockResolvedValueOnce({ rows: [] }); // getTask → null
    const n = await crm.applyChecklistTemplateToTask({ checklistTemplateId: "c1", taskId: "gone" });
    expect(n).toBe(0);
  });
});
