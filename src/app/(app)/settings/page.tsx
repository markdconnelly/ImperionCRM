import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { canSeeSettings, type AppRole } from "@/lib/auth/roles";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { CompanyCredentialCard } from "@/components/settings/company-credential-card";
import { OrchestratorSettingsCard } from "@/components/agent/orchestrator-settings-card";
import { getAgentSettingsState } from "@/lib/agent/settings-data";
import { settingsSourceNote } from "@/lib/agent/settings";
import { saveAgentSettingsAction } from "@/app/(app)/agents/actions";
import { ConnectAccount } from "@/components/integrations/connect-account";
import { ConnectionCard } from "@/components/integrations/connection-card";
import { COMPANY_PROVIDERS } from "@/lib/integrations/company-providers";
import { getRepositories } from "@/lib/data";
import {
  connectAction,
  connectQuickBooksAction,
  disconnectAction,
  grantGdapAction,
  refreshNowAction,
  saveCredentialAction,
  setPollIntervalAction,
} from "./actions";
import { REFRESH_SOURCES } from "@/lib/integrations/pipeline-refresh";
import { TenantMappingPanel } from "@/components/settings/tenant-mapping-panel";
import {
  deleteTenantMappingAction,
  saveTenantMappingAction,
} from "./tenant-mapping-actions";
import {
  CONNECT_RESULT_NOTICES,
  isConnectResult,
} from "@/lib/integrations/personal-oauth";
import { QBO_CONNECT_NOTICES, isQboConnectResult } from "@/lib/integrations/qbo-connect";

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

/** Friendly names for the connect-flow notice (falls back to the raw key). */
const PROVIDER_LABEL: Record<string, string> = {
  m365: "Microsoft 365",
  google: "Google",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  plaud: "Plaud",
};

const NOTICE_TONE: Record<"success" | "warning" | "error", string> = {
  success: "border-green/40 text-green",
  warning: "border-amber/40 text-amber",
  error: "border-red/40 text-red",
};

/**
 * One-shot notice for an OAuth connect outcome (backend ADR-0038). The connect
 * action and the `/api/connections/[provider]/callback` route both land on
 * `/settings?tab=connections&connect=<result>`; this renders it.
 */
function ConnectNotice({ connect, provider }: { connect?: string; provider?: string }) {
  if (!connect || !isConnectResult(connect)) return null;
  const notice = CONNECT_RESULT_NOTICES[connect];
  const label = provider ? (PROVIDER_LABEL[provider] ?? provider) : "The account";
  return (
    <p
      role="status"
      className={`rounded-md border bg-panel-2 px-3 py-2 text-sm ${NOTICE_TONE[notice.tone]}`}
    >
      {notice.message(label)}
    </p>
  );
}

/**
 * One-shot notice for a QuickBooks company-connect outcome (#530). Both
 * `connectQuickBooksAction` and `/api/qbo/callback` land on
 * `/settings?tab=credentials&qbo=<result>` (with optional `&qboStatus=<httpStatus>`);
 * this renders a specific reason instead of the row's bare "error".
 */
function QboConnectNotice({ qbo, status }: { qbo?: string; status?: string }) {
  if (!qbo || !isQboConnectResult(qbo)) return null;
  const notice = QBO_CONNECT_NOTICES[qbo];
  return (
    <p
      role="status"
      className={`rounded-md border bg-panel-2 px-3 py-2 text-sm ${NOTICE_TONE[notice.tone]}`}
    >
      {notice.message(status)}
    </p>
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
  searchParams: Promise<{
    tab?: string;
    connect?: string;
    provider?: string;
    qbo?: string;
    qboStatus?: string;
  }>;
}) {
  const { tab, connect, provider: connectProvider, qbo, qboStatus } = await searchParams;
  const session = await auth();
  const roles = session?.user?.roles ?? ["support"];
  // Settings is admin-only (ADR-0030). Middleware already redirects, but guard
  // here too so the page can never render for a non-admin.
  if (!canSeeSettings(roles)) redirect("/");

  const name = session?.user?.name ?? "Unknown user";
  const email = session?.user?.email ?? "—";
  const rolesLabel = roles.map((r) => ROLE_LABEL[r] ?? r).join(", ");

  const { connections, crm, security } = getRepositories();
  const [personal, company, agentSettings, tenantMappings, unmappedTenants, accounts] =
    await Promise.all([
      connections.listUserConnections(email),
      connections.listCompanyConnections(),
      getAgentSettingsState(),
      security.listTenantMappings(),
      security.listUnmappedTenants(),
      crm.listAccounts(),
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

  // ── AI tab (#90): orchestrator tier preset + budget + month-to-date spend ────
  // Same card as the AI Agents page (ADR-0048); the whole Settings page is
  // admin-only (redirect above), so non-admins never see this tab.
  const aiPanel = (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-display text-sm font-semibold tracking-tight">AI</h3>
        <p className="mt-0.5 text-sm text-dim">
          The orchestrator&apos;s model-tier preset, hard monthly budget cap, and
          month-to-date spend. Saved through the backend (backend ADR-0037); the full
          agent surface lives on{" "}
          <Link href="/agents" className="text-accent hover:underline">
            AI Agents
          </Link>
          .
        </p>
      </div>
      <OrchestratorSettingsCard
        preset={agentSettings.preset}
        budgetUsdMonthly={agentSettings.budgetUsdMonthly}
        spendMonthToDateUsd={agentSettings.spendMonthToDateUsd}
        presets={agentSettings.presets}
        canEdit
        canSave={agentSettings.source === "backend"}
        sourceNote={settingsSourceNote(agentSettings.source)}
        saveAction={saveAgentSettingsAction}
      />
    </section>
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
      <ConnectNotice connect={connect} provider={connectProvider} />
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
      <QboConnectNotice qbo={qbo} status={qboStatus} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {COMPANY_PROVIDERS.map((p) => (
          <CompanyCredentialCard
            key={p.key}
            provider={p}
            connection={companyByProvider.get(p.key) ?? null}
            saveAction={saveCredentialAction}
            gdapAction={p.key === "qbo" ? connectQuickBooksAction : grantGdapAction}
            disconnectAction={disconnectAction}
            pollAction={setPollIntervalAction}
            refreshAction={refreshNowAction}
            refreshable={p.key in REFRESH_SOURCES}
          />
        ))}
      </div>
    </section>
  );

  // ── Tenant Mapping tab (ADR-0051, #150) ─────────────────────────────────────
  const tenantsPanel = (
    <TenantMappingPanel
      mappings={tenantMappings}
      unmapped={unmappedTenants}
      accounts={accounts}
      saveAction={saveTenantMappingAction}
      deleteAction={deleteTenantMappingAction}
    />
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
          { href: "/custom-fields", label: "Custom fields", hint: "Admin-definable task/project fields (ADR-0065 B4)" },
          { href: "/settings/statuses", label: "Statuses", hint: "Admin-definable status sets per project type (ADR-0065 B5)" },
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
        ai={aiPanel}
        connections={connectionsPanel}
        credentials={credentials}
        tenants={tenantsPanel}
        tools={toolsPanel}
      />
    </div>
  );
}
