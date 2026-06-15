/**
 * Rule-based lead scoring (ADR-0073 decision 5, #401).
 *
 * Pure, dependency-free, NOT server-only — safe to import from server reads, a future
 * lead-score surface, and the vitest suite alike. The schema (migration 0116) stores
 * the resolved `score` + an explainable `breakdown` per contact; this module holds the
 * COMPUTATION ADR-0073 keeps deterministic and editable: fit attributes (who the
 * contact is) + weighted engagement (what they have done) → a 0..100 score with a
 * per-rule trace. A PREDICTED score (an LP model over engagement history, #402) is a
 * later slice that coexists — this module owns only the rule regime.
 *
 * WHO persists it: the backend/LP scoring pass (ADR-0042 — a process) reuses these
 * weights and UPSERTs `lead_score`; the front end reads the row. The same function can
 * preview a score in the UI without a round-trip, because it is pure.
 *
 * The weights live in `LEAD_SCORE_RULES` so they are tunable in one place (ADR-0073
 * decision 5 — the rule score is "explainable and editable"). Nothing here is random
 * or time-dependent; identical input → identical score.
 */

import type {
  ContactCrmStage,
  LeadScoreBand,
  LeadScoreComponent,
  LeadScoreInput,
  LeadScoreResult,
} from "@/types";

/** The maximum possible score — the band thresholds and clamp are relative to this. */
export const MAX_LEAD_SCORE = 100;

/**
 * The tunable rule weights (ADR-0073 decision 5). Fit caps at 50 and engagement at 50
 * so the two halves are balanced and the total lands in 0..100 before clamping.
 */
export const LEAD_SCORE_RULES = {
  fit: {
    hasEmail: 10, // reachable by the primary nurture channel
    hasPhone: 5, // a second channel
    hasAccount: 10, // tied to a real org, not a stray lead
    crmStage: {
      audience: 5,
      lead: 15,
      prospect: 25,
      client: 25, // already a client — fit is maxed; scoring is mostly for pre-client
    } as Record<ContactCrmStage, number>,
  },
  engagement: {
    perRecentInteraction: 5, // each recent touch, up to the cap
    recentInteractionCap: 25,
    anyInbound: 10, // they replied/initiated — intent
    perChannel: 5, // breadth across channels, up to the cap
    channelCap: 15,
  },
} as const;

/** Band thresholds on the 0..100 score (derived, never stored). */
export const LEAD_SCORE_BANDS = { warm: 34, hot: 67 } as const;

/** Clamp a raw value into the 0..MAX_LEAD_SCORE range. */
function clampScore(value: number): number {
  if (value < 0) return 0;
  if (value > MAX_LEAD_SCORE) return MAX_LEAD_SCORE;
  return Math.round(value);
}

/** The band a resolved score falls into (ADR-0073 decision 5 — display only). */
export function leadScoreBand(score: number): LeadScoreBand {
  if (score >= LEAD_SCORE_BANDS.hot) return "hot";
  if (score >= LEAD_SCORE_BANDS.warm) return "warm";
  return "cold";
}

/**
 * Score one contact from its raw signals (ADR-0073 decision 5). Returns the clamped
 * score, its band, and the per-rule breakdown that sums to it — the breakdown is the
 * EXPLAINABLE trace persisted to `lead_score.breakdown`. Pure: same input → same output.
 */
export function computeRuleLeadScore(input: LeadScoreInput): LeadScoreResult {
  const { fit, engagement } = LEAD_SCORE_RULES;
  const breakdown: LeadScoreComponent[] = [];

  // ── Fit: who the contact is ──────────────────────────────────────────────
  if (input.hasEmail) {
    breakdown.push({ group: "fit", label: "Has email", points: fit.hasEmail });
  }
  if (input.hasPhone) {
    breakdown.push({ group: "fit", label: "Has phone", points: fit.hasPhone });
  }
  if (input.hasAccount) {
    breakdown.push({ group: "fit", label: "Linked to account", points: fit.hasAccount });
  }
  const stagePoints = fit.crmStage[input.crmStage] ?? 0;
  breakdown.push({
    group: "fit",
    label: `CRM stage: ${input.crmStage}`,
    points: stagePoints,
  });

  // ── Engagement: what they have done ──────────────────────────────────────
  const recent = Math.max(0, input.recentInteractions);
  if (recent > 0) {
    const recentPoints = Math.min(
      recent * engagement.perRecentInteraction,
      engagement.recentInteractionCap,
    );
    breakdown.push({
      group: "engagement",
      label: "Recent interactions",
      points: recentPoints,
      detail: `${recent} in window`,
    });
  }
  if (input.inboundInteractions > 0) {
    breakdown.push({
      group: "engagement",
      label: "Replied / inbound",
      points: engagement.anyInbound,
      detail: `${input.inboundInteractions} inbound`,
    });
  }
  const channels = Math.max(0, input.distinctChannels);
  if (channels > 0) {
    const channelPoints = Math.min(
      channels * engagement.perChannel,
      engagement.channelCap,
    );
    breakdown.push({
      group: "engagement",
      label: "Channel breadth",
      points: channelPoints,
      detail: `${channels} channels`,
    });
  }

  const raw = breakdown.reduce((sum, c) => sum + c.points, 0);
  const score = clampScore(raw);
  return { score, band: leadScoreBand(score), breakdown };
}
