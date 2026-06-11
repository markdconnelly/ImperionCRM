import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { Timeline } from "@/components/comms/timeline";
import { SourceRecords } from "@/components/comms/source-records";
import { IntegrationHealth } from "@/components/comms/integration-health";
import { getRepositories } from "@/lib/data";
import { refreshPostureAction } from "../actions";

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
  const [account, timeline, sources, relatedBronze, tenantMappings] = await Promise.all([
    crm.getAccount(id),
    comms.listInteractionsByAccount(id),
    crm.listAccountSources(id),
    crm.listAccountRelatedBronze(id),
    security.listTenantMappingsForAccount(id),
  ]);
  if (!account) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={account.name} description="Company 360" />
        <div className="flex shrink-0 items-center gap-2">
          {tenantMappings.length > 0 && (
            // Account-scoped posture refresh (ADR-0051 §2, pipeline ADR-0015) —
            // only offered when a Tenant Mapping exists: no mapped Customer
            // Tenants means there is nothing for the pipeline to re-classify.
            <form action={refreshPostureAction}>
              <input type="hidden" name="accountId" value={id} />
              <button
                type="submit"
                title={`Re-classify posture for ${tenantMappings.length} mapped tenant${tenantMappings.length === 1 ? "" : "s"}`}
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
