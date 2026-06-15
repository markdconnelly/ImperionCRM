import { PageHeader } from "@/components/ui/page-header";
import { JourneysTable } from "@/components/journeys/journeys-table";
import { getRepositories } from "@/lib/data";

// Marketing journeys list (ADR-0073, #397). A journey is a single object on the
// existing workflow substrate (kind='journey'); this surface is read-only — the
// builder is #399 and the runtime (gated sends) is the backend journey runner #398.
export default async function JourneysPage() {
  const { workflows } = getRepositories();
  const journeys = await workflows.listJourneys();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <PageHeader
          title="Journeys"
          description="Multi-step marketing automation — cadences, A/B sends, and engagement branches. A journey is one object on the workflow engine (ADR-0073). Read-only here; the builder is coming."
        />
        <JourneysTable journeys={journeys} />
        <p className="text-xs text-dim">
          Sends still cross the approval gate and autonomy dial (ADR-0058/0055) — automation is not a bypass.
        </p>
      </section>
    </div>
  );
}
