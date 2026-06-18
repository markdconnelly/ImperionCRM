import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CredentialsCatalog } from "@/components/settings/credentials-catalog";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * Credentials catalog (ADR-0103, #905) — the governed view of every Key Vault credential
 * the system custodies, by scope (Personal / Company / Client) with the linked account.
 * Admin-only (`canSeeSettings`, ADR-0030). Renders secret NAMES only — never values.
 */
export default async function CredentialsSettingsPage() {
  const roles = await getSessionRoles();
  if (!canSeeSettings(roles)) redirect("/");

  const { connections } = getRepositories();
  const all = await connections.listAllConnections();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Credentials"
        description="Every Key Vault credential the system custodies, by scope and linked account. Names only — values never leave Key Vault (ADR-0103)."
      />
      <CredentialsCatalog connections={all} />
    </div>
  );
}
