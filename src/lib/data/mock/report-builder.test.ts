import { describe, expect, it } from "vitest";
import { mockRepositories } from "./mock-repositories";

/**
 * Behaviour tests for the mock report-builder repository (ADR-0075 §3, #410): the
 * in-memory report_definition / dashboard / dashboard_item store. Covers create →
 * list (own vs shared visibility, ADR-0046 model), owner-only update, admin-vs-
 * owner delete, and the dashboard_id / report_definition_id ON DELETE CASCADE on
 * tiles. The mock store is module-level singleton state; each test uses unique
 * names/owners so it does not collide with the others.
 */
const rb = mockRepositories.reportBuilder;

const ada = "ada@imperionllc.com";
const grace = "grace@imperionllc.com";

const reportInput = (over: Partial<Parameters<typeof rb.createReportDefinition>[0]> = {}) => ({
  name: "Untitled",
  rootObject: "opportunity",
  fields: [{ key: "mrr", agg: "sum" }],
  filters: { stage: "open" },
  groupBy: ["owner"],
  viz: "bar",
  visibility: "private" as const,
  ...over,
});

describe("mock report builder — report definitions: visibility (ADR-0046 reuse)", () => {
  it("lists the viewer's own private report plus any shared one, own first", async () => {
    await rb.createReportDefinition(reportInput({ name: "Ada private vis" }), ada);
    await rb.createReportDefinition(
      reportInput({ name: "Grace shared vis", visibility: "shared" }),
      grace,
    );
    await rb.createReportDefinition(
      reportInput({ name: "Grace private vis" }),
      grace,
    );

    const forAda = await rb.listReportDefinitions(ada);
    const names = forAda.map((r) => r.name);
    expect(names).toContain("Ada private vis"); // own
    expect(names).toContain("Grace shared vis"); // shared
    expect(names).not.toContain("Grace private vis"); // someone else's private — hidden

    // Own rows come first (isMine DESC).
    expect(forAda[0].isMine).toBe(true);
  });

  it("getReportDefinition hides another owner's private row but returns a shared one", async () => {
    const privId = await rb.createReportDefinition(reportInput({ name: "G priv get" }), grace);
    const shareId = await rb.createReportDefinition(
      reportInput({ name: "G shared get", visibility: "shared" }),
      grace,
    );
    expect(await rb.getReportDefinition(privId, ada)).toBeNull();
    expect((await rb.getReportDefinition(shareId, ada))?.name).toBe("G shared get");
  });
});

describe("mock report builder — report definitions: owner-only mutation", () => {
  it("update is a no-op for a non-owner and applies for the owner", async () => {
    const id = await rb.createReportDefinition(reportInput({ name: "owner-upd" }), ada);
    await rb.updateReportDefinition(id, reportInput({ name: "hijacked" }), grace); // not owner
    expect((await rb.getReportDefinition(id, ada))?.name).toBe("owner-upd");

    await rb.updateReportDefinition(id, reportInput({ name: "renamed" }), ada);
    expect((await rb.getReportDefinition(id, ada))?.name).toBe("renamed");
  });

  it("delete: a non-owner non-admin cannot delete; admin can", async () => {
    const id = await rb.createReportDefinition(reportInput({ name: "del-guard" }), ada);
    await rb.deleteReportDefinition(id, grace, false); // not owner, not admin
    expect(await rb.getReportDefinition(id, ada)).not.toBeNull();

    await rb.deleteReportDefinition(id, grace, true); // admin override
    expect(await rb.getReportDefinition(id, ada)).toBeNull();
  });
});

describe("mock report builder — dashboards + items cascade", () => {
  it("deleting a dashboard cascades its items (dashboard_id ON DELETE CASCADE)", async () => {
    const dashId = await rb.createDashboard(
      { name: "Casc dash", layout: {}, visibility: "private" },
      ada,
    );
    const repId = await rb.createReportDefinition(reportInput({ name: "casc-rep" }), ada);
    await rb.addDashboardItem({ dashboardId: dashId, reportDefinitionId: repId, position: {} });
    expect(await rb.listDashboardItems(dashId)).toHaveLength(1);

    await rb.deleteDashboard(dashId, ada, false);
    expect(await rb.listDashboardItems(dashId)).toHaveLength(0);
  });

  it("deleting a report definition cascades the tiles pointing at it", async () => {
    const dashId = await rb.createDashboard(
      { name: "Rep casc dash", layout: {}, visibility: "private" },
      ada,
    );
    const repId = await rb.createReportDefinition(reportInput({ name: "rep-casc" }), ada);
    await rb.addDashboardItem({ dashboardId: dashId, reportDefinitionId: repId, position: {} });
    expect(await rb.listDashboardItems(dashId)).toHaveLength(1);

    await rb.deleteReportDefinition(repId, ada, false);
    expect(await rb.listDashboardItems(dashId)).toHaveLength(0);
  });

  it("tiles list in ordinal order; reorder + remove update the list", async () => {
    const dashId = await rb.createDashboard(
      { name: "Order dash", layout: {}, visibility: "private" },
      ada,
    );
    const r1 = await rb.createReportDefinition(reportInput({ name: "ord-r1" }), ada);
    const r2 = await rb.createReportDefinition(reportInput({ name: "ord-r2" }), ada);
    const i1 = await rb.addDashboardItem({
      dashboardId: dashId, reportDefinitionId: r1, position: { ordinal: 1 },
    });
    await rb.addDashboardItem({
      dashboardId: dashId, reportDefinitionId: r2, position: { ordinal: 0 },
    });

    // r2 (ordinal 0) sorts before r1 (ordinal 1).
    let items = await rb.listDashboardItems(dashId);
    expect(items.map((i) => i.reportDefinitionId)).toEqual([r2, r1]);

    // Move r1 to the front, then remove r2.
    await rb.reorderDashboardItem(i1, { ordinal: -1 });
    items = await rb.listDashboardItems(dashId);
    expect(items[0].reportDefinitionId).toBe(r1);

    const r2Item = items.find((i) => i.reportDefinitionId === r2)!;
    await rb.removeDashboardItem(r2Item.id);
    items = await rb.listDashboardItems(dashId);
    expect(items.map((i) => i.reportDefinitionId)).toEqual([r1]);
  });
});
