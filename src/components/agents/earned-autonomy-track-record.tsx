import { agentLabel } from "@/lib/agent/pending-action-cockpit";
import { isAlwaysGate } from "@/lib/security/data-class";
import type { EarnedRecord } from "@/lib/agent/earned-autonomy";

/**
 * Earned-autonomy track record panel (#1220, parent #1036 / ADR-0121). The cockpit's
 * read-only view of the EARNED dimension that sits over the operator dial: for each agent /
 * action class with a persisted record it shows the current earned tier, the clean streak
 * toward the next promotion, and the last promotion / demotion (kind, from→to tier, reason,
 * when). It explains *why* a parked or executed action sat where it did — an agent that has
 * graduated a class runs more inline; a class that just demoted is back at the dial floor.
 *
 * Always-gate classes (money / credentials / customer-facing — `data_class.always_gate`,
 * ADR-0118 / ADR-0121) carry a HARD-CAPPED badge: the earned dimension can never auto-cross
 * them, so they keep surfacing to a human regardless of any track record. The badge makes
 * that invariant legible to the operator at the cockpit.
 *
 * Pure presentation over the {@link EarnedRecord} read layer (`earned-autonomy-data.ts`).
 * Server component — no client state. PII-FREE: agent keys + class names + tier labels +
 * counters only, never any row-level or customer data (ADR-0121 acceptance).
 */
export function EarnedAutonomyTrackRecord({ records }: { records: EarnedRecord[] }) {
  if (records.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-panel p-5">
        <h3 className="mb-1 font-display text-sm font-semibold tracking-tight">
          Earned-autonomy track record
        </h3>
        <p className="text-sm text-dim">
          No earned records yet — once an agent builds a clean streak on an action class it
          auto-promotes its ceiling one tier at a time (and instantly demotes on a miss). The
          tier, streak, and last transition appear here (ADR-0121).
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-tight">
          Earned-autonomy track record
          <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[10px] text-dim">
            {records.length} record{records.length === 1 ? "" : "s"}
          </span>
        </h3>
        <span className="text-[11px] text-dim">earn → promote · miss → demote (ADR-0121)</span>
      </div>
      {records.map((record) => (
        <TrackRecordCard key={`${record.agentKey}::${record.actionClass}`} record={record} />
      ))}
    </section>
  );
}

const TIER_TONE: Record<string, string> = {
  T0: "text-dim",
  T1: "text-accent",
  T2: "text-amber",
  T3: "text-red",
};

function TrackRecordCard({ record }: { record: EarnedRecord }) {
  const hardCapped = isAlwaysGate(record.actionClass);
  const atTop = record.earnedTier === "T3";
  const streakPct = atTop
    ? 100
    : Math.min(100, Math.round((record.cleanStreak / Math.max(1, record.promoteThreshold)) * 100));
  const last = record.lastTransition;

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-xs font-medium text-text">
          {agentLabel(record.agentKey)}
        </span>
        <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-xs text-text">
          {record.actionClass}
        </span>
        {record.earnedTier ? (
          <span
            className={`rounded border border-border px-1.5 py-0.5 text-[10px] ${TIER_TONE[record.earnedTier] ?? "text-dim"}`}
          >
            earned {record.earnedTier}
          </span>
        ) : (
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-dim">
            dial floor · nothing earned
          </span>
        )}
        {hardCapped && (
          <span
            title="Always-gate class (money / credentials / customer-facing) — earned autonomy can never auto-cross it; it always surfaces to a human (ADR-0121)."
            className="rounded border border-red/60 bg-red/10 px-1.5 py-0.5 text-[10px] font-medium text-red"
          >
            HARD-CAPPED
          </span>
        )}
      </div>

      <dl className="flex flex-col gap-2 text-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-dim">Clean streak toward next promotion</dt>
            <dd className="text-text">
              {atTop ? "at top earned tier (T3)" : `${record.cleanStreak} / ${record.promoteThreshold}`}
            </dd>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${streakPct}%` }}
            />
          </div>
          <p className="text-[11px] text-dim">
            {atTop
              ? "Maximum earned ceiling reached on this class."
              : `${record.promoteThreshold - record.cleanStreak} more clean approval${
                  record.promoteThreshold - record.cleanStreak === 1 ? "" : "s"
                } (eval ≥ ${record.cleanEvalFloor}) steps the ceiling up one tier. One miss resets to the dial floor.`}
          </p>
        </div>

        <div className="flex gap-2 border-t border-border pt-2">
          <dt className="shrink-0 text-dim">Last transition</dt>
          {last ? (
            <dd className="flex flex-col gap-0.5 text-text">
              <span>
                <span className={last.kind === "promote" ? "text-green" : "text-red"}>
                  {last.kind === "promote" ? "▲ promote" : "▼ demote"}
                </span>{" "}
                {last.from ?? "floor"} → {last.to ?? "floor"}
                <span className="ml-2 text-[11px] text-dim">
                  {new Date(last.at).toLocaleString()}
                </span>
              </span>
              <span className="text-[11px] text-dim">{last.reason}</span>
            </dd>
          ) : (
            <dd className="text-dim">no transitions yet</dd>
          )}
        </div>
      </dl>
    </div>
  );
}
