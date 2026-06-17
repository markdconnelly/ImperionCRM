import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeMarketing } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * Segments (#794 nav scaffold — real build = #420/#421). Placeholder so the
 * Marketing group's "Segments" link resolves with no dead route. Gated by the
 * Marketing group guard (admin | sales); real audience-segment management lands
 * in a later wave.
 */
export default async function SegmentsPage() {
  const roles = await getSessionRoles();
  if (!canSeeMarketing(roles)) redirect("/");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Segments"
        description="Audience segments for marketing campaigns and journeys."
      />
      <div className="flex items-center gap-2 rounded-md border border-border bg-panel p-4 text-sm text-dim">
        <Icon name="Construction" size={16} />
        Coming soon (later wave) — real segment management is tracked in #420/#421.
      </div>
    </div>
  );
}
