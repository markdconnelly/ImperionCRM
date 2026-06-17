import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeMarketing, canManageCampaigns } from "@/lib/auth/roles";
import { getRepositories } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Segments — list-first surface (ADR-0073 decision 2, #421). A `segment` is a
 * general-purpose CRM contact set (manual or rule), the enrollment source for marketing
 * journeys and reusable for comms / list views. Gated by the Marketing group guard
 * (admin | sales); creating/editing is gated by `canManageCampaigns` (same roles). Reads
 * degrade to empty when migration 0126 isn't applied yet (the data layer's schema-lag
 * pattern) — the page shows an empty state, never a 500.
 */
export default async function SegmentsPage() {
  const roles = await getSessionRoles();
  if (!canSeeMarketing(roles)) redirect("/");
  const canWrite = canManageCampaigns(roles);

  const { segments } = getRepositories();
  const rows = await segments.listSegments();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Segments"
        description="Reusable CRM contact sets — static (manual) or dynamic (rule-based). The enrollment source for journeys and a building block for comms and list views. Distinct from ad audiences."
      >
        {canWrite && (
          <Link
            href="/segments/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New segment
          </Link>
        )}
      </PageHeader>

      {rows.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-panel p-8 text-sm text-dim">
          <Icon name="Users" size={16} />
          No segments yet.{canWrite ? " Create one to group contacts for journeys and comms." : ""}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((s) => (
            <li key={s.id} className="rounded-xl border border-border bg-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/segments/${s.id}`} className="font-medium hover:text-accent">
                  {s.name}
                </Link>
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-dim">
                  {s.type}
                </span>
              </div>
              {s.description && <div className="mt-1 text-xs text-dim">{s.description}</div>}
              <div className="mt-3 flex items-center gap-3 text-xs text-dim">
                <span>
                  {s.memberCount} member{s.memberCount === 1 ? "" : "s"}
                </span>
                {s.owner && <span>· {s.owner}</span>}
                <Link
                  href={`/segments/${s.id}`}
                  className="ml-auto text-accent transition-colors hover:underline"
                >
                  Open →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
