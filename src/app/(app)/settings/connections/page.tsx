import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { ConnectionCard } from "@/components/settings/connection-card";
import { PlatformCredentialCard } from "@/components/settings/platform-credential-card";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";
import { COMPANY_PROVIDERS } from "@/lib/integrations/company-providers";
import { PLATFORM_PROVIDERS } from "@/lib/integrations/platform-providers";
import { listConnectorManifests } from "@/lib/integrations/connector-manifest";
import { inferConnectionHealth } from "@/lib/integrations/connection-health";
import { describeCapabilities } from "@/lib/integrations/ingest-summary";
import {
  buildConnectionCards,
  groupConnectionCards,
} from "@/lib/integrations/connection-cards";
import {
  buildConnectorCatalog,
  GLOBAL_SCOPE,
} from "@/lib/integrations/connector-catalog";
import {
  connectorChainSteps,
  type ConnectorChainStep,
} from "@/lib/integrations/connector-chain";
import { getClientMappingAdapter } from "@/lib/integrations/client-mapping";
import { isRefreshable } from "@/lib/integrations/connector-registry";
import { QBO_CONNECT_NOTICES, isQboConnectResult } from "@/lib/integrations/qbo-connect";
import {
  THREADS_CONNECT_NOTICES,
  isThreadsConnectResult,
} from "@/lib/integrations/threads-connect";
import {
  connectDocusignAction,
  connectQuickBooksAction,
  connectThreadsAction,
  purgeCredentialAction,
  refreshNowAction,
  saveCredentialAction,
  savePlatformCredentialAction,
  setPollIntervalAction,
  testDocusignConnectionAction,
} from "../actions";

export const dynamic = "force-dynamic"; // live credential + instance state, never prerendered

/**
 * Connections — the single admin surface for every system-level connector (#864, ADR-0122).
 *
 * ONE card per connector in ONE category-grouped grid (ADR-0122 S5, #1269). Each card unions
 * the two halves a connector can have — they used to be drawn as two stacked grids, so an
 * Autotask (both a company credential AND a catalog connector) showed up twice:
 *
 *   - **Credential** — enter/rotate secrets, grant admin consent (DocuSign/QBO), tune poll
 *     cadence, refresh on demand. Secrets are written to Key Vault by the backend; only a
 *     reference lands on the company `connection` row — never the secret (§5).
 *   - **Catalog** — lifecycle status, enable/disable, effective poll cadence for the
 *     global-scope connector instance.
 *   - **Client mapping** — the 4-step chain + "Edit client mappings" for client-scoped
 *     connectors (E2 #1146). **Planned** connectors render a non-enterable placeholder.
 *
 * Admin-only (`canSeeSettings`, ADR-0030).
 */

const NOTICE_TONE: Record<"success" | "warning" | "error", string> = {
  success: "border-green/40 text-green",
  warning: "border-amber/40 text-amber",
  error: "border-red/40 text-red",
};

/**
 * One-shot notice for a QuickBooks company-connect outcome (#530). Both
 * `connectQuickBooksAction` and `/api/qbo/callback` land on
 * `/settings/connections?qbo=<result>` (with optional `&qboStatus=<httpStatus>`).
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

/**
 * One-shot notice for a Threads company-connect outcome (#1500). Both `connectThreadsAction`
 * and `/api/connections/threads/callback` land on `/settings/connections?threads=<result>`
 * (with optional `&threadsStatus=<httpStatus>`). Mirrors the QBO connect notice.
 */
function ThreadsConnectNotice({ threads, status }: { threads?: string; status?: string }) {
  if (!threads || !isThreadsConnectResult(threads)) return null;
  const notice = THREADS_CONNECT_NOTICES[threads];
  return (
    <p
      role="status"
      className={`rounded-md border bg-panel-2 px-3 py-2 text-sm ${NOTICE_TONE[notice.tone]}`}
    >
      {notice.message(status)}
    </p>
  );
}

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    qbo?: string;
    qboStatus?: string;
    threads?: string;
    threadsStatus?: string;
  }>;
}) {
  const { qbo, qboStatus, threads, threadsStatus } = await searchParams;
  const roles = await getSessionRoles();
  // Admin-only (ADR-0030) — this surface collects credentials, so it carries the Settings gate.
  if (!canSeeSettings(roles)) redirect("/");

  const { connections, connectors } = getRepositories();
  const [company, platform, instances] = await Promise.all([
    connections.listCompanyConnections(),
    connections.listPlatformConnections(),
    connectors.listConnectorInstances(),
  ]);
  const platformByProvider = new Map(platform.map((c) => [c.provider, c]));
  const nowMs = Date.now(); // single render clock for all inferred-health verdicts (ADR-0122 S2)
  // buildConnectorCatalog defaults to GLOBAL_SCOPE — only global-scope instances join.
  const entries = buildConnectorCatalog(listConnectorManifests(), instances, GLOBAL_SCOPE);

  // The unified card list: every connector exactly once, the company-credential and catalog
  // halves merged (ADR-0122 S5). Grouped by category for the single grid.
  const cards = buildConnectionCards(COMPANY_PROVIDERS, company, entries);
  const groups = groupConnectionCards(cards);

  // Client-mapping pipeline chain per client-scoped connector with a catalog entry (E2 #1146).
  // The discovery/mapping counts come from the same whitelisted bronze⋈entity_xref read the
  // mapping page uses, so only connectors with a wired adapter (autotask today) incur a query.
  const clientScopedEntries = cards.filter((c) => c.clientScoped && c.entry !== null);
  const summaries = await Promise.all(
    clientScopedEntries.map(async (c) => {
      const adapter = getClientMappingAdapter(c.key);
      if (!adapter) return [c.key, null] as const;
      const units = await connections.listClientMappingUnits(adapter.sourceSystem);
      return [
        c.key,
        { discovered: units.length, mapped: units.filter((u) => u.mappedAccountId).length },
      ] as const;
    }),
  );
  const summaryByKey = new Map(summaries);
  const chains: Record<string, ConnectorChainStep[]> = {};
  for (const c of clientScopedEntries) {
    const summary = summaryByKey.get(c.key) ?? null;
    chains[c.key] = connectorChainSteps({
      hasCredential: (c.entry?.connected ?? false) || !!c.connection?.keyvaultSecretRef,
      instanceStatus: c.entry?.instance?.status ?? null,
      lastSyncAt: c.entry?.instance?.lastSyncAt ?? c.connection?.lastSync ?? null,
      unitsDiscovered: summary ? summary.discovered : null,
      unitsMapped: summary ? summary.mapped : null,
    });
  }

  const connectedCount = entries.filter((e) => e.connected).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Connections"
        description="Every org-wide integration in one place — enter and rotate credentials, grant admin consent, tune poll cadence. Secrets are custodied in Key Vault by the backend; this surface never stores a secret itself."
      >
        <span className="flex items-center gap-1 text-xs text-dim">
          <Icon name="Plug" size={11} /> {connectedCount} connected
        </span>
      </PageHeader>

      <QboConnectNotice qbo={qbo} status={qboStatus} />
      <ThreadsConnectNotice threads={threads} status={threadsStatus} />

      <div className="flex items-start gap-2 rounded-md border border-border bg-panel-2 px-3 py-2 text-xs text-dim">
        <Icon name="ShieldCheck" size={13} className="mt-0.5 shrink-0 text-accent" />
        <span>
          One card per connector. Enter company credentials directly on the card; for
          per-client connectors (Microsoft 365, UniFi) the credential is entered on each row of{" "}
          <span className="text-text">Client mapping</span>. Secrets are custodied in Key Vault by
          the backend — this surface only ever holds a reference, never the secret itself.
        </span>
      </div>

      {groups.map((group) => (
        <section key={group.category} className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-dim">
            {group.category}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.cards.map((model) => (
              <ConnectionCard
                key={model.key}
                model={model}
                health={inferConnectionHealth({
                  hasCredential: model.connection != null || (model.entry?.connected ?? false),
                  status: model.connection?.status ?? model.entry?.instance?.status ?? null,
                  lastSyncAt:
                    model.connection?.lastSync ?? model.entry?.instance?.lastSyncAt ?? null,
                  pollIntervalMinutes:
                    model.connection?.pollIntervalMinutes ??
                    model.entry?.effectiveCadenceMinutes ??
                    null,
                  nowMs,
                })}
                capabilities={
                  model.entry ? describeCapabilities(model.entry.manifest.capabilities) : null
                }
                chain={chains[model.key]}
                refreshable={isRefreshable(model.key)}
                mappingAdapterExists={getClientMappingAdapter(model.key) != null}
                saveAction={saveCredentialAction}
                connectAction={
                  model.key === "threads" ? connectThreadsAction : connectQuickBooksAction
                }
                consentAction={model.key === "docusign" ? connectDocusignAction : undefined}
                testAction={model.key === "docusign" ? testDocusignConnectionAction : undefined}
                disconnectAction={purgeCredentialAction}
                pollAction={setPollIntervalAction}
                refreshAction={refreshNowAction}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Platform — system-wide AI provider keys (ADR-0129, #1400). Custody-only: no account,
          no poll, no mapping. Seeded/rotated here so an app-admin needs no Azure-portal rights. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-dim">Platform</h2>
        <p className="text-[11px] text-dim">
          System-wide AI provider keys the runtime resolves — custodied in Key Vault as{" "}
          <span className="font-mono">conn-platform-&lt;provider&gt;</span>. The key is validated
          with one live call before it is stored; this surface only ever holds a reference.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PLATFORM_PROVIDERS.map((provider) => (
            <PlatformCredentialCard
              key={provider.key}
              provider={provider}
              connection={platformByProvider.get(provider.key) ?? null}
              action={savePlatformCredentialAction}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
