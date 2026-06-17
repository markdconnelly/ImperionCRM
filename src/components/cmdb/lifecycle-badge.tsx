import {
  LIFECYCLE_LABEL,
  LIFECYCLE_TONE,
  type AssetLifecycle,
} from "@/lib/cmdb/lifecycle";

/**
 * CI asset lifecycle badge (#649). Renders the DERIVED, read-only lifecycle state as a
 * tinted pill — the same vocabulary the CI register + detail share. `unknown` (a
 * non-asset CI, or a device whose signals can't place it) renders NOTHING, so the
 * badge only appears where it carries meaning. Pure presentational.
 */

/** Design-token tint per tone (matches the criticality / device-inventory badges). */
const toneClass: Record<(typeof LIFECYCLE_TONE)[AssetLifecycle], string> = {
  green: "bg-green/10 text-green",
  accent: "bg-accent/10 text-accent",
  amber: "bg-amber/10 text-amber",
  dim: "bg-panel-2 text-dim",
};

export function LifecycleBadge({
  lifecycle,
  size = "sm",
}: {
  lifecycle: AssetLifecycle;
  size?: "sm" | "xs";
}) {
  // `unknown` is the graceful fallback — render nothing rather than a noisy pill.
  if (lifecycle === "unknown") return null;

  const tone = LIFECYCLE_TONE[lifecycle];
  const dims = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded font-medium ${dims} ${toneClass[tone]}`}
      title={`Lifecycle: ${LIFECYCLE_LABEL[lifecycle]} (derived from source signals; read-only)`}
    >
      {LIFECYCLE_LABEL[lifecycle]}
    </span>
  );
}
