import { Scorecard } from "@/components/assessments/scorecard";
import type { AssessmentScore, ArtifactRow } from "@/types";

/**
 * Client-ready report preview (ADR-0033). Assembles the deliverable from the
 * six-dimension scorecard, the top priorities, the recommendation, and the
 * evidence collected (Televy + M365 + scans). This is what gets handed to the
 * prospect when the assessment is delivered.
 */
export function ReportPreview({
  name,
  account,
  status,
  scores,
  topPriorities,
  recommendation,
  artifacts,
}: {
  name: string;
  account: string | null;
  status: string;
  scores: AssessmentScore[];
  topPriorities: string | null;
  recommendation: string | null;
  artifacts: ArtifactRow[];
}) {
  const televy = artifacts.filter((a) => a.source === "televy");
  const other = artifacts.filter((a) => a.source !== "televy");

  return (
    <div className="rounded-xl border border-border bg-panel">
      <div className="border-b border-border px-5 py-4">
        <div className="text-xs uppercase tracking-wide text-dim">
          AI Security Readiness Assessment
        </div>
        <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">{name}</h2>
        <p className="mt-0.5 text-sm text-dim">
          {account ?? "—"} · {status.replace(/_/g, " ")}
        </p>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold">Security posture</h3>
          <Scorecard scores={scores} />
        </section>

        <section>
          <h3 className="mb-1 text-sm font-semibold">Top priorities</h3>
          <p className="whitespace-pre-wrap text-sm text-dim">
            {topPriorities ?? "Not yet documented."}
          </p>
        </section>

        <section>
          <h3 className="mb-1 text-sm font-semibold">Recommendation</h3>
          <p className="whitespace-pre-wrap text-sm text-dim">
            {recommendation ?? "Not yet documented."}
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">
            Evidence{" "}
            <span className="text-xs font-normal text-dim">
              ({televy.length} from Televy · {other.length} other)
            </span>
          </h3>
          {artifacts.length === 0 ? (
            <p className="text-sm text-dim">
              No evidence ingested yet. Televy telemetry and M365 read-only signals land here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {[...televy, ...other].map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        a.source === "televy" ? "bg-accent/15 text-accent" : "bg-panel text-dim"
                      }`}
                    >
                      {a.source === "televy" ? "Televy" : a.source.replace(/_/g, " ")}
                    </span>
                    <span className="font-medium">{a.title ?? a.kind}</span>
                    {a.dimension && <span className="text-xs text-dim">· {a.dimension}</span>}
                    {a.collectedAt && (
                      <span className="ml-auto text-xs text-dim">{a.collectedAt}</span>
                    )}
                  </div>
                  {a.summary && <p className="mt-1 text-dim">{a.summary}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
