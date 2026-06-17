import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * Global connections settings (#794 nav scaffold). Placeholder so the Settings
 * group's "Global connections" link resolves. Admin-only (`canSeeSettings`,
 * ADR-0030) — org-wide connection custody is distinct from per-user "Your
 * connections" on the main Settings page. Real content lands in a later wave.
 */
export default async function GlobalConnectionsSettingsPage() {
  const roles = await getSessionRoles();
  if (!canSeeSettings(roles)) redirect("/");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Global connections"
        description="Org-wide data connections and their custody status."
      />
      <div className="flex items-center gap-2 rounded-md border border-border bg-panel p-4 text-sm text-dim">
        <Icon name="Construction" size={16} />
        Coming soon (later wave).
      </div>
    </div>
  );
}
