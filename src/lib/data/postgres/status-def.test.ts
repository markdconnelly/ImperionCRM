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
