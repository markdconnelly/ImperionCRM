import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeService } from "@/lib/auth/roles";
import { getRepositories } from "@/lib/data";
import { ChangeCalendar } from "@/components/changes/change-calendar";

export const dynamic = "force-dynamic";

/**
 * Change calendar (#660, ADR-0079) — upcoming/scheduled changes laid on a month grid by their
 * planned window, filterable by account / type / risk. Read-only coordination + visibility
 * (planned-vs-now); conflicts are surfaced as context on the change detail, not enforced here.
 * Gated by the Service group guard (admin∨support), same as the list. Reads degrade to [] when
 * migration 0135 isn't applied (schema-lag-safe) — an empty calendar, never a 500.
 */
export default async function ChangeCalendarPage() {
  const roles = await getSessionRoles();
  if (!canSeeService(roles)) redirect("/");

  const { changes, crm } = getRepositories();
  const [rows, accounts] = await Promise.all([
    changes.listChangeRequests(),
    crm.listAccounts(),
  ]);
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Change calendar"
        description="Upcoming and scheduled changes over the managed estate, by planned window. Filter by account, type, or risk. Coordination + visibility only — overlapping windows are surfaced as context on each change, not enforced."
      >
        <Link href="/changes" className="text-sm text-dim transition-colors hover:text-text">
          ← Changes
        </Link>
      </PageHeader>

      <ChangeCalendar
        changes={rows}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        today={todayIso}
      />
    </div>
  );
}
