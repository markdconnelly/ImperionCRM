import {
  CRITICALITY_LABEL,
  CRITICALITY_TONE,
  effectiveCriticality,
  type Criticality,
} from "@/lib/cmdb/criticality";

/**
 * CI criticality / business-impact badge (#648). Renders the EFFECTIVE criticality
 * (`override ?? derivedDefault`) as a tinted pill — the same vocabulary the CI register,
 * the CI detail, and impact analysis (#650) share. When an admin override is in force the
 * pill carries a subtle ring so it reads as "asserted, not derived". Pure presentational.
 */

/** Design-token tint per tone (matches the device-inventory badge convention). */
const toneClass: Record<(typeof CRITICALITY_TONE)[Criticality], string> = {
  red: "bg-red/10 text-red",
  amber: "bg-amber/10 text-amber",
  accent: "bg-accent/10 text-accent",
  dim: "bg-panel-2 text-dim",
};

export function CriticalityBadge({
  derivedDefault,
  override,
  size = "sm",
}: {
  derivedDefault: Criticality;
  override: Criticality | null;
  size?: "sm" | "xs";
}) {
  const effective = effectiveCriticality(derivedDefault, override);
  const tone = CRITICALITY_TONE[effective];
  const isOverridden = override !== null;
  const dims = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded font-medium ${dims} ${toneClass[tone]} ${
        isOverridden ? "ring-1 ring-inset ring-current/40" : ""
      }`}
      title={
        isOverridden
          ? `Criticality: ${CRITICALITY_LABEL[effective]} (admin override; derived default ${CRITICALITY_LABEL[derivedDefault]})`
          : `Criticality: ${CRITICALITY_LABEL[effective]} (derived default)`
      }
    >
      {CRITICALITY_LABEL[effective]}
      {isOverridden && <span className="ml-1 opacity-70">·set</span>}
    </span>
  );
}
