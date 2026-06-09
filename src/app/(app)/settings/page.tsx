import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { canSeeSettings, type AppRole } from "@/lib/auth/roles";
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
  refreshNowAction,
  saveCredentialAction,
  setPollIntervalAction,
} from "./actions";
import { REFRESH_SOURCES } from "@/lib/integrations/pipeline-refresh";

/** Human labels for the application roles. */
const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  finance: "Finance",
  project_manager: "Project Manager",
  sales: "Sales",
  support: "Support",
};

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
  const roles = session?.user?.roles ?? ["support"];
  // Settings is admin-only (ADR-0030). Middleware already redirects, but guard
  // here too so the page can never render for a non-admin.
  if (!canSeeSettings(roles)) redirect("/");

  const name = session?.user?.name ?? "Unknown user";
  const email = session?.user?.email ?? "—";
  const rolesLabel = roles.map((r) => ROLE_LABEL[r] ?? r).join(", ");

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
          <Row label="Roles" value={rolesLabel} />
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

      <Card title="Security">
        <p className="text-sm text-dim">
          Posture at a glance — consent coverage, connection health, and the controls
          behind them. Security is admin-only.
        </p>
        <Link
          href="/security"
          className="mt-3 inline-block rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
        >
          Open security posture
        </Link>
      </Card>

      <Card title="Platform">
        <p className="text-sm text-dim">
          AI features run on Claude (generation) and Voyage (embeddings) via the
          backend&apos;s model router. Keys live in Key Vault; configuration is managed
          in App Service settings, not here.
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
            <ConnectionCard
              key={c.id}
              connection={c}
              disconnectAction={disconnectAction}
              pollAction={setPollIntervalAction}
            />
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

  // ── Company credentials tab (ADR-0036) ───────────────────────────────────────
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
            pollAction={setPollIntervalAction}
            refreshAction={refreshNowAction}
            refreshable={p.key in REFRESH_SOURCES}
          />
        ))}
      </div>
    </section>
  );

  const toolsPanel = (
    <Card title="Tools & configuration">
      <p className="mb-3 text-sm text-dim">
        Configuration surfaces moved out of the main navigation.
      </p>
      <ul className="flex flex-col gap-2">
        {[
          { href: "/workflows", label: "Workflows", hint: "Automation builder & step editor" },
          { href: "/knowledge", label: "Knowledge", hint: "Search the gold layer (comms, summaries, dossiers)" },
          { href: "/questions", label: "Discovery & assessment questions", hint: "Edit the question catalog" },
        ].map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-panel-2 px-3 py-2 text-sm transition-colors hover:border-accent"
            >
              <span className="text-text">{t.label}</span>
              <span className="hidden text-xs text-dim sm:block">{t.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Settings"
        description="Your profile, connections, the company integration credentials, and configuration tools."
      />
      <SettingsTabs
        initialTab={tab}
        profile={profile}
        connections={connectionsPanel}
        credentials={credentials}
        tools={toolsPanel}
      />
    </div>
  );
}
