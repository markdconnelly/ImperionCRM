import { cn } from "@/lib/cn";
import { weekdayName } from "@/lib/week";
import type { TimeDeviation, TimeDeviationType } from "@/types";

/** Label + severity styling per deviation type (ADR-0082; backend ADR-0046). */
const DEVIATION: Record<TimeDeviationType, { label: string; hard: boolean }> = {
  over_logged: { label: "Over-logged", hard: true },
  overlap: { label: "Overlapping blocks", hard: true },
  temporal_orphan: { label: "Logged outside attended time", hard: false },
  under_logged_gap: { label: "Under-logged gap", hard: false },
  attended_nothing_logged: { label: "Attended, nothing logged", hard: false },
  logged_never_attended: { label: "Logged, never attended", hard: false },
};

/**
 * The reconciliation Deviations overlay (ADR-0082, #502): the full typed deviation list
 * the backend detects over silver `time_record` (backend ADR-0046) — including the
 * overlap + temporal-orphan row-pair cases the per-day verdict view can't express. Hard
 * deviations (over-logged, overlap) block attestation; soft ones are attestable with a
 * note. Renders nothing when the list is empty (backend off, or a clean week).
 */
export function DeviationList({ deviations }: { deviations: TimeDeviation[] }) {
  if (deviations.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-xs font-medium text-dim">
        Reconciliation flags ({deviations.length})
      </h4>
      <ul className="flex flex-col gap-1">
        {deviations.map((d, i) => {
          const meta = DEVIATION[d.type];
          return (
            <li
              key={`${d.workDate}-${d.type}-${i}`}
              className={cn(
                "flex flex-col gap-0.5 rounded border px-2.5 py-1.5 text-xs",
                d.severity === "hard"
                  ? "border-red/40 bg-red/10"
                  : "border-amber/40 bg-amber/10",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={cn("font-medium", d.severity === "hard" ? "text-red" : "text-amber")}>
                  {meta.label}
                </span>
                <span className="tabular-nums text-dim">
                  {weekdayName(d.workDate).slice(0, 3)}
                  {d.severity === "hard" ? " · Hard" : ""}
                </span>
              </span>
              <span className="text-dim">{d.detail}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
