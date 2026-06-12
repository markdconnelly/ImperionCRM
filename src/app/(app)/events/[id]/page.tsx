import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageCampaigns } from "@/lib/auth/roles";

function Fact({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-dim">{label}</p>
      <p className="mt-0.5 text-sm">{value ?? "—"}</p>
    </div>
  );
}

/** Event record (ADR-0053): facts + derived funnel. Registrations/attendance UI lands with #230. */
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { events } = getRepositories();
  const [roles, event] = await Promise.all([getSessionRoles(), events.getEvent(id)]);
  if (!event) notFound();
  const canWrite = canManageCampaigns(roles);
  const isWebinar = event.kind === "webinar";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={event.name}
        description={`${isWebinar ? "Webinar" : "Live event"} · ${event.status}`}
      >
        {canWrite ? (
          <Link
            href={`/events/${event.id}/edit`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
          >
            Edit
          </Link>
        ) : null}
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-panel p-5 md:grid-cols-4">
        <Fact label="Starts" value={event.startsAt} />
        <Fact label="Ends" value={event.endsAt} />
        <Fact label="Timezone" value={event.timezone} />
        <Fact label="Capacity" value={event.capacity ?? "Unlimited"} />
        {isWebinar ? (
          <Fact label="Teams link" value={event.joinUrl} />
        ) : (
          <Fact label="Venue" value={event.location} />
        )}
        <Fact label="Registered" value={event.registered} />
        <Fact label="Attended" value={event.attended} />
        <Fact label="No-shows" value={event.noShow} />
      </div>

      {event.description ? (
        <div className="rounded-xl border border-border bg-panel p-5 text-sm text-dim">
          {event.description}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-panel-2 p-4 text-xs text-dim">
        Registration page: <span className="text-text">{event.registrationHeadline ?? event.name}</span>
        {event.registrationBlurb ? <> — {event.registrationBlurb}</> : null} · signups land in
        the <Link href="/leads" className="text-accent">capture inbox</Link> and resolve to
        contacts like any other lead (ADR-0053 §2).
      </div>
    </div>
  );
}
