import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { canSeeSettings, type AppRole } from "@/lib/auth/roles";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { OrchestratorSettingsCard } from "@/components/agent/orchestrator-settings-card";
import { getAgentSettingsState } from "@/lib/agent/settings-data";
import { settingsSourceNote } from "@/lib/agent/settings";
import { saveAgentSettingsAction } from "@/app/(app)/agents/actions";
import { getRepositories } from "@/lib/data";
import { TenantMappingPanel } from "@/components/settings/tenant-mapping-panel";
import {
  deleteTenantMappingAction,
  saveTenantMappingAction,
} from "./tenant-mapping-actions";

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

  const { crm, security } = getRepositories();
  const [agentSettings, tenantMappings, unmappedTenants, accounts] =
    await Promise.all([
      getAgentSettingsState(),
      security.listTenantMappings(),
      security.listUnmappedTenants(),
      crm.listAccounts(),
    ]);

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

      <Card title="Your connections">
        <p className="text-sm text-dim">
          Your personal 365 / social account connections live on your profile (#796) —
          they are yours, distinct from the org-wide company connections under{" "}
          <Link href="/settings/connections" className="text-accent hover:underline">
            Connections
          </Link>
          .
        </p>
        <Link
          href="/profile"
          className="mt-3 inline-block rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
        >
          Open your profile
        </Link>
      </Card>

      <Card title="Appearance">
        <AppearanceSettings />
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
          { href: "/settings/credentials", label: "Credentials", hint: "Key Vault credential registry by scope — names only, never values (ADR-0103)" },
          { href: "/settings/tenant-mapping", label: "Tenant mapping", hint: "Map M365 tenants onto accounts (ADR-0051)" },
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
        description="Your profile, AI configuration, tenant mapping, and configuration tools. Company integration credentials live under Connections."
      />
      <SettingsTabs
        initialTab={tab}
        profile={profile}
        ai={aiPanel}
        tenants={tenantsPanel}
        tools={toolsPanel}
      />
    </div>
  );
}
