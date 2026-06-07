import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ConnectionCard } from "@/components/integrations/connection-card";
import { ConnectAccount } from "@/components/integrations/connect-account";
import { getRepositories } from "@/lib/data";
import { connectAction, disconnectAction } from "./actions";

export default async function IntegrationsPage() {
  const session = await auth();
  const userId = session?.user?.email ?? "";

  const { connections } = getRepositories();
  const [personal, company] = await Promise.all([
    connections.listUserConnections(userId),
    connections.listCompanyConnections(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integrations"
        description="Your personal connected accounts and company-wide systems. Tokens live in Key Vault — never here."
      />

      {/* Per-user personal connections (ADR-0024) */}
      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold tracking-tight">
            Your connected accounts
          </h3>
          <p className="mt-0.5 text-sm text-dim">
            Connect your own 365 / social accounts so your communications flow into the
            timeline — attributed first to you, then to the company.
          </p>
        </div>
        <ConnectAccount connectAction={connectAction} />
        {personal.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {personal.map((c) => (
              <ConnectionCard key={c.id} connection={c} disconnectAction={disconnectAction} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-dim">No personal accounts connected yet.</p>
        )}
      </section>

      {/* Company-wide systems (ADR-0012) */}
      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold tracking-tight">
            Company systems
          </h3>
          <p className="mt-0.5 text-sm text-dim">
            Org-wide connections. Autotask &amp; IT Glue are <em>polled</em> on demand and
            never duplicated; M365/Graph ingests into the timeline.
          </p>
        </div>
        {company.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {company.map((c) => (
              <ConnectionCard key={c.id} connection={c} disconnectAction={disconnectAction} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-dim">No company systems connected yet.</p>
        )}
      </section>
    </div>
  );
}
