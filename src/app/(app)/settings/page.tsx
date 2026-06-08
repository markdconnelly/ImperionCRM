import Link from "next/link";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { CompanyCredentialCard } from "@/components/settings/company-credential-card";
import { ConnectAccount } from "@/components/integrations/connect-account";
import { ConnectionCard } from "@/components/integrations/connection-card";
import { COMPANY_PROVIDERS } from "@/lib/integrations/company-providers";
import { getRepositories } from "@/lib/data";
import {
  connectAction,
  disconnectAction,
  grantGdapAction,
  saveCredentialAction,
} from "./actions";

/** A headed settings card. */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="max-w-2xl rounded-xl border border-border bg-panel p-5">
      <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-dim">{label}</span>
      <span className="text-text">{value}</span>
    </div>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const session = await auth();
  const name = session?.user?.name ?? "Unknown user";
  const email = session?.user?.email ?? "—";

  const { connections } = getRepositories();
  const [personal, company] = await Promise.all([
    connections.listUserConnections(email),
    connections.listCompanyConnections(),
  ]);
  const companyByProvider = new Map(company.map((c) => [c.provider, c]));

  // ── Profile tab ────────────────────────────────────────────────────────────
  const profile = (
    <div className="flex flex-col gap-4">
      <Card title="Profile">
        <div className="flex flex-col gap-1.5">
          <Row label="Name" value={name} />
          <Row label="Email" value={email} />
          <Row label="Identity provider" value="Microsoft Entra ID (SSO)" />
        </div>
        <p className="mt-3 text-[11px] text-dim">
          Profile and roles come from Entra (ADR-0002/0016). To change them, update your
          Entra account — they sync on sign-in.
        </p>
      </Card>

      <Card title="Appearance">
        <AppearanceSettings />
      </Card>

      <Card title="Platform">
        <p className="text-sm text-dim">
          AI features run on a provider-agnostic model-routing layer (OpenAI / Azure
          OpenAI / Claude). Endpoint and routing configuration is managed in App Service
          settings, not here.
        </p>
        <a
          href="https://github.com/markdconnelly/ImperionCRM/tree/main/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm text-accent hover:underline"
        >
          Documentation library →
        </a>
      </Card>
    </div>
  );

  // ── Your connections tab (personal, ADR-0024) ────────────────────────────────
  const connectionsPanel = (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-display text-sm font-semibold tracking-tight">
          Your connected accounts
        </h3>
        <p className="mt-0.5 text-sm text-dim">
          Connect your own 365 / social accounts so your communications flow into the
          timeline — attributed first to you, then to the company. Tokens live in Key Vault.
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
      <Link href="/consent" className="text-sm text-accent hover:underline">
        Consent ledger →
      </Link>
    </section>
  );

  // ── Company credentials tab (ADR-0030) ───────────────────────────────────────
  const credentials = (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-display text-sm font-semibold tracking-tight">Company systems</h3>
        <p className="mt-0.5 text-sm text-dim">
          Org-wide credentials for the integration engines. Secrets are written to Key
          Vault by the backend — only a reference is stored here, never the secret itself.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {COMPANY_PROVIDERS.map((p) => (
          <CompanyCredentialCard
            key={p.key}
            provider={p}
            connection={companyByProvider.get(p.key) ?? null}
            saveAction={saveCredentialAction}
            gdapAction={grantGdapAction}
            disconnectAction={disconnectAction}
          />
        ))}
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Settings"
        description="Your profile, connections, and the company integration credentials."
      />
      <SettingsTabs
        initialTab={tab}
        profile={profile}
        connections={connectionsPanel}
        credentials={credentials}
      />
    </div>
  );
}
