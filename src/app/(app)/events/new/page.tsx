import { PageHeader } from "@/components/ui/page-header";
import { EventForm } from "@/components/events/event-form";
import { getRepositories } from "@/lib/data";
import { createEventAction } from "../actions";

/** The webinar / live-event builder entry (ADR-0053 §3): ?kind picks the shape. */
export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const k = kind === "live_event" ? "live_event" : "webinar";
  const { workflows } = getRepositories();
  const workflowList = await workflows.listWorkflows();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={k === "webinar" ? "New webinar" : "New live event"}
        description={
          k === "webinar"
            ? "In-app registration plus a Teams meeting link on the event."
            : "Venue event — registrations via the page or QR; manual check-in on the day."
        }
      />
      <EventForm
        action={createEventAction}
        kind={k}
        workflows={workflowList.filter((w) => w.status === "active")}
      />
    </div>
  );
}
