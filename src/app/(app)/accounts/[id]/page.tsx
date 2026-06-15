import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { Timeline } from "@/components/comms/timeline";
import { SourceRecords } from "@/components/comms/source-records";
import { SharePointSites } from "@/components/accounts/sharepoint-sites";
import { DnsPostureCard } from "@/components/accounts/dns-posture-card";
import { IntegrationHealth } from "@/components/comms/integration-health";
import { getRepositories } from "@/lib/data";
import { computeImperionScore } from "@/lib/security/imperion-score";
import { refreshPostureAction } from "../actions";

const PILLAR_LABEL: Record<string, string> = {
  m365_secure_score: "M365 secure score",
  policy_compliance: "Policy compliance",
  darkweb: "Dark web",
};

const GRADE_COLOR: Record<string, string> = {
  A: "text-green",
  B: "text-green",
  C: "text-amber",
  D: "text-red",
  F: "text-red",
};

const STAGE_LABEL: Record<string, string> = {
  prospect: "Prospect",
  onboarding: "Onboarding",
  implementation: "Implementation",
  operational_readiness: "Operational readiness",
  managed_active: "Managed active",
  dormant: "Dormant",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-dim">{label}</span>
      <span className="text-right text-text">{value}</span>
    </div>
  );
}

/** A headed panel with an icon — the page's visual building block. */
function Section({
  title,
  icon,
  hint,
  className,
  children,
}: {
  title: string;
  icon: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-border bg-panel p-4 ${className ?? ""}`}>
      <h3 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
        <Icon name={icon} size={15} />
        {title}
      </h3>
      {hint ? <p className="mb-3 text-xs text-dim">{hint}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

/** Company (Account) 360 — facts, integration health, sources, and the timeline. */
export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm, comms, security } = getRepositories();
  const [
    account,
    timeline,
    sources,
    relatedBronze,
    tenantPostures,
    defenderIncidents,
    mfa,
    sharePointSites,
    dnsDomains,
  ] = await Promise.all([
    crm.getAccount(id),
    comms.listInteractionsByAccount(id),
    crm.listAccountSources(id),
    crm.listAccountRelatedBronze(id),
    security.listTenantPostureForAccount(id),
    security.countDefenderIncidentsForAccount(id),
    security.countMfaRegistrationForAccount(id),
    security.listSharePointSitesForAccount(id),
    security.listDnsDomainsForAccount(id),
  ]);
  if (!account) notFound();

  // At-a-glance Imperion Secure Score (#94, ADR-0051 §4) — live Score Model v1
  // over the mapped tenants' rollups. No Tenant Mappings → no posture card.
  const imperionScore = tenantPostures.length > 0 ? computeImperionScore(tenantPostures) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={account.name} description="Company 360" />
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/accounts/${id}/posture`}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
          >
            <Icon name="Shield" size={14} />
            Posture
          </Link>
          {tenantPostures.length > 0 && (
            // Account-scoped posture refresh (ADR-0051 §2, pipeline ADR-0015) —
            // only offered when a Tenant Mapping exists: no mapped Customer
            // Tenants means there is nothing for the pipeline to re-classify.
            <form action={refreshPostureAction}>
              <input type="hidden" name="accountId" value={id} />
              <button
                type="submit"
                title={`Re-classify posture for ${tenantPostures.length} mapped tenant${tenantPostures.length === 1 ? "" : "s"}`}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
              >
                <Icon name="ShieldCheck" size={14} />
                Refresh posture
              </button>
            </form>
          )}
          <Link
            href={`/accounts/${id}/edit`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section title="Company" icon="Building2">
          <div className="flex flex-col gap-1.5">
            <Row
              label="Lifecycle stage"
              value={STAGE_LABEL[account.lifecycleStage] ?? account.lifecycleStage}
            />
            <Row label="Relationship" value={account.relationship ?? "—"} />
            <Row label="Active" value={account.isActive ? "Yes" : "No"} />
            <Row label="Owner" value={account.owner ?? "Unassigned"} />
            <Row
              label="Health score"
              value={account.healthScore ?? "Not scored yet"}
            />
            <Row label="Created" value={account.createdAt ?? "—"} />
            <Row label="Last updated" value={account.updatedAt ?? "—"} />
            {account.archivedAt && <Row label="Archived" value={account.archivedAt} />}
          </div>
        </Section>

        <Section
          title="Integrations"
          icon="PlugZap"
          hint="Every source feeding this record, with sync freshness."
          className="lg:col-span-2"
        >
          <IntegrationHealth sources={sources} />
        </Section>

        {imperionScore && (
          <Section
            title="Security posture"
            icon="Shield"
            hint="Imperion Secure Score — Score Model v1 over this company's mapped tenants. Grey pillars have no coverage yet; that scores 0, never 'fine' (ADR-0051)."
            className="lg:col-span-3"
          >
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div>
                <div
                  className={`font-display text-3xl ${GRADE_COLOR[imperionScore.grade] ?? "text-text"}`}
                >
                  {imperionScore.grade}
                  <span className="ml-2 text-xl text-text">{imperionScore.composite}</span>
                </div>
                <div className="text-[11px] text-dim">
                  Imperion Secure Score · model v{imperionScore.modelVersion}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {imperionScore.pillars.map((p) => (
                  <span
                    key={p.pillar}
                    className={`rounded px-2 py-1 text-[11px] ${
                      !p.covered
                        ? "bg-panel-2 text-dim"
                        : p.score >= 80
                          ? "bg-green/10 text-green"
                          : p.score >= 60
                            ? "bg-amber/10 text-amber"
                            : "bg-red/10 text-red"
                    }`}
                  >
                    {PILLAR_LABEL[p.pillar] ?? p.pillar}:{" "}
                    {p.covered ? Math.round(p.score) : "No coverage"}
                  </span>
                ))}
                {/* Open Defender incidents (#256, ADR-0059) — red when any are
                    open, grey when collected-but-clear, nothing when no data. */}
                {defenderIncidents.total > 0 &&
                  (defenderIncidents.open > 0 ? (
                    <span
                      className="flex items-center gap-1.5 rounded bg-red/10 px-2 py-1 text-[11px] text-red"
                      title={`${defenderIncidents.open} of ${defenderIncidents.total} Defender incidents open across this company's mapped tenants`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-red" />
                      Defender incidents: {defenderIncidents.open} open
                    </span>
                  ) : (
                    <span className="rounded bg-panel-2 px-2 py-1 text-[11px] text-dim">
                      Defender incidents: 0 open
                    </span>
                  ))}
                {/* MFA registration coverage (#258) — posture-pillar INPUT only
                    (ADR-0051 model versioning: no composite change here); same
                    color bands as the pillar chips, nothing when no data. */}
                {mfa.total > 0 &&
                  (() => {
                    const pct = Math.round((mfa.registered / mfa.total) * 100);
                    return (
                      <span
                        className={`rounded px-2 py-1 text-[11px] ${
                          pct >= 80
                            ? "bg-green/10 text-green"
                            : pct >= 60
                              ? "bg-amber/10 text-amber"
                              : "bg-red/10 text-red"
                        }`}
                        title={`${mfa.registered} of ${mfa.total} users MFA-registered across this company's mapped tenants (Entra auth methods)`}
                      >
                        MFA: {pct}% registered (of {mfa.total} users)
                      </span>
                    );
                  })()}
              </div>
              <Link
                href={`/accounts/${id}/posture`}
                className="ml-auto text-sm text-dim underline-offset-2 hover:text-text hover:underline"
              >
                Full posture view →
              </Link>
            </div>
          </Section>
        )}

        {/* DNS posture card (#309, ADR-0063 account amendment) — governance
            verdict, tracked-domain count, last captured. Account-keyed (not
            tenant-mapped), so it shows whenever the company tracks any domain;
            renders nothing when none are tracked. */}
        {dnsDomains.length > 0 && (
          <Section
            title="DNS posture"
            icon="Globe"
            hint="Domain governance verdict vs the golden baseline (ADR-0063) — managed = hosted in Azure, write-proven, and NS-delegated. Drill into per-domain record drift on the posture view."
            className="lg:col-span-3"
          >
            <DnsPostureCard accountId={id} domains={dnsDomains} />
          </Section>
        )}

        <Section
          title="Data sources"
          icon="Database"
          hint="The per-source bronze records merged into this company — drill into the raw payloads."
          className="lg:col-span-3"
        >
          <SourceRecords sources={sources} />
        </Section>

        {relatedBronze.length > 0 && (
          <Section
            title="Related source data"
            icon="FolderGit2"
            hint="Local-pipeline bronze that feeds this account — Autotask contracts & tickets, IT Glue documentation."
            className="lg:col-span-3"
          >
            <SourceRecords sources={relatedBronze} />
          </Section>
        )}

        {/* SharePoint site inventory (#255) — drillable site METADATA only
            (Sites.Read.All; Files.Read.All pruned — no file content anywhere).
            Renders nothing when no sites are collected for the mapped tenants. */}
        {sharePointSites.length > 0 && (
          <Section
            title="SharePoint sites"
            icon="Globe"
            hint={`${sharePointSites.length} site${sharePointSites.length === 1 ? "" : "s"} across this company's mapped tenants — site metadata only, no file content (Sites.Read.All).`}
            className="lg:col-span-3"
          >
            <SharePointSites sites={sharePointSites} />
          </Section>
        )}

        <Section
          title="Communications timeline"
          icon="History"
          hint="Newest first. Click an entry to open the communication in a new window."
          className="lg:col-span-3"
        >
          <Timeline
            items={timeline}
            showContact
            newWindow
            emptyHint="No communications recorded for this company yet."
          />
        </Section>
      </div>
    </div>
  );
}
