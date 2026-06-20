import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CredentialsCatalog } from "@/components/settings/credentials-catalog";
import { ClientCredentialForm } from "@/components/settings/client-credential-form";
import { ClientUnifiCredentialForm } from "@/components/settings/client-unifi-credential-form";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";
import { registerClientM365Action, registerClientUnifiAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Credentials catalog (ADR-0103, #905) — the governed view of every Key Vault credential
 * the system custodies, by scope (Personal / Company / Client) with the linked account.
 * Admin-only (`canSeeSettings`, ADR-0030). Renders secret NAMES only — never values.
 *
 * Also carries the client registration forms — M365 (#950) and UniFi (#964): the write half
 * of the per-client credential registry. Each custodies its secret/cert/api-key via the
 * backend and appears in the catalog below. The forms degrade to a notice until the
 * integration backend (`INTEGRATION_SERVICE_URL`) is configured.
 */
export default async function CredentialsSettingsPage() {
  const roles = await getSessionRoles();
  if (!canSeeSettings(roles)) redirect("/");

  const { connections, crm } = getRepositories();
  const [all, accounts] = await Promise.all([
    connections.listAllConnections(),
    crm.accountOptions(),
  ]);

  const backendConfigured = Boolean(process.env.INTEGRATION_SERVICE_URL?.trim());
  const sourceNote = backendConfigured
    ? ""
    : "Credential custody backend isn't configured in this environment yet — registering will save nothing.";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Credentials"
        description="Every Key Vault credential the system custodies, by scope and linked account. Names only — values never leave Key Vault (ADR-0103)."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ClientCredentialForm
          accounts={accounts}
          canSubmit={backendConfigured}
          sourceNote={sourceNote}
          registerAction={registerClientM365Action}
        />
        <ClientUnifiCredentialForm
          accounts={accounts}
          canSubmit={backendConfigured}
          sourceNote={sourceNote}
          registerAction={registerClientUnifiAction}
        />
      </div>
      <CredentialsCatalog connections={all} />
    </div>
  );
}
