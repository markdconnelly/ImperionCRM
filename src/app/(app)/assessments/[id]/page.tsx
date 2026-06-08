import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepositories } from "@/lib/data";
import { ASSESSMENT_DIMENSIONS } from "@/lib/assessment";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeRevenue } from "@/lib/auth/roles";
import { ReportPreview } from "@/components/assessments/report-preview";
import { QuestionFields } from "@/components/engagements/question-fields";
import { saveAssessmentAnswersAction } from "../actions";
import type { AssessmentScore } from "@/types";

/** Assessment detail: client-ready report + non-Televy data entry (ADR-0033). */
export default async function AssessmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { crm, engagements } = getRepositories();
  const [assessment, artifacts, questions, accounts, roles] = await Promise.all([
    crm.getAssessment(id),
    engagements.listAssessmentArtifacts(id),
    engagements.getQuestions("assessment"),
    crm.accountOptions(),
    getSessionRoles(),
  ]);
  if (!assessment) notFound();

  const accountName = accounts.find((a) => a.id === assessment.accountId)?.name ?? null;
  const scores: AssessmentScore[] = ASSESSMENT_DIMENSIONS.map((d) => ({
    key: d.key,
    label: d.label,
    rating: assessment.ratings[d.key] ?? null,
  }));
  const showFee = canSeeRevenue(roles) && assessment.feeAmount;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">{assessment.name}</h2>
          <p className="mt-0.5 text-sm text-dim">
            {accountName ?? "—"} · {assessment.status.replace(/_/g, " ")}
            {showFee ? ` · $${assessment.feeAmount} fee` : ""}
          </p>
        </div>
        <Link
          href={`/assessments/${id}/edit`}
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
        >
          Edit scorecard
        </Link>
      </div>

      {saved && (
        <div className="rounded-md border border-green/40 bg-green/10 px-4 py-2 text-sm text-green">
          Saved — assessment data updated.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Client-ready report */}
        <div className="lg:col-span-2">
          <ReportPreview
            name={assessment.name}
            account={accountName}
            status={assessment.status}
            scores={scores}
            topPriorities={assessment.topPriorities}
            recommendation={assessment.recommendation}
            artifacts={artifacts}
          />
        </div>

        {/* Non-Televy data entry */}
        <section className="rounded-xl border border-border bg-panel p-4">
          <h3 className="font-display text-sm font-semibold tracking-tight">
            Assessment data entry
          </h3>
          <p className="mt-0.5 mb-3 text-xs text-dim">
            Capture what Televy doesn&apos;t — the questions below feed the scorecard and report.
            Televy telemetry and the 1:1 M365 read-only grant land as evidence automatically.
          </p>
          <form action={saveAssessmentAnswersAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={id} />
            <QuestionFields questions={questions} />
            <button
              type="submit"
              className="self-start rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
            >
              Save data
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
