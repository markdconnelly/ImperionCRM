import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CredentialsCatalog } from "@/components/settings/credentials-catalog";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * Credentials catalog (ADR-0103, #905) — the governed read-only view of every Key Vault
 * credential the system custodies, by scope (Personal / Company / Client) with the linked
 * account. Admin-only (`canSeeSettings`, ADR-0030). Renders secret NAMES only — never values.
 *
 * The per-client registration FORMS (M365 / UniFi) moved to the client-mapping screen
 * (ADR-0122 S3a) — each client's credential is entered beside its account mapping, where its
 * health also shows. This page keeps only the cross-scope registry table. (S3b retires the
 * page entirely once the table folds into the connector cards.)
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
      <p className="rounded-md border border-border bg-panel-2 px-3 py-2 text-xs text-dim">
        Per-client credentials (Microsoft 365, UniFi) are now entered on the client-mapping
        screen — see{" "}
        <Link href="/settings/client-mapping/m365" className="text-accent hover:text-text">
          M365 client mapping
        </Link>{" "}
        or{" "}
        <Link href="/settings/client-mapping/unifi" className="text-accent hover:text-text">
          UniFi client mapping
        </Link>
        .
      </p>
      <CredentialsCatalog connections={all} />
    </div>
  );
}
