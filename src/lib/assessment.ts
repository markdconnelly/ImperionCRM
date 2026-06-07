/**
 * AI Security Readiness Assessment — shared metadata (ADR-0022).
 *
 * The six scored dimensions and the four-level rating scale come straight from the
 * assessment deliverable (docs/reference/sales-marketing/). Used by the data layer to
 * map DB columns and by the UI to render the scorecard. Safe in client and server.
 */

/** The six dimensions, in display order. `key` maps to the `<key>_rating` column. */
export const ASSESSMENT_DIMENSIONS = [
  { key: "identity", label: "Identity Security" },
  { key: "endpoint", label: "Endpoint Security" },
  { key: "network", label: "Network Segmentation" },
  { key: "email", label: "Email & Collaboration" },
  { key: "backup", label: "Backup & Recovery" },
  { key: "incident", label: "Incident Readiness" },
] as const;

export type AssessmentDimensionKey = (typeof ASSESSMENT_DIMENSIONS)[number]["key"];

/** Rating scale, weakest → strongest. */
export const ASSESSMENT_RATINGS = ["at_risk", "needs_work", "solid", "strong"] as const;
export type AssessmentRating = (typeof ASSESSMENT_RATINGS)[number];

export const RATING_LABEL: Record<AssessmentRating, string> = {
  at_risk: "At Risk",
  needs_work: "Needs Work",
  solid: "Solid",
  strong: "Strong",
};

/** Tailwind classes for a rating chip (matches the §6 token palette). */
export const RATING_CHIP: Record<AssessmentRating, string> = {
  at_risk: "bg-red/15 text-red",
  needs_work: "bg-amber/15 text-amber",
  solid: "bg-green/15 text-green",
  strong: "bg-accent/15 text-accent",
};
