import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Timeline } from "@/components/comms/timeline";
import { SourceRecords } from "@/components/comms/source-records";
import { getRepositories } from "@/lib/data";

const STAGE_LABEL: Record<string, string> = {
  prospect: "Prospect",
  onboarding: "Onboarding",
  operational_readiness: "Operational readiness",
  managed_active: "Managed active",
  dormant: "Dormant",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-dim">{label}</span>
      <span className="text-text">{value}</span>
    </div>
  );
}

/** Company (Account) 360 — facts + the unified communications timeline. */
export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm, comms } = getRepositories();
  const [account, timeline, sources] = await Promise.all([
    crm.getAccount(id),
    comms.listInteractionsByAccount(id),
    crm.listAccountSources(id),
  ]);
  if (!account) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={account.name} description="Company 360" />
        <Link
          href={`/accounts/${id}/edit`}
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
        >
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-panel p-4 lg:col-span-2">
          <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">
            Communications timeline
          </h3>
          <Timeline
            items={timeline}
            showContact
            emptyHint="No communications recorded for this company yet."
          />
        </section>

        <section className="rounded-xl border border-border bg-panel p-4">
          <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">Company</h3>
          <div className="flex flex-col gap-1.5">
            <Row label="Lifecycle stage" value={STAGE_LABEL[account.lifecycleStage] ?? account.lifecycleStage} />
            <Row label="Relationship" value={account.relationship ?? "—"} />
            <Row label="Active" value={account.isActive ? "Yes" : "No"} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-panel p-4 lg:col-span-3">
          <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">Data sources</h3>
          <SourceRecords sources={sources} />
        </section>
      </div>
    </div>
  );
}
