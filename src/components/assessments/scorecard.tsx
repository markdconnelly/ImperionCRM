import { cn } from "@/lib/cn";
import { RATING_CHIP, RATING_LABEL, type AssessmentRating } from "@/lib/assessment";
import type { AssessmentScore } from "@/types";

/** A single rating chip; muted when the dimension hasn't been scored yet. */
function RatingChip({ rating }: { rating: string | null }) {
  if (!rating) {
    return (
      <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] text-dim">
        Not scored
      </span>
    );
  }
  const r = rating as AssessmentRating;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", RATING_CHIP[r] ?? "bg-panel-2 text-dim")}>
      {RATING_LABEL[r] ?? rating}
    </span>
  );
}

/** Compact six-dimension scorecard used in the list and on the edit page. */
export function Scorecard({ scores }: { scores: AssessmentScore[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {scores.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5" title={s.label}>
          <span className="text-[11px] text-dim">{s.label}</span>
          <RatingChip rating={s.rating} />
        </span>
      ))}
    </div>
  );
}
