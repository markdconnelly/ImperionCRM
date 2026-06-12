import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { EventForm } from "@/components/events/event-form";
import { getRepositories } from "@/lib/data";
import { updateEventAction } from "../../actions";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { events } = getRepositories();
  const event = await events.getEvent(id);
  if (!event) notFound();
  const kind = event.kind === "live_event" ? "live_event" : "webinar";
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Edit: ${event.name}`}
        description="Blank schedule fields keep the stored times."
      />
      <EventForm action={updateEventAction} kind={kind} event={event} />
    </div>
  );
}
