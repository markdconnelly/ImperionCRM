/**
 * Grounding-time authority resolution (#1035, ADR-0119, agentic-OS contract decision 4).
 *
 * When the orchestrator grounds an answer it may draw on three knowledge tiers (ADR-0114 / #966):
 *   - **canon / OKF**       — the curated meaning layer (ADR-0086): definitions, source-of-record,
 *                             authority rules. The most authoritative.
 *   - **company_silver**    — the merged silver tier: the company's normalized facts.
 *   - **personal**          — the caller's personal tier (ADR-0114 temporal-KG facts).
 *
 * The contract is deliberate: when tiers DISAGREE we do **not** pick a winner by hard precedence
 * for the system of record, and we do **not** let the model arbitrate. We **bubble the conflict to
 * the domain business owner** (the `domain_owner` registry → `grounding_conflict` workflow). BUT
 * the agent must not stall while that workflow runs — the contract REJECTS hedge/refuse-until-
 * resolved as the default. So the interim behavior is: **answer with the most-authoritative tier,
 * LABELLED**, and raise the conflict in parallel.
 *
 * This module is the pure decision core for that interim behavior. It is provider-agnostic and
 * holds NO DB access and NO AI key (ADR-0043) — the orchestrator feeds it the candidate claims
 * from each tier (already retrieved), it returns (a) the labelled most-authoritative answer to
 * serve now and (b) whether a conflict exists + its shape, which the caller persists via the
 * `grounding_conflict` data layer.
 *
 * "Most authoritative" = canon > company_silver > personal, **gated by temporal validity**: a tier
 * whose claim is expired (its validity window has closed — the ADR-0114 `valid_to`) is skipped, so
 * a fresh personal fact can out-rank a stale company claim. Equal validity falls back to the tier
 * order.
 */

/** The three grounding tiers, ordered most → least authoritative. */
export const TIER_ORDER = ["canon", "company_silver", "personal"] as const;
export type GroundingTier = (typeof TIER_ORDER)[number];

/** Human-facing label for each tier (shown when an answer is served from it). */
export const TIER_LABEL: Record<GroundingTier, string> = {
  canon: "Canon (OKF)",
  company_silver: "Company silver",
  personal: "Personal",
};

/**
 * One tier's contribution to a grounding question. `claim` is a PII-free summary of what the tier
 * asserts (NEVER row content — the same contract `grounding_conflict.*_claim` carries). A tier with
 * no claim is omitted from the input array (not passed with `claim: null`).
 */
export interface TierClaim {
  tier: GroundingTier;
  /** The PII-free summary of what this tier asserts. */
  claim: string;
  /**
   * Temporal validity: `true` (default) when the claim is currently valid. `false` when its
   * validity window has closed (ADR-0114 `valid_to` in the past) — such a claim is skipped for
   * authority and does not, by itself, constitute a conflict.
   */
  valid?: boolean;
}

/** A detected disagreement between two or more valid tiers, ready to persist as a conflict. */
export interface GroundingConflictDraft {
  /** The tier whose claim was served as the interim answer (the most-authoritative valid tier). */
  servedTier: GroundingTier;
  /** The labelled answer text served now (e.g. "Company silver: ARR is $1.2M"). */
  servedLabel: string;
  /** PII-free per-tier claims (only valid tiers that made a claim). */
  canonClaim: string | null;
  companyClaim: string | null;
  personalClaim: string | null;
  /** Human-readable description of the disagreement. */
  detail: string;
}

/** Result of resolving a grounding question across tiers. */
export interface GroundingResolution {
  /** The labelled most-authoritative answer to serve NOW (null only when no tier had a valid claim). */
  servedLabel: string | null;
  /** The tier the served answer came from (null when no valid claim). */
  servedTier: GroundingTier | null;
  /** A conflict to raise, or null when the valid tiers agree (or fewer than two made a claim). */
  conflict: GroundingConflictDraft | null;
}

/** Format the labelled answer a tier serves: "<Tier label>: <claim>". */
export function labelAnswer(tier: GroundingTier, claim: string): string {
  return `${TIER_LABEL[tier]}: ${claim}`;
}

/** Index in TIER_ORDER (lower = more authoritative). */
function tierRank(tier: GroundingTier): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * Normalize a claim for agreement comparison: trim + collapse whitespace + lowercase. Agreement is
 * intentionally exact-after-normalize — semantic equivalence is the orchestrator's job upstream;
 * here a differing string is a conflict (fail toward surfacing, never toward silently merging).
 */
function normalize(claim: string): string {
  return claim.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Resolve a grounding question across the tiers that made a claim.
 *
 * Behavior:
 *  - Drops claims whose `valid` is `false` (temporal gating).
 *  - Picks the most-authoritative remaining tier (canon > company_silver > personal) as the
 *    interim answer and labels it.
 *  - Raises a conflict iff two or more VALID tiers made claims that disagree (after normalize).
 *
 * Never throws; an empty/all-invalid input yields `{ servedLabel: null, servedTier: null,
 * conflict: null }` (the caller hedges only in that genuinely-no-data case).
 */
export function resolveGrounding(
  claims: readonly TierClaim[],
  opts: { concept?: string } = {},
): GroundingResolution {
  const valid = claims.filter((c) => c.valid !== false && c.claim.trim() !== "");
  if (valid.length === 0) {
    return { servedLabel: null, servedTier: null, conflict: null };
  }

  // Most authoritative valid tier wins the interim answer.
  const winner = [...valid].sort((a, b) => tierRank(a.tier) - tierRank(b.tier))[0];
  const servedLabel = labelAnswer(winner.tier, winner.claim);

  // Disagreement among valid tiers? Compare normalized claims.
  const distinct = new Set(valid.map((c) => normalize(c.claim)));
  if (distinct.size < 2) {
    return { servedLabel, servedTier: winner.tier, conflict: null };
  }

  const byTier = (t: GroundingTier): string | null =>
    valid.find((c) => c.tier === t)?.claim ?? null;

  const conceptPrefix = opts.concept ? `${opts.concept}: ` : "";
  const detail =
    conceptPrefix +
    "grounding tiers disagree — " +
    valid.map((c) => `${TIER_LABEL[c.tier]} says "${c.claim}"`).join("; ") +
    `. Served ${TIER_LABEL[winner.tier]} (most authoritative) pending owner resolution.`;

  return {
    servedLabel,
    servedTier: winner.tier,
    conflict: {
      servedTier: winner.tier,
      servedLabel,
      canonClaim: byTier("canon"),
      companyClaim: byTier("company_silver"),
      personalClaim: byTier("personal"),
      detail,
    },
  };
}
