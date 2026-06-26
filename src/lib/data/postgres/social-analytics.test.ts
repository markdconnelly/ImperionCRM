import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam (same pattern as reports-bi.test.ts). Exercises the
// SocialRepository.analytics() SQL shape + row mapping (ADR-0124 D, slice D #1342)
// against a fake pg pool, and the null-pool mock fallback.
const { query, getPool } = vi.hoisted(() => ({
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [] }),
  ),
  getPool: vi.fn((): unknown => ({ query })),
}));
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { postgresRepositories } from "./postgres-repositories";

const social = postgresRepositories.social;

describe("SocialRepository.analytics() — ADR-0124 D / #1342", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPool.mockReturnValue({ query });
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("period = 'lifetime'"))
        return { rows: [{ platform: "facebook", metric: "page_followers", value: "900" }] };
      if (sql.includes("period = 'day'"))
        return { rows: [{ platform: "instagram", metric: "reach", value: "120" }] };
      if (sql.includes("FROM social_post_channel") || sql.includes("WITH pub"))
        return {
          rows: [
            {
              channel: "facebook",
              external_id: "ext-1",
              body: "Hello world",
              metric: "impressions",
              value: "340",
            },
            { channel: "facebook", external_id: "ext-1", body: "Hello world", metric: "likes", value: "12" },
          ],
        };
      if (sql.includes("JOIN campaign_metric m ON m.ad_id"))
        return {
          rows: [
            {
              ad_id: "ad-1",
              ad_name: "Spring promo",
              campaign_name: "Q2 demand-gen",
              platform: "facebook",
              spend: "200",
              impressions: "5000",
              clicks: "150",
              results: "8",
            },
          ],
        };
      return { rows: [] };
    });
  });

  it("unions organic per-channel + per-post with paid ad results", async () => {
    const r = await social.analytics();

    // Organic per-channel (busiest first: facebook 900 > instagram 120).
    expect(r.byChannel.map((c) => c.platform)).toEqual(["facebook", "instagram"]);
    expect(r.byChannel[0].metrics[0]).toMatchObject({
      metric: "page_followers",
      value: 900,
      window: "lifetime",
    });

    // Per-post — two metric rows fold into one post with both metrics.
    expect(r.topPosts).toHaveLength(1);
    expect(r.topPosts[0]).toMatchObject({ channel: "facebook", externalId: "ext-1" });
    expect(r.topPosts[0].metrics.map((m) => m.metric)).toEqual(["impressions", "likes"]);

    // Paid ad result with derived CPL = 200 / 8 = 25 (attribution-consumable, #1316).
    expect(r.adResults).toEqual([
      {
        adId: "ad-1",
        adName: "Spring promo",
        campaignName: "Q2 demand-gen",
        platform: "facebook",
        spend: 200,
        impressions: 5000,
        clicks: 150,
        results: 8,
        cpl: 25,
      },
    ]);
  });

  it("falls back to empty arrays when the pool is absent", async () => {
    getPool.mockReturnValue(null);
    const r = await social.analytics();
    expect(r).toEqual({ byChannel: [], topPosts: [], adResults: [] });
  });

  it("refuses to substitute mock data when configured DB errors (#193 fallback guard)", async () => {
    // With a pool configured, the fallback Proxy turns a mock-result into a thrown
    // DataUnavailableError rather than silently serving demo data (fallback.ts).
    query.mockRejectedValue(new Error("boom"));
    await expect(social.analytics()).rejects.toThrow(/Live data is unavailable/);
  });
});
