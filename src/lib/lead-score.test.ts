import { describe, expect, it } from "vitest";
import {
  LEAD_SCORE_BANDS,
  LEAD_SCORE_RULES,
  MAX_LEAD_SCORE,
  computeRuleLeadScore,
  leadScoreBand,
} from "./lead-score";
import type { LeadScoreInput } from "@/types";

// A scoring-input factory — a cold, signal-less contact by default.
function input(over: Partial<LeadScoreInput> = {}): LeadScoreInput {
  return {
    hasEmail: false,
    hasPhone: false,
    crmStage: "audience",
    hasAccount: false,
    recentInteractions: 0,
    inboundInteractions: 0,
    distinctChannels: 0,
    ...over,
  };
}

describe("leadScoreBand", () => {
  it("maps the thresholds to cold / warm / hot", () => {
    expect(leadScoreBand(0)).toBe("cold");
    expect(leadScoreBand(LEAD_SCORE_BANDS.warm - 1)).toBe("cold");
    expect(leadScoreBand(LEAD_SCORE_BANDS.warm)).toBe("warm");
    expect(leadScoreBand(LEAD_SCORE_BANDS.hot - 1)).toBe("warm");
    expect(leadScoreBand(LEAD_SCORE_BANDS.hot)).toBe("hot");
    expect(leadScoreBand(MAX_LEAD_SCORE)).toBe("hot");
  });
});

describe("computeRuleLeadScore", () => {
  it("scores a bare audience contact at just the stage floor", () => {
    const r = computeRuleLeadScore(input());
    expect(r.score).toBe(LEAD_SCORE_RULES.fit.crmStage.audience);
    expect(r.band).toBe("cold");
    // Only the always-present CRM-stage component is emitted.
    expect(r.breakdown).toHaveLength(1);
    expect(r.breakdown[0]).toMatchObject({ group: "fit", points: 5 });
  });

  it("sums fit components", () => {
    const r = computeRuleLeadScore(
      input({ hasEmail: true, hasPhone: true, hasAccount: true, crmStage: "prospect" }),
    );
    const { fit } = LEAD_SCORE_RULES;
    expect(r.score).toBe(
      fit.hasEmail + fit.hasPhone + fit.hasAccount + fit.crmStage.prospect,
    );
    expect(r.breakdown.filter((c) => c.group === "fit")).toHaveLength(4);
  });

  it("caps recent-interaction points", () => {
    const { engagement } = LEAD_SCORE_RULES;
    const many = computeRuleLeadScore(input({ recentInteractions: 99 }));
    const recent = many.breakdown.find((c) => c.label === "Recent interactions");
    expect(recent?.points).toBe(engagement.recentInteractionCap);
  });

  it("caps channel-breadth points", () => {
    const { engagement } = LEAD_SCORE_RULES;
    const r = computeRuleLeadScore(input({ distinctChannels: 99 }));
    const ch = r.breakdown.find((c) => c.label === "Channel breadth");
    expect(ch?.points).toBe(engagement.channelCap);
  });

  it("awards the inbound bonus only when there is inbound activity", () => {
    expect(
      computeRuleLeadScore(input()).breakdown.some((c) => c.label === "Replied / inbound"),
    ).toBe(false);
    expect(
      computeRuleLeadScore(input({ inboundInteractions: 1 })).breakdown.some(
        (c) => c.label === "Replied / inbound",
      ),
    ).toBe(true);
  });

  it("clamps a maxed-out contact to 100 and reads hot", () => {
    const r = computeRuleLeadScore(
      input({
        hasEmail: true,
        hasPhone: true,
        hasAccount: true,
        crmStage: "client",
        recentInteractions: 99,
        inboundInteractions: 9,
        distinctChannels: 99,
      }),
    );
    expect(r.score).toBe(MAX_LEAD_SCORE);
    expect(r.band).toBe("hot");
  });

  it("breakdown points sum to the score before clamping (deterministic)", () => {
    const r = computeRuleLeadScore(input({ hasEmail: true, crmStage: "lead", recentInteractions: 2 }));
    const sum = r.breakdown.reduce((s, c) => s + c.points, 0);
    expect(r.score).toBe(sum);
    // Pure: re-running gives an identical result.
    expect(computeRuleLeadScore(input({ hasEmail: true, crmStage: "lead", recentInteractions: 2 }))).toEqual(r);
  });
});
