import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageCampaigns } from "@/lib/auth/roles";
import { setRegistrationStatusAction } from "../actions";

function Fact({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-dim">{label}</p>
      <p className="mt-0.5 text-sm">{value ?? "—"}</p>
    </div>
  );
}

/** Event record (ADR-0053): facts, derived funnel, registrations + attendance (#230). */
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { events } = getRepositories();
  const [roles, event, registrations] = await Promise.all([
    getSessionRoles(),
    events.getEvent(id),
    events.listRegistrations(id),
  ]);
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

      {/* Registrations + attendance (ADR-0053 §2, #230). */}
      <section className="flex flex-col gap-2">
        <h3 className="font-display text-base font-semibold tracking-tight">Registrations</h3>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-panel-2 text-left text-xs text-dim">
              <tr>
                <th className="px-3 py-2 font-medium">Contact</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Registered</th>
                <th className="px-3 py-2 font-medium">Checked in</th>
                {canWrite ? <th className="px-3 py-2 text-right font-medium">Attendance</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-panel">
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 6 : 5} className="px-3 py-5 text-center text-dim">
                    No registrations yet — signups arrive via the event-registration capture hook.
                  </td>
                </tr>
              ) : (
                registrations.map((r) => (
                  <tr key={r.id} className="hover:bg-panel-2/60">
                    <td className="px-3 py-2">
                      {r.contactId ? (
                        <Link href={`/contacts/${r.contactId}`} className="text-text hover:text-accent">
                          {r.contact ?? "Contact"}
                        </Link>
                      ) : (
                        <span className="text-dim">Unresolved</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-dim">{r.status}</td>
                    <td className="px-3 py-2 text-dim">{r.source ?? "—"}</td>
                    <td className="px-3 py-2 text-dim">{r.registeredAt ?? "—"}</td>
                    <td className="px-3 py-2 text-dim">{r.checkedInAt ?? "—"}</td>
                    {canWrite ? (
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1.5">
                          {(
                            [
                              ["attended", "Attended", "1"],
                              ["no_show", "No-show", ""],
                            ] as const
                          ).map(([status, label, checkIn]) => (
                            <form key={status} action={setRegistrationStatusAction}>
                              <input type="hidden" name="eventId" value={event.id} />
                              <input type="hidden" name="registrationId" value={r.id} />
                              <input type="hidden" name="status" value={status} />
                              <input type="hidden" name="checkIn" value={checkIn} />
                              <button
                                type="submit"
                                className={`rounded border px-2 py-0.5 text-xs ${
                                  r.status === status
                                    ? "border-accent text-accent"
                                    : "border-border text-dim hover:text-text"
                                }`}
                              >
                                {label}
                              </button>
                            </form>
                          ))}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-xl border border-border bg-panel-2 p-4 text-xs text-dim">
        Registration page: <span className="text-text">{event.registrationHeadline ?? event.name}</span>
        {event.registrationBlurb ? <> — {event.registrationBlurb}</> : null} · signups land in
        the <Link href="/leads" className="text-accent">capture inbox</Link> and resolve to
        contacts like any other lead (ADR-0053 §2).
      </div>
    </div>
  );
}
