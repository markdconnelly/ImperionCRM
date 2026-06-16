import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the status_def SQL shape + row mapping
// (ADR-0065 B5, #339) are exercised against a fake pg pool. Same pattern as
// task-dependencies.test.ts / tags.test.ts.
const { query, getPool } = vi.hoisted(() => {
  const query = vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>>(
    async () => ({ rows: [], rowCount: 0 }),
  );
  return { query, getPool: vi.fn((): unknown => ({ query })) };
});
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { postgresRepositories } from "./postgres-repositories";
import { mockRepositories } from "../mock/mock-repositories";

const crm = postgresRepositories.crm;

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query });
  query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe("configurable statuses (ADR-0065 B5, #339)", () => {
  it("listStatusDefs queries by context and resolves typed-over-global, mapping rows", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "sd1",
          scope: "global",
          project_type_id: null,
          context: "task",
          key: "open",
          label: "Open",
          color: "#8A93A6",
          category: "todo",
          ordinal: 0,
          wip_limit: null,
        },
      ],
    });
    const out = await crm.listStatusDefs("task", null);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/FROM status_def/);
    expect(sql).toMatch(/ORDER BY ordinal/);
    expect(params).toEqual(["task", null]);
    expect(out).toEqual([
      {
        id: "sd1",
        scope: "global",
        projectTypeId: null,
        context: "task",
        key: "open",
        label: "Open",
        color: "#8A93A6",
        category: "todo",
        ordinal: 0,
        wipLimit: null,
      },
    ]);
  });

  it("falls back to the mock default sets when no pool is configured", async () => {
    getPool.mockReturnValue(null);
    const out = await mockRepositories.crm.listStatusDefs("project");
    // The seeded global project set (0104) — blocked rolls up as in_progress.
    expect(out.map((s) => s.key)).toEqual(["not_started", "in_progress", "blocked", "complete"]);
    expect(out.find((s) => s.key === "blocked")?.category).toBe("in_progress");
    expect(out.find((s) => s.key === "complete")?.category).toBe("done");
    expect(out.every((s) => s.scope === "global" && s.projectTypeId === null)).toBe(true);
  });
});

describe("configurable-status admin CRUD (ADR-0065 B5, #616)", () => {
  const input = {
    scope: "global",
    projectTypeId: null,
    context: "task",
    key: "waiting_on_client",
    label: "Waiting on client",
    color: "#E0A33E",
    category: "in_progress",
    ordinal: 3,
    wipLimit: null,
  };

  it("listStatusDefsForScope queries the exact scope (NOT DISTINCT FROM) and maps rows", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await crm.listStatusDefsForScope("task", "global", null);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/WHERE context = \$1 AND scope = \$2/);
    expect(sql).toMatch(/project_type_id IS NOT DISTINCT FROM/);
    expect(params).toEqual(["task", "global", null]);
  });

  it("createStatusDef inserts the ordered params and maps the returned row", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "sdX",
          scope: "global",
          project_type_id: null,
          context: "task",
          key: "waiting_on_client",
          label: "Waiting on client",
          color: "#E0A33E",
          category: "in_progress",
          ordinal: 3,
          wip_limit: null,
        },
      ],
    });
    const out = await crm.createStatusDef(input);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO status_def/);
    // global → project_type_id forced null regardless of input
    expect(params).toEqual([
      "global", null, "task", "waiting_on_client", "Waiting on client",
      "#E0A33E", "in_progress", 3, null,
    ]);
    expect(out.id).toBe("sdX");
    expect(out.projectTypeId).toBeNull();
    expect(out.wipLimit).toBeNull();
  });

  it("updateStatusDef updates by id and returns null when the row is gone", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const out = await crm.updateStatusDef("missing", input);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/UPDATE status_def/);
    expect(params?.[(params?.length ?? 0) - 1]).toBe("missing");
    expect(out).toBeNull();
  });

  it("deleteStatusDef reports whether a row was removed", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    expect(await crm.deleteStatusDef("sd1")).toBe(true);
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await crm.deleteStatusDef("sd1")).toBe(false);
  });

  it("reorderStatusDefs builds one atomic UPDATE … FROM (VALUES …) and is a no-op when empty", async () => {
    await crm.reorderStatusDefs([]);
    expect(query).not.toHaveBeenCalled();
    await crm.reorderStatusDefs([
      { id: "a", ordinal: 0 },
      { id: "b", ordinal: 1 },
    ]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/UPDATE status_def AS sd/);
    expect(sql).toMatch(/FROM \(VALUES/);
    expect(params).toEqual(["a", 0, "b", 1]);
  });
});

describe("configurable-status mock CRUD round-trip (#616)", () => {
  beforeEach(() => getPool.mockReturnValue(null));

  it("creates, lists by scope, reorders and deletes against the mock store", async () => {
    const created = await mockRepositories.crm.createStatusDef({
      scope: "global",
      projectTypeId: null,
      context: "task",
      key: "waiting",
      label: "Waiting",
      color: "#E0A33E",
      category: "in_progress",
      ordinal: 9,
      wipLimit: null,
    });
    const set = await mockRepositories.crm.listStatusDefsForScope("task", "global", null);
    expect(set.some((s) => s.id === created.id)).toBe(true);

    await mockRepositories.crm.reorderStatusDefs([{ id: created.id, ordinal: 0 }]);
    const reordered = await mockRepositories.crm.listStatusDefsForScope("task", "global", null);
    expect(reordered.find((s) => s.id === created.id)?.ordinal).toBe(0);

    expect(await mockRepositories.crm.deleteStatusDef(created.id)).toBe(true);
    const after = await mockRepositories.crm.listStatusDefsForScope("task", "global", null);
    expect(after.some((s) => s.id === created.id)).toBe(false);
  });
});
