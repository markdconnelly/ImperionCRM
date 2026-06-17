import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeMarketing, canManageCampaigns } from "@/lib/auth/roles";
import { getRepositories } from "@/lib/data";
import { SegmentForm } from "../segment-form";
import { MemberManager } from "../member-manager";
import { updateSegmentAction, deleteSegmentAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Segment detail (#421): view + edit the segment, manage membership (manual add, bulk
 * add, rule preview/materialize), and remove members. Gated by the Marketing group guard;
 * editing/membership writes by `canManageCampaigns`. The contact list feeds the member
 * picker and the rule preview. If migration 0126 isn't applied the read returns null →
 * notFound (never a 500).
 */
export default async function SegmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roles = await getSessionRoles();
  if (!canSeeMarketing(roles)) redirect("/");
  const canWrite = canManageCampaigns(roles);

  const { segments, crm } = getRepositories();
  const segment = await segments.getSegment(id);
  if (!segment) notFound();

  const [members, contacts] = await Promise.all([
    segments.listSegmentMembers(id),
    crm.listContacts(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={segment.name}
        description={segment.description ?? "CRM contact set."}
      >
        <Link href="/segments" className="text-sm text-dim transition-colors hover:text-text">
          ← Segments
        </Link>
        {canWrite && (
          <form action={deleteSegmentAction}>
            <input type="hidden" name="id" value={segment.id} />
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:border-red hover:text-red"
            >
              Delete
            </button>
          </form>
        )}
      </PageHeader>

      <div className="flex items-center gap-3 text-sm text-dim">
        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase">
          {segment.type}
        </span>
        <span>
          {segment.memberCount} member{segment.memberCount === 1 ? "" : "s"}
        </span>
        {segment.owner && <span>· owned by {segment.owner}</span>}
      </div>

      <MemberManager
        segment={segment}
        members={members}
        contacts={contacts}
        canWrite={canWrite}
      />

      {canWrite && (
        <details className="rounded-md border border-border bg-panel p-4">
          <summary className="cursor-pointer text-sm font-medium">Edit segment</summary>
          <div className="mt-4">
            <SegmentForm
              action={updateSegmentAction}
              initial={segment}
              hiddenId={segment.id}
              submitLabel="Save changes"
            />
          </div>
        </details>
      )}
    </div>
  );
}
