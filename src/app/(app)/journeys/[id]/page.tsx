import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { JourneyFlow } from "@/components/journeys/journey-flow";
import { getRepositories } from "@/lib/data";

// Read-only journey viewer (ADR-0073, #397). The builder is #399; the gated runtime
// is the backend journey runner #398.
export default async function JourneyDetailPage({
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
        <Link href="/journeys" className="text-xs text-dim hover:text-accent">
          ← Journeys
        </Link>
      </div>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={journey.name}
          description={`Marketing journey · ${journey.status}. One object on the workflow engine (ADR-0073) — steps, A/B, and branches below.`}
        />
        <Link
          href={`/journeys/${id}/edit`}
          className="shrink-0 rounded-md border border-border px-4 py-2 text-sm text-text hover:border-accent"
        >
          Edit
        </Link>
      </div>
      <JourneyFlow journey={journey} />
    </div>
  );
}
