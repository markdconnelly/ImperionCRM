import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the BI-hub report reads (ADR-0062) are exercised
// against a fake pg pool (SQL shape + row mapping) and a null pool (mock fallback).
// Same pattern as posture-reads.test.ts.
const { query, getPool } = vi.hoisted(() => ({
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [] }),
  ),
  getPool: vi.fn((): unknown => ({ query })),
}));
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({})); // Next.js marker module — inert under vitest

import { postgresRepositories } from "./postgres-repositories";

const reports = postgresRepositories.reports;
const dashboard = postgresRepositories.dashboard;

describe("Marketing & Social BI section (#289 — ADR-0062)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPool.mockReturnValue({ query });
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM lead_capture_event"))
        return { rows: [{ kind: "facebook_dm", c: "14" }] };
      if (sql.includes("period = 'lifetime'"))
        return { rows: [{ platform: "instagram", metric: "followers_count", value: "412" }] };
      if (sql.includes("period = 'day'"))
        return {
          rows: [{ platform: "facebook", metric: "page_impressions_unique", value: "1840" }],
        };
      if (sql.includes("FROM facebook_posts"))
        return { rows: [{ posts: "9", reactions: "122", comments: "18", shares: "11" }] };
      if (sql.includes("FROM instagram_media"))
        return { rows: [{ media: "6", likes: "204", comments: "13" }] };
      if (sql.includes("FROM campaign c"))
        return {
          rows: [{ name: "Webinar", platform: "facebook", spend: "1200", clicks: "340", leads: "22" }],
        };
      return { rows: [] };
    });
  });

  it("maps all four aggregates and tags social stats with their window", async () => {
    const r = await reports.marketingSocial();
    expect(r.leadsBySource30d).toEqual([{ label: "facebook_dm", count: 14 }]);
    expect(r.socialStats).toEqual([
      { platform: "instagram", metric: "followers_count", value: 412, window: "lifetime" },
      { platform: "facebook", metric: "page_impressions_unique", value: 1840, window: "28d" },
    ]);
    expect(r.engagement30d).toEqual({
      fbPosts: 9, fbReactions: 122, fbComments: 18, fbShares: 11,
      igMedia: 6, igLikes: 204, igComments: 13,
    });
    expect(r.topCampaigns).toEqual([
      { name: "Webinar", platform: "facebook", spend: 1200, clicks: 340, leads: 22 },
    ]);
  });

  it("is metric-generic over social_metric and casts bronze text counters defensively", async () => {
    await reports.marketingSocial();
    const sqls = query.mock.calls.map((c) => c[0] as string);
    const socialSqls = sqls.filter((s) => s.includes("FROM social_metric"));
    expect(socialSqls).toHaveLength(2);
    // Never hard-code insight metric names — local #135 renames them (ADR-0062).
    for (const s of socialSqls) expect(s).not.toMatch(/metric\s*=\s*'/);
    const fbSql = sqls.find((s) => s.includes("FROM facebook_posts"))!;
    expect(fbSql).toContain("nullif(reaction_count, '')::numeric");
    expect(fbSql).toContain("nullif(created_time, '')::timestamptz");
  });

  it("leads-by-source LEFT JOINs lead_hook so orphan captures still count", async () => {
    await reports.marketingSocial();
    const leadSql = query.mock.calls
      .map((c) => c[0] as string)
      .find((s) => s.includes("FROM lead_capture_event"))!;
    expect(leadSql).toContain("LEFT JOIN lead_hook");
    expect(leadSql).toContain("coalesce(h.kind::text, 'unknown')");
    expect(leadSql).toContain("interval '30 days'");
  });

  it("falls back to the mock when no pool is configured", async () => {
    getPool.mockReturnValue(null);
    const r = await reports.marketingSocial();
    expect(r.leadsBySource30d.length).toBeGreaterThan(0);
    expect(query).not.toHaveBeenCalled();
  });
});

describe("Service Desk BI section (#290 — ADR-0062)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPool.mockReturnValue({ query });
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("coalesce(status, 'unknown')"))
        return {
          rows: [
            { k: "1", c: "69" },
            { k: "5", c: "29" },
            { k: "19", c: "2" },
          ],
        };
      if (sql.includes("queue AS k"))
        return {
          rows: [
            { k: null, c: "80" },
            { k: "6", c: "12" },
          ],
        };
      if (sql.includes("date_trunc('week'"))
        return { rows: [{ wk: "2026-06-08", c: "19" }] };
      if (sql.includes("opened_30d"))
        return { rows: [{ total: "102", opened_30d: "93" }] };
      if (sql.includes("defender_incident_ticket_link")) return { rows: [{ c: "2" }] };
      return { rows: [] };
    });
  });

  it("names only the fixed Autotask system statuses and keeps raw ids honest", async () => {
    const r = await reports.serviceDesk();
    expect(r.byStatus).toEqual([
      { label: "New", count: 69 },
      { label: "Complete", count: 29 },
      { label: "Status 19", count: 2 },
    ]);
    expect(r.byQueue).toEqual([
      { label: "unassigned", count: 80 },
      { label: "Queue 6", count: 12 },
    ]);
    expect(r.openedByWeek).toEqual([{ label: "2026-06-08", count: 19 }]);
    expect(r.total).toBe(102);
    expect(r.opened30d).toBe(93);
    expect(r.defenderLinked).toBe(2);
  });

  it("counts Defender pairings from the 0076 link table", async () => {
    await reports.serviceDesk();
    const sqls = query.mock.calls.map((c) => c[0] as string);
    expect(sqls.some((s) => s.includes("FROM defender_incident_ticket_link"))).toBe(true);
  });

  it("falls back to the mock when no pool is configured", async () => {
    getPool.mockReturnValue(null);
    const r = await reports.serviceDesk();
    expect(r.total).toBeGreaterThan(0);
    expect(query).not.toHaveBeenCalled();
  });
});

describe("Security Fleet BI section (#291 — ADR-0062)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPool.mockReturnValue({ query });
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM tenant_posture"))
        return {
          rows: [
            {
              tenants: "2", cur: "412.5", max: "550",
              compliant: "12", drift: "2", ungoverned: "1", missing: "3",
              exposures_open: "4",
            },
          ],
        };
      if (sql.includes("FROM entra_auth_methods"))
        return { rows: [{ registered: "31", total: "40" }] };
      if (sql.includes("FROM defender_incidents"))
        return { rows: [{ sev: "high", c: "1" }, { sev: "medium", c: "3" }] };
      if (sql.includes("FROM intune_managed_devices"))
        return { rows: [{ compliant: "92", total: "104" }] };
      if (sql.includes("FROM credential_exposure")) return { rows: [{ c: "6" }] };
      return { rows: [] };
    });
  });

  it("rolls the fleet up: score pct, policy mix, MFA, Defender by severity, Intune, exposures", async () => {
    const r = await reports.securityFleet();
    expect(r.tenants).toBe(2);
    expect(r.secureScorePct).toBe(75); // 412.5 / 550
    expect(r.policyMix).toEqual([
      { label: "compliant", count: 12 },
      { label: "drift", count: 2 },
      { label: "ungoverned", count: 1 },
      { label: "missing", count: 3 },
    ]);
    expect(r.mfa).toEqual({ registered: 31, total: 40 });
    expect(r.defenderOpenBySeverity).toEqual([
      { label: "high", count: 1 },
      { label: "medium", count: 3 },
    ]);
    expect(r.intune).toEqual({ compliant: 92, total: 104 });
    expect(r.exposuresOpen).toBe(6);
  });

  it("returns null score (not 0) when no tenant has been refreshed — no-coverage semantics", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM tenant_posture"))
        return {
          rows: [
            {
              tenants: "0", cur: "0", max: "0",
              compliant: "0", drift: "0", ungoverned: "0", missing: "0",
              exposures_open: "0",
            },
          ],
        };
      if (sql.includes("registered")) return { rows: [{ registered: "0", total: "0" }] };
      if (sql.includes("compliant")) return { rows: [{ compliant: "0", total: "0" }] };
      return { rows: [{ c: "0" }] };
    });
    const r = await reports.securityFleet();
    expect(r.secureScorePct).toBeNull();
  });

  it("matches the #256/#258 semantics: case-folded bronze flags, resolved/redirected excluded", async () => {
    await reports.securityFleet();
    const sqls = query.mock.calls.map((c) => c[0] as string);
    expect(sqls.find((s) => s.includes("FROM entra_auth_methods"))).toContain(
      "lower(COALESCE(is_mfa_registered, '')) = 'true'",
    );
    expect(sqls.find((s) => s.includes("FROM defender_incidents"))).toContain(
      "NOT IN ('resolved', 'redirected')",
    );
    expect(sqls.find((s) => s.includes("FROM intune_managed_devices"))).toContain(
      "lower(COALESCE(compliance_state, '')) = 'compliant'",
    );
  });

  it("falls back to the mock when no pool is configured", async () => {
    getPool.mockReturnValue(null);
    const r = await reports.securityFleet();
    expect(r.tenants).toBeGreaterThan(0);
    expect(query).not.toHaveBeenCalled();
  });
});

describe("Time Efficiency BI section (#467 — ADR-0082)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPool.mockReturnValue({ query });
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM time_record"))
        return { rows: [{ billable: "18240", internal: "6360", admin: "3000" }] };
      if (sql.includes("FROM timesheet_payroll_status"))
        return { rows: [{ minutes: "27600", total: "27600" }] };
      return { rows: [] };
    });
  });

  it("maps comp-free utilization minutes and aggregate labor cost when permitted", async () => {
    const r = await reports.timeEfficiency(true);
    expect(r.utilization).toEqual({
      billableMinutes: 18240,
      internalMinutes: 6360,
      adminMinutes: 3000,
    });
    expect(r.laborCost).toEqual({
      approvedHours: 460, // 27600 / 60
      totalCost: 27600,
      blendedHourlyRate: 60, // 27600 / 460
    });
  });

  it("utilization reads attendance only, comp-free — splits by category, never touches pay_rate", async () => {
    await reports.timeEfficiency(true);
    const utilSql = query.mock.calls
      .map((c) => c[0] as string)
      .find((s) => s.includes("FROM time_record"))!;
    expect(utilSql).toContain("kind = 'attendance'");
    expect(utilSql).toContain("FILTER (WHERE category = 'billable')");
    expect(utilSql).not.toMatch(/pay_rate|employee_profile/);
  });

  it("withholds labor cost AND never runs the comp query for non-finance/admin callers", async () => {
    const r = await reports.timeEfficiency(false);
    expect(r.laborCost).toBeNull();
    expect(r.utilization.billableMinutes).toBe(18240);
    const sqls = query.mock.calls.map((c) => c[0] as string);
    // The pay_rate/cost query must not run at all when the caller isn't gated in.
    expect(sqls.some((s) => s.includes("pay_rate"))).toBe(false);
    expect(sqls.some((s) => s.includes("FROM timesheet_payroll_status"))).toBe(false);
  });

  it("labor cost is aggregate-only: latest effective rate per employee, approved states", async () => {
    await reports.timeEfficiency(true);
    const costSql = query.mock.calls
      .map((c) => c[0] as string)
      .find((s) => s.includes("FROM timesheet_payroll_status"))!;
    expect(costSql).toContain("JOIN LATERAL");
    expect(costSql).toContain("ORDER BY p.effective_from DESC");
    expect(costSql).toContain("ps.state IN ('approved', 'payroll_approved', 'paid')");
    // Aggregate only — the projection sums, it never selects a row-level rate.
    expect(costSql).toContain("sum((ps.approved_minutes / 60.0) * pr.eff_hourly)");
  });

  it("null blended rate (not divide-by-zero) when there are no approved hours yet", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM time_record"))
        return { rows: [{ billable: "0", internal: "0", admin: "0" }] };
      if (sql.includes("FROM timesheet_payroll_status"))
        return { rows: [{ minutes: "0", total: "0" }] };
      return { rows: [] };
    });
    const r = await reports.timeEfficiency(true);
    expect(r.laborCost).toEqual({ approvedHours: 0, totalCost: 0, blendedHourlyRate: null });
  });

  it("falls back to the mock when no pool is configured", async () => {
    getPool.mockReturnValue(null);
    const r = await reports.timeEfficiency(true);
    expect(r.utilization.billableMinutes).toBeGreaterThan(0);
    expect(query).not.toHaveBeenCalled();
  });
});

describe("Dashboard intelligence strip (#292 — ADR-0062)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPool.mockReturnValue({ query });
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM lead_capture_event")) return { rows: [{ c: "6" }] };
      if (sql.includes("FROM ticket")) return { rows: [{ c: "93" }] };
      if (sql.includes("FROM defender_incidents"))
        return { rows: [{ open: "4", total: "7" }] };
      if (sql.includes("FROM entra_auth_methods"))
        return { rows: [{ registered: "31", total: "40" }] };
      if (sql.includes("FROM facebook_posts"))
        return { rows: [{ fb: "151", ig: "217", posts: "76" }] };
      return { rows: [] };
    });
  });

  it("maps the five cross-domain figures", async () => {
    const r = await dashboard.getIntelStrip();
    expect(r).toEqual({
      newLeads7d: 6,
      ticketsOpened30d: 93,
      defenderOpen: 4,
      mfaPct: 78, // 31/40
      socialEngagement30d: 368, // 151 + 217
    });
  });

  it("reports null (no coverage), not zero, when a source has no rows at all", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM defender_incidents"))
        return { rows: [{ open: "0", total: "0" }] };
      if (sql.includes("FROM entra_auth_methods"))
        return { rows: [{ registered: "0", total: "0" }] };
      if (sql.includes("FROM facebook_posts"))
        return { rows: [{ fb: null, ig: null, posts: "0" }] };
      return { rows: [{ c: "0" }] };
    });
    const r = await dashboard.getIntelStrip();
    expect(r.defenderOpen).toBeNull();
    expect(r.mfaPct).toBeNull();
    expect(r.socialEngagement30d).toBeNull();
  });

  it("falls back to the mock when no pool is configured", async () => {
    getPool.mockReturnValue(null);
    const r = await dashboard.getIntelStrip();
    expect(r.newLeads7d).toBeGreaterThanOrEqual(0);
    expect(query).not.toHaveBeenCalled();
  });
});
