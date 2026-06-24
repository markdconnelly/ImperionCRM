import type { HealthTone, HealthVerdict } from "@/lib/integrations/connection-health";

/**
 * Color-coded connection-health indicator (ADR-0122, epic #1256 S2). A small dot + label
 * whose tone is the inferred verdict from {@link inferConnectionHealth}; the full detail is
 * the hover tooltip. Pure presentational — no hooks, no client state — so it renders inside
 * server or client cards. The same dot is reused on each per-client row of the client-mapping
 * surface (S3), so the health language is identical everywhere a connection is shown.
 */

const DOT_TONE: Record<HealthTone, string> = {
  green: "bg-green",
  amber: "bg-amber",
  red: "bg-red",
  dim: "bg-dim/50",
};

const TEXT_TONE: Record<HealthTone, string> = {
  green: "text-green",
  amber: "text-amber",
  red: "text-red",
  dim: "text-dim",
};

export function HealthDot({
  health,
  showLabel = true,
  className = "",
}: {
  health: HealthVerdict;
  /** Hide the text label to render just the dot (e.g. a dense per-client row). */
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={`${health.label} — ${health.detail}`}
    >
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${DOT_TONE[health.tone]}`}
        aria-hidden="true"
      />
      {showLabel && (
        <span className={`text-xs font-medium ${TEXT_TONE[health.tone]}`}>{health.label}</span>
      )}
      <span className="sr-only">{`Connection health: ${health.label}. ${health.detail}`}</span>
    </span>
  );
}
