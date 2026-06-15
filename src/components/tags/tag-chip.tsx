import { cn } from "@/lib/cn";
import type { AppliedTag } from "@/types";

/**
 * Tag colour tokens (ADR-0065 B6, #340). A tag's `color` is one of these NAMES —
 * never a raw hex — so the palette stays coupled to the design tokens. Unknown
 * names fall back to `slate`.
 */
export const TAG_COLORS = [
  "slate",
  "accent",
  "accent-2",
  "green",
  "amber",
  "red",
] as const;

const TONE: Record<string, string> = {
  slate: "border-border bg-panel-2 text-dim",
  accent: "border-accent/40 bg-accent/10 text-accent",
  "accent-2": "border-accent-2/40 bg-accent-2/10 text-accent-2",
  green: "border-green/40 bg-green/10 text-green",
  amber: "border-amber/40 bg-amber/10 text-amber",
  red: "border-red/40 bg-red/10 text-red",
};

/** A single colour-coded tag chip. `onRemove` renders an inline × when provided. */
export function TagChip({
  tag,
  className,
  onRemove,
}: {
  tag: Pick<AppliedTag, "label" | "color">;
  className?: string;
  onRemove?: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
        TONE[tag.color] ?? TONE.slate,
        className,
      )}
    >
      {tag.label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${tag.label}`}
          className="-mr-0.5 ml-0.5 leading-none opacity-70 hover:opacity-100"
        >
          ×
        </button>
      )}
    </span>
  );
}
