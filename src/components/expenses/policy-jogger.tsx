import { cn } from "@/lib/cn";
import type { ExpensePolicyViolationRow } from "@/types";

/**
 * Policy memory-jogger (ADR-0083, #487) — the pre-attest nudge panel. Surfaces every
 * derived `expense_policy_violation` row for the Open report: HARD rows (missing receipt,
 * over the category cap, dated outside the month) block attestation and are also flagged
 * inline on the offending row; SOFT rows (over the soft threshold, uncategorized,
 * suspected duplicate) only nudge. Each row shows the human-readable `detail` the view
 * computes. The IT Glue policy deep-link is intentionally omitted until the company
 * expense policy is authored there (#493, operator-gated) — we don't render a dead link.
 */
export function PolicyJogger({ violations }: { violations: ExpensePolicyViolationRow[] }) {
  if (violations.length === 0) return null;

  const hard = violations.filter((v) => v.severity === "hard");
  const soft = violations.filter((v) => v.severity === "soft");

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text">Before you attest</h3>
        <span className="text-xs text-dim">
          {hard.length > 0 ? `${hard.length} to fix` : `${soft.length} to review`}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {[...hard, ...soft].map((v, i) => (
          <li
            key={`${v.expenseItemId}-${v.ruleKey}-${i}`}
            className={cn(
              "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
              v.severity === "hard"
                ? "border-red/40 bg-red/5 text-red"
                : "border-border bg-panel-2 text-dim",
            )}
          >
            <span
              className={cn(
                "mt-0.5 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                v.severity === "hard" ? "bg-red/15 text-red" : "bg-border/60 text-dim",
              )}
            >
              {v.severity === "hard" ? "Fix" : "Review"}
            </span>
            <span className="text-text/90">{v.detail}</span>
          </li>
        ))}
      </ul>

      {hard.length > 0 && (
        <p className="text-xs text-dim">
          Items marked <span className="font-medium text-red">Fix</span> must be resolved before this
          report can be attested.
        </p>
      )}
    </div>
  );
}
