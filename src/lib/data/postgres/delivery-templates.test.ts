import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam and exercise the delivery-template data layer
// (ADR-0081, migration 0084) against a fake pg pool — SQL shape, row mapping,
// the phases→tasks tree assembly, and the create transaction. Same pattern as
// saved-views.test.ts / posture-reads.test.ts.
const { query, connect, clientQuery, release, getPool } = vi.hoisted(() => {
  const clientQuery =
    vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(async () => ({
      rows: [],
    }));
  const release = vi.fn();
  const query = vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [] }),
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
  query.mockResolvedValue({ rows: [] });
  clientQuery.mockResolvedValue({ rows: [] });
});

describe("listDeliveryTemplates (ADR-0081)", () => {
  it("a project-type filter matches templates bound to that type OR unbound", async () => {
    await crm.listDeliveryTemplates({ activeOnly: true, projectTypeId: "pt-1" });
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain("dt.is_active");
    expect(sql).toContain("dt.project_type_id = $1 OR dt.project_type_id IS NULL");
    expect(params).toEqual(["pt-1"]);
  });

  it("maps counts to numbers", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "dt-1",
          key: "k",
          name: "T",
          description: null,
          version: 1,
          project_type_id: null,
          project_type_name: null,
          is_active: true,
          phase_count: "2",
          task_count: "5",
        },
      ],
    });
    const rows = await crm.listDeliveryTemplates();
    expect(rows[0]).toMatchObject({ phaseCount: 2, taskCount: 5, version: 1, isActive: true });
  });
});

describe("getDeliveryTemplate (tree assembly)", () => {
  it("nests tasks under their phase and coerces the queue id", async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "dt-1",
            key: "k",
            name: "T",
            description: null,
            version: 1,
            project_type_id: null,
            project_type_name: null,
            is_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: "p1", ordinal: 0, name: "Phase 1", offset_days: 0, duration_days: 3 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "t1",
            phase_id: "p1",
            ordinal: 0,
            title: "Cutover",
            offset_days: 1,
            duration_days: 1,
            dispatches_ticket: true,
            ticket_queue_id: "29683483",
            ticket_title: "Cutover ticket",
            ticket_lead_days: 2,
          },
        ],
      });
    const detail = await crm.getDeliveryTemplate("dt-1");
    expect(detail?.phases).toHaveLength(1);
    expect(detail?.phases[0].tasks[0]).toMatchObject({
      title: "Cutover",
      dispatchesTicket: true,
      ticketQueueId: 29683483, // string → number
      ticketLeadDays: 2,
    });
  });

  it("returns null when the template is absent", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await crm.getDeliveryTemplate("missing")).toBeNull();
  });
});

describe("createDeliveryTemplate (transaction)", () => {
  it("commits and inserts phases + tasks with sequential ordinals, returns the id", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO delivery_template ")) return { rows: [{ id: "dt-new" }] };
      if (sql.includes("INSERT INTO delivery_template_phase")) return { rows: [{ id: "ph-new" }] };
      return { rows: [] };
    });
    const id = await crm.createDeliveryTemplate({
      key: "k",
      name: "T",
      description: null,
      version: 1,
      projectTypeId: null,
      isActive: true,
      phases: [
        {
          name: "P1",
          offsetDays: 0,
          durationDays: 2,
          tasks: [
            {
              title: "A",
              offsetDays: 0,
              durationDays: 1,
              dispatchesTicket: false,
              ticketQueueId: 99,
              ticketTitle: "x",
              ticketLeadDays: 3,
            },
          ],
        },
      ],
    });
    expect(id).toBe("dt-new");
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    // A non-dispatching task must NOT persist ticket fields (queue/title nulled, lead 0).
    const taskCall = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("INSERT INTO delivery_template_task"),
    )!;
    const params = taskCall[1] as unknown[];
    expect(params[6]).toBeNull(); // ticket_queue_id
    expect(params[7]).toBeNull(); // ticket_title
    expect(params[8]).toBe(0); // ticket_lead_days
  });

  it("rolls back on error", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN") return { rows: [] };
      if (sql.includes("INSERT INTO delivery_template ")) throw new Error("boom");
      return { rows: [] };
    });
    await expect(
      crm.createDeliveryTemplate({
        key: "k",
        name: "T",
        description: null,
        version: 1,
        projectTypeId: null,
        isActive: true,
        phases: [],
      }),
    ).rejects.toThrow("boom");
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls).toContain("ROLLBACK");
    expect(release).toHaveBeenCalled();
  });
});

describe("instantiateDeliveryTemplate (ADR-0080 §4, #566)", () => {
  // getDeliveryTemplate (called via `this`) reads through `query`: template head,
  // phases, tasks. We stage a 1-phase / 2-task template (one dispatching).
  function stageTemplateReads() {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "dt-1",
            key: "k",
            name: "Net Refresh",
            description: null,
            version: 1,
            project_type_id: null,
            project_type_name: null,
            is_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: "p1", ordinal: 0, name: "Cutover", offset_days: 0, duration_days: 2 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "t1",
            phase_id: "p1",
            ordinal: 0,
            title: "Stage",
            offset_days: 0,
            duration_days: 1,
            dispatches_ticket: false,
            ticket_queue_id: null,
            ticket_title: null,
            ticket_lead_days: 0,
          },
          {
            id: "t2",
            phase_id: "p1",
            ordinal: 1,
            title: "On-site cutover",
            offset_days: 1,
            duration_days: 1,
            dispatches_ticket: true,
            ticket_queue_id: "29683483",
            ticket_title: "Cutover ticket",
            ticket_lead_days: 2,
          },
        ],
      });
  }

  function stageInserts() {
    // project insert → id; milestone/task inserts; provisioning/fire have no RETURNING.
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith("INSERT INTO project\n")) return { rows: [{ id: "proj-1" }] };
      if (sql.startsWith("INSERT INTO task (")) return { rows: [{ id: `task-${Math.random()}` }] };
      return { rows: [] };
    });
  }

  it("creates project + milestones + tasks + provisioning, fires only dispatching tasks", async () => {
    stageTemplateReads();
    stageInserts();
    const projectId = await crm.instantiateDeliveryTemplate({
      deliveryTemplateId: "dt-1",
      accountId: "acc-1",
      name: "Acme Net Refresh",
      projectTypeId: "pt-1",
      startDate: "2026-07-01",
      opportunityId: null,
    });
    expect(projectId).toBe("proj-1");
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(sqls.some((s) => s.includes("INSERT INTO project_milestone"))).toBe(true);
    // Exactly ONE fire row — only the dispatching task t2.
    const fireCalls = clientQuery.mock.calls.filter((c) =>
      (c[0] as string).includes("INSERT INTO task_ticket_fire"),
    );
    expect(fireCalls).toHaveLength(1);
    // fire row: state 'none' literal in SQL, queue carried, scheduled = task start − lead.
    const fireSql = fireCalls[0][0] as string;
    const fireParams = fireCalls[0][1] as unknown[];
    expect(fireSql).toContain("'none'");
    expect(fireParams[1]).toBe("2026-06-30"); // task start 07-02 (start + offset 1) − 2 lead days
    expect(fireParams[2]).toBe(29683483); // autotask_queue_id
    expect(String(fireParams[3])).toMatch(/^imperioncrm-taskticket-/);
    // provisioning row: pending + 'none' gate, key format, template ref.
    const provCall = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("INSERT INTO project_provisioning"),
    )!;
    const provParams = provCall[1] as unknown[];
    expect(provParams[0]).toBe("proj-1");
    expect(provParams[3]).toBe("imperioncrm-project-proj-1"); // idempotency_key
    expect(provParams[4]).toBe("dt-1"); // delivery_template_id
  });

  it("rejects a non-won opportunity (forged id can't provision off a draft)", async () => {
    stageTemplateReads();
    query.mockResolvedValueOnce({ rows: [{ sales_stage: "proposal" }] });
    await expect(
      crm.instantiateDeliveryTemplate({
        deliveryTemplateId: "dt-1",
        accountId: "acc-1",
        name: "X",
        projectTypeId: "pt-1",
        startDate: "2026-07-01",
        opportunityId: "opp-draft",
      }),
    ).rejects.toThrow(/won opportunity/i);
  });

  it("throws when the template is missing", async () => {
    query.mockResolvedValueOnce({ rows: [] }); // getDeliveryTemplate head → null
    await expect(
      crm.instantiateDeliveryTemplate({
        deliveryTemplateId: "missing",
        accountId: "acc-1",
        name: "X",
        projectTypeId: "pt-1",
        startDate: "2026-07-01",
        opportunityId: null,
      }),
    ).rejects.toThrow(/not found/i);
  });
});
