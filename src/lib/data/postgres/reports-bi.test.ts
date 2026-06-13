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
