import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageCampaigns } from "@/lib/auth/roles";
import { SegmentForm } from "../segment-form";
import { createSegmentAction } from "../actions";

export const dynamic = "force-dynamic";

/** Create a new segment (#421). Gated by `canManageCampaigns` (admin | sales). */
export default async function NewSegmentPage() {
  const roles = await getSessionRoles();
  if (!canManageCampaigns(roles)) redirect("/segments");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="New segment" description="Define a contact set. Add members after saving.">
        <Link href="/segments" className="text-sm text-dim transition-colors hover:text-text">
          ← Segments
        </Link>
      </PageHeader>
      <SegmentForm action={createSegmentAction} submitLabel="Create segment" />
    </div>
  );
}
