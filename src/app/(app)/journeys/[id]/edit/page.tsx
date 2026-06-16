import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { JourneyBuilder } from "@/components/journeys/journey-builder";
import { getRepositories } from "@/lib/data";

// The journey builder surface (ADR-0073, #399). Edits the SINGLE journey object —
// ordered steps, delays, branches, A/B sends — and saves the whole `definition` back
// onto the workflow row. The gated runtime is the backend journey runner (#398).
export default async function EditJourneyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workflows } = getRepositories();
  const journey = await workflows.getJourney(id);
  if (!journey) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/journeys/${id}`} className="text-xs text-dim hover:text-accent">
          ← {journey.name}
        </Link>
      </div>
      <PageHeader
        title="Edit journey"
        description="Steps, delays, and engagement branches — one object on the workflow engine (ADR-0073)."
      />
      <JourneyBuilder
        journeyId={journey.id}
        initialName={journey.name}
        initialStatus={journey.status}
        initialDefinition={journey.definition}
      />
    </div>
  );
}
